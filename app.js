// Initialize Map
const map = L.map('map', {
  center: [20, 0], // Center roughly over the globe
  zoom: 3,
  zoomControl: false // We reposition it later
});

// Add zoom control at bottom left
L.control.zoom({ position: 'bottomleft' }).addTo(map);

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

// Add layer control to top right
L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

// Set up the Leaflet Draw Control
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
  position: 'topleft',
  edit: {
    featureGroup: drawnItems,
    remove: true
  },
  draw: {
    // Only enable rectangle drawing for bounding box
    rectangle: {
      shapeOptions: {
        color: '#3fb950',
        weight: 2,
        fillColor: '#3fb950',
        fillOpacity: 0.1
      }
    },
    polygon: false,
    polyline: false,
    circle: false,
    marker: false,
    circlemarker: false
  }
});
map.addControl(drawControl);

// UI Elements
const coordPlaceholder = document.getElementById('coord-placeholder');
const coordOutput = document.getElementById('coord-output');
const minXEl = document.getElementById('min-x');
const minYEl = document.getElementById('min-y');
const maxXEl = document.getElementById('max-x');
const maxYEl = document.getElementById('max-y');
const copyBtn = document.getElementById('copy-btn');

let currentLayer = null;

// Handle drawn item
map.on(L.Draw.Event.CREATED, function (e) {
  const type = e.layerType;
  const layer = e.layer;

  if (type === 'rectangle') {
    // Clear previous boxes
    drawnItems.clearLayers();

    // Add the new valid box
    drawnItems.addLayer(layer);
    currentLayer = layer;
    updateCoordinatesPanel(layer.getBounds());
  }
});

// Handle edit events to update coordinates
map.on(L.Draw.Event.EDITED, function (e) {
  const layers = e.layers;
  layers.eachLayer(function (layer) {
    if (layer === currentLayer) {
      updateCoordinatesPanel(layer.getBounds());
    }
  });
});

// Handle deletion
map.on(L.Draw.Event.DELETED, function (e) {
  if (drawnItems.getLayers().length === 0) {
    currentLayer = null;
    coordPlaceholder.classList.remove('hidden');
    coordOutput.classList.add('hidden');
  } else {
    // If there's still a layer somehow, update it
    const layers = drawnItems.getLayers();
    currentLayer = layers[0];
    updateCoordinatesPanel(currentLayer.getBounds());
  }
});

function updateCoordinatesPanel(bounds) {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  // Format bounds to 4 decimal places for cleanliness
  const formatCoord = (val) => Number(val).toFixed(4);

  // set values
  minXEl.innerText = formatCoord(sw.lng);
  minYEl.innerText = formatCoord(sw.lat);
  maxXEl.innerText = formatCoord(ne.lng);
  maxYEl.innerText = formatCoord(ne.lat);

  // Show panel contents
  coordPlaceholder.classList.add('hidden');
  coordOutput.classList.remove('hidden');
}

// Copy to clipboard functionality
copyBtn.addEventListener('click', () => {
  const textToCopy = `${minXEl.innerText}, ${minYEl.innerText}, ${maxXEl.innerText}, ${maxYEl.innerText}`;
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalText = copyBtn.innerText;
    copyBtn.innerText = 'Copied!';

    // Some visual feedback color change 
    copyBtn.style.color = '#3fb950';
    copyBtn.style.borderColor = '#3fb950';

    setTimeout(() => {
      copyBtn.innerText = originalText;
      copyBtn.style.color = '';
      copyBtn.style.borderColor = '';
    }, 2000);
  });
});
