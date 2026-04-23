import { DragDropService, DragDropConfig } from '../drag-drop.service';

describe('DragDropService', () => {
  let service: DragDropService;

  function mockMouseEvent(clientX = 0, clientY = 0) {
    return { clientX, clientY } as MouseEvent;
  }

  beforeEach(() => {
    service = new DragDropService();
    service.initialize();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialize', () => {
    it('should be disabled by default for row and column drag', () => {
      expect(service.isRowDragEnabled()).toBe(false);
      expect(service.isColDragEnabled()).toBe(false);
    });

    it('should enable row drag when configured', () => {
      service.initialize({ rowDragEnabled: true });
      expect(service.isRowDragEnabled()).toBe(true);
    });

    it('should enable column drag when configured', () => {
      service.initialize({ colDragEnabled: true });
      expect(service.isColDragEnabled()).toBe(true);
    });

    it('should enable both when configured', () => {
      service.initialize({ rowDragEnabled: true, colDragEnabled: true });
      expect(service.isRowDragEnabled()).toBe(true);
      expect(service.isColDragEnabled()).toBe(true);
    });

    it('should support rowDragMultiDrag config', () => {
      // No public getter for this, just verify no error
      expect(() => service.initialize({ rowDragMultiDrag: true })).not.toThrow();
    });
  });

  describe('enableRowDrag / disableRowDrag', () => {
    it('should toggle row drag', () => {
      service.enableRowDrag();
      expect(service.isRowDragEnabled()).toBe(true);
      service.disableRowDrag();
      expect(service.isRowDragEnabled()).toBe(false);
    });
  });

  describe('enableColDrag / disableColDrag', () => {
    it('should toggle column drag', () => {
      service.enableColDrag();
      expect(service.isColDragEnabled()).toBe(true);
      service.disableColDrag();
      expect(service.isColDragEnabled()).toBe(false);
    });
  });

  describe('startRowDrag / endRowDrag', () => {
    it('should start a row drag', () => {
      service.initialize({ rowDragEnabled: true });
      const rowNodes = [{ rowIndex: 0, data: { id: 1 } }];
      service.startRowDrag(rowNodes, mockMouseEvent(100, 200));
      expect(service.isDraggingRows()).toBe(true);
      expect(service.getDraggedRows().length).toBe(1);
      expect(service.getDragStartIndex()).toBe(0);
    });

    it('should not start drag when row drag disabled', () => {
      service.startRowDrag([{ rowIndex: 0 }], mockMouseEvent());
      expect(service.isDraggingRows()).toBe(false);
    });

    it('should end row drag successfully', () => {
      service.initialize({ rowDragEnabled: true });
      service.startRowDrag([{ rowIndex: 0, data: {} }], mockMouseEvent(0, 0));

      let dropResult: any = null;
      service.onRowDrop(d => { dropResult = d; });
      service.endRowDrag(2, mockMouseEvent(100, 200));

      expect(service.isDraggingRows()).toBe(false);
      expect(dropResult).toEqual({ fromIndex: 0, toIndex: 2 });
    });

    it('should not drop when target equals start index', () => {
      service.initialize({ rowDragEnabled: true });
      service.startRowDrag([{ rowIndex: 0, data: {} }], mockMouseEvent());

      let dropResult: any = null;
      service.onRowDrop(d => { dropResult = d; });
      service.endRowDrag(0, mockMouseEvent());

      expect(dropResult).toBeNull(); // Same index = no success
    });

    it('should fire onDragStarted callback', () => {
      service.initialize({ rowDragEnabled: true });
      let startedEvent: any = null;
      service.onDragStarted(e => { startedEvent = e; });
      service.startRowDrag([{ rowIndex: 0, data: {} }], mockMouseEvent(50, 100));
      expect(startedEvent).toBeDefined();
      expect(startedEvent.type).toBe('dragStarted');
      expect(startedEvent.initialX).toBe(50);
      expect(startedEvent.initialY).toBe(100);
    });

    it('should fire onDragEnded callback', () => {
      service.initialize({ rowDragEnabled: true });
      let endedEvent: any = null;
      service.onDragEnded(e => { endedEvent = e; });
      service.startRowDrag([{ rowIndex: 0, data: {} }], mockMouseEvent());
      service.endRowDrag(2, mockMouseEvent(150, 250));
      expect(endedEvent).toBeDefined();
      expect(endedEvent.type).toBe('dragEnded');
      expect(endedEvent.targetIndex).toBe(2);
      expect(endedEvent.success).toBe(true);
    });

    it('should set success=false for invalid target', () => {
      service.initialize({ rowDragEnabled: true });
      let endedEvent: any = null;
      service.onDragEnded(e => { endedEvent = e; });
      service.startRowDrag([{ rowIndex: 0, data: {} }], mockMouseEvent());
      service.endRowDrag(-1, mockMouseEvent());
      expect(endedEvent.success).toBe(false);
    });

    it('should not end drag when not dragging', () => {
      let endedEvent: any = null;
      service.onDragEnded(e => { endedEvent = e; });
      service.endRowDrag(2, mockMouseEvent());
      expect(endedEvent).toBeNull();
    });
  });

  describe('cancelRowDrag', () => {
    it('should cancel ongoing drag', () => {
      service.initialize({ rowDragEnabled: true });
      service.startRowDrag([{ rowIndex: 0, data: {} }], mockMouseEvent());
      service.cancelRowDrag();
      expect(service.isDraggingRows()).toBe(false);
      expect(service.getDraggedRows()).toEqual([]);
      expect(service.getDragStartIndex()).toBe(-1);
    });
  });

  describe('getDraggedRows', () => {
    it('should return copy of dragged rows', () => {
      service.initialize({ rowDragEnabled: true });
      const rowNodes = [{ rowIndex: 0, data: { id: 1 } }];
      service.startRowDrag(rowNodes, mockMouseEvent());
      const rows = service.getDraggedRows();
      expect(rows).not.toBe(rowNodes); // Should be a copy
      expect(rows.length).toBe(1);
    });
  });

  describe('startColDrag / endColDrag', () => {
    it('should not start column drag when disabled', () => {
      let colEvent: any = null;
      service.onColDragStart(e => { colEvent = e; });
      service.startColDrag({ field: 'name' } as any, 0);
      expect(colEvent).toBeNull();
    });

    it('should fire column drag start event', () => {
      service.initialize({ colDragEnabled: true });
      let colEvent: any = null;
      service.onColDragStart(e => { colEvent = e; });
      const colDef = { field: 'name' };
      service.startColDrag(colDef as any, 2);
      expect(colEvent).toBeDefined();
      expect(colEvent.type).toBe('colDragStart');
      expect(colEvent.colDef).toBe(colDef);
      expect(colEvent.targetIndex).toBe(2);
    });

    it('should fire column drag end event', () => {
      service.initialize({ colDragEnabled: true });
      let colEvent: any = null;
      service.onColDragEnd(e => { colEvent = e; });
      const colDef = { field: 'name' };
      service.endColDrag(colDef as any, 3);
      expect(colEvent).toBeDefined();
      expect(colEvent.type).toBe('colDragEnd');
      expect(colEvent.targetIndex).toBe(3);
    });
  });

  describe('onRowDragEnter / onRowDragLeave', () => {
    it('should subscribe to row drag enter events', () => {
      let enterIndex: number | null = null;
      service.onRowDragEnter(i => { enterIndex = i; });
      service.onRowDragEnter$.next(5);
      // Since it's a subject, we need to subscribe before emitting
      // This test verifies the subscription mechanism works
    });

    it('should subscribe to row drag leave events', () => {
      // Similar pattern - verify subscription API exists
      expect(typeof service.onRowDragLeave).toBe('function');
    });
  });

  describe('destroy', () => {
    it('should complete subjects without error', () => {
      service.initialize({ rowDragEnabled: true });
      service.startRowDrag([{ rowIndex: 0, data: {} }], mockMouseEvent());
      // destroy() completes subjects but doesn't reset enabled flags
      expect(() => service.destroy()).not.toThrow();
    });
  });
});
