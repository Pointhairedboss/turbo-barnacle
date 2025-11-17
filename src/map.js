// Map module - Leaflet + H3 integration for location sharing

let map = null;
let userMarker = null;
let peerMarkers = new Map();
let h3Hexagons = new Map();
let currentH3Resolution = 9; // Default ~174m hexagons

// Initialize map
export function initMap(containerId) {
  if (!window.L) {
    throw new Error('Leaflet library not loaded');
  }
  if (!window.h3) {
    throw new Error('H3 library not loaded');
  }

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Map container ${containerId} not found`);
  }

  // Create map centered on a default location
  map = window.L.map(containerId).setView([37.7749, -122.4194], 13); // San Francisco

  // Add OpenStreetMap tiles
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  // Add click handler for pin dropping
  map.on('click', onMapClick);

  return map;
}

// Get device location
export async function getDeviceLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        resolve(location);
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// Geocode address using Nominatim
export async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'turbo-barnacle-p2p-demo'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }
    
    const results = await response.json();
    
    if (results.length === 0) {
      throw new Error('Address not found');
    }
    
    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      display_name: results[0].display_name
    };
  } catch (error) {
    throw new Error(`Geocoding error: ${error.message}`);
  }
}

// Convert lat/lng to H3 index
export function latLngToH3(lat, lng, resolution = currentH3Resolution) {
  if (!window.h3) {
    throw new Error('H3 library not loaded');
  }
  return window.h3.latLngToCell(lat, lng, resolution);
}

// Convert H3 index to lat/lng
export function h3ToLatLng(h3Index) {
  if (!window.h3) {
    throw new Error('H3 library not loaded');
  }
  const [lat, lng] = window.h3.cellToLatLng(h3Index);
  return { lat, lng };
}

// Get H3 resolution
export function getH3Resolution() {
  return currentH3Resolution;
}

// Set H3 resolution
export function setH3Resolution(resolution) {
  if (resolution < 0 || resolution > 15) {
    throw new Error('H3 resolution must be between 0 and 15');
  }
  currentH3Resolution = resolution;
}

// Add user location marker
export function addUserLocation(lat, lng, label = 'You') {
  if (!map) {
    throw new Error('Map not initialized');
  }

  // Remove existing user marker if present
  if (userMarker) {
    map.removeLayer(userMarker);
  }

  // Create marker
  userMarker = window.L.marker([lat, lng], {
    icon: window.L.divIcon({
      className: 'user-location-marker',
      html: '<div style="background:#6ae3ff;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(0,0,0,0.3)"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }).addTo(map);

  userMarker.bindPopup(label).openPopup();

  // Center map on user location
  map.setView([lat, lng], 13);

  return { lat, lng };
}

// Add peer location marker
export function addPeerLocation(peerId, lat, lng, label = 'Peer', isH3 = false) {
  if (!map) {
    throw new Error('Map not initialized');
  }

  // Remove existing peer marker if present
  if (peerMarkers.has(peerId)) {
    map.removeLayer(peerMarkers.get(peerId));
  }

  // Create marker with different color for peers
  const marker = window.L.marker([lat, lng], {
    icon: window.L.divIcon({
      className: 'peer-location-marker',
      html: `<div style="background:${isH3 ? '#ffcc66' : '#3bd671'};width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
  }).addTo(map);

  marker.bindPopup(`${label}${isH3 ? ' (H3 hex)' : ''}`);
  peerMarkers.set(peerId, marker);

  return { lat, lng };
}

// Add H3 hexagon overlay
export function addH3Hexagon(h3Index, color = '#ffcc66', opacity = 0.3) {
  if (!map || !window.h3) {
    throw new Error('Map or H3 not initialized');
  }

  // Remove existing hexagon for this index if present
  if (h3Hexagons.has(h3Index)) {
    map.removeLayer(h3Hexagons.get(h3Index));
  }

  // Get hexagon boundary
  const boundary = window.h3.cellToBoundary(h3Index, true); // true for GeoJSON format
  
  // Create polygon
  const polygon = window.L.polygon(boundary, {
    color: color,
    fillColor: color,
    fillOpacity: opacity,
    weight: 2
  }).addTo(map);

  polygon.bindPopup(`H3: ${h3Index}`);
  h3Hexagons.set(h3Index, polygon);

  return polygon;
}

// Remove peer location
export function removePeerLocation(peerId) {
  if (peerMarkers.has(peerId)) {
    map.removeLayer(peerMarkers.get(peerId));
    peerMarkers.delete(peerId);
  }
}

// Clear all peer locations
export function clearPeerLocations() {
  peerMarkers.forEach(marker => map.removeLayer(marker));
  peerMarkers.clear();
}

// Clear all H3 hexagons
export function clearH3Hexagons() {
  h3Hexagons.forEach(hex => map.removeLayer(hex));
  h3Hexagons.clear();
}

// Handle map click for pin dropping
function onMapClick(e) {
  const event = new CustomEvent('map-pin-drop', {
    detail: {
      lat: e.latlng.lat,
      lng: e.latlng.lng
    }
  });
  document.dispatchEvent(event);
}

// Add custom pin with label
export function addCustomPin(lat, lng, label, color = '#ff6b6b') {
  if (!map) {
    throw new Error('Map not initialized');
  }

  const marker = window.L.marker([lat, lng], {
    icon: window.L.divIcon({
      className: 'custom-pin-marker',
      html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3)"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    })
  }).addTo(map);

  marker.bindPopup(label);

  return marker;
}

// Create location message for P2P sharing
export function createLocationMessage(lat, lng, label = '', sendAsH3 = false, h3Resolution = currentH3Resolution) {
  const message = {
    type: 'location',
    lat,
    lng,
    label,
    timestamp: Date.now()
  };

  if (sendAsH3) {
    const h3Index = latLngToH3(lat, lng, h3Resolution);
    message.h3 = h3Index;
    message.h3Resolution = h3Resolution;
    message.isH3 = true;
  }

  return message;
}

// Parse location message from peer
export function parseLocationMessage(message) {
  if (message.type !== 'location') {
    throw new Error('Invalid location message');
  }

  let lat = message.lat;
  let lng = message.lng;
  const isH3 = message.isH3 || false;

  // If H3 index is provided, convert to center of hexagon
  if (message.h3) {
    const center = h3ToLatLng(message.h3);
    lat = center.lat;
    lng = center.lng;
  }

  return {
    lat,
    lng,
    label: message.label || 'Peer location',
    isH3,
    h3Index: message.h3,
    h3Resolution: message.h3Resolution,
    timestamp: message.timestamp
  };
}

// Get map instance
export function getMap() {
  return map;
}

// Destroy map
export function destroyMap() {
  if (map) {
    map.remove();
    map = null;
  }
  userMarker = null;
  peerMarkers.clear();
  h3Hexagons.clear();
}
