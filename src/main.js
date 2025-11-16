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
  enableCamera 
} from './webrtc.js';
import { chooseVaultFolder, addToVault, exportVaultCAR } from './vault.js';
import { runTests } from './tests.js';

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

// Setup QR modal event listeners
setupQREventListeners();

// Initialize key status on load
deriveRoomKey($('#passphrase').value || '').then(updateKeyStatus);
