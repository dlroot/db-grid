import { describe, it, expect, beforeEach } from 'vitest';
import { OverlayService, OverlayConfig } from '../overlay.service';

describe('OverlayService', () => {
  let service: OverlayService;

  beforeEach(() => {
    service = new OverlayService();
  });

  // ===== showLoading =====
  describe('showLoading', () => {
    it('should set loading overlay without message', () => {
      service.showLoading();
      const config = service.getOverlay();
      expect(config?.type).toBe('loading');
      expect(config?.message).toBeUndefined();
    });

    it('should set loading overlay with message', () => {
      service.showLoading('Loading data...');
      const config = service.getOverlay();
      expect(config?.type).toBe('loading');
      expect(config?.message).toBe('Loading data...');
    });

    it('should update signal when called multiple times', () => {
      service.showLoading('First');
      expect(service.getOverlay()?.message).toBe('First');
      service.showLoading('Second');
      expect(service.getOverlay()?.message).toBe('Second');
    });
  });

  // ===== showLoadingWithProgress =====
  describe('showLoadingWithProgress', () => {
    it('should set loading overlay with progress', () => {
      service.showLoadingWithProgress('Uploading...', 50);
      const config = service.getOverlay();
      expect(config?.type).toBe('loading');
      expect(config?.message).toBe('Uploading...');
      expect(config?.progress).toBe(50);
    });

    it('should set loading overlay with 0 progress', () => {
      service.showLoadingWithProgress('Start', 0);
      const config = service.getOverlay();
      expect(config?.progress).toBe(0);
    });

    it('should set loading overlay with 100 progress', () => {
      service.showLoadingWithProgress('Done', 100);
      const config = service.getOverlay();
      expect(config?.progress).toBe(100);
    });

    it('should work without message', () => {
      service.showLoadingWithProgress(undefined, 25);
      const config = service.getOverlay();
      expect(config?.type).toBe('loading');
      expect(config?.progress).toBe(25);
    });
  });

  // ===== showNoRows =====
  describe('showNoRows', () => {
    it('should set noRows overlay without message', () => {
      service.showNoRows();
      const config = service.getOverlay();
      expect(config?.type).toBe('noRows');
      expect(config?.message).toBeUndefined();
    });

    it('should set noRows overlay with custom message', () => {
      service.showNoRows('No matching records found');
      const config = service.getOverlay();
      expect(config?.type).toBe('noRows');
      expect(config?.message).toBe('No matching records found');
    });
  });

  // ===== showCustom =====
  describe('showCustom', () => {
    it('should set custom overlay with template', () => {
      service.showCustom('<div>Custom Content</div>');
      const config = service.getOverlay();
      expect(config?.type).toBe('custom');
      expect(config?.template).toBe('<div>Custom Content</div>');
    });

    it('should set custom overlay with CSS class', () => {
      service.showCustom('<div>Styled</div>', 'my-custom-overlay');
      const config = service.getOverlay();
      expect(config?.type).toBe('custom');
      expect(config?.template).toBe('<div>Styled</div>');
      expect(config?.class).toBe('my-custom-overlay');
    });

    it('should work without CSS class', () => {
      service.showCustom('<span>Hello</span>');
      const config = service.getOverlay();
      expect(config?.class).toBeUndefined();
    });
  });

  // ===== hide =====
  describe('hide', () => {
    it('should clear overlay', () => {
      service.showLoading('Test');
      expect(service.getOverlay()).not.toBeNull();

      service.hide();
      expect(service.getOverlay()).toBeNull();
    });

    it('should hide any overlay type', () => {
      service.showNoRows('Empty');
      service.hide();
      expect(service.getOverlay()).toBeNull();

      service.showCustom('<div>Custom</div>');
      service.hide();
      expect(service.getOverlay()).toBeNull();
    });
  });

  // ===== getOverlay =====
  describe('getOverlay', () => {
    it('should return null initially', () => {
      expect(service.getOverlay()).toBeNull();
    });

    it('should return current overlay config', () => {
      const config: OverlayConfig = { type: 'loading', message: 'Wait...' };
      service.overlayConfig.set(config);
      expect(service.getOverlay()?.type).toBe('loading');
    });

    it('should reflect changes from signal', () => {
      service.showLoading('Loading');
      const first = service.getOverlay();
      service.showNoRows('Empty');
      const second = service.getOverlay();
      expect(first?.type).toBe('loading');
      expect(second?.type).toBe('noRows');
    });
  });

  // ===== Signal reactivity =====
  describe('signal reactivity', () => {
    it('should use signal for overlayConfig', () => {
      expect(service.overlayConfig).toBeDefined();
      expect(typeof service.overlayConfig.set).toBe('function');
    });

    it('should be reactive with multiple overlay changes', () => {
      service.showLoading('Step 1');
      expect(service.overlayConfig().type).toBe('loading');

      service.showLoadingWithProgress('Step 2', 50);
      expect(service.overlayConfig().progress).toBe(50);

      service.showNoRows('Step 3');
      expect(service.overlayConfig().type).toBe('noRows');

      service.hide();
      expect(service.overlayConfig()).toBeNull();
    });
  });

  // ===== Edge cases =====
  describe('edge cases', () => {
    it('should handle empty string message', () => {
      service.showLoading('');
      expect(service.getOverlay()?.message).toBe('');
    });

    it('should handle very long message', () => {
      const longMsg = 'A'.repeat(10000);
      service.showLoading(longMsg);
      expect(service.getOverlay()?.message).toBe(longMsg);
    });

    it('should handle undefined template in custom overlay', () => {
      service.showCustom(undefined as any, 'class');
      // Should still work without crashing
      expect(service.getOverlay()?.type).toBe('custom');
    });

    it('should handle multiple rapid show/hide calls', () => {
      for (let i = 0; i < 100; i++) {
        service.showLoading(`Msg ${i}`);
        service.hide();
      }
      expect(service.getOverlay()).toBeNull();
    });
  });
});