import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { EMPTY, catchError, throwError } from 'rxjs';
import { API_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const isApiCall = req.url.startsWith(API_URL);

  if (!isApiCall) {
    return next(req);
  }

  // The server cannot see the user's login, so it must not ask for private data.
  // It only loads the public product list; the browser fetches the rest
  // (with the token) right after the page loads.
  if (!isBrowser) {
    const isPublicRead = req.method === 'GET' && req.url.startsWith(`${API_URL}/products`);
    return isPublicRead ? next(req) : EMPTY;
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const token = localStorage.getItem('token');
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 on any call except the login itself = the token is no longer valid
      // (expired, or the account was deactivated). Send the user to log in again.
      if (err.status === 401 && token && !req.url.endsWith('/login') && auth.isLoggedIn()) {
        auth.logout();
        toast.show('Session expired. Please log in again.');
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};