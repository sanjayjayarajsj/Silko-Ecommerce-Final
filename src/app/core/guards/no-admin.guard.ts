import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Opposite of adminGuard: keeps a logged-in ADMIN off the customer-facing
// pages (home, products, cart, checkout, profile, etc). Admin accounts
// are for managing the store, not shopping as a customer - if they're
// logged in as admin and land on any user-side page (by typing the URL,
// clicking a stale link, browser back/forward, etc), send them back to
// the admin panel instead.
export const noAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return router.createUrlTree(['/admin']);
  }
  return true;
};