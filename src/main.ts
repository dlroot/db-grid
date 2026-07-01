import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from "./app/app.config";
import { AppComponent } from "./app/app";

// 调试：在页面加载前显示状态
console.log('[DB-Grid] Angular app starting...');
console.log('[DB-Grid] Environment:', {
  userAgent: navigator.userAgent,
  location: window.location.href,
  baseHref: document.querySelector('base')?.href
});

// 手机调试：Eruda console
if (typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
  import('eruda').then(module => {
    module.default.init();
    console.log('[Eruda] 已启用手机调试面板');
  }).catch(err => console.warn('[Eruda] 加载失败:', err));
}

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('[DB-Grid] Angular app bootstrapped successfully!');
  })
  .catch((err) => {
    console.error('[DB-Grid] Bootstrap failed:', err);
    // 在页面上显示错误
    const appRoot = document.querySelector('app-root');
    if (appRoot) {
      appRoot.innerHTML = `
        <div style="padding: 20px; font-family: monospace; background: #fee; color: #c00;">
          <h2>Angular Bootstrap Error</h2>
          <pre>${err.message || err}</pre>
          <p>Check browser console for details.</p>
        </div>
      `;
    }
  });
