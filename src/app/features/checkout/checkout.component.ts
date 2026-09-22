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
import { selectAddresses } from '../../store/address/address.selectors';
import { loadAddresses } from '../../store/address/address.actions';
import { Address } from '../address/address.model';
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
isPlacingOrder=false;

// Saved addresses, so the user can pick one instead of retyping it.
savedAddresses$ = this.store.select(selectAddresses);
selectedAddressId: string | number | null = null;

// Payment method - this is a UI-only mock, no real payment gateway.
paymentMethod: 'Card' | 'UPI' | 'COD' | '' = '';
cardNumber = '';
cardExpiry = '';
cardCvv = '';
upiId = '';

constructor() {
  this.store.dispatch(loadAddresses());
}

selectAddress(addr: Address) {
  this.selectedAddressId = addr.id ?? null;
  this.fullName = addr.fullName;
  this.address = addr.address;
  this.city = addr.city;
  this.pincode = addr.pincode;
}

isValidPin(): boolean {
  return /^\d{6}$/.test(this.pincode);
}

isValidCard(): boolean {
  return (
    /^\d{16}$/.test(this.cardNumber.replace(/\s/g, '')) &&
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(this.cardExpiry) &&
    /^\d{3}$/.test(this.cardCvv)
  );
}

isValidUpi(): boolean {
  return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(this.upiId);
}

isPaymentValid(): boolean {
  if (this.paymentMethod === 'Card') {
    return this.isValidCard();
  }
  if (this.paymentMethod === 'UPI') {
    return this.isValidUpi();
  }
  return this.paymentMethod === 'COD';
}

placeOrder() {
  this.submitted = true;

  if (
    !this.fullName ||
    !this.address ||
    !this.city ||
    !this.isValidPin() ||
    !this.isPaymentValid()
  ) {
    return;
  }

  // Guard against double-clicks / double-submits, which is what was
  // causing two orders (sometimes from different users) to briefly
  // race for the same next order id from json-server.
  if (this.isPlacingOrder) {
    return;
  }
  this.isPlacingOrder = true;

  const userId = this.authService.getUserId();
  if (!userId) {
    this.isPlacingOrder = false;
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
        paymentMethod: this.paymentMethod as 'Card' | 'UPI' | 'COD',
        status: 'Pending' as const,
        createdAt: new Date().toISOString(),
        items: items,
        total: total
      };

          this.orderService.placeOrder(order).subscribe({
            next: placedOrder => {

        if (!this.isBuyNow) {
          this.store.dispatch(clearCart());
        }

        this.router.navigate(['/order-success'], {
          state: {
            orderId: placedOrder.id,
            total: total,
            items: items,
            paymentMethod: this.paymentMethod
          }
        });
            },
            error: () => {
              this.isPlacingOrder = false;
              this.toast.show('Something went wrong placing your order. Please try again.');
            }
          });
});
});
};
};