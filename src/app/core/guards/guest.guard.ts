import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// For the login and register pages: a user who is already logged in
// should never see them (e.g. after pressing the browser Back button).
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree([authService.isAdmin() ? '/admin' : '/home']);
};