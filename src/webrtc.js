// WebRTC core: peer connection, data channels, chat, file transfer

import { getRoomKey, hkdfItemKey, aesGcmEncrypt, aesGcmDecrypt, sha256Hex, enc, dec } from './crypto.js';

const $ = sel => document.querySelector(sel);
const sleep = ms => new Promise(r=>setTimeout(r,ms));

let pc, dc, localStream;
let iceServers = [];

const CHUNK = 256*1024; // 256 KiB
let recvCtx = null;

export function setIceServers(servers) {
  iceServers = servers;
}

export function getIceServers() {
  return iceServers;
}

function newPC(){
  pc = new RTCPeerConnection({ iceServers });
  pc.oniceconnectionstatechange = ()=> $('#iceStatus').textContent = pc.iceConnectionState;
  pc.ondatachannel = e => attachDC(e.channel);
  pc.ontrack = e => { $('#videoPeer').srcObject = e.streams[0]; };
}

function attachDC(channel){
  dc = channel;
  dc.binaryType = 'arraybuffer';
  dc.onopen = ()=> logChat('[system] datachannel open');
  dc.onmessage = onDCMessage;
}

function logChat(msg){
  const div = document.createElement('div'); div.textContent = msg; $('#chatLog').appendChild(div); $('#chatLog').scrollTop = 1e9;
}

function waitIceGathering(){
  return new Promise(res=>{
    if(pc.iceGatheringState === 'complete') return res();
    const chk = ()=> pc.iceGatheringState === 'complete' && res();
    pc.addEventListener('icegatheringstatechange', chk);
    setTimeout(()=>res(), 1200);
  });
}

export async function createOffer(roomKeyRequired = true){
  if(roomKeyRequired && !getRoomKey()){ throw new Error('Room key required'); }
  newPC();
  attachDC(pc.createDataChannel('data'));
  if(localStream) localStream.getTracks().forEach(t=>pc.addTrack(t, localStream));
  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
  await pc.setLocalDescription(offer);
  await waitIceGathering();
  return btoa(JSON.stringify(pc.localDescription));
}

export async function acceptAnswer(answerSdp){
  await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(answerSdp))));
}

export async function createAnswer(offerSdp, roomKeyRequired = true){
  if(roomKeyRequired && !getRoomKey()){ throw new Error('Room key required'); }
  newPC();
  pc.ondatachannel = e => attachDC(e.channel);
  await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(offerSdp))));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitIceGathering();
  return btoa(JSON.stringify(pc.localDescription));
}

export function sendChat(message){
  if(!dc || dc.readyState!=='open') throw new Error('Not connected');
  dc.send(JSON.stringify({ t:'chat', m: message }));
  logChat('you: '+message);
}

function onDCMessage(ev){
  const data = typeof ev.data === 'string' ? ev.data : dec.decode(new Uint8Array(ev.data));
  try {
    const obj = JSON.parse(data);
    if(obj.t==='chat'){ logChat('peer: '+obj.m); }
    if(obj.t==='file-meta'){ receivePrepare(obj); }
    if(obj.t==='file-chunk'){ receiveChunk(obj); }
  } catch(e){ console.warn('non-json', e); }
}

export async function sendFiles(files){
  if(!dc || dc.readyState!=='open') throw new Error('Not connected');
  if(!getRoomKey()) throw new Error('Room key required');
  for(const f of files){ await sendOneFile(f); }
}

async function sendOneFile(file){
  $('#sendStatus').textContent = 'sending '+file.name;
  const itemId = 'itm_'+(await sha256Hex(enc.encode(file.name+file.size+file.type+Date.now()))).slice(0,12);
  const { key:itemKey } = await hkdfItemKey(itemId);
  const meta = { t:'file-meta', itemId, name:file.name, type:file.type, size:file.size, chunk:CHUNK };
  dc.send(JSON.stringify(meta));
  const reader = file.stream().getReader();
  let sent=0, idx=0; for(;;){
    const {done, value} = await reader.read(); if(done) break;
    const { iv, ct } = await aesGcmEncrypt(itemKey, value);
    const head = JSON.stringify({ t:'file-chunk', itemId, idx, iv: Array.from(iv), len: ct.byteLength });
    const headBytes = enc.encode(head + "\n");
    const packet = new Uint8Array(headBytes.length + ct.byteLength);
    packet.set(headBytes, 0);
    packet.set(new Uint8Array(ct), headBytes.length);
    dc.send(packet.buffer);
    sent += value.byteLength; idx++;
    $('#sendMeter').style.width = Math.round(100*sent/file.size)+'%';
    await sleep(0);
  }
  $('#sendStatus').textContent = 'done'; $('#sendMeter').style.width='0%';
}

async function receivePrepare(meta){
  recvCtx = { itemId: meta.itemId, name: meta.name, type: meta.type, size: meta.size, chunk: meta.chunk, received: 0, chunks: [] };
  $('#recvList').insertAdjacentHTML('beforeend', `<div id="r-${meta.itemId}">Receiving <b>${meta.name}</b>… <span class="pill" id="rstat-${meta.itemId}">0%</span></div>`);
}

async function receiveChunk(packet){
  const buf = packet instanceof ArrayBuffer ? new Uint8Array(packet) : enc.encode(packet);
  const nl = buf.indexOf(10);
  if(nl < 0) { console.warn('Malformed packet: no delimiter'); return; }
  const head = JSON.parse(dec.decode(buf.slice(0,nl)));
  const ct = buf.slice(nl+1);
  if(!recvCtx || recvCtx.itemId !== head.itemId) return;
  const { key:itemKey } = await hkdfItemKey(recvCtx.itemId);
  const pt = await aesGcmDecrypt(itemKey, new Uint8Array(head.iv), ct);
  recvCtx.received += pt.byteLength;
  recvCtx.chunks.push(pt);
  $('#recvMeter').style.width = Math.round(100*recvCtx.received/revSafe(recvCtx.size))+'%';
  const s = $('#rstat-'+recvCtx.itemId); if(s) s.textContent = Math.round(100*recvCtx.received/revSafe(recvCtx.size))+'%';
  if(recvCtx.received >= recvCtx.size){
    const blob = new Blob(recvCtx.chunks, { type: recvCtx.type || 'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = recvCtx.name || 'file'; a.click();
    $('#recvMeter').style.width='0%';
    recvCtx = null;
  }
}

function revSafe(n){ return Math.max(1, n|0); }

export async function enableCamera(){
  const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
  localStream = stream; 
  $('#videoSelf').srcObject = stream; 
  $('#camStatus').textContent='on';
  if(pc) stream.getTracks().forEach(t=>pc.addTrack(t, stream));
  return stream;
}

export function getLocalStream() {
  return localStream;
}

export function getDataChannel() {
  return dc;
}
