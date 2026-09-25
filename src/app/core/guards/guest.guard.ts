import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Opposite of authGuard: keeps a LOGGED-IN user away from /login and
// /register. Angular's router re-runs guards on browser back/forward
// (popstate) navigations too, so this also stops a logged-in user from
// landing back on the login page by pressing the browser back button.
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return router.createUrlTree(['/home']);
  }
  return true;
};