/**
 * Cell Edit Service
 * 单元格编辑服务
 */

import { Subject } from 'rxjs';

export interface CellEditParams {
  rowIndex: number;
  colDef: any;
  oldValue: any;
  newValue: any;
}

export interface CellEditorConfig {
  enableCellEdit?: boolean;
  editOnDoubleClick?: boolean;
  editOnClick?: boolean;
  singleClickEdit?: boolean;
}

export class CellEditService {
  private enabled: boolean = false;
  private editOnDoubleClick: boolean = true;
  private editOnClick: boolean = false;
  private singleClickEdit: boolean = false;

  private onCellValueChanged$ = new Subject<CellEditParams>();

  initialize(config?: CellEditorConfig): void {
    if (config) {
      this.enabled = config.enableCellEdit ?? false;
      this.editOnDoubleClick = config.editOnDoubleClick ?? true;
      this.editOnClick = config.editOnClick ?? false;
      this.singleClickEdit = config.singleClickEdit ?? false;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isEditOnDoubleClick(): boolean {
    return this.editOnDoubleClick;
  }

  isEditOnClick(): boolean {
    return this.editOnClick;
  }

  isSingleClickEdit(): boolean {
    return this.singleClickEdit;
  }

  enableEditing(): void {
    this.enabled = true;
  }

  disableEditing(): void {
    this.enabled = false;
  }

  onCellValueChanged(callback: (params: CellEditParams) => void): void {
    this.onCellValueChanged$.subscribe(callback);
  }

  emitCellValueChanged(params: CellEditParams): void {
    this.onCellValueChanged$.next(params);
  }

  getDefaultEditors(): Record<string, any> {
    return {
      text: {
        createEditor: (params: any) => {
          const input = document.createElement('input');
          input.type = 'text';
          input.value = params.value || '';
          input.className = 'db-grid-editor-input';
          input.style.cssText = `
            width: 100%;
            height: 100%;
            border: 2px solid #4a90d9;
            border-radius: 2px;
            padding: 4px 8px;
            font-size: inherit;
            font-family: inherit;
            outline: none;
            box-sizing: border-box;
          `;
          return {
            editorElement: input,
            getValue: () => input.value,
            setValue: (value: any) => { input.value = value ?? ''; },
            focus: () => { input.focus(); input.select(); },
            destroy: () => { input.remove(); },
            isPopup: () => false,
            isCancelBeforeStart: () => false,
            isCancelAfterEnd: () => false,
          };
        },
      },
      number: {
        createEditor: (params: any) => {
          const input = document.createElement('input');
          input.type = 'number';
          input.value = params.value ?? '';
          input.className = 'db-grid-editor-input';
          input.style.cssText = `
            width: 100%;
            height: 100%;
            border: 2px solid #4a90d9;
            border-radius: 2px;
            padding: 4px 8px;
            font-size: inherit;
            font-family: inherit;
            outline: none;
            box-sizing: border-box;
          `;
          return {
            editorElement: input,
            getValue: () => {
              const val = input.value;
              return val === '' ? null : Number(val);
            },
            setValue: (value: any) => { input.value = value ?? ''; },
            focus: () => { input.focus(); input.select(); },
            destroy: () => { input.remove(); },
            isPopup: () => false,
            isCancelBeforeStart: () => false,
            isCancelAfterEnd: () => false,
          };
        },
      },
      select: {
        createEditor: (params: any) => {
          const select = document.createElement('select');
          select.className = 'db-grid-editor-select';
          select.style.cssText = `
            width: 100%;
            height: 100%;
            border: 2px solid #4a90d9;
            border-radius: 2px;
            padding: 4px 8px;
            font-size: inherit;
            font-family: inherit;
            outline: none;
            background: white;
            box-sizing: border-box;
          `;
          const options = params.colDef?.cellEditorParams?.values || [];
          options.forEach((opt: any) => {
            const option = document.createElement('option');
            if (typeof opt === 'object') {
              option.value = opt.value;
              option.textContent = opt.label;
            } else {
              option.value = opt;
              option.textContent = opt;
            }
            if (opt === params.value || (typeof opt === 'object' && opt.value === params.value)) {
              option.selected = true;
            }
            select.appendChild(option);
          });
          return {
            editorElement: select,
            getValue: () => select.value,
            setValue: (value: any) => {
              select.value = value ?? '';
            },
            focus: () => { select.focus(); },
            destroy: () => { select.remove(); },
            isPopup: () => false,
            isCancelBeforeStart: () => false,
            isCancelAfterEnd: () => false,
          };
        },
      },
      boolean: {
        createEditor: (params: any) => {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = !!params.value;
          checkbox.className = 'db-grid-editor-checkbox';
          checkbox.style.cssText = `
            width: 20px;
            height: 20px;
            cursor: pointer;
          `;
          const wrapper = document.createElement('div');
          wrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          `;
          wrapper.appendChild(checkbox);
          return {
            editorElement: wrapper,
            getValue: () => checkbox.checked,
            setValue: (value: any) => { checkbox.checked = !!value; },
            focus: () => { checkbox.focus(); },
            destroy: () => { wrapper.remove(); },
            isPopup: () => false,
            isCancelBeforeStart: () => false,
            isCancelAfterEnd: () => false,
          };
        },
      },
    };
  }

  destroy(): void {
    this.onCellValueChanged$.complete();
  }
}