// QR utilities: render QR, scan QR, modal management

const $ = sel => document.querySelector(sel);

let qrScanStream = null;
let qrScanTimer = null;

export function hideQRModal(){
  const m = $('#qrModal');
  if(m && !m.classList.contains('hidden')) m.classList.add('hidden');
  stopQRScanner();
}

export function showQR(text){
  try{
    if(!text){ alert('Nothing to encode'); return; }
    const modal = $('#qrModal');
    if(!modal){ alert('QR modal not found'); return; }
    modal.classList.remove('hidden');
    $('#qrVideo').style.display='none';
    const c = $('#qrCanvas'); const ctx = c.getContext('2d');
    if(!ctx){ $('#qrHint').textContent='Canvas unavailable'; return; }
    const qr = new window.QRCode(4, 1); qr.addData(text); qr.make();
    const scale = 6; c.width = c.height = qr.getModuleCount()*scale;
    qr.renderTo2dContext(ctx, scale);
    $('#qrHint').textContent = 'Scan this with the other device';
    $('#qrBox').focus();
  }catch(err){
    console.error('QR render failed', err);
    $('#qrHint').textContent = 'QR failed to render';
  }
}

export async function scanQRInto(target){
  const modal = $('#qrModal'); if(!modal){ alert('QR modal not found'); return; }
  modal.classList.remove('hidden');
  const cvs = $('#qrCanvas'); const ctx = cvs.getContext('2d'); if(ctx) ctx.clearRect(0,0,cvs.width||1,cvs.height||1);
  const vid = $('#qrVideo'); vid.style.display='block';
  try{
    if('BarcodeDetector' in window){
      const det = new BarcodeDetector({formats:['qr_code']});
      qrScanStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      vid.srcObject = qrScanStream; await vid.play();
      const loop = async()=>{
        if(!qrScanStream) return;
        const canvas = document.createElement('canvas');
        canvas.width = vid.videoWidth; canvas.height=vid.videoHeight;
        const ctx2 = canvas.getContext('2d'); ctx2.drawImage(vid,0,0);
        const codes = await det.detect(canvas);
        if(codes && codes[0]){ target.value = codes[0].rawValue.trim(); hideQRModal(); return; }
        qrScanTimer = setTimeout(loop, 200);
      }; loop();
      $('#qrHint').textContent = 'Point your camera at the QR';
      $('#qrBox').focus();
    } else {
      $('#qrHint').textContent = 'QR scanning not supported. Use copy/paste.';
    }
  }catch(e){ $('#qrHint').textContent = 'Camera error: '+e.message; }
}

function stopQRScanner(){ 
  if(qrScanTimer) clearTimeout(qrScanTimer); 
  if(qrScanStream){ 
    qrScanStream.getTracks().forEach(t=>t.stop()); 
    qrScanStream=null; 
  } 
}

export function setupQREventListeners() {
  // Close via button, overlay click, or ESC
  document.addEventListener('click', (e)=>{
    if(e.target && (e.target.id==='qrClose' || e.target.id==='qrModal')) hideQRModal();
  });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideQRModal(); });
}
