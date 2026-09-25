import { Component,inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../product.service';
import { Product } from '../product.model';
import { Store } from '@ngrx/store';
import { addToCart } from '../../../store/cart/cart.actions';
import { selectCartItems } from '../../../store/cart/cart.selectors';
import { addToWishlist } from '../../../store/wishlist/wishlist.actions';
import { selectWishlistItems } from '../../../store/wishlist/wishlist.selectors';
import { AuthService } from '../../../core/services/auth.service';
import { BuyNowService } from '../../checkout/buy-now.service';
import { handleImageError } from '../../../shared/image-fallback';
import { ToastService } from '../../../core/services/toast.service';
import { take } from 'rxjs';
import { ProductCardComponent } from '../../../shared/product-card/product-card.component';
@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [ProductCardComponent],
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
// Other products from the same category, shown as "You may also like".
similarProducts: Product[] = [];
private store = inject(Store);
handleImageError=handleImageError;

// Which gallery image is currently shown as the main image.
selectedImage = '';

// Hover-to-zoom: track where the cursor is over the image so the
// zoomed-in view centers on that exact spot.
zoomOrigin = 'center';
isZooming = false;

selectImage(img: string) {
  this.selectedImage = img;
}

onImageHover(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  this.zoomOrigin = `${x}% ${y}%`;
  this.isZooming = true;
}

resetZoom() {
  this.isZooming = false;
}

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
    this.toast.show('Please login to continue');
    this.router.navigate(['/login']);
    return;
  }

  const product = this.product;

  this.store.select(selectCartItems).pipe(take(1)).subscribe(items => {
    const existingItem = items.find(
      item => item.product.id === product.id
    );

    if (existingItem) {
      this.toast.show('Product is already in your cart');
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
addToWishlist() {
  if (!this.product) {
    return;
  }

  const userId = this.authService.getUserId();

  if (!userId) {
    this.toast.show('Please login to continue');
    this.router.navigate(['/login']);
    return;
  }

  this.store.select(selectWishlistItems).pipe(take(1)).subscribe(items => {
    const existingItem = items.find(
      item => item.product.id === this.product!.id
    );

    if (existingItem) {
      this.toast.show('Product is already in your wishlist');
      return;
    }

    this.store.dispatch(
      addToWishlist({
        product: this.product!,
        userId: userId
      })
    );
    this.toast.show('Added to Wishlist');
  });
}
buyNow() {
  if (!this.product) {
    return;
  }

  const userId = this.authService.getUserId();
  if (!userId) {
    this.toast.show('Please login to continue');
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
    if (this.product) {
      this.selectedImage = this.product.image;

      this.similarProducts = products
        .filter(p => p.category === this.product!.category && p.id !== this.product!.id)
        .slice(0, 4);
    }
  });
}
}