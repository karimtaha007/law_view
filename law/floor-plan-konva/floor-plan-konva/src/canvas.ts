import Konva from 'konva';
import { store } from './store';
import { PointData } from './types';
import { showTooltip, hideTooltip, showToast } from './ui';

export class CanvasManager {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private imageLayer: Konva.Layer;
  private pointsLayer: Konva.Layer;
  private backgroundImage: Konva.Image | null = null;
  private pointShapes: Map<string, Konva.Group> = new Map();
  private container: HTMLElement;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    this.container = container;

    // Create stage
    this.stage = new Konva.Stage({
      container: containerId,
      width: container.clientWidth,
      height: container.clientHeight,
      draggable: false,
    });

    // Create layers
    this.imageLayer = new Konva.Layer();
    this.pointsLayer = new Konva.Layer();
    this.layer = new Konva.Layer();

    this.stage.add(this.imageLayer);
    this.stage.add(this.pointsLayer);
    this.stage.add(this.layer);

    this.setupEventListeners();
    this.setupResizeHandler();
  }

  private setupEventListeners(): void {
    const state = store.getState();

    // Click to add point
    this.stage.on('click', (e) => {
      const currentState = store.getState();
      
      if (currentState.mode !== 'draw') return;
      if (e.target !== this.stage && e.target !== this.backgroundImage) return;

      const pos = this.stage.getPointerPosition();
      if (!pos) return;

      // Convert to image coordinates
      const transform = this.imageLayer.getAbsoluteTransform().copy().invert();
      const imagePos = transform.point(pos);

      this.addPointAtPosition(imagePos.x, imagePos.y);
    });

    // Right-click context menu prevention
    this.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
    });

    // Mouse down for panning
    this.stage.on('mousedown', (e) => {
      const currentState = store.getState();
      
      if (e.evt.button === 0 && currentState.mode === 'pan') {
        const pos = this.stage.getPointerPosition();
        if (pos) {
          store.setDragging(true, pos.x - currentState.offsetX, pos.y - currentState.offsetY);
          this.container.classList.add('grabbing');
        }
      }
    });

    // Mouse move for panning
    this.stage.on('mousemove', () => {
      const currentState = store.getState();
      
      if (currentState.isDragging && currentState.mode === 'pan') {
        const pos = this.stage.getPointerPosition();
        if (pos) {
          store.setOffset(
            pos.x - currentState.dragStartX,
            pos.y - currentState.dragStartY
          );
          this.updateTransform();
        }
      }
    });

    // Mouse up
    this.stage.on('mouseup mouseleave', () => {
      store.setDragging(false);
      this.container.classList.remove('grabbing');
    });

    // Wheel zoom
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();

      const currentState = store.getState();
      const pos = this.stage.getPointerPosition();
      if (!pos) return;

      const oldScale = currentState.scale;
      const factor = e.evt.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.max(0.1, Math.min(6, oldScale * factor));

      // Calculate new offset to zoom toward cursor
      const mousePointTo = {
        x: (pos.x - currentState.offsetX) / oldScale,
        y: (pos.y - currentState.offsetY) / oldScale,
      };

      const newOffsetX = pos.x - mousePointTo.x * newScale;
      const newOffsetY = pos.y - mousePointTo.y * newScale;

      store.setScale(newScale);
      store.setOffset(newOffsetX, newOffsetY);
      this.updateTransform();
    });
  }

  private setupResizeHandler(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.stage.width(this.container.clientWidth);
      this.stage.height(this.container.clientHeight);
    });
    resizeObserver.observe(this.container);
  }

  // Image loading
  loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const imageObj = new Image();
      imageObj.crossOrigin = 'anonymous';
      
      imageObj.onload = () => {
        if (this.backgroundImage) {
          this.backgroundImage.destroy();
        }

        this.backgroundImage = new Konva.Image({
          image: imageObj,
          x: 0,
          y: 0,
        });

        this.imageLayer.add(this.backgroundImage);
        this.imageLayer.draw();

        // Convert to base64 for export
        try {
          const canvas = document.createElement('canvas');
          canvas.width = imageObj.naturalWidth;
          canvas.height = imageObj.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(imageObj, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg', 0.9);
            store.setImageBase64(base64);
          }
        } catch (e) {
          console.warn('Could not convert image to base64:', e);
        }

        this.fitToContent();
        resolve();
      };

      imageObj.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      imageObj.src = src;
    });
  }

  fitToContent(): void {
    if (!this.backgroundImage) return;

    const imageWidth = this.backgroundImage.width();
    const imageHeight = this.backgroundImage.height();
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    // Focus on the main content area
    const contentLeft = imageWidth * 0.15;
    const contentTop = imageHeight * 0.28;
    const contentWidth = imageWidth * 0.72;
    const contentHeight = imageHeight * 0.48;

    const scale = Math.min(
      containerWidth / contentWidth,
      containerHeight / contentHeight
    ) * 0.92;

    const clampedScale = Math.max(0.3, Math.min(4, scale));

    const offsetX = containerWidth / 2 - (contentLeft + contentWidth / 2) * clampedScale;
    const offsetY = containerHeight / 2 - (contentTop + contentHeight / 2) * clampedScale;

    store.setScale(clampedScale);
    store.setOffset(offsetX, offsetY);
    this.updateTransform();
  }

  updateTransform(): void {
    const state = store.getState();
    
    this.imageLayer.position({ x: state.offsetX, y: state.offsetY });
    this.imageLayer.scale({ x: state.scale, y: state.scale });

    this.pointsLayer.position({ x: state.offsetX, y: state.offsetY });
    this.pointsLayer.scale({ x: state.scale, y: state.scale });

    // Update point sizes to maintain visual consistency
    this.updateAllPointSizes();

    this.stage.batchDraw();
  }

  // Point management
  private addPointAtPosition(x: number, y: number): void {
    const state = store.getState();
    const nextRow = this.getNextRowInput();

    if (nextRow < 1 || nextRow > 215) {
      showToast('Row must be between 1 and 215', true);
      return;
    }

    if (store.hasRowNum(nextRow)) {
      showToast(`Circle ${nextRow} already exists!`, true);
      return;
    }

    const point: PointData = {
      id: `c_${nextRow}_${Date.now()}`,
      x: Math.round(x),
      y: Math.round(y),
      size: state.circleSize,
      rowNum: nextRow,
    };

    store.addPoint(point);
    this.createPointShape(point);
    this.updateNextRowInput();
    showToast(`Circle ${nextRow} added`);
  }

  createPointShape(point: PointData): void {
    const state = store.getState();
    const visualSize = point.size / state.scale;

    const group = new Konva.Group({
      x: point.x,
      y: point.y,
      id: point.id,
    });

    // Circle background
    const circle = new Konva.Circle({
      radius: visualSize / 2,
      fill: 'rgba(233, 69, 96, 0.7)',
      stroke: '#e94560',
      strokeWidth: Math.max(1, 2 / state.scale),
    });

    // Text label
    const text = new Konva.Text({
      text: String(point.rowNum),
      fontSize: Math.max(8, 11 / state.scale),
      fill: 'white',
      fontStyle: 'bold',
      align: 'center',
      verticalAlign: 'middle',
    });

    // Center the text
    text.offsetX(text.width() / 2);
    text.offsetY(text.height() / 2);

    group.add(circle);
    group.add(text);

    // Event handlers
    group.on('mouseenter', (e) => {
      circle.fill('rgba(233, 69, 96, 1)');
      group.moveToTop();
      this.pointsLayer.draw();

      const pos = this.stage.getPointerPosition();
      if (pos) {
        showTooltip(point.rowNum, pos.x, pos.y);
      }
    });

    group.on('mousemove', () => {
      const pos = this.stage.getPointerPosition();
      if (pos) {
        showTooltip(point.rowNum, pos.x, pos.y);
      }
    });

    group.on('mouseleave', () => {
      const currentState = store.getState();
      if (currentState.selectedPointId !== point.id) {
        circle.fill('rgba(233, 69, 96, 0.7)');
        circle.stroke('#e94560');
      }
      this.pointsLayer.draw();
      hideTooltip();
    });

    group.on('click', (e) => {
      e.cancelBubble = true;
      this.selectPoint(point.id);
    });

    group.on('contextmenu', (e) => {
      e.evt.preventDefault();
      e.cancelBubble = true;
      this.removePointById(point.id);
    });

    this.pointShapes.set(point.id, group);
    this.pointsLayer.add(group);
    this.pointsLayer.draw();
  }

  selectPoint(id: string): void {
    // Deselect previous
    const prevId = store.getState().selectedPointId;
    if (prevId) {
      const prevGroup = this.pointShapes.get(prevId);
      if (prevGroup) {
        const circle = prevGroup.findOne('Circle') as Konva.Circle;
        if (circle) {
          circle.stroke('#e94560');
          circle.shadowEnabled(false);
        }
      }
    }

    // Select new
    store.setSelectedPointId(id);
    const group = this.pointShapes.get(id);
    if (group) {
      const circle = group.findOne('Circle') as Konva.Circle;
      if (circle) {
        circle.stroke('#00ff88');
        circle.shadowColor('#00ff88');
        circle.shadowBlur(15);
        circle.shadowEnabled(true);
      }
    }

    this.pointsLayer.draw();
  }

  removePointById(id: string): void {
    const removed = store.removePoint(id);
    if (removed) {
      const group = this.pointShapes.get(id);
      if (group) {
        group.destroy();
        this.pointShapes.delete(id);
        this.pointsLayer.draw();
      }
      hideTooltip();
      showToast(`Circle ${removed.rowNum} removed`);
    }
  }

  clearAllPoints(): void {
    this.pointShapes.forEach(group => group.destroy());
    this.pointShapes.clear();
    store.clearAllPoints();
    this.pointsLayer.draw();
    hideTooltip();
  }

  renderAllPoints(): void {
    // Clear existing shapes
    this.pointShapes.forEach(group => group.destroy());
    this.pointShapes.clear();

    // Recreate all points
    const points = store.getPoints();
    points.forEach(point => this.createPointShape(point));
    this.pointsLayer.draw();
  }

  private updateAllPointSizes(): void {
    const state = store.getState();

    this.pointShapes.forEach((group, id) => {
      const point = store.getPointById(id);
      if (!point) return;

      const visualSize = point.size / state.scale;
      const circle = group.findOne('Circle') as Konva.Circle;
      const text = group.findOne('Text') as Konva.Text;

      if (circle) {
        circle.radius(visualSize / 2);
        circle.strokeWidth(Math.max(1, 2 / state.scale));
      }

      if (text) {
        text.fontSize(Math.max(8, 11 / state.scale));
        text.offsetX(text.width() / 2);
        text.offsetY(text.height() / 2);
      }
    });
  }

  // Helper methods
  private getNextRowInput(): number {
    const input = document.getElementById('nextRow') as HTMLInputElement;
    return parseInt(input?.value || '1', 10);
  }

  private updateNextRowInput(): void {
    const input = document.getElementById('nextRow') as HTMLInputElement;
    if (input) {
      input.value = String(store.getNextAvailableRow());
    }
  }

  // Zoom methods
  zoom(factor: number): void {
    const state = store.getState();
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    const oldScale = state.scale;
    const newScale = Math.max(0.1, Math.min(6, oldScale * factor));

    const mousePointTo = {
      x: (centerX - state.offsetX) / oldScale,
      y: (centerY - state.offsetY) / oldScale,
    };

    const newOffsetX = centerX - mousePointTo.x * newScale;
    const newOffsetY = centerY - mousePointTo.y * newScale;

    store.setScale(newScale);
    store.setOffset(newOffsetX, newOffsetY);
    this.updateTransform();
  }

  // Mode handling
  setMode(mode: 'draw' | 'pan'): void {
    store.setMode(mode);
    this.container.classList.remove('mode-draw', 'mode-pan');
    this.container.classList.add(`mode-${mode}`);
  }

  getStage(): Konva.Stage {
    return this.stage;
  }
}
