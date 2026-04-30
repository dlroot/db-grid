import { describe, it, expect, beforeEach } from 'vitest';
import { I18nService } from '../i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    service = new I18nService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have default locale en', () => {
    expect(service.getLocale()).toBe('en');
  });

  it('should set and get locale', () => {
    service.setLocale('zh');
    expect(service.getLocale()).toBe('zh');
  });

  it('should translate simple keys', () => {
    const translations = {
      en: { hello: 'Hello', goodbye: 'Goodbye' },
      zh: { hello: '你好', goodbye: '再见' },
    };
    (service as any).translations = translations;
    
    service.setLocale('en');
    expect(service.translate('hello')).toBe('Hello');
    service.setLocale('zh');
    expect(service.translate('hello')).toBe('你好');
  });

  it('should return key for missing translation', () => {
    expect(service.translate('nonexistent')).toBe('nonexistent');
  });

  it('should format number with locale', () => {
    service.setLocale('en');
    // Just test it doesn't throw
    expect(() => service.formatNumber(1234.56, '0,0.00')).not.toThrow();
  });

  it('should format date with locale', () => {
    service.setLocale('zh');
    // Just test it doesn't throw
    expect(() => service.formatDate(new Date('2024-01-15'), 'yyyy-MM-dd')).not.toThrow();
  });

  it('should get locale display name', () => {
    const name = service.getLocaleDisplayName('en');
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });
});
