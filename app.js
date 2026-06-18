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
    minXEl.innerText = '0.0000';
    minYEl.innerText = '0.0000';
    maxXEl.innerText = '0.0000';
    maxYEl.innerText = '0.0000';
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

// Handle manual coordinate input
function handleManualCoordinateInput() {
  const x1 = parseFloat(minXEl.innerText);
  const y1 = parseFloat(minYEl.innerText);
  const x2 = parseFloat(maxXEl.innerText);
  const y2 = parseFloat(maxYEl.innerText);

  // Validate numbers
  if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;

  // Ensure bounds are always valid regardless of input order
  const minLat = Math.min(y1, y2);
  const maxLat = Math.max(y1, y2);
  const minLng = Math.min(x1, x2);
  const maxLng = Math.max(x1, x2);

  const bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);

  if (!currentLayer) {
    // Create new layer if none exists
    currentLayer = L.rectangle(bounds, {
      color: '#3fb950',
      weight: 2,
      fillColor: '#3fb950',
      fillOpacity: 0.1
    });
    drawnItems.addLayer(currentLayer);
  } else {
    // Update existing layer
    currentLayer.setBounds(bounds);
  }
}

// Attach event listeners for real-time input
[minXEl, minYEl, maxXEl, maxYEl].forEach(el => {
  el.addEventListener('input', handleManualCoordinateInput);
  
  // Prevent multiline from Enter key
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.blur();
    }
  });

  // Handle pasting all 4 coordinates at once
  el.addEventListener('paste', (e) => {
    let paste = (e.clipboardData || window.clipboardData).getData('text');
    let numbers = paste.match(/-?\d+(\.\d+)?/g);
    
    if (numbers && numbers.length >= 4) {
      e.preventDefault(); // Stop normal paste
      minXEl.innerText = numbers[0];
      minYEl.innerText = numbers[1];
      maxXEl.innerText = numbers[2];
      maxYEl.innerText = numbers[3];
      
      handleManualCoordinateInput();
      
      // Auto-center map on the new pasted bounds with extra padding so the UI doesn't cover it
      if (currentLayer) {
        map.fitBounds(currentLayer.getBounds(), { 
          paddingTopLeft: [50, 50], 
          paddingBottomRight: [50, 250] 
        });
      }
      
      el.blur();
    }
  });
});

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
    // Fetch up to 5 results so we can prioritize polygons. Use polygon_threshold to simplify geometry and massively speed up the request.
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&polygon_geojson=1&polygon_threshold=0.005&limit=5`);
    const data = await response.json();

    if (data && data.length > 0) {
      // Find the first result that is actually a Polygon or MultiPolygon, fallback to the first result
      const polygonResult = data.find(item => item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon'));
      const result = polygonResult || data[0];
      
      if (searchPolygonLayer) {
        map.removeLayer(searchPolygonLayer);
      }

      if (result.geojson) {
        searchPolygonLayer = L.geoJSON(result.geojson, {
          style: {
            color: '#0969da',
            weight: 2,
            fillColor: '#0969da',
            fillOpacity: 0.1
          }
        }).addTo(map);

        map.fitBounds(searchPolygonLayer.getBounds(), { padding: [50, 50] });

        const popupContent = `
          <div style="text-align: center;">
            <strong>${result.display_name.split(',')[0]}</strong><br>
            <button id="popup-create-bbox" class="popup-btn">Create Bounding Box</button>
          </div>
        `;
        searchPolygonLayer.bindPopup(popupContent).openPopup();

      } else {
        const bbox = result.boundingbox;
        const bounds = L.latLngBounds([bbox[0], bbox[2]], [bbox[1], bbox[3]]);
        map.fitBounds(bounds, { padding: [50, 50] });
        alert('No exact polygon found, but zoomed to general location.');
      }
    } else {
      alert('Location not found. Try a different search.');
    }
  } catch (err) {
    console.error('Search error:', err);
    alert('An error occurred while searching.');
  } finally {
    searchBtn.innerText = 'Search';
    searchBtn.disabled = false;
  }
}

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

map.on('popupopen', function(e) {
  const createBtn = document.getElementById('popup-create-bbox');
  if (createBtn && searchPolygonLayer) {
    createBtn.onclick = function() {
      createBoundingBoxFromLayer(searchPolygonLayer);
      map.closePopup();
    };
  }
});

function createBoundingBoxFromLayer(layer) {
  const bounds = layer.getBounds();
  
  if (!currentLayer) {
    currentLayer = L.rectangle(bounds, {
      color: '#3fb950',
      weight: 2,
      fillColor: '#3fb950',
      fillOpacity: 0.1
    });
    drawnItems.addLayer(currentLayer);
  } else {
    currentLayer.setBounds(bounds);
  }
  
  updateCoordinatesPanel(bounds);
}

// GeoJSON Drag and Drop
const mapContainerEl = document.getElementById('map-container');

mapContainerEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  mapContainerEl.classList.add('drag-over');
});

mapContainerEl.addEventListener('dragleave', (e) => {
  e.preventDefault();
  // Prevent flickering when dragging over child elements
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
          
          if (searchPolygonLayer) {
            map.removeLayer(searchPolygonLayer);
          }

          searchPolygonLayer = L.geoJSON(geojsonData, {
            style: {
              color: '#0969da',
              weight: 2,
              fillColor: '#0969da',
              fillOpacity: 0.1
            }
          }).addTo(map);

          map.fitBounds(searchPolygonLayer.getBounds(), { padding: [50, 50] });

          const popupContent = `
            <div style="text-align: center;">
              <strong>${file.name}</strong><br>
              <button id="popup-create-bbox" class="popup-btn">Create Bounding Box</button>
            </div>
          `;
          searchPolygonLayer.bindPopup(popupContent).openPopup();
          
        } catch (err) {
          console.error('Invalid GeoJSON', err);
          alert('Could not parse GeoJSON file. Ensure it is valid JSON.');
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please drop a valid .json or .geojson file.');
    }
  }
});


