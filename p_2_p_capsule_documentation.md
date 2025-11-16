# P2P Capsule MVP — System Overview, Capabilities, Deployment, and Extension Guide

This document explains:

- What the **P2P Capsule MVP** actually *is* and what it can do.
- How to deploy it **with no servers, no accounts, no tracking**, using **IPFS subdomain gateways**.
- How users interact with it.
- What each subsystem does internally (WebRTC, Vault, QR, Crypto, etc.).
- Best‑practice guidance for **extending the platform** (Quill, maps, H3 indexing, spreadsheets, etc.).

This is written as a real architectural/developer-facing document suitable for onboarding others or producing a public readme.

---

# 1. What the System Is

**P2P Capsule MVP** is a **single-file, self-contained, serverless application** intended to demonstrate and enable:

- Direct **WebRTC peer-to-peer communication** (text, encrypted file transfer, video)
- **Local encrypted vault storage** (OPFS or User Folder)
- **QR-based signalling** (used instead of servers)
- **Complete offline capability** (via optional SW)
- **Zero backend dependency** — no servers, no databases
- **Private distribution** via IPFS/IPNS (immutable or rotating links)
- Full **browser hardware capabilities**: camera, mic, file system access

The design philosophy:

> *Distribute an app like one distributes a text message: as a static file anyone can open. Let browsers negotiate directly. No central authority, no tracking, no accounts.*

---

# 2. What the System Can Do

## 2.1 Peer-to-peer connection (serverless)

The app uses **manual or QR-based signalling**. Users exchange SDPs directly through:

- Copy/paste
- QR encode → scan

After the offer/answer exchange, connection is established via:

- Public STUN (works \~90% of the time)
- Optional public TURN fallback
- Fully encrypted channels: **DTLS/SRTP/SCTP**

### Supported features over WebRTC

- Text chat (JSON packets)
- File transfer (chunked, AES-GCM encrypted per item)
- Live video (two-way WebRTC track routing)

---

## 2.2 End-to-end cryptography

A **passphrase** is user-supplied or generated.

- PBKDF2(SHA‑256) → 256‑bit master key
- HKDF → unique key per transmitted item
- AES‑GCM for encryption
- WebRTC DTLS handles transport-level encryption

No keys ever leave the browser.

---

## 2.3 Local encrypted vault

The Capsule can store data **client-side only**, encrypted at rest.

Storage modes:

- **User Folder** via File System Access API (if allowed)
- **OPFS** (Origin Private File System) fallback

Vault stores:

- Metadata JSON
- Encrypted chunks (AES-GCM, keyed via HKDF)

Exportable as a bundled binary (demo CAR-like file).

Nothing is uploaded anywhere.

---

## 2.4 QR signalling

Used for exchanging WebRTC negotiation data. Two modes:

- **Show QR** (render offer/answer as QR code)
- **Scan QR** (camera → decode → populate input)

This removes the need for URLs, servers, or messaging platforms entirely.

---

## 2.5 Camera & microphone use

The MVP shows:

- Local preview
- Peer video (if tracks added)

Browser permissions apply normally once deployed on HTTPS or IPFS subdomain gateways.

---

# 3. How to Deploy on IPFS (the important part)

The goal is:

- **No server required for hosting**
- **No account**
- **No central logs**
- **Users click a link and the app opens fully functional**

This is exactly what **IPFS subdomain gateways** allow.

## 3.1 One-time setup (local machine)

```bash
ipfs init
ipfs daemon
```

Keep `ipfs daemon` running.

## 3.2 Publish the file

Save the MVP as:

```
index.html
```

Then:

```bash
ipfs add --cid-version=1 --hash=sha2-256 index.html
# → added <CID> index.html
```

You now have a public, immutable link:

### **https\://****.ipfs.dweb.link/**

This link behaves like a real HTTPS website:

- Browser allows camera
- Browser allows mic
- Browser allows WebRTC
- Browser allows file system access
- Service workers can work

### 3.3 Optional: Create a stable, updatable IPNS name

```bash
ipfs key gen capsule --type=ed25519
ipfs name publish --key=capsule /ipfs/<CID>
```

Your stable URL becomes:

```
https://<PeerID>.ipns.dweb.link/
```

Future updates only require:

```bash
ipfs add index.html
ipfs name publish --key=capsule /ipfs/<newCID>
```

---

# 4. How Users Use the System

### Step 1: Open IPFS link

Example:

```
https://bafybeih...xyz.ipfs.dweb.link/
```

This loads the app in any modern browser.

### Step 2: Create or enter a passphrase

This is the root of all encryption.

### Step 3: Exchange connection info

Either:

- Copy/paste Offer and Answer
- OR Show QR → Scan QR

Once both sides accept each other's Session Description, WebRTC connects.

### Step 4: Use features

- **Chat**: instant messaging
- **Files**: select → encrypted send → decrypt on arrival
- **Camera**: live preview and optionally streamed tracks
- **Vault**: local encrypted storage
- **Publish**: instructions for the developer to distribute modified versions

---

# 5. Developer Architecture Overview

## 5.1 Modules

The MVP includes these subsystems:

- **Crypto**: PBKDF2, HKDF, AES-GCM
- **WebRTC**: peer connection, data channels, media tracks
- **File Transfer**: chunked framing, metadata header + encrypted payload
- **Vault**: FS API / OPFS with encrypted chunks
- **QR System**: render + scanning loops
- **Tests**: built-in verification
- **Service Worker Loader**: disabled in sandbox, ready for deployment

Each subsystem was intentionally written to be:

- Minimal
- Untangled from external libraries
- Extendable

---

# 6. Extending the MVP

The MVP is designed as a **kernel** on which you can build full apps.

Below are the recommended extension areas.

## 6.1 Quill (Rich text editor)

You can embed Quill in a new tab:

### Why Quill works well

- Single-file distribution is fine as long as you inline the JS and CSS
- Editing state can be synced through your existing DataChannel
- You can implement collaborative editing using
  - Operational transforms
  - CRDTs (Y.js or Automerge) — or your own small diff protocol

### Implementation sketch

- Add `<div id="quillEditor"></div>` in a new tab
- Inline Quill JS and CSS
- When user types, send diffs over WebRTC
- When peer diffs arrive, apply them to Quill

**Recommended:** avoid Y.js unless needed — you already have an encrypted DataChannel and can build a simpler OT/CRDT that matches your architecture.

---

## 6.2 Maps + H3 index support

This is a major capability uplift.

### What H3 gives you

- Global hexagonal indexing
- Perfect P2P-friendly geospatial grids
- Easy ways to:
  - Share locations privately
  - Cluster data
  - Represent territories, coverage, proximity

### Recommended stack

- Inline **MapLibre GL JS** (open-source alternative to Mapbox)
- Inline **Uber’s H3 JS** module (converted to a single file or loaded from CDN)

### Example uses

- Real-time friend locator (locations exchanged via WebRTC)
- Shared maps annotated using H3 hexes
- Offline-capable geospatial apps

### Messaging architecture

- Location → H3 index → send index over DataChannel
- Map renders hex highlights

---

## 6.3 Spreadsheets or tabular editing

Two options:

### Option A: Use an embedded spreadsheet library

- Luckysheet (already referenced in previous versions)
- Unofficial but functional offline

### Option B: Build very small spreadsheet-like grid

- 50–200 lines of JS
- Use DataChannel to sync cell updates

For single-file offline apps, often **Option B** is cleaner.

---

## 6.4 Shared whiteboard / drawing

Using `<canvas>` and broadcasting strokes:

- Local pointer events recorded
- Send minimal stroke packets
- Redraw on peer

This is extremely P2P-friendly.

---

# 7. Security Considerations

### ✓ Encryption

- DTLS/SRTP/SCTP (transport)
- AES-GCM (local storage)
- HKDF per item

### ✓ Metadata exposed

Even with encryption:

- IP addresses visible to STUN/TURN (normal for WebRTC)
- TURN relays traffic but cannot decrypt it

You can warn users clearly.

### ✓ No tracking

Nothing is stored server-side. IPFS gateways may log HTTP requests, but content is static and immutable.

---

# 8. Recommended Next Enhancements

- Replace the placeholder QR generator with a proper one (qrcode.js)
- Add a CRDT module for real-time sync apps
- Add Map tab with H3 overlays
- Add plugin system:
  - Each feature = new tab + handler
  - Enforce all data passing through DataChannel for P2P purity

---

# 9. Summary

The P2P Capsule MVP delivers:

- Fully peer-to-peer communication
- Secure local storage
- Browser-native crypto
- No servers anywhere
- Easily distributable via IPFS with full HTTPS-like privileges

It is a foundation for an entire ecosystem of **private, no-backend, user-hosted apps**.

This document outlines:

- How to use it
- How to deploy it
- How to extend it with real-world application modules

You now have a clear path to evolving this into:

- Collaborative editors
- Mapping tools
- Multimedia messengers
- Encrypted personal databases
- Distributed applications without identity or tracking

