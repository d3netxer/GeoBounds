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

L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

// Set up Terra Draw
const draw = new TerraDraw({
  adapter: new TerraDrawLeafletAdapter({
    lib: L,
    map: map,
  }),
  modes: [
    new TerraDrawSelectMode({
      flags: {
        polygon: { feature: { draggable: true }, coordinates: { midpoints: true, draggable: true, deletable: true } },
        rectangle: { feature: { draggable: true }, coordinates: { draggable: true } },
        linestring: { feature: { draggable: true }, coordinates: { midpoints: true, draggable: true, deletable: true } },
        point: { feature: { draggable: true } }
      }
    }),
    new TerraDrawPolygonMode(),
    new TerraDrawRectangleMode(),
    new TerraDrawLineStringMode(),
    new TerraDrawPointMode()
  ]
});

draw.start();
draw.setMode('select');

// Toolbar logic
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.id === 'clear-map-btn') {
      draw.clear();
      updateCoordinatesPanel();
      return;
    }
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    draw.setMode(btn.dataset.mode);
  });
});

// Terra Draw Events
draw.on('change', () => {
  updateCoordinatesPanel();
});
draw.on('finish', () => {
  draw.setMode('select');
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.tool-btn[data-mode="select"]').classList.add('active');
  updateCoordinatesPanel();
});

// UI Elements
const coordPanel = document.getElementById('coordinates-panel');
const coordPlaceholder = document.getElementById('coord-placeholder');
const coordOutput = document.getElementById('coord-output');
const formatSelect = document.getElementById('format-select');
const bboxOutput = document.getElementById('bbox-output');
const textOutput = document.getElementById('text-output');
const geometryText = document.getElementById('geometry-text');
const copyTextBtn = document.getElementById('copy-text-btn');

const minXEl = document.getElementById('min-x');
const minYEl = document.getElementById('min-y');
const maxXEl = document.getElementById('max-x');
const maxYEl = document.getElementById('max-y');

formatSelect.addEventListener('change', updateCoordinatesPanel);

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

function updateCoordinatesPanel() {
  const snapshot = draw.getSnapshot();
  
  if (!snapshot || snapshot.length === 0) {
    coordPlaceholder.style.display = 'block';
    coordOutput.style.display = 'none';
    if (coordPanel && !searchPolygonLayer) {
      coordPanel.classList.remove('panel-right');
    }
    return;
  }
  
  if (coordPanel) coordPanel.classList.add('panel-right');
  coordPlaceholder.style.display = 'none';
  coordOutput.style.display = 'block';

  const selectedFormat = formatSelect.value;
  
  if (selectedFormat === 'bbox') {
    bboxOutput.style.display = 'block';
    textOutput.style.display = 'none';
    
    const bounds = calculateBounds(snapshot);
    if (bounds) {
      minXEl.innerText = bounds.minX.toFixed(4);
      minYEl.innerText = bounds.minY.toFixed(4);
      maxXEl.innerText = bounds.maxX.toFixed(4);
      maxYEl.innerText = bounds.maxY.toFixed(4);
    }
  } else {
    bboxOutput.style.display = 'none';
    textOutput.style.display = 'block';
    
    let text = '';
    if (selectedFormat === 'geojson') {
      text = JSON.stringify({ type: "FeatureCollection", features: snapshot }, null, 2);
    } else if (selectedFormat === 'wkt') {
      text = snapshot.map(f => geojsonToWkt(f.geometry)).join('\n');
    } else if (selectedFormat === 'raw') {
      text = snapshot.map(f => JSON.stringify(f.geometry.coordinates)).join('\n');
    }
    geometryText.value = text;
  }
}

if (copyTextBtn) {
  copyTextBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(geometryText.value).then(() => {
      const orig = copyTextBtn.innerText;
      copyTextBtn.innerText = 'Copied!';
      setTimeout(() => { copyTextBtn.innerText = orig; }, 2000);
    });
  });
}

// Handle manual coordinate input
function handleManualCoordinateInput() {
  const x1 = parseFloat(minXEl.innerText);
  const y1 = parseFloat(minYEl.innerText);
  const x2 = parseFloat(maxXEl.innerText);
  const y2 = parseFloat(maxYEl.innerText);

  if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;

  const minLat = Math.min(y1, y2);
  const maxLat = Math.max(y1, y2);
  const minLng = Math.min(x1, x2);
  const maxLng = Math.max(x1, x2);

  draw.clear();
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
}

[minXEl, minYEl, maxXEl, maxYEl].forEach(el => {
  if (el) {
    el.addEventListener('input', handleManualCoordinateInput);
    
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
    });

    el.addEventListener('paste', (e) => {
      let paste = (e.clipboardData || window.clipboardData).getData('text');
      let numbers = paste.match(/-?\d+(\.\d+)?/g);
      
      if (numbers && numbers.length >= 4) {
        e.preventDefault();
        minXEl.innerText = numbers[0];
        minYEl.innerText = numbers[1];
        maxXEl.innerText = numbers[2];
        maxYEl.innerText = numbers[3];
        
        handleManualCoordinateInput();
        
        const bounds = L.latLngBounds([parseFloat(numbers[1]), parseFloat(numbers[0])], [parseFloat(numbers[3]), parseFloat(numbers[2])]);
        map.fitBounds(bounds, { paddingTopLeft: [50, 50], paddingBottomRight: [50, 250] });
        
        el.blur();
      }
    });
  }
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
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&polygon_geojson=1&polygon_threshold=0.005&limit=5`);
    const data = await response.json();

    if (data && data.length > 0) {
      const polygonResult = data.find(item => item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon'));
      const result = polygonResult || data[0];
      
      if (searchPolygonLayer) map.removeLayer(searchPolygonLayer);

      if (result.geojson) {
        searchPolygonLayer = L.geoJSON(result.geojson, {
          style: { color: '#0969da', weight: 2, fillColor: '#0969da', fillOpacity: 0.1 }
        }).addTo(map);

        map.fitBounds(searchPolygonLayer.getBounds(), { padding: [50, 50] });
        if (coordPanel) coordPanel.classList.add('panel-right');

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
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

map.on('popupopen', function(e) {
  const createBtn = document.getElementById('popup-create-bbox');
  if (createBtn && searchPolygonLayer) {
    createBtn.onclick = function() {
      const bounds = searchPolygonLayer.getBounds();
      const minLat = bounds.getSouth(), maxLat = bounds.getNorth();
      const minLng = bounds.getWest(), maxLng = bounds.getEast();
      
      draw.clear();
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
      
      map.removeLayer(searchPolygonLayer);
      searchPolygonLayer = null;
      map.closePopup();
      updateCoordinatesPanel();
    };
  }
});

// GeoJSON Drag and Drop
const mapContainerEl = document.getElementById('map-container');

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
