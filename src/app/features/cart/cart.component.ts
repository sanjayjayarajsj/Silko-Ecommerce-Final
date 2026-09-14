import { Component,inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectCartItems, selectCartTotal } from '../../store/cart/cart.selectors';
import { increaseQuantity,decreaseQuantity,removeFromCart,updateCartQuantity } from '../../store/cart/cart.actions';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [AsyncPipe,RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent {
  private store = inject(Store);
  private toast=inject(ToastService)
  cartItems = this.store.select(selectCartItems);
  cartTotal = this.store.select(selectCartTotal);
increase(productId: number) {
  this.cartItems.pipe(take(1)).subscribe(items => {
    const item = items.find(
      item => item.product.id === productId
    );

    if (item) {
      const newQuantity = item.quantity + 1;

      this.store.dispatch(
        increaseQuantity({ productId })
      );

      this.store.dispatch(
        updateCartQuantity({
          productId,
          quantity: newQuantity
        })
      );
    }
  });
}
decrease(productId: number) {
  this.cartItems.pipe(take(1)).subscribe(items => {

    const item = items.find(
      item => item.product.id === productId
    );

    if (!item) {
      return;
    }

    const newQuantity = item.quantity - 1;

    this.store.dispatch(
      decreaseQuantity({ productId })
    );

    if (newQuantity > 0) {

      this.store.dispatch(
        updateCartQuantity({
          productId,
          quantity: newQuantity
        })
      );

    } else {

      this.store.dispatch(
        removeFromCart({ productId })
      );

    }

  });
}
remove(productId:number){
  this.store.dispatch(removeFromCart({productId}));
  this.toast.show("Removed from cart")
}
}

