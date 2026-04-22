const fs = require('fs');
const files = [
  'C:/Users/will/.qclaw/workspace/db-grid/projects/db-grid/src/lib/core/services/data.service.spec.ts',
  'C:/Users/will/.qclaw/workspace/db-grid/projects/db-grid/src/lib/core/services/editor.service.spec.ts',
  'C:/Users/will/.qclaw/workspace/db-grid/projects/db-grid/src/lib/core/services/filter.service.spec.ts',
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(
    "import { describe, it, expect, beforeEach } from '@angular/core/testing';\n",
    "/// <reference types='jasmine' />\n"
  );
  fs.writeFileSync(f, content, 'utf8');
  console.log('Fixed:', f.split('/').pop());
});