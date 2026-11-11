import { Injectable } from '@angular/core';

import { BEHAVIOURS } from './behaviours';

export interface ScreenOptions {
  title: string;
  sheets: string[];
  inlineCss: string | null;
  scripts: { src: string; module: boolean }[];
  htmlUrl: string | null;
  bodyAttrs?: Record<string, string>;
  behaviour?: string | null;
}

// Loads one screen's stylesheets and inline CSS, and shows the markup only after they have loaded.
// When the screen closes, its stylesheets and scripts are removed, so one screen's CSS never leaks into another.
@Injectable({ providedIn: 'root' })
export class ScreenStyles {
  private token = 0;
  private nodes: HTMLElement[] = [];

  show(opts: ScreenOptions): Promise<boolean> {
    const mine = ++this.token;
    this.clear();
    this.applyBodyAttrs(opts.bodyAttrs ?? {});
    document.title = opts.title;

    const links = opts.sheets.map((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset['screenSheet'] = '1';
      document.head.appendChild(link);
      return link;
    });
    this.nodes.push(...links);

    if (opts.inlineCss) {
      const style = document.createElement('style');
      style.dataset['screenSheet'] = '1';
      style.textContent = opts.inlineCss;
      document.head.appendChild(style);
      this.nodes.push(style);
    }

    const loaded = links.map(
      (link) =>
        new Promise<void>((resolve, reject) => {
          link.addEventListener('load', () => resolve(), { once: true });
          link.addEventListener('error', () => reject(new Error(link.href)), { once: true });
        }),
    );

    // Styles are in, so the screen may render now. The body (for very large pages, fetched as HTML)
    // and the page scripts are attached once the screen root exists.
    return Promise.all(loaded).then(() => {
      const current = mine === this.token;
      if (current) void this.mountBody(opts, mine);
      return current;
    });
  }

  release(): void {
    this.token++;
    this.clear();
  }

  private clear(): void {
    this.nodes.forEach((n) => n.remove());
    this.nodes = [];
    this.removeBodyAttrs();
  }

  // The legacy stylesheet sizes screens with body[data-screen] selectors, so each screen's <body>
  // attributes are copied onto the real document body while it is open.
  private bodyAttrNames: string[] = [];

  private applyBodyAttrs(attrs: Record<string, string>): void {
    this.removeBodyAttrs();
    for (const [name, value] of Object.entries(attrs)) {
      if (name === 'class') {
        value.split(/\s+/).filter(Boolean).forEach((c) => document.body.classList.add(c));
      } else {
        document.body.setAttribute(name, value);
        this.bodyAttrNames.push(name);
      }
    }
    this.bodyClasses = Object.entries(attrs).find(([n]) => n === 'class')?.[1].split(/\s+/).filter(Boolean) ?? [];
  }

  private bodyClasses: string[] = [];

  private removeBodyAttrs(): void {
    this.bodyAttrNames.forEach((n) => document.body.removeAttribute(n));
    this.bodyAttrNames = [];
    this.bodyClasses.forEach((c) => document.body.classList.remove(c));
    this.bodyClasses = [];
  }

  private async mountBody(opts: ScreenOptions, mine: number): Promise<void> {
    const root = await this.waitForRoot(mine);
    if (!root || mine !== this.token) return;
    if (opts.htmlUrl) {
      const res = await fetch(opts.htmlUrl);
      if (!res.ok || mine !== this.token) return;
      root.innerHTML = await res.text();
      if (opts.behaviour && BEHAVIOURS[opts.behaviour]) BEHAVIOURS[opts.behaviour](root);
    }
    this.runScripts(opts.scripts, mine);
  }

  private waitForRoot(mine: number): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      let tries = 0;
      const check = () => {
        const root = document.querySelector<HTMLElement>('.screen-root');
        if (root || mine !== this.token || tries++ > 300) return resolve(root);
        requestAnimationFrame(check);
      };
      check();
    });
  }

  // Page scripts need the markup in the DOM, so they are added only after the screen root has been rendered.
  private runScripts(scripts: { src: string; module: boolean }[], mine: number, tries = 0): void {
    if (mine !== this.token || scripts.length === 0) return;
    if (!document.querySelector('.screen-root')) {
      if (tries < 300) requestAnimationFrame(() => this.runScripts(scripts, mine, tries + 1));
      return;
    }
    for (const s of scripts) {
      const el = document.createElement('script');
      if (s.module) el.type = 'module';
      el.src = s.src + (s.src.includes('?') ? '&' : '?') + 'visit=' + Date.now();
      document.body.appendChild(el);
      this.nodes.push(el);
    }
  }
}
