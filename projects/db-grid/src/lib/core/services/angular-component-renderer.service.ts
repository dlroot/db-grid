import { Injectable, ComponentRef, Type, Injector, NgModuleRef } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

/**
 * Angular 组件渲染器服务
 * 处理 Angular 原生组件作为 Cell Renderer / Filter / Editor 的动态加载
 * 
 * AG Grid 对应：FrameworkComponentWrapper
 */

export interface ComponentHost {
  /** 挂载点 DOM 元素 */
  element: HTMLElement;
  /** 组件引用 */
  componentRef?: ComponentRef<any>;
  /** 销毁回调 */
  destroyCallback?: () => void;
}

@Injectable({ providedIn: 'root' })
export class AngularComponentRendererService {
  /** 组件缓存（避免重复创建） */
  private componentCache: Map<string, ComponentRef<any>> = new Map();
  
  /** 主机缓存 */
  private hostCache: Map<string, ComponentHost> = new Map();
  
  /** 组件实例回调缓存 */
  private instanceCallbacks: Map<string, (instance: any) => void> = new Map();

  /**
   * 创建 Angular 组件渲染器
   * 
   * @param hostElement 主机 DOM 元素
   * @param component Angular 组件类
   * @param params 传递给组件的参数
   * @param moduleRef 模块引用（可选）
   * @returns 组件实例
   */
  createRenderer(
    hostElement: HTMLElement,
    component: Type<any>,
    params: Record<string, any>,
    moduleRef?: NgModuleRef<any>
  ): any {
    const cacheKey = this.generateCacheKey(component, params);
    
    // 尝试从缓存获取
    const cached = this.componentCache.get(cacheKey);
    if (cached) {
      this.attachToHost(hostElement, cached);
      return cached.instance;
    }

    // 创建组件
    const injector = moduleRef?.injector;
    const componentFactoryResolver = moduleRef?.componentFactoryResolver;
    
    // 使用动态组件创建
    const componentRef = this.createComponent(component, params, injector);
    
    // 缓存组件
    this.componentCache.set(cacheKey, componentRef);
    
    // 挂载到主机
    this.attachToHost(hostElement, componentRef);
    
    // 触发回调
    const callback = this.instanceCallbacks.get(cacheKey);
    if (callback) {
      callback(componentRef.instance);
    }
    
    return componentRef.instance;
  }

  /**
   * 刷新组件
   */
  refreshRenderer(
    hostElement: HTMLElement,
    component: Type<any>,
    params: Record<string, any>
  ): any {
    const cacheKey = this.generateCacheKey(component, params);
    const cached = this.componentCache.get(cacheKey);
    
    if (cached?.instance?.refresh) {
      cached.instance.refresh(params);
      return cached.instance;
    }
    
    // 如果组件没有 refresh 方法，重新创建
    this.destroyRenderer(component, params);
    return this.createRenderer(hostElement, component, params);
  }

  /**
   * 销毁组件
   */
  destroyRenderer(component: Type<any>, params?: Record<string, any>): void {
    const cacheKey = this.generateCacheKey(component, params || {});
    const cached = this.componentCache.get(cacheKey);
    
    if (cached) {
      cached.destroy();
      this.componentCache.delete(cacheKey);
    }
  }

  /**
   * 销毁所有组件
   */
  destroyAll(): void {
    this.componentCache.forEach(ref => ref.destroy());
    this.componentCache.clear();
    this.hostCache.clear();
  }

  /**
   * 注册实例回调
   */
  onInstanceCreated(
    component: Type<any>,
    params: Record<string, any>,
    callback: (instance: any) => void
  ): void {
    const cacheKey = this.generateCacheKey(component, params);
    this.instanceCallbacks.set(cacheKey, callback);
  }

  /**
   * 创建组件
   */
  private createComponent(
    component: Type<any>,
    params: Record<string, any>,
    injector?: Injector
  ): ComponentRef<any> {
    // 注意：这里需要 DOM 环境，在 Angular 应用中使用时会被替换
    // 在 Angular 组件中使用时，应该使用 ViewContainerRef.createComponent
    
    // 创建一个简单的组件工厂模拟
    const factory = {
      create: (inj: Injector) => {
        // 返回模拟的 ComponentRef
        return {
          instance: this.instantiateComponent(component, params),
          location: { nativeElement: document.createElement('div') },
          destroy: () => {},
          onDestroy: (cb: () => void) => {},
        };
      }
    };

    return factory.create(injector || Injector.create({
      providers: []
    })) as ComponentRef<any>;
  }

  /**
   * 实例化组件（模拟）
   */
  private instantiateComponent(component: Type<any>, params: Record<string, any>): any {
    const instance = new component();
    
    // 调用 agInit（如果存在）
    if (typeof instance.agInit === 'function') {
      instance.agInit(params);
    }
    
    return instance;
  }

  /**
   * 挂载到主机
   */
  private attachToHost(hostElement: HTMLElement, componentRef: ComponentRef<any>): void {
    hostElement.appendChild(componentRef.location.nativeElement);
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(component: Type<any>, params: Record<string, any>): string {
    const componentName = component.name || String(component);
    const paramsStr = JSON.stringify(params, Object.keys(params).sort());
    return `${componentName}_${paramsStr}`;
  }

  /**
   * 检查是否是 Angular 组件
   */
  isAngularComponent(component: any): boolean {
    if (!component) return false;
    
    // 检查是否有 agInit 方法（AG Grid Angular 接口）
    if (typeof component === 'object' && typeof component.agInit === 'function') {
      return true;
    }
    
    // 检查是否是 Angular 组件类
    if (typeof component === 'function' && component.prototype?.ngOnInit) {
      return true;
    }
    
    return false;
  }
}

/**
 * Angular 组件工具函数
 */
export const AngularCompUtils = {
  /**
   * 合并参数
   */
  mergeParams: (defaultParams: Record<string, any>, customParams: Record<string, any>): Record<string, any> => {
    return { ...defaultParams, ...customParams };
  },

  /**
   * 提取组件实例方法
   */
  extractMethods: (instance: any, methodNames: string[]): Record<string, Function> => {
    const methods: Record<string, Function> = {};
    for (const name of methodNames) {
      if (typeof instance[name] === 'function') {
        methods[name] = instance[name].bind(instance);
      }
    }
    return methods;
  },

  /**
   * 调用组件 refresh 方法
   */
  callRefresh: (instance: any, params: Record<string, any>): boolean => {
    if (typeof instance.refresh === 'function') {
      return instance.refresh(params);
    }
    return false;
  },

  /**
   * 获取组件值
   */
  getValue: (instance: any): any => {
    if (typeof instance.getValue === 'function') {
      return instance.getValue();
    }
    // 尝试从实例属性获取
    return (instance as any).value;
  },

  /**
   * 调用销毁方法
   */
  destroy: (instance: any): void => {
    if (typeof instance.destroy === 'function') {
      instance.destroy();
    }
  },
};
