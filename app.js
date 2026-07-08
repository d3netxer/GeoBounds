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
    selectedPointColor: (f) => f.properties.color || '#4285f4'
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
        pointColor: (f) => f.properties.color || window.currentDrawingColor || '#4285f4',
        pointOutlineColor: () => '#ffffff'
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

// Drag and drop sorting logic
window.geometryOrder = [];

let dragGhost = null;

function initDragAndDrop() {
  const wrapper = document.getElementById('geometry-cards-wrapper');
  if (wrapper) {
    // Create the dummy element for hiding drag ghost
    dragGhost = document.createElement('div');
    dragGhost.style.width = '1px';
    dragGhost.style.height = '1px';
    dragGhost.style.opacity = '0';
    dragGhost.style.position = 'absolute';
    dragGhost.style.left = '-999px';
    document.body.appendChild(dragGhost);

    wrapper.addEventListener('dragstart', (e) => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) {
        e.preventDefault();
        return;
      }
      const card = handle.closest('.geometry-card');
      if (!card) return;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.id);
      
      // Hide the default browser drag ghost image synchronously (works in Safari & Chrome)
      if (dragGhost) {
        e.dataTransfer.setDragImage(dragGhost, 0, 0);
      }
    });

    wrapper.addEventListener('dragend', (e) => {
      const card = e.target.closest('.geometry-card');
      if (card) {
        card.classList.remove('dragging');
      }
      const cards = Array.from(wrapper.querySelectorAll('.geometry-card'));
      window.geometryOrder = cards
        .map(c => c.id.replace('card-', ''))
        .filter(id => id && id !== 'placeholder-card');
      
      // Update coordinates panel to reflect the sorted state
      updateCoordinatesPanel();
    });

    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingCard = wrapper.querySelector('.dragging');
      if (!draggingCard) return;

      const afterElement = getDragAfterElement(wrapper, e.clientY);
      if (afterElement == null) {
        wrapper.appendChild(draggingCard);
      } else {
        wrapper.insertBefore(draggingCard, afterElement);
      }
    });
  }
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.geometry-card:not(.dragging):not(.placeholder-card)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
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
      updateCoordinatesPanel();
      document.getElementById('toast-notification').style.display = 'none';
      window.currentDrawingColor = getAvailableColor();
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

// Terra Draw Events
draw.on('change', () => {
  if (window.isUpdatingProgrammatically) return;
  updateCoordinatesPanel();
});

draw.on('deselect', () => {
  if (window.isUpdatingProgrammatically) return;
  updateCoordinatesPanel();
});
draw.on('finish', (eventId) => {
  setTimeout(() => {
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
    
    // Assign color to the new feature
    const feature = snapshot.find(f => f.id === id);
    if (feature && !feature.properties.color) {
      const availableColor = window.currentDrawingColor || getAvailableColor();
      feature.properties = feature.properties || {};
      feature.properties.color = availableColor;
      
      try {
        window.isUpdatingProgrammatically = true;
        draw.removeFeatures([id]);
        draw.addFeatures([feature]);
        window.isUpdatingProgrammatically = false;
      } catch(e) {
        window.isUpdatingProgrammatically = false;
      }
    }
    
    window.currentDrawingColor = getAvailableColor();
    
    draw.setMode('select');
    
    setTimeout(() => {
      try {
        draw.selectFeature(id);
      } catch (e) {
        console.log('Auto-select failed:', e);
        try {
          const snap = draw.getSnapshot();
          if (snap.length > 0) draw.selectFeature(snap[0].id);
        } catch(e2) {}
      }
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      updateCoordinatesPanel();
    }, 50);
  }, 50);
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
    
    const minX = parseFloat(inputs[0].value);
    const minY = parseFloat(inputs[1].value);
    const maxX = parseFloat(inputs[2].value);
    const maxY = parseFloat(inputs[3].value);
    
    if (!isNaN(minX) && !isNaN(minY) && !isNaN(maxX) && !isNaN(maxY)) {
      const snapshot = getActiveShapes();
      const feature = snapshot.find(f => f.id === id);
      
      if (feature) {
        if (minX >= maxX || minY >= maxY) {
          alert('Invalid bounding box: Min X must be < Max X, and Min Y must be < Max Y.');
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
    const mode = feature.properties.mode || 'polygon';
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
      newText = `latitude:  ${lat.toFixed(4)} longitude: ${lon.toFixed(4)}`;
    }
    
    const existingCard = document.getElementById('card-' + feature.id);
    if (existingCard && existingCard.dataset.format === selectedFormat) {
      // Just update text and title to prevent flickering!
      if (selectedFormat === 'bbox') {
        const bounds = calculateBounds([feature]);
        if (bounds) {
          const vals = [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];
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
      const expandBtnHtml = (selectedFormat !== 'bbox' && selectedFormat !== 'latlng') ? `<button class="icon-btn" title="${expandTitle}" onclick="toggleExpand(this)">${expandIcon}</button>` : '';
      
      let contentHtml = '';
      if (selectedFormat === 'bbox') {
        const bounds = calculateBounds([feature]);
        if (bounds) {
          const inputStyle = `width: 100%; border-radius: 4px; padding: 0.25rem; background: rgba(0, 0, 0, 0.2); color: var(--text-color); border: 1px solid var(--border-color); font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.85rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;`;
          const onChangeFunc = `onchange="updateBoundingBoxFromInputs('${feature.id}')"`;
          contentHtml = `
            <div class="bbox-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
              <div><label style="font-size: 0.75rem; color: #aaa; margin-bottom: 2px; display: block;">Min X (Lng)</label><input type="number" step="any" class="bbox-input min-x" value="${bounds.minX.toFixed(4)}" style="${inputStyle}" ${onChangeFunc} onfocus="this.style.borderColor='var(--border-color)'" onblur="this.style.borderColor='transparent'"></div>
              <div><label style="font-size: 0.75rem; color: #aaa; margin-bottom: 2px; display: block;">Min Y (Lat)</label><input type="number" step="any" class="bbox-input min-y" value="${bounds.minY.toFixed(4)}" style="${inputStyle}" ${onChangeFunc} onfocus="this.style.borderColor='var(--border-color)'" onblur="this.style.borderColor='transparent'"></div>
              <div><label style="font-size: 0.75rem; color: #aaa; margin-bottom: 2px; display: block;">Max X (Lng)</label><input type="number" step="any" class="bbox-input max-x" value="${bounds.maxX.toFixed(4)}" style="${inputStyle}" ${onChangeFunc} onfocus="this.style.borderColor='var(--border-color)'" onblur="this.style.borderColor='transparent'"></div>
              <div><label style="font-size: 0.75rem; color: #aaa; margin-bottom: 2px; display: block;">Max Y (Lat)</label><input type="number" step="any" class="bbox-input max-y" value="${bounds.maxY.toFixed(4)}" style="${inputStyle}" ${onChangeFunc} onfocus="this.style.borderColor='var(--border-color)'" onblur="this.style.borderColor='transparent'"></div>
            </div>
          `;
        }
      } else {
        const defaultRows = selectedFormat === 'latlng' ? 1 : 5;
        const currentRows = selectedFormat === 'latlng' ? 1 : (isExpanded ? 20 : 5);
        contentHtml = `
          <textarea rows="${currentRows}" data-default-rows="${defaultRows}" style="width: 100%; border-radius: 6px; padding: 0.5rem; background: rgba(0, 0, 0, 0.2); color: var(--text-color); border: 1px solid var(--border-color); font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.85rem; resize: vertical;" readonly>${newText}</textarea>
        `;
      }
      
      const cardHtml = `
        <div class="glass-panel geometry-card ${existingCard ? '' : 'new-card'}" style="padding: 1rem;" id="card-${feature.id}" data-format="${selectedFormat}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div class="drag-handle" draggable="true" title="Drag to reorder">⋮⋮</div>
              ${iconHtml}
              <input class="title-input" type="text" value="${feature.properties.name || `${type} ${index + 1}`}" style="margin: 0; text-transform: capitalize; background: transparent; border: 1px solid transparent; color: var(--text-color); font-size: 1rem; font-weight: bold; outline: none; padding: 2px 4px; border-radius: 4px; transition: border-color 0.2s; width: 130px;" onchange="updateFeatureName('${feature.id}', this.value)" onfocus="this.style.borderColor='var(--border-color)'" onblur="this.style.borderColor='transparent'">
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <select class="glow-select" style="background: rgba(0,0,0,0.3); color: white; border: 1px solid var(--border-color); padding: 0.15rem 0.25rem; border-radius: 4px; outline: none; cursor: pointer; font-size: 0.75rem;" onchange="changeFormat('${feature.id}', this)">
                ${mode === 'rectangle' ? `<option value="bbox" ${selectedFormat === 'bbox' ? 'selected' : ''}>Bounding Box</option>` : ''}
                ${mode === 'point' ? `<option value="latlng" ${selectedFormat === 'latlng' ? 'selected' : ''}>Lat/Lng Text</option>` : ''}
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
        </div>
      `;
      
      if (existingCard) {
        existingCard.outerHTML = cardHtml;
      } else {
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
