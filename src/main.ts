import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from "./app/app.config";
import { AppComponent } from "./app/app";

// 手机调试：Eruda console
if (typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
  import('eruda').then(module => {
    module.default.init();
    console.log('[Eruda] 已启用手机调试面板');
  });
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
