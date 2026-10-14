import { Component,inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { selectCartItems,selectCartTotal } from '../../store/cart/cart.selectors';
import { Router, RouterLink } from '@angular/router';
import { loadCart } from '../../store/cart/cart.actions';
import { FormsModule } from '@angular/forms';
import { OrderService, PlaceOrderRequest } from './order.service';
import { AuthService } from '../../core/services/auth.service';
import { BuyNowService } from './buy-now.service';
import { take, of } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import { selectAddresses } from '../../store/address/address.selectors';
import { loadAddresses, addAddress } from '../../store/address/address.actions';
import { Address } from '../address/address.model';
import { Product } from '../products/product.model';
import { loadProducts } from '../../store/products/products.actions';
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
  this.cartTotal.pipe(take(1)).subscribe(total => {

    // Only WHICH watches, HOW MANY and WHERE. The server decides prices,
    // checks stock, takes it off, and works out the real total.
    const request: PlaceOrderRequest = {
      items: items.map(item => ({ productId: item.product.id, quantity: item.quantity })),
      source: this.isBuyNow ? 'buy-now' : 'cart',
      expectedTotal: total,
      fullName: this.fullName,
      phone: this.phone,
      address: this.address,
      city: this.city,
      pincode: this.pincode,
      paymentMethod: this.paymentMethod as 'Card' | 'UPI' | 'COD'
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

    this.orderService.placeOrder(request).subscribe({
      next: placedOrder => {

        if (addressToSave) {
          this.store.dispatch(addAddress({ address: addressToSave }));
        }

        // The server already emptied the cart lines; reload so the page agrees.
        if (!this.isBuyNow) {
          this.store.dispatch(loadCart());
        }

        // Show what the SERVER recorded (real prices and total)
        this.router.navigate(['/order-success'], {
          state: {
            orderId: placedOrder.id,
            total: placedOrder.total,
            items: placedOrder.items,
            paymentMethod: placedOrder.paymentMethod
          }
        });
      },
      error: (error: HttpErrorResponse) => this.onOrderError(error)
    });
  });
  });
}

// Out of stock, price changed, or a mistake in the details: say so clearly
// and show the person the up-to-date numbers.
private onOrderError(error: HttpErrorResponse) {
  this.isPlacingOrder = false;

  if (error.status === 401) {
    this.router.navigate(['/login']);
    return;
  }

  const message: string | undefined = error.error?.message;
  const code: string | undefined = error.error?.code;
  const products: Product[] = error.error?.products ?? [];

  if (error.status === 409 && (code === 'OUT_OF_STOCK' || code === 'PRICE_CHANGED' || code === 'PRODUCT_GONE')) {
    this.toast.show(message ?? 'Some items changed. Please review your order.');
    this.store.dispatch(loadProducts());

    if (this.isBuyNow) {
      this.refreshBuyNowItem(products);
    } else {
      this.store.dispatch(loadCart()); // the server sends today's prices and stock
    }
    return;
  }

  if (error.status === 400 && message) {
    this.toast.show(message);
    return;
  }

  this.toast.show('Something went wrong placing your order. Please try again.');
}

// "Buy now" keeps its item inside this page, so update it with today's data.
private refreshBuyNowItem(products: Product[]) {
  if (!this.buyNowItem) {
    return;
  }

  const fresh = products.find(product => product.id === this.buyNowItem!.product.id);
  if (!fresh) {
    return;
  }

  const quantity = this.buyNowItem.quantity;
  this.buyNowItem = { product: fresh, quantity };
  this.cartItems = of([{ product: fresh, quantity }]);
  this.cartTotal = of(fresh.price * quantity);
}
}