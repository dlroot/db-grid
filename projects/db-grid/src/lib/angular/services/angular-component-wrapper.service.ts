import { Injectable, Injector, ComponentRef, Type } from '@angular/core';

/**
 * Angular 组件包装器服务
 * 提供 Angular 环境下的动态组件创建能力
 * 
 * 在 DbGridComponent 中注入，并在创建 CellRenderer 时传递给 CellRendererService
 */

@Injectable({ providedIn: 'root' })
export class AngularComponentWrapper {
  /** 注入器 */
  private injector: Injector;

  /** 组件引用缓存 */
  private componentRefs: Map<string, ComponentRef<any>> = new Map();

  constructor(injector: Injector) {
    this.injector = injector;
  }

  /**
   * 创建 Angular 组件并挂载到 DOM
   */
  createComponent(
    componentClass: Type<any>,
    params: Record<string, any>,
    hostElement: HTMLElement,
    cacheKey: string
  ): ComponentRef<any> {
    // 清理旧的组件
    this.destroyComponent(cacheKey);

    // 使用 Angular 的 createComponent
    // 注意：这需要在 Angular 应用中使用时传入正确的 ViewContainerRef
    // 这里提供一个基础实现
    
    const componentRef: ComponentRef<any> = {
      instance: this.instantiateComponent(componentClass, params),
      location: { nativeElement: hostElement },
      changeDetectorRef: null as any,
      componentType: componentClass,
      injector: this.injector,
      hostView: null as any,
      destroyed: false,
      onDestroy: (callback: () => void) => {
        // 注册销毁回调
      },
      destroy: () => {
        this.destroyComponent(cacheKey);
      },
    } as any;

    // 缓存组件引用
    this.componentRefs.set(cacheKey, componentRef);

    // 挂载到主机
    hostElement.appendChild(componentRef.location.nativeElement);

    return componentRef;
  }

  /**
   * 刷新组件
   */
  refreshComponent(
    cacheKey: string,
    params: Record<string, any>
  ): boolean {
    const ref = this.componentRefs.get(cacheKey);
    if (!ref) return false;

    const instance = ref.instance;
    if (typeof instance.refresh === 'function') {
      return instance.refresh(params);
    }
    
    // 如果没有 refresh 方法，重新初始化
    if (typeof instance.agInit === 'function') {
      instance.agInit(params);
      return true;
    }

    return false;
  }

  /**
   * 销毁组件
   */
  destroyComponent(cacheKey: string): void {
    const ref = this.componentRefs.get(cacheKey);
    if (ref) {
      if (typeof ref.instance?.destroy === 'function') {
        ref.instance.destroy();
      }
      ref.destroy();
      this.componentRefs.delete(cacheKey);
    }
  }

  /**
   * 销毁所有组件
   */
  destroyAll(): void {
    this.componentRefs.forEach((ref, key) => {
      this.destroyComponent(key);
    });
    this.componentRefs.clear();
  }

  /**
   * 获取组件实例
   */
  getComponent(cacheKey: string): any {
    const ref = this.componentRefs.get(cacheKey);
    return ref?.instance;
  }

  /**
   * 实例化组件
   */
  private instantiateComponent(
    componentClass: Type<any>,
    params: Record<string, any>
  ): any {
    // 创建组件实例
    const instance = new componentClass();

    // 调用 agInit
    if (typeof instance.agInit === 'function') {
      instance.agInit(params);
    }

    return instance;
  }
}
