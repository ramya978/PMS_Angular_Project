import { Component, OnDestroy, input, signal } from '@angular/core';

// Shown while a screen's styles and code load. Uses the hotel night picture and the theme variables.
@Component({
  selector: 'app-screen-loader',
  templateUrl: './screen-loader.html',
})
export class ScreenLoader implements OnDestroy {
  readonly title = input('Opening screen');
  protected readonly shown = signal(false);
  protected readonly slow = signal(false);
  private readonly showTimer = setTimeout(() => this.shown.set(true), 250);
  private readonly slowTimer = setTimeout(() => this.slow.set(true), 6000);

  ngOnDestroy(): void {
    clearTimeout(this.showTimer);
    clearTimeout(this.slowTimer);
  }
}
