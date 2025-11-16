// Self-test routines

import { deriveRoomKey, getRoomKey, enc, dec } from './crypto.js';
import { showQR, hideQRModal } from './qr.js';

const $ = sel => document.querySelector(sel);

export async function runTests(){
  const log = (m)=>{ const el=$('#testLog'); el.textContent += m+"\n"; };
  $('#testLog').textContent='';
  $('#testStatus').textContent='running';
  try{
    const must = ['#qrModal','#qrCanvas','#qrVideo','#offerOut','#answerIn','#offerIn','#answerOut'];
    must.forEach(sel=>{ if(!$(sel)) throw new Error('Missing element: '+sel); });
    log('✓ DOM elements present');

    showQR('test-payload');
    const m = $('#qrModal'); if(!m || m.classList.contains('hidden')) throw new Error('QR modal did not open');
    // Escape should close
    document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'}));
    if(!m.classList.contains('hidden')) throw new Error('ESC did not close modal');
    log('✓ QR modal open/ESC close');

    const head = JSON.stringify({ t:'file-chunk', itemId:'X', idx:0, iv:[1,2,3,4,5,6,7,8,9,10,11,12], len:5 });
    const payload = new Uint8Array([10,20,30,40,50]);
    const headBytes = enc.encode(head + "\n");
    const pkt = new Uint8Array(headBytes.length + payload.length);
    pkt.set(headBytes,0); pkt.set(payload, headBytes.length);
    const nl = pkt.indexOf(10);
    const parsed = JSON.parse(dec.decode(pkt.slice(0,nl)));
    if(parsed.t!== 'file-chunk' || parsed.len!==5) throw new Error('Framing parse failed');
    log('✓ Packet framing');

    $('#passphrase').value = 'unit-test-pass';
    await deriveRoomKey('unit-test-pass');
    if(!getRoomKey() || getRoomKey().length!==32) throw new Error('Key derivation failed');
    log('✓ Key derivation');

    $('#testStatus').textContent='PASS';
  }catch(e){
    $('#testStatus').textContent='FAIL';
    const msg = (e && e.stack) ? e.stack : String(e);
    const el=$('#testLog'); el.textContent += 'ERROR: '+msg+"\n";
  }
}
