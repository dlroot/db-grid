/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { DragDropService, DragDropConfig, DragStartedEvent, DragEndedEvent } from '../drag-drop.service';

describe('DragDropService', () => {
  let service: DragDropService;

  beforeEach(() => {
    service = new DragDropService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      const config: DragDropConfig = {
        rowDragEnabled: true,
        colDragEnabled: true,
        rowDragMultiDrag: true,
      };
      service.initialize(config);
      expect(service.isRowDragEnabled()).toBe(true);
      expect(service.isColDragEnabled()).toBe(true);
    });

    it('should default to disabled', () => {
      service.initialize({});
      expect(service.isRowDragEnabled()).toBe(false);
      expect(service.isColDragEnabled()).toBe(false);
    });
  });

  describe('Enable/Disable', () => {
    it('should enable row drag', () => {
      service.enableRowDrag();
      expect(service.isRowDragEnabled()).toBe(true);
    });

    it('should disable row drag', () => {
      service.enableRowDrag();
      service.disableRowDrag();
      expect(service.isRowDragEnabled()).toBe(false);
    });

    it('should enable column drag', () => {
      service.enableColDrag();
      expect(service.isColDragEnabled()).toBe(true);
    });

    it('should disable column drag', () => {
      service.enableColDrag();
      service.disableColDrag();
      expect(service.isColDragEnabled()).toBe(false);
    });
  });

  describe('Row Drag', () => {
    it('should start row drag', () => {
      service.enableRowDrag();
      const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent;
      const rowNodes = [{ id: 'row1', rowIndex: 0 }];
      
      let started = false;
      service.onDragStarted(() => { started = true; });
      
      service.startRowDrag(rowNodes, mockEvent);
      expect(service.isDraggingRows()).toBe(true);
    });

    it('should not start drag when disabled', () => {
      const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent;
      service.startRowDrag([{ id: 'row1' }], mockEvent);
      expect(service.isDraggingRows()).toBe(false);
    });

    it('should get dragged rows', () => {
      service.enableRowDrag();
      const rowNodes = [{ id: 'row1' }, { id: 'row2' }];
      service.startRowDrag(rowNodes, { clientX: 0, clientY: 0 } as MouseEvent);
      expect(service.getDraggedRows()).toHaveLength(2);
    });

    it('should end row drag', () => {
      service.enableRowDrag();
      service.startRowDrag([{ id: 'row1', rowIndex: 0 }], { clientX: 0, clientY: 0 } as MouseEvent);
      
      let ended = false;
      service.onDragEnded(() => { ended = true; });
      
      service.endRowDrag(2, { clientX: 100, clientY: 200 } as MouseEvent);
      expect(service.isDraggingRows()).toBe(false);
    });

    it('should cancel row drag', () => {
      service.enableRowDrag();
      service.startRowDrag([{ id: 'row1', rowIndex: 0 }], { clientX: 0, clientY: 0 } as MouseEvent);
      
      service.cancelRowDrag();
      expect(service.isDraggingRows()).toBe(false);
      expect(service.getDraggedRows()).toEqual([]);
    });

    it('should get drag start index', () => {
      service.enableRowDrag();
      service.startRowDrag([{ id: 'row1', rowIndex: 5 }], { clientX: 0, clientY: 0 } as MouseEvent);
      expect(service.getDragStartIndex()).toBe(5);
    });
  });

  describe('Column Drag', () => {
    it('should start column drag', () => {
      service.enableColDrag();
      const colDef = { field: 'name', colId: 'name' };
      
      let started = false;
      service.onColDragStart(() => { started = true; });
      
      service.startColDrag(colDef as any, 2);
      expect(started).toBe(true);
    });

    it('should end column drag', () => {
      service.enableColDrag();
      const colDef = { field: 'name', colId: 'name' };
      
      let ended = false;
      service.onColDragEnd(() => { ended = true; });
      
      service.endColDrag(colDef as any, 3);
      expect(ended).toBe(true);
    });
  });

  describe('Events', () => {
    it('should subscribe to drag started', () => {
      let capturedEvent: DragStartedEvent | null = null;
      service.onDragStarted((e) => { capturedEvent = e; });
      
      service.enableRowDrag();
      service.startRowDrag([{ id: 'row1' }], { clientX: 50, clientY: 60 } as MouseEvent);
      
      expect(capturedEvent?.type).toBe('dragStarted');
      expect(capturedEvent?.initialX).toBe(50);
    });

    it('should subscribe to drag ended', () => {
      let capturedEvent: DragEndedEvent | null = null;
      service.onDragEnded((e) => { capturedEvent = e; });
      
      service.enableRowDrag();
      service.startRowDrag([{ id: 'row1', rowIndex: 0 }], { clientX: 0, clientY: 0 } as MouseEvent);
      service.endRowDrag(1, { clientX: 100, clientY: 100 } as MouseEvent);
      
      expect(capturedEvent?.type).toBe('dragEnded');
      expect(capturedEvent?.success).toBe(true);
    });

    it('should subscribe to row drop', () => {
      let dropped = false;
      service.onRowDrop(() => { dropped = true; });
      
      service.enableRowDrag();
      service.startRowDrag([{ id: 'row1', rowIndex: 0 }], { clientX: 0, clientY: 0 } as MouseEvent);
      service.endRowDrag(2, { clientX: 50, clientY: 50 } as MouseEvent);
      
      expect(dropped).toBe(true);
    });
  });

  describe('Destroy', () => {
    it('should clean up subscriptions', () => {
      service.enableRowDrag();
      service.destroy();
      // Subjects are completed
      expect(service).toBeDefined();
    });
  });
});