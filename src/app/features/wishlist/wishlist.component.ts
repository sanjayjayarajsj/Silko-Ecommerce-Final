import { Component,inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectWishlistItems } from '../../store/wishlist/wishlist.selectors';
import { removeFromWishlist } from '../../store/wishlist/wishlist.actions';
import { addToCart } from '../../store/cart/cart.actions';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css'
})
export class WishlistComponent {
private authService=inject(AuthService);
private store=inject(Store);
private toast=inject(ToastService)
addToCart(product: any) {
const userId = this.authService.getUserId();
  if (!userId) {
    return;
  }

  this.store.dispatch(
    addToCart({
      product: product,
      userId: userId
    })
  );
}
removeFromWishlist(productId: number) {
  this.store.dispatch(
    removeFromWishlist({
      productId: productId
    })
  );
}
wishlistItems=this.store.select(selectWishlistItems);
}
