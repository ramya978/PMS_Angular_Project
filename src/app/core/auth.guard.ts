import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Same session key as the legacy sign-in (js/core/auth.js).
const SESSION_KEY = 'avivpms.session';

export const authGuard: CanActivateFn = (_route, state) => {
  let signedIn = false;
  try {
    signedIn = !!sessionStorage.getItem(SESSION_KEY);
  } catch {
    signedIn = false;
  }
  if (signedIn) return true;
  return inject(Router).createUrlTree(['/' + 'common/cm-01-login'], { queryParams: { next: state.url } });
};
