const usageStore = global.usageStore || {
    totalCallsToday: 0, lastReset: Date.now(),
    dailyLimit: parseInt(process.env.DAILY_API_LIMIT || 50000),
    alerted_80: false, alerted_90: false, alerted_100: false,
    recipientEmail: process.env.ALERT_EMAIL
};
global.usageStore = usageStore;
const flightCache = global.flightCache || {};
global.flightCache = flightCache;

const GRID_POINTS = [
    { la: 51.5, lo: -0.1 },   { la: 50.1, lo: 8.6 },    { la: 48.8, lo: 2.3 },
    { la: 40.4, lo: -3.7 },   { la: 41.9, lo: 12.5 },   { la: 52.5, lo: 13.4 },
    { la: 55.6, lo: 12.6 },   { la: 59.3, lo: 18.1 },   { la: 40.7, lo: -74.0 },
    { la: 33.9, lo: -118.4 }, { la: 25.3, lo: 55.4 },   { la: 1.4, lo: 104.0 },
];

const AIRPORT_COORDS = {
    'LHR':{la:51.47,lo:-0.45},'LGW':{la:51.15,lo:-0.18},'MAN':{la:53.35,lo:-2.28},'STN':{la:51.88,lo:0.24},'LTN':{la:51.87,lo:-0.37},
    'EDI':{la:55.95,lo:-3.37},'BHX':{la:52.45,lo:-1.74},'GLA':{la:55.87,lo:-4.43},'BRS':{la:51.38,lo:-2.71},'NCL':{la:55.03,lo:-1.69},
    'LCY':{la:51.50,lo:0.05},'EMA':{la:52.83,lo:-1.33},'LPL':{la:53.33,lo:-2.86},'BFS':{la:54.61,lo:-6.21},'CWL':{la:51.39,lo:-3.34},
    'CDG':{la:49.01,lo:2.55},'ORY':{la:48.72,lo:2.37},'NCE':{la:43.66,lo:7.21},'LYS':{la:45.73,lo:5.08},'MRS':{la:43.44,lo:5.21},
    'FRA':{la:50.04,lo:8.56},'MUC':{la:48.35,lo:11.79},'BER':{la:52.37,lo:13.50},'HAM':{la:53.63,lo:9.99},'CGN':{la:50.87,lo:7.14},
    'AMS':{la:52.31,lo:4.76},'BRU':{la:50.90,lo:4.48},'MAD':{la:40.50,lo:-3.57},'BCN':{la:41.30,lo:2.08},'FCO':{la:41.80,lo:12.25},
    'LIN':{la:45.63,lo:8.67},'VIE':{la:48.11,lo:16.56},'ZRH':{la:47.45,lo:8.56},'GVA':{la:46.24,lo:6.11},'CPH':{la:55.62,lo:12.65},
    'ARN':{la:59.65,lo:17.91},'OSL':{la:60.19,lo:11.10},'HEL':{la:60.32,lo:24.96},'DUB':{la:53.42,lo:-6.27},'WAW':{la:52.16,lo:20.96},
    'IST':{la:41.27,lo:28.75},'ATH':{la:37.94,lo:23.94},'LIS':{la:38.78,lo:-9.13},'PRG':{la:50.10,lo:14.26},'BUD':{la:47.43,lo:19.25},
    'JFK':{la:40.64,lo:-73.78},'LAX':{la:33.94,lo:-118.41},'ORD':{la:41.98,lo:-87.90},'MIA':{la:25.79,lo:-80.29},'ATL':{la:33.64,lo:-84.43},
    'SFO':{la:37.62,lo:-122.37},'SEA':{la:47.45,lo:-122.30},'DFW':{la:32.90,lo:-97.04},'IAH':{la:29.98,lo:-95.34},'DEN':{la:39.86,lo:-104.67},
    'YYZ':{la:43.68,lo:-79.61},'YVR':{la:49.19,lo:-123.18},'MEX':{la:19.44,lo:-99.07},'GRU':{la:-23.43,lo:-46.47},'EZE':{la:-34.82,lo:-58.54},
    'DXB':{la:25.25,lo:55.36},'DOH':{la:25.27,lo:51.61},'RUH':{la:24.95,lo:46.70},'JED':{la:21.68,lo:39.15},'CAI':{la:30.12,lo:31.40},
    'HND':{la:35.55,lo:139.78},'NRT':{la:35.77,lo:140.39},'KIX':{la:34.43,lo:135.24},'ICN':{la:37.46,lo:126.44},'PEK':{la:40.08,lo:116.58},
    'PVG':{la:31.14,lo:121.81},'HKG':{la:22.31,lo:113.91},'SIN':{la:1.36,lo:103.99},'BKK':{la:13.69,lo:100.75},'KUL':{la:2.74,lo:101.70},
    'DEL':{la:28.55,lo:77.10},'BOM':{la:19.09,lo:72.87},'SYD':{la:-33.95,lo:151.18},'MEL':{la:-37.67,lo:144.84},'AKL':{la:-37.00,lo:174.79},
    'JNB':{la:-26.13,lo:28.24},'NBO':{la:-1.32,lo:36.93},'ADD':{la:8.97,lo:38.80},'SAO':{la:-23.43,lo:-46.47},
};

async function searchBox(la, lo, flightNumber) {
    try {
        const url = `https://customer-api.wingbits.com/v1/flights?by=box&la=${la}&lo=${lo}&w=150&h=150&unit=nm`;
        const response = await fetch(url, {
            headers: { 'x-api-key': process.env.WINGBITS_API_KEY },
            signal: AbortSignal.timeout(3000)
        });
        if (!response.ok) return null;
        const flights = await response.json();
        return flights.find(f => f.f && f.f.toUpperCase() === flightNumber) || null;
    } catch (e) { return null; }
}

async function searchGrid(flightNumber) {
    const promises = GRID_POINTS.map(p => searchBox(p.la, p.lo, flightNumber));
    const results = await Promise.all(promises);
    return results.find(r => r !== null);
}

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { flightNumber, airport } = req.query;
    if (!flightNumber) return res.status(400).json({ error: 'Flight number required' });

    const cleanNum = flightNumber.toUpperCase().trim();
    if (!/^[A-Z0-9]{2,8}$/.test(cleanNum)) return res.status(400).json({ error: 'Invalid format' });

    const now = Date.now();
    if (now - usageStore.lastReset > 86400000) {
        usageStore.totalCallsToday = 0; usageStore.lastReset = now;
        usageStore.alerted_80 = false; usageStore.alerted_90 = false; usageStore.alerted_100 = false;
    }

    const CACHE_TTL = 300000;
    const cacheKey = `flight:${cleanNum}:${airport || 'grid'}`;
    const cached = flightCache[cacheKey];
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
        return res.setHeader('Cache-Control', 's-maxage=300').json(cached.data);
    }

    try {
        let match = null;

        if (airport && AIRPORT_COORDS[airport.toUpperCase()]) {
            const coords = AIRPORT_COORDS[airport.toUpperCase()];
            match = await searchBox(coords.la, coords.lo, cleanNum);
            usageStore.totalCallsToday += 1;
        }

        if (!match) {
            match = await searchGrid(cleanNum);
            usageStore.totalCallsToday += GRID_POINTS.length;
        }

        if (!match) {
            return res.status(404).json({ error: 'Flight not found. It may have landed, not departed yet, or is outside coverage.' });
        }

        const flightData = {
            flights: [{
                latitude: match.la, longitude: match.lo,
                heading_deg: match.th, altitude_ft: match.ab,
                velocity_kt: match.gs, flight_number: match.f,
                hex: match.h, timestamp: match.ra
            }]
        };

        flightCache[cacheKey] = { data: flightData, timestamp: now };
        return res.setHeader('Cache-Control', 's-maxage=300').json(flightData);

    } catch (error) {
        return res.status(502).json({ error: 'Failed to fetch flight data: ' + error.message });
    }
}