// Initialize Map
const map = L.map('map', {
  center: [20, 0], // Center roughly over the globe
  zoom: 3,
  zoomControl: false // We reposition it later
});
window.map = map;

// Add zoom control at bottom left
L.control.zoom({ position: 'bottomleft' }).addTo(map);

const pointPinLayerGroup = L.layerGroup().addTo(map);

function createPinIcon(color) {
  const pinSvg = `<svg width="48" height="58" viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg" style="display:block; overflow:visible; filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.45)); cursor: pointer;">
    <path d="M24 8C15.163 8 8 15.163 8 24C8 36 24 50 24 50C24 50 40 36 40 24C40 15.163 32.837 8 24 8Z" fill="${color}" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="24" cy="24" r="5.5" fill="#FFFFFF"/>
  </svg>`;
  return L.divIcon({
    className: 'custom-map-pin-icon',
    html: pinSvg,
    iconSize: [48, 58],
    iconAnchor: [24, 50]
  });
}

// Define base tile layers
const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 20
});

const cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 20
});

const osmStreets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
});

const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  maxZoom: 19
});

// Set default basemap
cartoLight.addTo(map);

// Add layer switcher control
const baseMaps = {
  "Light": cartoLight,
  "Dark": cartoDark,
  "Streets": osmStreets,
  "Satellite": esriSatellite
};

L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

// Set up Terra Draw
const { TerraDraw, TerraDrawSelectMode, TerraDrawPointMode, TerraDrawLineStringMode, TerraDrawPolygonMode, TerraDrawRectangleMode } = window.terraDraw;
const { TerraDrawLeafletAdapter } = window.terraDrawLeafletAdapter;
const selectMode = new TerraDrawSelectMode({
  flags: {
    polygon: {
      feature: {
        draggable: true,
        coordinates: { midpoints: { draggable: true }, draggable: true, deletable: true }
      }
    },
    rectangle: {
      feature: {
        draggable: false,
        coordinates: { 
          draggable: true,
          resizable: 'opposite'
        }
      }
    },
    linestring: {
      feature: {
        draggable: true,
        coordinates: { midpoints: { draggable: true }, draggable: true, deletable: true }
      }
    },
    point: {
      feature: {
        draggable: true
      }
    }
  },
  styles: {
    selectedPolygonColor: (f) => f.properties.color || '#4285f4',
    selectedPolygonOutlineColor: (f) => f.properties.color || '#4285f4',
    selectedLineStringColor: (f) => f.properties.color || '#4285f4',
    selectedPointColor: (f) => f.properties.color || '#4285f4',
    selectedPointOutlineColor: (f) => f.properties.color || '#4285f4',
    selectedPointOutlineWidth: 3,
    selectedPointWidth: 16
  }
});

const draw = new TerraDraw({
  adapter: new TerraDrawLeafletAdapter({
    lib: L,
    map: map,
  }),
  modes: [
    selectMode,
    new TerraDrawPolygonMode({
      styles: {
        fillColor: (f) => f.properties.color || window.currentDrawingColor || '#4285f4',
        fillOpacity: 0.1,
        outlineColor: (f) => f.properties.color || window.currentDrawingColor || '#4285f4',
        outlineWidth: 2
      }
    }),
    new TerraDrawRectangleMode({
      styles: {
        fillColor: (f) => f.properties.color || window.currentDrawingColor || '#4285f4',
        outlineColor: (f) => f.properties.color || window.currentDrawingColor || '#4285f4',
      }
    }),
    new TerraDrawLineStringMode({
      styles: {
        lineStringColor: (f) => f.properties.color || window.currentDrawingColor || '#4285f4'
      }
    }),
    new TerraDrawPointMode({
      styles: {
        pointColor: (f) => f.properties.color || window.currentDrawingColor || '#FF3B30',
        pointOutlineColor: '#ffffff',
        pointOutlineWidth: 3,
        pointWidth: 20
      }
    })
  ]
});

function getActiveShapes() {
  return draw.getSnapshot().filter(f => {
    if (!f.properties || !f.geometry) return false;
    const mode = f.properties.mode;
    const type = f.geometry.type;
    
    if (mode === 'rectangle') return type === 'Polygon';
    if (mode === 'polygon') return type === 'Polygon';
    if (mode === 'linestring') return type === 'LineString';
    if (mode === 'point') return type === 'Point';
    
    return false;
  });
}

const shapeColors = ['#FF3B30', '#007AFF', '#34C759']; // Red, Blue, Green
function getAvailableColor() {
  const snapshot = getActiveShapes();
  const usedColors = snapshot.map(f => f.properties.color).filter(Boolean);
  return shapeColors.find(c => !usedColors.includes(c)) || shapeColors[0];
}

window.currentDrawingColor = getAvailableColor();

// Initialize starting mode
draw.start();
window.draw = draw; // Expose globally for testing
draw.setMode('rectangle');
document.querySelector('.tool-btn[data-mode="rectangle"]').classList.add('active');

window.showToast = function(message, dotColor = '#3fb950') {
  const toast = document.getElementById('toast-notification');
  toast.innerHTML = `<span style="color: ${dotColor}; margin-right: 6px;">●</span> ${message}`;
  toast.style.display = 'block';
  setTimeout(() => toast.style.opacity = '1', 10);
  
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  if (window.toastHideTimeout) clearTimeout(window.toastHideTimeout);
  
  window.toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    window.toastHideTimeout = setTimeout(() => {
      if (toast.style.opacity === '0') toast.style.display = 'none';
    }, 300);
  }, 2500);
};

window.showLimitToast = function() {
  window.showToast("Maximum limit of 3 shapes reached", "#ff9f0a");
};

// Drag and drop sorting logic (custom mouse events — no browser ghost image)
window.geometryOrder = [];

let dragState = null; // { card, wrapper, startY, placeholder }

function initDragAndDrop() {
  const wrapper = document.getElementById('geometry-cards-wrapper');
  if (!wrapper) return;

  wrapper.addEventListener('mousedown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    const card = handle.closest('.geometry-card');
    if (!card) return;

    e.preventDefault();
    window.getSelection().removeAllRanges();
    if (document.activeElement) document.activeElement.blur();

    // Create a placeholder to hold the card's space
    const placeholder = document.createElement('div');
    placeholder.className = 'drag-placeholder';
    placeholder.style.height = card.offsetHeight + 'px';
    placeholder.style.marginBottom = getComputedStyle(card).marginBottom;

    const rect = card.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    // Position the card as fixed overlay at its current visual position
    card.classList.add('dragging');
    card.style.position = 'fixed';
    card.style.top = rect.top + 'px';
    card.style.left = rect.left + 'px';
    card.style.width = rect.width + 'px';
    card.style.zIndex = '9999';
    card.style.pointerEvents = 'none';

    // Insert placeholder where the card was
    card.parentNode.insertBefore(placeholder, card);

    dragState = {
      card,
      wrapper,
      placeholder,
      offsetY: e.clientY - rect.top,
      startY: e.clientY
    };

    document.body.classList.add('is-dragging');
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragState) return;
    e.preventDefault();

    const { card, wrapper, placeholder, offsetY } = dragState;

    // Move the card with the cursor
    card.style.top = (e.clientY - offsetY) + 'px';

    // Find the element we should insert the placeholder before
    const siblings = [...wrapper.querySelectorAll('.geometry-card:not(.dragging):not(.placeholder-card)')];
    let insertBefore = null;

    for (const sibling of siblings) {
      const box = sibling.getBoundingClientRect();
      if (e.clientY < box.top + box.height / 2) {
        insertBefore = sibling;
        break;
      }
    }

    if (insertBefore) {
      wrapper.insertBefore(placeholder, insertBefore);
    } else {
      // Append after all cards (but before the dragging card element)
      const lastSibling = siblings[siblings.length - 1];
      if (lastSibling && lastSibling.nextSibling !== placeholder) {
        if (lastSibling.nextSibling) {
          wrapper.insertBefore(placeholder, lastSibling.nextSibling);
        } else {
          wrapper.appendChild(placeholder);
        }
      }
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (!dragState) return;

    const { card, wrapper, placeholder } = dragState;

    // Drop the card into the placeholder's position
    wrapper.insertBefore(card, placeholder);
    placeholder.remove();

    // Suppress transitions during the drop to prevent flicker
    // (glass-panel has 'transition: all 0.5s ease' which would animate
    // opacity/box-shadow changes when .dragging is removed)
    card.style.transition = 'none';
    card.classList.remove('dragging');
    card.style.position = '';
    card.style.top = '';
    card.style.left = '';
    card.style.width = '';
    card.style.zIndex = '';
    card.style.pointerEvents = '';

    // Force layout recalc then re-enable transitions next frame
    card.offsetHeight;
    requestAnimationFrame(() => { card.style.transition = ''; });

    document.body.classList.remove('is-dragging');

    // Update order
    const cards = Array.from(wrapper.querySelectorAll('.geometry-card:not(.placeholder-card)'));
    window.geometryOrder = cards
      .map(c => c.id.replace('card-', ''))
      .filter(id => id);

    dragState = null;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDragAndDrop);
} else {
  initDragAndDrop();
}

// Toolbar logic
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.id === 'clear-map-btn') {
      draw.clear();
      if (searchPolygonLayer) {
        map.removeLayer(searchPolygonLayer);
        searchPolygonLayer = null;
      }
      // Clean up directly-added locate markers and tracking
      if (window._locateMarkers) {
        window._locateMarkers.forEach(m => map.removeLayer(m.marker || m));
        window._locateMarkers = [];
      }
      if (window._locateFeatureIds) {
        window._locateFeatureIds = [];
      }
      if (window._pointMarkers) {
        window._pointMarkers.clear();
      }
      if (typeof pointPinLayerGroup !== 'undefined') {
        pointPinLayerGroup.clearLayers();
      }
      updateCoordinatesPanel();
      document.getElementById('toast-notification').style.display = 'none';
      window.currentDrawingColor = getAvailableColor();
      return;
    }

    if (btn.id === 'locate-btn') {
      if (getActiveShapes().length >= 3) {
        showLimitToast();
        return;
      }

      const originalContent = btn.innerHTML;
      btn.textContent = '⌛';
      btn.disabled = true;

      const addPinAtCoords = (lat, lng, name, toastMsg, toastColor) => {
        try {
          // Terra Draw's Leaflet adapter accepts at most 9 decimal places.
          // Browser geolocation and Leaflet map centers can exceed that.
          const normalizedLat = Number(lat.toFixed(9));
          const normalizedLng = Number(lng.toFixed(9));

          // 1. Zoom to location & invalidate map size
          map.setView([normalizedLat, normalizedLng], 15);
          setTimeout(() => { map.invalidateSize(); }, 100);

          // 2. Block ALL TerraDraw change events during the entire operation
          window.isUpdatingProgrammatically = true;

          // 3. Add feature to TerraDraw (data model & rendering)
          const color = getAvailableColor();
          const featureId = draw.getFeatureId();

          const [addResult] = draw.addFeatures([{
            id: featureId,
            type: "Feature",
            properties: {
              mode: "point",
              name: name || "My Location",
              color: color
            },
            geometry: {
              type: "Point",
              coordinates: [normalizedLng, normalizedLat]
            }
          }]);
          if (!addResult || !addResult.valid) {
            throw new Error(addResult?.reason || 'Location point could not be added');
          }

          // 4. Switch to select mode and select feature
          draw.setMode('select');
          try { draw.selectFeature(featureId); } catch(e) {}
          document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));

          // 5. Track locate feature ID & create direct Leaflet pin marker
          if (!window._locateFeatureIds) window._locateFeatureIds = [];
          window._locateFeatureIds.push(featureId);

          const pinIcon = createPinIcon(color);
          const locateMarker = L.marker([normalizedLat, normalizedLng], { icon: pinIcon, zIndexOffset: 1000 }).addTo(map);
          if (!window._locateMarkers) window._locateMarkers = [];
          window._locateMarkers.push({ marker: locateMarker, featureId: featureId });

          // 6. Cancel any pending debounced updates
          if (updatePanelTimer) {
            cancelAnimationFrame(updatePanelTimer);
            updatePanelTimer = null;
          }

          // 7. Update coordinate cards and map pin markers synchronously
          updateCoordinatesPanel();

          // 8. Unblock change events
          window.isUpdatingProgrammatically = false;

          // Terra Draw updates synchronously today, but refreshing on the next
          // frame also keeps the coordinate card correct if rendering is deferred.
          requestAnimationFrame(updateCoordinatesPanel);

          if (window.showToast) {
            window.showToast(toastMsg, toastColor);
          }
        } catch (err) {
          window.isUpdatingProgrammatically = false;
          console.error('[LOCATE] Error in addPinAtCoords:', err);
        } finally {
          btn.innerHTML = originalContent;
          btn.disabled = false;
        }
      };

      if (!navigator.geolocation) {
        const center = map.getCenter();
        addPinAtCoords(center.lat, center.lng, "Map Center", "Geolocation unsupported - added pin at center", "#ff9f0a");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          console.log('[LOCATE] Geolocation success:', lat, lng);
          addPinAtCoords(lat, lng, "My Location", "Zoomed to location & added pin!", "#3fb950");
        },
        (error) => {
          console.warn('[LOCATE] Geolocation error or denied:', error);
          const center = map.getCenter();
          let msg = "Location unavailable - added pin at map center";
          if (error.code === error.PERMISSION_DENIED) {
            msg = "Location permission denied - added pin at map center";
          }
          addPinAtCoords(center.lat, center.lng, "Map Center", msg, "#ff9f0a");
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
      return;
    }
    
    // Check limit before allowing draw mode
    const mode = btn.dataset.mode;
    if (mode !== 'select' && getActiveShapes().length >= 3) {
      showLimitToast();
      return; // Block mode switch
    }
    
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    if (mode !== 'select') {
      window.currentDrawingColor = getAvailableColor();
    }
    draw.setMode(mode);
  });
});

// Terra Draw Events (debounced to prevent flickering)
let updatePanelTimer = null;
function debouncedUpdatePanel() {
  if (updatePanelTimer) cancelAnimationFrame(updatePanelTimer);
  updatePanelTimer = requestAnimationFrame(() => {
    updateCoordinatesPanel();
  });
}

draw.on('change', () => {
  if (window.isUpdatingProgrammatically) return;
  debouncedUpdatePanel();
});

draw.on('deselect', () => {
  if (window.isUpdatingProgrammatically) return;
  debouncedUpdatePanel();
});
draw.on('finish', (eventId) => {
  let id = typeof eventId === 'object' ? (eventId.id || eventId.featureId) : eventId;

  const snapshot = getActiveShapes();
  if (snapshot.length === 0) return;

  if (!id) {
    id = snapshot[snapshot.length - 1].id;
  }

  // Enforce 3 shape limit if they managed to draw while already at limit
  if (snapshot.length > 3) {
    try { draw.removeFeatures([id]); } catch(e) {}
    showLimitToast();
    draw.setMode('select');
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    return;
  }

  // Trigger notification immediately on 3rd shape
  if (snapshot.length === 3) {
    showLimitToast();
  }

  window.isUpdatingProgrammatically = true;

  // Assign color to the new feature
  const feature = snapshot.find(f => f.id === id);
  if (feature) {
    feature.properties = feature.properties || {};
    if (!feature.properties.color) {
      feature.properties.color = window.currentDrawingColor || getAvailableColor();
    }
    if (!feature.properties.mode) {
      feature.properties.mode = feature.geometry.type === 'Point' ? 'point' : (feature.geometry.type === 'LineString' ? 'linestring' : 'polygon');
    }
    try {
      draw.removeFeatures([id]);
      draw.addFeatures([feature]);
    } catch(e) {}
  }

  window.currentDrawingColor = getAvailableColor();

  try {
    draw.setMode('select');
    draw.selectFeature(id);
  } catch (e) {}

  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  updateCoordinatesPanel();

  window.isUpdatingProgrammatically = false;
});

// UI Elements
const geometryCardsWrapper = document.getElementById('geometry-cards-wrapper');

function calculateBounds(features) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasCoords = false;
  
  features.forEach(f => {
    const coords = f.geometry.coordinates;
    const extract = (c) => {
      if (typeof c[0] === 'number') {
        if (c[0] < minX) minX = c[0];
        if (c[0] > maxX) maxX = c[0];
        if (c[1] < minY) minY = c[1];
        if (c[1] > maxY) maxY = c[1];
        hasCoords = true;
      } else {
        c.forEach(extract);
      }
    };
    extract(coords);
  });
  
  return hasCoords ? { minX, minY, maxX, maxY } : null;
}

// Geodesic Area calculation in square meters (WGS84 Earth authalic radius = 6378137m)
function calculatePolygonAreaSqMeters(coordinates) {
  if (!coordinates || !coordinates.length) return 0;
  const ring = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
  if (ring.length < 3) return 0;

  const RAD = Math.PI / 180;
  const EARTH_RADIUS = 6378137;
  let area = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i];
    const p2 = ring[i + 1];
    area += (p2[0] * RAD - p1[0] * RAD) * (2 + Math.sin(p1[1] * RAD) + Math.sin(p2[1] * RAD));
  }

  return Math.abs(area * EARTH_RADIUS * EARTH_RADIUS / 2);
}

// Geodesic Line Length calculation in meters
function calculateLineLengthMeters(coordinates) {
  if (!coordinates || !coordinates.length) return 0;
  const points = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
  if (points.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = L.latLng(points[i][1], points[i][0]);
    const p2 = L.latLng(points[i + 1][1], points[i + 1][0]);
    totalMeters += p1.distanceTo(p2);
  }
  return totalMeters;
}

// Format Area according to selected unit (no decimal points)
function formatArea(sqMeters, unit) {
  if (!sqMeters || sqMeters === 0) return '0 sq km';
  let value, unitLabel;
  switch(unit) {
    case 'ha':
      value = sqMeters / 10000;
      unitLabel = 'ha';
      break;
    case 'ac':
      value = sqMeters / 4046.8564224;
      unitLabel = 'ac';
      break;
    case 'sqmi':
      value = sqMeters / 2589988.11;
      unitLabel = 'sq mi';
      break;
    case 'km2':
    default:
      value = sqMeters / 1000000;
      unitLabel = 'sq km';
      break;
  }
  const formattedVal = Math.round(value).toLocaleString();
  return `${formattedVal} ${unitLabel}`;
}

// Format Length according to selected unit (km, mi with decimals; m without decimals)
function formatLength(meters, unit) {
  if (!meters || meters === 0) return '0 km';
  let value, unitLabel;
  switch(unit) {
    case 'mi':
      value = meters / 1609.344;
      unitLabel = 'mi';
      break;
    case 'm':
      value = meters;
      unitLabel = 'm';
      break;
    case 'km':
    default:
      value = meters / 1000;
      unitLabel = 'km';
      break;
  }
  let formattedVal;
  if (unit === 'm') {
    formattedVal = Math.round(value).toLocaleString();
  } else {
    formattedVal = value >= 1000
      ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : value.toFixed(2);
  }
  return `${formattedVal} ${unitLabel}`;
}

window.cardUnits = window.cardUnits || {};

window.changeMeasurementUnit = function(id, selectEl) {
  window.cardUnits[id] = selectEl.value;
  updateCoordinatesPanel();
};

function geojsonToWkt(geometry) {
  const type = geometry.type.toUpperCase();
  const coords = geometry.coordinates;
  
  const joinCoords = (c) => {
    if (typeof c[0] === 'number') return `${c[0]} ${c[1]}`;
    return `(${c.map(joinCoords).join(', ')})`;
  };
  
  let wktCoords = joinCoords(coords);
  if (type === 'POINT') return `POINT(${coords[0]} ${coords[1]})`;
  if (type === 'LINESTRING') return `LINESTRING${wktCoords}`;
  if (type === 'POLYGON') return `POLYGON${wktCoords}`;
  return `${type}${wktCoords}`;
}

window.deleteShape = function(id) {
  try {
    draw.removeFeatures([id]);
    draw.setMode('select');
    window.currentDrawingColor = getAvailableColor();
    if (window.expandedCards && window.expandedCards[id] !== undefined) {
      delete window.expandedCards[id];
    }
    if (window._locateFeatureIds && window._locateFeatureIds.includes(id)) {
      window._locateFeatureIds = window._locateFeatureIds.filter(fid => fid !== id);
      if (window._locateMarkers) {
        const entry = window._locateMarkers.find(m => m.featureId === id);
        if (entry) {
          map.removeLayer(entry.marker || entry);
          window._locateMarkers = window._locateMarkers.filter(m => m.featureId !== id);
        }
      }
    }
    if (window._pointMarkers && window._pointMarkers.has(id)) {
      pointPinLayerGroup.removeLayer(window._pointMarkers.get(id).marker);
      window._pointMarkers.delete(id);
    }
    updateCoordinatesPanel();
  } catch(e) {
    console.error('Error deleting shape:', e);
  }
};

window.updateFeatureName = function(id, name) {
  const snapshot = draw.getSnapshot();
  const feature = snapshot.find(f => f.id === id);
  if (feature) {
    feature.properties = feature.properties || {};
    feature.properties.name = name;
    try {
      window.isUpdatingProgrammatically = true;
      draw.removeFeatures([id]);
      draw.addFeatures([feature]);
      draw.setMode('select');
      draw.selectFeature(id);
      window.isUpdatingProgrammatically = false;
    } catch(e) {
      window.isUpdatingProgrammatically = false;
    }
    updateCoordinatesPanel();
  }
};

window.copyCardCoordinates = function(btn) {
  // Visual click effect
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 200);

  const card = btn.closest('.geometry-card');
  const codeEl = card.querySelector('code');
  const textareaEl = card.querySelector('textarea');
  let textToCopy = '';
  
  if (codeEl) textToCopy = codeEl.innerText;
  else if (textareaEl) textToCopy = textareaEl.value;
  else {
    const inputs = card.querySelectorAll('.bbox-input');
    if (inputs.length === 4) {
      const minX = inputs[0].value;
      const minY = inputs[1].value;
      const maxX = inputs[2].value;
      const maxY = inputs[3].value;
      textToCopy = `${minX}, ${minY}, ${maxX}, ${maxY}`;
    }
  }
  
  if (textToCopy) {
    const successCallback = () => {
      const original = btn.innerText;
      btn.innerText = '✓';
      if (window.showToast) {
        window.showToast("Coordinates copied to clipboard!", "#3fb950");
      }
      setTimeout(() => btn.innerText = original, 1500);
    };

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
          .then(successCallback)
          .catch(err => {
            console.warn('navigator.clipboard.writeText rejected, trying fallback:', err);
            fallbackCopyText(textToCopy, successCallback);
          });
      } else {
        fallbackCopyText(textToCopy, successCallback);
      }
    } catch (err) {
      console.warn('navigator.clipboard threw sync error, trying fallback:', err);
      fallbackCopyText(textToCopy, successCallback);
    }
  }
};

function showCopyModal(text) {
  let modal = document.getElementById('copy-fallback-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'copy-fallback-modal';
    modal.className = 'glass-panel';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.zIndex = '9999';
    modal.style.padding = '1.5rem';
    modal.style.width = '90%';
    modal.style.maxWidth = '400px';
    modal.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
    modal.style.textAlign = 'center';
    modal.style.display = 'none';
    modal.style.background = 'var(--panel-bg)';
    modal.style.backdropFilter = 'blur(12px)';
    modal.style.webkitBackdropFilter = 'blur(12px)';
    modal.style.border = '1px solid var(--border-color)';
    modal.style.borderRadius = '12px';
    modal.style.animation = 'slideUp 0.3s ease-out';
    
    modal.innerHTML = `
      <h4 style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1.1rem; font-weight: 600;">Copy Coordinates</h4>
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">Your browser blocked automatic copying. Press Ctrl+C or Cmd+C to copy manually:</p>
      <input type="text" id="copy-fallback-input" style="width: 100%; padding: 0.6rem 1rem; border-radius: 6px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.2); color: var(--text-color); font-family: monospace; font-size: 0.9rem; text-align: center; margin-bottom: 1.25rem; outline: none;" readonly>
      <button class="glow-btn" style="width: 100%;" onclick="document.getElementById('copy-fallback-modal').style.display='none'">Close</button>
    `;
    document.body.appendChild(modal);
  }
  
  const input = modal.querySelector('#copy-fallback-input');
  input.value = text;
  modal.style.display = 'block';
  
  setTimeout(() => {
    input.focus();
    input.select();
    input.setSelectionRange(0, 99999);
  }, 50);
}

function fallbackCopyText(text, callback) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  
  // Style textarea to be offscreen but visible to the browser engine
  textArea.style.position = 'absolute';
  textArea.style.left = '-99999px';
  textArea.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  textArea.style.fontSize = '12pt'; // Prevent zooming on iOS Safari
  textArea.setAttribute('readonly', ''); // Prevent virtual keyboard popups
  
  document.body.appendChild(textArea);
  
  // Cross-browser/device text selection
  const isiOS = navigator.userAgent.match(/ipad|iphone/i);
  if (isiOS) {
    const range = document.createRange();
    range.selectNodeContents(textArea);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    textArea.setSelectionRange(0, 999999);
  } else {
    textArea.select();
  }
  
  let successful = false;
  try {
    successful = document.execCommand('copy');
  } catch (err) {
    console.error('execCommand fallback failed:', err);
  }
  
  document.body.removeChild(textArea);
  
  if (successful) {
    if (callback) callback();
  } else {
    // Ultimate fallback if browser blocks both clipboard writing APIs
    if (window.showToast) {
      window.showToast("Copy blocked. Manual copy panel opened.", "#ff9f0a");
    }
    showCopyModal(text);
  }
}

window.expandedCards = window.expandedCards || {};

window.toggleExpand = function(btn) {
  const card = btn.closest('.geometry-card');
  const textarea = card.querySelector('textarea');
  const id = card.id.replace('card-', '');
  
  if (textarea) {
    const defaultRows = parseInt(textarea.dataset.defaultRows, 10) || 5;
    const isExpanding = textarea.rows <= defaultRows;
    
    // Visually update immediately
    textarea.rows = isExpanding ? 20 : defaultRows;
    btn.innerText = isExpanding ? '↨' : '↕';
    btn.title = isExpanding ? "Collapse Box" : "Expand Box";
    
    // Save to global UI state
    window.expandedCards[id] = isExpanding;
  }
};

window.updateBoundingBoxFromInputs = function(id) {
  try {
    const card = document.getElementById('card-' + id);
    if (!card) return;
    
    const inputs = card.querySelectorAll('.bbox-input');
    if (inputs.length !== 4) return;
    
    const format = card.dataset.format;
    let minX, minY, maxX, maxY;

    if (format === 'bbox_tlbr') {
      minX = parseFloat(inputs[0].value);
      maxY = parseFloat(inputs[1].value);
      maxX = parseFloat(inputs[2].value);
      minY = parseFloat(inputs[3].value);
    } else {
      minX = parseFloat(inputs[0].value);
      minY = parseFloat(inputs[1].value);
      maxX = parseFloat(inputs[2].value);
      maxY = parseFloat(inputs[3].value);
    }
    
    if (!isNaN(minX) && !isNaN(minY) && !isNaN(maxX) && !isNaN(maxY)) {
      const snapshot = getActiveShapes();
      const feature = snapshot.find(f => f.id === id);

      if (feature) {
        if (minX >= maxX || minY >= maxY) {
          alert('Invalid bounding box: Min/Top-Left X must be < Max/Bottom-Right X, and Min/Bottom-Right Y must be < Max/Top-Left Y.');
          updateCoordinatesPanel();
          return;
        }
        
        feature.geometry.coordinates = [[
          [minX, minY],
          [minX, maxY],
          [maxX, maxY],
          [maxX, minY],
          [minX, minY]
        ]];
        
        window.isUpdatingProgrammatically = true;
        draw.removeFeatures([id]);
        draw.addFeatures([feature]);
        window.isUpdatingProgrammatically = false;
        
        updateCoordinatesPanel();
      }
    }
  } catch (e) {
    console.error('Failed to update bbox from inputs:', e);
  }
};

window.changeFormat = function(id, selectElement) {
  const snapshot = getActiveShapes();
  const feature = snapshot.find(f => f.id === id);
  if (feature) {
    feature.properties = feature.properties || {};
    feature.properties.format = selectElement.value;
    
    try {
      window.isUpdatingProgrammatically = true;
      draw.removeFeatures([id]);
      draw.addFeatures([feature]);
      window.isUpdatingProgrammatically = false;
    } catch(e) {
      window.isUpdatingProgrammatically = false;
    }
    
    updateCoordinatesPanel();
  }
};

function updateCoordinatesPanel() {
  const snapshot = getActiveShapes();
  
  // Sort snapshot according to geometryOrder if custom order exists
  if (window.geometryOrder && window.geometryOrder.length > 0) {
    const activeIds = snapshot.map(f => f.id);
    window.geometryOrder = window.geometryOrder.filter(id => activeIds.includes(id));
    
    snapshot.forEach(f => {
      if (!window.geometryOrder.includes(f.id)) {
        window.geometryOrder.push(f.id);
      }
    });
    
    snapshot.sort((a, b) => {
      return window.geometryOrder.indexOf(a.id) - window.geometryOrder.indexOf(b.id);
    });
  } else {
    window.geometryOrder = snapshot.map(f => f.id);
  }
  
  // Visually disable drawing tools if limit is reached
  const atLimit = snapshot.length >= 3;
  document.querySelectorAll('.tool-btn').forEach(btn => {
    if (btn.dataset.mode !== 'select' && btn.id !== 'clear-map-btn') {
      if (atLimit) {
        btn.style.opacity = '0.3';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    }
  });

  // Update map pin markers for Point features (Smart Marker Sync to eliminate redraw flicker)
  if (typeof pointPinLayerGroup !== 'undefined') {
    window._pointMarkers = window._pointMarkers || new Map();
    const activePointFeatures = snapshot.filter(f => f.geometry && f.geometry.type === 'Point' && !(window._locateFeatureIds && window._locateFeatureIds.includes(f.id)));
    const activePointIds = new Set(activePointFeatures.map(f => f.id));

    // Clean up markers for deleted features
    for (const [id, item] of window._pointMarkers.entries()) {
      if (!activePointIds.has(id)) {
        pointPinLayerGroup.removeLayer(item.marker);
        window._pointMarkers.delete(id);
      }
    }

    // Add or update markers for active point features
    activePointFeatures.forEach(f => {
      const [lng, lat] = f.geometry.coordinates;
      const color = f.properties.color || window.currentDrawingColor || '#FF3B30';

      if (window._pointMarkers.has(f.id)) {
        const existing = window._pointMarkers.get(f.id);
        if (existing.lat !== lat || existing.lng !== lng) {
          existing.marker.setLatLng([lat, lng]);
          existing.lat = lat;
          existing.lng = lng;
        }
        if (existing.color !== color) {
          existing.marker.setIcon(createPinIcon(color));
          existing.color = color;
        }
      } else {
        const marker = L.marker([lat, lng], { icon: createPinIcon(color), zIndexOffset: 1000 }).addTo(pointPinLayerGroup);
        window._pointMarkers.set(f.id, { marker, color, lat, lng });
      }
    });
  }
  
  if (!snapshot || snapshot.length === 0) {
    geometryCardsWrapper.innerHTML = `
      <div class="glass-panel geometry-card placeholder-card">
        <div class="panel-content" style="padding: 1rem;">
          <p class="placeholder-text" id="coord-placeholder" style="margin: 0;">Draw on the map to see coordinates.</p>
        </div>
      </div>
    `;
    return;
  }
  
  // Clear removed shapes and placeholder card
  const currentCardIds = snapshot.map(f => 'card-' + f.id);
  Array.from(geometryCardsWrapper.children).forEach(card => {
    if (card.classList.contains('placeholder-card')) {
      card.remove();
    } else if (card.id && card.id.startsWith('card-') && !currentCardIds.includes(card.id)) {
      card.remove();
    }
  });
  
  snapshot.forEach((feature, index) => {
    const color = feature.properties.color || window.currentDrawingColor || '#4285f4';
    const type = feature.geometry.type;
    const mode = feature.properties.mode || (type === 'Point' ? 'point' : (type === 'LineString' ? 'linestring' : 'polygon'));
    const selectedFormat = feature.properties.format || (mode === 'rectangle' ? 'bbox' : (mode === 'point' ? 'latlng' : 'geojson'));
    
    // Calculate content text
    let newText = '';
    if (selectedFormat === 'geojson') {
      newText = JSON.stringify(feature, null, 2);
    } else if (selectedFormat === 'wkt') {
      newText = geojsonToWkt(feature.geometry);
    } else if (selectedFormat === 'raw') {
      newText = JSON.stringify(feature.geometry.coordinates);
    } else if (selectedFormat === 'latlng') {
      const lon = feature.geometry.coordinates[0];
      const lat = feature.geometry.coordinates[1];
      newText = `latitude:  ${lat.toFixed(4)}\nlongitude: ${lon.toFixed(4)}`;
    }
    
    const existingCard = document.getElementById('card-' + feature.id);
    const currentUnit = window.cardUnits[feature.id] || (mode === 'linestring' ? 'km' : 'km2');
    
    if (existingCard && existingCard.dataset.format === selectedFormat && existingCard.dataset.unit === currentUnit) {
      // Just update text, inputs, measurements, and title to prevent flickering!
      const measurementValueEl = existingCard.querySelector('.measurement-value');
      if (measurementValueEl) {
        if (mode === 'rectangle' || mode === 'polygon') {
          const sqM = calculatePolygonAreaSqMeters(feature.geometry.coordinates);
          measurementValueEl.textContent = formatArea(sqM, currentUnit);
        } else if (mode === 'linestring') {
          const m = calculateLineLengthMeters(feature.geometry.coordinates);
          measurementValueEl.textContent = formatLength(m, currentUnit);
        }
      }
      
      if (selectedFormat === 'bbox' || selectedFormat === 'bbox_tlbr') {
        const bounds = calculateBounds([feature]);
        if (bounds) {
          const vals = selectedFormat === 'bbox_tlbr'
            ? [bounds.minX, bounds.maxY, bounds.maxX, bounds.minY]
            : [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];
          const inputs = existingCard.querySelectorAll('.bbox-input');
          if (inputs.length === 4) {
            inputs.forEach((input, i) => {
              const currentNum = parseFloat(input.value);
              const newNum = vals[i];
              if (document.activeElement !== input) {
                if (isNaN(currentNum) || Math.abs(currentNum - newNum) > 0.00001) {
                  input.value = newNum.toFixed(4);
                }
              }
            });
          }
        }
      } else {
        const textarea = existingCard.querySelector('textarea');
        if (textarea && textarea.value !== newText) {
          if (document.activeElement !== textarea) {
            textarea.value = newText;
          }
        }
      }
      const titleInput = existingCard.querySelector('.title-input');
      if (titleInput && document.activeElement !== titleInput) {
        titleInput.value = feature.properties.name || `${type} ${index + 1}`;
      }
    } else {
      // Rebuild card HTML completely
      let iconHtml = '';
      switch(mode) {
        case 'rectangle':
          iconHtml = `<div style="width: 14px; height: 14px; background-color: ${color}40; border: 2px solid ${color}; border-radius: 2px;"></div>`;
          break;
        case 'polygon':
          iconHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}40" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 6-3 10H7L4 8z"/></svg>`;
          break;
        case 'linestring':
          iconHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 15 15 21 5"/></svg>`;
          break;
        case 'point':
          iconHtml = `<div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%;"></div>`;
          break;
        default:
          iconHtml = `<span class="color-dot" style="background-color: ${color};"></span>`;
      }
      
      const isExpanded = window.expandedCards[feature.id] || false;
      const expandIcon = isExpanded ? '↨' : '↕';
      const expandTitle = isExpanded ? "Collapse Box" : "Expand Box";
      const expandBtnHtml = (selectedFormat !== 'bbox' && selectedFormat !== 'bbox_tlbr' && selectedFormat !== 'latlng') ? `<button class="icon-btn" title="${expandTitle}" onclick="toggleExpand(this)">${expandIcon}</button>` : '';
      
      let measurementHtml = '';
      if (mode === 'rectangle' || mode === 'polygon') {
        const sqMeters = calculatePolygonAreaSqMeters(feature.geometry.coordinates);
        measurementHtml = `
          <div class="measurement-bar">
            <span class="measurement-pill" title="Geodesic Area">
              <span class="measurement-label">📐 Area:</span>
              <span class="measurement-value">${formatArea(sqMeters, currentUnit)}</span>
            </span>
            <select class="unit-select" onchange="changeMeasurementUnit('${feature.id}', this)" title="Select Area Unit">
              <option value="km2" ${currentUnit === 'km2' ? 'selected' : ''}>sq km</option>
              <option value="ha" ${currentUnit === 'ha' ? 'selected' : ''}>hectares</option>
              <option value="ac" ${currentUnit === 'ac' ? 'selected' : ''}>acres</option>
              <option value="sqmi" ${currentUnit === 'sqmi' ? 'selected' : ''}>sq mi</option>
            </select>
          </div>
        `;
      } else if (mode === 'linestring') {
        const meters = calculateLineLengthMeters(feature.geometry.coordinates);
        measurementHtml = `
          <div class="measurement-bar">
            <span class="measurement-pill" title="Geodesic Length">
              <span class="measurement-label">📏 Length:</span>
              <span class="measurement-value">${formatLength(meters, currentUnit)}</span>
            </span>
            <select class="unit-select" onchange="changeMeasurementUnit('${feature.id}', this)" title="Select Length Unit">
              <option value="km" ${currentUnit === 'km' ? 'selected' : ''}>km</option>
              <option value="mi" ${currentUnit === 'mi' ? 'selected' : ''}>miles</option>
              <option value="m" ${currentUnit === 'm' ? 'selected' : ''}>meters</option>
            </select>
          </div>
        `;
      }

      let contentHtml = '';
      if (selectedFormat === 'bbox' || selectedFormat === 'bbox_tlbr') {
        const bounds = calculateBounds([feature]);
        if (bounds) {
          const inputStyle = `width: 100%; border-radius: 4px; padding: 0.25rem; background: rgba(0, 0, 0, 0.2); color: var(--text-color); border: 1px solid var(--border-color); font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.85rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;`;
          const onChangeFunc = `onchange="updateBoundingBoxFromInputs('${feature.id}')"`;
          
          let labels, vals, classes;
          if (selectedFormat === 'bbox_tlbr') {
            labels = ['Top Left X (Lng)', 'Top Left Y (Lat)', 'Bottom Right X (Lng)', 'Bottom Right Y (Lat)'];
            vals = [bounds.minX, bounds.maxY, bounds.maxX, bounds.minY];
            classes = ['tl-x', 'tl-y', 'br-x', 'br-y'];
          } else {
            labels = ['Min X (Lng)', 'Min Y (Lat)', 'Max X (Lng)', 'Max Y (Lat)'];
            vals = [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];
            classes = ['min-x', 'min-y', 'max-x', 'max-y'];
          }

          contentHtml = `
            <div class="bbox-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
              <div><label style="font-size: 0.75rem; color: #aaa; margin-bottom: 2px; display: block;">${labels[0]}</label><input type="number" step="any" class="bbox-input ${classes[0]}" value="${vals[0].toFixed(4)}" style="${inputStyle}" ${onChangeFunc} onfocus="this.style.borderColor='var(--border-color)'" onblur="this.style.borderColor='transparent'"></div>
              <div><label style="font-size: 0.75rem; color: #aaa; margin-bottom: 2px; display: block;">${labels[1]}</label><input type="number" step="any" class="bbox-input ${classes[1]}" value="${vals[1].toFixed(4)}" style="${inputStyle}" ${onChangeFunc} onfocus="this.style.borderColor='var(--border-color)'" onblur="this.style.borderColor='transparent'"></div>
              <div><label style="font-size: 0.75rem; color: #aaa; margin-bottom: 2px; display: block;">${labels[2]}</label><input type="number" step="any" class="bbox-input ${classes[2]}" value="${vals[2].toFixed(4)}" style="${inputStyle}" ${onChangeFunc} onfocus="this.style.borderColor='var(--border-color)'" onblur="this.style.borderColor='transparent'"></div>
              <div><label style="font-size: 0.75rem; color: #aaa; margin-bottom: 2px; display: block;">${labels[3]}</label><input type="number" step="any" class="bbox-input ${classes[3]}" value="${vals[3].toFixed(4)}" style="${inputStyle}" ${onChangeFunc} onfocus="this.style.borderColor='var(--border-color)'" onblur="this.style.borderColor='transparent'"></div>
            </div>
          `;
        }
      } else {
        const defaultRows = selectedFormat === 'latlng' ? 2 : 5;
        const currentRows = selectedFormat === 'latlng' ? 2 : (isExpanded ? 20 : 5);
        contentHtml = `
          <textarea rows="${currentRows}" data-default-rows="${defaultRows}" style="width: 100%; border-radius: 6px; padding: 0.5rem; background: rgba(0, 0, 0, 0.2); color: var(--text-color); border: 1px solid var(--border-color); font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.85rem; resize: vertical;" readonly>${newText}</textarea>
        `;
      }
      
      const cardInnerHtml = `
          <div class="card-header">
            <div class="card-header-left">
              <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
              ${iconHtml}
              <input class="title-input" type="text" value="${feature.properties.name || `${type} ${index + 1}`}" onchange="updateFeatureName('${feature.id}', this.value)" onfocus="this.style.borderColor='var(--border-color)'" onblur="this.style.borderColor='transparent'">
            </div>
            <div class="card-header-right">
              <select class="glow-select" onchange="changeFormat('${feature.id}', this)">
                ${(mode === 'rectangle' || mode === 'polygon') ? `
                  <option value="bbox" ${selectedFormat === 'bbox' ? 'selected' : ''}>BBox (Min/Max)</option>
                  <option value="bbox_tlbr" ${selectedFormat === 'bbox_tlbr' ? 'selected' : ''}>BBox (TL/BR)</option>
                ` : ''}
                ${mode === 'point' ? `<option value="latlng" ${selectedFormat === 'latlng' ? 'selected' : ''}>Lat/Lng</option>` : ''}
                <option value="geojson" ${selectedFormat === 'geojson' ? 'selected' : ''}>GeoJSON</option>
                <option value="wkt" ${selectedFormat === 'wkt' ? 'selected' : ''}>WKT</option>
                <option value="raw" ${selectedFormat === 'raw' ? 'selected' : ''}>Raw Arrays</option>
              </select>
              ${expandBtnHtml}
              <button class="icon-btn" title="Copy Coordinates" onclick="copyCardCoordinates(this)">📋</button>
              <button class="icon-btn delete" title="Delete Shape" onclick="deleteShape('${feature.id}')">🗑</button>
            </div>
          </div>
          ${contentHtml}
          ${measurementHtml}
      `;
      
      if (existingCard) {
        // Update in-place without destroying the element — prevents flicker
        existingCard.dataset.format = selectedFormat;
        existingCard.dataset.unit = currentUnit;
        existingCard.innerHTML = cardInnerHtml;
      } else {
        const cardHtml = `<div class="glass-panel geometry-card new-card" style="padding: 1rem;" id="card-${feature.id}" data-format="${selectedFormat}" data-unit="${currentUnit}">${cardInnerHtml}</div>`;
        geometryCardsWrapper.insertAdjacentHTML('beforeend', cardHtml);
      }
    }
  });
}

// Manual coordinate editing has been removed in favor of multiple dynamic geometry cards.

// Search functionality
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
let searchPolygonLayer = null;

async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  searchBtn.innerText = '...';
  searchBtn.disabled = true;

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&polygon_geojson=1&polygon_threshold=0.005&limit=5`);
    const data = await response.json();

    if (data && data.length > 0) {
      const polygonResult = data.find(item => item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon'));
      const result = polygonResult || data[0];
      
      if (searchPolygonLayer) map.removeLayer(searchPolygonLayer);

      if (result.geojson) {
        const isMulti = result.geojson.type === 'MultiPolygon';

        let geojsonToRender = result.geojson;
        if (isMulti) {
          geojsonToRender = {
            type: "FeatureCollection",
            features: result.geojson.coordinates.map(coords => ({
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: coords
              }
            }))
          };
        }

        searchPolygonLayer = L.geoJSON(geojsonToRender, {
          style: { color: '#0969da', weight: 2, fillColor: '#0969da', fillOpacity: 0.1 }
        }).addTo(map);

        map.fitBounds(searchPolygonLayer.getBounds(), { padding: [50, 50] });

        if (isMulti) {
          // Bind a dynamic popup that can distinguish which sub-polygon was clicked
          searchPolygonLayer.on('click', function(e) {
            window._clickedSubPolygonBounds = e.layer ? e.layer.getBounds() : searchPolygonLayer.getBounds();
            const popupContent = `
              <div style="text-align: center;">
                <strong>${result.display_name.split(',')[0]}</strong><br>
                <div style="font-size: 11px; margin-bottom: 5px; color: #666;">MultiPolygon detected</div>
                <button id="popup-create-bbox-part" class="popup-btn" style="margin-bottom: 5px;">Box for this part</button><br>
                <button id="popup-create-bbox-all" class="popup-btn" style="margin-bottom: 5px;">Box for all</button><br>
                <button id="popup-clear-polygon" class="popup-btn" style="background: rgba(255, 50, 50, 0.1); border-color: rgba(255, 50, 50, 0.4); color: #ff5555;">Clear Polygon</button>
              </div>
            `;
            L.popup()
              .setLatLng(e.latlng)
              .setContent(popupContent)
              .openOn(map);
          });
          
          // Optionally show a tooltip instructing the user to click a region
          searchPolygonLayer.bindTooltip("Click on a specific region to select it").openTooltip();
        } else {
          const popupContent = `
            <div style="text-align: center;">
              <strong>${result.display_name.split(',')[0]}</strong><br>
              <button id="popup-create-bbox" class="popup-btn" style="margin-bottom: 5px;">Create Bounding Box</button><br>
              <button id="popup-clear-polygon" class="popup-btn" style="background: rgba(255, 50, 50, 0.1); border-color: rgba(255, 50, 50, 0.4); color: #ff5555;">Clear Polygon</button>
            </div>
          `;
          searchPolygonLayer.bindPopup(popupContent).openPopup();
        }

      } else {
        const bbox = result.boundingbox;
        const bounds = L.latLngBounds([bbox[0], bbox[2]], [bbox[1], bbox[3]]);
        map.fitBounds(bounds, { padding: [50, 50] });
        alert('No exact polygon found, but zoomed to general location.');
      }
    } else {
      alert('Location not found.');
    }
  } catch (err) {
    console.error('Search error:', err);
  } finally {
    searchBtn.innerText = 'Search';
    searchBtn.disabled = false;
  }
}

searchBtn.addEventListener('click', handleSearch);
document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
});

// Keyboard shortcut for deleting selected shape
window.addEventListener('keyup', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const isDeleteKey = e.key === 'Backspace' || e.key === 'Delete' || e.keyCode === 8 || e.keyCode === 46 || e.code === 'Backspace' || e.code === 'Delete';
  if (isDeleteKey) {
    const selectedIds = window.draw && window.draw._modes && window.draw._modes.select ? window.draw._modes.select.selected : [];
    if (selectedIds && selectedIds.length > 0) {
      e.preventDefault();
      window.deleteShape(selectedIds[0]);
    }
  }
}, true); // Use capture phase

map.on('popupopen', function(e) {
  const createBtn = document.getElementById('popup-create-bbox');
  const createPartBtn = document.getElementById('popup-create-bbox-part');
  const createAllBtn = document.getElementById('popup-create-bbox-all');

  function createBboxFromBounds(bounds) {
    const minLat = bounds.getSouth(), maxLat = bounds.getNorth();
    const minLng = bounds.getWest(), maxLng = bounds.getEast();
    
    const currentFeatures = draw.getSnapshot();
    if (currentFeatures.length >= 3) {
      draw.removeFeatures([currentFeatures[0].id]);
    }
    
    draw.addFeatures([{
      type: "Feature",
      properties: { mode: "rectangle" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [minLng, minLat],
          [minLng, maxLat],
          [maxLng, maxLat],
          [maxLng, minLat],
          [minLng, minLat]
        ]]
      }
    }]);
    
    map.closePopup();
    updateCoordinatesPanel();
    
    // Switch to select mode automatically
    draw.setMode('select');
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  }

  if (createBtn && searchPolygonLayer) {
    createBtn.onclick = () => createBboxFromBounds(searchPolygonLayer.getBounds());
  }
  
  if (createPartBtn && searchPolygonLayer && window._clickedSubPolygonBounds) {
    createPartBtn.onclick = () => createBboxFromBounds(window._clickedSubPolygonBounds);
  }

  if (createAllBtn && searchPolygonLayer) {
    createAllBtn.onclick = () => createBboxFromBounds(searchPolygonLayer.getBounds());
  }

  const clearPolygonBtn = document.getElementById('popup-clear-polygon');
  if (clearPolygonBtn && searchPolygonLayer) {
    clearPolygonBtn.onclick = () => {
      map.removeLayer(searchPolygonLayer);
      searchPolygonLayer = null;
      map.closePopup();
    };
  }
});

// GeoJSON Drag and Drop
const mapContainerEl = document.getElementById('map-container');

// Tooltip logic for rectangle drawing
const tooltip = document.getElementById('cursor-tooltip');
mapContainerEl.addEventListener('mousemove', (e) => {
  if (window.draw && window.draw.getMode() === 'rectangle') {
    tooltip.style.display = 'block';
    tooltip.style.left = e.clientX + 'px';
    tooltip.style.top = e.clientY + 'px';
  } else {
    tooltip.style.display = 'none';
  }
});

mapContainerEl.addEventListener('mouseleave', () => {
  tooltip.style.display = 'none';
});

mapContainerEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  mapContainerEl.classList.add('drag-over');
});

mapContainerEl.addEventListener('dragleave', (e) => {
  e.preventDefault();
  if (!e.currentTarget.contains(e.relatedTarget)) {
    mapContainerEl.classList.remove('drag-over');
  }
});

mapContainerEl.addEventListener('drop', (e) => {
  e.preventDefault();
  mapContainerEl.classList.remove('drag-over');

  if (e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    
    if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const geojsonData = JSON.parse(event.target.result);
          
          let features = [];
          if (geojsonData.type === "FeatureCollection") {
            features = geojsonData.features;
          } else if (geojsonData.type === "Feature") {
            features = [geojsonData];
          } else if (geojsonData.type === "Polygon" || geojsonData.type === "LineString" || geojsonData.type === "Point") {
             features = [{
                 type: "Feature",
                 geometry: geojsonData,
                 properties: {}
             }];
          }
          
          features = features.map(f => {
            f.properties = f.properties || {};
            if (f.geometry.type.includes("Polygon")) f.properties.mode = "polygon";
            else if (f.geometry.type.includes("Line")) f.properties.mode = "linestring";
            else f.properties.mode = "point";
            return f;
          });

          draw.clear();
          draw.addFeatures(features);
          
          const bounds = calculateBounds(features);
          if (bounds) {
             map.fitBounds(L.latLngBounds([bounds.minY, bounds.minX], [bounds.maxY, bounds.maxX]), { padding: [50, 50] });
          }

        } catch (err) {
          console.error('Invalid GeoJSON', err);
          alert('Could not parse GeoJSON file.');
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please drop a valid .json or .geojson file.');
    }
  }
});

// Modal Logic
document.addEventListener('DOMContentLoaded', () => {
  const infoBtn = document.getElementById('info-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modal = document.getElementById('info-modal');

  if (infoBtn && closeModalBtn && modal) {
    infoBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
    });
  }
});
