const AIRPORTS = {
    'LHR':{la:51.47,lo:-0.45},'LGW':{la:51.15,lo:-0.18},'MAN':{la:53.35,lo:-2.28},'STN':{la:51.88,lo:0.24},'LTN':{la:51.87,lo:-0.37},
    'EDI':{la:55.95,lo:-3.37},'BHX':{la:52.45,lo:-1.74},'GLA':{la:55.87,lo:-4.43},'BRS':{la:51.38,lo:-2.71},'NCL':{la:55.03,lo:-1.69},
    'LCY':{la:51.50,lo:0.05},'EMA':{la:52.83,lo:-1.33},'LPL':{la:53.33,lo:-2.86},'BFS':{la:54.61,lo:-6.21},'CWL':{la:51.39,lo:-3.34},
    'CDG':{la:49.01,lo:2.55},'ORY':{la:48.72,lo:2.37},'NCE':{la:43.66,lo:7.21},'LYS':{la:45.73,lo:5.08},'MRS':{la:43.44,lo:5.21},
    'FRA':{la:50.04,lo:8.56},'MUC':{la:48.35,lo:11.79},'BER':{la:52.37,lo:13.50},'HAM':{la:53.63,lo:9.99},'CGN':{la:50.87,lo:7.14},
    'AMS':{la:52.31,lo:4.76},'BRU':{la:50.90,lo:4.48},'MAD':{la:40.50,lo:-3.57},'BCN':{la:41.30,lo:2.08},'FCO':{la:41.80,lo:12.25},
    'LIN':{la:45.63,lo:8.67},'VIE':{la:48.11,lo:16.56},'ZRH':{la:47.45,lo:8.56},'GVA':{la:46.24,lo:6.11},'CPH':{la:55.62,lo:12.65},
    'ARN':{la:59.65,lo:17.91},'OSL':{la:60.19,lo:11.10},'HEL':{la:60.32,lo:24.96},'DUB':{la:53.42,lo:-6.27},'WAW':{la:52.16,lo:20.96},
    'IST':{la:41.27,lo:28.75},'ATH':{la:37.94,lo:23.94},'LIS':{la:38.78,lo:-9.13},'PRG':{la:50.10,lo:14.26},'BUD':{la:47.43,lo:19.25},
    'JFK':{la:40.64,lo:-73.78},'LAX':{la:33.94,lo:-118.41),'ORD':{la:41.98,lo:-87.90},'MIA':{la:25.79,lo:-80.29},'ATL':{la:33.64,lo:-84.43},
    'SFO':{la:37.62,lo:-122.37},'SEA':{la:47.45,lo:-122.30},'DFW':{la:32.90,lo:-97.04},'IAH':{la:29.98,lo:-95.34},'DEN':{la:39.86,lo:-104.67},
    'YYZ':{la:43.68,lo:-79.61},'YVR':{la:49.19,lo:-123.18},'MEX':{la:19.44,lo:-99.07},'GRU':{la:-23.43,lo:-46.47},'EZE':{la:-34.82,lo:-58.54},
    'DXB':{la:25.25,lo:55.36},'DOH':{la:25.27,lo:51.61},'RUH':{la:24.95,lo:46.70},'JED':{la:21.68,lo:39.15),'CAI':{la:30.12,lo:31.40},
    'HND':{la:35.55,lo:139.78},'NRT':{la:35.77,lo:140.39},'KIX':{la:34.43,lo:135.24},'ICN':{la:37.46,lo:126.44},'PEK':{la:40.08,lo:116.58},
    'PVG':{la:31.14,lo:121.81},'HKG':{la:22.31,lo:113.91},'SIN':{la:1.36,lo:103.99},'BKK':{la:13.69,lo:100.75},'KUL':{la:2.74,lo:101.70},
    'DEL':{la:28.55,lo:77.10},'BOM':{la:19.09,lo:72.87},'SYD':{la:-33.95,lo:151.18),'MEL':{la:-37.67,lo:144.84},'AKL':{la:-37.00,lo:174.79},
    'JNB':{la:-26.13,lo:28.24},'NBO':{la:-1.32,lo:36.93},'ADD':{la:8.97,lo:38.80},'SAO':{la:-23.43,lo:-46.47},
    'ABQ':{la:35.04,lo:-106.61},'ALC':{la:38.28,lo:-0.56},'BIO':{la:43.30,lo:-2.91},'BRI':{la:41.14,lo:16.76},'CRL':{la:50.46,lo:4.45},
    'DTM':{la:51.52,lo:7.62},'DUS':{la:51.29,lo:6.77},'GOT':{la:57.66,lo:12.28),'KEF':{la:63.98,lo:-22.62},
    'MAH':{la:39.87,lo:2.72},'NTE':{la:47.15,lo:-1.61},'PMI':{la:39.55,lo:2.74},'SVG':{la:58.88,lo:5.61},
    'STR':{la:48.69,lo:9.22},'TRN':{la:45.20,lo:7.65},'TSF':{la:45.65,lo:12.19),'VCE':{la:45.50,lo:12.35},
    'VRN':{la:45.40,lo:10.89},'WRO':{la:51.10,lo:16.89},'ZAG':{la:45.74,lo:16.07}
};

const map = L.map('map', { zoomControl: false, attributionControl: false, preferCanvas: true }).setView([20, 0], 2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', attribution: '' }).addTo(map);

let planeMarker = null, pollTimer = null, animationFrame = null;
let currentFlightNum = null, currentPlaneData = null, lastFetchTime = 0;
const fetchInterval = 300000;
let isPageVisible = document.visibilityState === 'visible';
let isOnline = navigator.onLine;
let etaTimer = null, currentEta = null, isFlightLanded = false, drTimer = null;

const flightInput = document.getElementById('flightInput');
const airportInput = document.getElementById('airportInput');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('errorMessage');
const searchOverlay = document.getElementById('searchOverlay');
const trackerUI = document.getElementById('trackerUI');
const offlineBadge = document.getElementById('offlineBadge');

function showToast(msg, type='info') {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:4rem;left:50%;transform:translateX(-50%);background:${type==='error'?'#ef4444':type==='warning'?'#f59e0b':'#10b981'};color:#fff;padding:.75rem 1.5rem;border-radius:10px;font-size:.875rem;z-index:10000;opacity:0;transition:opacity .3s;`;
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(()=>t.style.opacity='1',10);
    setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300)},4000);
}

function shareFlight() { navigator.clipboard.writeText(window.location.href).then(()=>showToast('✈️ Link copied!','success')).catch(()=>showToast('Copy failed','error')); }
function shareWhatsApp() { const url=encodeURIComponent(window.location.href); window.open(`https://wa.me/?text=${encodeURIComponent('Track this flight on FlyerStats:')}%20${url}`,'_blank'); }

async function fetchFlightData(fn, airport) {
    const url = airport ? `/api/flights/${fn}?airport=${airport}` : `/api/flights/${fn}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('API failed');
    return await r.json();
}

async function fetchData() {
    if (!shouldFetchNewData()) { scheduleNextFetch(); return; }
    try {
        const airport = airportInput.value.trim().toUpperCase() || null;
        const data = await fetchFlightData(currentFlightNum, airport);
        currentPlaneData = data; lastFetchTime = Date.now();
        const f = data.flights?.[0];
        if (f) { updateMapPosition(f); if (f.estimated_arrival_time) startETACountdown(f.estimated_arrival_time); updateDataFreshness(); updatePopup(f); }
        scheduleNextFetch();
    } catch(e) { console.warn('Fetch failed:',e); if(!navigator.onLine&&currentPlaneData)activateDeadReckoning(); pollTimer=setTimeout(fetchData,60000); }
}

function shouldFetchNewData() { return !currentPlaneData || (Date.now()-lastFetchTime)>fetchInterval; }
function scheduleNextFetch() { if(pollTimer)clearTimeout(pollTimer); pollTimer=setTimeout(fetchData,Math.max(0,fetchInterval-(Date.now()-lastFetchTime))); }

function startSmoothAnimation() {
    if (!isPageVisible) { animationFrame = setTimeout(startSmoothAnimation, 1000); return; }
    if (currentPlaneData?.flights?.[0] && planeMarker && !isFlightLanded) {
        const f = currentPlaneData.flights[0];
        const vel = f.velocity_kt || f.gs || 0, hdg = f.heading_deg || f.th || 0;
        const lf = planeMarker.getLatLng();
        const wob = Math.sin(Date.now()/1000)*(vel/10000);
        planeMarker.setLatLng([lf.lat+Math.sin(hdg*Math.PI/180)*wob*0.0001, lf.lng+Math.cos(hdg*Math.PI/180)*wob*0.0001]);
    }
    animationFrame = setTimeout(startSmoothAnimation, 100);
}

function startETACountdown(etaStr) {
    if (etaTimer) clearInterval(etaTimer);
    currentEta = new Date(etaStr); isFlightLanded = false;
    updateCountdown(); etaTimer = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    if (!currentEta) return;
    const diff = currentEta - Date.now();
    const cd = document.getElementById('countdown'), et = document.getElementById('etaTime');
    et.textContent = currentEta.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'});
    if (diff <= 0) { isFlightLanded = true; cd.innerHTML = '<span class="countdown landed">✈️ Landed!</span>'; clearInterval(etaTimer); return; }
    const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
    cd.textContent = (h>0?h+'h ':'')+(m>0?m+'m ':'')+s+'s remaining';
    if (h===0 && m<30) { cd.classList.add('landing-soon'); cd.textContent = `⚠️ Landing in ${m}m ${s}s!`; }
    else { cd.classList.remove('landing-soon'); }
}

function updateDataFreshness() {
    const el = document.getElementById('dataFreshness'), dot = document.querySelector('.status-dot-live');
    if (!lastFetchTime) { el.textContent = 'Loading...'; return; }
    const sec = Math.floor((Date.now()-lastFetchTime)/1000), min = Math.floor(sec/60);
    el.textContent = sec<60 ? 'Updated just now' : `Updated ${min}m ago`;
    el.style.color = sec<60 ? '#10b981' : sec<300 ? '#f59e0b' : '#94a3b8';
    dot.className = sec<60 ? 'status-dot-live' : sec<300 ? 'status-dot-warning' : 'status-dot-offline';
}
setInterval(updateDataFreshness, 10000);
function activateDeadReckoning() {
    if (!currentPlaneData?.flights?.[0]) return;
    const f = currentPlaneData.flights[0], spd = f.velocity_kt||450, hdg = f.heading_deg||0;
    offlineBadge.style.display = 'block';
    if (drTimer) clearInterval(drTimer);
    drTimer = setInterval(() => {
        if (!isPageVisible || isFlightLanded) return;
        const drift = (spd/10000)*Math.sin(Date.now()/1000);
        const lf = planeMarker.getLatLng();
        planeMarker.setLatLng([lf.lat+Math.sin(hdg*Math.PI/180)*drift*0.0001, lf.lng+Math.cos(hdg*Math.PI/180)*drift*0.0001]);
    }, 5000);
}

function stopDeadReckoning() { if(drTimer)clearInterval(drTimer); drTimer=null; offlineBadge.style.display='none'; }

window.addEventListener('online', () => { isOnline=true; stopDeadReckoning(); showToast('✅ Online!','success'); if(currentFlightNum){lastFetchTime=0;fetchData();} });
window.addEventListener('offline', () => { isOnline=false; showToast('⚠️ Offline','warning'); if(currentPlaneData&&!isFlightLanded)activateDeadReckoning(); });

function createPlaneIcon(hdg=0) {
    return L.divIcon({
        className: 'animated-plane-marker',
        html: `<div style="position:relative;"><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;background:radial-gradient(circle,rgba(14,165,233,.4) 0%,transparent 70%);border-radius:50%;animation:pulse 2s infinite;"></div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" style="transform:rotate(${hdg}deg);"><path fill="#0ea5e9" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></div>`,
        iconSize: [48, 48], iconAnchor: [24, 24]
    });
}

function updateMapPosition(f) {
    const lat = f.latitude || f.la || 20, lon = f.longitude || f.lo || 0, hdg = f.heading_deg || f.th || 0;
    const icon = createPlaneIcon(hdg);
    if (!planeMarker) {
        planeMarker = L.marker([lat,lon], {icon}).addTo(map);
        planeMarker.bindTooltip('Click for details', {permanent:false, direction:'top', offset:[0,-10]});
        planeMarker.on('click', ()=>showPopup());
    } else { planeMarker.setLatLng([lat,lon]); planeMarker.setIcon(icon); }
    map.panTo([lat,lon], {animate:true, duration:0.5});
}

function createPopupContent(f) {
    return `<div class="popup-content"><div class="popup-header">✈️ ${currentFlightNum}</div>
    <div class="popup-row"><span class="popup-label">Altitude</span><span class="popup-value">${(f.altitude_ft||f.ab||0).toLocaleString()} ft</span></div>
    <div class="popup-row"><span class="popup-label">Speed</span><span class="popup-value">${(f.velocity_kt||f.gs||0).toFixed(1)} kts</span></div>
    <div class="popup-row"><span class="popup-label">Heading</span><span class="popup-value">${(f.heading_deg||f.th||0).toFixed(1)}°</span></div>
    <div class="popup-row"><span class="popup-label">ICAO Hex</span><span class="popup-value">${f.hex || f.h || '---'}</span></div>
    <div class="popup-row"><span class="popup-label">Last Seen</span><span class="popup-value">${f.timestamp || f.ra ? new Date(f.timestamp||f.ra).toLocaleTimeString() : '---'}</span></div></div>`;
}

function showPopup() {
    if (planeMarker && currentPlaneData?.flights?.[0]) {
        planeMarker.bindPopup(createPopupContent(currentPlaneData.flights[0]), {className:'plane-popup', closeButton:true, offset:[0,-20]}).openPopup();
    }
}

function updatePopup(f) { if (document.querySelector('.leaflet-popup')) planeMarker.setPopupContent(createPopupContent(f)); }

function updateURL(fn, airport) {
    const url = airport ? `${window.location.origin}/track/${fn}?airport=${airport}` : `${window.location.origin}/track/${fn}`;
    window.history.pushState({}, '', url);
}

function successAction(fn, fdata, airport) {
    currentFlightNum = fn; currentPlaneData = {flights:[fdata]}; lastFetchTime = Date.now();
    searchOverlay.style.opacity='0'; searchOverlay.style.pointerEvents='none';
    document.getElementById('uiFlightCode').textContent=fn;
    document.getElementById('uiRoute').textContent=`${airport||'???'} ➔ ???`;
    updateURL(fn, airport);
    const lat = fdata.latitude || fdata.la || 20, lon = fdata.longitude || fdata.lo || 0;
    map.flyTo([lat, lon], 8, {duration:2.5});
    setTimeout(()=>{ trackerUI.classList.add('visible'); updateMapPosition(fdata); startETACountdown(fdata.estimated_arrival_time || new Date(Date.now()+7200000).toISOString()); fetchData(); startSmoothAnimation(); }, 2500);
}

function resetSearch() {
    if(pollTimer)clearTimeout(pollTimer); if(animationFrame)clearTimeout(animationFrame); if(etaTimer)clearInterval(etaTimer);
    stopDeadReckoning(); map.closePopup();
    if(planeMarker)map.removeLayer(planeMarker);
    planeMarker=null; currentPlaneData=null; isFlightLanded=false;
    trackerUI.classList.remove('visible'); searchOverlay.style.opacity='1'; searchOverlay.style.pointerEvents='all';
    map.flyTo([20,0],2,{duration:1.5});
    setTimeout(()=>{ flightInput.value=''; airportInput.value=''; document.getElementById('uiFlightCode').textContent='---'; document.getElementById('uiRoute').textContent='--- ➔ ---'; }, 1500);
    window.history.pushState({},'',window.location.origin);
}

function showError(msg) { errorMessage.textContent=msg; errorMessage.classList.add('show'); setTimeout(()=>errorMessage.classList.remove('show'),4000); }

function loadFlightFromURL() {
    const p = window.location.pathname.split('/'); const fn = p[p.length-1];
    const params = new URLSearchParams(window.location.search);
    const airport = params.get('airport') || null;
    if (fn && /^[A-Z0-9]{2,8}$/i.test(fn)) {
        const f = fn.toUpperCase(); flightInput.value=f;
        if (airport) airportInput.value = airport.toUpperCase();
        loader.classList.add('show');
        fetchFlightData(f, airport).then(d=>{const fl=d.flights?.[0];
            if(fl){
                successAction(f, {
                    latitude: fl.latitude||fl.la, longitude: fl.longitude||fl.lo,
                    altitude_ft: fl.altitude_ft||fl.ab, velocity_kt: fl.velocity_kt||fl.gs,
                    heading_deg: fl.heading_deg||fl.th, hex: fl.hex||fl.h,
                    timestamp: fl.timestamp||fl.ra, estimated_arrival_time: new Date(Date.now()+7200000).toISOString()
                }, airport);
            }
            else{loader.classList.remove('show');showError('Flight not found. It may have landed, not departed yet, or is outside coverage. Try adding a departure airport code.');}
        }).catch(()=>{loader.classList.remove('show');showError('Flight not found. It may have landed, not departed yet, or is outside coverage. Try adding a departure airport code.');});
    }
}

flightInput.addEventListener('keypress', async e => {
    if(e.key!=='Enter')return;
    const fn=e.target.value.trim().toUpperCase();
    const airport = airportInput.value.trim().toUpperCase() || null;
    if(!/^[A-Z0-9]{2,8}$/.test(fn))return showError('Invalid flight format');
    if(airport && !AIRPORTS[airport]) return showError('Unknown airport code. Try LHR, JFK, DXB...');
    loader.classList.add('show');
    try{
        const d=await fetchFlightData(fn, airport);
        const fl=d.flights?.[0];
        if(fl){
            successAction(fn, {
                latitude: fl.latitude||fl.la, longitude: fl.longitude||fl.lo,
                altitude_ft: fl.altitude_ft||fl.ab, velocity_kt: fl.velocity_kt||fl.gs,
                heading_deg: fl.heading_deg||fl.th, hex: fl.hex||fl.h,
                timestamp: fl.timestamp||fl.ra, estimated_arrival_time: new Date(Date.now()+7200000).toISOString()
            }, airport);
        }
        else{throw new Error('Not found');}
    }catch(err){
        showError('Flight not found. It may have landed, not departed yet, or is outside coverage. Try adding a departure airport code.');
    }
    loader.classList.remove('show');
});

airportInput.addEventListener('keypress', e => { if(e.key==='Enter') flightInput.dispatchEvent(new KeyboardEvent('keypress',{key:'Enter'})); });

document.addEventListener('visibilitychange',()=>{isPageVisible=document.visibilityState==='visible';if(isPageVisible&&currentFlightNum){fetchData();startSmoothAnimation();}});
if(window.location.pathname.includes('/track/'))loadFlightFromURL();
