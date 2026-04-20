/**
 * 主题系统导出
 */

export * from './alpine.scss';
export * from './balham.scss';
export * from './material.scss';

// 主题类型
export type ThemeName = 'alpine' | 'balham' | 'material' | 'custom';

// 主题配置
export interface ThemeConfig {
  name: ThemeName;
  variables?: Record<string, string>;
}

// 获取主题 CSS 类名
export function getThemeClass(theme: ThemeName): string {
  return `db-grid-theme-${theme}`;
}

// 应用自定义主题
export function applyCustomTheme(theme: ThemeConfig): void {
  const root = document.documentElement;

  if (theme.variables) {
    Object.entries(theme.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
}

// 重置主题
export function resetTheme(): void {
  const root = document.documentElement;
  const keys = [
    '--db-grid-primary',
    '--db-grid-secondary',
    '--db-grid-background',
    '--db-grid-surface',
    '--db-grid-error',
    '--db-grid-on-primary',
    '--db-grid-on-surface',
    '--db-grid-border-color',
    '--db-grid-text-color',
  ];

  keys.forEach(key => {
    root.style.removeProperty(key);
  });
}
