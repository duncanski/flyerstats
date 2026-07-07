import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const usageStore = global.usageStore || {
    totalCallsToday: 0,
    lastReset: Date.now(),
    dailyLimit: parseInt(process.env.DAILY_API_LIMIT || 50000),
    alerted_80: false,
    alerted_90: false,
    alerted_100: false,
    recipientEmail: process.env.ALERT_EMAIL
};
global.usageStore = usageStore;

const flightCache = global.flightCache || {};
global.flightCache = flightCache;

async function sendEmailAlert(subject, message) {
    if (!usageStore.recipientEmail || !process.env.RESEND_API_KEY) return;
    try {
        await resend.emails.send({
            from: 'FlyerStats Alerts <onboarding@resend.dev>',
            to: [usageStore.recipientEmail],
            subject: `[FlyerStats] ${subject}`,
            html: `<div style="font-family:sans-serif;padding:2rem;background:#0f172a;color:white;">
                <h1>🚨 ${subject}</h1>
                <p>${message}</p>
                <p>${usageStore.totalCallsToday} of ${usageStore.dailyLimit} calls today</p>
            </div>`
        });
    } catch (e) { console.error('Email failed:', e.message); }
}

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { flightNumber } = req.query;
    if (!flightNumber) return res.status(400).json({ error: 'Flight number required' });
    const cleanNum = flightNumber.toUpperCase().trim();
    if (!/^[A-Z0-9]{2,6}$/.test(cleanNum)) return res.status(400).json({ error: 'Invalid format' });

    const now = Date.now();
    if (now - usageStore.lastReset > 86400000) {
        usageStore.totalCallsToday = 0;
        usageStore.lastReset = now;
        usageStore.alerted_80 = false;
        usageStore.alerted_90 = false;
        usageStore.alerted_100 = false;
    }

    const CACHE_TTL = 300000;
    const cacheKey = `flight:${cleanNum}`;
    const cached = flightCache[cacheKey];
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
        return res.setHeader('Cache-Control', 's-maxage=300').json({
            ...cached.data,
            _metadata: { cachedAt: cached.timestamp, age: now - cached.timestamp, isCached: true }
        });
    }

    const requestLocks = global.requestLocks || {};
    global.requestLocks = requestLocks;
    if (requestLocks[cleanNum] && (now - requestLocks[cleanNum] < 20000)) {
        await new Promise(r => setTimeout(r, 1000));
        const freshCached = flightCache[cacheKey];
        if (freshCached) return res.json(freshCached.data);
    }
    requestLocks[cleanNum] = now;

    try {
        const response = await fetch(`https://customer-api.wingbits.com/flights/${cleanNum}`, {
            headers: { 'Authorization': `Bearer ${process.env.WINGBITS_API_KEY}` },
            signal: AbortSignal.timeout(10000)
        });
        if (response.status === 404) {
            delete requestLocks[cleanNum];
            return res.status(404).json({ error: 'Flight not found' });
        }
        if (!response.ok) throw new Error(`Wingbits API Error: ${response.statusText}`);
        const data = await response.json();
        flightCache[cacheKey] = { data, timestamp: now };
        delete requestLocks[cleanNum];

        usageStore.totalCallsToday++;
        const pct = (usageStore.totalCallsToday / usageStore.dailyLimit) * 100;
        if (pct >= 100 && !usageStore.alerted_100) { await sendEmailAlert('CRITICAL: API Limit Reached!', `${usageStore.totalCallsToday} calls`); usageStore.alerted_100 = true; }
        if (pct >= 90 && !usageStore.alerted_90) { await sendEmailAlert('WARNING: 90% Usage', `${Math.round(pct)}% used`); usageStore.alerted_90 = true; }
        if (pct >= 80 && !usageStore.alerted_80) { usageStore.alerted_80 = true; }

        return res.setHeader('Cache-Control', 's-maxage=300').json({
            ...data,
            _metadata: { cachedAt: now, age: 0, isCached: false }
        });
    } catch (error) {
        delete requestLocks[cleanNum];
        return res.status(502).json({ error: 'Failed to fetch flight data' });
    }
}