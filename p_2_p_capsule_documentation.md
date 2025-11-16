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

**P2P Capsule MVP** is a **modular, self-contained, serverless application** that supports both multi-file and single-file deployment modes. It is intended to demonstrate and enable:

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

# 3. How to Deploy

The system supports two deployment models:

1. **Standard multi-file bundle** in `dist/` for GitHub Pages and typical static hosting
2. **Fully inlined single-file** in `dist-inline/index.html` for one-file IPFS/IPNS distribution

## 3.1 Building the Application

### Prerequisites

```bash
# Install Node.js and npm, then install dependencies
npm install
```

### Standard Build (Multi-file)

```bash
# Build for production
npm run build
```

Output is in `dist/` directory. Deploy this to:
- GitHub Pages
- Netlify, Vercel, etc.
- Any static hosting service
- Traditional web servers

### Inline Build (Single-file)

```bash
# Build single-file variant
npm run build:inline
```

Output is `dist-inline/index.html` — a fully self-contained file ready for IPFS distribution.

## 3.2 Deploying to IPFS (Single-file Mode)

The goal is:

- **No server required for hosting**
- **No account**
- **No central logs**
- **Users click a link and the app opens fully functional**

This is exactly what **IPFS subdomain gateways** allow.

### One-time setup (local machine)

```bash
ipfs init
ipfs daemon
```

Keep `ipfs daemon` running.

### Publish the inline build

```bash
# Build the single-file variant
npm run build:inline

# Add to IPFS
ipfs add --cid-version=1 --hash=sha2-256 dist-inline/index.html
# → added <CID> index.html
```

You now have a public, immutable link:

### **https\://<CID>.ipfs.dweb.link/**

This link behaves like a real HTTPS website:

- Browser allows camera
- Browser allows mic
- Browser allows WebRTC
- Browser allows file system access
- Service workers can work

### Optional: Create a stable, updatable IPNS name

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
npm run build:inline
ipfs add --cid-version=1 --hash=sha2-256 dist-inline/index.html
# → new <CID>
ipfs name publish --key=capsule /ipfs/<newCID>
```

## 3.3 Deploying to GitHub Pages (Multi-file Mode)

```bash
# Build the standard bundle
npm run build

# Deploy the dist/ directory to GitHub Pages
# (Use GitHub Actions, gh-pages npm package, or manual upload)
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

## 5.1 Project Structure

The codebase is now organized as a modular ES6 application:

```
turbo-barnacle/
├── src/                      # ES module source files
│   ├── main.js              # Entry point, wires up DOM and modules
│   ├── crypto.js            # PBKDF2, HKDF, AES-GCM, hashing
│   ├── webrtc.js            # RTCPeerConnection, DataChannel, chat, file transfer
│   ├── vault.js             # OPFS/User Folder vault storage
│   ├── qr.js                # QR encode/decode, modal, camera scanning
│   ├── pwa.js               # Service worker registration helpers
│   └── tests.js             # Self-test routines
├── scripts/                  # Build scripts
│   └── inline-build.mjs     # Script to generate single-file variant
├── dist/                     # Standard build output (multi-file)
├── dist-inline/              # Inline build output (single-file)
├── index.html               # Main HTML template
├── package.json             # Dependencies and build scripts
└── vite.config.js           # Vite build configuration
```

## 5.2 Module Responsibilities

### `src/crypto.js` — Cryptographic Primitives

- **PBKDF2** key derivation from passphrase (200,000 iterations)
- **HKDF** per-item key derivation
- **AES-GCM** encryption/decryption
- **SHA-256** hashing for item IDs
- Exports: `genPass()`, `deriveRoomKey()`, `getRoomKey()`, `hkdfItemKey()`, `aesGcmEncrypt()`, `aesGcmDecrypt()`, `sha256Hex()`

### `src/webrtc.js` — WebRTC Communication

- RTCPeerConnection management
- DataChannel setup and message handling
- Chat message routing
- Encrypted file transfer (chunked, AES-GCM per chunk)
- Media track management (camera/mic)
- Exports: `createOffer()`, `acceptAnswer()`, `createAnswer()`, `sendChat()`, `sendFiles()`, `enableCamera()`

### `src/vault.js` — Local Storage

- OPFS (Origin Private File System) storage
- User Folder API integration
- Encrypted chunk storage
- Metadata management
- Vault export functionality
- Exports: `chooseVaultFolder()`, `addToVault()`, `listVault()`, `exportVaultCAR()`

### `src/qr.js` — QR Code Handling

- QR code generation for offers/answers
- QR scanning via BarcodeDetector API
- Modal management
- Camera access for scanning
- Exports: `showQR()`, `scanQRInto()`, `hideQRModal()`, `setupQREventListeners()`

### `src/pwa.js` — Progressive Web App

- Service worker registration helpers
- Secure context detection
- Exports: `canUsePageSW()`, `registerPageSW()`

### `src/tests.js` — Self-Tests

- DOM element verification
- QR modal functionality tests
- Packet framing validation
- Crypto key derivation tests
- Exports: `runTests()`

### `src/main.js` — Application Entry Point

- Imports and wires up all modules
- DOM event listener setup
- Tab navigation
- Button click handlers
- Application initialization

## 5.3 Build System

The project uses **Vite** for development and building:

- **Development**: `npm run dev` — Hot module reloading at localhost:5173
- **Standard build**: `npm run build` — Multi-file bundle in `dist/`
- **Inline build**: `npm run build:inline` — Single-file variant in `dist-inline/`

The inline build process:
1. Runs standard Vite build
2. Reads the built HTML and JavaScript/CSS assets
3. Inlines all external assets into a single HTML file
4. Outputs to `dist-inline/index.html`

## 5.4 Design Principles

Each subsystem was intentionally written to be:

- **Minimal** — No unnecessary dependencies
- **Modular** — Clear separation of concerns
- **Untangled** — No external libraries (except Vite for building)
- **Extendable** — Easy to add new features

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

