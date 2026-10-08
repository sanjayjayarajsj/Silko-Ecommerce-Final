import { Component,inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectCartItems, selectCartTotal } from '../../store/cart/cart.selectors';
import { increaseQuantity,decreaseQuantity,removeFromCart,updateCartQuantity } from '../../store/cart/cart.actions';
import { MAX_QUANTITY_PER_PRODUCT } from '../../store/cart/cart.state';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [AsyncPipe,RouterLink,ConfirmationDialogComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent {
  private store = inject(Store);
  private toast=inject(ToastService)
  readonly maxQuantityPerProduct = MAX_QUANTITY_PER_PRODUCT;
  cartItems = this.store.select(selectCartItems);
  cartTotal = this.store.select(selectCartTotal);
  showRemoveDialog = false;
selectedProductId: number | null = null;
increase(productId: number) {
  this.cartItems.pipe(take(1)).subscribe(items => {
    const item = items.find(
      item => item.product.id === productId
    );

    if (!item) {
      return;
    }

    if (item.quantity >= MAX_QUANTITY_PER_PRODUCT) {
      this.toast.show(`You can only add up to ${MAX_QUANTITY_PER_PRODUCT} of the same item`);
      return;
    }

    if (item.quantity >= item.product.stock) {
      this.toast.show(`Only ${item.product.stock} of ${item.product.name} left in stock`);
      return;
    }

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
openRemoveDialog(productId: number): void {
  this.selectedProductId = productId;
  this.showRemoveDialog = true;
}

closeRemoveDialog(): void {
  this.showRemoveDialog = false;
  this.selectedProductId = null;
}

remove(): void {
  if (this.selectedProductId === null) {
    return;
  }

  this.store.dispatch(
    removeFromCart({
      productId: this.selectedProductId
    })
  );

  this.toast.show('Removed from cart');

  this.closeRemoveDialog();
}
}