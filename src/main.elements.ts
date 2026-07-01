/**
 * Angular Elements 入口文件
 * 将 DbGridComponent 注册为 Custom Element (<db-grid-element>)
 * 
 * 构建命令:
 * ng build --configuration elements
 * 
 * 输出: dist/db-grid/db-grid-elements.js
 * 
 * 使用方式:
 * <script src="db-grid-elements.js"></script>
 * <db-grid-element id="myGrid"></db-grid-element>
 * <script>
 *   const grid = document.getElementById('myGrid');
 *   grid.rowData = [...];
 *   grid.columnDefs = [...];
 *   grid.addEventListener('gridReady', (e) => {...});
 * </script>
 */

import { enableProdMode, ApplicationRef } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { environment } from './environments/environment';
import { createCustomElement } from '@angular/elements';
import { DbGridElementComponent } from './app/db-grid-element.component';
import { importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { bootstrapApplication } from '@angular/platform-browser';

// 启用生产模式（如果配置了的话）
if (environment.production) {
  enableProdMode();
}

/**
 * 引导 Angular Elements（独立组件模式 - Angular 21+）
 */
async function bootstrapElements(): Promise<void> {
  try {
    // 创建自定义元素
    const DbGridElement = createCustomElement(DbGridElementComponent, {
      injector: undefined // 将在引导时设置
    });

    // 注册自定义元素
    customElements.define('db-grid-element', DbGridElement);
    
    console.log('✅ DbGrid Angular Element registered: <db-grid-element>');
    console.log('📦 Version: 1.0.0');
    console.log('📖 Documentation: https://github.com/your-repo/db-grid');
    
  } catch (error) {
    console.error('❌ Failed to register DbGrid Angular Element:', error);
  }
}

/**
 * 备用方案：使用 NgModule（兼容性更好）
 */
async function bootstrapWithModule(): Promise<void> {
  // 动态引导（不引导整个应用，只注册自定义元素）
  const { platformBrowserDynamic } = await import('@angular/platform-browser-dynamic');
  const { NgModule, ApplicationRef } = await import('@angular/core');
  const { BrowserModule } = await import('@angular/platform-browser');
  const { createCustomElement } = await import('@angular/elements');
  const { DbGridElementComponent } = await import('./app/db-grid-element.component');

  // 定义模块
  @NgModule({
    imports: [
      BrowserModule,
      DbGridElementComponent // 独立组件
    ]
  })
  class AppModule {
    constructor(private appRef: ApplicationRef) {}

    ngDoBootstrap(): void {
      // 不引导任何组件，只注册自定义元素
      const injector = this.appRef.injector;
      
      const DbGridElement = createCustomElement(DbGridElementComponent, { injector });
      customElements.define('db-grid-element', DbGridElement);
      
      console.log('✅ DbGrid Angular Element registered (via NgModule): <db-grid-element>');
    }
  }

  // 引导模块
  platformBrowserDynamic()
    .bootstrapModule(AppModule)
    .catch((err) => console.error('❌ Bootstrap failed:', err));
}

// ========== 选择引导策略 ==========
const useStandalone = false; // 设置为 true 使用独立组件模式（Angular 21+），false 使用 NgModule（兼容性更好）

if (useStandalone) {
  // 独立组件模式（Angular 21+ 推荐）
  bootstrapElements();
} else {
  // NgModule 模式（兼容性更好）
  bootstrapWithModule();
}

// ========== 导出类型定义（供 TypeScript 用户使用）==========
export interface DbGridElement extends HTMLElement {
  // 属性
  rowData: any[];
  columnDefs: any[];
  gridOptions: any;

  // 方法
  getGridApi(): any;
  getGridApiAsync(): Promise<any>;
  setRowData(data: any[]): void;
  setColumnDefs(cols: any[]): void;
  exportToExcel(fileName?: string): void;
  refreshData(): void;
  resetState(): void;
  undo(): void;
  redo(): void;

  // 事件
  addEventListener(type: 'gridReady', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'cellClick', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'cellDoubleClick', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'selectionChanged', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'sortChanged', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'filterChanged', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'rowClicked', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'rowDoubleClicked', listener: (event: CustomEvent) => void): void;
}

// 为了方便，在 window 上暴露一个辅助对象
(window as any).DbGridElements = {
  version: '1.0.0',
  register: () => {
    console.warn('DbGrid Elements already registered automatically.');
  },
  getElement: (id: string): DbGridElement | null => {
    const el = document.getElementById(id);
    return el && el.tagName.toLowerCase() === 'db-grid-element' ? el as any : null;
  }
};
