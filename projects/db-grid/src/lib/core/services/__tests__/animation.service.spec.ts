import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnimationService, AnimationConfig, RowAnimationInfo } from '../animation.service';

describe('AnimationService', () => {
  let service: AnimationService;

  beforeEach(() => {
    service = new AnimationService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialize', () => {
    it('should initialize with default values', () => {
      service.initialize();
      expect(service.isEnabled()).toBe(true);
      expect(service.isAnimateRows()).toBe(true);
      expect(service.getDuration()).toBe(300);
      expect(service.getEasing()).toBe('ease-out');
    });

    it('should initialize with custom config', () => {
      service.initialize({
        enabled: false,
        animateRows: false,
        duration: 500,
        easing: 'ease-in-out',
      });
      expect(service.isEnabled()).toBe(false);
      expect(service.isAnimateRows()).toBe(false);
      expect(service.getDuration()).toBe(500);
      expect(service.getEasing()).toBe('ease-in-out');
    });
  });

  describe('enable/disable', () => {
    it('should enable animation', () => {
      service.disable();
      expect(service.isEnabled()).toBe(false);
      
      service.enable();
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable animation', () => {
      service.enable();
      service.disable();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('captureRowPositions', () => {
    it('should capture row positions', () => {
      const rows = [
        { id: 'row-1', top: 0 },
        { id: 'row-2', top: 50 },
        { id: 'row-3', top: 100 },
      ];
      service.captureRowPositions(rows);
      
      // Verify by computing animation
      const newRows = [
        { id: 'row-1', top: 0 },
        { id: 'row-2', top: 100 }, // moved down
        { id: 'row-3', top: 50 },  // moved up
      ];
      const animations = service.computeRowAnimation(newRows);
      
      expect(animations.length).toBe(2);
      expect(animations.find(a => a.rowId === 'row-2')?.deltaY).toBe(50);
      expect(animations.find(a => a.rowId === 'row-3')?.deltaY).toBe(-50);
    });
  });

  describe('computeRowAnimation', () => {
    beforeEach(() => {
      service.initialize({ enabled: true, animateRows: true });
    });

    it('should return empty array when disabled', () => {
      service.disable();
      service.captureRowPositions([{ id: 'row-1', top: 0 }]);
      
      const animations = service.computeRowAnimation([{ id: 'row-1', top: 100 }]);
      
      expect(animations).toEqual([]);
    });

    it('should return empty array when animateRows is false', () => {
      service.initialize({ enabled: true, animateRows: false });
      service.captureRowPositions([{ id: 'row-1', top: 0 }]);
      
      const animations = service.computeRowAnimation([{ id: 'row-1', top: 100 }]);
      
      expect(animations).toEqual([]);
    });

    it('should return animations for moved rows', () => {
      service.captureRowPositions([
        { id: 'row-1', top: 0 },
        { id: 'row-2', top: 50 },
      ]);
      
      const animations = service.computeRowAnimation([
        { id: 'row-1', top: 100 }, // moved down 100px
        { id: 'row-2', top: 0 },  // moved up 50px
      ]);
      
      expect(animations.length).toBe(2);
      
      const row1Anim = animations.find(a => a.rowId === 'row-1');
      expect(row1Anim?.fromTop).toBe(0);
      expect(row1Anim?.toTop).toBe(100);
      expect(row1Anim?.deltaY).toBe(100);
      
      const row2Anim = animations.find(a => a.rowId === 'row-2');
      expect(row2Anim?.fromTop).toBe(50);
      expect(row2Anim?.toTop).toBe(0);
      expect(row2Anim?.deltaY).toBe(-50);
    });

    it('should not return animations for new rows', () => {
      service.captureRowPositions([{ id: 'row-1', top: 0 }]);
      
      const animations = service.computeRowAnimation([
        { id: 'row-1', top: 0 },
        { id: 'row-2', top: 50 }, // new row, no previous position
      ]);
      
      expect(animations.length).toBe(0);
    });

    it('should not return animations for unmoved rows', () => {
      service.captureRowPositions([{ id: 'row-1', top: 50 }]);
      
      const animations = service.computeRowAnimation([{ id: 'row-1', top: 50 }]);
      
      expect(animations.length).toBe(0);
    });
  });

  describe('generateTransitionStyle', () => {
    it('should return none when disabled', () => {
      service.disable();
      expect(service.generateTransitionStyle()).toBe('none');
    });

    it('should return transition style when enabled', () => {
      service.initialize({ duration: 300, easing: 'ease-out' });
      expect(service.generateTransitionStyle()).toBe('transform 300ms ease-out');
    });

    it('should use custom property', () => {
      service.initialize({ duration: 500, easing: 'linear' });
      expect(service.generateTransitionStyle('opacity')).toBe('opacity 500ms linear');
    });
  });

  describe('generateRowTransform', () => {
    const animation: RowAnimationInfo = {
      rowId: 'row-1',
      fromTop: 0,
      toTop: 100,
      deltaY: 100,
    };

    it('should return transform at progress 1', () => {
      const transform = service.generateRowTransform(animation, 1);
      expect(transform).toBe('translateY(0px)');
    });

    it('should return transform at progress 0', () => {
      const transform = service.generateRowTransform(animation, 0);
      expect(transform).toBe('translateY(-100px)');
    });

    it('should return transform at progress 0.5', () => {
      const transform = service.generateRowTransform(animation, 0.5);
      expect(transform).toBe('translateY(-50px)');
    });
  });

  describe('startRowAnimation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return animations and trigger callbacks', () => {
      service.initialize({ enabled: true, animateRows: true, duration: 300 });
      service.captureRowPositions([{ id: 'row-1', top: 0 }]);

      const startSpy = vi.fn();
      const endSpy = vi.fn();
      service.onAnimationStarted(startSpy);
      service.onAnimationEnded(endSpy);

      const animations = service.startRowAnimation([{ id: 'row-1', top: 100 }]);
      
      expect(animations.length).toBe(1);
      expect(startSpy).toHaveBeenCalled();
      expect(endSpy).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(300);
      expect(endSpy).toHaveBeenCalled();
    });

    it('should not trigger callbacks when no animations', () => {
      service.initialize({ enabled: true, animateRows: true });
      service.captureRowPositions([{ id: 'row-1', top: 0 }]);

      const startSpy = vi.fn();
      const endSpy = vi.fn();
      service.onAnimationStarted(startSpy);
      service.onAnimationEnded(endSpy);

      service.startRowAnimation([{ id: 'row-1', top: 0 }]);
      
      expect(startSpy).not.toHaveBeenCalled();
      expect(endSpy).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clear internal state', () => {
      service.captureRowPositions([{ id: 'row-1', top: 0 }]);
      service.destroy();
      
      // After destroy, animation should be empty (positions cleared)
      const animations = service.computeRowAnimation([{ id: 'row-1', top: 100 }]);
      expect(animations.length).toBe(0);
    });
  });
});
