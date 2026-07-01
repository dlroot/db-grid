/**
 * 高级过滤侧边栏组件
 * 提供 UI 来配置 AND/OR 嵌套过滤条件
 */

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { 
  AdvancedFilterService, 
  AdvancedFilterModel, 
  AdvancedFilterGroup, 
  AdvancedFilterCondition,
  JoinOperator,
  FilterPreset
} from '../../../core/services/advanced-filter.service';
import { ColDef } from '../../../core/models';

@Component({
  selector: 'db-advanced-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="advanced-filter-sidebar" [class.open]="isOpen">
      <div class="filter-header">
        <h3>🔍 高级过滤</h3>
        <button class="close-btn" (click)="close()">✕</button>
      </div>

      <div class="filter-body">
        <!-- 根组操作 -->
        <div class="root-actions">
          <button (click)="addCondition(rootGroup)">+ 添加条件</button>
          <button (click)="addGroup(rootGroup)">+ 添加组</button>
          <button (click)="clearAll()">🗑️ 清除全部</button>
        </div>

        <!-- 过滤组递归渲染 -->
        <div class="filter-group" [style.margin-left.px]="0">
          <div class="group-header">
            <span class="group-operator">根组</span>
            <select [(ngModel)]="rootGroup.operator" (ngModelChange)="onOperatorChange()">
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </div>

          <!-- 条件列表 -->
          @for (condition of rootGroup.conditions; track condition.id) {
            <div class="filter-condition">
              <select [(ngModel)]="condition.colId" (ngModelChange)="onConditionChange()">
                <option value="">选择列...</option>
                @for (col of columns; track col.field) {
                  <option [value]="col.field">{{ col.headerName || col.field }}</option>
                }
              </select>

              <select [(ngModel)]="condition.conditionType" (ngModelChange)="onConditionChange()">
                <option value="contains">包含</option>
                <option value="equals">等于</option>
                <option value="greaterThan">大于</option>
                <option value="lessThan">小于</option>
                <option value="inRange">范围内</option>
              </select>

              <input 
                type="text" 
                [(ngModel)]="condition.value" 
                placeholder="值..." 
                (ngModelChange)="onConditionChange()"
              />

              <button class="delete-btn" (click)="removeCondition(rootGroup, condition)">🗑️</button>
            </div>
          }

          <!-- 嵌套子组 -->
          @if (rootGroup.groups) {
            @for (subGroup of rootGroup.groups; track subGroup.id) {
              <div class="nested-group">
                <div class="group-header">
                  <span>子组</span>
                  <select [(ngModel)]="subGroup.operator" (ngModelChange)="onOperatorChange()">
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                  <button class="delete-btn" (click)="removeGroup(rootGroup, subGroup)">🗑️</button>
                </div>

                @for (condition of subGroup.conditions; track condition.id) {
                  <div class="filter-condition">
                    <select [(ngModel)]="condition.colId" (ngModelChange)="onConditionChange()">
                      <option value="">选择列...</option>
                      @for (col of columns; track col.field) {
                        <option [value]="col.field">{{ col.headerName || col.field }}</option>
                      }
                    </select>

                    <input 
                      type="text" 
                      [(ngModel)]="condition.value" 
                      placeholder="值..." 
                      (ngModelChange)="onConditionChange()"
                    />

                    <button class="delete-btn" (click)="removeCondition(subGroup, condition)">🗑️</button>
                  </div>
                }
              </div>
            }
          }
        </div>

        <!-- 操作按钮 -->
        <div class="filter-actions">
          <button class="apply-btn" (click)="applyFilter()">✅ 应用过滤</button>
          <button class="clear-btn" (click)="clearAll()">❌ 清除</button>
        </div>

        <!-- 预设管理 -->
        <div class="preset-section">
          <h4>📦 过滤预设</h4>
          <div class="preset-actions">
            <input 
              type="text" 
              [(ngModel)]="newPresetName" 
              placeholder="预设名称..." 
              class="preset-input"
            />
            <button (click)="savePreset()">💾 保存预设</button>
          </div>

          @if (presets.length > 0) {
            <div class="preset-list">
              @for (preset of presets; track preset.id) {
                <div class="preset-item">
                  <span (click)="loadPreset(preset)">{{ preset.name }}</span>
                  <button class="delete-btn" (click)="deletePreset(preset)">🗑️</button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .advanced-filter-sidebar {
      position: fixed;
      top: 0;
      right: -400px;
      width: 380px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 8px rgba(0,0,0,0.15);
      transition: right 0.3s ease;
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }

    .advanced-filter-sidebar.open {
      right: 0;
    }

    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: #2196f3;
      color: white;
    }

    .filter-header h3 {
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
    }

    .filter-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
    }

    .root-actions {
      margin-bottom: 16px;
    }

    .root-actions button {
      margin-right: 8px;
      padding: 6px 12px;
      border: 1px solid #2196f3;
      background: white;
      color: #2196f3;
      border-radius: 4px;
      cursor: pointer;
    }

    .root-actions button:hover {
      background: #2196f3;
      color: white;
    }

    .filter-group {
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .group-operator {
      font-weight: bold;
    }

    .filter-condition {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }

    .filter-condition select,
    .filter-condition input {
      padding: 4px 8px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 14px;
    }

    .filter-condition select {
      flex: 1;
    }

    .filter-condition input {
      flex: 1;
    }

    .delete-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
    }

    .nested-group {
      margin-left: 20px;
      margin-top: 12px;
      padding: 12px;
      border-left: 3px solid #2196f3;
    }

    .filter-actions {
      margin-top: 16px;
      display: flex;
      gap: 8px;
    }

    .apply-btn {
      flex: 1;
      padding: 8px 16px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .apply-btn:hover {
      background: #45a049;
    }

    .clear-btn {
      padding: 8px 16px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .clear-btn:hover {
      background: #d32f2f;
    }

    .preset-section {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .preset-section h4 {
      margin: 0 0 12px 0;
    }

    .preset-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .preset-input {
      flex: 1;
      padding: 6px 12px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .preset-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .preset-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
    }

    .preset-item:hover {
      background: #f5f5f5;
    }
  `]
})
export class AdvancedFilterComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() columns: ColDef[] = [];
  @Output() closeSidebar = new EventEmitter<void>();

  rootGroup: AdvancedFilterGroup = this.createEmptyGroup('AND');
  presets: FilterPreset[] = [];
  newPresetName = '';

  private destroy$ = new Subject<void>();

  constructor(
    private advancedFilterService: AdvancedFilterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // 加载已有过滤模型
    const model = this.advancedFilterService.getCurrentModel();
    if (model) {
      this.rootGroup = model.root;
    }

    // 加载预设
    this.loadPresets();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== 组操作 ==========

  addCondition(group: AdvancedFilterGroup): void {
    const condition: AdvancedFilterCondition = {
      id: this.generateId(),
      colId: '',
      filterType: 'text',
      conditionType: 'contains',
      value: ''
    };
    group.conditions.push(condition);
    this.cdr.markForCheck();
  }

  removeCondition(group: AdvancedFilterGroup, condition: AdvancedFilterCondition): void {
    group.conditions = group.conditions.filter(c => c.id !== condition.id);
    this.cdr.markForCheck();
  }

  addGroup(parentGroup: AdvancedFilterGroup): void {
    if (!parentGroup.groups) {
      parentGroup.groups = [];
    }
    const newGroup = this.createEmptyGroup('AND');
    parentGroup.groups.push(newGroup);
    this.cdr.markForCheck();
  }

  removeGroup(parentGroup: AdvancedFilterGroup, group: AdvancedFilterGroup): void {
    if (parentGroup.groups) {
      parentGroup.groups = parentGroup.groups.filter(g => g.id !== group.id);
      this.cdr.markForCheck();
    }
  }

  // ========== 事件处理 ==========

  onOperatorChange(): void {
    // 操作符变化，自动保存
    this.applyFilter();
  }

  onConditionChange(): void {
    // 条件变化，不需要自动保存，等用户点"应用"
  }

  // ========== 核心操作 ==========

  applyFilter(): void {
    const model: AdvancedFilterModel = { root: this.rootGroup };
    this.advancedFilterService.applyFilterModel(model);
    console.log('✅ 高级过滤已应用', model);
  }

  clearAll(): void {
    this.rootGroup = this.createEmptyGroup('AND');
    this.advancedFilterService.clearFilter();
    console.log('🗑️ 高级过滤已清除');
  }

  close(): void {
    this.closeSidebar.emit();
  }

  // ========== 预设管理 ==========

  savePreset(): void {
    if (!this.newPresetName.trim()) {
      alert('请输入预设名称');
      return;
    }

    const model: AdvancedFilterModel = { root: this.rootGroup };
    const preset = this.advancedFilterService.savePreset(this.newPresetName);
    this.presets.push(preset);
    this.newPresetName = '';
    this.cdr.markForCheck();
    console.log('💾 预设已保存:', preset.name);
  }

  loadPreset(preset: FilterPreset): void {
    const model = this.advancedFilterService.loadPreset(preset.id);
    if (model) {
      this.rootGroup = model.root;
      this.applyFilter();
      console.log('📦 预设已加载:', preset.name);
    }
  }

  deletePreset(preset: FilterPreset): void {
    this.advancedFilterService.deletePreset(preset.id);
    this.presets = this.presets.filter(p => p.id !== preset.id);
    this.cdr.markForCheck();
    console.log('🗑️ 预设已删除:', preset.name);
  }

  private loadPresets(): void {
    this.presets = this.advancedFilterService.getPresets();
  }

  // ========== 辅助方法 ==========

  private createEmptyGroup(operator: JoinOperator): AdvancedFilterGroup {
    return {
      id: this.generateId(),
      operator,
      conditions: []
    };
  }

  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
