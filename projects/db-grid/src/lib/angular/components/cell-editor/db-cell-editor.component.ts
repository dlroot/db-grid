/**
 * 单元格编辑器组件
 * 提供 7 种内置编辑器：text / number / select / date / checkbox / largeText / richSelect
 * 在单元格内直接渲染，支持键盘导航
 */

import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
  OnChanges, SimpleChanges, ViewChild, ElementRef,
  ChangeDetectionStrategy, forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService, EditorType } from '../../../core/services';

@Component({
  selector: 'db-cell-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Text Editor -->
    @if (editorType === 'agTextCellEditor') {
      <input #editorInput
             class="db-cell-editor__input"
             type="text"
             [value]="displayValue"
             [maxlength]="maxLength"
             [placeholder]="placeholder"
             (input)="onInput($event)"
             (blur)="onBlur()"
             (keydown)="onKeyDown($event)" />
    }

    <!-- Number Editor -->
    @if (editorType === 'agNumberCellEditor') {
      <input #editorInput
             class="db-cell-editor__input db-cell-editor__input--number"
             type="number"
             [value]="displayValue"
             [min]="min"
             [max]="max"
             [step]="step"
             (input)="onInput($event)"
             (blur)="onBlur()"
             (keydown)="onKeyDown($event)" />
    }

    <!-- Select Editor -->
    @if (editorType === 'agSelectCellEditor') {
      <select #editorInput
              class="db-cell-editor__select"
              [value]="displayValue"
              (change)="onSelectChange($event)"
              (blur)="onBlur()"
              (keydown)="onKeyDown($event)">
        @for (val of selectValues; track val) {
          <option [value]="val">{{ formatOption(val) }}</option>
        }
      </select>
    }

    <!-- Date Editor -->
    @if (editorType === 'agDateCellEditor') {
      <input #editorInput
             class="db-cell-editor__input db-cell-editor__input--date"
             type="date"
             [value]="displayValue"
             [min]="minDate"
             [max]="maxDate"
             (change)="onDateChange($event)"
             (blur)="onBlur()"
             (keydown)="onKeyDown($event)" />
    }

    <!-- Checkbox Editor -->
    @if (editorType === 'agCheckboxCellEditor') {
      <label class="db-cell-editor__checkbox-label">
        <input #editorInput
               type="checkbox"
               [checked]="currentValue === true || currentValue === 'true' || currentValue === 1"
               (change)="onCheckboxChange($event)"
               (blur)="onBlur()"
               (keydown)="onKeyDown($event)" />
        <span>{{ getCheckboxLabel() }}</span>
      </label>
    }

    <!-- Large Text Editor -->
    @if (editorType === 'agLargeTextCellEditor') {
      <textarea #editorInput
                class="db-cell-editor__textarea"
                [value]="displayValue"
                [maxlength]="maxLength"
                [rows]="textareaRows"
                [cols]="textareaCols"
                (input)="onTextareaInput($event)"
                (blur)="onBlur()"
                (keydown)="onKeyDown($event)">
      </textarea>
    }

    <!-- Rich Select Editor -->
    @if (editorType === 'agRichSelectCellEditor') {
      <div class="db-cell-editor__rich-select">
        @if (searchable) {
          <input #editorInput
                 class="db-cell-editor__input db-cell-editor__input--search"
                 type="text"
                 [value]="displayValue"
                 [placeholder]="searchPlaceholder"
                 (input)="onSearch($event)"
                 (blur)="onRichSelectBlur()"
                 (keydown)="onKeyDown($event)" />
        } @else {
          <select #editorInput
                  class="db-cell-editor__select"
                  [value]="currentValue"
                  (change)="onRichSelectChange($event)"
                  (blur)="onBlur()"
                  (keydown)="onKeyDown($event)">
            @for (val of filteredValues; track val) {
              <option [value]="val">{{ formatOption(val) }}</option>
            }
          </select>
        }
        @if (showDropdown && filteredValues.length > 0) {
          <div class="db-cell-editor__dropdown">
            @for (val of filteredValues; track val) {
              <div class="db-cell-editor__dropdown-item"
                   [class.db-cell-editor__dropdown-item--selected]="val === currentValue"
                   (mousedown)="onDropdownSelect(val)">
                <span [innerHTML]="highlightMatch(val, searchText)"></span>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }

    .db-cell-editor__input,
    .db-cell-editor__select {
      width: 100%;
      height: 100%;
      border: 2px solid #0066cc;
      border-radius: 2px;
      padding: 0 4px;
      font-size: inherit;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
      background: #fff;
    }
    .db-cell-editor__input--number { text-align: right; }
    .db-cell-editor__input--date { cursor: pointer; }
    .db-cell-editor__input--search { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
    .db-cell-editor__select {
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 6px center;
      padding-right: 24px;
      cursor: pointer;
    }
    .db-cell-editor__checkbox-label {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 100%;
      cursor: pointer;
      font-size: inherit;
    }
    .db-cell-editor__checkbox-label input { cursor: pointer; }
    .db-cell-editor__textarea {
      width: 100%;
      height: 100%;
      min-height: 80px;
      border: 2px solid #0066cc;
      border-radius: 2px;
      padding: 4px;
      font-size: inherit;
      font-family: inherit;
      outline: none;
      resize: vertical;
      box-sizing: border-box;
    }

    .db-cell-editor__rich-select {
      position: relative;
      width: 100%;
      height: 100%;
    }
    .db-cell-editor__dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #fff;
      border: 1px solid #ccc;
      border-top: none;
      border-radius: 0 0 4px 4px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .db-cell-editor__dropdown-item {
      padding: 6px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    .db-cell-editor__dropdown-item:hover { background: #f0f0f0; }
    .db-cell-editor__dropdown-item--selected {
      background: #e6f0ff;
      color: #0066cc;
      font-weight: 500;
    }
    :host ::ng-deep .db-cell-editor__match {
      background: #ffeb3b;
      font-weight: 600;
    }
  `]
})
export class DbCellEditorComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('editorInput') editorInputRef?: ElementRef<HTMLElement>;

  @Input() value: any = null;
  @Input() editorType: EditorType = 'agTextCellEditor';
  @Input() editorParams: any = {};

  @Output() valueChange = new EventEmitter<any>();
  @Output() editingStarted = new EventEmitter<void>();
  @Output() editingStopped = new EventEmitter<{ committed: boolean; value: any }>();
  @Output() navigate = new EventEmitter<{ direction: 'up' | 'down' | 'left' | 'right' }>();

  currentValue: any;
  displayValue = '';

  // Text
  get maxLength() { return this.editorParams.maxLength ?? 256; }
  get placeholder() { return this.editorParams.placeholder ?? ''; }

  // Number
  get min() { return this.editorParams.min ?? null; }
  get max() { return this.editorParams.max ?? null; }
  get step() { return this.editorParams.step ?? 1; }

  // Select / RichSelect
  get selectValues() { return this.editorParams.values ?? []; }
  get searchable() { return this.editorParams.searchable ?? false; }
  get searchPlaceholder() { return this.editorParams.searchPlaceholder ?? '搜索...'; }
  searchText = '';
  filteredValues: any[] = [];
  showDropdown = false;

  // Date
  get minDate() { return this.editorParams.min ?? ''; }
  get maxDate() { return this.editorParams.max ?? ''; }

  // Large Text
  get textareaRows() { return this.editorParams.rows ?? 5; }
  get textareaCols() { return this.editorParams.cols ?? 40; }

  private editorService: EditorService;

  constructor() {
    this.editorService = new EditorService();
  }

  ngOnInit(): void {
    this.init();
    setTimeout(() => this.focus(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['editorType'] || changes['editorParams']) {
      this.init();
    }
  }

  ngOnDestroy(): void {
    this.editorService.destroy();
  }

  private init(): void {
    this.currentValue = this.value;
    this.displayValue = this.editorService.formatValueForEditor(this.value, this.editorType);
    if (this.editorType === 'agRichSelectCellEditor') {
      this.filteredValues = [...this.selectValues];
    }
    this.editingStarted.emit();
  }

  focus(): void {
    const el = this.editorInputRef?.nativeElement;
    if (el) {
      el.focus();
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const input = el as HTMLInputElement;
        input.select?.();
      }
    }
  }

  // ── Input handlers ────────────────────────────────────────────────────────

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.currentValue = input.value;
    this.displayValue = input.value;
    this.valueChange.emit(this.currentValue);
  }

  onSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentValue = select.value;
    this.valueChange.emit(this.currentValue);
  }

  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.currentValue = input.value;
    this.valueChange.emit(this.currentValue);
  }

  onCheckboxChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.currentValue = checkbox.checked;
    this.valueChange.emit(this.currentValue);
    // 复选框通常不需要再按Enter，直接提交
    this.commit();
  }

  onTextareaInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.currentValue = textarea.value;
    this.displayValue = textarea.value;
    this.valueChange.emit(this.currentValue);
  }

  // ── Rich Select ──────────────────────────────────────────────────────────

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
    this.currentValue = input.value;
    this.showDropdown = true;

    const query = this.searchText.toLowerCase();
    this.filteredValues = this.selectValues.filter(v =>
      this.formatOption(v).toLowerCase().includes(query)
    );

    if (this.filteredValues.length === 1 && this.filteredValues[0] === this.searchText) {
      // 精确匹配一个值时自动选中
      this.showDropdown = false;
    }
  }

  onRichSelectBlur(): void {
    // 延迟关闭以允许点击 dropdown 项
    setTimeout(() => {
      if (!this.showDropdown) return;
      // 尝试从列表中找最接近的值
      if (this.filteredValues.length > 0) {
        this.currentValue = this.filteredValues[0];
        this.valueChange.emit(this.currentValue);
      }
      this.showDropdown = false;
    }, 150);
  }

  onRichSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentValue = select.value;
    this.valueChange.emit(this.currentValue);
    this.commit();
  }

  onDropdownSelect(value: any): void {
    this.currentValue = value;
    this.displayValue = this.formatOption(value);
    this.valueChange.emit(value);
    this.showDropdown = false;
    this.commit();
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────

  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        this.commit();
        // Tab 导航到下一个单元格
        if (event.key === 'Tab') {
          this.navigate.emit({ direction: event.shiftKey ? 'left' : 'right' });
        } else {
          this.navigate.emit({ direction: 'down' });
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.cancel();
        break;

      case 'ArrowUp':
        if (this.editorType !== 'agLargeTextCellEditor') {
          event.preventDefault();
          this.navigate.emit({ direction: 'up' });
        }
        break;

      case 'ArrowDown':
        if (this.editorType !== 'agLargeTextCellEditor' && this.editorType !== 'agCheckboxCellEditor') {
          event.preventDefault();
          this.navigate.emit({ direction: 'down' });
        }
        break;

      case 'ArrowLeft':
        if (this.editorType === 'agTextCellEditor' || this.editorType === 'agNumberCellEditor') {
          // 不拦截，让光标移动
        } else {
          event.preventDefault();
          this.navigate.emit({ direction: 'left' });
        }
        break;

      case 'ArrowRight':
        if (this.editorType === 'agTextCellEditor' || this.editorType === 'agNumberCellEditor') {
          // 不拦截
        } else {
          event.preventDefault();
          this.navigate.emit({ direction: 'right' });
        }
        break;
    }
  }

  onBlur(): void {
    this.commit();
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  commit(): void {
    const finalValue = this.editorService.parseValue(this.currentValue, this.editorType);
    this.editingStopped.emit({ committed: true, value: finalValue });
  }

  cancel(): void {
    this.editingStopped.emit({ committed: false, value: this.value });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  formatOption(val: any): string {
    if (this.editorParams.formatValue) {
      return this.editorParams.formatValue(val);
    }
    if (val == null) return '';
    return String(val);
  }

  getCheckboxLabel(): string {
    const val = this.currentValue;
    if (val === true || val === 'true' || val === 1) return '是';
    return '否';
  }

  highlightMatch(value: any, query: string): string {
    if (!query) return this.formatOption(value);
    const str = this.formatOption(value);
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return str.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="db-cell-editor__match">$1</mark>');
  }
}
