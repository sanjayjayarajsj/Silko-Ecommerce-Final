import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Address } from '../address/address.model';
import { selectAddresses } from '../../store/address/address.selectors';
import { loadAddresses, addAddress, removeAddress } from '../../store/address/address.actions';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [AsyncPipe, RouterLink, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  private store = inject(Store);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  user$ = this.authService.getCurrentUser();
  addresses$ = this.store.select(selectAddresses);

  showAddForm = false;
  addressType: 'Home' | 'Work' = 'Home';
  fullName = '';
  address = '';
  city = '';
  pincode = '';

  constructor() {
    this.store.dispatch(loadAddresses());
  }

  isValidPin(): boolean {
    return /^\d{6}$/.test(this.pincode);
  }

  saveAddress() {
    if (!this.fullName || !this.address || !this.city || !this.isValidPin()) {
      this.toast.show('Please fill all address fields correctly');
      return;
    }

    const userId = this.authService.getUserId();
    if (!userId) {
      return;
    }

    const newAddress: Address = {
      userId: userId,
      type: this.addressType,
      fullName: this.fullName,
      address: this.address,
      city: this.city,
      pincode: this.pincode
    };

    this.store.dispatch(addAddress({ address: newAddress }));
    this.toast.show('Address saved');

    this.fullName = '';
    this.address = '';
    this.city = '';
    this.pincode = '';
    this.addressType = 'Home';
    this.showAddForm = false;
  }

  deleteAddress(id: string | number | undefined) {
    if (id === undefined) {
      return;
    }

    const confirmed = window.confirm('Remove this address?');
    if (!confirmed) {
      return;
    }

    this.store.dispatch(removeAddress({ id }));
    this.toast.show('Address removed');
  }
}