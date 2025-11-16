// Service Worker registration helpers

export function canUsePageSW(){
  try{ 
    if(!('serviceWorker' in navigator)) return false;
    if(!isSecureContext) return false;
    if(!/^https?:$/.test(location.protocol)) return false; // no file:, blob:, data:
    return true; 
  }catch{ 
    return false; 
  }
}

export async function registerPageSW(){
  if(!canUsePageSW()) return;
  try{ 
    await navigator.serviceWorker.register('./sw.js', { scope: './' }); 
  }
  catch(e){ 
    console.warn('SW skipped:', e?.message||e); 
  }
}
