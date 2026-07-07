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

const GRID_POINTS = [
    { la: 51.5, lo: -0.1 },   // UK
    { la: 50.1, lo: 8.6 },    // Germany
    { la: 48.8, lo: 2.3 },    // France
    { la: 52.3, lo: 4.9 },    // Netherlands
    { la: 40.4, lo: -3.7 },   // Spain
    { la: 41.9, lo: 12.5 },   // Italy
    { la: 39.0, lo: 22.0 },   // Greece
    { la: 55.6, lo: 12.6 },   // Denmark
    { la: 59.3, lo: 18.1 },   // Sweden
    { la: 60.2, lo: 24.9 },   // Finland
    { la: 52.2, lo: 21.0 },   // Poland
    { la: 50.1, lo: 14.4 },   // Czech
    { la: 48.2, lo: 16.4 },   // Austria
    { la: 47.5, lo: 19.0 },   // Hungary
    { la: 44.8, lo: 20.5 },   // Serbia
    { la: 42.7, lo: 23.3 },   // Bulgaria
    { la: 44.4, lo: 26.1 },   // Romania
    { la: 41.0, lo: 28.9 },   // Turkey
    { la: 37.9, lo: 23.7 },   // Greece South
    { la: 38.7, lo: -9.1 },   // Portugal
    { la: 53.3, lo: -6.3 },   // Ireland
    { la: 54.6, lo: -2.5 },   // UK North
    { la: 58.0, lo: -4.0 },   // Scotland
    { la: 40.7, lo: -74.0 },  // New York
    { la: 33.9, lo: -118.4 }, // Los Angeles
    { la: 41.9, lo: -87.6 },  // Chicago
    { la: 29.7, lo: -95.4 },  // Houston
    { la: 25.8, lo: -80.3 },  // Miami
    { la: 39.7, lo: -104.9 }, // Denver
    { la: 47.6, lo: -122.3 }, // Seattle
    { la: 35.7, lo: 139.7 },  // Tokyo
    { la: 22.3, lo: 114.2 },  // Hong Kong
    { la: 1.4, lo: 104.0 },   // Singapore
    { la: 25.3, lo: 55.4 },   // Dubai
    { la: 28.6, lo: 77.2 },   // Delhi
    { la: 19.1, lo: 72.9 },   // Mumbai
    { la: -33.9, lo: 151.2 },  // Sydney
    { la: 31.2, lo: 121.5 },  // Shanghai
    { la: 37.6, lo: 127.0 },  // Seoul
    { la: 24.7, lo: 46.7 },   // Riyadh
    { la: 30.0, lo: 31.2 },   // Cairo
    { la: -23.5, lo: -46.6 },  // Sao Paulo
    { la: -34.6, lo: -58.4 },  // Buenos Aires
    { la: 4.7, lo: -74.1 },   // Bogota
    { la: 19.4, lo: -99.1 },  // Mexico City
    { la: 13.7, lo: 100.5 },  // Bangkok
    { la: -6.2, lo: 106.8 },   // Jakarta
    { la: 14.6, lo: 121.0 },   // Manila
    { la: 34.7, lo: 135.5 },  // Osaka
];

async function searchGrid(flightNumber) {
    const searchPromises = GRID_POINTS.map(point =>
        fetch(`https://customer-api.wingbits.com/v1/flights?by=box&la=${point.la}&lo=${point.lo}&w=150&h=150&unit=nm`, {
            headers: { 'x-api-key': process.env.WINGBITS_API_KEY },
            signal: AbortSignal.timeout(8000)
        }).then(r => r.json()).catch(() => [])
    );

    const results = await Promise.all(searchPromises);
    const allFlights = results.flat();

    const match = allFlights.find(f =>
        f.f === flightNumber || f.f === flightNumber.toUpperCase()
    );

    return match || null;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { flightNumber } = req.query;
    if (!flightNumber) return res.status(400).json({ error: 'Flight number required' });

    const cleanNum = flightNumber.toUpperCase().trim();
    if (!/^[A-Z0-9]{2,8}$/.test(cleanNum)) return res.status(400).json({ error: 'Invalid format' });

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

    try {
        const match = await searchGrid(cleanNum);

        usageStore.totalCallsToday += GRID_POINTS.length;

        if (!match) {
            return res.status(404).json({ error: 'Flight not found in covered areas' });
        }

        const flightData = {
            flights: [{
                latitude: match.la,
                longitude: match.lo,
                heading_deg: match.th,
                altitude_ft: match.ab,
                velocity_kt: match.gs,
                flight_number: match.f,
                hex: match.h,
                icao24: match.h,
                origin_airport: match.og || null,
                timestamp: match.ra
            }],
            _metadata: { fetchedAt: now, isCached: false }
        };

        flightCache[cacheKey] = { data: flightData, timestamp: now };

        return res.setHeader('Cache-Control', 's-maxage=300').json(flightData);
    } catch (error) {
        console.error('Search error:', error.message);
        return res.status(502).json({ error: 'Failed to fetch flight data' });
    }
}