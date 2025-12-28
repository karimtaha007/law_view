import { store } from './store';
import { PlateData } from './types';

// DOM Elements cache
let tooltipEl: HTMLElement | null = null;
let toastEl: HTMLElement | null = null;
let savedBadgeEl: HTMLElement | null = null;

export function initUI(): void {
  tooltipEl = document.getElementById('tooltip');
  toastEl = document.getElementById('toast');
  savedBadgeEl = document.getElementById('savedBadge');
}

// Toast notifications
let toastTimeout: number | null = null;

export function showToast(message: string, isError = false): void {
  if (!toastEl) return;

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastEl.textContent = message;
  toastEl.classList.toggle('error', isError);
  toastEl.classList.add('show');

  toastTimeout = window.setTimeout(() => {
    toastEl?.classList.remove('show');
  }, 2500);
}

// Saved badge
export function showSavedBadge(): void {
  if (!savedBadgeEl) return;

  savedBadgeEl.classList.add('visible');
  setTimeout(() => {
    savedBadgeEl?.classList.remove('visible');
  }, 2000);
}

// Tooltip
export function showTooltip(rowNum: number, mouseX: number, mouseY: number): void {
  if (!tooltipEl) return;

  const plateData = store.getPlateData(rowNum);

  if (!plateData) {
    tooltipEl.innerHTML = `<h3><span class="badge">${rowNum}</span> No Data</h3>`;
  } else {
    tooltipEl.innerHTML = generateTooltipHTML(rowNum, plateData);
  }

  tooltipEl.classList.add('visible');
  positionTooltip(mouseX, mouseY);
}

export function hideTooltip(): void {
  tooltipEl?.classList.remove('visible');
}

function generateTooltipHTML(rowNum: number, plateData: PlateData): string {
  const signals = Object.entries(plateData.signals || {});

  const signalItems = signals.map(([key, val], i) => {
    const signalClass = getSignalClass(val);
    return `
      <div class="tooltip-item ${i === 0 ? 'main' : ''}">
        <div class="label">${escapeHTML(key)}</div>
        <div class="value ${signalClass}">${val}</div>
      </div>
    `;
  }).join('');

  return `
    <h3>
      <span class="badge">${rowNum}</span>
      <span class="plate">${escapeHTML(plateData.plate)}</span>
    </h3>
    <div class="tooltip-grid">
      ${signalItems || '<div class="tooltip-item main"><div class="label">Info</div><div class="value">No signals</div></div>'}
    </div>
  `;
}

function getSignalClass(val: number): string {
  if (val >= -60) return 'strong';
  if (val >= -80) return 'medium';
  return 'weak';
}

function positionTooltip(mouseX: number, mouseY: number): void {
  if (!tooltipEl) return;

  const padding = 15;
  const tooltipRect = tooltipEl.getBoundingClientRect();

  let left = mouseX + padding;
  let top = mouseY + padding;

  // Keep tooltip on screen
  if (left + tooltipRect.width > window.innerWidth - padding) {
    left = mouseX - tooltipRect.width - padding;
  }
  if (top + tooltipRect.height > window.innerHeight - padding) {
    top = mouseY - tooltipRect.height - padding;
  }

  tooltipEl.style.left = `${Math.max(padding, left)}px`;
  tooltipEl.style.top = `${Math.max(padding, top)}px`;
}

// Point list sidebar
export function updatePointList(): void {
  const pointListEl = document.getElementById('pointList');
  const pointCountEl = document.getElementById('pointCount');
  
  if (!pointListEl || !pointCountEl) return;

  const points = store.getPoints();
  const state = store.getState();

  pointCountEl.textContent = String(points.length);

  if (points.length === 0) {
    pointListEl.innerHTML = `
      <div class="empty-message">
        Click on map to add circles<br>
        Hover over circle to see data
      </div>
    `;
    return;
  }

  pointListEl.innerHTML = points.map(p => {
    const plateData = store.getPlateData(p.rowNum);
    const plateName = plateData ? plateData.plate : '?';
    const isSelected = state.selectedPointId === p.id;

    return `
      <div class="point-item ${isSelected ? 'selected' : ''}" data-id="${p.id}">
        <div>
          <strong>${p.rowNum}</strong> → ${escapeHTML(plateName)}
        </div>
        <button class="delete-btn" data-id="${p.id}" title="Delete">✕</button>
      </div>
    `;
  }).join('');
}

// Utility
function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Zoom display
export function updateZoomDisplay(): void {
  const zoomDisplayEl = document.getElementById('zoomDisplay');
  if (zoomDisplayEl) {
    const state = store.getState();
    zoomDisplayEl.textContent = `${Math.round(state.scale * 100)}%`;
  }
}

// Size display
export function updateSizeDisplay(size: number): void {
  const sizeDisplayEl = document.getElementById('sizeDisplay');
  if (sizeDisplayEl) {
    sizeDisplayEl.textContent = `${size}px`;
  }
}

// Next row input
export function updateNextRowInput(): void {
  const nextRowEl = document.getElementById('nextRow') as HTMLInputElement;
  if (nextRowEl) {
    nextRowEl.value = String(store.getNextAvailableRow());
  }
}

// Mode buttons
export function updateModeButtons(mode: 'draw' | 'pan'): void {
  const drawBtn = document.getElementById('drawMode');
  const panBtn = document.getElementById('panMode');

  drawBtn?.classList.toggle('active', mode === 'draw');
  panBtn?.classList.toggle('active', mode === 'pan');
}
