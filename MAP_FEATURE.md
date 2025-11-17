# Map & H3 Location Sharing Feature

This document describes the mapping and geospatial features added to turbo-barnacle.

## Overview

The Map tab provides P2P location sharing with three input methods and two sharing modes (exact coordinates or H3 hexagonal regions). It demonstrates privacy-preserving geolocation without centralized servers.

## Features

### Location Input Methods

1. **Device GPS** - Uses browser geolocation API to get current device location
2. **Address Geocoding** - Converts typed addresses to coordinates using Nominatim (OpenStreetMap)
3. **Manual Coordinates** - Direct lat/long input for precise control

### Location Sharing Modes

- **Exact Coordinates** - Share precise lat/long over encrypted WebRTC DataChannel
- **H3 Hexagons** - Share approximate location as H3 index (resolution 7-11 selectable)

### Interactive Map

- **Pin Dropping** - Click anywhere on map to set location
- **Peer Visualization** - Incoming peer locations shown with markers
- **Hexagon Overlays** - H3 regions displayed as translucent polygons
- **OpenStreetMap Tiles** - Open-source base map

## Architecture

### Module: `src/map.js`

Clean separation following turbo-barnacle patterns:

```javascript
// Initialization
initMap(containerId)

// Location acquisition
getDeviceLocation() → Promise<{lat, lng, accuracy, timestamp}>
geocodeAddress(address) → Promise<{lat, lng, display_name}>

// H3 conversion
latLngToH3(lat, lng, resolution) → h3Index
h3ToLatLng(h3Index) → {lat, lng}
setH3Resolution(res) // 0-15
getH3Resolution() → number

// Visualization
addUserLocation(lat, lng, label)
addPeerLocation(peerId, lat, lng, label, isH3)
addH3Hexagon(h3Index, color, opacity)
clearPeerLocations()
clearH3Hexagons()

// P2P messaging
createLocationMessage(lat, lng, label, sendAsH3, h3Resolution)
parseLocationMessage(message)
```

### WebRTC Integration

Location messages use existing DataChannel infrastructure:

```javascript
{
  t: 'location',
  lat: 37.7749,
  lng: -122.4194,
  label: 'My location',
  isH3: false,
  h3: null,  // or H3 index string
  h3Resolution: 9,
  timestamp: 1234567890
}
```

Messages are handled in `src/webrtc.js` and dispatched as `peer-location` events.

## Dependencies

- **Leaflet 1.9.4** - Open-source mapping library (MIT)
- **H3 4.1.0** - Uber's hexagonal hierarchical geospatial indexing (Apache 2.0)

Both loaded via unpkg.com CDN. For inline build, the build script fetches and inlines them.

## Privacy Considerations

### What is Shared

- **Exact mode**: Precise coordinates visible to peer
- **H3 mode**: Approximate location (hexagon center), precision depends on resolution
  - Res 7: ~5km hexagons
  - Res 9: ~174m hexagons (default)
  - Res 11: ~25m hexagons

### What is NOT Shared

- Location history (session-only, no persistence by default)
- Continuous tracking (one-time snapshots)
- Server-side storage (all P2P)

### Third-Party Services

- **OpenStreetMap tiles**: Map tile requests reveal approximate viewport to OSM servers
- **Nominatim geocoding**: Address queries sent to OSM Nominatim API (rate limited)
- **No location tracking services**: No Google Maps, Mapbox, or similar analytics

Users are explicitly informed via UI warnings about OSM usage policies.

## Testing

Comprehensive tests in `src/tests.js`:

- H3 conversion accuracy (within 0.01 degrees)
- Location message creation/parsing
- H3 resolution get/set
- Message type validation

Run via "Tests" tab in UI.

## Usage Example

```javascript
// Set location from device GPS
const location = await getDeviceLocation();
addUserLocation(location.lat, location.lng, 'Me');

// Share as H3 hex (resolution 9)
const message = createLocationMessage(
  location.lat, 
  location.lng, 
  'My approx location',
  true,  // sendAsH3
  9      // resolution
);
sendLocation(message);

// Peer receives and displays
document.addEventListener('peer-location', (e) => {
  const loc = parseLocationMessage(e.detail);
  addPeerLocation('peer', loc.lat, loc.lng, loc.label, loc.isH3);
  if (loc.h3Index) {
    addH3Hexagon(loc.h3Index, '#3bd671', 0.3);
  }
});
```

## Future Enhancements

- **Vault storage**: Persist location history to encrypted vault
- **Real-time tracking**: Continuous location updates option
- **Multi-peer**: Show locations from multiple connected peers
- **Custom tile providers**: Allow user-configurable tile sources
- **Offline maps**: Service worker caching of tiles
- **Distance calculations**: Show proximity to peers
- **Geofencing**: Alerts when peers enter/exit regions
