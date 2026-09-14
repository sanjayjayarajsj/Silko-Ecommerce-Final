import { Component,inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../product.service';
import { Product } from '../product.model';
import { Store } from '@ngrx/store';
import { addToCart } from '../../../store/cart/cart.actions';
import { addToWishlist } from '../../../store/wishlist/wishlist.actions';
import { AuthService } from '../../../core/services/auth.service';
import { BuyNowService } from '../../checkout/buy-now.service';
import { handleImageError } from '../../../shared/image-fallback';
import { ToastService } from '../../../core/services/toast.service';
@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent {
private authService=inject(AuthService);
private route=inject(ActivatedRoute);
private router=inject(Router);
private productService=inject(ProductService);
private buyNowService=inject(BuyNowService);
private toast=inject(ToastService)
product:Product|undefined;
private store = inject(Store);
handleImageError=handleImageError;

get rating(): number {
  return this.product ? 3.5 + (this.product.id % 4) * 0.5 : 0;
}

get reviewCount(): number {
  return this.product ? 20 + ((this.product.id * 7) % 180) : 0;
}

get ratingStars(): number[] {
  return [1, 2, 3, 4, 5];
}

addToCart() {
  if (!this.product) {
    return;
  }

  const userId = this.authService.getUserId();
  if (!userId) {
    return;
  }

  this.store.dispatch(
    addToCart({
      product: this.product,
      userId: userId
    })
  );
   this.toast.show('Added to cart');
}
addToWishlist() {
  if (!this.product) {
    return;
  }

  const userId = this.authService.getUserId();

  if (!userId) {
    return;
  }

  this.store.dispatch(
    addToWishlist({
      product: this.product,
      userId: userId
    })
  );
   this.toast.show('Added to Wishlist');
}
buyNow() {
  if (!this.product) {
    return;
  }

  const userId = this.authService.getUserId();
  if (!userId) {
    this.router.navigate(['/login']);
    return;
  }

  this.buyNowService.setItem(this.product, 1);
  this.router.navigate(['/checkout']);
}
constructor(){
  const id=Number(this.route.snapshot.paramMap.get('id'));
  this.productService.getProducts().subscribe(products=>{
    this.product=products.find(product=>product.id===id)
  });
}
}
