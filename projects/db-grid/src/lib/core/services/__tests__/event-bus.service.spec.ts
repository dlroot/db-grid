import { TestBed } from '@angular/core/testing';
import { EventBusService, GridEvent, GridEventTypes } from './event-bus.service';

describe('EventBusService', () => {
  let service: EventBusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EventBusService);
  });

  afterEach(() => {
    service.destroy();
  });

  describe('addEventListener / removeEventListener', () => {
    it('should add and trigger event listener', (done) => {
      const handler = (event: GridEvent) => {
        expect(event.type).toBe('testEvent');
        done();
      };
      
      service.addEventListener('testEvent', handler);
      service.emit('testEvent');
    });

    it('should remove event listener', () => {
      let count = 0;
      const handler = () => count++;
      
      service.addEventListener('testEvent', handler);
      service.emit('testEvent');
      expect(count).toBe(1);
      
      service.removeEventListener('testEvent', handler);
      service.emit('testEvent');
      expect(count).toBe(1);
    });

    it('should return unsubscribe function', () => {
      let count = 0;
      const handler = () => count++;
      
      const unsubscribe = service.addEventListener('testEvent', handler);
      service.emit('testEvent');
      expect(count).toBe(1);
      
      unsubscribe();
      service.emit('testEvent');
      expect(count).toBe(1);
    });
  });

  describe('once', () => {
    it('should trigger listener only once', () => {
      let count = 0;
      service.once('onceEvent', () => count++);
      
      service.emit('onceEvent');
      expect(count).toBe(1);
      
      service.emit('onceEvent');
      expect(count).toBe(1);
    });
  });

  describe('addGlobalListener', () => {
    it('should trigger for all events', () => {
      let receivedTypes: string[] = [];
      service.addGlobalListener((event) => {
        receivedTypes.push(event.type);
      });
      
      service.emit('event1');
      service.emit('event2');
      service.emit('event3');
      
      expect(receivedTypes).toEqual(['event1', 'event2', 'event3']);
    });
  });

  describe('emit', () => {
    it('should create event with type', () => {
      let receivedEvent: GridEvent | null = null;
      service.addEventListener('typedEvent', (e) => {
        receivedEvent = e;
      });
      
      service.emit('typedEvent', { data: { foo: 'bar' } });
      
      expect(receivedEvent).toBeTruthy();
      expect(receivedEvent!.type).toBe('typedEvent');
      expect(receivedEvent!.data).toEqual({ foo: 'bar' });
      expect(receivedEvent!.bubbles).toBe(true);
      expect(receivedEvent!.stopped).toBe(false);
    });
  });

  describe('stopPropagation', () => {
    it('should stop event propagation', () => {
      service.stopPropagation({ type: 'test' } as GridEvent);
    });
  });

  describe('getEventHistory', () => {
    it('should return event history', () => {
      service.emit('history1');
      service.emit('history2');
      
      const history = service.getEventHistory();
      expect(history.length).toBe(2);
      expect(history[0].type).toBe('history1');
      expect(history[1].type).toBe('history2');
    });

    it('should filter by event type', () => {
      service.emit('filter1');
      service.emit('other');
      service.emit('filter2');
      
      const filtered = service.getEventHistory('filter1');
      expect(filtered.length).toBe(1);
      expect(filtered[0].type).toBe('filter1');
    });
  });

  describe('hasListeners', () => {
    it('should return true when listeners exist', () => {
      service.addEventListener('listening', () => {});
      expect(service.hasListeners('listening')).toBe(true);
    });

    it('should return false when no listeners', () => {
      expect(service.hasListeners('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all listeners', () => {
      service.addEventListener('event1', () => {});
      service.addEventListener('event2', () => {});
      service.addGlobalListener(() => {});
      
      service.clear();
      
      expect(service.hasListeners()).toBe(false);
    });
  });

  describe('GridEventTypes constants', () => {
    it('should have all required event types', () => {
      expect(GridEventTypes.ROW_CLICKED).toBe('rowClicked');
      expect(GridEventTypes.CELL_CLICKED).toBe('cellClicked');
      expect(GridEventTypes.SELECTION_CHANGED).toBe('selectionChanged');
      expect(GridEventTypes.SORT_CHANGED).toBe('sortChanged');
      expect(GridEventTypes.FILTER_CHANGED).toBe('filterChanged');
    });
  });
});
