import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, map, of } from 'rxjs';
import { CartService } from '../../features/cart/cart.service';
import { loadCart,loadCartSuccess,addToCart,removeFromCart,updateCartQuantity,clearCart } from './cart.actions';
import { AuthService } from '../../core/services/auth.service';
@Injectable()
export class CartEffects {
private authService=inject(AuthService);
  private actions$ = inject(Actions);
  private cartService = inject(CartService);
  loadCart$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadCart),
    switchMap(() => {
      const userId = this.authService.getUserId();

      if (!userId) {
        return [];
      }

      return this.cartService.getCart(userId).pipe(
        map(items =>
          loadCartSuccess({ items })
        )
      );
    })
  )
);
addToCart$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(addToCart),

      switchMap(({ product, userId }) =>
        this.cartService.findCartItem(product.id, userId).pipe(

          switchMap(items => {

            if (items.length > 0) {
              return [];
            }

            return this.cartService.addToCart({
              userId: userId,
              product: product,
              quantity: 1
            });

          })

        )
      )
    ),
  { dispatch: false }
);
removeFromCart$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(removeFromCart),

      switchMap(({ productId }) =>
      this.cartService.findCartItem(
  productId,
  this.authService.getUserId()!
).pipe(

          switchMap(items => {

            if (items.length === 0) {
              return [];
            }

            return this.cartService.removeFromCart(
              items[0].id!
            );
          })

        )
      )
    ),
  { dispatch: false }
);
updateCartQuantity$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(updateCartQuantity),

      switchMap(({ productId, quantity }) =>
       this.cartService.findCartItem(
  productId,
  this.authService.getUserId()!
).pipe(
          switchMap(items => {

            if (items.length === 0) {
              return [];
            }

            const item = items[0];

            return this.cartService.updateCart(
              item.id!,
              quantity
            );

          })
        )
      )
    ),
  { dispatch: false }
);
// Runs whenever clearCart is dispatched (e.g. after checkout succeeds).
// Deletes the persisted cart rows so they don't reappear on next login.
clearCart$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(clearCart),

      switchMap(() => {
        const userId = this.authService.getUserId();

        if (!userId) {
          return of([]);
        }

        return this.cartService.clearCart(userId);
      })
    ),
  { dispatch: false }
);
}

