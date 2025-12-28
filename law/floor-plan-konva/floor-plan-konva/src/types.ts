// Type definitions for the Floor Plan Manager

export interface Signal {
  [key: string]: number;
}

export interface PlateData {
  plate: string;
  signals: Signal;
}

export interface PointData {
  id: string;
  x: number;
  y: number;
  size: number;
  rowNum: number;
}

export interface SavedPointData extends PointData {
  plate?: string;
  signals?: Signal;
}

export type Mode = 'draw' | 'pan';

export interface AppState {
  mode: Mode;
  scale: number;
  offsetX: number;
  offsetY: number;
  circleSize: number;
  selectedPointId: string | null;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
}

export interface TooltipPosition {
  x: number;
  y: number;
}
