import { Component,inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectCartItems,selectCartTotal } from '../../store/cart/cart.selectors';
import { Router } from '@angular/router';
import { clearCart } from '../../store/cart/cart.actions';
import { FormsModule } from '@angular/forms';
import { OrderService } from './order.service';
import { AuthService } from '../../core/services/auth.service';
import { BuyNowService } from './buy-now.service';
import { take, of } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [AsyncPipe,FormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {
private store=inject(Store)
private router=inject(Router)
private orderService=inject(OrderService);
private authService=inject(AuthService);
private buyNowService=inject(BuyNowService);
private toast=inject(ToastService)

// A "buy now" purchase is a single item bought directly, bypassing the cart.
private buyNowItem = this.buyNowService.takeItem();
isBuyNow = !!this.buyNowItem;

cartItems = this.buyNowItem
  ? of([{ product: this.buyNowItem.product, quantity: this.buyNowItem.quantity }])
  : this.store.select(selectCartItems);

cartTotal = this.buyNowItem
  ? of(this.buyNowItem.product.price * this.buyNowItem.quantity)
  : this.store.select(selectCartTotal);
fullName='';
address='';
city='';
pincode='';
submitted=false;
isValidPin(): boolean {
  return /^\d{6}$/.test(this.pincode);
}
placeOrder() {
  this.submitted = true;

  if (
    !this.fullName ||
    !this.address ||
    !this.city ||
    !this.isValidPin()
  ) {
    return;
  }

  const userId = this.authService.getUserId();
  if (!userId) {
    this.router.navigate(['/login']);
    return;
  }

  this.cartItems.pipe(take(1)).subscribe(items => {
    this.cartTotal.pipe(take(1)).subscribe(total => {

      const order = {
        userId: userId,
        fullName: this.fullName,
        address: this.address,
        city: this.city,
        pincode: this.pincode,
        items: items,
        total: total
      };

          this.orderService.placeOrder(order).subscribe(placedOrder => {

        if (!this.isBuyNow) {
          this.store.dispatch(clearCart());
        }

        this.router.navigate(['/order-success'], {
          state: {
            orderId: placedOrder.id,
            total: total
          }
        });
  });
});
});
};
};


