// Crypto utilities: passphrase -> roomKey, per-item keys, AES-GCM encryption

const enc = new TextEncoder();
const dec = new TextDecoder();

let roomKeyRaw = null; // Uint8Array 32

export async function genPass() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return b64;
}

export async function deriveRoomKey(passphrase){
  if(!passphrase){ roomKeyRaw = null; return null; }
  const salt = enc.encode('capsule:v1');
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt, iterations: 200_000}, baseKey, 256);
  roomKeyRaw = new Uint8Array(bits);
  return roomKeyRaw;
}

export function getRoomKey() {
  return roomKeyRaw;
}

export async function hkdfItemKey(itemId){
  if(!roomKeyRaw) throw new Error('Room key not derived');
  const key = await crypto.subtle.importKey('raw', roomKeyRaw, 'HKDF', false, ['deriveBits']);
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const bits = await crypto.subtle.deriveBits({name:'HKDF', hash:'SHA-256', salt, info: enc.encode('item:'+itemId)}, key, 256);
  return { key: new Uint8Array(bits), salt };
}

export async function aesGcmEncrypt(rawKey, bytes){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, k, bytes));
  return { iv, ct };
}

export async function aesGcmDecrypt(rawKey, iv, ct){
  const k = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const pt = new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM', iv}, k, ct));
  return pt;
}

export async function sha256Hex(bytes){
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export { enc, dec };
