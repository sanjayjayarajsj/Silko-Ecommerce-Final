import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, map } from 'rxjs';
import { WishlistService } from '../../features/wishlist/wishlist.service';
import {loadwishlist,loadwishlistsuccess,addToWishlist,removeFromWishlist} from './wishlist.actions';
import { AuthService } from '../../core/services/auth.service';

@Injectable()
export class WishlistEffects {
  private authService=inject(AuthService);
  private actions$ = inject(Actions);
  private wishlistService = inject(WishlistService);

  loadWishlist$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadwishlist),
    switchMap(() => {
      const userId = this.authService.getUserId();
      if (!userId) {
        return [];
      }
      return this.wishlistService.getWishlist(userId).pipe(
        map(items =>
          loadwishlistsuccess({ items })
        )
      );
    })
  )
);
addToWishlist$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(addToWishlist),
      switchMap(({ product, userId }) =>
        this.wishlistService
          .findWishlistItem(product.id, userId)
          .pipe(
            switchMap(items => {
              if (items.length > 0) {
                return [];
              }

              return this.wishlistService.addToWishlist({
                userId: userId,
                product: product
              });
            })
          )
      )
    ),
  { dispatch: false }
);
removeFromWishlist$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(removeFromWishlist),

      switchMap(({ productId }) => {
        const userId = this.authService.getUserId();
        if (!userId) {
          return [];
        }
        return this.wishlistService
          .findWishlistItem(productId, userId)
          .pipe(
            switchMap(items => {
              if (items.length === 0) {
                return [];
              }
              return this.wishlistService.removeFromWishlist(items[0].id as number);
            })
          );
      })
    ),
  { dispatch: false }
);
}