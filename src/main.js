// Main entry point - wires up DOM and modules

import { genPass, deriveRoomKey, getRoomKey } from './crypto.js';
import { setupQREventListeners, showQR, scanQRInto } from './qr.js';
import { 
  setIceServers, 
  getIceServers, 
  createOffer, 
  acceptAnswer, 
  createAnswer, 
  sendChat, 
  sendFiles, 
  enableCamera,
  sendLocation
} from './webrtc.js';
import { chooseVaultFolder, addToVault, exportVaultCAR } from './vault.js';
import { runTests } from './tests.js';
import {
  initMap,
  getDeviceLocation,
  geocodeAddress,
  addUserLocation,
  addPeerLocation,
  addH3Hexagon,
  createLocationMessage,
  parseLocationMessage,
  setH3Resolution,
  getH3Resolution,
  clearPeerLocations,
  clearH3Hexagons,
  latLngToH3
} from './map.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// Initialize tabs
$$('.tabs button').forEach(b=>b.addEventListener('click',()=>{
  $$('.card').forEach(s=>s.classList.add('hidden'));
  const t = b.dataset.tab; $('#tab-'+t).classList.remove('hidden');
}));

// Crypto UI
$('#btnGenPass').onclick = async () => {
  const pass = await genPass();
  $('#passphrase').value = pass;
  await deriveRoomKey(pass);
  updateKeyStatus();
};

$('#passphrase').addEventListener('change', async () => {
  const pass = $('#passphrase').value;
  await deriveRoomKey(pass);
  updateKeyStatus();
});

function updateKeyStatus() {
  $('#keyStatus').textContent = getRoomKey() ? 'key ready' : 'no key';
}

// ICE servers
try {
  const defaultIce = [
    {"urls": ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"]},
    {"urls": ["turns:openrelay.metered.ca:443?transport=tcp"], "username":"openrelayproject", "credential":"openrelayproject"},
    {"urls": ["turn:openrelay.metered.ca:80?transport=tcp"], "username":"openrelayproject", "credential":"openrelayproject"}
  ];
  setIceServers(defaultIce);
} catch(e) {
  console.error('Failed to set default ICE servers', e);
}

$('#btnApplyIce').onclick = ()=> {
  try { 
    setIceServers(JSON.parse($('#iceJson').value)); 
    $('#iceApplied').textContent = 'applied'; 
  } catch(e){ 
    alert('bad ICE JSON'); 
  }
};

// WebRTC connection
$('#btnCreate').onclick = async () => {
  if(!getRoomKey()){ 
    await deriveRoomKey($('#passphrase').value); 
    if(!getRoomKey()) return alert('Set passphrase first'); 
  }
  try {
    const sdp = await createOffer();
    $('#offerOut').value = sdp;
  } catch(e) {
    alert('Failed to create offer: ' + e.message);
  }
};

$('#btnOfferQR').onclick = ()=> showQR($('#offerOut').value || '');

$('#btnScanAnswer').onclick = ()=> scanQRInto($('#answerIn'));

$('#btnAcceptAnswer').onclick = async () => {
  const ans = $('#answerIn').value.trim();
  if(!ans) return alert('paste/scan answer');
  try {
    await acceptAnswer(ans);
  } catch(e) {
    alert('Failed to accept answer: ' + e.message);
  }
};

$('#btnScanOffer').onclick = ()=> scanQRInto($('#offerIn'));

$('#btnAnswer').onclick = async () => {
  if(!getRoomKey()){ 
    await deriveRoomKey($('#passphrase').value); 
    if(!getRoomKey()) return alert('Set passphrase first'); 
  }
  const offer = $('#offerIn').value.trim();
  if(!offer) return alert('paste/scan offer');
  try {
    const sdp = await createAnswer(offer);
    $('#answerOut').value = sdp;
  } catch(e) {
    alert('Failed to create answer: ' + e.message);
  }
};

$('#btnAnswerQR').onclick = ()=> showQR($('#answerOut').value || '');

// Chat
$('#btnSend').onclick = () => {
  const msg = $('#chatInput').value; if(!msg) return;
  try {
    sendChat(msg);
    $('#chatInput').value='';
  } catch(e) {
    alert(e.message);
  }
};

// File transfer
$('#btnSendFiles').onclick = async () => {
  const files = $('#filePick').files; if(!files.length) return;
  try {
    await sendFiles(Array.from(files));
  } catch(e) {
    alert(e.message);
  }
};

// Vault
$('#btnChooseFolder').onclick = chooseVaultFolder;
$('#btnVaultAdd').onclick = async () => {
  const files = $('#vaultImport').files; if(!files.length) return;
  try {
    await addToVault(Array.from(files));
  } catch(e) {
    alert(e.message);
  }
};
$('#btnExportVault').onclick = exportVaultCAR;

// Camera
$('#btnCam').onclick = async () => {
  try {
    await enableCamera();
  } catch(err) {
    alert('Camera/mic failed: '+err.name+': '+err.message);
  }
};

// Tests
$('#btnRunTests').onclick = runTests;

// Map functionality
let mapInitialized = false;
let currentUserLocation = null;

// Initialize map when tab is first accessed
$$('.tabs button').forEach(b => {
  if (b.dataset.tab === 'map') {
    b.addEventListener('click', () => {
      if (!mapInitialized) {
        try {
          initMap('map');
          mapInitialized = true;
          console.log('Map initialized');
        } catch (e) {
          console.error('Failed to initialize map:', e);
          alert('Failed to initialize map: ' + e.message);
        }
      }
    });
  }
});

// Device location
$('#btnDeviceLocation').onclick = async () => {
  $('#locationStatus').textContent = 'getting...';
  try {
    const location = await getDeviceLocation();
    currentUserLocation = location;
    addUserLocation(location.lat, location.lng, 'Your device location');
    $('#latInput').value = location.lat.toFixed(6);
    $('#lngInput').value = location.lng.toFixed(6);
    $('#locationStatus').textContent = 'got location';
    setTimeout(() => $('#locationStatus').textContent = 'idle', 2000);
  } catch (e) {
    $('#locationStatus').textContent = 'failed';
    alert('Failed to get device location: ' + e.message);
    setTimeout(() => $('#locationStatus').textContent = 'idle', 2000);
  }
};

// Geocode address
$('#btnGeocodeAddress').onclick = async () => {
  const address = $('#addressInput').value.trim();
  if (!address) {
    alert('Enter an address');
    return;
  }
  
  $('#locationStatus').textContent = 'geocoding...';
  try {
    const location = await geocodeAddress(address);
    currentUserLocation = location;
    addUserLocation(location.lat, location.lng, location.display_name || address);
    $('#latInput').value = location.lat.toFixed(6);
    $('#lngInput').value = location.lng.toFixed(6);
    $('#locationStatus').textContent = 'found';
    setTimeout(() => $('#locationStatus').textContent = 'idle', 2000);
  } catch (e) {
    $('#locationStatus').textContent = 'failed';
    alert('Geocoding failed: ' + e.message);
    setTimeout(() => $('#locationStatus').textContent = 'idle', 2000);
  }
};

// Manual lat/lng
$('#btnManualLocation').onclick = () => {
  const lat = parseFloat($('#latInput').value);
  const lng = parseFloat($('#lngInput').value);
  
  if (isNaN(lat) || isNaN(lng)) {
    alert('Enter valid latitude and longitude');
    return;
  }
  
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    alert('Latitude must be -90 to 90, longitude -180 to 180');
    return;
  }
  
  currentUserLocation = { lat, lng };
  addUserLocation(lat, lng, 'Manual location');
  $('#locationStatus').textContent = 'set';
  setTimeout(() => $('#locationStatus').textContent = 'idle', 1000);
};

// H3 resolution selector
$('#h3ResolutionSelect').onchange = (e) => {
  setH3Resolution(parseInt(e.target.value));
};

// Share exact coordinates
$('#btnShareExact').onclick = () => {
  if (!currentUserLocation) {
    alert('Set your location first');
    return;
  }
  
  try {
    const label = $('#pinLabel').value.trim() || 'My location';
    const message = createLocationMessage(
      currentUserLocation.lat,
      currentUserLocation.lng,
      label,
      false
    );
    sendLocation(message);
    alert('Sent exact coordinates');
  } catch (e) {
    alert('Failed to send location: ' + e.message);
  }
};

// Share H3 hex
$('#btnShareH3').onclick = () => {
  if (!currentUserLocation) {
    alert('Set your location first');
    return;
  }
  
  try {
    const label = $('#pinLabel').value.trim() || 'My H3 location';
    const resolution = getH3Resolution();
    const message = createLocationMessage(
      currentUserLocation.lat,
      currentUserLocation.lng,
      label,
      true,
      resolution
    );
    
    // Show the H3 hex on local map
    const h3Index = latLngToH3(currentUserLocation.lat, currentUserLocation.lng, resolution);
    addH3Hexagon(h3Index, '#6ae3ff', 0.3);
    
    sendLocation(message);
    alert('Sent H3 hex (res ' + resolution + ')');
  } catch (e) {
    alert('Failed to send H3 location: ' + e.message);
  }
};

// Handle pin drops on map
document.addEventListener('map-pin-drop', (e) => {
  const { lat, lng } = e.detail;
  $('#latInput').value = lat.toFixed(6);
  $('#lngInput').value = lng.toFixed(6);
  currentUserLocation = { lat, lng };
  addUserLocation(lat, lng, 'Dropped pin');
});

// Handle incoming peer locations
document.addEventListener('peer-location', (e) => {
  try {
    const location = parseLocationMessage(e.detail);
    addPeerLocation('peer', location.lat, location.lng, location.label, location.isH3);
    
    // If H3 hex, also show the hexagon
    if (location.h3Index) {
      addH3Hexagon(location.h3Index, '#3bd671', 0.3);
    }
    
    console.log('Received peer location:', location);
  } catch (e) {
    console.error('Failed to parse peer location:', e);
  }
});

// Clear map markers
$('#btnClearMap').onclick = () => {
  clearPeerLocations();
  clearH3Hexagons();
};

// Setup QR modal event listeners
setupQREventListeners();

// Initialize key status on load
deriveRoomKey($('#passphrase').value || '').then(updateKeyStatus);
