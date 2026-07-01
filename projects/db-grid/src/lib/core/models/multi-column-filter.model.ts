/**
 * 多列过滤模型 - 支持 AND/OR 逻辑组合
 * 
 * 参考 ag-Grid 企业版的 Advanced Filter
 */

import { FilterModel, FilterCondition } from './index';

/**
 * 过滤逻辑操作符
 */
export type FilterLogicOperator = 'AND' | 'OR';

/**
 * 高级过滤条件（支持嵌套）
 */
export interface AdvancedFilterCondition {
  /**
   * 逻辑操作符
   * - AND: 所有条件都必须满足
   * - OR: 满足任意一个条件即可
   */
  operator: FilterLogicOperator;
  
  /**
   * 过滤条件数组
   * 可以是简单的列过滤，也可以是嵌套的高级过滤
   */
  conditions: Array<FilterModel | AdvancedFilterCondition>;
}

/**
 * 多列过滤模型（简化版，便于用户使用）
 * 
 * @example
 * // 示例 1: 简单的 AND 逻辑
 * const filterModel: MultiColumnFilterModel = {
 *   operator: 'AND',
 *   rules: [
 *     { field: 'age', type: 'greaterThan', filter: 25 },
 *     { field: 'salary', type: 'greaterThan', filter: 50000 },
 *   ]
 * };
 * 
 * // 示例 2: OR 逻辑
 * const filterModel: MultiColumnFilterModel = {
 *   operator: 'OR',
 *   rules: [
 *     { field: 'department', type: 'equals', filter: 'IT' },
 *     { field: 'department', type: 'equals', filter: 'HR' },
 *   ]
 * };
 * 
 * // 示例 3: 嵌套逻辑 (AND + OR)
 * const filterModel: MultiColumnFilterModel = {
 *   operator: 'AND',
 *   rules: [
 *     { field: 'age', type: 'greaterThan', filter: 25 },
 *     {
 *       operator: 'OR',
 *       rules: [
 *         { field: 'department', type: 'equals', filter: 'IT' },
 *         { field: 'department', type: 'equals', filter: 'HR' },
 *       ]
 *     }
 *   ]
 * };
 */
export interface MultiColumnFilterModel {
  /**
   * 顶层逻辑操作符
   */
  operator: FilterLogicOperator;
  
  /**
   * 过滤规则数组
   * 可以是简单的 FilterModel，也可以是嵌套的 MultiColumnFilterModel
   */
  rules: Array<FilterCondition | MultiColumnFilterModel>;
}

/**
 * 过滤构建器 - 辅助创建复杂的过滤条件
 * 
 * @example
 * const filter = new FilterBuilder()
 *   .and()
 *     .greaterThan('age', 25)
 *     .greaterThan('salary', 50000)
 *   .or()
 *     .equals('department', 'IT')
 *     .equals('department', 'HR')
 *   .build();
 */
export class FilterBuilder {
  private operator: FilterLogicOperator = 'AND';
  private rules: Array<FilterCondition | MultiColumnFilterModel> = [];

  /**
   * 设置逻辑操作符为 AND
   */
  and(): FilterBuilder {
    this.operator = 'AND';
    return this;
  }

  /**
   * 设置逻辑操作符为 OR
   */
  or(): FilterBuilder {
    this.operator = 'OR';
    return this;
  }

  /**
   * 添加等于条件
   */
  equals(field: string, value: any): FilterBuilder {
    this.rules.push({
      field,
      filterType: 'text',
      type: 'equals',
      filter: value,
    });
    return this;
  }

  /**
   * 添加不等于条件
   */
  notEquals(field: string, value: any): FilterBuilder {
    this.rules.push({
      field,
      filterType: 'text',
      type: 'notEqual',
      filter: value,
    });
    return this;
  }

  /**
   * 添加大于条件
   */
  greaterThan(field: string, value: number): FilterBuilder {
    this.rules.push({
      field,
      filterType: 'number',
      type: 'greaterThan',
      filter: value,
    });
    return this;
  }

  /**
   * 添加小于条件
   */
  lessThan(field: string, value: number): FilterBuilder {
    this.rules.push({
      field,
      filterType: 'number',
      type: 'lessThan',
      filter: value,
    });
    return this;
  }

  /**
   * 添加包含条件（文本）
   */
  contains(field: string, value: string): FilterBuilder {
    this.rules.push({
      field,
      filterType: 'text',
      type: 'contains',
      filter: value,
    });
    return this;
  }

  /**
   * 添加自定义条件
   */
  addCondition(condition: FilterCondition): FilterBuilder {
    this.rules.push(condition);
    return this;
  }

  /**
   * 添加嵌套的过滤组
   */
  addGroup(group: MultiColumnFilterModel): FilterBuilder {
    this.rules.push(group);
    return this;
  }

  /**
   * 构建过滤模型
   */
  build(): MultiColumnFilterModel {
    return {
      operator: this.operator,
      rules: this.rules,
    };
  }

  /**
   * 重置构建器
   */
  reset(): FilterBuilder {
    this.operator = 'AND';
    this.rules = [];
    return this;
  }
}

/**
 * 过滤评估器 - 评估数据行是否满足过滤条件
 */
export class FilterEvaluator {
  /**
   * 评估数据行是否满足过滤模型
   * @param data 数据行
   * @param filterModel 过滤模型
   * @returns 是否满足过滤条件
   */
  static evaluate(data: any, filterModel: MultiColumnFilterModel): boolean {
    const { operator, rules } = filterModel;

    // 评估所有规则
    const results = rules.map(rule => {
      // 如果是嵌套的过滤模型，递归评估
      if ('operator' in rule && 'rules' in rule) {
        return FilterEvaluator.evaluate(data, rule as MultiColumnFilterModel);
      }

      // 否则是简单的 FilterModel
      return FilterEvaluator.evaluateSimpleFilter(data, rule as FilterCondition);
    });

    // 根据逻辑操作符组合结果
    if (operator === 'AND') {
      return results.every(result => result === true);
    } else {
      return results.some(result => result === true);
    }
  }

  /**
   * 评估简单的过滤条件
   */
  private static evaluateSimpleFilter(data: any, filter: FilterCondition): boolean {
    const { field, type, filter: filterValue } = filter;
    const fieldValue = data[field];

    switch (type) {
      case 'equals':
        return fieldValue === filterValue;
      
      case 'notEqual':
        return fieldValue !== filterValue;
      
      case 'greaterThan':
        return fieldValue > filterValue;
      
      case 'lessThan':
        return fieldValue < filterValue;
      
      case 'greaterThanOrEqual':
        return fieldValue >= filterValue;
      
      case 'lessThanOrEqual':
        return fieldValue <= filterValue;
      
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      
      case 'notContains':
        return !String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      
      case 'startsWith':
        return String(fieldValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
      
      case 'endsWith':
        return String(fieldValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
      
      default:
        return true;
    }
  }
}

/**
 * 过滤模型序列化器 - 用于持久化
 */
export class FilterModelSerializer {
  /**
   * 序列化过滤模型为 JSON 字符串
   */
  static serialize(filterModel: MultiColumnFilterModel): string {
    return JSON.stringify(filterModel);
  }

  /**
   * 反序列化 JSON 字符串为过滤模型
   */
  static deserialize(json: string): MultiColumnFilterModel {
    return JSON.parse(json);
  }

  /**
   * 转换为简单的 FilterModel（向后兼容）
   */
  static toSimpleFilterModel(filterModel: MultiColumnFilterModel): FilterModel {
    const result: FilterModel = {};

    const extractFilters = (model: MultiColumnFilterModel) => {
      model.rules.forEach(rule => {
        if ('operator' in rule && 'rules' in rule) {
          // 嵌套模型，递归提取
          extractFilters(rule as MultiColumnFilterModel);
        } else {
          // 简单过滤条件
          const filter = rule as FilterCondition;
          result[filter.field] = filter;
        }
      });
    };

    extractFilters(filterModel);
    return result;
  }
}
