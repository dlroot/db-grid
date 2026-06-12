/**
 * Grid 主组件
 * 核心入口组件
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ElementRef,
  ViewChild,
  NgZone,
  Inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  signal,
  computed,
  input,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject, fromEvent, debounceTime, takeUntil } from 'rxjs';

import {
  ColDef,
  GridOptions,
  GridReadyEvent,
  RowDataUpdatedEvent,
  ModelUpdatedEvent,
  RowClickedEvent,
  RowDoubleClickedEvent,
  CellClickedEvent,
  CellDoubleClickedEvent,
  SortChangedEvent,
  FilterChangedEvent,
  SelectionChangedEvent,
  ColumnResizedEvent,
  RowNode,
  GridApi,
  DetailChartConfig,
  CellEditingStartedEvent,
  CellEditingStoppedEvent,
  RowEditingStartedEvent,
  RowEditingStoppedEvent,
  ColumnPinnedEvent,
  GridSizeChangedEvent,
  FirstDataRenderedEvent,
  DisplayedColumnsChangedEvent,
  CellValueChangedEvent,
} from '../../../core/models';
import { PdfExportService, ExcelImportService, ImportResult } from '../../../core/services';

import {
  DataService,
  ColumnService,
  SelectionService,
  TreeService,
  GroupService,
  ExcelExportService,
  CellSpanService,
  ChartsService,
  CellEditService,
  ColumnPinningService,
  PaginationService,
  ContextMenuService,
  ColumnMenuService,
  ColumnMenuItem as ColumnMenuItemType,
  CrossGridDragService,
  DragDropService,
  FilterService,
  EditorService,
  RowDragService,
  TreeNodeConfig,
  GroupConfig,
  CellDataTypeService,
  KeyboardNavigationService,
  AccessibilityService,
  AggregationService,
  RangeSelectionService,
  SideBarService,
  StatusBarService,
  MasterDetailService,
  UndoRedoService,
  ServerSideService,
  PivotService,
  I18nService,
  ClipboardService,
  Locale,
  IServerSideDatasource,
  ServerSideConfig,
  OverlayService,
  ColumnTypeService,
  TooltipService,
  ExternalFilterService,
  ValueMappingService,
  AdvancedFilterService,
  RowPinningService,
  TransactionService,
  TransactionResult,
  RowDataTransaction,
} from '../../../core/services';

import { DbCellEditorComponent } from '../cell-editor/db-cell-editor.component';
import { DbFilterPopupComponent } from '../filter-popup/db-filter-popup.component';
import { DbChartPanelComponent } from '../chart-panel/db-chart-panel.component';

import {
  CellRendererService,
  RowRendererService,
  HeaderRendererService,
} from '../../../core/rendering';

@Component({
  selector: 'db-grid',
  standalone: true,
  imports: [CommonModule, DbCellEditorComponent, DbFilterPopupComponent, DbChartPanelComponent],
  styleUrls: ['./db-grid-high-contrast.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #gridContainer class="db-grid-container" [class]="themeClass()" (keydown)="onKeyDown($event)"
         tabindex="0" style="outline: none; user-select: none; -webkit-user-select: none;">
      @if (showQuickFilter) {
        <div class="db-grid-quick-filter">
          <input type="text" class="db-grid-quick-filter-input"
                 [placeholder]="'搜索...'"
                 [value]="quickFilterText()"
                 (input)="onQuickFilterInput($event)" />
        </div>
      }
      <div #headerContainer class="db-grid-header-container"></div>
      <div #bodyContainer class="db-grid-body-container" (scroll)="onScroll($event)">
        <div #virtualScroll class="db-grid-virtual-scroll">
          <!-- Pinned Top Rows -->
          @if (hasPinnedTopRows()) {
            <div #pinnedTopContainer class="db-grid-pinned-top"></div>
          }
          
          <div #rowsContainer class="db-grid-rows"></div>
          
          <!-- Pinned Bottom Rows -->
          @if (hasPinnedBottomRows()) {
            <div #pinnedBottomContainer class="db-grid-pinned-bottom"></div>
          }
          
          @if (pinnedLeftColumnIds.length > 0) {
            <div #pinnedLeftContainer class="db-grid-pinned-left"></div>
          }
        </div>
      </div>
      <div #footerContainer class="db-grid-footer-container"></div>
      <!-- Loading Overlay (向后兼容 @Input loading + OverlayService) -->
      @if (shouldShowLoadingOverlay()) {
        <div class="db-grid-overlay db-grid-overlay-fadein" [class]="overlayService.overlayConfig()?.class || ''">
          @if (false && overlayComponent) {
            <!-- 自定义 loading overlay 组件 (TODO: 需要 import NgComponentOutlet) -->
          } @else {
            <div class="db-grid-overlay-content">
              <span class="db-grid-spinner">⟳</span>
              <span>{{ overlayLoadingMessage() }}</span>
              @if (overlayProgress() !== undefined && overlayProgress() !== null) {
                <span class="db-grid-overlay-progress">{{ overlayProgress() }}%</span>
              }
            </div>
            @if (overlayProgress() !== undefined && overlayProgress() !== null) {
              <div class="db-grid-overlay-progress-bar">
                <div class="db-grid-overlay-progress-fill" [style.width.%]="overlayProgress()"></div>
              </div>
            }
          }
        </div>
      }
      <!-- No Rows Overlay (向后兼容 @Input noRowsMessage + OverlayService) -->
      @if (!shouldShowLoadingOverlay() && shouldShowNoRowsOverlay()) {
        <div class="db-grid-no-rows db-grid-overlay-fadein" [class]="overlayService.overlayConfig()?.class || ''">
          @if (false && overlayNoRowsComponent) {
            <!-- 自定义无数据 overlay 组件 (TODO: 需要 import NgComponentOutlet) -->
          } @else {
            <div class="db-grid-no-rows-icon">📭</div>
            <div class="db-grid-no-rows-text">{{ overlayNoRowsMessage() }}</div>
          }
        </div>
      }
      <!-- Custom Overlay (OverlayService type='custom') -->
      @if (overlayService.overlayConfig()?.type === 'custom') {
        <div class="db-grid-overlay db-grid-overlay-fadein" [class]="overlayService.overlayConfig()?.class || ''">
          <div class="db-grid-overlay-custom-content" [innerHTML]="overlayService.overlayConfig()?.template || ''"></div>
        </div>
      }

      <!-- 筛选器弹出层 -->
      @if (activeFilterPopup) {
        <div class="db-filter-popup-wrapper">
          <db-filter-popup
            [colDef]="activeFilterPopup.colDef"
            [rowData]="rowData"
            (filterApplied)="onFilterApplied($event)"
            (filterClosed)="closeFilterPopup()">
          </db-filter-popup>
        </div>
      }

      <!-- 单元格编辑器 -->
      @if (activeCellEditor) {
        <db-cell-editor
          [value]="activeCellEditor.value"
          [editorType]="activeCellEditor.editorType"
          [editorParams]="activeCellEditor.editorParams"
          (valueChange)="onEditorValueChange($event)"
          (editingStopped)="onEditorStopped($event)"
          (navigate)="onEditorNavigate($event)">
        </db-cell-editor>
      }

      <!-- Grid Menu 浮层 -->
      @if (gridMenuVisible()) {
        <div class="db-grid-menu-overlay" (click)="closeGridMenu()"></div>
        <div class="db-grid-menu" [style.left.px]="gridMenuPosition().x" [style.top.px]="gridMenuPosition().y">
          @for (item of gridMenuItems(); track item.id) {
            @if (item.type === 'separator') {
              <div class="db-grid-menu-sep"></div>
            } @else if (item.type === 'submenu') {
              <div class="db-grid-menu-item db-grid-menu-submenu" (mouseenter)="openSubmenu(item)" (click)="$event.stopPropagation()">
                <span class="db-grid-menu-icon">{{ item.icon || '' }}</span>
                <span class="db-grid-menu-label">{{ item.label }}</span>
                <span class="db-grid-menu-arrow">▸</span>
              </div>
            } @else {
              <div class="db-grid-menu-item" [class.db-grid-menu-item-disabled]="item.disabled" (click)="onGridMenuItemClick(item)">
                <span class="db-grid-menu-icon">{{ item.icon || '' }}</span>
                <span class="db-grid-menu-label">{{ item.label }}</span>
                @if (item.checked !== undefined) {
                  <span class="db-grid-menu-check">{{ item.checked ? '✓' : '' }}</span>
                }
                @if (item.shortcut) {
                  <span class="db-grid-menu-shortcut">{{ item.shortcut }}</span>
                }
              </div>
            }
          }
        </div>
      }
      <!-- 图表面板 -->
      @if (chartPanelVisible()) {
        <db-chart-panel
          (onClose)="hideChartPanel()"
          (onTypeChange)="onChartTypeChange($event)"
          (onExport)="onChartExport($event)" />
      }

      <!-- Excel 导入拖拽区域 -->
      @if (enableExcelImport) {
        <input #fileInput type="file" accept=".xlsx,.xls" style="display:none" (change)="onFileSelected($event)" />
        <div #dragOverlay class="db-grid-drag-import-overlay">
          <span class="db-grid-drag-import-text">📥 释放导入 Excel 文件</span>
        </div>
      }

      <!-- 填充手柄 (Fill Handle) -->
      <div #fillHandle 
           class="db-grid-fill-handle"
           [class.visible]="fillHandleVisible() && enableFillHandle"
           [style.left.px]="fillHandlePosition().x"
           [style.top.px]="fillHandlePosition().y"
           (mousedown)="onFillHandleMouseDown($event)">
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .db-grid-container {
      display: flex; flex-direction: column;
      width: 100%; height: 100%;
      position: relative; overflow: hidden;
      border: 1px solid var(--db-grid-border-color, #ddd);
      border-radius: 4px;
      background: var(--db-grid-bg, #fff);
      font-family: var(--db-grid-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--db-grid-font-size, 14px);
      user-select: none; -webkit-user-select: none; -ms-user-select: none;
    }
    .db-grid-header-container { flex-shrink: 0; overflow-x: hidden; overflow-y: hidden; box-sizing: border-box; width: 100%; }
    .db-grid-body-container { flex: 1; overflow-y: auto; overflow-x: auto; position: relative; box-sizing: border-box; width: 100%; }
    .db-grid-virtual-scroll { position: relative; min-width: 100%; }
    .db-grid-rows { display: flex; flex-direction: column; position: absolute; left: 0; min-width: 100%; }
    .db-grid-pinned-left { position: absolute; left: 0; top: 0; z-index: 2; overflow: hidden; }
    .db-grid-pinned-left .db-grid-row { position: sticky; left: 0; }
    .db-grid-pinned-center { position: absolute; top: 0; z-index: 2; overflow: hidden; }
    .db-grid-pinned-center .db-grid-row { position: sticky; left: 0; }
    .db-grid-footer-container { flex-shrink: 0; border-top: 1px solid var(--db-grid-border-color, #ddd); }
    .db-grid-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.85);
      display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10;
    }
    .db-grid-overlay-fadein {
      animation: db-grid-overlay-fadein 0.3s ease-out;
    }
    @keyframes db-grid-overlay-fadein {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .db-grid-overlay-content { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .db-grid-spinner { font-size: 20px; animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .db-grid-overlay-progress { font-size: 12px; color: var(--db-grid-text-secondary, #666); margin-left: 4px; }
    .db-grid-overlay-progress-bar {
      width: 200px; height: 4px; background: var(--db-grid-border-color, #e0e0e0);
      border-radius: 2px; margin-top: 12px; overflow: hidden;
    }
    .db-grid-overlay-progress-fill {
      height: 100%; background: var(--db-grid-accent, #2196f3); border-radius: 2px;
      transition: width 0.3s ease;
    }
    .db-grid-overlay-custom-content { padding: 20px; }
    .db-grid-no-rows {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: var(--db-grid-text-secondary, #999); text-align: center; padding: 20px;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .db-grid-no-rows-icon { font-size: 32px; opacity: 0.6; }
    .db-grid-no-rows-text { font-size: 14px; }
    .db-filter-popup-wrapper {
      position: absolute;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    /* ========== Quick Filter ========== */
    .db-grid-quick-filter {
      padding: 4px 8px;
      border-bottom: 1px solid var(--db-grid-border-color, #ddd);
      background: var(--db-grid-header-bg, #f5f5f5);
    }
    .db-grid-quick-filter-input {
      width: 100%;
      max-width: 300px;
      padding: 4px 8px;
      border: 1px solid var(--db-grid-border-color, #ddd);
      border-radius: 3px;
      font-size: 13px;
      outline: none;
    }
    .db-grid-quick-filter-input:focus {
      border-color: var(--db-grid-accent, #2196f3);
    }

    /* ========== Grid Menu ========== */
    .db-grid-menu-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 199;
    }
    .db-grid-menu {
      position: absolute;
      z-index: 200;
      min-width: 200px;
      background: var(--db-grid-bg, #fff);
      border: 1px solid var(--db-grid-border-color, #ddd);
      border-radius: 6px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.12);
      padding: 4px 0;
      font-size: var(--db-grid-font-size, 14px);
      animation: db-grid-menu-fadein 0.12s ease-out;
    }
    @keyframes db-grid-menu-fadein {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .db-grid-menu-item {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 14px;
      cursor: pointer;
      transition: background 0.1s;
      white-space: nowrap;
    }
    .db-grid-menu-item:hover:not(.db-grid-menu-item-disabled) {
      background: var(--db-grid-row-hover-bg, #f0f7ff);
    }
    .db-grid-menu-item-disabled {
      opacity: 0.4; cursor: default;
    }
    .db-grid-menu-icon { width: 20px; text-align: center; flex-shrink: 0; }
    .db-grid-menu-label { flex: 1; }
    .db-grid-menu-check { margin-left: auto; color: var(--db-grid-accent, #2196f3); font-weight: 600; }
    .db-grid-menu-shortcut { margin-left: auto; opacity: 0.5; font-size: 12px; }
    .db-grid-menu-arrow { margin-left: auto; opacity: 0.5; }
    .db-grid-menu-submenu { position: relative; }
    .db-grid-menu-sep {
      height: 1px;
      margin: 4px 8px;
      background: var(--db-grid-border-color, #eee);
    }

    /* ========== Keyboard Focus Styles ========== */
    .db-grid-cell-focused {
      background: var(--db-grid-range-selection-background, rgba(33, 150, 243, 0.15)) !important;
      outline: 2px solid var(--db-grid-range-selection-border-color, #2196f3);
      outline-offset: -2px;
    }
    .db-grid-cell-focused.db-grid-cell-editing {
      outline: 2px solid var(--db-grid-cell-editing-border-color, #ff9800);
      background: rgba(255, 152, 0, 0.08);
    }

    /* ========== Range Selection Styles ========== */
    .db-grid-cell-in-range {
      background: var(--db-grid-range-selection-background, rgba(33, 150, 243, 0.15)) !important;
      transition: background 0.15s ease;
    }
    .db-grid-row {
      .db-grid-cell-in-range {
        border-color: transparent;
      }
    }

    /* ========== Range Border Highlight ========== */
    .db-grid-cell-range-border-top {
      border-top: 2px solid var(--db-grid-range-selection-border-color, #2196f3) !important;
    transition: border-color 0.15s ease;
    }
    .db-grid-cell-range-border-right {
      border-right: 2px solid var(--db-grid-range-selection-border-color, #2196f3) !important;
    }
    .db-grid-cell-range-border-bottom {
      border-bottom: 2px solid var(--db-grid-range-selection-border-color, #2196f3) !important;
    }
    .db-grid-cell-range-border-left {
      border-left: 2px solid var(--db-grid-range-selection-border-color, #2196f3) !important;
    }


    /* ========== Copy/Paste Animation ========== */
    @keyframes copy-flash {
      0% { background: rgba(33,150,243,0.4); }
      100% { background: var(--db-grid-range-selection-background, rgba(33,150,243,0.15)); }
    }
    @keyframes paste-pulse {
      0% { background: rgba(76,175,80,0.4); }
      50% { background: rgba(76,175,80,0.2); }
      100% { background: var(--db-grid-range-selection-background, rgba(33,150,243,0.15)); }
    }


    /* 复制动画类 */
    .db-grid-cell-anim-copy {
      animation: copy-flash 0.4s ease-out forwards;
    }
    
    /* 粘贴动画类 */
    .db-grid-cell-anim-paste {
      animation: paste-pulse 0.4s ease-out forwards;
    }

    /* ========== Transaction Row Animation ========== */
    /* 行添加动画 */
    @keyframes db-grid-row-add {
      0% { background: rgba(76,175,80,0.3); transform: translateX(-8px); opacity: 0.7; }
      100% { background: transparent; transform: translateX(0); opacity: 1; }
    }
    /* 行删除动画 */
    @keyframes db-grid-row-remove {
      0% { background: rgba(244,67,54,0.3); opacity: 1; }
      50% { background: rgba(244,67,54,0.2); opacity: 0.5; }
      100% { background: transparent; opacity: 0; }
    }
    /* 行更新闪烁动画（绿色高亮） */
    @keyframes db-grid-row-update {
      0% { background: rgba(76,175,80,0.25); }
      50% { background: rgba(76,175,80,0.15); }
      100% { background: transparent; }
    }
    /* 行更新闪烁动画（蓝色高亮 - 用于更新） */
    @keyframes db-grid-row-flash {
      0% { background: rgba(33,150,243,0.35); }
      50% { background: rgba(33,150,243,0.15); }
      100% { background: transparent; }
    }
    /* Transaction 行动画类 */
    .db-grid-row-anim-add {
      animation: db-grid-row-add 0.4s ease-out forwards;
    }
    .db-grid-row-anim-remove {
      animation: db-grid-row-remove 0.3s ease-out forwards;
    }
    .db-grid-row-anim-update {
      animation: db-grid-row-update 0.5s ease-out forwards;
    }
    .db-grid-row-anim-flash {
      animation: db-grid-row-flash 0.5s ease-out forwards;
    }

    /* ========== 分组行样式 ========== */
    .db-grid-group-row {
      background: var(--db-grid-group-row-bg, #f5f7fa) !important;
      font-weight: 600;
      border-bottom: 1px solid var(--db-grid-border-color, #ddd);
    }
    .db-grid-group-row:hover {
      background: var(--db-grid-group-row-hover-bg, #e8edf3) !important;
    }
    .db-grid-group-row .db-grid-group-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-left: 8px;
      cursor: pointer;
      user-select: none;
    }
    .db-grid-group-row .group-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      font-size: 10px;
      transition: transform 0.2s ease;
      color: var(--db-grid-accent, #2196f3);
    }
    .db-grid-group-row .group-key {
      font-weight: 600;
      color: var(--db-grid-text, #333);
    }
    .db-grid-group-row .group-aggregations {
      font-weight: 400;
      font-size: 12px;
      color: var(--db-grid-text-secondary, #666);
      margin-left: 8px;
    }
    .db-grid-group-row .group-count {
      font-weight: 400;
      font-size: 11px;
      color: var(--db-grid-text-secondary, #999);
      margin-left: 4px;
    }
    /* ========== Column Header Selection Style ========== */
    .db-grid-header-cell-col-selected {
      background: var(--db-grid-range-selection-background, rgba(33, 150, 243, 0.15)) !important;
      border-bottom: 2px solid var(--db-grid-range-selection-border-color, #2196f3) !important;
    }

    /* ========== Excel Import Drag Overlay ========== */
    .db-grid-drag-import-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(33, 150, 243, 0.1);
      border: 3px dashed #2196f3;
      display: flex; align-items: center; justify-content: center;
      z-index: 50; pointer-events: none; opacity: 0;
      transition: opacity 0.2s;
      border-radius: 4px;
    }
    .db-grid-drag-import-overlay.drag-over {
      opacity: 1;
    }
    .db-grid-drag-import-text {
      font-size: 18px; color: #2196f3; font-weight: 600;
      background: white; padding: 12px 24px; border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    }

    /* 范围右下角填充柄 */
    .db-grid-cell-range-corner {
      position: relative;
    }
    .db-grid-cell-range-corner::after {
      content: '';
      position: absolute;
      right: -3px;
      bottom: -3px;
      width: 7px;
      height: 7px;
      background: var(--db-grid-range-selection-border-color, #2196f3);
      border: 1px solid #fff;
      border-radius: 1px;
      cursor: crosshair;
      z-index: 5;
    }

    /* 填充手柄拖拽元素 */
    .db-grid-fill-handle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--db-grid-primary, #2196f3);
      border: 1px solid #fff;
      border-radius: 1px;
      cursor: crosshair;
      z-index: 100;
      display: none;
    }
    .db-grid-fill-handle.visible {
      display: block;
    }
    .db-grid-fill-handle:hover {
      background: var(--db-grid-primary-dark, #1976d2);
      transform: scale(1.2);
    }
    .db-grid-fill-handle.dragging {
      opacity: 0.7;
      background: var(--db-grid-primary-dark, #1976d2);
    }

    /* 填充预览高亮 */
    .db-grid-cell-fill-preview {
      background: var(--db-grid-fill-preview-bg, rgba(33, 150, 243, 0.25)) !important;
      outline: 1px dashed var(--db-grid-primary, #2196f3);
      outline-offset: -1px;
    }

    /* ========== Tooltip ========== */
    :host .db-grid-tooltip {
      position: absolute;
      background: var(--db-grid-bg, #fff);
      border: 1px solid var(--db-grid-border-color, #ddd);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      pointer-events: none;
      animation: db-grid-tooltip-fadein 0.15s ease-out;
    }
    .db-grid-tooltip-content {
      padding: 6px 10px;
      font-size: 12px;
      max-width: 300px;
      word-wrap: break-word;
      color: var(--db-grid-text-color, #333);
    }
    .db-grid-tooltip.db-grid-tooltip-fadeout {
      animation: db-grid-tooltip-fadeout 0.15s ease-out forwards;
    }
    @keyframes db-grid-tooltip-fadein {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes db-grid-tooltip-fadeout {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    :host(:focus) { outline: none; }

    /* ========== Pinned Rows ========== */
    .db-grid-pinned-top {
      position: sticky;
      top: 0;
      z-index: 3;
      background: var(--db-grid-bg, #fff);
      border-bottom: 2px solid var(--db-grid-border-color, #ddd);
    }
    .db-grid-pinned-bottom {
      position: sticky;
      bottom: 0;
      z-index: 3;
      background: var(--db-grid-bg, #fff);
      border-top: 2px solid var(--db-grid-border-color, #ddd);
    }
    .db-grid-row-pinned-top {
      background: var(--db-grid-pinned-row-bg, #f0f7ff) !important;
    }
    .db-grid-row-pinned-top:hover {
      background: var(--db-grid-pinned-row-hover-bg, #e3f2fd) !important;
    }
    .db-grid-row-pinned-bottom {
      background: var(--db-grid-pinned-row-bg, #f0f7ff) !important;
    }
    .db-grid-row-pinned-bottom:hover {
      background: var(--db-grid-pinned-row-hover-bg, #e3f2fd) !important;
    }
  `],
})
export class DbGridComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  // ============ Inputs ============
  @Input() columnDefs: ColDef[] = [];
  @Input() defaultColDef?: Partial<ColDef>;
  @Input() columnTypes?: Record<string, Partial<ColDef>>;
  @Input() rowData: any[] = [];
  private _gridOptions: GridOptions = {};
  @Input() set gridOptions(value: GridOptions) { this._gridOptions = value || {}; }
  get gridOptions(): GridOptions { return this._gridOptions; }
  theme = input<'alpine' | 'balham' | 'material' | 'custom'>('alpine');
  @Input() rowHeight: number = 40;
  @Input() rowSelection: string = 'single';
  @Input() headerHeight: number = 40;
  @Input() loading: boolean = false;
  @Input() loadingMessage: string = '';
  @Input() noRowsMessage: string = '';

  // ============ Overlay Inputs ============
  /** 自定义 loading overlay 组件（Angular 组件引用） */
  @Input() overlayComponent: any = null;
  /** 自定义无数据 overlay 组件（Angular 组件引用） */
  @Input() overlayNoRowsComponent: any = null;
  @Input() masterDetail = false;
  @Input() animateRows: boolean = false;
  @Input() suppressVirtualScroll: boolean = false;
  @Input() getRowId: ((data: any) => string) | undefined;

  // ============ Quick Filter Inputs ============
  /** 快速筛选文本（可外部传入） */
  quickFilterText = input<string>('');
  /** 是否显示内置快速筛选输入框 */
  showQuickFilter = input<boolean>(false);

  // ============ Tree Data Inputs ============
  /** 启用树形数据模式 */
  @Input() treeData: boolean = false;
  /** 树形数据配置 */
  @Input() treeConfig: TreeNodeConfig | null = null;

  // ============ Grouping Inputs ============
  /** 启用行分组 */
  @Input() enableGrouping: boolean = false;
  /** 分组配置 */
  @Input() groupConfig: GroupConfig | null = null;

  // ============ Pivot Inputs ============
  /** 启用数据透视模式 */
  @Input() pivotMode = false;
  /** 透视列（作为列头的字段） */
  @Input() pivotColumn = '';
  /** 透视行分组列 */
  @Input() pivotRowGroupColumns: string[] = [];
  /** 透视值列（需聚合的字段和聚合函数） */
  @Input() pivotValueColumns: { field: string; aggFunc: string }[] = [];

  // ============ Column Virtualization Input ============
  /** 启用列虚拟化（大量列时自动只渲染可见列） */
  @Input() enableColVirtualization = false;

  // ============ Server-Side Inputs ============
  /** 启用服务端行模型 */
  @Input() enableServerSide: boolean = false;
  /** 服务端配置 */
  @Input() serverSideConfig: ServerSideConfig | null = null;
  /** 服务端数据源 */
  @Input() serverSideDatasource: IServerSideDatasource | null = null;

  // ============ 图表 Inputs ============
  /** 启用集成图表功能 */
  @Input() enableCharts: boolean = false;

  // ============ 行固定 Inputs ============
  /** 顶部固定行数据 */
  @Input() pinnedTopRowData: any[] = [];
  /** 底部固定行数据 */
  @Input() pinnedBottomRowData: any[] = [];

  // ============ Menu Inputs ============
  /** 启用列头菜单按钮（三横线图标） */
  @Input() enableColumnMenu: boolean = true;
  /** 启用右键菜单 */
  @Input() enableContextMenu: boolean = true;

  // ============ i18n ============
  /** Grid 语言 locale：'en' | 'zh'，默认英文 */
  @Input() locale: Locale = 'en';

  // ============ Outputs ============
  @Output() gridReady = new EventEmitter<GridReadyEvent>();
  @Output() rowDataUpdated = new EventEmitter<RowDataUpdatedEvent>();
  @Output() modelUpdated = new EventEmitter<ModelUpdatedEvent>();
  @Output() rowClicked = new EventEmitter<RowClickedEvent>();
  @Output() rowDoubleClicked = new EventEmitter<RowDoubleClickedEvent>();
  @Output() cellClicked = new EventEmitter<CellClickedEvent>();
  @Output() cellDoubleClicked = new EventEmitter<CellDoubleClickedEvent>();
  @Output() sortChanged = new EventEmitter<SortChangedEvent>();
  @Output() filterChanged = new EventEmitter<FilterChangedEvent>();
  @Output() selectionChanged = new EventEmitter<SelectionChangedEvent>();
  @Output() columnResized = new EventEmitter<ColumnResizedEvent>();
  @Output() colDragMoved = new EventEmitter<{ fromIndex: number; toIndex: number; column: any }>();
  @Output() nodeExpanded = new EventEmitter<any>();
  @Output() nodeCollapsed = new EventEmitter<any>();
  @Output() groupExpanded = new EventEmitter<any>();
  @Output() groupCollapsed = new EventEmitter<any>();
  @Output() viewportChanged = new EventEmitter<{ startIndex: number; endIndex: number; offsetY: number }>();
  @Output() externalFilterChanged = new EventEmitter<void>();
  
  // ============ 增强事件（Phase 5.4 补齐）============
  @Output() cellEditingStarted = new EventEmitter<CellEditingStartedEvent>();
  @Output() cellEditingStopped = new EventEmitter<CellEditingStoppedEvent>();
  @Output() rowEditingStarted = new EventEmitter<RowEditingStartedEvent>();
  @Output() rowEditingStopped = new EventEmitter<RowEditingStoppedEvent>();
  @Output() columnPinned = new EventEmitter<ColumnPinnedEvent>();
  @Output() gridSizeChanged = new EventEmitter<GridSizeChangedEvent>();
  @Output() firstDataRendered = new EventEmitter<FirstDataRenderedEvent>();
  @Output() displayedColumnsChanged = new EventEmitter<DisplayedColumnsChangedEvent>();
  @Output() cellValueChanged = new EventEmitter<CellValueChangedEvent>();
  @Output() rowAction = new EventEmitter<{ action: string; data: any; node: any }>();
  @Output() columnMoved = new EventEmitter<any>();
  @Output() columnVisible = new EventEmitter<any>();
  @Output() rowGroupOpened = new EventEmitter<any>();

  // ============ 编辑 Inputs ============
  @Input() enableCellEdit: boolean = false;
  @Input() editOnDoubleClick: boolean = true;
  @Input() editOnClick: boolean = false;
  @Input() singleClickEdit: boolean = false;

  // ============ 填充手柄 Inputs ============
  @Input() enableFillHandle: boolean = false;

  // ============ 列固定 Inputs ============
  @Input() pinnedLeftColumns: string[] = [];
  @Input() pinnedRightColumns: string[] = [];

  // ============ 分页 Inputs ============
  @Input() pagination: boolean = false;
  @Input() paginationPageSize: number = 20;
  @Input() paginationPageSizeOptions: number[] = [10, 20, 50, 100];

  // ============ 拖拽排序 Inputs ============
  @Input() rowDragEnabled: boolean = false;
  @Input() rowDragMultiRow: boolean = false;
  @Input() colDragEnabled: boolean = false;

  // 单元格合并
  @Input() enableCellSpan: boolean = false;
  @Input() cellSpanConfig: { autoMerge?: boolean; mergeColumns?: string[] } | null = null;

  // ============ Excel 导入 Inputs ============
  /** 启用 xlsx 拖拽导入功能 */
  @Input() enableExcelImport: boolean = false;

  // ============ ViewChild ============
  @ViewChild('gridContainer') gridContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('headerContainer') headerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('bodyContainer') bodyContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('virtualScroll') virtualScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('rowsContainer') rowsContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('pinnedLeftContainer') pinnedLeftContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('pinnedTopContainer') pinnedTopContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('pinnedBottomContainer') pinnedBottomContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('footerContainer') footerContainer!: ElementRef<HTMLDivElement>;
  // 中间固定列容器（动态创建，不通过模板）
  pinnedCenterContainerEl: HTMLElement | null = null;
  @ViewChild('dragOverlay') dragOverlay!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fillHandle') fillHandleEl!: ElementRef<HTMLDivElement>;

  // ============ Signals ============
  rowCount = signal(0);
  viewportInfo = signal<{ startIndex: number; endIndex: number; offsetY: number }>({
    startIndex: 0, endIndex: 0, offsetY: 0,
  });
  pinnedLeftColumnIds = signal<string[]>([]);
  pinnedCenterColumnIds = signal<string[]>([]);
  hasPinnedTopRows = computed(() => this.rowPinningService?.getPinnedTopRows().length > 0);
  hasPinnedBottomRows = computed(() => this.rowPinningService?.getPinnedBottomRows().length > 0);
  themeClass = computed(() => `db-grid-theme-${this.theme()}`);

  // ============ Overlay computed signals ============
  /** 是否显示 loading overlay（向后兼容 @Input loading + OverlayService） */
  shouldShowLoadingOverlay = computed(() => {
    const overlay = this.overlayService.overlayConfig();
    if (overlay?.type === 'loading') return true;
    if (overlay?.type === 'custom') return false; // custom overlay 单独渲染
    return this.loading; // 向后兼容
  });
  /** 是否显示 noRows overlay */
  shouldShowNoRowsOverlay = computed(() => {
    const overlay = this.overlayService.overlayConfig();
    if (overlay?.type === 'noRows') return true;
    if (overlay?.type === 'loading' || overlay?.type === 'custom') return false;
    return this.rowCount() === 0; // 向后兼容
  });
  /** loading overlay 消息 */
  overlayLoadingMessage = computed(() => {
    const overlay = this.overlayService.overlayConfig();
    if (overlay?.type === 'loading' && overlay.message) return overlay.message;
    return this.loadingMessage || this.i18nService.t('grid.loading');
  });
  /** noRows overlay 消息 */
  overlayNoRowsMessage = computed(() => {
    const overlay = this.overlayService.overlayConfig();
    if (overlay?.type === 'noRows' && overlay.message) return overlay.message;
    return this.noRowsMessage || this.i18nService.t('grid.noRows');
  });
  /** loading overlay 进度 */
  overlayProgress = computed(() => {
    const overlay = this.overlayService.overlayConfig();
    if (overlay?.type === 'loading') return overlay.progress;
    return undefined;
  });

  // ============ Services ============
  private dataService: DataService;
  private columnService: ColumnService;
  private selectionService: SelectionService;
  // 防止行 checkbox change 触发重复 selectAll 的 guard
  private isSelectingAll = false;
  private treeService: TreeService;
  private groupService: GroupService;
  private excelExportService: ExcelExportService;
  private excelImportService: ExcelImportService;
  private pdfExportService: PdfExportService;
  private cellSpanService: CellSpanService;
  private chartsService: ChartsService;
  private cellRenderer: CellRendererService;
  private rowRenderer: RowRendererService;
  private headerRenderer: HeaderRendererService;

  // ============ 新增服务 ============
  private cellEditService: CellEditService;
  private pinningService: ColumnPinningService;
  private paginationService: PaginationService;
  private contextMenuService: ContextMenuService;
  private columnMenuService: ColumnMenuService;
  private dragDropService: DragDropService;
  private rowDragService: RowDragService;
  private crossGridDragService: CrossGridDragService;
  private _crossGridDragId = 'default';
  private filterService: FilterService;
  private editorService: EditorService;
  private cellDataTypeService: CellDataTypeService;
  private keyboardNavigationService: KeyboardNavigationService;
  private accessibilityService: AccessibilityService;
  private aggregationService: AggregationService;
  private rangeSelectionService: RangeSelectionService;
  private sidebarService: SideBarService;
  private statusBarService: StatusBarService;
  private masterDetailService: MasterDetailService;
  private undoRedoService: UndoRedoService;
  private serverSideService: ServerSideService;
  private pivotService: PivotService;
  private i18nService: I18nService;
  private clipboardService: ClipboardService;
  private columnTypeService: ColumnTypeService;
  overlayService: OverlayService;
  private tooltipService: TooltipService;
  private externalFilterService: ExternalFilterService;
  private advancedFilterService: AdvancedFilterService;
  private valueMappingService: ValueMappingService;
  private rowPinningService: RowPinningService;
  private transactionService: TransactionService;
  private _dataTypesApplied = false;

  // ============ State ============
  private destroy$ = new Subject<void>();
  private scrollTop = 0;
  private scrollLeft = 0;
  private isDestroyed = false;
  private gridApi: any = null;
  private isTreeMode = false;
  private isGroupMode = false;
  private isPivotMode = false;
  private originalColumnDefs: any[] | null = null;
  private isPaginated = false;
  // 列虚拟化
  private lastColRenderScrollLeft = -1;
  private colVirtualBuffer = 3;

  // Grid Menu
  gridMenuVisible = signal<boolean>(false);
  gridMenuPosition = signal<{x: number; y: number}>({x: 0, y: 0});
  gridMenuItems = signal<ColumnMenuItemType[]>([]);
  private gridMenuColId = '';

  // ============ Fill Handle State ============
  fillHandleVisible = signal<boolean>(false);
  fillHandlePosition = signal<{x: number; y: number}>({x: 0, y: 0});
  private isDraggingFillHandle = false;
  private fillHandleDragStart = { rowIndex: -1, colId: '' };
  private fillHandleDragCurrent = { rowIndex: -1, colId: '' };
  private fillPreviewRanges: any[] = [];
  private _pendingRefresh = false; // 标记是否需要在视图就绪后重试刷新

  // ============ Chart Panel State ============
  chartPanelVisible = signal<boolean>(false);
  private currentChartId: string | null = null;
  private currentChartRangeData: any[][] | null = null;
  private currentChartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' = 'bar';

  // ============ Filter Popup State ============
  activeFilterPopup: { colDef: ColDef; position: { x: number; y: number } } | null = null;

  // ============ Cell Editor State ============
  activeCellEditor: {
    value: any;
    editorType: any;
    editorParams: any;
  } | null = null;

  constructor(
    private elementRef: ElementRef,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    // 核心服务
    this.dataService = new DataService();
    this.columnService = new ColumnService();
    this.selectionService = new SelectionService();
    this.treeService = new TreeService();
    this.aggregationService = new AggregationService();
    this.groupService = new GroupService(this.aggregationService);
    this.excelExportService = new ExcelExportService();
    this.excelImportService = new ExcelImportService();
    this.pdfExportService = new PdfExportService();
    this.cellSpanService = new CellSpanService();
    this.chartsService = new ChartsService();
    this.cellRenderer = new CellRendererService(this.columnService);
    this.rowRenderer = new RowRendererService(this.cellRenderer, this.columnService);
    
    // 设置树形切换回调
    this.rowRenderer.onTreeToggle = (node: RowNode) => {
      this.onTreeNodeToggled(node);
    };
    this.headerRenderer = new HeaderRendererService(this.columnService);

    // 新增服务
    this.cellEditService = new CellEditService();
    this.pinningService = new ColumnPinningService();
    this.paginationService = new PaginationService();
    this.contextMenuService = new ContextMenuService();
    this.columnMenuService = new ColumnMenuService();
    this.dragDropService = new DragDropService();
    this.rowDragService = new RowDragService();
    this.crossGridDragService = new CrossGridDragService();
    this.filterService = new FilterService();
    this.editorService = new EditorService();
    this.cellDataTypeService = new CellDataTypeService();
    this.keyboardNavigationService = new KeyboardNavigationService();
    this.accessibilityService = new AccessibilityService();
    this.clipboardService = new ClipboardService();
    this.rangeSelectionService = new RangeSelectionService(this.clipboardService);
    this.sidebarService = new SideBarService();
    this.statusBarService = new StatusBarService();
    this.masterDetailService = new MasterDetailService();
    this.undoRedoService = new UndoRedoService();
    this.serverSideService = new ServerSideService();
    this.pivotService = new PivotService();
    this.i18nService = new I18nService();
    this.overlayService = new OverlayService();
    this.tooltipService = new TooltipService();
    this.externalFilterService = new ExternalFilterService();
    this.valueMappingService = new ValueMappingService();
    this.advancedFilterService = new AdvancedFilterService();
    this.rowPinningService = new RowPinningService();
    this.transactionService = new TransactionService();
    // 初始化行固定数据（从 @Input）
    if (this.pinnedTopRowData.length > 0 || this.pinnedBottomRowData.length > 0) {
      this.rowPinningService.initialize({
        pinnedTopRowData: this.pinnedTopRowData,
        pinnedBottomRowData: this.pinnedBottomRowData,
      });
    }
    this.columnTypeService = new ColumnTypeService();
    this.i18nService.setLocale(this.locale);
  }

  // ============ Lifecycle ============

  /** Apply column types + defaultColDef and initialize column service */
  private initializeColumns(colDefs?: ColDef[]): void {
    const defs = colDefs || this.columnDefs;
    // Register custom column types if provided
    if (this.columnTypes) {
      this.columnTypeService.registerColumnTypes(this.columnTypes);
    }
    // Resolve defaultColDef from input or gridOptions
    const resolvedDefault = this.defaultColDef || this.gridOptions?.defaultColDef;
    // Apply column types + defaultColDef
    const appliedDefs = this.columnTypeService.applyColumnTypes(defs, resolvedDefault);
    this.columnDefs = appliedDefs;
    this.columnService.initialize(appliedDefs);
    this.pinnedLeftColumnIds.set(this.pinningService.getPinnedLeftIds());
  }

  ngOnInit(): void {

    // 初始化列服务
    this.initializeColumns();
    // pinnedLeftColumnIds is set inside initializeColumns, so no need to set it again
    // this.pinnedLeftColumnIds.set(this.pinningService.getPinnedLeftIds());
    this.dataService.setScrollConfig({ rowHeight: this.rowHeight, viewportHeight: 400, bufferSize: 5 });
    // 注入筛选服务（支持列筛选 + 快速筛选）
    this.dataService.setFilterService(this.filterService);

    // Wire external filter service into data service filtering
    this.dataService.setExternalFilterService(this.externalFilterService);

    // Wire row pinning service into data service
    this.dataService.setRowPinningService(this.rowPinningService);

    // 订阅快速筛选输入（防抖 200ms）
    this.quickFilterSubject.pipe(
      debounceTime(200),
      takeUntil(this.destroy$)
    ).subscribe((value: string) => {
      this.filterService.setQuickFilter(value);
      // 同步到 cellRenderer 用于高亮
      this.cellRenderer.setQuickFilterText(value);
      this.refreshView();
      this.filterChanged.emit({ type: 'filterChanged', api: this.gridApi });
    });

    // 自动推断列数据类型（Cell Data Types）
    if (this.rowData && this.rowData.length > 0) {
      this.cellDataTypeService.applyAutoTypes(this.columnDefs, this.rowData, this.gridOptions);
      // 重新初始化列服务（类型推断可能修改了 columnDefs）
      this.initializeColumns();
    }

    // 初始化主从表服务
    if (this.masterDetail || (this.gridOptions as any)?.masterDetail) {
      this.masterDetailService.initialize({ masterDetail: true, detailRowAutoHeight: true, detailRowHeight: 200 });
    }

    // 注册主从表回调（展开/折叠时触发重绘）
    this.masterDetailService.onDetailExpandedEvent((event: any) => {
      this.ngZone.run(() => this.renderRows());
    });
    this.masterDetailService.onDetailCollapsedEvent((event: any) => {
      this.ngZone.run(() => this.renderRows());
    });

    // 初始化选择服务
    const rowSelection = this.gridOptions.rowSelection || this.rowSelection || 'single';
    this.selectionService.initialize({ mode: rowSelection as any, multiSortKey: this.gridOptions.multiSortKey === 'ctrl' });

    // 选择事件 — 同步更新行元素的选中样式
    this.selectionService.setOnSelectionChanged((event) => {
      this.ngZone.run(() => {
        this.updateSelectionStyles();
        this.updateSelectAllCheckboxState();
        this.selectionChanged.emit({ type: 'selectionChanged', source: 'api', api: this.gridApi });
      });
    });

    // 树形数据事件
    this.treeService.setOnExpandChange((event) => {
      this.ngZone.run(() => {
        if (event.type === 'expand') this.nodeExpanded.emit({ type: 'nodeExpanded', node: event.node, nodes: event.nodes });
        else this.nodeCollapsed.emit({ type: 'nodeCollapsed', node: event.node, nodes: event.nodes });
        this.refreshView();
      });
    });

    // 分组事件
    this.groupService.setOnGroupChange((event) => {
      this.ngZone.run(() => {
        if (event.type === 'groupOpened') this.groupExpanded.emit({ type: 'groupExpanded', node: event.groupNode });
        else if (event.type === 'groupClosed') this.groupCollapsed.emit({ type: 'groupCollapsed', node: event.groupNode });
        this.refreshView();
      });
    });

    // 初始化编辑服务
    this.cellEditService.initialize({
      enableCellEdit: this.enableCellEdit,
      editOnDoubleClick: this.editOnDoubleClick,
      editOnClick: this.editOnClick,
      singleClickEdit: this.singleClickEdit,
    });

    // 初始化列固定服务
    this.pinningService.initialize(this.columnDefs, {
      pinnedLeftColumns: this.pinnedLeftColumns,
      pinnedRightColumns: this.pinnedRightColumns,
    });

    // 初始化分页服务
    this.paginationService.initialize({
      pageSize: this.paginationPageSize,
      pageSizeOptions: this.paginationPageSizeOptions,
    });
    this.paginationService.onPageChanged((info) => {
      this.ngZone.run(() => this.refreshView());
    });

    // 初始化右键菜单服务
    this.contextMenuService.initialize(this.contextMenuService.getDefaultMenuItems('grid'));

    // 初始化拖拽服务
    this.dragDropService.initialize({
      rowDragEnabled: this.rowDragEnabled,
      rowDragMultiDrag: this.rowDragMultiRow,
      colDragEnabled: this.colDragEnabled,
    });
    this.rowDragService.initialize({
      rowDragEnabled: this.rowDragEnabled,
      rowDragMultiRow: this.rowDragMultiRow,
    });

    // 订阅固定行变更事件
    this.rowPinningService.onPinnedRowsChanged(() => {
      this.ngZone.run(() => this.renderPinnedRows());
    });

    // 初始化服务端行模型
    if (this.enableServerSide) {
      console.log('[DBGrid] initServerSideService', {
        hasServerSideDatasource: !!this.serverSideDatasource,
        datasourceHasGetRows: !!(this.serverSideDatasource && this.serverSideDatasource.getRows),
        enableServerSide: this.enableServerSide,
      });
      this.serverSideService.initialize(this.serverSideConfig ?? {});
      this.serverSideService.onRowsUpdatedEvent(() => {
        console.log('[DBGrid] serverSide onRowsUpdatedEvent - callback fired');
        const ssRowCount = this.serverSideService.getRowCount();
        console.log('[DBGrid] serverSide onRowsUpdatedEvent', { ssRowCount, viewReady: !!(this.bodyContainer?.nativeElement) });
        // 使用 ngZone.run 确保 Angular 感知 signal 变更并触发变更检测
        this.ngZone.run(() => {
          this.rowCount.set(ssRowCount);
          this.refreshView();
          this.cdr.detectChanges();
          console.log('[DBGrid] serverSide onRowsUpdatedEvent - refresh completed', { ssRowCount });
        });
      });
      // 注册加载状态回调，显示/隐藏 loading overlay
      this.serverSideService.onLoadingChangedEvent((loading: boolean) => {
        console.log('[DBGrid] serverSide loading changed:', loading);
        this.ngZone.run(() => {
          if (loading) {
            this.overlayService.showLoading();
          } else {
            this.overlayService.hide();
          }
        });
      });
      // 注意：setDatasource 移至 ngAfterViewInit，确保视图先初始化
    }

    this.rowCount.set(this.dataService.getRowCount());
    this.createGridApi();
  
    // 设置 selectionService 的回调，用于 isAllSelected 模式获取所有行ID
    this.selectionService.setGetAllRowIdsCallback(
      (index: number) => {
        // 优先从 serverSideService 获取数据
        if (this.enableServerSide && this.serverSideService?.isEnabled()) {
          const row = this.serverSideService.getRow(index);
          return row ? (row.id !== undefined ? String(row.id) : `row-${index}`) : null;
        }
        // 降级：从 DOM 获取
        const rowsContainer = this.rowsContainer?.nativeElement;
        if (rowsContainer) {
          const rowEl = rowsContainer.querySelectorAll('.db-grid-row')[index];
          return (rowEl as HTMLElement)?.dataset?.['rowId'] || null;
        }
        return null;
      },
      () => {
        if (this.enableServerSide && this.serverSideService?.isEnabled()) {
          return this.serverSideService.getRowCount();
        }
        return this.rowCount?.() ?? 0;
      }
    );
}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rowData'] && !changes['rowData'].firstChange) {
      this.setRowData(changes['rowData'].currentValue);
    }
    if (changes['columnDefs'] && !changes['columnDefs'].firstChange) {
      this.initializeColumns(changes['columnDefs'].currentValue);
      this.refreshHeader();
    }
    // 语言变更
    if (changes['locale'] && !changes['locale'].firstChange) {
      this.i18nService?.setLocale(this.locale);
      this.refreshHeader();
      this.renderRows();
    }
    // 快速筛选文本变更
    if (changes['quickFilterText'] && !changes['quickFilterText'].firstChange) {
      this.filterService.setQuickFilter(this.quickFilterText());
      this.refreshView();
      this.filterChanged.emit({ type: 'filterChanged', api: this.gridApi });
    }
    // 编辑配置变更
    if (changes['enableCellEdit'] && !changes['enableCellEdit'].firstChange) {
      this.cellEditService.initialize({
        enableCellEdit: this.enableCellEdit,
        editOnDoubleClick: this.editOnDoubleClick,
        editOnClick: this.editOnClick,
      });
    }
    // 列固定配置变更
    if (changes['pinnedLeftColumns'] || changes['pinnedRightColumns']) {
      this.pinningService.initialize(this.columnDefs, {
        pinnedLeftColumns: this.pinnedLeftColumns,
        pinnedRightColumns: this.pinnedRightColumns,
      });
      this.refreshHeader();
    }
    // 分页配置变更
    if (changes['pagination'] || changes['paginationPageSize']) {
      if (this.pagination) {
        this.isPaginated = true;
        this.paginationService.setPageSize(this.paginationPageSize);
      } else {
        this.isPaginated = false;
      }
      this.refreshView();
    }
    // 行固定数据变更
    if (changes['pinnedTopRowData'] || changes['pinnedBottomRowData']) {
      this.rowPinningService.initialize({
        pinnedTopRowData: this.pinnedTopRowData,
        pinnedBottomRowData: this.pinnedBottomRowData,
      });
      this.renderPinnedRows();
    }
    // 拖拽配置变更
    if (changes['rowDragEnabled'] || changes['colDragEnabled'] || changes['rowDragMultiRow']) {
      this.dragDropService.initialize({
        rowDragEnabled: this.rowDragEnabled,
        rowDragMultiDrag: this.rowDragMultiRow,
        colDragEnabled: this.colDragEnabled,
      });
      this.rowDragService.initialize({
        rowDragEnabled: this.rowDragEnabled,
        rowDragMultiRow: this.rowDragMultiRow,
      });
    }
    // 透视配置变更
    if (changes['pivotMode'] || changes['pivotColumn'] || changes['pivotRowGroupColumns'] || changes['pivotValueColumns']) {
      if (this.rowData && this.rowData.length > 0) {
        if (this.pivotMode) {
          this.setRowData(this.rowData);
        } else if (this.isPivotMode) {
          // 透视清除：恢复原始 columnDefs 和数据
          this.isPivotMode = false;
          this.columnDefs = this.originalColumnDefs || this.columnDefs;
          this.initializeColumns();
          this.pivotService.disablePivotMode();
          this.setRowData(this.rowData);
        }
      }
    }

    // 分组配置变更
    if ((changes['enableGrouping'] || changes['groupConfig']) && !changes['enableGrouping']?.firstChange) {
      if (this.enableGrouping && this.groupConfig && this.rowData && this.rowData.length > 0) {
        this.setRowData(this.rowData);
      }
    }

    // 单元格合并配置变更
    if ((changes['enableCellSpan'] || changes['cellSpanConfig']) && !changes['enableCellSpan']?.firstChange) {
      if (this.enableCellSpan && this.rowData && this.rowData.length > 0) {
        this.setRowData(this.rowData);
      }
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Guard: ensure ViewChildren are initialized before accessing them
    if (!this.bodyContainer?.nativeElement) {
      console.log('[DBGrid] ngAfterViewInit skipped: bodyContainer not initialized');
      return;
    }
    
    const bodyHeight = this.bodyContainer.nativeElement.clientHeight;
    this.dataService.setScrollConfig({ viewportHeight: bodyHeight, rowHeight: this.rowHeight });

    // 初始化数据服务（即使 rowData 为空也要初始化，确保 grid 状态正确）
    console.log('[DBGrid] ngAfterViewInit setRowData', { rowData: this.rowData?.length, enableGrouping: this.enableGrouping, groupConfig: !!this.groupConfig });
    this.setRowData(this.rowData || []);

    // 初始化 viewportInfo（确保在 renderRows 之前）
    this.viewportInfo.set(this.dataService.getViewportInfo());

    this.renderHeader();
    this.renderRows();

    // 确保选择服务用最新的 rowSelection 值初始化
    const rowSel = this.gridOptions.rowSelection || this.rowSelection || 'single';
    this.selectionService.initialize({ mode: rowSel as any, multiSortKey: this.gridOptions.multiSortKey === 'ctrl' });

    if (this.pagination) {
      this.renderFooter();
    }

    // ========== 服务端模式：视图就绪后发起数据请求 ==========
    // 将 setDatasource 从 ngOnInit 移至 ngAfterViewInit，确保视图先初始化
    // 这样当数据到达时，refreshView 不会被跳过
    if (this.enableServerSide && this.serverSideDatasource && this.serverSideService.isEnabled()) {
      console.log('[DBGrid] ngAfterViewInit: calling setDatasource (view now ready)');
      this.serverSideService.setDatasource(this.serverSideDatasource);
      // 保底轮询：确保数据被渲染（最多重试 20 次，每 100ms 一次）
      let pollCount = 0;
      const pollInterval = setInterval(() => {
        pollCount++;
        const currentRowCount = this.serverSideService.getRowCount();
        console.log(`[DBGrid] server-side poll #${pollCount}`, { currentRowCount });
        if (currentRowCount > 0) {
          this.rowCount.set(currentRowCount);
          this.refreshView();
          console.log('[DBGrid] server-side poll: data rendered', { currentRowCount });
          clearInterval(pollInterval);
        } else if (pollCount >= 20) {
          console.log('[DBGrid] server-side poll: giving up after 20 attempts');
          clearInterval(pollInterval);
        }
      }, 100);
    } else if (this._pendingRefresh) {
      // 非 server-side 模式下，如果有待刷新的标记，也执行刷新
      console.log('[DBGrid] ngAfterViewInit: pending refresh detected, refreshing view');
      this.refreshView();
    }

    // ========== 初始化 Accessibility Service ==========
    if (this.gridContainer?.nativeElement) {
      this.accessibilityService.setGridElement(this.gridContainer.nativeElement);

      // 订阅焦点变化事件，播报焦点位置
      this.keyboardNavigationService.onFocusChange.subscribe(event => {
        this.ngZone.run(() => {
          this.onFocusChanged(event.current);
          const colIndex = this.columnService.getVisibleColumns().findIndex(
            c => (c.colId || c.field) === event.current.colId
          );
          const value = this.dataService.getRowData(event.current.rowIndex)?.[event.current.colId];
          this.accessibilityService.announceFocus(event.current.rowIndex, event.current.colId, value);
        });
      });
    }

    // ========== 初始化 Keyboard Navigation Service ==========
    if (this.gridContainer?.nativeElement) {
      this.keyboardNavigationService.setGrid(
        this.gridApi,
        this.gridContainer.nativeElement,
        this.columnService,
        this.rowRenderer
      );
      this.keyboardNavigationService.setRowHeight(this.rowHeight);
      // Wire Ctrl+Z / Ctrl+Y undo/redo shortcuts
      this.keyboardNavigationService.setUndoRedoService(this.undoRedoService);
      // 订阅焦点变化事件
      this.keyboardNavigationService.onFocusChange.subscribe(event => {
        this.ngZone.run(() => this.onFocusChanged(event.current));
      });
      // 订阅编辑事件
      this.keyboardNavigationService.onCellEditStart.subscribe(pos => {
        this.ngZone.run(() => this.startEditingCell(pos.rowIndex, pos.colId));
      });
      this.keyboardNavigationService.onCellEditStop.subscribe(() => {
        this.ngZone.run(() => this.stopEditingCell(true));
      });
      // 默认聚焦第一个单元格
      setTimeout(() => this.keyboardNavigationService.focusFirstCell(), 0);
    }

    this.ngZone.runOutsideAngular(() => {
      fromEvent(window, 'resize')
        .pipe(debounceTime(100), takeUntil(this.destroy$))
        .subscribe(() => this.onWindowResize());
    });

    // ========== 初始化 Range Selection Service ==========
    this.initRangeSelection();

    // ========== 初始化 Excel 导入拖拽事件 ==========
    if (this.enableExcelImport && this.gridContainer?.nativeElement) {
      this.ngZone.runOutsideAngular(() => {
        fromEvent(this.gridContainer.nativeElement, 'dragover')
          .pipe(takeUntil(this.destroy$))
          .subscribe((e: any) => this.onDragOver(e));
        fromEvent(this.gridContainer.nativeElement, 'dragleave')
          .pipe(takeUntil(this.destroy$))
          .subscribe((e: any) => this.onDragLeave(e));
        fromEvent(this.gridContainer.nativeElement, 'drop')
          .pipe(takeUntil(this.destroy$))
          .subscribe((e: any) => this.onDrop(e));
      });
    }

    this.ngZone.run(() => {
      this.gridReady.emit({ type: 'gridReady', api: this.gridApi, columnApi: null });
    });

    // ============ 动态创建中间固定列容器 ============
    this.createPinnedCenterContainer();

    this.cdr.detectChanges();
  }

  // ============ 动态创建中间固定列容器 ============
  private createPinnedCenterContainer(): void {
    if (!this.bodyContainer?.nativeElement) return;
    const virtualScroll = this.bodyContainer.nativeElement.querySelector('.db-grid-virtual-scroll') as HTMLElement;
    if (!virtualScroll) return;
    if (this.pinnedCenterContainerEl) return; // 已创建
    const el = document.createElement('div');
    el.id = 'pinnedCenterContainer';
    el.className = 'db-grid-pinned-center';
    el.style.position = 'absolute';
    el.style.top = '0px';
    el.style.zIndex = '2';
    el.style.overflow = 'hidden';
    // 插入到 pinnedLeftContainer 之后（或 rowsContainer 之后）
    const pinnedLeft = virtualScroll.querySelector('.db-grid-pinned-left') as HTMLElement;
    if (pinnedLeft) {
      pinnedLeft.after(el);
    } else {
      const rowsContainer = virtualScroll.querySelector('.db-grid-rows') as HTMLElement;
      if (rowsContainer) rowsContainer.after(el);
      else virtualScroll.appendChild(el);
    }
    this.pinnedCenterContainerEl = el;
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    // 核心服务
    this.cellRenderer.destroy();
    this.rowRenderer.destroy();
    this.headerRenderer.destroy();
    this.treeService.destroy();
    this.groupService.destroy();
    this.cellSpanService.destroy();
    // 新增服务
    this.cellEditService.destroy();
    this.pinningService.destroy();
    this.paginationService.destroy();
    this.contextMenuService.destroy();
    this.dragDropService.destroy();
    this.keyboardNavigationService.destroy();
    this.accessibilityService.destroy();
    this.aggregationService.destroy();
    this.rangeSelectionService.destroy();
    this.sidebarService.destroy();
    this.statusBarService.destroy();
    this.masterDetailService.destroy();
    this.undoRedoService.destroy();
    this.columnTypeService.destroy();
    this.serverSideService.destroy();
    this.tooltipService.destroy();
    this.externalFilterService.destroy();
    this.valueMappingService.destroy();
  }

  // ============ Grid API ============

  private createGridApi(): void {
    this.gridApi = {
      // ========== 通用事件 ==========
      addEventListener: (eventType: string, handler: (event: any) => void) => {
        // 尝试通过 @Output 事件订阅
        const outputMap: Record<string, any> = {
          'gridReady': this.gridReady,
          'rowDataUpdated': this.rowDataUpdated,
          'modelUpdated': this.modelUpdated,
          'rowClicked': this.rowClicked,
          'rowDoubleClicked': this.rowDoubleClicked,
          'cellClicked': this.cellClicked,
          'cellDoubleClicked': this.cellDoubleClicked,
          'sortChanged': this.sortChanged,
          'filterChanged': this.filterChanged,
          'selectionChanged': this.selectionChanged,
          'columnResized': this.columnResized,
          'columnPinned': this.columnPinned,
          'viewportChanged': this.viewportChanged,
          'cellEditingStarted': this.cellEditingStarted,
          'cellEditingStopped': this.cellEditingStopped,
          'rowEditingStarted': this.rowEditingStarted,
          'rowEditingStopped': this.rowEditingStopped,
          'cellValueChanged': this.cellValueChanged,
          'gridSizeChanged': this.gridSizeChanged,
          'firstDataRendered': this.firstDataRendered,
          'displayedColumnsChanged': this.displayedColumnsChanged,
          'rowAction': this.rowAction,
          'columnMoved': this.columnMoved,
          'columnVisible': this.columnVisible,
          'rowGroupOpened': this.rowGroupOpened,
          'nodeExpanded': this.nodeExpanded,
          'nodeCollapsed': this.nodeCollapsed,
          'groupExpanded': this.groupExpanded,
          'groupCollapsed': this.groupCollapsed,
        };
        const output = outputMap[eventType];
        if (output) {
          output.subscribe(handler);
        }
      },
      removeEventListener: (eventType: string, handler: (event: any) => void) => {
        // Angular EventEmitter 不支持取消订阅单个 handler
        // 只能通过 unsubscribe 方法
        console.warn('[GridApi] removeEventListener: Angular EventEmitter 不支持单handler取消，请使用 unsubscribe()');
      },
      setRowData: (rowData: any[]) => this.setRowData(rowData),
      getRowData: () => this.getRowData(),
      applyTransaction: (transaction: RowDataTransaction) => this.applyTransaction(transaction),
      applyTransactionAsync: (transaction: RowDataTransaction, callback?: (result: TransactionResult) => void) => this.applyTransactionAsync(transaction, callback),
      setGridOption: (key: string, value: any) => this.setGridOption(key, value),
      getGridOption: (key: string) => this.getGridOption(key),

      // ========== 选择 ==========
      selectAll: () => this.selectAll(),
      deselectAll: () => this.deselectAll(),
      selectNode: (node: any, clearSelection?: boolean) => this.selectNode(node, clearSelection),
      deselectNode: (node: any) => this.deselectNode(node),
      getSelectedNodes: () => this.getSelectedNodes(),
      getSelectedRows: () => this.getSelectedRows(),
      getSelectedRowNodes: () => this.getSelectedRowNodes(),

      // ========== 排序 ==========
      sortByColumn: (colDef: ColDef, sortDirection?: 'asc' | 'desc') => this.sortByColumn(colDef, sortDirection),
      setSort: (field: string, direction: 'asc' | 'desc' | null) => this.setSort(field, direction),
      clearSort: () => this.clearSort(),

      // ========== 筛选 ==========
      setFilterModel: (model: Record<string, any>) => this.setFilterModel(model),
      getFilterModel: () => this.getFilterModel(),
      setQuickFilter: (text: string) => this.setQuickFilter(text),
      getQuickFilter: () => this.getQuickFilter(),
      clearQuickFilter: () => this.clearQuickFilter(),

      // ========== 视图 ==========
      refreshCells: (params?: any) => this.refreshCells(params),
      redrawRows: (params?: any) => this.refreshRows(params),
      sizeColumnsToFit: () => this.sizeColumnsToFit(),
      resetColumnState: () => this.resetColumnState(),

      // ========== 行 ==========
      getDisplayedRowCount: () => this.rowCount(),
      getDisplayedRows: () => this.getDisplayedRows(),
      getRowNode: (id: string) => this.dataService.getRowNode(id),
      forEachNode: (callback: (node: any) => void) => this.forEachNode(callback),

      // ========== 滚动 ==========
      ensureIndexVisible: (index: number, align?: string) => this.ensureIndexVisible(index, align),
      ensureNodeVisible: (node: any, align?: string) => this.ensureNodeVisible(node, align),
      ensureColumnVisible: (colId: string) => {
        // 横向滚动使指定列可见（列虚拟化模式下需要计算并滚动）
        if (!this.enableColVirtualization) return;
        const bodyWidth = this.bodyContainer?.nativeElement?.clientWidth || 800;
        const colRange = this.columnService.getVisibleColumnsInRange(this.scrollLeft, bodyWidth, this.colVirtualBuffer);
        const allCols = [...(colRange?.leftPinned || []), ...(colRange?.center || []), ...(colRange?.rightPinned || [])];
        const colIndex = allCols.findIndex(c => (c.colId || c.field) === colId);
        if (colIndex < 0) return;
        // 计算当前滚动位置中该列的左边界
        let offsetX = colRange?.offsetX || 0;
        for (let i = 0; i < colIndex; i++) {
          const col = allCols[i];
          offsetX += (this.columnService.getColumnState(col)?.width || 200);
        }
        const colWidth = this.columnService.getColumnState(allCols[colIndex])?.width || 200;
        // 如果列不在可见范围内，滚动到合适位置
        if (offsetX < this.scrollLeft) {
          this.bodyContainer.nativeElement.scrollLeft = offsetX;
        } else if (offsetX + colWidth > this.scrollLeft + bodyWidth) {
          this.bodyContainer.nativeElement.scrollLeft = offsetX + colWidth - bodyWidth;
        }
      },
      getColumnDef: (colId: string) => this.columnService.getColumn(colId) || this.columnDefs.find(c => (c.colId || c.field) === colId),
      getColumnTypeService: () => this.columnTypeService,
      getViewportInfo: () => this.viewportInfo(),

      // ========== 树形数据 ==========
      expandNode: (nodeId: string) => this.expandNode(nodeId),
      collapseNode: (nodeId: string) => this.collapseNode(nodeId),
      toggleNode: (nodeId: string) => this.toggleNode(nodeId),
      expandAll: () => this.expandAllNodes(),
      collapseAll: () => this.collapseAllNodes(),
      isNodeExpanded: (nodeId: string) => this.isNodeExpanded(nodeId),
      getNodeLevel: (nodeId: string) => this.getNodeLevel(nodeId),
      getTreeDataService: () => this.treeService,

      // ========== 行分组 ==========
      setRowGroupColumns: (fields: string[]) => this.setRowGroupColumns(fields),
      removeRowGroupColumns: (fields?: string[]) => this.removeRowGroupColumns(fields),
      expandGroup: (nodeId: string) => this.expandGroup(nodeId),
      collapseGroup: (nodeId: string) => this.collapseGroup(nodeId),
      toggleGroup: (nodeId: string) => this.toggleGroup(nodeId),
      expandAllGroups: () => this.expandAllGroups(),
      collapseAllGroups: () => this.collapseAllGroups(),
      getGroupService: () => this.groupService,

      // ========== 单元格合并 ==========
      getCellSpan: (rowIndex: number, colId: string) => this.getCellSpan(rowIndex, colId),
      setCellSpan: (rowIndex: number, colId: string, colspan: number, rowspan: number) => this.setCellSpan(rowIndex, colId, colspan, rowspan),
      getCellSpanService: () => this.cellSpanService,
      getAllSpans: () => this.cellSpanService.getAllSpans(),

      // ========== Cell Data Types ==========
      getCellDataTypeService: () => this.cellDataTypeService,
      getKeyboardNavigationService: () => this.keyboardNavigationService,
      getAccessibilityService: () => this.accessibilityService,
      getAggregationService: () => this.aggregationService,

      // ========== Excel 导出 ==========
      exportDataAsCsv: (params?: any) => this.exportDataAsCsv(params),
      exportDataAsPdf: (options?: any) => this.exportDataAsPdf(options),
      addChart: (containerId: string, config: any) => this.chartsService.createChart(containerId, config),
      destroyChart: (containerId: string) => this.chartsService.destroyChart(containerId),
      downloadExcel: (options?: any) => this.downloadExcel(options),
      importCsv: (csvText: string, options?: any) => this.importCsv(csvText, options),
      importExcelFile: (file: File) => this.importExcelFile(file),
      importExcelUrl: async (url: string) => {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], 'import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        return this.importExcelFile(file);
      },

      // ========== PDF 导出 ==========
      exportToPdf: (options?: any) => this.exportToPdf(options),

      // ========== 单元格编辑 ==========
      startCellEdit: (rowIndex: number, colId: string) => this.startCellEdit(rowIndex, colId),
      stopCellEdit: (cancel?: boolean) => this.stopCellEdit(cancel),
      getCellEditor: () => this.cellEditService,
      isCellEditing: () => this.isCellEditing(),

      // ========== 列固定 ==========
      pinColumn: (colId: string, side: 'left' | 'right') => this.pinColumn(colId, side),
      unpinColumn: (colId: string) => this.unpinColumn(colId),
      getPinnedColumns: () => this.getPinnedColumns(),
      getPinningService: () => this.pinningService,

      // ========== 行固定 ==========
      pinRow: (pinIndex: number, data: any, position?: 'top' | 'bottom') => this.rowPinningService.pinRow(pinIndex, data, position || 'top'),
      unpinRow: (pinIndex: number, position?: 'top' | 'bottom') => this.rowPinningService.unpinRow(pinIndex, position),
      getPinnedTopRows: () => this.rowPinningService.getPinnedTopRows(),
      getPinnedBottomRows: () => this.rowPinningService.getPinnedBottomRows(),
      getPinnedTopRowData: () => this.rowPinningService.getPinnedTopRowData(),
      getPinnedBottomRowData: () => this.rowPinningService.getPinnedBottomRowData(),
      clearPinnedRows: (position?: 'top' | 'bottom') => this.rowPinningService.unpinAll(position),
      hasPinnedRows: () => this.rowPinningService.hasPinnedRows(),
      getRowPinningService: () => this.rowPinningService,

      // ========== 分页 ==========
      setPageSize: (size: number) => this.setPageSize(size),
      setCurrentPage: (page: number) => this.setCurrentPage(page),
      getCurrentPage: () => this.getCurrentPage(),
      getTotalPages: () => this.getTotalPages(),
      nextPage: () => this.nextPage(),
      previousPage: () => this.previousPage(),
      firstPage: () => this.firstPage(),
      lastPage: () => this.lastPage(),
      getPaginationInfo: () => this.getPaginationInfo(),

      // ========== 右键菜单 ==========
      showContextMenu: (position: any, context: any) => this.showContextMenu(position, context),
      hideContextMenu: () => this.hideContextMenu(),
      getContextMenuService: () => this.contextMenuService,
      getColumnMenuService: () => this.columnMenuService,
      getI18nService: () => this.i18nService,
      showGridMenu: (colId: string, event: MouseEvent) => this.showColumnGridMenu(colId, event),
      hideGridMenu: () => this.closeGridMenu(),

      // ========== 范围选择 & 剪贴板 ==========
      copyToClipboard: (data?: any[], columns?: any[]) => this.copyToClipboard(data, columns),
      cutToClipboard: (data?: any[], columns?: any[]) => this.cutToClipboard(data, columns),
      pasteFromClipboard: () => this.pasteFromClipboard(),
      copySelectedRange: () => this.copySelectedRange(),
      pasteToGrid: (text?: string) => this.pasteToGrid(text),
      getRangeSelectionService: () => this.rangeSelectionService,

      // ========== 填充手柄 ==========
      fillHandle: (direction: 'down' | 'up' | 'left' | 'right', count?: number) => this.fillHandle(direction, count),

      // ========== 侧边栏 ==========
      showSidebar: (panelId?: string) => this.sidebarService.show(panelId),
      hideSidebar: () => this.sidebarService.hide(),
      toggleSidebar: (panelId?: string) => this.toggleSidebar(panelId),
      getSidebarService: () => this.sidebarService,

      // ========== 状态栏 ==========
      getStatusBarService: () => this.statusBarService,

      // ========== 主从表 ==========
      expandDetail: (nodeId: string, data?: any) => this.masterDetailService.expandDetail(nodeId, data),
      collapseDetail: (nodeId: string) => this.masterDetailService.collapseDetail(nodeId),
      toggleDetail: (nodeId: string, data?: any) => this.masterDetailService.toggleDetail(nodeId, data),
      isDetailExpanded: (nodeId: string) => this.masterDetailService.isDetailExpanded(nodeId),
      getMasterDetailService: () => this.masterDetailService,

      // ========== 撤销/重做 ==========
      undo: () => this.undo(),
      redo: () => this.redo(),
      canUndo: () => this.undoRedoService.canUndo(),
      canRedo: () => this.undoRedoService.canRedo(),
      getUndoRedoService: () => this.undoRedoService,

      // ========== 拖拽排序 ==========
      startDrag: (rowNodes: any[], event: MouseEvent) => this.startDrag(rowNodes, event),
      endDrag: (targetIndex: number, event: MouseEvent) => this.endDrag(targetIndex, event),
      getDragDropService: () => this.dragDropService,
      getRowDragService: () => this.rowDragService,
      getCrossGridDragService: () => this.crossGridDragService,

      // ========== 跨网格拖拽 ==========
      registerCrossGridDrag: (gridId: string) => {
        this._crossGridDragId = gridId;
        this.crossGridDragService.registerGrid(gridId, {
          getContainerElement: () => this.bodyContainer?.nativeElement as HTMLElement,
          getRowTop: (index: number) => index * this.rowHeight,
          getRowHeight: () => this.rowHeight,
          getRowCount: () => this.rowCount(),
          addRowAt: (index: number, data: any) => {
            this.dataService.addRow(data, index);
            this.renderRows();
          },
          removeRowData: (data: any) => {
            this.dataService.removeRowByData(data);
            this.renderRows();
          },
        });
      },
      unregisterCrossGridDrag: (gridId: string) => this.crossGridDragService.unregisterGrid(gridId),
      startCrossGridDrag: (rowNodes: any[], event?: DragEvent, options?: any) =>
        this.crossGridDragService.startCrossGridDrag(this._crossGridDragId || 'default', rowNodes, event, options),
      endCrossGridDrag: () => this.crossGridDragService.endCrossGridDrag(),
      isCrossGridDragging: () => this.crossGridDragService.isCurrentlyDragging(),

      // ========== 服务端行模型 ==========
      getServerSideService: () => this.serverSideService,
      refreshServerSide: () => this.serverSideService.refresh(),

      // ========== 刷新 ==========
      refreshView: () => this.refreshView(),

      // ========== Overlay ===========
      showLoadingOverlay: (message?: string) => this.showLoadingOverlay(message),
      showLoadingOverlayWithProgress: (message?: string, progress?: number) => this.showLoadingOverlayWithProgress(message, progress),
      hideOverlay: () => this.hideOverlay(),
      showNoRowsOverlay: (message?: string) => this.showNoRowsOverlay(message),
      showCustomOverlay: (template: string, cssClass?: string) => this.showCustomOverlay(template, cssClass),
      getOverlayService: () => this.overlayService,

      // ========== 图表 ===========
      chart: {
        showChartPanel: () => this.showChartPanel(),
        hideChartPanel: () => this.hideChartPanel(),
        setChartType: (type: string) => this.setChartType(type as any),
        getChartImageUrl: (format: 'png'|'svg') => this.getChartImageUrl(format),
      },

    };
  }

  // ============ 实现 ============

  // --- Overlay ---
  showLoadingOverlay(message?: string): void {
    this.overlayService.showLoading(message);
    this.cdr.detectChanges();
  }

  showLoadingOverlayWithProgress(message?: string, progress?: number): void {
    this.overlayService.showLoadingWithProgress(message, progress);
    this.cdr.detectChanges();
  }

  hideOverlay(): void {
    this.overlayService.hide();
    this.cdr.detectChanges();
  }

  showNoRowsOverlay(message?: string): void {
    this.overlayService.showNoRows(message);
    this.cdr.detectChanges();
  }

  showCustomOverlay(template: string, cssClass?: string): void {
    this.overlayService.showCustom(template, cssClass);
    this.cdr.detectChanges();
  }

  // --- 数据 ---
  setRowData(rowData: any[]): void {

    // 服务端模式下跳过本地数据处理
    if (this.enableServerSide) {
      this.rowCount.set(this.serverSideService.getRowCount());
      this.refreshView();
      this.rowDataUpdated.emit({ type: 'rowDataUpdated', api: this.gridApi });
      return;
    }

    // 首次加载数据时自动推断列类型
    if (rowData && rowData.length > 0 && !this._dataTypesApplied) {
      this.cellDataTypeService.applyAutoTypes(this.columnDefs, rowData, this.gridOptions);
      this._dataTypesApplied = true;
    }

    // 更新分页服务的总行数
    if (this.pagination) {
      this.paginationService.setTotalRows(rowData.length);
    }

    if (this.treeData && this.treeConfig) {
      this.isTreeMode = true;
      this.treeService.initialize(rowData, this.treeConfig);
      
      // 设置树模式渲染器配置
      const firstColumnField = this.columnDefs[0]?.field || null;
      this.cellRenderer.setTreeMode(true, firstColumnField);
      
      this.dataService.initialize(this.treeService.getFlattenedNodes().map(n => n.data), this.gridOptions, this.columnDefs);
      this.rowCount.set(this.treeService.getDisplayCount());
    } else if (this.enableGrouping && this.groupConfig) {
      console.log('[DBGrid] 分组模式初始化', { rowDataLength: rowData?.length, groupConfig: this.groupConfig });
      this.isGroupMode = true;
      this.groupService.initialize(rowData, this.groupConfig);
      const result = this.groupService.getResult();
      // 合并分组列
      if (result.groupColumnDefs.length > 0) {
        const existingIds = this.columnDefs.map(c => c.colId);
        const newCols = result.groupColumnDefs.filter(c => !existingIds.includes(c.colId!));
        this.columnDefs = [...result.groupColumnDefs, ...this.columnDefs];
        this.initializeColumns();
        this.refreshHeader();
      }
      // 使用 initializeNodes 传入展开后的扁平节点数组（只渲染展开状态的节点）
      const displayNodes = this.groupService.getFlattenedNodes();
      this.dataService.initializeNodes(displayNodes, this.gridOptions, this.columnDefs);
      this.rowCount.set(displayNodes.length);
      console.log('[DBGrid] 分组模式 rowCount:', this.groupService.getFlattenedNodes().length, 'flatNodes:', this.groupService.getResult().flatNodes.length);
    } else if (this.pivotMode && this.pivotColumn && this.pivotRowGroupColumns.length > 0) {
      // ========== 透视模式 ==========
      this.isPivotMode = true;
      // 保存原始列定义和数据，以便清除透视时恢复
      if (!this.originalColumnDefs) {
        this.originalColumnDefs = [...this.columnDefs];
      }
      this.dataService.setOriginalRowData(rowData);
      this.pivotService.initialize({
        enabled: true,
        pivotMode: true,
        pivotColumns: [this.pivotColumn],
        rowGroupColumns: this.pivotRowGroupColumns,
        valueColumns: this.pivotValueColumns.map(v => ({ field: v.field, aggFunc: v.aggFunc as any })),
      });
      const pivotResult = this.pivotService.compute(rowData);
      // 生成透视后的列定义
      const pivotColDefs = this.pivotService.getPivotColumnDefs();
      // 使用展平的透视结果初始化数据服务
      this.dataService.initialize(pivotResult.flatRows, this.gridOptions, pivotColDefs);
      // 更新 columnDefs 和 columnService，使 header 和 body 列定义一致
      this.columnDefs = pivotColDefs as any;
      this.initializeColumns();
      this.rowCount.set(pivotResult.flatRows.length);
    } else {
      this.isPivotMode = false;
      // 透视清除时恢复原始列定义
      if (this.dataService.getOriginalRowData && (this.dataService as any).getOriginalRowData()) {
        // columnDefs 仍为原始值，无需恢复
      }
      this.dataService.initialize(rowData, this.gridOptions, this.columnDefs);
      this.rowCount.set(this.dataService.getRowCount());
    }
    // 数据变化时重置滚动位置，确保新增行可见
    this.scrollTop = 0;
    if (this.bodyContainer?.nativeElement) {
      this.bodyContainer.nativeElement.scrollTop = 0;
    }
    // 初始化单元格合并服务
    if (this.enableCellSpan) {
      this.cellSpanService.initialize(this.columnDefs, rowData, {
        autoMerge: this.cellSpanConfig?.autoMerge ?? false,
        mergeColumns: this.cellSpanConfig?.mergeColumns ?? [],
      });
    }
    this.renderHeader();
    this.refreshView();
    this.rowDataUpdated.emit({ type: 'rowDataUpdated', api: this.gridApi });
  }

  getRowData(): any[] {
    if (this.isTreeMode) return this.treeService.getRootNodes().map(n => n.data);
    if (this.isGroupMode) return this.groupService['originalRowData'];
    // Fallback: iterate through all rows
    const rows: any[] = [];
    const count = this.dataService.getRowCount();
    for (let i = 0; i < count; i++) {
      const data = this.dataService.getRowData(i);
      if (data) rows.push(data);
    }
    return rows;
  }

  // ============ Transaction API（增量更新）============
  
  /**
   * 同步执行 Transaction — 增量添加/删除/更新行
   * 
   * AG Grid 兼容接口：api.applyTransaction(transaction)
   * 
   * @param transaction 增量操作对象
   * - add: 要添加的行数据（自动追加到末尾或指定 addIndex）
   * - remove: 要删除的行数据（根据 getRowId 匹配）
   * - update: 要更新的行数据（根据 getRowId 匹配）
   * @returns TransactionResult 实际变更结果
   */
  applyTransaction(transaction: RowDataTransaction): TransactionResult {
    const result: TransactionResult = {
      added: [],
      removed: [],
      updated: [],
      addedNodes: [],
      removedNodes: [],
      updatedNodes: [],
    };

    const getRowId = (data: any, index: number): string => {
      if (this.gridOptions?.getRowId) {
        return this.gridOptions.getRowId({ data, index });
      }
      return data.id !== undefined ? String(data.id) : `row-${index}`;
    };

    // 1. 处理删除
    if (transaction.remove?.length) {
      for (const data of transaction.remove) {
        const id = data.id !== undefined ? String(data.id) : this.findRowIdByData(data);
        if (id) {
          const node = this.dataService.getRowNode(id);
          if (node) {
            this.dataService.removeRow(id);
            result.removed.push(data);
            result.removedNodes.push(node);
          }
        }
      }
    }

    // 2. 处理添加
    if (transaction.add?.length) {
      const addIndex = transaction.addIndex ?? this.dataService.getRowCount();
      for (let i = 0; i < transaction.add.length; i++) {
        const data = transaction.add[i];
        this.dataService.addRow(data, addIndex + i);
        result.added.push(data);
        const id = getRowId(data, addIndex + i);
        const node = this.dataService.getRowNode(id);
        if (node) result.addedNodes.push(node);
      }
    }

    // 3. 处理更新
    if (transaction.update?.length) {
      for (const data of transaction.update) {
        const id = data.id !== undefined ? String(data.id) : this.findRowIdByData(data);
        if (id) {
          const node = this.dataService.getRowNode(id);
          if (node) {
            node.data = data;
            result.updated.push(data);
            result.updatedNodes.push(node);
          }
        }
      }
    }

    // 更新分页服务的总行数
    if (this.pagination) {
      this.paginationService.setTotalRows(this.dataService.getRowCount());
    }

    // 更新行数信号
    this.rowCount.set(this.dataService.getRowCount());

    // Delta 渲染：只刷新变化的行（而非全表重绘）
    if (result.addedNodes.length > 0 || result.removedNodes.length > 0 || result.updatedNodes.length > 0) {
      this.refreshView();
      // 触发 rowDataUpdated 事件
      this.rowDataUpdated.emit({ type: 'rowDataUpdated', api: this.gridApi });
    }

    return result;
  }

  /**
   * 异步批量执行 Transaction
   * 
   * AG Grid 兼容接口：api.applyTransactionAsync(transaction, callback)
   * 
   * 支持批量缓冲，减少重绘次数
   * 
   * @param transaction 增量操作对象
   * @param callback 完成后的回调函数
   */
  applyTransactionAsync(
    transaction: RowDataTransaction,
    callback?: (result: TransactionResult) => void
  ): void {
    // 委托给 TransactionService 处理批量缓冲
    this.transactionService.applyTransactionAsync(transaction, (result) => {
      // 实际执行仍然在 DbGrid 内部
      const syncResult = this.applyTransaction(transaction);
      callback?.(syncResult);
    });
  }

  /**
   * 查找行 ID（通过数据引用匹配）
   */
  private findRowIdByData(data: any): string | null {
    const count = this.dataService.getRowCount();
    for (let i = 0; i < count; i++) {
      const node = this.dataService.getRowNode(`row-${i}`);
      if (node?.data === data) {
        return node.id;
      }
    }
    return null;
  }

  // --- 排序 ---
  sortByColumn(colDef: ColDef, sortDirection?: 'asc' | 'desc'): void {
    const direction = sortDirection || (colDef.sort === 'asc' ? 'desc' : 'asc');
    colDef.sort = direction;
    this.dataService.sort(this.columnDefs);
    // 服务端模式：同时更新 serverSideService
    if (this.enableServerSide && this.serverSideService?.isEnabled()) {
      const sortModel = this.dataService.getSortModel();
      this.serverSideService.setSortModel(sortModel);
    }
    this.refreshView();
    this.sortChanged.emit({ type: 'sortChanged', colDef, column: colDef, columns: this.columnDefs, source: 'api', api: this.gridApi });
  }

  setSort(field: string, direction: 'asc' | 'desc' | null): void {
    const colDef = this.columnDefs.find(c => c.field === field);
    if (colDef) { 
      colDef.sort = direction; 
      this.dataService.sort(this.columnDefs); 
      // 服务端模式
      if (this.enableServerSide && this.serverSideService?.isEnabled()) {
        const sortModel = this.dataService.getSortModel();
        this.serverSideService.setSortModel(sortModel);
      }
      this.refreshHeader(); 
      this.refreshView(); 
    }
  }

  clearSort(): void { 
    this.columnDefs.forEach(c => c.sort = undefined); 
    this.dataService.sort(this.columnDefs); 
    // 服务端模式
    if (this.enableServerSide && this.serverSideService?.isEnabled()) {
      this.serverSideService.setSortModel([]);
    }
    this.refreshHeader(); 
    this.refreshView(); 
  }

  // --- 筛选 ---
  setFilterModel(model: Record<string, any>): void {
    this.filterService.setFilterModel(model);
    // 服务端模式：同时更新 serverSideService
    if (this.enableServerSide && this.serverSideService?.isEnabled()) {
      this.serverSideService.setFilterModel(model);
    }
    this.refreshView();
    this.filterChanged.emit({ type: 'filterChanged', api: this.gridApi });
  }

  getFilterModel(): Record<string, any> {
    return this.filterService.getFilterModel();
  }

  setQuickFilter(text: string): void {
    this.filterService.setQuickFilter(text);
    this.cellRenderer.setQuickFilterText(text);
    this.refreshView();
    this.filterChanged.emit({ type: 'filterChanged', api: this.gridApi });
  }

  getQuickFilter(): string {
    return this.filterService.getQuickFilter();
  }

  clearQuickFilter(): void {
    this.filterService.setQuickFilter('');
    this.cellRenderer.setQuickFilterText('');
    this.refreshView();
    this.filterChanged.emit({ type: 'filterChanged', api: this.gridApi });
  }

  // --- 视图 ---
  refreshCells(params?: any): void { this.renderRows(); }
  refreshRows(params?: any): void { this.refreshView(); }
  refreshView(): void {
    // Guard: skip if view is not yet initialized
    if (!this.bodyContainer?.nativeElement || !this.rowsContainer?.nativeElement || !this.virtualScroll?.nativeElement) {
      console.log('[DBGrid] refreshView skipped: view not initialized, setting _pendingRefresh = true');
      this._pendingRefresh = true;
      return;
    }
    this._pendingRefresh = false;
    // 服务端模式下，rowCount 由 onRowsUpdatedEvent 回调管理，不要覆盖
    if (!this.enableServerSide) {
      this.rowCount.set(this.dataService.getRowCount());
      this.viewportInfo.set(this.dataService.getViewportInfo());
    } else {
      // 服务端模式：使用 serverSideService 的行数来计算 viewport
      const ssRowCount = this.serverSideService.getRowCount();
      const viewportHeight = this.bodyContainer?.nativeElement?.clientHeight || 600;
      const scrollTop = this.scrollTop || 0;
      const startIndex = Math.floor(scrollTop / this.rowHeight);
      const visibleCount = Math.ceil(viewportHeight / this.rowHeight) + 1;
      const endIndex = Math.min(startIndex + visibleCount, ssRowCount);
      this.viewportInfo.set({
        startIndex,
        endIndex,
        offsetY: startIndex * this.rowHeight,
      });
    }
    this.renderRows();
  }

  /** 仅刷新行数据，保留滚动位置（用于编辑等场景） */
  refreshRowsOnly(): void {
    if (!this.bodyContainer?.nativeElement || !this.rowsContainer?.nativeElement || !this.virtualScroll?.nativeElement) return;
    this.renderRows();
  }

  sizeColumnsToFit(): void {
    const bodyWidth = this.bodyContainer.nativeElement.clientWidth;
    const visibleColumns = this.columnService.getVisibleColumns();
    const totalWidth = this.columnService.getTotalWidth();
    if (totalWidth === 0) return;
    const scale = bodyWidth / totalWidth;
    visibleColumns.forEach(colDef => { colDef.width = Math.floor((colDef.width || 200) * scale); });
    this.refreshHeader();
  }

  resetColumnState(): void { this.columnService.resetColumnState(); this.refreshHeader(); }

  // --- 行 ---
  getDisplayedRows(): any[] {
    const rows: any[] = [];
    for (let i = 0; i < this.dataService.getRowCount(); i++) {
      const data = this.dataService.getRowData(i);
      if (data) rows.push(data);
    }

    // 应用分页 - 临时禁用以便测试
    // if (this.pagination) {
    //   const pageInfo = this.paginationService.getPageInfo();
    //   if (pageInfo && pageInfo.totalRows > 0) {
    //     const startIndex = this.paginationService.getStartRowIndex();
    //     const endIndex = this.paginationService.getEndRowIndex();
    //     return rows.slice(startIndex, endIndex);
    //   }
    // }

    return rows;
  }

  forEachNode(callback: (node: any) => void): void {
    if (this.enableServerSide && this.serverSideService.isEnabled()) {
      const rowCount = this.serverSideService.getRowCount();
      for (let i = 0; i < rowCount; i++) {
        const data = this.serverSideService.getRow(i);
        if (data) {
          const rowId = data.id !== undefined ? String(data.id) : `row-${i}`;
          const isSelected = this.selectionService.isSelected({ id: rowId } as any);
          callback({
            id: rowId,
            data,
            rowIndex: i,
            selected: isSelected,
            isSelected: () => this.selectionService.isSelected({ id: rowId } as any),
          } as any);
        }
      }
    } else {
      for (let i = 0; i < this.dataService.getRowCount(); i++) {
        const node = this.dataService.getRowNode(`row-${i}`);
        if (node) callback(node);
      }
    }
  }


  // --- 滚动 ---
  ensureIndexVisible(index: number, align: string = 'auto'): void {
    const rowHeight = this.dataService.getRowHeight();
    const viewportHeight = this.bodyContainer.nativeElement.clientHeight;
    const currentScrollTop = this.bodyContainer.nativeElement.scrollTop;
    let targetScrollTop: number;

    switch (align) {
      case 'top': targetScrollTop = index * rowHeight; break;
      case 'bottom': targetScrollTop = index * rowHeight - viewportHeight + rowHeight; break;
      case 'middle': targetScrollTop = index * rowHeight - viewportHeight / 2; break;
      default:
        if (currentScrollTop > index * rowHeight) targetScrollTop = index * rowHeight;
        else if (currentScrollTop + viewportHeight < (index + 1) * rowHeight) targetScrollTop = (index + 1) * rowHeight - viewportHeight;
        else return;
    }
    this.bodyContainer.nativeElement.scrollTop = Math.max(0, targetScrollTop);
  }

  ensureNodeVisible(node: any, align: string = 'auto'): void {
    if (node.rowIndex !== undefined) this.ensureIndexVisible(node.rowIndex, align);
  }

  // ========== 树形数据 API ==========

  expandNode(nodeId: string): void { this.treeService.expandNode(nodeId); this.refreshView(); }
  collapseNode(nodeId: string): void { this.treeService.collapseNode(nodeId); this.refreshView(); }
  toggleNode(nodeId: string): void { this.treeService.toggleNode(nodeId); this.refreshView(); }
  expandAllNodes(): void { this.treeService.expandAll(); this.refreshView(); }
  collapseAllNodes(): void { this.treeService.collapseAll(); this.refreshView(); }
  isNodeExpanded(nodeId: string): boolean { const n = this.treeService.getNode(nodeId); return n?.expanded || false; }
  getNodeLevel(nodeId: string): number { const n = this.treeService.getNode(nodeId); return n?.level || 0; }

  /** 树节点展开/折叠切换回调 */
  private onTreeNodeToggled(node: RowNode): void {
    // 先切换 treeService 内部状态
    this.treeService.toggleNode(node.id);
    // 重新获取扁平化的节点数据
    const flattenedNodes = this.treeService.getFlattenedNodes();
    this.dataService.initialize(flattenedNodes.map(n => n.data), this.gridOptions, this.columnDefs);
    this.rowCount.set(this.treeService.getDisplayCount());
    this.refreshView();
  }

  // ========== 分组 API ==========

  setRowGroupColumns(fields: string[]): void {
    if (fields.length === 0) return;
    this.enableGrouping = true;
    this.groupConfig = { groupFields: fields, autoCreateGroupColumn: true, expandAll: true };
    this.setRowData(this.getRowData());
  }

  removeRowGroupColumns(fields?: string[]): void {
    this.enableGrouping = false;
    this.isGroupMode = false;
    this.refreshView();
  }

  expandGroup(nodeId: string): void { this.groupService.setGroupExpanded(nodeId, true); this.syncGroupNodes(); this.refreshView(); }
  collapseGroup(nodeId: string): void { this.groupService.setGroupExpanded(nodeId, false); this.syncGroupNodes(); this.refreshView(); }
  toggleGroup(nodeId: string): void { this.groupService.toggleGroup(nodeId); this.syncGroupNodes(); this.refreshView(); }
  expandAllGroups(): void { this.groupService.expandAll(); this.syncGroupNodes(); this.refreshView(); }
  collapseAllGroups(): void { this.groupService.collapseAll(); this.syncGroupNodes(); this.refreshView(); }

  /** 同步分组节点到 dataService（展开/折叠后刷新） */
  private syncGroupNodes(): void {
    const displayNodes = this.groupService.getFlattenedNodes();
    this.dataService.initializeNodes(displayNodes, this.gridOptions, this.columnDefs);
    this.rowCount.set(displayNodes.length);
  }

  // ========== 数据透视 API ==========
  setPivotMode(pivotColumn: string, rowGroupColumns: string[], valueColumns: { field: string; aggFunc: string }[]): void {
    this.pivotMode = true;
    this.pivotColumn = pivotColumn;
    this.pivotRowGroupColumns = rowGroupColumns;
    this.pivotValueColumns = valueColumns;
    this.setRowData(this.getRowData());
  }

  removePivotMode(): void {
    this.pivotMode = false;
    this.isPivotMode = false;
    this.pivotService.disablePivotMode();
    // 恢复原始数据
    const original = this.dataService.getOriginalRowData();
    if (original && original.length > 0) {
      this.dataService.initialize(original, this.gridOptions, this.columnDefs);
      this.rowCount.set(this.dataService.getRowCount());
    }
    this.refreshView();
  }

  getPivotResult(): any { return this.pivotService.getResult(); }

  // ========== 单元格合并 API ==========

  getCellSpan(rowIndex: number, colId: string): any { return this.cellSpanService.getSpan(rowIndex, colId); }
  setCellSpan(rowIndex: number, colId: string, colspan: number, rowspan: number): void {
    this.cellSpanService.setManualSpan(rowIndex, colId, colspan, rowspan);
    this.refreshRows(null);
  }

  // ========== Excel 导出 API ==========


  exportDataAsCsv(params?: any): string {
    const rows = params?.onlySelected ? this.getSelectedRows() : this.getDisplayedRows();
    return this.excelExportService.exportAsCsv(this.columnDefs, rows, params);
  }


  getDataAsCsv(params?: any): string {
    return this.exportDataAsCsv(params);
  }

  downloadExcel(options?: any): void {
    const exportMode = options?.exportMode || 'csv';
    if (exportMode === 'csv') {
      const rows = options?.onlySelected ? this.getSelectedRows() : this.getDisplayedRows();
      this.excelExportService.downloadAsCsv(this.columnDefs, rows, options);
    } else {
      this.excelExportService.downloadAsXlsx(this.columnDefs, this.getDisplayedRows(), options);
    }
  }


  // ========== HTML 导出 API (Phase 6.4) ==========


  /** 导出为 HTML 表格 */
  exportDataAsHtml(options?: any): string {
    const rows = options?.onlySelected ? this.getSelectedRows() : this.getDisplayedRows();
    return this.excelExportService.exportAsHtml(this.columnDefs, rows, options);
  }

  /** 下载为 HTML 文件 */
  downloadAsHtml(options?: any): void {
    const rows = options?.onlySelected ? this.getSelectedRows() : this.getDisplayedRows();
    this.excelExportService.downloadAsHtml(this.columnDefs, rows, options);
  }

  /** 获取纯文本 */
  getDataAsText(): string {
    return this.excelExportService.getDataAsText(this.columnDefs, this.getDisplayedRows());
  }

  importCsv(csvText: string, options?: any): any[] {
    return this.excelExportService.importCsv(csvText, options);
  }

  // ========== Excel 导入 API ==========
  onDragOver(event: DragEvent): void {
    if (!this.enableExcelImport) return;
    event.preventDefault();
    this.dragOverlay?.nativeElement?.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    this.dragOverlay?.nativeElement?.classList.remove('drag-over');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOverlay?.nativeElement?.classList.remove('drag-over');
    if (!this.enableExcelImport) return;
    const file = event.dataTransfer?.files[0];
    if (file) this.importExcelFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.importExcelFile(file);
    input.value = '';
  }

  async importExcelFile(file: File): Promise<ImportResult | null> {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('请选择 .xlsx 或 .xls 文件');
      return null;
    }
    try {
      const result = await this.excelImportService.parseFile(file);
      this.setRowData(result.rowData);
      console.log(`[DBGrid] 导入成功：${result.totalRows} 行 × ${result.totalCols} 列`);
      return result;
    } catch (err) {
      console.error('[DBGrid] Excel 导入失败:', err);
      alert('Excel 导入失败：' + (err as Error).message);
      return null;
    }
  }

  exportDataAsPdf(options?: any): void {
    const colDefs = this.columnService.getVisibleColumns();
    const rows = this.getDisplayedRows();
    this.pdfExportService.exportToPdf(colDefs, rows, options);
  }

  // ========== 单元格编辑 API ==========

  private editingCell: { rowIndex: number; colId: string; editor: any } | null = null;

  startCellEdit(rowIndex: number, colId: string): void {
    const data = this.dataService.getRowData(rowIndex);
    const colDef = this.columnDefs.find(c => (c.colId || c.field) === colId);
    if (!data || !colDef) return;

    const editorType = colDef.cellEditor || 'text';
    const editors = this.cellEditService.getDefaultEditors();
    const editorFactory = editors[editorType];

    if (editorFactory) {
      const params = { value: data[colDef.field], data, colDef, rowIndex };
      const editor = editorFactory.createEditor(params);
      this.editingCell = { rowIndex, colId, editor };
      this.refreshView();
    }
  }

  stopCellEdit(cancel = false): void {
    if (!this.editingCell) return;

    if (!cancel) {
      const { rowIndex, colId, editor } = this.editingCell;
      const newValue = editor.getValue();
      const data = this.dataService.getRowData(rowIndex);
      const colDef = this.columnDefs.find(c => (c.colId || c.field) === colId);

      if (data && colDef) {
        const oldValue = data[colDef.field];
        data[colDef.field] = newValue;
        this.cellEditService.emitCellValueChanged({ rowIndex, colDef, oldValue, newValue });
      }
    }

    this.editingCell?.editor.destroy();
    this.editingCell = null;
    this.refreshView();
  }

  isCellEditing(): boolean {
    return this.editingCell !== null;
  }

  // ========== 列固定 API ==========

  pinColumn(colId: string, side: 'left' | 'right'): void {
    this.pinningService.pinColumn(colId, side);
    this.refreshHeader();
  }

  unpinColumn(colId: string): void {
    this.pinningService.unpinColumn(colId);
    this.refreshHeader();
  }

  getPinnedColumns(): { left: string[]; right: string[] } {
    return {
      left: this.pinningService.getPinnedLeftIds(),
      right: this.pinningService.getPinnedRightIds(),
    };
  }

  // ========== 分页 API ==========

  setPageSize(size: number): void {
    this.paginationService.setPageSize(size);
    this.refreshView();
  }

  setCurrentPage(page: number): void {
    this.paginationService.goToPage(page);
    this.refreshView();
  }

  getCurrentPage(): number {
    return this.paginationService.getCurrentPage();
  }

  getTotalPages(): number {
    return this.paginationService.getTotalPages();
  }

  nextPage(): void { this.paginationService.nextPage(); this.refreshView(); }
  previousPage(): void { this.paginationService.previousPage(); this.refreshView(); }
  firstPage(): void { this.paginationService.firstPage(); this.refreshView(); }
  lastPage(): void { this.paginationService.lastPage(); this.refreshView(); }

  getPaginationInfo(): any {
    return this.paginationService.getPageInfo();
  }

  // ========== PDF 导出 ==========
  /** 导出当前数据为 PDF（通过 gridApi 调用） */
  exportToPdf(options?: any): void {
    const colDefs = this.columnDefs || [];
    const rowData = options?.allRows ? this.getRowData() : this.getSelectedRows();
    if (!rowData || rowData.length === 0) {
      console.warn('PDF Export: 没有可导出的数据');
      return;
    }
    this.pdfExportService.exportToPdf(colDefs, rowData, options);
  }

  /** 获取当前所有行数据（用于导出） */
  // ========== 右键菜单 API ==========

  showContextMenu(position: { x: number; y: number }, context: any): void {
    this.contextMenuService.show(position, context);
  }

  hideContextMenu(): void {
    this.contextMenuService.hide();
  }

  // ========== Grid Menu 方法 ==========

  /** 显示列头菜单 */
  showColumnGridMenu(colId: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.enableColumnMenu) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const gridRect = this.gridContainer.nativeElement.getBoundingClientRect();
    const x = rect.left - gridRect.left;
    const y = rect.bottom - gridRect.top;

    this.gridMenuColId = colId;
    this.columnMenuService.initialize(this.columnDefs);
    const items = this.columnMenuService.getGeneralMenuItems(colId);
    // 附加「列显隐」子菜单
    const colVisibilityItems = this.getColumnVisibilityItems();
    items.push(
      { id: 'sepCols', type: 'separator' },
      { id: 'columnsMenu', label: `${this.i18nService.t('menu.columns')}`, icon: '🔲', type: 'submenu', subItems: colVisibilityItems }
    );

    this.gridMenuPosition.set({ x, y });
    this.gridMenuItems.set(items);
    this.gridMenuVisible.set(true);
  }

  /** 显示右键菜单（单元格/行） */
  showCellContextMenu(event: MouseEvent, context: { rowData?: any; rowIndex?: number; colDef?: any }): void {
    if (!this.enableContextMenu) return;
    event.preventDefault();

    const gridRect = this.gridContainer.nativeElement.getBoundingClientRect();
    const x = event.clientX - gridRect.left;
    const y = event.clientY - gridRect.top;

    const items: ColumnMenuItemType[] = [
      { id: 'copyCell', label: `${this.i18nService.t('menu.copyCell')}`, icon: '📋', action: 'copyCell', shortcut: 'Ctrl+C' },
      { id: 'copyRow', label: `${this.i18nService.t('menu.copyRow')}`, icon: '📄', action: 'copyRow' },
      { id: 'sep1', type: 'separator' },
    ];
    if (context.colDef?.editable !== false) {
      items.push({ id: 'editCell', label: `${this.i18nService.t('menu.editCell')}`, icon: '✏️', action: 'editCell', shortcut: 'Enter' });
    }
    items.push(
      { id: 'sep2', type: 'separator' },
      { id: 'selectRow', label: `${this.i18nService.t('menu.selectRow')}`, icon: '✓', action: 'selectRow' },
      { id: 'clearSelection', label: `${this.i18nService.t('menu.clearSelection')}`, icon: '✕', action: 'clearSelection' }
    );

    // 图表子菜单（当选中范围且启用图表功能时）
    if (this.enableCharts && this.rangeSelectionService.getRanges().length > 0) {
      items.push(
        { id: 'sep-chart', type: 'separator' },
        { id: 'chartBar', label: '📊 柱状图', icon: '📊', action: 'chartBar' },
        { id: 'chartLine', label: '📈 折线图', icon: '📈', action: 'chartLine' },
        { id: 'chartArea', label: '📉 面积图', icon: '📉', action: 'chartArea' },
        { id: 'chartPie', label: '🥧 饼图', icon: '🥧', action: 'chartPie' },
        { id: 'chartDoughnut', label: '🍩 环形图', icon: '🍩', action: 'chartDoughnut' }
      );
    }

    this.gridMenuColId = context.colDef?.field || '';
    this.gridMenuPosition.set({ x, y });
    this.gridMenuItems.set(items);
    this.gridMenuVisible.set(true);
  }

  /** 关闭菜单 */
  closeGridMenu(): void {
    this.gridMenuVisible.set(false);
    this.gridMenuColId = '';
  }

  /** 菜单项点击处理 */
  onGridMenuItemClick(item: ColumnMenuItemType): void {
    if (item.disabled) return;

    // 子菜单项点击
    if (item.action === 'toggleColumn') {
      this.toggleColumnVisibility(item.id);
      this.closeGridMenu();
      return;
    }

    const colId = this.gridMenuColId;
    this.closeGridMenu();

    switch (item.action) {
      case 'sortAsc':
        this.dataService.setSortModel([{ colId, sort: 'asc' }]);
        this.syncSortState();
        this.refreshHeader();
        this.refreshView();
        break;
      case 'sortDesc':
        this.dataService.setSortModel([{ colId, sort: 'desc' }]);
        this.syncSortState();
        this.refreshHeader();
        this.refreshView();
        break;
      case 'clearSort':
        this.dataService.setSortModel([]);
        this.syncSortState();
        this.refreshHeader();
        this.refreshView();
        break;
      case 'pinLeft':
        this.columnService.setColumnPinned(colId, 'left');
        this.refreshView();
        break;
      case 'pinRight':
        this.columnService.setColumnPinned(colId, 'right');
        this.refreshView();
        break;
      case 'clearPinned':
        this.columnService.setColumnPinned(colId, null);
        this.refreshView();
        break;
      case 'hideColumn':
        this.columnService.setColumnHidden(colId, true);
        this.refreshHeader();
        this.refreshView();
        break;
      case 'autoSizeThis':
        this.autoSizeColumn(colId);
        break;
      case 'autoSizeAll':
        this.autoSizeAllColumns();
        break;
      case 'copyCell':
        this.copyCellToClipboard();
        break;
      case 'copyRow':
        this.copyRowToClipboard();
        break;
      case 'editCell':
        this.openCellEditor(0, this.columnDefs.find(c => (c.colId || c.field) === colId)!, undefined, { click: true });
        break;
      case 'selectRow':
        // 由上下文决定
        break;
      case 'clearSelection':
        this.deselectAll();
        break;
      case 'chartBar':
        this.setChartType('bar');
        this.showChartPanel();
        break;
      case 'chartLine':
        this.setChartType('line');
        this.showChartPanel();
        break;
      case 'chartArea':
        this.setChartType('area');
        this.showChartPanel();
        break;
      case 'chartPie':
        this.setChartType('pie');
        this.showChartPanel();
        break;
      case 'chartDoughnut':
        this.setChartType('doughnut');
        this.showChartPanel();
        break;
    }
  }

  /** 获取列显隐子菜单项 */
  private getColumnVisibilityItems(): ColumnMenuItemType[] {
    return this.columnService.getAllColumns().map(col => {
      const state = this.columnService.getColumnState(col);
      const colId = col.colId || col.field || '';
      return {
        id: colId,
        label: col.headerName || col.field || colId,
        icon: state?.hide ? '☐' : '☑',
        action: 'toggleColumn',
        checked: !state?.hide,
        disabled: col.lockVisible === true,
      };
    });
  }

  /** 切换列显隐 */
  private toggleColumnVisibility(colId: string): void {
    const state = this.columnService.getColumnState(this.columnService.getColumn(colId)!);
    if (state) {
      this.columnService.setColumnHidden(colId, !state.hide);
      this.refreshHeader();
      this.refreshView();
    }
  }

  /** 同步排序状态到 columnDefs */
  private syncSortState(): void {
    this.columnDefs.forEach(cd => {
      const state = this.dataService.getColumnSortState(cd.colId || cd.field);
      cd.sort = state.sort;
      cd.sortIndex = state.sortIndex ?? undefined;
    });
  }

  /** 自适应列宽 */
  private autoSizeColumn(colId: string): void {
    const col = this.columnService.getColumn(colId);
    if (!col) return;
    const field = col.field;
    if (!field) return;

    // 遍历可见行，计算最大内容宽度
    let maxWidth = 60; // 最小宽度
    const visibleData = this.dataService.getVisibleRows();
    const allData = this.getRowData();
    for (const row of allData) {
      const value = row[field];
      if (value !== undefined && value !== null) {
        const textWidth = String(value).length * 9 + 24; // 估算: 每字符9px + padding
        maxWidth = Math.max(maxWidth, textWidth);
      }
    }
    const headerWidth = (col.headerName || col.field || '').length * 9 + 40;
    maxWidth = Math.max(maxWidth, headerWidth, 80);
    this.columnService.setColumnWidth(colId, maxWidth);
    this.refreshHeader();
    this.refreshView();
  }

  /** 自适应所有列宽 */
  private autoSizeAllColumns(): void {
    const columns = this.columnService.getVisibleColumns();
    const allData = this.getRowData();
    for (const col of columns) {
      const field = col.field;
      if (!field) continue;
      let maxWidth = 60;
      for (const row of allData) {
        const value = row[field];
        if (value !== undefined && value !== null) {
          const textWidth = String(value).length * 9 + 24;
          maxWidth = Math.max(maxWidth, textWidth);
        }
      }
      const headerWidth = (col.headerName || col.field || '').length * 9 + 40;
      maxWidth = Math.max(maxWidth, headerWidth, 80);
      const colId = col.colId || col.field || '';
      this.columnService.setColumnWidth(colId, maxWidth);
    }
    this.refreshHeader();
    this.refreshView();
  }

  /** 复制单元格到剪贴板 */
  private copyCellToClipboard(): void {
    // 简单实现 - 后续可通过 SelectionService 获取当前选中单元格
    if (navigator.clipboard) {
      navigator.clipboard.writeText('').catch(() => {});
    }
  }

  /** 复制整行到剪贴板 */
  private copyRowToClipboard(): void {
    const selectedNodes = this.selectionService.getSelectedNodes();
    if (selectedNodes.length === 0) return;
    const text = selectedNodes.map(n => {
      const data = n.data;
      return Object.values(data).join('\t');
    }).join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  /** 打开子菜单（预留） */
  openSubmenu(item: ColumnMenuItemType): void {
    // 子菜单项的 hover 展开 — 当前用 inline 方式处理
  }

  // ========== 拖拽排序 API ==========

  startDrag(rowNodes: any[], event: MouseEvent): void {
    this.dragDropService.startRowDrag(rowNodes, event);
  }

  endDrag(targetIndex: number, event: MouseEvent): void {
    this.dragDropService.endRowDrag(targetIndex, event);
  }

  // ========== 范围选择 & 剪贴板 API ==========

  /** 初始化区域选择：绑定 DOM 事件和范围变更回调 */
  private initRangeSelection(): void {
    try {
      const enableRange = this.gridOptions.enableRangeSelection === true;
      const enableCell = this.gridOptions.enableCellSelection === true;
      const enableCol = this.gridOptions.enableColSelection === true;
      console.log('[DBGrid] initRangeSelection', { enableRange, enableCell, enableCol, hasBodyContainer: !!this.bodyContainer?.nativeElement });
      if (!enableRange && !enableCell && !enableCol) {
        console.log('[DBGrid] range selection not enabled');
        return;
      }

      this.rangeSelectionService.initialize({
        enableRangeSelection: enableRange || enableCol,
        enableCellSelection: enableCell,
        enableColSelection: enableCol,
      });

      // 同步可见列顺序
      this.syncRangeColumnOrder();

      // 范围变更时更新高亮样式
      this.rangeSelectionService.onRangeSelectionChanged((ranges) => {
        this.updateRangeStyles();
      });

      // 绑定鼠标事件到 bodyContainer
      const bodyEl = this.bodyContainer?.nativeElement;
      if (!bodyEl) return;

      this.ngZone.runOutsideAngular(() => {
        bodyEl.addEventListener('mousedown', this.onRangeMouseDown);
        bodyEl.addEventListener('mousemove', this.onRangeMouseMove);
        window.addEventListener('mouseup', this.onRangeMouseUp);
      });
    } catch (err) {
      console.error('[DBGrid] initRangeSelection error:', err);
    }
  }

  /** 同步可见列的 colId 顺序到 RangeSelectionService */
  private syncRangeColumnOrder(): void {
    const cols = this.columnService.getVisibleColumns();
    const colIds = cols.map(c => c.field || c.colId || '');
    this.rangeSelectionService.setColumnOrder(colIds);
  }

  /** 区域选择 mousedown：开始新的区域选择 */
  private onRangeMouseDown = (e: MouseEvent): void => {
    try {
      const cell = (e.target as HTMLElement).closest('.db-grid-cell') as HTMLElement;
      if (!cell) return;
      const rowEl = cell.closest('.db-grid-row') as HTMLElement;
      if (!rowEl) return;
      const rowIndex = parseInt(rowEl.dataset['rowIndex'] || '0', 10);
      const colId = cell.dataset['colId'] || '';
      console.log('[DBGrid] onRangeMouseDown', { rowIndex, colId });
      this.rangeSelectionService.startRangeSelection(rowIndex, colId, e);
      this.updateRangeStyles();
    } catch (err) {
      console.error('[DBGrid] onRangeMouseDown error:', err);
    }
  };

  /** 区域选择 mousemove：扩展区域范围 */
  private onRangeMouseMove = (e: MouseEvent): void => {
    if (!this.rangeSelectionService.getActiveRange()) return;
    const cell = (e.target as HTMLElement).closest('.db-grid-cell') as HTMLElement;
    if (!cell) return;
    const rowEl = cell.closest('.db-grid-row') as HTMLElement;
    if (!rowEl) return;
    const rowIndex = parseInt(rowEl.dataset['rowIndex'] || '0', 10);
    const colId = cell.dataset['colId'] || '';
    this.rangeSelectionService.extendRange(rowIndex, colId);
    this.updateRangeStyles();
  };

  /** 区域选择 mouseup：结束区域选择 */
  private onRangeMouseUp = (): void => {
    this.rangeSelectionService.endRangeSelection();
  };

  /** 更新区域选择高亮样式 */
  private updateRangeStyles(): void {
    try {
      const rowsContainer = this.rowsContainer?.nativeElement;
      const pinnedLeftContainer = this.pinnedLeftContainer?.nativeElement;
      if (!rowsContainer) return;

      const ranges = this.rangeSelectionService.getRanges();
      const clearAll = ranges.length === 0;
      console.log('[DBGrid] updateRangeStyles', { rangesCount: ranges.length, clearAll });

      const updateCells = (container: HTMLElement) => {
        const rows = container.querySelectorAll<HTMLElement>('.db-grid-row');
        rows.forEach(rowEl => {
          const rowIndex = parseInt(rowEl.dataset['rowIndex'] || '0', 10);
          const cells = rowEl.querySelectorAll<HTMLElement>('.db-grid-cell');
          cells.forEach(cellEl => {
            const colId = cellEl.dataset['colId'] || '';
            if (clearAll) {
              cellEl.classList.remove('db-grid-cell-in-range');
              cellEl.classList.remove('db-grid-cell-range-start');
              cellEl.classList.remove('db-grid-cell-range-end');
              cellEl.classList.remove('db-grid-cell-range-corner');
              cellEl.classList.remove('db-grid-cell-range-border-top');
              cellEl.classList.remove('db-grid-cell-range-border-right');
              cellEl.classList.remove('db-grid-cell-range-border-bottom');
              cellEl.classList.remove('db-grid-cell-range-border-left');
            } else {
              const inRange = this.rangeSelectionService.isCellInRange(rowIndex, colId);
              cellEl.classList.toggle('db-grid-cell-in-range', inRange);
              // 边界高亮：计算单元格在选中区域中的边界位置
              if (inRange) {
                const edge = this.rangeSelectionService.getCellMergedEdge(rowIndex, colId);
                cellEl.classList.toggle('db-grid-cell-range-border-top', edge.top);
                cellEl.classList.toggle('db-grid-cell-range-border-right', edge.right);
                cellEl.classList.toggle('db-grid-cell-range-border-bottom', edge.bottom);
                cellEl.classList.toggle('db-grid-cell-range-border-left', edge.left);
              } else {
                cellEl.classList.remove('db-grid-cell-range-border-top');
                cellEl.classList.remove('db-grid-cell-range-border-right');
                cellEl.classList.remove('db-grid-cell-range-border-bottom');
                cellEl.classList.remove('db-grid-cell-range-border-left');
              }
              // 角标记（范围右下角单元格）
              if (inRange) {
                const activeRange = this.rangeSelectionService.getActiveRange();
                if (activeRange) {
                  const maxRow = Math.max(activeRange.start.rowIndex, activeRange.end.rowIndex);
                  const maxCol = activeRange.start.colId || activeRange.end.colId;
                  const minCol = activeRange.start.colId || activeRange.end.colId;
                  cellEl.classList.toggle('db-grid-cell-range-corner',
                    rowIndex === maxRow && colId === maxCol);
                }
              } else {
                cellEl.classList.remove('db-grid-cell-range-corner');
              }
            }
          });
        });
      };

      updateCells(rowsContainer);
      if (pinnedLeftContainer) {
        updateCells(pinnedLeftContainer);
      }

      // 同步更新列头选中样式
      this.updateColumnHeaderSelectionStyles();

      // ============ 更新填充手柄位置 ============
      this.updateFillHandlePosition();
    } catch (err) {
      console.error('[DBGrid] updateRangeStyles error:', err);
    }
  }

  /** 更新填充手柄（小方块）位置 */
  private updateFillHandlePosition(): void {
    if (!this.enableFillHandle) {
      this.fillHandleVisible.set(false);
      return;
    }

    const activeRange = this.rangeSelectionService.getActiveRange();
    if (!activeRange) {
      this.fillHandleVisible.set(false);
      return;
    }

    // 获取选中范围右下角的单元格
    const maxRow = Math.max(activeRange.start.rowIndex, activeRange.end.rowIndex);
    const visibleColumns = this.columnService.getVisibleColumns();
    const startColIdx = visibleColumns.findIndex(c => (c.field ?? c.colId) === activeRange.start.colId);
    const endColIdx = visibleColumns.findIndex(c => (c.field ?? c.colId) === activeRange.end.colId);
    const maxColIdx = Math.max(startColIdx, endColIdx);

    if (maxColIdx < 0 || maxRow < 0) {
      this.fillHandleVisible.set(false);
      return;
    }

    // 找到对应的单元格元素
    const rowsContainer = this.rowsContainer?.nativeElement;
    if (!rowsContainer) {
      this.fillHandleVisible.set(false);
      return;
    }

    const targetRow = rowsContainer.querySelectorAll('.db-grid-row')[maxRow];
    if (!targetRow) {
      this.fillHandleVisible.set(false);
      return;
    }

    const targetCell = targetRow.querySelectorAll('.db-grid-cell')[maxColIdx];
    if (!targetCell) {
      this.fillHandleVisible.set(false);
      return;
    }

    // 计算填充手柄位置（相对于 grid-container）
    const cellRect = targetCell.getBoundingClientRect();
    const gridRect = this.gridContainer.nativeElement.getBoundingClientRect();

    const x = cellRect.right - gridRect.left - 4;  // 右对齐
    const y = cellRect.bottom - gridRect.top - 4; // 底对齐

    this.fillHandlePosition.set({ x, y });
    this.fillHandleVisible.set(true);
  }

  /** 填充手柄鼠标按下：开始拖拽 */
  onFillHandleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.enableFillHandle) return;

    const activeRange = this.rangeSelectionService.getActiveRange();
    if (!activeRange) return;

    // 记录拖拽起始位置
    this.isDraggingFillHandle = true;
    this.fillHandleDragStart = {
      rowIndex: Math.max(activeRange.start.rowIndex, activeRange.end.rowIndex),
      colId: activeRange.end.colId || activeRange.start.colId || ''
    };
    this.fillHandleDragCurrent = { ...this.fillHandleDragStart };

    // 添加全局 mousemove 和 mouseup 监听
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.onFillHandleDragMove);
      window.addEventListener('mouseup', this.onFillHandleDragEnd);
    });

    // 添加 dragging 样式
    this.fillHandleEl?.nativeElement?.classList.add('dragging');
  }

  /** 填充手柄拖拽中 */
  private onFillHandleDragMove = (event: MouseEvent): void => {
    if (!this.isDraggingFillHandle) return;

    // 找到鼠标位置对应的单元格
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const cell = (target as HTMLElement)?.closest('.db-grid-cell') as HTMLElement;
    if (!cell) return;

    const rowEl = cell.closest('.db-grid-row') as HTMLElement;
    if (!rowEl) return;

    const rowIndex = parseInt(rowEl.dataset['rowIndex'] || '0', 10);
    const colId = cell.dataset['colId'] || '';

    this.fillHandleDragCurrent = { rowIndex, colId };

    // 显示预览（高亮将要填充的单元格）
    this.showFillPreview();
  };

  /** 显示填充预览 */
  private showFillPreview(): void {
    // 清除之前的预览
    this.clearFillPreview();

    if (!this.isDraggingFillHandle) return;

    const start = this.fillHandleDragStart;
    const current = this.fillHandleDragCurrent;

    // 确定填充方向和范围
    const startRow = Math.min(start.rowIndex, current.rowIndex);
    const endRow = Math.max(start.rowIndex, current.rowIndex);
    const visibleColumns = this.columnService.getVisibleColumns();
    const startColIdx = visibleColumns.findIndex(c => (c.field ?? c.colId) === start.colId);
    const currentColIdx = visibleColumns.findIndex(c => (c.field ?? c.colId) === current.colId);
    const startCol = Math.min(startColIdx, currentColIdx);
    const endCol = Math.max(startColIdx, currentColIdx);

    // 高亮预览区域
    const rowsContainer = this.rowsContainer?.nativeElement;
    if (!rowsContainer) return;

    const rows = rowsContainer.querySelectorAll('.db-grid-row');
    for (let r = startRow; r <= endRow; r++) {
      const row = rows[r] as HTMLElement;
      if (!row) continue;

      const cells = row.querySelectorAll('.db-grid-cell');
      for (let c = startCol; c <= endCol; c++) {
        const cell = cells[c] as HTMLElement;
        if (cell) {
          cell.classList.add('db-grid-cell-fill-preview');
        }
      }
    }
  }

  /** 清除填充预览 */
  private clearFillPreview(): void {
    const previewCells = this.gridContainer?.nativeElement?.querySelectorAll('.db-grid-cell-fill-preview');
    previewCells?.forEach((cell: Element) => {
      cell.classList.remove('db-grid-cell-fill-preview');
    });
  }

  /** 填充手柄拖拽结束 */
  private onFillHandleDragEnd = (event: MouseEvent): void => {
    if (!this.isDraggingFillHandle) return;

    this.isDraggingFillHandle = false;

    // 移除全局监听
    window.removeEventListener('mousemove', this.onFillHandleDragMove);
    window.removeEventListener('mouseup', this.onFillHandleDragEnd);

    // 移除 dragging 样式
    this.fillHandleEl?.nativeElement?.classList.remove('dragging');

    // 清除预览
    this.clearFillPreview();

    // 执行填充
    this.executeFillHandle();
  };

  /** 执行填充操作 */
  private executeFillHandle(): void {
    const start = this.fillHandleDragStart;
    const end = this.fillHandleDragCurrent;

    if (start.rowIndex === end.rowIndex && start.colId === end.colId) {
      // 没有拖拽，忽略
      return;
    }

    // 确定填充方向
    const direction: 'down' | 'up' | 'left' | 'right' = 
      end.rowIndex > start.rowIndex ? 'down' :
      end.rowIndex < start.rowIndex ? 'up' :
      end.colId !== start.colId ? 'right' : 'down';

    // 计算填充数量
    const visibleColumns = this.columnService.getVisibleColumns();
    const startColIdx = visibleColumns.findIndex(c => (c.field ?? c.colId) === start.colId);
    const endColIdx = visibleColumns.findIndex(c => (c.field ?? c.colId) === end.colId);

    const rowCount = Math.abs(end.rowIndex - start.rowIndex) + 1;
    const colCount = Math.abs(endColIdx - startColIdx) + 1;
    const count = Math.max(rowCount, colCount);

    // 调用 fillHandle API
    this.fillHandle(direction, count);
  }

  async copyToClipboard(data?: any[], columns?: any[]): Promise<boolean> {
    const rowData = data || this.getRowData();
    const cols = columns || this.columnDefs;
    const success = await this.rangeSelectionService.copyToClipboard(rowData, cols);
    // 复制成功动画
    if (success && this.rangeSelectionService.getRanges().length > 0) {
      this.triggerRangeAnimation('copy');
    }
    return success;
  }

  async cutToClipboard(data?: any[], columns?: any[]): Promise<string> {
    const rowData = data || this.getRowData();
    const cols = columns || this.columnDefs;
    return await this.rangeSelectionService.cutToClipboard(rowData, cols);
  }

  async pasteFromClipboard(): Promise<any[][]> {
    const parsedData = await this.rangeSelectionService.pasteFromClipboard();
    if (parsedData.length === 0) return parsedData;

    // 确定粘贴起始位置：优先使用选中范围的起始位置，否则使用焦点单元格
    const focusedCell = this.rangeSelectionService.getFocusedCell()
      ?? this.keyboardNavigationService?.getFocusedCell();
    if (!focusedCell) return parsedData;

    const startRowIndex = focusedCell.rowIndex;
    const startColId = focusedCell.colId;
    const visibleColumns = this.columnService.getVisibleColumns();
    const startColIdx = visibleColumns.findIndex(c => (c.field ?? c.colId) === startColId);
    if (startColIdx < 0) return parsedData;

    // 获取当前行数据
    const allRowData = this.getRowData();
    const totalRows = allRowData.length;
    const totalCols = visibleColumns.length;

    // 逐行逐列写入数据
    const undoEdits: Array<{ rowIndex: number; colId: string; oldValue: any; newValue: any; rowData: any }> = [];
    for (let r = 0; r < parsedData.length; r++) {
      const targetRowIndex = startRowIndex + r;
      if (targetRowIndex >= totalRows) break;
      const targetRow = allRowData[targetRowIndex];
      if (!targetRow) continue;

      for (let c = 0; c < parsedData[r].length; c++) {
        const targetColIdx = startColIdx + c;
        if (targetColIdx >= totalCols) break;
        const colDef = visibleColumns[targetColIdx];
        const field = colDef.field ?? colDef.colId;
        if (!field) continue;

        // 检查列是否可编辑（如果有 editable 属性）
        if (colDef.editable === false) continue;

        const oldValue = targetRow[field];
        const newValue = parsedData[r][c];

        // 记录撤销操作
        if (this.undoRedoService.isEnabled()) {
          undoEdits.push({
            rowIndex: targetRowIndex,
            colId: field,
            oldValue,
            newValue,
            rowData: { ...targetRow },
          });
        }

        // 写入值
        targetRow[field] = newValue;

        // 触发单元格值变更事件
        if (this.cellEditService.isEnabled()) {
          this.cellEditService.emitCellValueChanged({
            rowIndex: targetRowIndex,
            colDef,
            oldValue,
            newValue,
          });
        }
      }
    }

    // 批量记录撤销操作
    if (undoEdits.length > 0 && this.undoRedoService.isEnabled()) {
      for (const edit of undoEdits) {
        this.undoRedoService.recordEdit(edit);
      }
    }

    // 刷新视图
    this.setRowData(allRowData);

    // 选中粘贴区域
    if (parsedData.length > 0 && parsedData[0].length > 0) {
      const endRowIndex = Math.min(startRowIndex + parsedData.length - 1, totalRows - 1);
      const endColIdx = Math.min(startColIdx + parsedData[0].length - 1, totalCols - 1);
      const endColId = visibleColumns[endColIdx]?.field ?? visibleColumns[endColIdx]?.colId ?? '';
      this.rangeSelectionService.clearRanges();
      this.rangeSelectionService.startRangeSelection(startRowIndex, startColId);
      this.rangeSelectionService.extendRange(endRowIndex, endColId);
      this.updateRangeStyles();
    }

    // 粘贴成功动画
    this.triggerRangeAnimation('paste');

    return parsedData;
  }

  /** API: 复制选中范围到剪贴板（简化版 API） */
  async copySelectedRange(): Promise<boolean> {
    return this.copyToClipboard();
  }

  /** API: 填充手柄 - 沿指定方向填充单元格 */
  fillHandle(direction: 'down' | 'up' | 'left' | 'right', count: number = 1): void {
    if (!this.enableFillHandle && !this.gridOptions.enableRangeSelection) {
      console.warn('[DBGrid] fillHandle requires enableFillHandle or enableRangeSelection');
      return;
    }

    const range = this.rangeSelectionService.getActiveRange();
    if (!range) {
      console.warn('[DBGrid] fillHandle: no active range selected');
      return;
    }

    const rowData = this.getRowData();
    const columns = this.columnService.getVisibleColumns();

    // 调用 RangeSelectionService 的 fillHandle 方法
    this.rangeSelectionService.fillHandle(direction, rowData, columns, count);

    // 刷新视图
    this.refreshCells();

    // 扩展选择范围以包含填充区域
    const newRange = this.rangeSelectionService.extendRangeAfterFill(range, direction, count);
    this.rangeSelectionService['activeRange'] = newRange;
    this.rangeSelectionService['ranges'] = [newRange];
  }

  /** API: 粘贴到 grid（支持传入自定义文本） */
  async pasteToGrid(text?: string): Promise<void> {
    if (text !== undefined) {
      // 使用提供的文本直接解析并粘贴
      const parsedData = this.clipboardService.parseTextToRange(text);
      if (parsedData.length === 0) return;

      const focusedCell = this.rangeSelectionService.getFocusedCell()
        ?? this.keyboardNavigationService?.getFocusedCell();
      if (!focusedCell) return;

      const startRowIndex = focusedCell.rowIndex;
      const startColId = focusedCell.colId;
      const visibleColumns = this.columnService.getVisibleColumns();
      const startColIdx = visibleColumns.findIndex(c => (c.field ?? c.colId) === startColId);
      if (startColIdx < 0) return;

      const allRowData = this.getRowData();
      const totalRows = allRowData.length;
      const totalCols = visibleColumns.length;

      for (let r = 0; r < parsedData.length; r++) {
        const targetRowIndex = startRowIndex + r;
        if (targetRowIndex >= totalRows) break;
        const targetRow = allRowData[targetRowIndex];
        if (!targetRow) continue;

        for (let c = 0; c < parsedData[r].length; c++) {
          const targetColIdx = startColIdx + c;
          if (targetColIdx >= totalCols) break;
          const colDef = visibleColumns[targetColIdx];
          const field = colDef.field ?? colDef.colId;
          if (!field || colDef.editable === false) continue;
          targetRow[field] = parsedData[r][c];
        }
      }

      this.setRowData(allRowData);

      // 选中粘贴区域
      if (parsedData.length > 0 && parsedData[0].length > 0) {
        const endRowIndex = Math.min(startRowIndex + parsedData.length - 1, totalRows - 1);
        const endColIdx = Math.min(startColIdx + parsedData[0].length - 1, totalCols - 1);
        const endColId = visibleColumns[endColIdx]?.field ?? visibleColumns[endColIdx]?.colId ?? '';
        this.rangeSelectionService.clearRanges();
        this.rangeSelectionService.startRangeSelection(startRowIndex, startColId);
        this.rangeSelectionService.extendRange(endRowIndex, endColId);
        this.updateRangeStyles();
      }

      this.triggerRangeAnimation('paste');
    } else {
      await this.pasteFromClipboard();
    }
  }

  /** 触发选中区域动画 */
  private triggerRangeAnimation(type: 'copy' | 'paste'): void {
    try {
      const rowsContainer = this.rowsContainer?.nativeElement;
      const pinnedLeftContainer = this.pinnedLeftContainer?.nativeElement;
      if (!rowsContainer) return;

      const animate = (container: HTMLElement) => {
        const rows = container.querySelectorAll<HTMLElement>('.db-grid-row');
        rows.forEach(rowEl => {
          const rowIndex = parseInt(rowEl.dataset['rowIndex'] || '0', 10);
          const cells = rowEl.querySelectorAll<HTMLElement>('.db-grid-cell');
          cells.forEach(cellEl => {
            const colId = cellEl.dataset['colId'] || '';
            if (this.rangeSelectionService.isCellInRange(rowIndex, colId)) {
              // 添加动画类
              const animClass = type === 'copy' ? 'db-grid-cell-anim-copy' : 'db-grid-cell-anim-paste';
              cellEl.classList.add(animClass);
              // 动画结束后移除
              setTimeout(() => {
                cellEl.classList.remove(animClass);
              }, 400);
            }
          });
        });
      };

      animate(rowsContainer);
      if (pinnedLeftContainer) {
        animate(pinnedLeftContainer);
      }
    } catch (err) {
      console.error('[DBGrid] triggerRangeAnimation error:', err);
    }
  }

  toggleSidebar(panelId?: string): void {
    if (this.sidebarService.isVisible()) {
      this.sidebarService.hide();
    } else {
      this.sidebarService.show(panelId);
    }
  }

  // ========== 撤销/重做 API ==========

  undo(): void {

    const action = this.undoRedoService.undo();
    if (action) {
      this.applyUndoAction(action);
    } else {

    }
  }

  redo(): void {

    const action = this.undoRedoService.redo();
    if (action) {
      this.applyRedoAction(action);
    } else {

    }
  }

  private applyUndoAction(action: any): void {

    switch (action.type) {
      case 'edit':
        const rowNode = this.dataService.getRowNode(String(action.rowIndex));
        if (rowNode && action.colId) {
          rowNode.data[action.colId] = action.oldValue;
          this.refreshView();
        }
        break;
      case 'rowAdd':
        // 撤销添加 = 删除最后一行
        const currentData = this.getRowData();
        if (currentData.length > 0) {
          currentData.pop();
          this.setRowData(currentData);
        }
        break;
      case 'rowDelete':
        // 撤销删除 = 恢复行
        const allData = this.getRowData();
        const insertIdx = Math.min(action.rowIndex, allData.length);
        allData.splice(insertIdx, 0, action.rowData);
        this.setRowData(allData);
        break;
    }
  }

  private applyRedoAction(action: any): void {
    switch (action.type) {
      case 'edit':
        // 重做新值
        const rowNode = this.dataService.getRowNode(action.rowIndex);
        if (rowNode && action.colId) {
          rowNode.data[action.colId] = action.newValue;
          this.refreshView();
        }
        break;
      case 'rowAdd':
        // 重做添加 = 重新添加行
        const rdData = this.getRowData();
        rdData.push(action.rowData);
        this.setRowData(rdData);
        break;
      case 'rowDelete':
        // 重做删除 = 重新删除行
        const ddData = this.getRowData();
        const delIdx = Math.min(action.rowIndex, ddData.length - 1);
        ddData.splice(delIdx, 1);
        this.setRowData(ddData);
        break;
    }
  }

  // ========== 选择 API ==========

  selectAll(): void {
    console.log('[DBGrid] selectAll() called');

    // 服务端模式：从 DOM 获取所有渲染行的 rowId
    const ids: string[] = [];
    const rowsContainer = this.rowsContainer?.nativeElement;
    if (rowsContainer) {
      const rowElements = rowsContainer.querySelectorAll('.db-grid-row');
      rowElements.forEach((row: HTMLElement) => {
        const rowId = (row as HTMLElement).dataset['rowId'];
        if (rowId) ids.push(rowId);
      });
    }
    console.log('[DBGrid] selectAll - DOM ids:', ids.length);

    // 关键修复：用 selectionService.selectAllByIds 批量追加，只触发一次事件
    // 绕过 selectNode 内部的 clearSelection()，彻底解决每次只选中 1 行的问题
    this.selectionService.selectAllByIds(ids, (id: string) => ({ id } as any));

    // 强制更新样式
    setTimeout(() => {
      this.updateSelectionStyles();
      this.updateSelectAllCheckboxState();
      this.cdr.detectChanges();
    }, 0);
    console.log('[DBGrid] selectAll - forced update complete');
  }


  deselectAll(): void {
    console.log('[DBGrid] deselectAll() called');
    this.selectionService.clearSelection();
    this.selectionService.resetAllSelected?.();
    this.updateSelectAllCheckboxState();
  }

  /** 全选/取消全选切换 */
  private toggleSelectAll(checked: boolean): void {
    // Guard：防止行 checkbox 触发重复 selectAll
    if (this.isSelectingAll) {
      console.log('[DBGrid] toggleSelectAll ignored - isSelectingAll guard');
      return;
    }
    this.isSelectingAll = true;
    console.log('[DBGrid] toggleSelectAll called, checked:', checked);
    try {
      if (checked) {
        this.selectAll();
      } else {
        this.deselectAll();
      }
      this.updateSelectAllCheckboxState();
    } finally {
      // 延迟重置，确保在所有 change 事件处理完之后再清标志
      setTimeout(() => { this.isSelectingAll = false; }, 100);
    }
  }

  /** 更新全选 checkbox 状态 */
  updateSelectAllCheckboxState(): void {
    let totalCheckable = 0;

    // 从 DOM 获取可见行数（和 selectAll 一致）
    const rowsContainer = this.rowsContainer?.nativeElement;
    if (rowsContainer) {
      const rowElements = rowsContainer.querySelectorAll('.db-grid-row');
      rowElements.forEach((row: HTMLElement) => {
        if ((row as HTMLElement).dataset['rowId']) totalCheckable++;
      });
    }

    const selectedCount = this.selectionService.getSelectionCount();
    const state: 'all' | 'some' | 'none' = totalCheckable === 0 ? 'none' : selectedCount >= totalCheckable ? 'all' : 'some';
    console.log('[DBGrid] updateSelectAllCheckboxState', { totalCheckable, selectedCount, state });
    this.headerRenderer.updateSelectAllState(state);
  }



  selectNode(node: any, clearSelection = false): void {
    if (clearSelection) this.selectionService.clearSelection();
    this.selectionService.selectNode(node);
  }

  deselectNode(node: any): void { this.selectionService.deselectNode(node); }
  getSelectedNodes(): any[] { return this.selectionService.getSelectedNodes(); }
  getSelectedRows(): any[] { return this.selectionService.getSelectedData(); }
  getSelectedRowNodes(): any[] { return this.selectionService.getSelectedNodes(); }

  /** 更新所有行元素的选中样式（同步 selectionService 状态到 DOM） */
  private updateSelectionStyles(): void {
    console.log('[DBGrid] updateSelectionStyles START');
    const rowsContainer = this.rowsContainer?.nativeElement;
    const pinnedLeftContainer = this.pinnedLeftContainer?.nativeElement;
    if (!rowsContainer) {
      console.log('[DBGrid] updateSelectionStyles - no rowsContainer');
      return;
    }

    const selectedIds = new Set(this.selectionService.getSelectedIds());
    console.log('[DBGrid] updateSelectionStyles', { selectedCount: selectedIds.size, totalRows: this.rowCount() });

    const updateRowElements = (container: HTMLElement) => {
      const rows = container.querySelectorAll<HTMLElement>('.db-grid-row');
      console.log('[DBGrid] updateRowElements - found rows:', rows.length);
      rows.forEach(rowEl => {
        const rowId = (rowEl as HTMLElement).dataset['rowId'];
        if (!rowId) return;
        // 全选状态下，所有行都视为已选中（服务端模式：新加载行自动选中）
        const isAllSelected = this.selectionService.isAllSelectedForRender?.() ?? false;
        const shouldBeSelected = isAllSelected || selectedIds.has(rowId);
        if (shouldBeSelected) {
          rowEl.classList.add('db-grid-row-selected');
          rowEl.setAttribute('aria-selected', 'true');
        } else {
          rowEl.classList.remove('db-grid-row-selected');
          rowEl.setAttribute('aria-selected', 'false');
        }
        // 更新复选框状态
        const checkbox = rowEl.querySelector<HTMLInputElement>('.db-grid-row-checkbox');
        if (checkbox) {
          checkbox.checked = shouldBeSelected;
        }
      });
    };

    updateRowElements(rowsContainer);
    if (pinnedLeftContainer) {
      updateRowElements(pinnedLeftContainer);
    }
    console.log('[DBGrid] updateSelectionStyles END');
  }

  setGridOption(key: string, value: any): void {
    (this.gridOptions as any)[key] = value;
    switch (key) {
      case 'rowHeight': this.dataService.setScrollConfig({ rowHeight: value }); this.refreshView(); break;
      case 'rowSelection':
      case 'rowSelectionMode': this.selectionService.initialize({ mode: value as any }); this.refreshView(); break;
    }
  }

  getGridOption(key: string): any { return (this.gridOptions as any)[key]; }

  // ============ 渲染方法 ============

  /** 键盘事件处理 */
  onKeyDown(event: KeyboardEvent): void {
    // 如果正在编辑单元格，不处理快捷键
    if (this.isCellEditing()) {
      return;
    }

    const ctrlKey = event.ctrlKey || event.metaKey;
    const shiftKey = event.shiftKey;

    // ========== 撤销/重做快捷键 ==========
    if (ctrlKey) {
      if (event.key === 'z' || event.key === 'Z') {
        if (event.shiftKey) {
          // Ctrl+Shift+Z = Redo
          if (this.undoRedoService.canRedo()) {
            this.redo();
            event.preventDefault();
            event.stopPropagation();
          }
        } else {
          // Ctrl+Z = Undo
          if (this.undoRedoService.canUndo()) {
            this.undo();
            event.preventDefault();
            event.stopPropagation();
          }
        }
        return;
      }
      if (event.key === 'y' || event.key === 'Y') {
        // Ctrl+Y = Redo
        if (this.undoRedoService.canRedo()) {
          this.redo();
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
    }

    // ========== 范围选择快捷键 ==========
    // Ctrl + A: 全选
    if (ctrlKey && event.key === 'a') {
      event.preventDefault();
      event.stopPropagation();
      if (this.rangeSelectionService.isRangeSelectionEnabled() || this.rangeSelectionService.isCellSelectionEnabled()) {
        const totalRows = this.rowCount();
        const columns = this.columnService.getVisibleColumns();
        this.rangeSelectionService.selectAll(totalRows, columns);
        this.updateRangeStyles();
        this.syncRangeColumnOrder();
      }
      return;
    }

    // Ctrl + C: 复制
    if (ctrlKey && event.key === 'c') {
      event.preventDefault();
      event.stopPropagation();
      this.copyToClipboard();
      return;
    }

    // Ctrl + V: 粘贴
    if (ctrlKey && event.key === 'v') {
      event.preventDefault();
      event.stopPropagation();
      this.pasteFromClipboard();
      return;
    }

    // ========== Shift + 方向键：扩展选择区域 ==========
    if (shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowDown')) {
      if (this.rangeSelectionService.isRangeSelectionEnabled() || this.rangeSelectionService.isCellSelectionEnabled()) {
        const handled = this.rangeSelectionService.handleShiftArrowKey(
          event,
          this.rowCount(),
          this.columnService.getVisibleColumns()
        );
        if (handled) {
          this.updateRangeStyles();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    }

    // ========== Ctrl + Space：选中当前列 ==========
    if (ctrlKey && event.key === ' ') {
      if (this.rangeSelectionService.isColSelectionEnabled()) {
        event.preventDefault();
        event.stopPropagation();
        const focusedCell = this.rangeSelectionService.getFocusedCell()
          ?? this.keyboardNavigationService?.getFocusedCell();
        if (focusedCell) {
          this.rangeSelectionService.selectColumn(focusedCell.colId, this.rowCount(), undefined);
          this.updateRangeStyles();
        }
        return;
      }
    }

    // ========== Shift + Space：选中当前行 ==========
    if (shiftKey && event.key === ' ') {
      if (this.rangeSelectionService.isRangeSelectionEnabled() || this.rangeSelectionService.isCellSelectionEnabled()) {
        event.preventDefault();
        event.stopPropagation();
        const focusedCell = this.rangeSelectionService.getFocusedCell()
          ?? this.keyboardNavigationService?.getFocusedCell();
        if (focusedCell) {
          const colId = this.columnService.getVisibleColumns().map(c => c.field || c.colId || '');
          if (colId.length > 0) {
            this.rangeSelectionService.startRangeSelection(focusedCell.rowIndex, colId[0]);
            this.rangeSelectionService.extendRange(focusedCell.rowIndex, colId[colId.length - 1]);
            this.updateRangeStyles();
          }
        }
        return;
      }
    }

    // ========== 方向键导航 ==========
    if (!this.keyboardNavigationService) return;
    const result = this.keyboardNavigationService.handleKeyDown(event);
    if (result.consumed) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private refreshHeader(): void { this.renderHeader(); }

  /** 列拖拽重排：将 fromColId 移动到 toColId 的位置 */
  private reorderColumn(fromColId: string, toColId: string): void {
    const colDefs = this.columnDefs;
    if (!colDefs) return;

    const fromIdx = colDefs.findIndex(c => (c.colId || c.field) === fromColId);
    const toIdx = colDefs.findIndex(c => (c.colId || c.field) === toColId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

    // 移动列定义
    const [moved] = colDefs.splice(fromIdx, 1);
    // 如果向右拖，toIdx 需要减1（因为已经移除了一个元素）
    const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
    colDefs.splice(insertIdx, 0, moved);

    // 触发事件
    this.colDragMoved.emit({ fromIndex: fromIdx, toIndex: insertIdx, column: moved });

    // 重新初始化列服务（同步 columnDefs 顺序到 columnService）
    this.initializeColumns();
    // 重新渲染表头和行
    this.refreshHeader();
    this.renderRows();
  }

  private renderHeader(): void {
    const container = this.headerContainer.nativeElement;
    let headerElement: HTMLElement;
    let totalColWidth: number;

    if (this.enableColVirtualization) {
      // 列虚拟化：只渲染可见列的表头
      const bodyWidth = this.bodyContainer?.nativeElement?.clientWidth || 800;
      const colRange = this.columnService.getVisibleColumnsInRange(this.scrollLeft, bodyWidth, this.colVirtualBuffer);
      const result = this.headerRenderer.renderWithColumns(colRange);
      headerElement = result.headerElement as HTMLElement;
      // 列虚拟化模式下，计算可见列的总宽度（leftPinned + center + rightPinned）
      const pinnedLeftWidth = (colRange?.leftPinned || []).reduce((t, c) => t + (this.columnService.getColumnState(c)?.width || c.width || 200), 0);
      const centerWidth = (colRange?.center || []).reduce((t, c) => t + (this.columnService.getColumnState(c)?.width || c.width || 200), 0);
      const pinnedRightWidth = (colRange?.rightPinned || []).reduce((t, c) => t + (this.columnService.getColumnState(c)?.width || c.width || 200), 0);
      totalColWidth = pinnedLeftWidth + centerWidth + pinnedRightWidth;
    } else {
      // 常规模式：渲染所有列
      const result = this.headerRenderer.render();
      headerElement = result.headerElement as HTMLElement;
      totalColWidth = this.calculateTotalColumnWidth();
    }

    headerElement.style.height = `${this.headerHeight}px`;
    headerElement.style.width = `${totalColWidth}px`;
    headerElement.style.minWidth = `${totalColWidth}px`;
    container.innerHTML = '';
    container.appendChild(headerElement);

    headerElement.addEventListener('headerClick', ((e: CustomEvent) => { this.onHeaderClick(e.detail); }) as EventListener);
    headerElement.addEventListener('filterClick', ((e: CustomEvent) => {
      const { colDef, event } = e.detail;
      this.ngZone.run(() => this.openFilterPopup(colDef, event));
    }) as EventListener);
    headerElement.addEventListener('columnMenuClick', ((e: CustomEvent) => {
      const { colId, event } = e.detail;
      this.ngZone.run(() => this.showColumnGridMenu(colId, event));
    }) as EventListener);
    headerElement.addEventListener('headerContextMenu', ((e: CustomEvent) => {
      const { colDef, event } = e.detail;
      this.ngZone.run(() => this.showColumnGridMenu(colDef?.colId || colDef?.field || '', event));
    }) as EventListener);

    // 全选 checkbox 回调
    this.headerRenderer.setOnSelectAllToggle((checked: boolean) => {
      console.log('[DBGrid] onSelectAllToggle callback triggered, checked:', checked);
      this.ngZone.run(() => this.toggleSelectAll(checked));
    });

    // 列拖拽回调
    this.headerRenderer.setOnColDragEnd((fromColId, toColId) => {
      this.reorderColumn(fromColId, toColId);
    });
    this.headerRenderer.setOnColumnResize((colId, newWidth) => {
      console.log('[DbGrid] Column resize callback:', colId, 'newWidth:', newWidth);
      const colDef = this.columnDefs.find(c => (c.colId || c.field) === colId);
      if (colDef) {
        colDef.width = newWidth;
        this.columnService.setColumnWidth(colId, newWidth);
        console.log('[DbGrid] Refreshing header and rows');
        this.refreshHeader();
        this.renderRows();
      }
    });
  }

  /** 渲染分页控件 */
  private renderFooter(): void {
    const container = this.footerContainer?.nativeElement;
    if (!container) return;

    const pageInfo = this.paginationService.getPageInfo();
    const totalRows = pageInfo.totalRows || 0;
    const pageSize = pageInfo.pageSize || 20;
    const currentPage = pageInfo.currentPage || 1;
    const totalPages = this.paginationService.getTotalPages();
    const startRow = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endRow = Math.min(currentPage * pageSize, totalRows);

    container.innerHTML = `
      <div class="db-grid-pagination">
        <span class="db-grid-pagination-info">
          显示 ${startRow}-${endRow} 条，共 ${totalRows} 条
        </span>
        <div class="db-grid-pagination-controls">
          <button class="db-grid-pagination-btn" data-action="first" ${currentPage <= 1 ? 'disabled' : ''}>|&lt;</button>
          <button class="db-grid-pagination-btn" data-action="prev" ${currentPage <= 1 ? 'disabled' : ''}>&lt;</button>
          ${this.renderPageButtons(currentPage, totalPages)}
          <button class="db-grid-pagination-btn" data-action="next" ${currentPage >= totalPages ? 'disabled' : ''}>&gt;</button>
          <button class="db-grid-pagination-btn" data-action="last" ${currentPage >= totalPages ? 'disabled' : ''}>&gt;|</button>
        </div>
        <select class="db-grid-pagination-size">
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10条/页</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20条/页</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50条/页</option>
          <option value="100" ${pageSize === 100 ? 'selected' : ''}>100条/页</option>
        </select>
      </div>
    `;

    // 绑定分页按钮事件
    container.querySelectorAll('.db-grid-pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset['action'];
        const page = target.dataset['page'] ? parseInt(target.dataset['page'], 10) : null;

        if (action === 'first') this.paginationService.setCurrentPage(1);
        else if (action === 'prev') this.paginationService.setCurrentPage(currentPage - 1);
        else if (action === 'next') this.paginationService.setCurrentPage(currentPage + 1);
        else if (action === 'last') this.paginationService.setCurrentPage(totalPages);
        else if (page) this.paginationService.setCurrentPage(page);

        this.renderFooter();
        this.renderRows();
      });
    });

    // 绑定每页条数选择事件
    const sizeSelect = container.querySelector('.db-grid-pagination-size') as HTMLSelectElement;
    if (sizeSelect) {
      sizeSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.paginationService.setPageSize(parseInt(target.value, 10));
        this.renderFooter();
        this.renderRows();
      });
    }
  }

  /** 渲染分页页码按钮 */
  private renderPageButtons(currentPage: number, totalPages: number): string {
    if (totalPages <= 1) return '';

    const buttons: string[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      buttons.push(`<button class="db-grid-pagination-btn" data-page="1">1</button>`);
      if (startPage > 2) buttons.push(`<span class="db-grid-pagination-ellipsis">...</span>`);
    }

    for (let i = startPage; i <= endPage; i++) {
      const active = i === currentPage ? 'active' : '';
      buttons.push(`<button class="db-grid-pagination-btn ${active}" data-page="${i}">${i}</button>`);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) buttons.push(`<span class="db-grid-pagination-ellipsis">...</span>`);
      buttons.push(`<button class="db-grid-pagination-btn" data-page="${totalPages}">${totalPages}</button>`);
    }

    return buttons.join('');
  }

  /** 刷新页脚 */
  refreshFooter(): void {
    if (this.pagination) this.renderFooter();
  }

  /** 渲染固定行（顶部/底部） */
  private renderPinnedRows(): void {
    // 渲染固定顶部行
    if (this.pinnedTopContainer?.nativeElement) {
      const container = this.pinnedTopContainer.nativeElement;
      container.innerHTML = '';
      const pinnedTopData = this.dataService.getPinnedTopRowData();
      
      pinnedTopData.forEach((data, index) => {
        const rowId = `pinned-top-${index}`;
        const rowNode: any = {
          id: rowId,
          data,
          rowIndex: -1,
          selected: false,
          rowHeight: this.rowHeight,
          uiLevel: 0,
          isFloating: () => true,
          isFloatingRow: () => true,
          setSelected: () => {},
        };
        
        const { rowElement } = this.rowRenderer.render(-1, data, rowNode);
        rowElement.classList.add('db-grid-row-pinned-top');
        rowElement.style.width = '100%';
        container.appendChild(rowElement);
      });
    }
    
    // 渲染固定底部行
    if (this.pinnedBottomContainer?.nativeElement) {
      const container = this.pinnedBottomContainer.nativeElement;
      container.innerHTML = '';
      const pinnedBottomData = this.dataService.getPinnedBottomRowData();
      
      pinnedBottomData.forEach((data, index) => {
        const rowId = `pinned-bottom-${index}`;
        const rowNode: any = {
          id: rowId,
          data,
          rowIndex: -1,
          selected: false,
          rowHeight: this.rowHeight,
          uiLevel: 0,
          isFloating: () => true,
          isFloatingRow: () => true,
          setSelected: () => {},
        };
        
        const { rowElement } = this.rowRenderer.render(-1, data, rowNode);
        rowElement.classList.add('db-grid-row-pinned-bottom');
        rowElement.style.width = '100%';
        container.appendChild(rowElement);
      });
    }
  }

  private renderRows(): void {

    // Guard: skip if view references are not yet initialized (called before ngAfterViewInit)
    // Guard: skip if view references are not yet initialized
    // Note: pinnedLeftContainer only exists when there are pinned left columns, so we check conditionally
    const hasRequiredContainers = this.rowsContainer?.nativeElement && this.virtualScroll?.nativeElement && this.bodyContainer?.nativeElement;
    const needsPinnedLeft = this.pinnedLeftColumnIds.length > 0;
    const needsPinnedCenter = this.pinnedCenterColumnIds().length > 0;
    if (!hasRequiredContainers || (needsPinnedLeft && !this.pinnedLeftContainer?.nativeElement) || (needsPinnedCenter && !this.pinnedCenterContainerEl)) {
      this._pendingRefresh = true;
      return;
    }

    // 清空中间固定列容器
    if (this.pinnedCenterContainerEl) {
      this.pinnedCenterContainerEl.innerHTML = '';
    }

    // 渲染固定行（顶部/底部）
    this.renderPinnedRows();

    const viewport = this.viewportInfo();
    const rowsContainer = this.rowsContainer?.nativeElement;
    const virtualScroll = this.virtualScroll?.nativeElement;

    // Safety check: if containers are still not available, skip rendering
    if (!rowsContainer || !virtualScroll) {
      console.log('[DBGrid] renderRows skipped: rowsContainer or virtualScroll not available', {
        rowsContainer: !!rowsContainer,
        virtualScroll: !!virtualScroll,
      });
      return;
    }

    // 服务端模式：使用 serverSideService 获取数据
    if (this.enableServerSide && this.serverSideService.isEnabled()) {
      const totalHeight = this.serverSideService.getTotalHeight(this.rowHeight);
      virtualScroll.style.height = `${totalHeight}px`;

      // 设置总列宽以支持横向滚动
      const totalColWidth = this.calculateTotalColumnWidth();
      if (totalColWidth > 0) {
        virtualScroll.style.width = `${totalColWidth}px`;
        rowsContainer.style.width = `${totalColWidth}px`;
      }

      rowsContainer.innerHTML = '';
      if (this.pinnedLeftColumnIds.length > 0 && this.pinnedLeftContainer?.nativeElement) {
        this.pinnedLeftContainer.nativeElement.innerHTML = '';
      }
      rowsContainer.style.transform = `translateY(${viewport.offsetY}px)`;

      const visibleData = this.serverSideService.getRowsInRange(viewport.startIndex, viewport.endIndex);
      visibleData.forEach((data, i) => {
        if (!data) return;
        const rowIndex = viewport.startIndex + i;
        const rowId = data.id !== undefined ? String(data.id) : `row-${rowIndex}`;
        const isCurrentlySelected = this.selectionService.isSelected({ id: rowId } as any);
        const rowNode = {
          id: rowId,
          data,
          rowIndex,
          selected: isCurrentlySelected,
          rowHeight: this.rowHeight,
          uiLevel: 0,
          isFloating: () => false,
          isFloatingRow: () => false,
          // 实时查询 selectionService，避免闭包捕获静态值
          isSelected: () => this.selectionService.isSelected({ id: rowId } as any),
          setSelected: (selected: boolean) => {
            if (selected) {
              this.selectionService.selectNode(rowNode);
            } else {
              this.selectionService.deselectNode(rowNode);
            }
          },
          floatLeft: () => {},
          floatRight: () => {},
        } as any;
        const rowElement = this.rowRenderer.render(rowIndex, data, rowNode).rowElement;
        rowsContainer.appendChild(rowElement);
      });
      this.cdr.detectChanges();
      return;
    }

    const totalHeight = this.dataService.getTotalHeight();
    virtualScroll.style.height = `${totalHeight}px`;

    // 计算总列宽，设置到 virtualScroll 和 rowsContainer 以支持横向滚动
    const totalColWidth = this.calculateTotalColumnWidth();
    if (totalColWidth > 0) {
      virtualScroll.style.width = `${totalColWidth}px`;
      rowsContainer.style.width = `${totalColWidth}px`;
    }

    rowsContainer.innerHTML = '';
    rowsContainer.style.transform = `translateY(${viewport.offsetY}px)`;

    const visibleData = this.dataService.getVisibleRows();
    console.log('[DBGrid] renderRows client-side:', {
      totalRows: this.dataService.getRowCount(),
      visibleRows: visibleData.length,
      viewport: JSON.stringify(viewport),
      totalHeight,
      firstRowId: visibleData[0]?.id,
    });

    // 列虚拟化：计算可见列范围
    let colRange: { leftPinned: ColDef[]; centerPinned: ColDef[]; center: ColDef[]; rightPinned: ColDef[]; offsetX: number; totalScrollableWidth: number } | null = null;
    if (this.enableColVirtualization) {
      const bodyWidth = this.bodyContainer?.nativeElement?.clientWidth || 800;
      colRange = this.columnService.getVisibleColumnsInRange(this.scrollLeft, bodyWidth, this.colVirtualBuffer);
      // 用可滚动区域的总宽度作为虚拟滚动宽度
      if (colRange) {
        const pinnedLeftWidth = colRange.leftPinned.reduce((t, c) => t + (this.columnService.getColumnState(c)?.width || 200), 0);
        const pinnedRightWidth = colRange.rightPinned.reduce((t, c) => t + (this.columnService.getColumnState(c)?.width || 200), 0);
        const totalW = pinnedLeftWidth + colRange.totalScrollableWidth + pinnedRightWidth;
        virtualScroll.style.width = `${totalW}px`;
        rowsContainer.style.width = `${totalW}px`;
        // 设置 pinned left 容器宽度（容器可能不存在，需要防御性检查）
        if (this.pinnedLeftContainer?.nativeElement) {
          this.pinnedLeftContainer.nativeElement.style.width = `${pinnedLeftWidth}px`;
          this.pinnedLeftContainer.nativeElement.style.height = `${totalHeight}px`;
        }
      }
    }

    visibleData.forEach((data, i) => {
      const rowIndex = viewport.startIndex + i;
      // 使用和 dataService 相同的 ID 生成逻辑
      let rowId: string;
      if (this.getRowId) {
        rowId = this.getRowId(data);
      } else if (data.id !== undefined) {
        rowId = String(data.id);
      } else {
        rowId = `row-${rowIndex}`;
      }
      const rowNode = this.dataService.getRowNode(rowId);
      // 确保从 selectionService 同步选中状态
      const isCurrentlySelected = rowNode ? this.selectionService.isSelected(rowNode) : false;
      if (rowNode) {
        // 确保 isSelected 方法存在
        if (typeof rowNode.isSelected !== 'function') {
          rowNode.isSelected = () => this.selectionService.isSelected({ id: rowId } as any);
        }
        // 树模式：合并树节点属性（children, hasChildren, level, expanded）
        if (this.isTreeMode) {
          const treeNode = this.treeService.getNode(rowId);
          if (treeNode) {
            rowNode.children = treeNode.children;
            rowNode.hasChildren = treeNode.hasChildren;
            rowNode.level = treeNode.level;
            rowNode.expanded = treeNode.expanded;
          }
        }

        // 分组模式：合并分组节点属性
        if (this.isGroupMode) {
          const groupNode = this.groupService['groupNodes'].get(rowId) || this.groupService.getResult().flatNodes.find(n => n.id === rowId);
          if (groupNode) {
            rowNode.group = groupNode.group;
            rowNode.level = groupNode.level;
            rowNode.uiLevel = groupNode.uiLevel;
            rowNode.expanded = groupNode.expanded;
            rowNode.key = groupNode.key;
            rowNode.allChildrenCount = groupNode.allChildrenCount;
            rowNode.children = groupNode.children;
            rowNode.data = groupNode.data;
          }
        }
        
        // 同步选中状态
        rowNode.selected = isCurrentlySelected;

        if (this.enableColVirtualization && colRange) {
          // 列虚拟化：只渲染可见列（不含 pinned left，pinned 在独立层渲染）
          const renderResult = this.rowRenderer.render(rowIndex, data, rowNode);
          const rowElement = renderResult.rowElement;
          // 先清空默认渲染的所有列单元格
          rowElement.innerHTML = '';
          // 重新渲染仅可见列（排除 pinned left）
          const visibleCols = [...colRange.center, ...colRange.rightPinned];
          this.rowRenderer.renderCellsForColumns(rowElement, rowIndex, data, rowNode, visibleCols);
          // 为中间列设置偏移（pinned left 宽度）
          if (colRange.offsetX > 0) {
            for (let ci = 0; ci < colRange.center.length; ci++) {
              const cell = rowElement.children[ci] as HTMLElement;
              if (cell) {
                const existingTransform = cell.style.transform || '';
                cell.style.transform = `translateX(${colRange.offsetX}px) ${existingTransform}`.trim();
              }
            }
          }
          rowsContainer.appendChild(rowElement);
          this.setupRowEvents(rowElement, rowIndex, data, rowNode);

          // 渲染 pinned left 列到独立层
          if (colRange.leftPinned.length > 0) {
            const pinnedRowEl = document.createElement('div');
            pinnedRowEl.className = 'db-grid-row';
            pinnedRowEl.style.cssText = `display: flex; position: absolute; left: 0; transform: translateY(${viewport.offsetY + (viewport.startIndex + i) * this.rowHeight}px); z-index: 2;`;
            this.rowRenderer.renderCellsForColumns(pinnedRowEl, rowIndex, data, rowNode, colRange.leftPinned);
            if (this.pinnedLeftContainer?.nativeElement) {
              this.pinnedLeftContainer.nativeElement.appendChild(pinnedRowEl);
            }
          }

          // 渲染 pinned center 列到独立层
          if (colRange.centerPinned && colRange.centerPinned.length > 0) {
            const pinnedCenterRowEl = document.createElement('div');
            pinnedCenterRowEl.className = 'db-grid-row';
            pinnedCenterRowEl.style.cssText = `display: flex; position: absolute; left: ${colRange.offsetX}px; transform: translateY(${viewport.offsetY + (viewport.startIndex + i) * this.rowHeight}px); z-index: 2;`;
            this.rowRenderer.renderCellsForColumns(pinnedCenterRowEl, rowIndex, data, rowNode, colRange.centerPinned);
            if (this.pinnedCenterContainerEl) {
              this.pinnedCenterContainerEl.appendChild(pinnedCenterRowEl);
            }
          }
        } else {
          // 非列虚拟化模式：渲染全部列（pinned 列的 sticky 样式会生效）
          const { rowElement } = this.rowRenderer.render(rowIndex, data, rowNode);
          rowsContainer.appendChild(rowElement);
          this.setupRowEvents(rowElement, rowIndex, data, rowNode);

          // pinned left 独立层渲染（当有 pinned 列时）
          if (this.pinnedLeftColumnIds().length > 0) {
            const pinnedCols = this.columnService.getVisibleColumns().filter(c => c.pinnedLeft);
            if (pinnedCols.length > 0) {
              const pinnedRowEl = document.createElement('div');
              pinnedRowEl.className = 'db-grid-row';
              pinnedRowEl.style.cssText = `display: flex; position: absolute; left: 0; transform: translateY(${viewport.offsetY + (viewport.startIndex + i) * this.rowHeight}px); z-index: 2;`;
              this.rowRenderer.renderCellsForColumns(pinnedRowEl, rowIndex, data, rowNode, pinnedCols);
              if (this.pinnedLeftContainer?.nativeElement) {
                this.pinnedLeftContainer.nativeElement.appendChild(pinnedRowEl);
              }
            }
          }

          // pinned center 独立层渲染
          if (this.pinnedCenterColumnIds().length > 0) {
            const centerPinnedCols = this.columnService.getVisibleColumns().filter(c => (c as any).pinnedCenter);
            if (centerPinnedCols.length > 0) {
              const pinnedCenterRowEl = document.createElement('div');
              pinnedCenterRowEl.className = 'db-grid-row';
              const leftWidth = this.pinningService.getPinnedWidth(this.columnService.getVisibleColumns(), 'left');
              pinnedCenterRowEl.style.cssText = `display: flex; position: absolute; left: ${leftWidth}px; transform: translateY(${viewport.offsetY + (viewport.startIndex + i) * this.rowHeight}px); z-index: 2;`;
              this.rowRenderer.renderCellsForColumns(pinnedCenterRowEl, rowIndex, data, rowNode, centerPinnedCols);
              if (this.pinnedCenterContainerEl) {
                this.pinnedCenterContainerEl.appendChild(pinnedCenterRowEl);
              }
            }
          }
        }
      }
    });

    // 应用单元格合并
    if (this.enableCellSpan) {
      this.applyCellSpans(rowsContainer);
    }

    // 渲染详情图表（主从表展开行）
    this.renderDetailCharts(viewport);

    console.log('[DBGrid] renderRows done, calling updateSelectionStyles + updateSelectAllCheckboxState');
    // 全选状态下，新渲染的行需要更新选中样式
    this.updateSelectionStyles();
    this.updateSelectAllCheckboxState();
    this.cdr.detectChanges();
  }

  /** 应用单元格合并 */
  private applyCellSpans(rowsContainer: HTMLElement): void {
    if (!this.enableCellSpan || !this.cellSpanService) return;

    const rows = rowsContainer.querySelectorAll('.db-grid-row');
    rows.forEach((rowEl) => {
      const rowIndex = parseInt((rowEl as HTMLElement).dataset['rowIndex'] || '0', 10);
      let rowHasSpanStart = false;

      // 遍历行中的单元格
      const cells = rowEl.querySelectorAll('.db-grid-cell');
      cells.forEach((cellEl) => {
        const colId = (cellEl as HTMLElement).dataset['colId'] || '';
        if (!colId) return;

        // 被合并掉的单元格：保留占位（visibility:hidden），保持列对齐
        if (this.cellSpanService.isSwappedOut(rowIndex, colId)) {
          (cellEl as HTMLElement).style.visibility = 'hidden';
          (cellEl as HTMLElement).style.border = 'none';
          (cellEl as HTMLElement).style.padding = '0';
          (cellEl as HTMLElement).style.pointerEvents = 'none';
          return;
        }

        // 获取合并信息
        const colSpan = this.cellSpanService.getColSpan(rowIndex, colId);
        const rowSpan = this.cellSpanService.getRowSpan(rowIndex, colId);

        if (colSpan > 1) {
          // 计算合并后的宽度
          let totalWidth = 0;
          const visibleCols = this.columnService.getVisibleColumns();
          const startIdx = visibleCols.findIndex(c => (c.colId || c.field) === colId);
          for (let c = startIdx; c < Math.min(startIdx + colSpan, visibleCols.length); c++) {
            totalWidth += this.columnService.getColumnState(visibleCols[c])?.width || visibleCols[c].width || 200;
          }
          (cellEl as HTMLElement).style.width = `${totalWidth}px`;
          (cellEl as HTMLElement).style.minWidth = `${totalWidth}px`;
          (cellEl as HTMLElement).style.flex = 'none';
        }

        if (rowSpan > 1) {
          rowHasSpanStart = true;
          // 计算合并后的高度
          const totalHeight = rowSpan * this.rowHeight;
          (cellEl as HTMLElement).style.height = `${totalHeight}px`;
          (cellEl as HTMLElement).style.position = 'relative';
          (cellEl as HTMLElement).style.zIndex = '1';
        }
      });

      // 允许行溢出，使 rowspan 合并单元格可以覆盖下方行
      if (rowHasSpanStart) {
        (rowEl as HTMLElement).style.overflow = 'visible';
      }
    });
  }

  /** 渲染详情图表（主从表展开行） */
  private renderDetailCharts(viewport: { startIndex: number; endIndex: number; offsetY: number }): void {
    if (!this.masterDetailService?.isMasterDetail()) return;
    const gridOpts = this.gridOptions || {};
    const detailChart = (gridOpts as any).detailChartRenderer as DetailChartConfig | undefined;
    if (!detailChart) return;

    const rowsContainer = this.rowsContainer?.nativeElement;
    if (!rowsContainer) return;

    // 移除旧的详情行
    rowsContainer.querySelectorAll('.db-grid-detail-chart-row').forEach(el => el.remove());

    const expandedIds = this.masterDetailService.getExpandedNodeIds();
    if (expandedIds.length === 0) return;

    const visibleData = this.dataService.getVisibleRows();
    const detailHeight = detailChart.height || 200;

    visibleData.forEach((data, i) => {
      if (!data) return;
      const rowId = data.id !== undefined ? String(data.id) : `row-${viewport.startIndex + i}`;
      if (!expandedIds.includes(rowId)) return;

      const detailRow = document.createElement('div');
      detailRow.className = 'db-grid-detail-chart-row';
      detailRow.style.cssText = `display:flex;align-items:center;justify-content:center;padding:8px;background:#fafafa;border-top:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;`;
      detailRow.style.height = `${detailHeight}px`;

      const chartContainer = document.createElement('div');
      chartContainer.style.cssText = `width:100%;height:100%;max-width:${detailChart.type === 'bar' ? '100%' : '300px'};margin:0 auto;`;
      detailRow.appendChild(chartContainer);

      let chartData = detailChart.dataField ? data[detailChart.dataField] : undefined;
      let chartLabels = detailChart.labelsField ? data[detailChart.labelsField] : undefined;

      if (chartData && Array.isArray(chartData)) {
        this.chartsService.createDetailChart(chartContainer, {
          type: detailChart.type,
          title: detailChart.title,
          data: chartData,
          labels: chartLabels,
          colors: detailChart.colors,
          height: detailHeight,
          options: detailChart.options,
        });
      }

      // 插入到对应行之后（通过 data-row-id 精确定位，避免插入详情行后索引错位）
      const targetRow = rowsContainer.querySelector(`[data-row-id="${rowId}"]`) as HTMLElement;
      if (targetRow) {
        targetRow.after(detailRow);
      } else {
        rowsContainer.appendChild(detailRow);
      }
    });
  }

  // ============ 事件 ============

  onScroll(event: Event): void {
    // Hide tooltip on scroll
    this.tooltipService.hideTooltip();

    const target = event.target as HTMLElement;
    const newScrollTop = target.scrollTop;
    const newScrollLeft = target.scrollLeft;

    // 同步表头横向滚动
    if (newScrollLeft !== this.scrollLeft) {
      this.scrollLeft = newScrollLeft;
      this.headerContainer.nativeElement.scrollLeft = newScrollLeft;

      // 列虚拟化：横向滚动时重新渲染
      if (this.enableColVirtualization) {
        const bodyWidth = this.bodyContainer.nativeElement.clientWidth;
        // 只在滚动超过一列宽度时才重新渲染，避免频繁重绘
        if (Math.abs(newScrollLeft - this.lastColRenderScrollLeft) > 50) {
          this.lastColRenderScrollLeft = newScrollLeft;
          this.renderRows();
          this.renderHeader();
        }
      }
    }

    if (newScrollTop !== this.scrollTop) {
      this.scrollTop = newScrollTop;
      this.dataService.setScrollTop(newScrollTop);

      // 服务端模式：使用 serverSideService 计算正确的 viewport
      if (this.enableServerSide && this.serverSideService.isEnabled()) {
        const ssRowCount = this.serverSideService.getRowCount();
        const bodyHeight = this.bodyContainer.nativeElement.clientHeight;
        const startIndex = Math.floor(newScrollTop / this.rowHeight);
        const visibleCount = Math.ceil(bodyHeight / this.rowHeight) + 1;
        const endIndex = Math.min(startIndex + visibleCount, ssRowCount);
        this.viewportInfo.set({
          startIndex,
          endIndex,
          offsetY: startIndex * this.rowHeight,
        });
        this.serverSideService.onScroll(newScrollTop, bodyHeight, this.rowHeight);
      } else {
        this.viewportInfo.set(this.dataService.getViewportInfo());
      }

      this.renderRows();
    }
    // 触发 viewportChanged 事件（用于行虚拟化性能追踪）
    this.ngZone.run(() => this.viewportChanged.emit(this.viewportInfo()));
  }

  private onWindowResize(): void {
    const bodyHeight = this.bodyContainer.nativeElement.clientHeight;
    this.dataService.setScrollConfig({ viewportHeight: bodyHeight });
    // 服务端模式：使用 serverSideService 计算正确的 viewport
    if (this.enableServerSide && this.serverSideService.isEnabled()) {
      const ssRowCount = this.serverSideService.getRowCount();
      const startIndex = Math.floor(this.scrollTop / this.rowHeight);
      const visibleCount = Math.ceil(bodyHeight / this.rowHeight) + 1;
      const endIndex = Math.min(startIndex + visibleCount, ssRowCount);
      this.viewportInfo.set({ startIndex, endIndex, offsetY: startIndex * this.rowHeight });
    } else {
      this.viewportInfo.set(this.dataService.getViewportInfo());
    }
    this.renderRows();
  }

  /** 计算所有可见列的总宽度 */
  private calculateTotalColumnWidth(): number {
    const columns = this.columnService.getVisibleColumns();
    return columns.reduce((total, col) => total + (col.width || 200), 0);
  }

  private onHeaderClick(detail: { colDef: any; colId: string; column: any; shiftKey?: boolean }): void {
    const colDef = detail.colDef;
    const colId = detail.colId;

    // 列选择：如果启用了列选择，点击列头选中整列
    if (this.rangeSelectionService.isColSelectionEnabled()) {
      const totalRows = this.rowCount();
      this.rangeSelectionService.selectColumn(colId, totalRows, detail as any);
      this.updateRangeStyles();
      // 列选中后也更新列头高亮
      this.updateColumnHeaderSelectionStyles();
      return; // 列选择模式下，点击列头不再触发排序
    }

    // 排序逻辑
    if (!colDef.sortable) return;
    const multiSort = detail.shiftKey ?? false;
    // 使用 dataService.toggleSort 处理多列排序
    const newSortModel = this.dataService.toggleSort(colDef.colId || colDef.field, multiSort);
    // 同步 colDef.sort 状态
    this.columnDefs.forEach(cd => {
      const state = this.dataService.getColumnSortState(cd.colId || cd.field);
      cd.sort = state.sort;
      cd.sortIndex = state.sortIndex ?? undefined;
    });
    this.refreshHeader(); // 刷新表头以更新排序图标 (▲/▼/⇅)
    this.refreshView();
    this.sortChanged.emit({ type: 'sortChanged', colDef, column: colDef, columns: this.columnDefs, source: 'ui', api: this.gridApi } as any);
  }

  /** 更新列头选中状态样式 */
  private updateColumnHeaderSelectionStyles(): void {
    const headerContainer = this.headerContainer?.nativeElement;
    if (!headerContainer) return;

    const ranges = this.rangeSelectionService.getRanges();
    const hasColumnSelection = ranges.some(r => r.type === 'column');

    // 清除所有列头选中样式
    headerContainer.querySelectorAll<HTMLElement>('.db-grid-header-cell').forEach(cell => {
      cell.classList.remove('db-grid-header-cell-col-selected');
    });

    if (!hasColumnSelection) return;

    // 为选中列的列头添加样式
    const colIds = this.columnService.getVisibleColumns().map(c => c.field || c.colId || '');
    ranges.forEach(range => {
      if (range.type !== 'column') return;
      const startIdx = colIds.indexOf(range.start.colId);
      const endIdx = colIds.indexOf(range.end.colId);
      if (startIdx < 0 || endIdx < 0) return;
      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      for (let i = minIdx; i <= maxIdx; i++) {
        const headerCell = headerContainer.querySelector<HTMLElement>(
          `.db-grid-header-cell[data-col-id="${colIds[i]}"]`
        );
        if (headerCell) {
          headerCell.classList.add('db-grid-header-cell-col-selected');
        }
      }
    });
  }

  private setupRowEvents(rowElement: HTMLElement, rowIndex: number, data: any, rowNode: any): void {

    rowElement.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 排除正在编辑的单元格和 checkbox 点击
      if (target.closest('.db-grid-cell-editor')) return;
      if (target.closest('.db-grid-checkbox')) return; // checkbox 点击由单独的事件处理器处理
      // 触发行选择：直接 toggle（不需要 Ctrl 键）
      this.selectionService.toggleNode(rowNode);
      // 即时更新行选中样式（不依赖 onSelectionChanged 的批量刷新）
      this.updateSelectionStyles();

      this.ngZone.run(() => this.rowClicked.emit({ type: 'rowClicked', data, node: rowNode, rowIndex, event: e, api: this.gridApi }));
    });

    rowElement.addEventListener('dblclick', (e: MouseEvent) => {
      this.ngZone.run(() => this.rowDoubleClicked.emit({ type: 'rowDoubleClicked', data, node: rowNode, rowIndex, event: e, api: this.gridApi }));
    });

    rowElement.addEventListener('cellClicked', ((e: CustomEvent) => {
      const { rowData, rowNode: rn, colDef, event: ev } = e.detail;
      this.ngZone.run(() => this.cellClicked.emit({ type: 'cellClicked', data: rowData, node: rn, colDef, column: colDef, value: rowData[colDef.field], rowIndex, event: ev, api: this.gridApi }));
    }) as EventListener);

    rowElement.addEventListener('cellDoubleClicked', ((e: CustomEvent) => {
      const { rowData, rowNode: rn, colDef, event: ev } = e.detail;
      this.ngZone.run(() => this.cellDoubleClicked.emit({ type: 'cellDoubleClicked', data: rowData, node: rn, colDef, column: colDef, value: rowData[colDef.field], rowIndex, event: ev, api: this.gridApi }));
    }) as EventListener);

    // 单元格编辑开始事件
    rowElement.addEventListener('cellEditStart', ((e: CustomEvent) => {
      const { rowIndex: ri, colDef: cd, value: val } = e.detail;
      this.ngZone.run(() => this.openCellEditor(ri, cd, val, { click: true }));
    }) as EventListener);

    // 树形节点展开/折叠事件
    rowElement.addEventListener('nodeToggle', ((e: CustomEvent) => {
      const { nodeId } = e.detail;
      this.ngZone.run(() => { this.toggleNode(nodeId); });
    }) as EventListener);

    // 分组展开/折叠事件
    rowElement.addEventListener('groupToggle', ((e: CustomEvent) => {
      const { nodeId } = e.detail;
      this.ngZone.run(() => { this.toggleGroup(nodeId); });
    }) as EventListener);

    // 行 checkbox 点击事件：切换单行选择状态
    rowElement.addEventListener('rowCheckboxToggle', ((e: CustomEvent) => {
      this.selectionService.toggleNode(rowNode);
      this.updateSelectionStyles();
      this.updateSelectAllCheckboxState();
    }) as EventListener);

    // 右键菜单
    rowElement.addEventListener('contextmenu', (e: MouseEvent) => {
      const cell = (e.target as HTMLElement).closest('.db-grid-cell') as HTMLElement;
      const colId = cell?.dataset?.['colId'] || '';
      const colDef = this.columnDefs.find(c => (c.colId || c.field) === colId);
      this.ngZone.run(() => this.showCellContextMenu(e, { rowData: data, rowIndex, colDef }));
    });

    // Tooltip: mouseenter / mouseleave on cells
    rowElement.addEventListener('mouseenter', (e: MouseEvent) => {
      const cell = (e.target as HTMLElement).closest('.db-grid-cell') as HTMLElement;
      if (!cell) return;
      const colId = cell.dataset?.['colId'] || '';
      const colDef = this.columnDefs.find(c => (c.colId || c.field) === colId);
      if (!colDef) return;
      if (!colDef.tooltipField && !colDef.tooltipValueGetter) return;
      const field = colDef.field || colId;
      const value = data[field];
      this.tooltipService.showTooltip({
        value,
        colDef,
        rowIndex,
        column: colDef,
        cellElement: cell,
      });
    }, true);

    rowElement.addEventListener('mouseleave', (e: MouseEvent) => {
      const cell = (e.target as HTMLElement).closest('.db-grid-cell') as HTMLElement;
      if (cell) {
        this.tooltipService.hideTooltip();
      }
    }, true);
  }

  // ============ 筛选器事件 ============

  /** 打开列筛选器弹出层 */
  openFilterPopup(colDef: ColDef, event?: MouseEvent): void {
    const position = event ? { x: event.clientX, y: event.clientY } : { x: 200, y: 200 };
    this.activeFilterPopup = { colDef, position };
    this.activeCellEditor = null;
    this.cdr.detectChanges();
  }

  /** 关闭筛选器弹出层 */
  closeFilterPopup(): void {
    this.activeFilterPopup = null;
    this.cdr.detectChanges();
  }

  /** 筛选器应用回调 */
  onFilterApplied(model: any): void {
    if (!this.activeFilterPopup) return;
    const colId = this.activeFilterPopup.colDef.colId || this.activeFilterPopup.colDef.field || '';
    if (model === null) {
      this.filterService.setColumnFilter(colId, null);
    } else {
      this.filterService.setColumnFilter(colId, model);
    }
    this.activeFilterPopup = null;
    this.ngZone.run(() => {
      this.filterChanged.emit({ type: 'filterChanged', api: this.gridApi });
      this.refreshView();
    });
  }

  /** 快速筛选输入回调（带防抖） */
  private quickFilterSubject = new Subject<string>();
  
  onQuickFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.quickFilterSubject.next(value);
  }

  /** 打开单元格编辑器 */
  // 当前编辑上下文（用于 undo/redo）
  private editingRowIndex: number | null = null;
  private editingColId: string | null = null;
  private editingOldValue: any = null;

  openCellEditor(rowIndex: number, colDef: ColDef, value: any, trigger?: { key?: string; click?: boolean }): void {
    // 记录编辑上下文，供 onEditorStopped 调 recordEdit 用
    this.editingRowIndex = rowIndex;
    this.editingColId = colDef.field || colDef.colId || null;
    this.editingOldValue = value;

    const session = this.editorService.startEditing(`row-${rowIndex}`, colDef, value, trigger);
    if (!session) {
      this.editingRowIndex = null;
      this.editingColId = null;
      this.editingOldValue = null;
      return;
    }

    this.activeCellEditor = {
      value: session.currentValue,
      editorType: session.editorType,
      editorParams: session.editorParams,
    };
    this.activeFilterPopup = null;
    this.cdr.detectChanges();
  }

  /** 通过 KeyboardNavigation 启动编辑 */
  startEditingCell(rowIndex: number, colId: string): void {
    const colDef = this.columnService.getColumn(colId) || this.columnDefs.find(c => (c.colId || c.field) === colId);
    if (!colDef) return;
    const rowData = this.dataService.getRowData(rowIndex);
    const value = rowData?.[colDef.field ?? colId];
    this.openCellEditor(rowIndex, colDef, value, { key: 'keyboard' });
  }

  /** 通过 KeyboardNavigation 停止编辑 */
  stopEditingCell(commit: boolean): void {
    if (this.activeCellEditor) {
      if (commit) {
        this.editorService.commitEdit();
        // 记录撤销操作
        if (this.editingRowIndex != null && this.editingColId && this.undoRedoService.isEnabled()) {
          const rowData = this.dataService.getRowData(this.editingRowIndex);
          const newValue = rowData?.[this.editingColId] ?? null;
          this.undoRedoService.recordEdit({
            rowIndex: this.editingRowIndex,
            colId: this.editingColId,
            oldValue: this.editingOldValue,
            newValue: newValue,
            rowData: rowData || {},
          });
        }
      } else {
        this.editorService.cancelEdit();
      }
      this.activeCellEditor = null;
      this.editingRowIndex = null;
      this.editingColId = null;
      this.editingOldValue = null;
      this.cdr.detectChanges();
    }
  }

  /** 焦点单元格变化回调 */
  onFocusChanged(cell: { rowIndex: number; colId: string }): void {
    // 通知 rowRenderer 高亮焦点单元格
    const bodyContainer = this.bodyContainer?.nativeElement;
    if (bodyContainer) {
      bodyContainer.querySelectorAll('.db-grid-cell-focused').forEach(el => el.classList.remove('db-grid-cell-focused'));
      const selector = `.db-grid-row[data-row-index="${cell.rowIndex}"] > [data-col-id="${cell.colId}"]`;
      bodyContainer.querySelector(selector)?.classList.add('db-grid-cell-focused');
    }
  }

  /** 编辑器值变化 */
  onEditorValueChange(value: any): void {
    this.editorService.updateValue(value);
  }

  /** 编辑器停止（提交或取消） */
  onEditorStopped(event: { committed: boolean; value: any }): void {
    if (event.committed) {
      const commit = this.editorService.commitEdit();
      if (commit) {
        // 记录撤销操作
        if (this.editingRowIndex != null && this.editingColId && this.undoRedoService.isEnabled()) {
          const rowData = this.dataService.getRowData(this.editingRowIndex);
          this.undoRedoService.recordEdit({
            rowIndex: this.editingRowIndex,
            colId: this.editingColId,
            oldValue: this.editingOldValue,
            newValue: event.value,
            rowData: rowData || {},
          });
        }
        this.ngZone.run(() => {
          this.refreshView();
        });
      }
    } else {
      this.editorService.cancelEdit();
    }
    this.activeCellEditor = null;
    this.editingRowIndex = null;
    this.editingColId = null;
    this.editingOldValue = null;
    this.cdr.detectChanges();
  }

  /** 编辑器键盘导航 */
  onEditorNavigate(direction: { direction: 'up' | 'down' | 'left' | 'right' }): void {
    // TODO: 实现编辑器键盘导航
    // 方向键移动到相邻单元格
  }

  /** 在列头右键打开筛选器（可由外部或 cellRenderer 调用） */
  showColumnFilter(colDef: ColDef, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.openFilterPopup(colDef, event);
  }

  // ========== 图表功能 API ==========

  /** 显示图表面板（基于当前选中范围） */
  showChartPanel(): void {
    if (!this.enableCharts) return;

    // 获取选中范围数据
    const ranges = this.rangeSelectionService.getRanges();
    if (ranges.length === 0) {
      alert('请先选择数据范围');
      return;
    }

    const rowData = this.getRowData();
    const cols = this.columnService.getVisibleColumns();
    const activeRange = ranges[0];
    const rangeData = this.rangeSelectionService.getRangeValues(activeRange, rowData, cols as any);

    if (!rangeData || rangeData.length === 0) {
      alert('选中范围内没有数据');
      return;
    }

    // 保存当前数据
    this.currentChartRangeData = rangeData;

    // 销毁旧图表
    if (this.currentChartId) {
      this.chartsService.destroyChart(this.currentChartId);
      this.currentChartId = null;
    }

    // 显示面板
    this.chartPanelVisible.set(true);
    this.cdr.detectChanges();

    // 延迟创建图表（等待面板 DOM 渲染完成）
    setTimeout(() => {
      this.createChartInRange(rangeData, cols as any);
    }, 50);
  }

  /** 隐藏图表面板 */
  hideChartPanel(): void {
    this.chartPanelVisible.set(false);
    if (this.currentChartId) {
      this.chartsService.destroyChart(this.currentChartId);
      this.currentChartId = null;
    }
    this.currentChartRangeData = null;
  }

  /** 切换图表类型 */
  setChartType(type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area'): void {
    this.currentChartType = type;
    if (!this.chartPanelVisible()) return;

    if (this.currentChartId && this.currentChartRangeData) {
      // 如果已有图表，更新类型
      const chartType = type === 'area' ? 'line' : type;
      this.chartsService.updateChartType(this.currentChartId, chartType);
      
      // 对于面积图，设置 fill
      if (type === 'area') {
        const chart = this.chartsService.getNativeChart(this.currentChartId);
        if (chart && chart.data?.datasets) {
          chart.data.datasets.forEach((ds: any) => {
            ds.fill = true;
            ds.backgroundColor = this.hexToRgbaArray(ds.borderColor || '#5470c6', 0.2);
          });
          chart.update();
        }
      }
    } else if (this.currentChartRangeData) {
      // 重新创建图表
      this.createChartInRange(this.currentChartRangeData, this.columnService.getVisibleColumns() as any);
    }
  }

  /** 获取图表导出图片 URL */
  getChartImageUrl(format: 'png' | 'svg' = 'png'): string {
    if (!this.currentChartId) return '';
    return this.chartsService.exportChartAsImage(this.currentChartId, format);
  }

  /** 图表类型变更回调（来自 ChartPanelComponent） */
  onChartTypeChange(type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area'): void {
    this.currentChartType = type;
    this.setChartType(type);
  }

  /** 图表导出回调 */
  onChartExport(format: 'png' | 'svg'): void {
    const url = this.getChartImageUrl(format);
    if (!url) return;
    // 下载图片
    const link = document.createElement('a');
    link.download = `db-grid-chart-${Date.now()}.png`;
    link.href = url;
    link.click();
  }

  /** 将十六进制颜色转为 rgba */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /** 将颜色（或颜色数组）转为 rgba 数组 */
  private hexToRgbaArray(color: string | string[], alpha: number): any[] {
    if (Array.isArray(color)) {
      return color.map(c => this.hexToRgba(c, alpha));
    }
    return [this.hexToRgba(color, alpha)];
  }

  /** 创建或重新创建图表 */
  private createChartInRange(rangeData: any[][], cols: ColDef[]): void {
    // 查找面板中的 canvas 容器
    const gridContainer = this.gridContainer?.nativeElement;
    if (!gridContainer) return;

    const panel = gridContainer.querySelector('db-chart-panel');
    if (!panel) return;

    const canvasContainer = panel.querySelector('.db-chart-canvas-container') as HTMLElement;
    if (!canvasContainer) return;

    // 销毁旧图表
    if (this.currentChartId) {
      this.chartsService.destroyChart(this.currentChartId);
      this.currentChartId = null;
    }

    // 创建新图表
    const chartType = this.currentChartType === 'area' ? 'line' : this.currentChartType;
    this.chartsService.createChartFromRange(
      rangeData,
      cols,
      chartType as any,
      canvasContainer
    ).then(instance => {
      this.currentChartId = instance.id;
      
      // 对于面积图，设置 fill
      if (this.currentChartType === 'area' && instance.nativeChart) {
        const chart = instance.nativeChart;
        if (chart.data?.datasets) {
          chart.data.datasets.forEach((ds: any) => {
            ds.fill = true;
            ds.backgroundColor = this.hexToRgbaArray(ds.borderColor || '#5470c6', 0.2);
          });
          chart.update();
        }
      }
    }).catch(err => {
      console.error('[DBGrid] createChartFromRange error:', err);
    });
  }
}
