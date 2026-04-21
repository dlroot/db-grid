/**
 * 聚合单元格渲染器
 * 在分组行显示聚合值
 */

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { RowNode } from '../../core/models';
import { AggregationService, GroupAggregations } from '../../core/services';

@Component({
  selector: 'db-aggregation-cell',
  template: `
    <span class="db-aggregation-value" *ngIf="displayValue">
      {{ displayValue }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
      width: 100%;
    }
    .db-aggregation-value {
      font-style: italic;
      color: #666;
      font-size: 0.9em;
    }
  `],
  standalone: true,
})
export class DbAggregationCellRendererComponent implements OnChanges {
  @Input() node!: RowNode;
  @Input() field!: string;
  @Input() aggregationType: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last' = 'sum';
  @Input() prefix?: string;
  @Input() suffix?: string;
  @Input() showLabel = true;

  displayValue = '';

  constructor(private aggregationService: AggregationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.updateDisplayValue();
  }

  private updateDisplayValue(): void {
    if (!this.node?.group || !this.field) {
      this.displayValue = '';
      return;
    }

    // 尝试从节点数据中获取聚合值
    const aggregations: GroupAggregations | undefined = this.node.data?.__aggregations;

    if (!aggregations?.[this.field]?.[this.aggregationType]) {
      // 回退到服务查询
      const formatted = this.aggregationService.getFormattedValue(
        this.node.id,
        this.field,
        this.aggregationType
      );
      this.displayValue = formatted;
      return;
    }

    const result = aggregations[this.field][this.aggregationType];
    if (result) {
      let value = result.formatted;
      if (this.prefix) value = this.prefix + value;
      if (this.suffix) value = value + this.suffix;
      if (!this.showLabel) {
        // 移除类型标签
        value = value.replace(/^[^:]+:/, '').trim();
      }
      this.displayValue = value;
    } else {
      this.displayValue = '';
    }
  }
}