/**
 * 筛选器弹出组件
 * 提供 Text / Number / Date / Set / Boolean 五种筛选器的可视化界面
 * 作为 db-grid 的子组件使用
 */

import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
  ChangeDetectionStrategy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService, FilterType, ColumnFilterModel, TextFilterModel, NumberFilterModel, DateFilterModel, SetFilterModel, BooleanFilterModel } from '../../../core/services';
import { ColDef } from '../../../core/models';

@Component({
  selector: 'db-filter-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="db-filter-popup" [class.db-filter-popup--active]="isActive()">
      <!-- 列名标题 -->
      <div class="db-filter-popup__header">
        <span class="db-filter-popup__title">{{ colDef?.headerName || colDef?.field }}</span>
        <button class="db-filter-popup__clear" (click)="clearFilter()">清除</button>
      </div>

      <!-- Text Filter -->
      @if (filterType() === 'text') {
        <div class="db-filter-popup__body">
          <div class="db-filter-popup__row">
            <select class="db-filter-popup__select" [(ngModel)]="textCondition">
              @for (opt of textOptions; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>
          @if (textCondition !== 'blank' && textCondition !== 'notBlank') {
            <div class="db-filter-popup__row">
              <input
                class="db-filter-popup__input"
                type="text"
                [(ngModel)]="textValue"
                [placeholder]="textCondition === 'contains' ? '包含...' :
                               textCondition === 'equals' ? '等于...' :
                               textCondition === 'startsWith' ? '开头是...' :
                               textCondition === 'endsWith' ? '结尾是...' : ''"
                (keyup.enter)="applyFilter()" />
            </div>
          }
          @if (supportsSecondCondition()) {
            <div class="db-filter-popup__separator">AND / OR</div>
            <div class="db-filter-popup__row">
              <select class="db-filter-popup__select" [(ngModel)]="textOperator">
                <option value="AND">并且</option>
                <option value="OR">或者</option>
              </select>
            </div>
            <div class="db-filter-popup__row">
              <select class="db-filter-popup__select" [(ngModel)]="textCondition2">
                @for (opt of textOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            @if (textCondition2 !== 'blank' && textCondition2 !== 'notBlank') {
              <div class="db-filter-popup__row">
                <input class="db-filter-popup__input" type="text" [(ngModel)]="textValue2" placeholder="条件2..." />
              </div>
            }
          }
        </div>
      }

      <!-- Number Filter -->
      @if (filterType() === 'number') {
        <div class="db-filter-popup__body">
          <div class="db-filter-popup__row">
            <select class="db-filter-popup__select" [(ngModel)]="numberCondition">
              @for (opt of numberOptions; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>
          @if (numberCondition !== 'blank' && numberCondition !== 'notBlank') {
            <div class="db-filter-popup__row">
              <input class="db-filter-popup__input db-filter-popup__input--number"
                     type="number" [(ngModel)]="numberValue" placeholder="数值..." />
            </div>
            @if (numberCondition === 'inRange') {
              <div class="db-filter-popup__row">
                <span class="db-filter-popup__label">至</span>
                <input class="db-filter-popup__input db-filter-popup__input--number"
                       type="number" [(ngModel)]="numberValue2" placeholder="结束..." />
              </div>
            }
          }
        </div>
      }

      <!-- Date Filter -->
      @if (filterType() === 'date') {
        <div class="db-filter-popup__body">
          <div class="db-filter-popup__row">
            <select class="db-filter-popup__select" [(ngModel)]="dateCondition">
              @for (opt of dateOptions; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>
          @if (dateCondition !== 'blank' && dateCondition !== 'notBlank') {
            <div class="db-filter-popup__row">
              <span class="db-filter-popup__label">从</span>
              <input class="db-filter-popup__input db-filter-popup__input--date"
                     type="date" [(ngModel)]="dateValue" />
            </div>
            @if (dateCondition === 'inRange') {
              <div class="db-filter-popup__row">
                <span class="db-filter-popup__label">至</span>
                <input class="db-filter-popup__input db-filter-popup__input--date"
                       type="date" [(ngModel)]="dateValue2" />
              </div>
            }
          }
        </div>
      }

      <!-- Set Filter -->
      @if (filterType() === 'set') {
        <div class="db-filter-popup__body db-filter-popup__body--set">
          <div class="db-filter-popup__set-list">
            @for (val of setValues(); track val) {
              <label class="db-filter-popup__set-item">
                <input type="checkbox" [checked]="isSetValueSelected(val)" (change)="toggleSetValue(val)" />
                <span>{{ formatSetValue(val) }}</span>
              </label>
            }
          </div>
          @if (setValues().length === 0) {
            <div class="db-filter-popup__empty">无可用选项</div>
          }
        </div>
      }

      <!-- Boolean Filter -->
      @if (filterType() === 'boolean') {
        <div class="db-filter-popup__body">
          <div class="db-filter-popup__row">
            <select class="db-filter-popup__select" [(ngModel)]="boolValue">
              <option [ngValue]="null">全部</option>
              <option [ngValue]="true">真 (True)</option>
              <option [ngValue]="false">假 (False)</option>
            </select>
          </div>
        </div>
      }

      <!-- 底部按钮 -->
      <div class="db-filter-popup__footer">
        <button class="db-filter-popup__btn db-filter-popup__btn--cancel" (click)="cancel()">取消</button>
        <button class="db-filter-popup__btn db-filter-popup__btn--apply" (click)="applyFilter()">应用</button>
      </div>
    </div>
  `,
  styles: [`
    .db-filter-popup {
      background: #fff;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      min-width: 240px;
      max-width: 320px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
    }
    .db-filter-popup__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid #e8e8e8;
      background: #f8f8f8;
    }
    .db-filter-popup__title {
      font-weight: 600;
      color: #333;
    }
    .db-filter-popup__clear {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      font-size: 12px;
      padding: 2px 6px;
    }
    .db-filter-popup__clear:hover { color: #333; }
    .db-filter-popup__body { padding: 10px 12px; }
    .db-filter-popup__body--set { max-height: 200px; overflow-y: auto; }
    .db-filter-popup__row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .db-filter-popup__row:last-child { margin-bottom: 0; }
    .db-filter-popup__select {
      flex: 1;
      height: 28px;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 0 6px;
      font-size: 13px;
      outline: none;
      background: #fff;
    }
    .db-filter-popup__select:focus { border-color: #0066cc; }
    .db-filter-popup__input {
      flex: 1;
      height: 28px;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 0 6px;
      font-size: 13px;
      outline: none;
    }
    .db-filter-popup__input:focus { border-color: #0066cc; }
    .db-filter-popup__input--number { width: 100%; }
    .db-filter-popup__input--date { width: 100%; }
    .db-filter-popup__label { font-size: 12px; color: #666; min-width: 20px; }
    .db-filter-popup__separator {
      text-align: center;
      font-size: 11px;
      color: #999;
      margin: 4px 0;
      border-top: 1px dashed #e0e0e0;
      padding-top: 4px;
    }
    .db-filter-popup__set-list { display: flex; flex-direction: column; gap: 4px; }
    .db-filter-popup__set-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 2px;
      cursor: pointer;
      border-radius: 3px;
    }
    .db-filter-popup__set-item:hover { background: #f0f0f0; }
    .db-filter-popup__set-item input[type="checkbox"] { cursor: pointer; }
    .db-filter-popup__empty { color: #999; text-align: center; padding: 12px; }
    .db-filter-popup__footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 8px 12px;
      border-top: 1px solid #e8e8e8;
      background: #f8f8f8;
    }
    .db-filter-popup__btn {
      height: 26px;
      padding: 0 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }
    .db-filter-popup__btn--cancel {
      background: #fff;
      color: #666;
    }
    .db-filter-popup__btn--apply {
      background: #0066cc;
      border-color: #0066cc;
      color: #fff;
    }
    .db-filter-popup__btn--apply:hover { background: #0052a3; }
    .db-filter-popup--active .db-filter-popup__btn--apply {
      background: #0066cc;
    }
  `]
})
export class DbFilterPopupComponent implements OnInit, OnDestroy {
  @Input() colDef?: ColDef;
  @Input() rowData: any[] = [];
  @Output() filterApplied = new EventEmitter<ColumnFilterModel | null>();
  @Output() filterClosed = new EventEmitter<void>();

  filterService: FilterService;

  // Text
  textCondition = 'contains';
  textValue = '';
  textCondition2 = 'contains';
  textValue2 = '';
  textOperator: 'AND' | 'OR' = 'AND';
  textOptions = [
    { value: 'contains',     label: '包含' },
    { value: 'notContains', label: '不包含' },
    { value: 'equals',       label: '等于' },
    { value: 'notEqual',     label: '不等于' },
    { value: 'startsWith',   label: '开头是' },
    { value: 'endsWith',     label: '结尾是' },
    { value: 'blank',        label: '为空' },
    { value: 'notBlank',     label: '不为空' },
  ];

  // Number
  numberCondition = 'equals';
  numberValue: number | null = null;
  numberValue2: number | null = null;
  numberOptions = [
    { value: 'equals',             label: '等于' },
    { value: 'notEqual',           label: '不等于' },
    { value: 'greaterThan',        label: '大于' },
    { value: 'greaterThanOrEqual', label: '大于等于' },
    { value: 'lessThan',           label: '小于' },
    { value: 'lessThanOrEqual',    label: '小于等于' },
    { value: 'inRange',            label: '范围' },
    { value: 'blank',              label: '为空' },
    { value: 'notBlank',           label: '不为空' },
  ];

  // Date
  dateCondition = 'equals';
  dateValue = '';
  dateValue2 = '';
  dateOptions = [
    { value: 'equals',    label: '等于' },
    { value: 'notEqual',  label: '不等于' },
    { value: 'greaterThan', label: '晚于' },
    { value: 'lessThan',    label: '早于' },
    { value: 'inRange',    label: '范围' },
    { value: 'blank',     label: '为空' },
    { value: 'notBlank',  label: '不为空' },
  ];

  // Boolean
  boolValue: boolean | null = null;

  // Set
  private selectedSetValues = new Set<any>();

  // State
  filterType = signal<FilterType>('text');
  setValues = signal<any[]>([]);

  constructor() {
    this.filterService = new FilterService();
  }

  ngOnInit(): void {
    this.initFromColDef();
  }

  ngOnDestroy(): void {
    this.filterService.destroy();
  }

  isActive(): boolean {
    return this.filterService.isFilterActive();
  }

  supportsSecondCondition(): boolean {
    return ['contains', 'notContains', 'equals', 'notEqual', 'startsWith', 'endsWith'].includes(this.textCondition);
  }

  isSetValueSelected(val: any): boolean {
    return this.selectedSetValues.has(val);
  }

  toggleSetValue(val: any): void {
    if (this.selectedSetValues.has(val)) {
      this.selectedSetValues.delete(val);
    } else {
      this.selectedSetValues.add(val);
    }
  }

  formatSetValue(val: any): string {
    if (val == null) return '(空)';
    return String(val);
  }

  private initFromColDef(): void {
    if (!this.colDef) return;

    const type = this.filterService.inferFilterType(this.colDef);
    this.filterType.set(type);

    if (type === 'set') {
      const field = this.colDef.field || '';
      this.setValues.set(this.filterService.getSetFilterValues(this.rowData, field));
    }

    // 恢复已有筛选状态
    const existing = this.filterService.getColumnFilter(this.colDef.colId || this.colDef.field || '');
    if (existing) {
      this.restoreFromModel(existing);
    }
  }

  private restoreFromModel(model: ColumnFilterModel): void {
    switch (model.filterType) {
      case 'text':
        this.textCondition = model.type;
        this.textValue = model.filter || '';
        if (model.condition1) {
          this.textOperator = model.operator || 'AND';
          this.textCondition2 = model.condition1.type;
          this.textValue2 = model.condition1.filter || '';
        }
        break;
      case 'number':
        this.numberCondition = model.type;
        this.numberValue = model.filter ?? null;
        this.numberValue2 = model.filterTo ?? null;
        break;
      case 'date':
        this.dateCondition = model.type;
        this.dateValue = model.dateFrom || '';
        this.dateValue2 = model.dateTo || '';
        break;
      case 'boolean':
        this.boolValue = model.value;
        break;
      case 'set':
        this.selectedSetValues = new Set(model.values || []);
        break;
    }
  }

  applyFilter(): void {
    const type = this.filterType();
    let model: ColumnFilterModel | null = null;

    switch (type) {
      case 'text':
        if (!this.textValue && this.textCondition !== 'blank' && this.textCondition !== 'notBlank' &&
            !this.textValue2 && this.textCondition2 !== 'blank' && this.textCondition2 !== 'notBlank') {
          model = null;
        } else if (this.textValue2 || this.textCondition2 !== 'contains') {
          model = {
            filterType: 'text',
            type: this.textCondition,
            filter: this.textValue,
            operator: this.textOperator,
            condition1: { type: this.textCondition, filter: this.textValue },
            condition2: { type: this.textCondition2, filter: this.textValue2 },
          } as TextFilterModel;
        } else {
          model = {
            filterType: 'text',
            type: this.textCondition,
            filter: this.textValue,
          } as TextFilterModel;
        }
        break;

      case 'number':
        if (this.numberValue === null && this.numberCondition !== 'blank' && this.numberCondition !== 'notBlank') {
          model = null;
        } else {
          model = {
            filterType: 'number',
            type: this.numberCondition,
            filter: this.numberValue ?? undefined,
            filterTo: this.numberValue2 ?? undefined,
          } as NumberFilterModel;
        }
        break;

      case 'date':
        if (!this.dateValue && this.dateCondition !== 'blank' && this.dateCondition !== 'notBlank') {
          model = null;
        } else {
          model = {
            filterType: 'date',
            type: this.dateCondition,
            dateFrom: this.dateValue || undefined,
            dateTo: this.dateValue2 || undefined,
          } as DateFilterModel;
        }
        break;

      case 'set':
        const vals = Array.from(this.selectedSetValues);
        model = vals.length === 0 ? null : { filterType: 'set', values: vals } as SetFilterModel;
        break;

      case 'boolean':
        model = { filterType: 'boolean', value: this.boolValue } as BooleanFilterModel;
        break;
    }

    this.filterApplied.emit(model);
  }

  clearFilter(): void {
    this.selectedSetValues.clear();
    this.textValue = '';
    this.textValue2 = '';
    this.numberValue = null;
    this.numberValue2 = null;
    this.dateValue = '';
    this.dateValue2 = '';
    this.boolValue = null;
    this.filterApplied.emit(null);
  }

  cancel(): void {
    this.filterClosed.emit();
  }
}
