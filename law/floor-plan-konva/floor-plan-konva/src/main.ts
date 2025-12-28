import { CanvasManager } from './canvas';
import { store } from './store';
import { PlateData } from './types';
import {
  initUI,
  showToast,
  showSavedBadge,
  updatePointList,
  updateZoomDisplay,
  updateSizeDisplay,
  updateNextRowInput,
  updateModeButtons,
  hideTooltip,
} from './ui';

// Global canvas manager instance
let canvasManager: CanvasManager;

// Initialize application
async function init(): Promise<void> {
  console.log('🚀 Initializing Floor Plan Manager...');

  // Initialize UI helpers
  initUI();

  // Create canvas manager
  canvasManager = new CanvasManager('canvas-container');

  // Load plate data
  await loadPlateData();

  // Try to load image
  await loadImage();

  // Load saved points from localStorage
  loadSavedPoints();

  // Setup UI event listeners
  setupEventListeners();

  // Subscribe to store changes
  store.subscribe(() => {
    updatePointList();
    updateZoomDisplay();
    showSavedBadge();
  });

  // Initial UI update
  updatePointList();
  updateZoomDisplay();
  updateNextRowInput();

  console.log('✓ Floor Plan Manager initialized');
}

// Load plate data from JSON
async function loadPlateData(): Promise<void> {
  try {
    const response = await fetch('plate_data.json');
    if (!response.ok) throw new Error('File not found');
    
    const data: PlateData[] = await response.json();
    store.setExcelData(data);
    console.log(`✓ Loaded ${data.length} rows from plate_data.json`);
  } catch (error) {
    console.warn('⚠ plate_data.json not found, using placeholder data');
    
    // Generate placeholder data
    const placeholderData: PlateData[] = [];
    for (let i = 1; i <= 215; i++) {
      placeholderData.push({
        plate: `Point ${i}`,
        signals: { Signal: -70 },
      });
    }
    store.setExcelData(placeholderData);
  }
}

// Load floor plan image
async function loadImage(): Promise<void> {
  // First try to load from localStorage
  const savedImage = store.loadImageFromLocal();
  if (savedImage) {
    try {
      await canvasManager.loadImage(savedImage);
      console.log('✓ Loaded image from localStorage');
      return;
    } catch (error) {
      console.warn('Could not load saved image');
    }
  }

  // Try to load from file
  try {
    await canvasManager.loadImage('floor1.jpg');
    console.log('✓ Loaded floor1.jpg');
  } catch (error) {
    console.warn('⚠ floor1.jpg not found. Click "Image" to load one.');
    showToast('Load an image to get started', true);
  }
}

// Load saved points
function loadSavedPoints(): void {
  const savedPoints = store.loadFromLocal();
  if (savedPoints.length > 0) {
    canvasManager.renderAllPoints();
    showToast(`Restored ${savedPoints.length} saved points`);
  }
}

// Setup event listeners
function setupEventListeners(): void {
  // Mode buttons
  document.getElementById('drawMode')?.addEventListener('click', () => {
    canvasManager.setMode('draw');
    updateModeButtons('draw');
  });

  document.getElementById('panMode')?.addEventListener('click', () => {
    canvasManager.setMode('pan');
    updateModeButtons('pan');
  });

  // Zoom buttons
  document.getElementById('zoomIn')?.addEventListener('click', () => {
    canvasManager.zoom(1.25);
    updateZoomDisplay();
  });

  document.getElementById('zoomOut')?.addEventListener('click', () => {
    canvasManager.zoom(0.8);
    updateZoomDisplay();
  });

  document.getElementById('fitView')?.addEventListener('click', () => {
    canvasManager.fitToContent();
    updateZoomDisplay();
  });

  // Circle size slider
  const circleSizeInput = document.getElementById('circleSize') as HTMLInputElement;
  circleSizeInput?.addEventListener('input', () => {
    const size = parseInt(circleSizeInput.value, 10);
    store.setCircleSize(size);
    updateSizeDisplay(size);
  });

  // Load image button
  document.getElementById('loadImage')?.addEventListener('click', () => {
    document.getElementById('imageInput')?.click();
  });

  // Image file input
  document.getElementById('imageInput')?.addEventListener('change', handleImageUpload);

  // Clear all button
  document.getElementById('clearAll')?.addEventListener('click', () => {
    const points = store.getPoints();
    if (points.length === 0) {
      showToast('No points to clear');
      return;
    }

    if (confirm(`Clear all ${points.length} points?`)) {
      canvasManager.clearAllPoints();
      updateNextRowInput();
      showToast('All points cleared');
    }
  });

  // Export data button
  document.getElementById('exportData')?.addEventListener('click', exportData);

  // Import data button
  document.getElementById('importData')?.addEventListener('click', () => {
    document.getElementById('jsonInput')?.click();
  });

  // JSON file input
  document.getElementById('jsonInput')?.addEventListener('change', handleJSONImport);

  // Point list click delegation
  document.getElementById('pointList')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Delete button click
    if (target.classList.contains('delete-btn')) {
      const id = target.dataset.id;
      if (id) {
        canvasManager.removePointById(id);
        updateNextRowInput();
      }
      return;
    }

    // Point item click
    const pointItem = target.closest('.point-item') as HTMLElement;
    if (pointItem) {
      const id = pointItem.dataset.id;
      if (id) {
        canvasManager.selectPoint(id);
      }
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown);
}

// Handle image upload
function handleImageUpload(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64 = event.target?.result as string;
    try {
      await canvasManager.loadImage(base64);
      showToast('Image loaded successfully');
    } catch (error) {
      showToast('Failed to load image', true);
    }
  };
  reader.onerror = () => {
    showToast('Failed to read image file', true);
  };
  reader.readAsDataURL(file);

  // Reset input
  input.value = '';
}

// Handle JSON import
function handleJSONImport(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result as string);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid format');
      }

      const currentCount = store.getPoints().length;
      if (confirm(`Replace current ${currentCount} points with ${data.length} new points?`)) {
        // Convert row property if needed
        const normalizedData = data.map((item: any) => ({
          ...item,
          rowNum: item.rowNum || item.row,
        }));

        store.importPoints(normalizedData);
        canvasManager.renderAllPoints();
        updateNextRowInput();
        showToast(`Loaded ${store.getPoints().length} points`);
      }
    } catch (error) {
      console.error('JSON import error:', error);
      showToast('Error loading JSON file', true);
    }
  };
  reader.readAsText(file);

  // Reset input
  input.value = '';
}

// Export data
function exportData(): void {
  const points = store.getPoints();
  
  if (points.length === 0) {
    showToast('No points to export', true);
    return;
  }

  const fullData = store.exportFullData();
  const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'floor_plan_data.json';
  a.click();
  
  URL.revokeObjectURL(a.href);
  showToast('Data exported successfully!');
}

// Keyboard shortcuts
function handleKeyDown(e: KeyboardEvent): void {
  // Ignore if typing in input
  if ((e.target as HTMLElement).tagName === 'INPUT') return;

  switch (e.key.toLowerCase()) {
    case 'd':
      canvasManager.setMode('draw');
      updateModeButtons('draw');
      break;

    case 'p':
      canvasManager.setMode('pan');
      updateModeButtons('pan');
      break;

    case 'f':
      canvasManager.fitToContent();
      updateZoomDisplay();
      break;

    case 'delete':
    case 'backspace':
      const selectedId = store.getState().selectedPointId;
      if (selectedId) {
        e.preventDefault();
        canvasManager.removePointById(selectedId);
        updateNextRowInput();
      }
      break;

    case '+':
    case '=':
      canvasManager.zoom(1.25);
      updateZoomDisplay();
      break;

    case '-':
      canvasManager.zoom(0.8);
      updateZoomDisplay();
      break;

    case 'escape':
      store.setSelectedPointId(null);
      hideTooltip();
      break;
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
