// Local Vault: OPFS/User Folder vault storage, listing, export

import { getRoomKey, hkdfItemKey, aesGcmEncrypt, sha256Hex, enc } from './crypto.js';

const $ = sel => document.querySelector(sel);

let vault = { mode: 'none', root: null, items: [] };

export async function chooseVaultFolder(){
  if('showDirectoryPicker' in window){
    try{
      const handle = await window.showDirectoryPicker({ id:'capsule-vault' });
      const perm = await handle.requestPermission({ mode:'readwrite' });
      if(perm !== 'granted') throw new Error('permission denied');
      vault.mode='fs'; vault.root=handle; $('#vaultWhere').textContent='User Folder';
    }catch(e){ console.warn(e); await useOPFS(); }
  } else {
    await useOPFS();
  }
}

async function useOPFS(){
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle('capsule-vault', { create:true });
  vault.mode='opfs'; vault.root=dir; $('#vaultWhere').textContent='OPFS';
}

export async function addToVault(files){
  if(!getRoomKey()) throw new Error('Room key required');
  if(!vault.root){ await useOPFS(); }
  for(const f of files){ await vaultStoreOne(f); }
  $('#vaultStatus').textContent = 'added '+files.length+' file(s)';
  await listVault();
}

async function vaultStoreOne(file){
  const itemId = 'itm_'+(await sha256Hex(enc.encode(file.name+file.size+file.type+Date.now()))).slice(0,12);
  const chunksDir = await getDir('chunks');
  const metaDir = await getDir('items');
  const { key:itemKey } = await hkdfItemKey(itemId);
  const reader = file.stream().getReader(); let idx=0; const chunkPaths=[]; let total=0;
  for(;;){
    const {done, value} = await reader.read(); if(done) break; total += value.byteLength;
    const { iv, ct } = await aesGcmEncrypt(itemKey, value);
    const sub = await chunksDir.getDirectoryHandle(itemId.slice(0,2), { create:true });
    const fh = await sub.getFileHandle(`${itemId}-${idx}.chunk`, { create:true });
    const ws = await fh.createWritable(); await ws.write(iv); await ws.write(ct); await ws.close();
    chunkPaths.push({ idx, path:`chunks/${itemId.slice(0,2)}/${itemId}-${idx}.chunk`, len: (12+ct.byteLength) });
    idx++;
  }
  const meta = { id:itemId, name:file.name, type:file.type, size: total, createdAt: new Date().toISOString(), chunks: chunkPaths };
  const mf = await metaDir.getFileHandle(`${itemId}.json`, { create:true }); const w = await mf.createWritable();
  await w.write(JSON.stringify(meta)); await w.close();
}

export async function listVault(){
  const metaDir = await getDir('items');
  const list = [];
  for await (const entry of metaDir.values()){
    if(entry.kind==='file' && entry.name.endsWith('.json')){
      const f = await entry.getFile(); const obj = JSON.parse(await f.text()); list.push(obj);
    }
  }
  vault.items = list.sort((a,b)=> a.createdAt.localeCompare(b.createdAt));
  $('#vaultList').innerHTML = vault.items.map(i=>`<div><b>${i.name}</b> — ${(i.size/1024/1024).toFixed(2)} MiB <span class="muted">${i.id}</span></div>`).join('');
}

export async function exportVaultCAR(){
  const metaDir = await getDir('items');
  const chunksDir = await getDir('chunks');
  const parts = [];
  const mf = new Blob([JSON.stringify({ items: vault.items })], { type:'application/json' });
  parts.push(new Uint8Array(await mf.arrayBuffer()));
  for await (const d1 of chunksDir.values()){
    if(d1.kind==='directory'){
      for await (const f of d1.values()){
        if(f.kind==='file' && f.name.endsWith('.chunk')){
          parts.push(new Uint8Array(await (await f.getFile()).arrayBuffer()));
        }
      }
    }
  }
  const blob = new Blob(parts, { type:'application/octet-stream' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vault-export.bin'; a.click();
}

async function getDir(name){
  if(vault.mode==='fs') return await vault.root.getDirectoryHandle(name, { create:true });
  return await vault.root.getDirectoryHandle(name, { create:true });
}

export function getVault() {
  return vault;
}
