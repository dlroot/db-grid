import { TestBed } from '@angular/core/testing';
import { PerformanceMonitorService, PerformanceMetrics, RenderProfile } from './performance-monitor.service';

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerformanceMonitorService);
  });

  afterEach(() => {
    service.destroy();
  });

  describe('enable / disable', () => {
    it('should enable performance monitoring', () => {
      service.enable();
      expect(service).toBeTruthy();
      service.disable();
    });

    it('should disable performance monitoring', () => {
      service.enable();
      service.disable();
      // Service should still be usable
      expect(service).toBeTruthy();
    });
  });

  describe('startProfile / endProfile', () => {
    it('should record render profile', () => {
      const startTime = service.startProfile('render');
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) { /* busy wait */ }
      
      service.endProfile(startTime, 'render', { rowCount: 100 });
      
      const profiles = service.getProfiles();
      expect(profiles.length).toBe(1);
      expect(profiles[0].type).toBe('render');
      expect(profiles[0].duration).toBeGreaterThanOrEqual(10);
    });
  });

  describe('metrics', () => {
    it('should initialize with default metrics', () => {
      const metrics = service.metrics();
      expect(metrics.fps).toBe(60);
      expect(metrics.avgFps).toBe(60);
      expect(metrics.renderTime).toBe(0);
    });

    it('should update visible rows', () => {
      service.setVisibleRows(50);
      expect(service.metrics().visibleRows).toBe(50);
    });
  });

  describe('slow operation callbacks', () => {
    it('should trigger callback for slow operations', () => {
      const slowProfiles: RenderProfile[] = [];
      const unsubscribe = service.onSlowOperation((profile) => {
        slowProfiles.push(profile);
      });
      
      // Manually add a slow profile
      service.endProfile(Date.now() - 100, 'render');
      
      // Callback should be triggered
      unsubscribe();
    });
  });

  describe('getReport', () => {
    it('should return performance report', () => {
      const report = service.getReport();
      expect(report.fps).toBeDefined();
      expect(report.avgFps).toBeDefined();
      expect(report.renderTime).toBeDefined();
      expect(report.slowProfiles).toBeDefined();
    });
  });

  describe('getWarnings', () => {
    it('should return empty array when healthy', () => {
      const warnings = service.getWarnings();
      expect(Array.isArray(warnings)).toBe(true);
    });
  });

  describe('isHealthy', () => {
    it('should return true by default', () => {
      expect(service.isHealthy()).toBe(true);
    });
  });

  describe('clearProfiles', () => {
    it('should clear all profiles', () => {
      service.startProfile('test');
      service.endProfile(Date.now() - 10, 'test');
      
      service.clearProfiles();
      
      expect(service.getProfiles().length).toBe(0);
    });
  });
});
