/**
 * DB Grid 模块
 * 提供便捷的模块化导入方式
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbGridComponent } from './angular/components/grid/db-grid.component';

@NgModule({
  imports: [CommonModule],
  declarations: [DbGridComponent],
  exports: [DbGridComponent],
})
export class DbGridModule {}
