import { Component,inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectCartItems,selectCartTotal } from '../../store/cart/cart.selectors';
import { Router, RouterLink } from '@angular/router';
import { clearCart } from '../../store/cart/cart.actions';
import { FormsModule } from '@angular/forms';
import { OrderService } from './order.service';
import { AuthService } from '../../core/services/auth.service';
import { BuyNowService } from './buy-now.service';
import { take, of } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import { selectAddresses } from '../../store/address/address.selectors';
import { loadAddresses, addAddress } from '../../store/address/address.actions';
import { Address } from '../address/address.model';
import { ProductService } from '../products/product.service';
import {
  sanitizeNameInput,
  sanitizeAddressInput,
  sanitizePincodeInput,
  sanitizePhoneInput,
  isValidName,
  isValidCity,
  isValidAddress,
  isValidPincode,
  isValidPhone
} from '../../shared/form-validators';
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [AsyncPipe,FormsModule,RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {
private store=inject(Store)
private router=inject(Router)
private orderService=inject(OrderService);
private authService=inject(AuthService);
private buyNowService=inject(BuyNowService);
private productService=inject(ProductService);
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
phone='';
address='';
city='';
pincode='';
submitted=false;
isPlacingOrder=false;

// Saved addresses, so the user can pick one instead of retyping it.
savedAddresses$ = this.store.select(selectAddresses);
private savedAddressList = this.store.selectSignal(selectAddresses);
selectedAddressId: string | number | null = null;

// "Save this address for next time" (offered for a new address only)
saveThisAddress = false;
saveAddressType: 'Home' | 'Work' = 'Home';

// Payment method. This is a demo store: no real payment is taken, so no
// card or UPI details are asked for.
paymentMethod: 'Card' | 'UPI' | 'COD' | '' = '';

constructor() {
  this.store.dispatch(loadAddresses());
}

selectAddress(addr: Address) {
  this.selectedAddressId = addr.id ?? null;
  this.fullName = addr.fullName;
  this.phone = addr.phone ?? '';
  this.address = addr.address;
  this.city = addr.city;
  this.pincode = addr.pincode;
  this.saveThisAddress = false;
}

// Once the person edits a field, the form no longer matches the saved
// address they picked, so un-highlight it.
private clearSelection() {
  this.selectedAddressId = null;
}

// Called from (input) on the Full Name field - strips anything that
// isn't a letter/space as the user types.
onFullNameInput(): void {
  this.fullName = sanitizeNameInput(this.fullName);
  this.clearSelection();
}

// Mobile number: digits only, capped at 10 while typing.
onPhoneInput(): void {
  this.phone = sanitizePhoneInput(this.phone);
  this.clearSelection();
}

// City follows the same letters-only rule as the name field.
onCityInput(): void {
  this.city = sanitizeNameInput(this.city);
  this.clearSelection();
}

// Address allows letters, numbers and normal address punctuation.
onAddressInput(): void {
  this.address = sanitizeAddressInput(this.address);
  this.clearSelection();
}

// PIN code: digits only, capped at 6 while typing.
onPincodeInput(): void {
  this.pincode = sanitizePincodeInput(this.pincode);
  this.clearSelection();
}

isValidFullName(): boolean {
  return isValidName(this.fullName);
}

isValidPhoneNumber(): boolean {
  return isValidPhone(this.phone);
}

isValidCityName(): boolean {
  return isValidCity(this.city);
}

isValidAddressLine(): boolean {
  return isValidAddress(this.address);
}

isValidPin(): boolean {
  return isValidPincode(this.pincode);
}

isPaymentValid(): boolean {
  return this.paymentMethod !== '';
}

// True when the form is completely filled in and is NOT one of the
// addresses the person already saved - that is when we offer to save it.
isNewAddress(): boolean {
  if (
    !this.isValidFullName() ||
    !this.isValidPhoneNumber() ||
    !this.isValidAddressLine() ||
    !this.isValidCityName() ||
    !this.isValidPin()
  ) {
    return false;
  }

  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  return !this.savedAddressList().some(saved =>
    same(saved.fullName, this.fullName) &&
    same(saved.address, this.address) &&
    same(saved.city, this.city) &&
    saved.pincode === this.pincode &&
    (saved.phone ?? '') === this.phone
  );
}

placeOrder() {
  this.submitted = true;

  if (
    !this.isValidFullName() ||
    !this.isValidPhoneNumber() ||
    !this.isValidAddressLine() ||
    !this.isValidCityName() ||
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

    // Don't let someone order more than what's actually left in stock.
    const outOfStockItem = items.find(item => item.quantity > item.product.stock);
    if (outOfStockItem) {
      this.isPlacingOrder = false;
      this.toast.show(
        outOfStockItem.product.stock === 0
          ? `${outOfStockItem.product.name} is now out of stock.`
          : `Only ${outOfStockItem.product.stock} left of ${outOfStockItem.product.name}.`
      );
      return;
    }

    this.cartTotal.pipe(take(1)).subscribe(total => {

      const order = {
        userId: userId,
        fullName: this.fullName,
        phone: this.phone,
        address: this.address,
        city: this.city,
        pincode: this.pincode,
        paymentMethod: this.paymentMethod as 'Card' | 'UPI' | 'COD',
        status: 'Pending' as const,
        createdAt: new Date().toISOString(),
        items: items,
        total: total
      };

      // Decided now, before anything is cleared
      const addressToSave: Address | null =
        this.saveThisAddress && this.isNewAddress()
          ? {
              userId: userId,
              type: this.saveAddressType,
              fullName: this.fullName,
              phone: this.phone,
              address: this.address,
              city: this.city,
              pincode: this.pincode
            }
          : null;

          this.orderService.placeOrder(order).subscribe({
            next: placedOrder => {

        // Reduce stock for each purchased item, now that the order is confirmed.
        items.forEach(item => {
          const remaining = Math.max(0, item.product.stock - item.quantity);
          this.productService.updateProduct(item.product.id, { stock: remaining }).subscribe();
        });

        if (addressToSave) {
          this.store.dispatch(addAddress({ address: addressToSave }));
        }

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