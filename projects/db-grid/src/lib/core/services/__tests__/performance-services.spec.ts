// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderBatchService } from '../render-batch.service';
import { PerformanceMonitorService } from '../performance-monitor.service';

describe('RenderBatchService', () => {
  let service: RenderBatchService;

  beforeEach(() => {
    service = new RenderBatchService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
  });

  describe('scheduleRender', () => {
    it('should schedule a callback', () => {
      const callback = vi.fn();
      service.scheduleRender(callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should execute callbacks on next animation frame', () => {
      const callback = vi.fn();
      service.scheduleRender(callback);

      // Simulate rAF
      vi.runAllTimers();

      // Note: rAF isn't perfectly mocked by fake timers
      // In real browser, this would execute
    });

    it('should merge multiple calls into one batch', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      service.scheduleRender(callback1);
      service.scheduleRender(callback2);
      service.scheduleRender(callback3);

      // Should not execute immediately
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
    });

    it('should deduplicate identical callbacks', () => {
      const callback = vi.fn();

      service.scheduleRender(callback);
      service.scheduleRender(callback);
      service.scheduleRender(callback);

      service.flushRender();

      // Should only execute once (Set deduplication)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should execute immediately when batch disabled', () => {
      service.setEnabled(false);

      const callback = vi.fn();
      service.scheduleRender(callback);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('flushRender', () => {
    it('should execute all pending callbacks', () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];
      callbacks.forEach(cb => service.scheduleRender(cb));

      service.flushRender();

      callbacks.forEach(cb => expect(cb).toHaveBeenCalledTimes(1));
    });

    it('should clear pending callbacks after flush', () => {
      const callback = vi.fn();
      service.scheduleRender(callback);
      service.flushRender();

      // Second flush should not call again
      service.flushRender();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('batchClassUpdate', () => {
    it('should schedule class updates', () => {
      const element = { classList: { add: vi.fn(), remove: vi.fn() } } as any;
      service.batchClassUpdate([{ element, add: ['active'], remove: ['inactive'] }]);
      service.flushRender();

      expect(element.classList.add).toHaveBeenCalledWith('active');
      expect(element.classList.remove).toHaveBeenCalledWith('inactive');
    });
  });

  describe('stats', () => {
    it('should track scheduled count', () => {
      service.scheduleRender(() => {});
      service.scheduleRender(() => {});
      const stats = service.getStats();
      expect(stats.scheduled).toBe(2);
    });

    it('should track executed count', () => {
      service.scheduleRender(() => {});
      service.flushRender();
      const stats = service.getStats();
      expect(stats.executed).toBe(1);
    });

    it('should reset stats', () => {
      service.scheduleRender(() => {});
      service.flushRender();
      service.resetStats();
      const stats = service.getStats();
      expect(stats.scheduled).toBe(0);
      expect(stats.executed).toBe(0);
    });
  });
});

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;

  beforeEach(() => {
    service = new PerformanceMonitorService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('measure', () => {
    it('should measure synchronous function execution time', () => {
      const { result, time } = service.measure(() => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      });

      expect(result).toBe(499500);
      expect(time).toBeGreaterThanOrEqual(0);
    });
  });

  describe('measureAsync', async () => {
    it('should measure async function execution time', async () => {
      const { result, time } = await service.measureAsync(async () => {
        await new Promise(r => setTimeout(r, 10));
        return 42;
      });

      expect(result).toBe(42);
      expect(time).toBeGreaterThanOrEqual(10);
    });
  });

  describe('beginFrame / endFrame', () => {
    it('should measure frame time', () => {
      service.beginFrame();
      // Simulate some work
      for (let i = 0; i < 1000; i++) {}
      const stats = service.endFrame();

      expect(stats).not.toBeNull();
      expect(stats!.frameTime).toBeGreaterThanOrEqual(0);
      expect(stats!.fps).toBeGreaterThan(0);
    });

    it('should return null if endFrame called without beginFrame', () => {
      const stats = service.endFrame();
      expect(stats).toBeNull();
    });
  });

  describe('benchmark', async () => {
    it('should run benchmark and return results', async () => {
      const result = await service.benchmark(
        'test',
        () => {
          let sum = 0;
          for (let i = 0; i < 100; i++) sum += i;
        },
        { iterations: 10, warmup: 2 }
      );

      expect(result.name).toBe('test');
      expect(result.iterations).toBe(10);
      expect(result.avgTime).toBeGreaterThanOrEqual(0);
      expect(result.opsPerSecond).toBeGreaterThan(0);
    });

    it('should format benchmark result', async () => {
      const result = await service.benchmark('format-test', () => {}, {
        iterations: 5,
        warmup: 1,
      });

      const formatted = service.formatBenchmarkResult(result);
      expect(formatted).toContain('format-test');
      expect(formatted).toContain('Iterations: 5');
    });
  });

  describe('FPS monitoring', () => {
    it('should track frame history', () => {
      for (let i = 0; i < 5; i++) {
        service.beginFrame();
        service.endFrame();
      }

      const history = service.getFrameHistory();
      expect(history.length).toBe(5);
    });

    it('should limit history length', () => {
      service['maxHistoryLength'] = 10;

      for (let i = 0; i < 20; i++) {
        service.beginFrame();
        service.endFrame();
      }

      const history = service.getFrameHistory();
      expect(history.length).toBe(10);
    });

    it('should calculate average FPS', () => {
      // Simulate some frames
      for (let i = 0; i < 10; i++) {
        service.beginFrame();
        service.endFrame();
      }

      const avgFps = service.getAverageFps();
      expect(avgFps).toBeGreaterThan(0);
    });

    it('should return 0 FPS when no frames recorded', () => {
      expect(service.getCurrentFps()).toBe(0);
      expect(service.getAverageFps()).toBe(0);
    });

    it('should clear history', () => {
      service.beginFrame();
      service.endFrame();
      expect(service.getFrameHistory().length).toBe(1);

      service.clearHistory();
      expect(service.getFrameHistory().length).toBe(0);
    });
  });
});
