import { Component,input,inject } from '@angular/core';
import { Product } from '../../features/products/product.model';
import { addToCart } from '../../store/cart/cart.actions';
import { selectCartItems } from '../../store/cart/cart.selectors';
import { Store } from '@ngrx/store';
import { Router, RouterLink } from '@angular/router';
import { addToWishlist } from '../../store/wishlist/wishlist.actions';
import { selectWishlistItems } from '../../store/wishlist/wishlist.selectors';
import { AuthService } from '../../core/services/auth.service';
import { BuyNowService } from '../../features/checkout/buy-now.service';
import { handleImageError } from '../image-fallback';
import { ToastService } from '../../core/services/toast.service';
import { take } from 'rxjs';
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css'
})
export class ProductCardComponent {
  private authService=inject(AuthService)
  private store=inject(Store)
  private router=inject(Router)
  private buyNowService=inject(BuyNowService)
  private toast=inject(ToastService)
product=input.required<Product>();
handleImageError=handleImageError;

// Dummy rating derived from the product id, so it stays consistent
// across reloads without needing real review data.
get rating(): number {
  return 3.5 + (this.product().id % 4) * 0.5;
}

get reviewCount(): number {
  return 20 + ((this.product().id * 7) % 180);
}

get ratingStars(): number[] {
  return [1, 2, 3, 4, 5];
}

addToCart() {
  const userId = this.authService.getUserId();

  if (!userId) {
    this.toast.show('Please login to continue');
    this.router.navigate(['/login']);
    return;
  }

  this.store.select(selectCartItems).pipe(take(1)).subscribe(items => {
    const existingItem = items.find(
      item => item.product.id === this.product().id
    );

    if (existingItem) {
      this.toast.show('Product is already in your cart');
      return;
    }

    this.store.dispatch(
      addToCart({
        product: this.product(),
        userId: userId
      })
    );
    this.toast.show('Added to cart');
  });
}
addProductToWishlist(event: Event) {
  event.preventDefault();
  event.stopPropagation();

  const userId = this.authService.getUserId();

  if (!userId) {
    this.toast.show('Please login to continue');
    this.router.navigate(['/login']);
    return;
  }

  this.store.select(selectWishlistItems).pipe(take(1)).subscribe(items => {
    const existingItem = items.find(
      item => item.product.id === this.product().id
    );

    if (existingItem) {
      this.toast.show('Product is already in your wishlist');
      return;
    }

    this.store.dispatch(
      addToWishlist({
        product: this.product(),
        userId: userId
      })
    );
    this.toast.show('Added to Wishlist');
  });
}

buyNow(event: Event) {
  event.preventDefault();
  event.stopPropagation();

  const userId = this.authService.getUserId();
  if (!userId) {
    this.toast.show('Please login to continue');
    this.router.navigate(['/login']);
    return;
  }

  this.buyNowService.setItem(this.product(), 1);
  this.router.navigate(['/checkout']);
}
}