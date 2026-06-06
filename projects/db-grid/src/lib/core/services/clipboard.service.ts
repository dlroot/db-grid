import { Injectable } from '@angular/core';

/**
 * 剪贴板服务 — 处理剪贴板读写与文本格式化
 * 支持 Clipboard API，非 HTTPS 环境自动 fallback 到 execCommand
 */
@Injectable({ providedIn: 'root' })
export class ClipboardService {

  /**
   * 复制文本到剪贴板
   * 格式：制表符分隔列，换行符分隔行（与 Excel 兼容）
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return this.fallbackCopy(text);
    }
  }

  /**
   * 从剪贴板读取文本
   */
  async readFromClipboard(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  }

  /**
   * 将选中范围的值格式化为制表符分隔文本（CSV 风格，与 Excel 兼容）
   */
  formatRangeAsText(values: any[][]): string {
    return values.map(row => row.map(cell => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
      // 如果值包含制表符、换行或引号，用引号包裹
      if (str.includes('\t') || str.includes('\n') || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join('\t')).join('\n');
  }

  /**
   * 解析制表符分隔文本为二维数组
   */
  parseTextToRange(text: string): any[][] {
    if (!text) return [];
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    // 过滤末尾空行（Excel 复制时常带一个尾部换行）
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    return lines.map(line => this.parseCsvLine(line));
  }

  /**
   * 解析单行 CSV（处理引号包裹的字段）
   */
  private parseCsvLine(line: string): any[] {
    const cells: any[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        // 引号包裹的字段
        let value = '';
        i++; // 跳过开头引号
        while (i < line.length) {
          if (line[i] === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              value += '"';
              i += 2;
            } else {
              i++; // 跳过结尾引号
              break;
            }
          } else {
            value += line[i];
            i++;
          }
        }
        cells.push(this.parseCellValue(value));
        // 跳过制表符分隔
        if (i < line.length && line[i] === '\t') i++;
      } else {
        // 非引号字段
        const tabIdx = line.indexOf('\t', i);
        const raw = tabIdx === -1 ? line.substring(i) : line.substring(i, tabIdx);
        cells.push(this.parseCellValue(raw));
        i = tabIdx === -1 ? line.length : tabIdx + 1;
      }
    }
    return cells;
  }

  /**
   * 尝试解析单元格值（数字、布尔等）
   */
  private parseCellValue(cell: string): any {
    if (cell === '') return cell;
    // 尝试解析为数字
    const num = Number(cell);
    if (!isNaN(num)) return num;
    return cell;
  }

  /**
   * Fallback: 使用 execCommand 复制
   */
  private fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
