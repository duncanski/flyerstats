const map = L.map('map', { zoomControl: false, attributionControl: false, preferCanvas: true }).setView([20, 0], 2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', attribution: '' }).addTo(map);

let planeMarker = null, pollTimer = null, animationFrame = null;
let currentFlightNum = null, currentPlaneData = null, lastFetchTime = 0;
const fetchInterval = 300000;
let isPageVisible = document.visibilityState === 'visible';
let isOnline = navigator.onLine;
let etaTimer = null, currentEta = null, isFlightLanded = false, drTimer = null;

const flightInput = document.getElementById('flightInput');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('errorMessage');
const searchOverlay = document.getElementById('searchOverlay');
const trackerUI = document.getElementById('trackerUI');
const offlineBadge = document.getElementById('offlineBadge');

const FLIGHT_DB = {
    'SQ321': { origin: { code: 'SIN', lat: 1.3644, lon: 103.9915 }, dest: { code: 'LHR' }, status: 'in_air', eta: new Date(Date.now()+28800000).toISOString(), currentLat: 28.6139, currentLon: 77.2090, altitude_ft: 38000, velocity_kt: 480, heading_deg: 315 },
    'BA117': { origin: { code: 'LHR', lat: 51.4700, lon: -0.4543 }, dest: { code: 'JFK' }, status: 'in_air', eta: new Date(Date.now()+21600000).toISOString(), currentLat: 51.5, currentLon: -30.0, altitude_ft: 41000, velocity_kt: 520, heading_deg: 270 }
};

function showToast(msg, type='info') {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:4rem;left:50%;transform:translateX(-50%);background:${type==='error'?'#ef4444':type==='warning'?'#f59e0b':'#10b981'};color:#fff;padding:.75rem 1.5rem;border-radius:10px;font-size:.875rem;z-index:10000;opacity:0;transition:opacity .3s;`;
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(()=>t.style.opacity='1',10);
    setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300)},4000);
}

function shareFlight() {
    navigator.clipboard.writeText(window.location.href).then(()=>showToast('✈️ Link copied!','success')).catch(()=>showToast('Copy failed','error'));
}

function shareWhatsApp() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=${encodeURIComponent('Track this flight on FlyerStats:')}%20${url}`, '_blank');
}

async function fetchFlightData(fn) {
    const r = await fetch(`/api/flights/${fn}`);
    if (!r.ok) throw new Error('API failed');
    return await r.json();
}

async function fetchData() {
    if (!shouldFetchNewData()) { scheduleNextFetch(); return; }
    try {
        const data = await fetchFlightData(currentFlightNum);
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
        const vel = f.velocity_kt || f.ground_speed || 0, hdg = f.heading_deg || f.track || 0;
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
    const f = currentPlaneData.flights[0], spd = f.velocity_kt||450, hdg = f.heading_deg||f.track||0;
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
    const lat = f.latitude || f.currentLat || 20, lon = f.longitude || f.currentLon || 0, hdg = f.heading_deg || f.track || 0;
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
    <div class="popup-row"><span class="popup-label">Altitude</span><span class="popup-value">${(f.altitude_ft||0).toLocaleString()} ft</span></div>
    <div class="popup-row"><span class="popup-label">Speed</span><span class="popup-value">${(f.velocity_kt||0).toFixed(1)} kts</span></div>
    <div class="popup-row"><span class="popup-label">Heading</span><span class="popup-value">${(f.heading_deg||f.track||0).toFixed(1)}°</span></div>
    <div class="popup-row"><span class="popup-label">Hex/ICAO</span><span class="popup-value">${f.hex || f.icao24 || '---'}</span></div>
    <div class="popup-row"><span class="popup-label">Last Seen</span><span class="popup-value">${f.timestamp ? new Date(f.timestamp).toLocaleTimeString() : '---'}</span></div></div>`;
}

function showPopup() {
    if (planeMarker && currentPlaneData?.flights?.[0]) {
        planeMarker.bindPopup(createPopupContent(currentPlaneData.flights[0]), {className:'plane-popup', closeButton:true, offset:[0,-20]}).openPopup();
    }
}

function updatePopup(f) { if (document.querySelector('.leaflet-popup')) planeMarker.setPopupContent(createPopupContent(f)); }

function updateURL(fn) { window.history.pushState({},'',`${window.location.origin}/track/${fn}`); }

function successAction(fn, fdata) {
    currentFlightNum = fn; currentPlaneData = {flights:[fdata]}; lastFetchTime = Date.now();
    searchOverlay.style.opacity='0'; searchOverlay.style.pointerEvents='none';
    document.getElementById('uiFlightCode').textContent=fn;
    document.getElementById('uiRoute').textContent=`${fdata.origin_code||'???'} ➔ ${fdata.dest_code||'???'}`;
    updateURL(fn);
    map.flyTo([fdata.latitude||20, fdata.longitude||0], 8, {duration:2.5});
    setTimeout(()=>{ trackerUI.classList.add('visible'); updateMapPosition(fdata); startETACountdown(fdata.estimated_arrival_time||new Date(Date.now()+10800000).toISOString()); fetchData(); startSmoothAnimation(); }, 2500);
}

function resetSearch() {
    if(pollTimer)clearTimeout(pollTimer); if(animationFrame)clearTimeout(animationFrame); if(etaTimer)clearInterval(etaTimer);
    stopDeadReckoning(); map.closePopup();
    if(planeMarker)map.removeLayer(planeMarker);
    planeMarker=null; currentPlaneData=null; isFlightLanded=false;
    trackerUI.classList.remove('visible'); searchOverlay.style.opacity='1'; searchOverlay.style.pointerEvents='all';
    map.flyTo([20,0],2,{duration:1.5});
    setTimeout(()=>{ flightInput.value=''; document.getElementById('uiFlightCode').textContent='---'; document.getElementById('uiRoute').textContent='--- ➔ ---'; }, 1500);
    window.history.pushState({},'',window.location.origin);
}

function showError(msg) { errorMessage.textContent=msg; errorMessage.classList.add('show'); setTimeout(()=>errorMessage.classList.remove('show'),3000); }

function loadFlightFromURL() {
    const p = window.location.pathname.split('/'); const fn = p[p.length-1];
    // FIXED REGEX HERE: Allow up to 8 characters
    if (fn && /^[A-Z0-9]{2,8}$/i.test(fn)) {
        const f = fn.toUpperCase(); flightInput.value=f; loader.classList.add('show');
        fetchFlightData(f).then(d=>{const fl=d.flights?.[0];
            if(fl){
                successAction(f, {
                    origin_code: '---', dest_code: '---',
                    latitude: fl.latitude, longitude: fl.longitude,
                    altitude_ft: fl.altitude_ft, velocity_kt: fl.velocity_kt,
                    heading_deg: fl.heading_deg, track: fl.heading_deg, hex: fl.hex,
                    timestamp: fl.timestamp, estimated_arrival_time: new Date(Date.now()+7200000).toISOString()
                });
            }
            else{loader.classList.remove('show');}
        }).catch(()=>loader.classList.remove('show'));
    }
}

flightInput.addEventListener('keypress', async e => {
    if(e.key!=='Enter')return;
    const fn=e.target.value.trim().toUpperCase();
    // FIXED REGEX HERE: Allow up to 8 characters
    if(!/^[A-Z0-9]{2,8}$/.test(fn))return showError('Invalid format');
    loader.classList.add('show');
    try{const d=await fetchFlightData(fn);const fl=d.flights?.[0];
        if(fl){
            successAction(fn, {
                origin_code: '---', dest_code: '---',
                latitude: fl.latitude, longitude: fl.longitude,
                altitude_ft: fl.altitude_ft, velocity_kt: fl.velocity_kt,
                heading_deg: fl.heading_deg, track: fl.heading_deg, hex: fl.hex,
                timestamp: fl.timestamp, estimated_arrival_time: new Date(Date.now()+7200000).toISOString()
            });
        }
        else if(FLIGHT_DB[fn]){successAction(fn,FLIGHT_DB[fn]);}
        else{throw new Error('Not found');}
    }catch(err){if(FLIGHT_DB[fn]){successAction(fn,FLIGHT_DB[fn]);}else{showError('Flight not found. Try a live flight like RYR9911.');}}
    loader.classList.remove('show');
});

document.addEventListener('visibilitychange',()=>{isPageVisible=document.visibilityState==='visible';if(isPageVisible&&currentFlightNum){fetchData();startSmoothAnimation();}});
if(window.location.pathname.includes('/track/'))loadFlightFromURL();
