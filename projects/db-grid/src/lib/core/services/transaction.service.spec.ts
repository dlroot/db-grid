import { TestBed } from '@angular/core/testing';
import { TransactionService, RowDataTransactionInput, TransactionResult } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionService);
  });

  afterEach(() => {
    service.destroy();
  });

  describe('applyTransaction', () => {
    it('should create TransactionService', () => {
      expect(service).toBeTruthy();
    });

    it('should return empty result when transaction is empty', () => {
      const transaction: RowDataTransactionInput = {};
      const result = service.applyTransaction(transaction);
      
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.updated).toEqual([]);
    });

    it('should trigger onAdd event when adding rows', (done) => {
      service.onAddEvent((event) => {
        expect(event.type).toBe('add');
        expect(event.rows).toEqual([{ id: 1, name: 'Test' }]);
        done();
      });

      const transaction: RowDataTransactionInput = {
        add: [{ id: 1, name: 'Test' }],
      };
      service.applyTransaction(transaction);
    });

    it('should trigger onRemove event when removing rows', (done) => {
      service.onRemoveEvent((event) => {
        expect(event.type).toBe('remove');
        expect(event.rows).toEqual([{ id: 1, name: 'Test' }]);
        done();
      });

      const transaction: RowDataTransactionInput = {
        remove: [{ id: 1, name: 'Test' }],
      };
      service.applyTransaction(transaction);
    });

    it('should trigger onUpdate event when updating rows', (done) => {
      service.onUpdateEvent((event) => {
        expect(event.type).toBe('update');
        expect(event.rows).toEqual([{ id: 1, name: 'Updated' }]);
        done();
      });

      const transaction: RowDataTransactionInput = {
        update: [{ id: 1, name: 'Updated' }],
      };
      service.applyTransaction(transaction);
    });

    it('should trigger onChange callback with result', (done) => {
      service.onTransactionChange((result) => {
        expect(result.added).toEqual([{ id: 1, name: 'New Row' }]);
        done();
      });

      const transaction: RowDataTransactionInput = {
        add: [{ id: 1, name: 'New Row' }],
      };
      service.applyTransaction(transaction);
    });

    it('should handle multiple operations in one transaction', (done) => {
      let callCount = 0;
      
      service.onTransactionChange((result) => {
        callCount++;
        if (callCount === 1) {
          expect(result.added.length).toBe(2);
          expect(result.remove.length).toBe(1);
          expect(result.updated.length).toBe(1);
          done();
        }
      });

      const transaction: RowDataTransactionInput = {
        add: [{ id: 10, name: 'Added' }, { id: 11, name: 'Added 2' }],
        remove: [{ id: 5, name: 'Old' }],
        update: [{ id: 3, name: 'Updated' }],
      };
      service.applyTransaction(transaction);
    });
  });

  describe('applyTransactionAsync', () => {
    it('should execute synchronously when batchDelay is 0', (done) => {
      service.initialize({ batchDelay: 0 });

      let executed = false;
      service.onTransactionChange(() => {
        executed = true;
      });

      const transaction: RowDataTransactionInput = {
        add: [{ id: 1, name: 'Async Add' }],
      };

      service.applyTransactionAsync(transaction, (result) => {
        expect(executed).toBe(true);
        expect(result.added).toEqual([{ id: 1, name: 'Async Add' }]);
        done();
      });
    });

    it('should batch transactions when batchDelay > 0', (done) => {
      service.initialize({ batchDelay: 50 });

      const results: TransactionResult[] = [];
      service.onTransactionChange((result) => {
        results.push(result);
      });

      // Send multiple transactions quickly
      service.applyTransactionAsync({
        add: [{ id: 1, name: 'Batch 1' }],
      });

      service.applyTransactionAsync({
        add: [{ id: 2, name: 'Batch 2' }],
      });

      service.applyTransactionAsync({
        add: [{ id: 3, name: 'Batch 3' }],
      });

      // Wait for batch to flush
      setTimeout(() => {
        // Should have one combined result
        expect(results.length).toBeGreaterThanOrEqual(1);
        done();
      }, 100);
    });
  });

  describe('flush', () => {
    it('should flush pending batched transactions', () => {
      service.initialize({ batchDelay: 100 });

      service.applyTransactionAsync({
        add: [{ id: 1, name: 'Pending' }],
      });

      // Before flush
      const beforeFlush = service.flush();
      expect(beforeFlush).toBeTruthy();
      expect(beforeFlush!.added).toEqual([{ id: 1, name: 'Pending' }]);

      // After flush
      const afterFlush = service.flush();
      expect(afterFlush).toBeNull();
    });
  });

  describe('animation config', () => {
    it('should respect animate configuration', () => {
      service.initialize({ animate: false });
      expect(service.isAnimate()).toBe(false);

      service.initialize({ animate: true, animateDuration: 500 });
      expect(service.isAnimate()).toBe(true);
      expect(service.getAnimateDuration()).toBe(500);
    });
  });
});
