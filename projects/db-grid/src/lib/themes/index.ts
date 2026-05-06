/**
 * 主题系统导出
 */

export * from './alpine.scss';
export * from './balham.scss';
export * from './material.scss';
export * from './dark.scss';

// 主题类型
export type ThemeName = 'alpine' | 'balham' | 'material' | 'dark' | 'custom';

// 主题配置
export interface ThemeConfig {
  name: ThemeName;
  variables?: Record<string, string>;
}

// 获取主题 CSS 类名
export function getThemeClass(theme: ThemeName): string {
  return `db-grid-theme-${theme}`;
}
