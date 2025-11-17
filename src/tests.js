// Self-test routines

import { deriveRoomKey, getRoomKey, enc, dec } from './crypto.js';
import { showQR, hideQRModal } from './qr.js';
import { 
  latLngToH3, 
  h3ToLatLng, 
  createLocationMessage, 
  parseLocationMessage,
  setH3Resolution,
  getH3Resolution
} from './map.js';

const $ = sel => document.querySelector(sel);

export async function runTests(){
  const log = (m)=>{ const el=$('#testLog'); el.textContent += m+"\n"; };
  $('#testLog').textContent='';
  $('#testStatus').textContent='running';
  try{
    const must = ['#qrModal','#qrCanvas','#qrVideo','#offerOut','#answerIn','#offerIn','#answerOut','#map'];
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

    // Test H3 conversion (requires H3 library loaded)
    if(window.h3) {
      const testLat = 37.7749;
      const testLng = -122.4194;
      const testRes = 9;
      
      setH3Resolution(testRes);
      if(getH3Resolution() !== testRes) throw new Error('H3 resolution set/get failed');
      
      const h3Index = latLngToH3(testLat, testLng, testRes);
      if(!h3Index || typeof h3Index !== 'string') throw new Error('H3 latLngToH3 failed');
      
      const converted = h3ToLatLng(h3Index);
      if(!converted || !converted.lat || !converted.lng) throw new Error('H3 h3ToLatLng failed');
      
      // Should be close to original (within hexagon bounds)
      const latDiff = Math.abs(converted.lat - testLat);
      const lngDiff = Math.abs(converted.lng - testLng);
      if(latDiff > 0.01 || lngDiff > 0.01) throw new Error('H3 conversion accuracy failed');
      
      log('✓ H3 conversion (res '+testRes+')');
      
      // Test location message creation
      const exactMsg = createLocationMessage(testLat, testLng, 'Test location', false);
      if(exactMsg.type !== 'location' || exactMsg.lat !== testLat || exactMsg.lng !== testLng) {
        throw new Error('Exact location message creation failed');
      }
      if(exactMsg.isH3 || exactMsg.h3) throw new Error('Exact message should not have H3');
      log('✓ Exact location message');
      
      const h3Msg = createLocationMessage(testLat, testLng, 'Test H3', true, testRes);
      if(h3Msg.type !== 'location' || !h3Msg.isH3 || !h3Msg.h3) {
        throw new Error('H3 location message creation failed');
      }
      if(h3Msg.h3Resolution !== testRes) throw new Error('H3 resolution mismatch');
      log('✓ H3 location message');
      
      // Test message parsing
      const parsedExact = parseLocationMessage(exactMsg);
      if(parsedExact.lat !== testLat || parsedExact.lng !== testLng || parsedExact.isH3) {
        throw new Error('Exact message parsing failed');
      }
      log('✓ Parse exact location');
      
      const parsedH3 = parseLocationMessage(h3Msg);
      if(!parsedH3.isH3 || !parsedH3.h3Index) throw new Error('H3 message parsing failed');
      // Parsed H3 location should use center of hexagon
      const h3LatDiff = Math.abs(parsedH3.lat - converted.lat);
      const h3LngDiff = Math.abs(parsedH3.lng - converted.lng);
      if(h3LatDiff > 0.001 || h3LngDiff > 0.001) throw new Error('H3 message center failed');
      log('✓ Parse H3 location');
    } else {
      log('⚠ H3 library not loaded, skipping H3 tests');
    }

    $('#testStatus').textContent='PASS';
  }catch(e){
    $('#testStatus').textContent='FAIL';
    const msg = (e && e.stack) ? e.stack : String(e);
    const el=$('#testLog'); el.textContent += 'ERROR: '+msg+"\n";
  }
}
