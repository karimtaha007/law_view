import { AppState, Mode, PlateData, PointData } from './types';

const STORAGE_KEY = 'floorPlan_konva_points_v1';
const IMAGE_STORAGE_KEY = 'floorPlan_konva_image_v1';

class Store {
  private state: AppState = {
    mode: 'draw',
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    circleSize: 24,
    selectedPointId: null,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
  };

  private points: PointData[] = [];
  private excelData: PlateData[] = [];
  private imageBase64: string | null = null;
  private listeners: Set<() => void> = new Set();

  // State getters
  getState(): AppState {
    return { ...this.state };
  }

  getPoints(): PointData[] {
    return [...this.points];
  }

  getExcelData(): PlateData[] {
    return this.excelData;
  }

  getPlateData(rowNum: number): PlateData | null {
    return this.excelData[rowNum - 1] || null;
  }

  getImageBase64(): string | null {
    return this.imageBase64;
  }

  getPointById(id: string): PointData | undefined {
    return this.points.find(p => p.id === id);
  }

  // State setters
  setMode(mode: Mode): void {
    this.state.mode = mode;
    this.notify();
  }

  setScale(scale: number): void {
    this.state.scale = Math.max(0.1, Math.min(6, scale));
    this.notify();
  }

  setOffset(x: number, y: number): void {
    this.state.offsetX = x;
    this.state.offsetY = y;
    this.notify();
  }

  setCircleSize(size: number): void {
    this.state.circleSize = size;
    this.notify();
  }

  setSelectedPointId(id: string | null): void {
    this.state.selectedPointId = id;
    this.notify();
  }

  setDragging(isDragging: boolean, startX = 0, startY = 0): void {
    this.state.isDragging = isDragging;
    this.state.dragStartX = startX;
    this.state.dragStartY = startY;
  }

  // Points management
  addPoint(point: PointData): void {
    // Check if row already exists
    if (this.points.some(p => p.rowNum === point.rowNum)) {
      return;
    }
    
    this.points.push(point);
    this.points.sort((a, b) => a.rowNum - b.rowNum);
    this.saveToLocal();
    this.notify();
  }

  removePoint(id: string): PointData | undefined {
    const index = this.points.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    const removed = this.points.splice(index, 1)[0];
    
    if (this.state.selectedPointId === id) {
      this.state.selectedPointId = null;
    }
    
    this.saveToLocal();
    this.notify();
    return removed;
  }

  clearAllPoints(): void {
    this.points = [];
    this.state.selectedPointId = null;
    this.saveToLocal();
    this.notify();
  }

  hasRowNum(rowNum: number): boolean {
    return this.points.some(p => p.rowNum === rowNum);
  }

  getNextAvailableRow(): number {
    const existingRows = new Set(this.points.map(p => p.rowNum));
    for (let i = 1; i <= 215; i++) {
      if (!existingRows.has(i)) return i;
    }
    return 215;
  }

  // Data loading
  setExcelData(data: PlateData[]): void {
    this.excelData = data;
    this.notify();
  }

  setImageBase64(base64: string | null): void {
    this.imageBase64 = base64;
    if (base64) {
      try {
        localStorage.setItem(IMAGE_STORAGE_KEY, base64);
      } catch (e) {
        console.warn('Could not save image to localStorage:', e);
      }
    }
    this.notify();
  }

  // Local storage
  saveToLocal(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.points));
    } catch (e) {
      console.error('Could not save to localStorage:', e);
    }
  }

  loadFromLocal(): PointData[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.points = parsed;
          this.notify();
          return parsed;
        }
      }
    } catch (e) {
      console.error('Could not load from localStorage:', e);
    }
    return [];
  }

  loadImageFromLocal(): string | null {
    try {
      const saved = localStorage.getItem(IMAGE_STORAGE_KEY);
      if (saved) {
        this.imageBase64 = saved;
        return saved;
      }
    } catch (e) {
      console.warn('Could not load image from localStorage:', e);
    }
    return null;
  }

  // Import/Export
  importPoints(data: PointData[]): void {
    this.points = [];
    data.forEach(item => {
      if (item.rowNum >= 1 && item.rowNum <= 215) {
        this.points.push({
          id: `c_${item.rowNum}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          x: item.x,
          y: item.y,
          size: item.size || 24,
          rowNum: item.rowNum,
        });
      }
    });
    this.points.sort((a, b) => a.rowNum - b.rowNum);
    this.saveToLocal();
    this.notify();
  }

  exportFullData(): object[] {
    return this.points.map(p => {
      const plateData = this.getPlateData(p.rowNum) || {};
      return {
        row: p.rowNum,
        x: p.x,
        y: p.y,
        size: p.size,
        ...plateData,
      };
    });
  }

  // Subscription
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const store = new Store();
