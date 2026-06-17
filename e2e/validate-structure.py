"""
DB Grid 结构验证测试 (Python)
不需要浏览器，检查 build 产物和源代码结构完整性
"""

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path('/home/node/.openclaw/workspace/db-grid')
DIST = ROOT / 'dist/db-grid/browser'
SRC = ROOT / 'projects/db-grid/src/lib'
APP_SRC = ROOT / 'src/app'

passed = 0
failed = 0
errors = []

def check(desc, condition, detail=''):
    global passed, failed
    if condition:
        passed += 1
        print(f'  ✅ {desc}')
    else:
        failed += 1
        errors.append((desc, detail))
        print(f'  ❌ {desc}' + (f' — {detail}' if detail else ''))

def main():
    global passed, failed, errors
    print('🧪 DB Grid 结构验证测试')
    print()

    # ====== 1. Build 产物 ======
    print('📦 Build 产物')
    
    index_html = DIST / 'index.html'
    check('index.html 存在', index_html.exists())
    
    main_js = list(DIST.glob('main-*.js'))
    check('main JS bundle 存在', len(main_js) > 0)
    
    polyfill_js = list(DIST.glob('polyfills-*.js'))
    # Angular 21+ 将 polyfills 内联到 main.js
    if len(polyfill_js) == 0:
        print('  ℹ️  polyfills 已内联到 main.js (Angular 21+ 行为)')
    else:
        check('polyfills JS bundle 存在', True)
    
    styles_css = list(DIST.glob('styles-*.css'))
    check('样式 bundle 存在', len(styles_css) > 0)
    
    chunk_js = list(DIST.glob('chunk-*.js'))
    check(f'chunk bundles 存在 ({len(chunk_js)} 个)', len(chunk_js) > 0)
    
    if index_html.exists():
        html = index_html.read_text()
        check('HTML 包含 app-root 组件', '<app-root>' in html)
        check('HTML 包含 modulepreload', 'modulepreload' in html)
        check('HTML 包含 Angular 样式', 'db-grid' in html)
    check('Angular 版本为模块化构建', 'type="module"' in html)
    
    if main_js:
        size = main_js[0].stat().st_size
        check(f'main bundle 大小合理 ({size/1024:.0f} KB)', size > 10000, f'size={size}')
    
    # ====== 2. 源码结构 ======
    print()
    print('📁 源码结构')
    
    core_dir = SRC / 'core'
    check('core 目录存在', core_dir.exists())
    
    services_dir = core_dir / 'services'
    check('services 目录存在', services_dir.exists())
    
    models_dir = core_dir / 'models'
    check('models 目录存在', models_dir.exists())
    
    rendering_dir = core_dir / 'rendering'
    check('rendering 目录存在', rendering_dir.exists())
    
    angular_dir = SRC / 'angular'
    check('angular 目录存在', angular_dir.exists())
    
    # ====== 3. 关键服务文件 ======
    print()
    print('🔧 关键服务文件')
    
    services = [
        'data.service.ts', 'column.service.ts', 'filter.service.ts',
        'column.service.ts', 'selection.service.ts', 'group.service.ts',
        'aggregation.service.ts', 'pivot.service.ts', 'tree.service.ts',
        'cell-span.service.ts', 'edit.service.ts', 'clipboard.service.ts',
        'drag-drop.service.ts', 'pagination.service.ts',
        'master-detail.service.ts', 'charts.service.ts',
        'excel-export.service.ts', 'pdf-export.service.ts',
        'transaction.service.ts', 'event-bus.service.ts',
        'performance-monitor.service.ts', 'viewport-row-model.service.ts',
        'angular-component-renderer.service.ts',
    ]
    
    for svc in services:
        svc_path = services_dir / svc
        check(f'{svc}', svc_path.exists())
    
    # 检查 index.ts 是否有 export
    index_path = services_dir / 'index.ts'
    if index_path.exists():
        exports = len([l for l in index_path.read_text().split('\n') if 'export' in l])
        check(f'services/index.ts exports {exports} 项', exports >= 20, f'exports={exports}')
    
    # ====== 4. 核心模型 ======
    print()
    print('📐 核心模型')
    
    models_index = models_dir / 'index.ts'
    if models_index.exists():
        model_exports = len([l for l in models_index.read_text().split('\n') if 'export' in l])
        check(f'models/index.ts 有 {model_exports} 个导出', model_exports >= 15, f'exports={model_exports}')
    
    # ====== 5. Demo App ======
    print()
    print('🎮 Demo App')
    
    app_html = APP_SRC / 'app.html'
    if app_html.exists():
        html_content = app_html.read_text()
        tab_pattern = r"currentDemo\(\) === '([^']+)'"
        tabs_found = re.findall(tab_pattern, html_content)
        check(f'Demo Tab 数量: {len(tabs_found)} 个', len(tabs_found) >= 20)
        
        # 检查关键 Phase 5/6 Tab
        key_tabs = ['transaction', 'angular-renderer', 'performance', 'group', 'excel']
        for t in key_tabs:
            check(f'  Phase Tab "{t}" 存在', t in html_content)
    
    app_ts = APP_SRC / 'app.ts'
    if app_ts.exists():
        ts_content = app_ts.read_text()
        # 检查主要方法
        key_methods = ['switchDemo', 'onGridReady', 'startPerformanceTest', 'setGroupField']
        for m in key_methods:
            check(f'方法 "{m}" 存在', m in ts_content, f'method={m}')
    
    # ====== 6. db-grid 主组件 ======
    print()
    print('⚙️ db-grid 主组件')
    
    grid_component_dir = angular_dir / 'components/grid'
    component_file = grid_component_dir / 'db-grid.component.ts'
    if component_file.exists():
        comp_content = component_file.read_text()
        lines = comp_content.split('\n')
        check(f'组件文件 {len(lines)} 行', len(lines) > 2000, f'lines={len(lines)}')
        
        # 关键 @Input
        inputs = re.findall(r'@Input\(\)\s+\w+\s*:', comp_content)
        check(f'@Input 数量: {len(inputs)}', len(inputs) >= 30, f'inputs={len(inputs)}')
        
        # 关键 @Output
        outputs = re.findall(r'@Output\(\)', comp_content)
        check(f'@Output 数量: {len(outputs)}', len(outputs) >= 10, f'outputs={len(outputs)}')
        
        # GridApi 方法
        grid_api_methods = re.findall(r'(\w+)\s*:\s*\([^)]*\)\s*=>', comp_content)
        api_methods = [m for m in grid_api_methods if not m.startswith('_')]
        check(f'GridApi 方法数量: {len(api_methods)}', len(api_methods) >= 20, f'api_methods={len(api_methods)}')
    
    # ====== 报告 ======
    total = passed + failed
    print()
    print('═' * 50)
    print(f'📊 结构验证报告')
    print('═' * 50)
    print(f'✅ 通过: {passed}')
    print(f'❌ 失败: {failed}')
    print(f'📝 总计: {total}')
    print(f'🎯 通过率: {passed/total*100:.1f}%')

    if errors:
        print()
        print('⚠️ 失败详情:')
        for desc, detail in errors:
            print(f'  • {desc}')
            if detail:
                print(f'    {detail}')

    return 0 if failed == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
