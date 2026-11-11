import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  private readonly router = inject(Router);

  constructor() {
    // Legacy pages link to each other with plain <a href>. Keep those navigations inside the app.
    document.addEventListener('click', (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return;
      event.preventDefault();
      const path = url.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/^\/(?!$)/, '').replace(/\/$/, '');
      this.router.navigateByUrl('/' + path + url.search + url.hash);
    });
  }
}
