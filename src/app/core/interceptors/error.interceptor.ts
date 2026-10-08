import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, retry, throwError, timer } from 'rxjs';
import { ToastService } from '../services/toast.service';

let lastOfflineToast = 0;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  return next(req).pipe(
    // Retry a failed GET once (server blip). Never retry POST/PATCH/DELETE:
    // that could place the same order twice.
    retry({
      count: req.method === 'GET' ? 1 : 0,
      delay: (err: unknown) =>
        err instanceof HttpErrorResponse && (err.status === 0 || err.status >= 500)
          ? timer(400)
          : throwError(() => err)
    }),
    catchError((err: HttpErrorResponse) => {
      // status 0 = server unreachable. Other errors are handled by each screen.
      // Throttled so 3 parallel failing requests show one toast, not three.
      if (isBrowser && err.status === 0 && Date.now() - lastOfflineToast > 4000) {
        lastOfflineToast = Date.now();
        toast.show('Cannot reach the server. Check your connection and try again.');
      }
      return throwError(() => err);
    })
  );
};