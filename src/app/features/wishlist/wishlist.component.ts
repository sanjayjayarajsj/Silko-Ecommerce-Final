import { Component,inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectWishlistItems } from '../../store/wishlist/wishlist.selectors';
import { removeFromWishlist } from '../../store/wishlist/wishlist.actions';
import { addToCart } from '../../store/cart/cart.actions';
import { selectCartItems } from '../../store/cart/cart.selectors';
import { MAX_PRODUCTS_IN_CART } from '../../store/cart/cart.state';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Product } from '../products/product.model';
import { take } from 'rxjs';
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
addToCart(product: Product) {
  const userId = this.authService.getUserId();
  if (!userId) {
    return;
  }

  this.store.select(selectCartItems).pipe(take(1)).subscribe(items => {
    const existingItem = items.find(item => item.product.id === product.id);

    if (existingItem) {
      this.toast.show('Product is already in your cart');
      return;
    }

    if (items.length >= MAX_PRODUCTS_IN_CART) {
      this.toast.show(`Your cart is full. You can add up to ${MAX_PRODUCTS_IN_CART} different products.`);
      return;
    }

    this.store.dispatch(
      addToCart({
        product: product,
        userId: userId
      })
    );
    this.toast.show('Added to cart');
  });
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