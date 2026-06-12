import { TestBed } from '@angular/core/testing';
import { AngularComponentRendererService, AngularCompUtils } from './angular-component-renderer.service';

describe('AngularComponentRendererService', () => {
  let service: AngularComponentRendererService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AngularComponentRendererService);
  });

  afterEach(() => {
    service.destroyAll();
  });

  describe('isAngularComponent', () => {
    it('should return false for null/undefined', () => {
      expect(service.isAngularComponent(null)).toBe(false);
      expect(service.isAngularComponent(undefined)).toBe(false);
    });

    it('should return true for object with agInit', () => {
      const component = {
        agInit: () => {},
      };
      expect(service.isAngularComponent(component)).toBe(true);
    });

    it('should return true for function with prototype methods', () => {
      class TestComponent {
        agInit() {}
        refresh() {}
      }
      expect(service.isAngularComponent(TestComponent)).toBe(true);
    });

    it('should return false for plain function', () => {
      const fn = () => {};
      expect(service.isAngularComponent(fn)).toBe(false);
    });
  });

  describe('createRenderer', () => {
    it('should create renderer for component', () => {
      class TestComponent {
        value: string = 'test';
        agInit(params: any) {
          this.value = params.value;
        }
      }

      const host = document.createElement('div');
      const instance = service.createRenderer(host, TestComponent, { value: 'hello' });

      expect(instance).toBeTruthy();
      expect(instance.value).toBe('hello');
    });
  });

  describe('destroyRenderer', () => {
    it('should not throw when destroying non-existent renderer', () => {
      class EmptyComponent {}
      expect(() => {
        service.destroyRenderer(EmptyComponent);
      }).not.toThrow();
    });
  });

  describe('AngularCompUtils', () => {
    describe('mergeParams', () => {
      it('should merge default and custom params', () => {
        const result = AngularCompUtils.mergeParams(
          { a: 1, b: 2 },
          { b: 3, c: 4 }
        );
        expect(result).toEqual({ a: 1, b: 3, c: 4 });
      });
    });

    describe('extractMethods', () => {
      it('should extract specified methods', () => {
        const instance = {
          method1: () => 'a',
          method2: () => 'b',
          prop: 'value',
        };

        const methods = AngularCompUtils.extractMethods(instance, ['method1', 'method2']);

        expect(methods.method1).toBeDefined();
        expect(methods.method2).toBeDefined();
        expect((methods as any).prop).toBeUndefined();
      });
    });

    describe('getValue', () => {
      it('should get value from getValue method', () => {
        const instance = {
          getValue: () => 'test-value',
        };
        expect(AngularCompUtils.getValue(instance)).toBe('test-value');
      });

      it('should get value from instance.value', () => {
        const instance = { value: 'direct-value' };
        expect(AngularCompUtils.getValue(instance)).toBe('direct-value');
      });
    });

    describe('callRefresh', () => {
      it('should call refresh method', () => {
        let refreshed = false;
        const instance = {
          refresh: () => {
            refreshed = true;
            return true;
          },
        };

        AngularCompUtils.callRefresh(instance, {});
        expect(refreshed).toBe(true);
      });

      it('should return false when no refresh method', () => {
        const instance = {};
        expect(AngularCompUtils.callRefresh(instance, {})).toBe(false);
      });
    });

    describe('destroy', () => {
      it('should call destroy method', () => {
        let destroyed = false;
        const instance = {
          destroy: () => {
            destroyed = true;
          },
        };

        AngularCompUtils.destroy(instance);
        expect(destroyed).toBe(true);
      });

      it('should not throw when no destroy method', () => {
        const instance = {};
        expect(() => AngularCompUtils.destroy(instance)).not.toThrow();
      });
    });
  });
});
