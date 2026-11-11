import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ScreenOptions, ScreenStyles } from '../core/screen-styles';
import { ScreenLoader } from '../shared/screen-loader/screen-loader';

// One component renders every legacy screen. The route's data holds the screen's title, stylesheets,
// scripts and the URL of its HTML body.
@Component({
  selector: 'app-screen-page',
  imports: [ScreenLoader],
  templateUrl: './screen-page.html',
})
export class ScreenPage implements OnDestroy {
  private readonly styles = inject(ScreenStyles);
  private readonly opts = inject(ActivatedRoute).snapshot.data['screen'] as ScreenOptions;
  protected readonly ready = signal(false);
  protected readonly title = this.opts.title;

  constructor() {
    this.styles
      .show(this.opts)
      .then((current) => {
        if (current) this.ready.set(true);
      })
      .catch(() => this.ready.set(false));
  }

  ngOnDestroy(): void {
    this.styles.release();
  }
}
