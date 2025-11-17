# turbo-barnacle

Turbo-Barnacle is a p2p demonstration app intended to demonstrate the shortest path to making a fairly secure way to make and deploy apps with no reliance on commercial services and no tracking.

## Features

- **Direct WebRTC P2P communication** (text chat, encrypted file transfer, video)
- **Geospatial location sharing** (H3 hexagonal indexing, Leaflet maps)
- **Local encrypted vault storage** (OPFS or User Folder)
- **QR-based signalling** (no server required for connection setup)
- **Complete offline capability** (via optional service worker)
- **Zero backend dependency** — no servers, no databases
- **Dual deployment modes:**
  - Standard multi-file static bundle for GitHub Pages and typical hosting
  - Fully inlined single-file variant for one-file IPFS/IPNS distribution

## Project Structure

The project is now organized as a modular codebase:

```
turbo-barnacle/
├── src/                      # ES module source files
│   ├── main.js              # Entry point, wires up DOM and modules
│   ├── crypto.js            # PBKDF2, HKDF, AES-GCM, hashing
│   ├── webrtc.js            # RTCPeerConnection, DataChannel, chat, file transfer
│   ├── map.js               # Leaflet + H3 geospatial location sharing
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

## Development

### Prerequisites

- Node.js (v16 or later)
- npm

### Setup

```bash
# Install dependencies
npm install
```

### Development Server

```bash
# Start Vite dev server with hot module reloading
npm run dev
```

The dev server will start at `http://localhost:5173/`

### Building

#### Standard Build (Multi-file)

```bash
# Build for production (outputs to dist/)
npm run build
```

This creates a standard multi-file bundle in the `dist/` directory suitable for:
- GitHub Pages
- Static hosting services
- Traditional web servers

#### Inline Build (Single-file)

```bash
# Build inline single-file variant (outputs to dist-inline/)
npm run build:inline
```

This creates a fully self-contained single HTML file in `dist-inline/index.html` suitable for:
- IPFS/IPNS distribution
- Sharing as a single file
- Email attachments
- Any scenario requiring a single portable file

### Preview

```bash
# Preview the production build locally
npm run preview
```

### Testing

```bash
# Run tests (placeholder - tests are built into the app)
npm test
```

The app includes built-in self-tests accessible via the "Tests" tab in the UI.

## Deployment

### Option 1: GitHub Pages (Standard Build)

The project includes a GitHub Actions workflow that automatically builds and deploys to GitHub Pages when changes are pushed to the `main` branch.

**Manual deployment:**
1. Build the project: `npm run build`
2. Deploy the `dist/` directory to GitHub Pages

**Automatic deployment:**
- Push changes to the `main` branch
- GitHub Actions will automatically build and deploy to GitHub Pages

### Option 2: IPFS/IPNS (Inline Build)

For full details, see [p_2_p_capsule_documentation.md](./p_2_p_capsule_documentation.md)

**Quick start:**

```bash
# Build the single-file variant
npm run build:inline

# Add to IPFS (requires ipfs daemon running)
ipfs add --cid-version=1 --hash=sha2-256 dist-inline/index.html

# Access via subdomain gateway
# https://<CID>.ipfs.dweb.link/
```

**For stable IPNS links:**

```bash
# Create a key (one-time)
ipfs key gen capsule --type=ed25519

# Publish to IPNS
ipfs name publish --key=capsule /ipfs/<CID>

# Access via stable URL
# https://<PeerID>.ipns.dweb.link/
```

## Architecture

See [p_2_p_capsule_documentation.md](./p_2_p_capsule_documentation.md) for detailed system architecture, capabilities, and extension guidance.

For information about the mapping and H3 geospatial features, see [MAP_FEATURE.md](./MAP_FEATURE.md).

## Security

- **End-to-end encryption** using AES-GCM with PBKDF2-derived keys
- **Transport encryption** via WebRTC DTLS/SRTP/SCTP
- **No tracking** — all operations are client-side only
- **Privacy note:** IP addresses are visible to STUN/TURN servers (normal for WebRTC)

## License

See [LICENSE](./LICENSE) for details.
