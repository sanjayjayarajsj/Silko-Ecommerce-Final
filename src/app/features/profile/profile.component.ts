import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Address } from '../address/address.model';
import { User } from '../auth/user.model';
import { selectAddresses } from '../../store/address/address.selectors';
import { loadAddresses, addAddress, removeAddress, clearAddresses } from '../../store/address/address.actions';
import { clearCart } from '../../store/cart/cart.actions';
import { clearWishlist } from '../../store/wishlist/wishlist.actions';
import { sanitizeNameInput,sanitizeAddressInput,sanitizePincodeInput,isValidName,isValidCity,isValidAddress,isValidPincode } from '../../shared/form-validators';
import { validateImageFile, fileToResizedDataUrl } from '../../shared/image-file';
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
  private router = inject(Router);

  user$ = this.authService.getCurrentUser();
  addresses$ = this.store.select(selectAddresses);

  showAddForm = false;
  addressSubmitted = false;
  addressType: 'Home' | 'Work' = 'Home';
  fullName = '';
  address = '';
  city = '';
  pincode = '';
  uploadingPicture = false;

  // ---------- Edit profile (name only, email cannot be changed) ----------
  editing = false;
  editName = '';
  editSubmitted = false;
  savingName = false;

  constructor() {
    this.store.dispatch(loadAddresses());
  }

  startEdit(user: User): void {
    this.editName = user.name;
    this.editSubmitted = false;
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    this.editSubmitted = false;
  }

  onEditNameInput(): void {
    this.editName = sanitizeNameInput(this.editName);
  }

  isValidEditName(): boolean {
    return isValidName(this.editName.trim());
  }

  saveName(user: User): void {
    this.editSubmitted = true;

    if (!this.isValidEditName()) {
      return;
    }

    const newName = this.editName.trim();

    // Nothing changed - just close the editor.
    if (newName === user.name) {
      this.cancelEdit();
      return;
    }

    if (!user.id || this.savingName) {
      return;
    }

    this.savingName = true;

    this.authService.updateName(user.id, newName).subscribe({
      next: () => {
        this.savingName = false;
        this.editing = false;
        this.editSubmitted = false;
        this.toast.show('Profile updated');
        // Re-fetch so the card shows the saved name (same approach as the picture upload).
        this.user$ = this.authService.getCurrentUser();
      },
      error: () => {
        this.savingName = false;
        this.toast.show('Something went wrong. Please try again.');
      }
    });
  }

  logout(): void {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) {
      return;
    }

    this.authService.logout();
    this.store.dispatch(clearCart());
    this.store.dispatch(clearWishlist());
    this.store.dispatch(clearAddresses());
    this.toast.show('Logged out successfully');
    this.router.navigate(['/home']);
  }

  onProfilePictureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const error = validateImageFile(file);
    if (error) {
      this.toast.show(error.message);
      input.value = '';
      return;
    }
    const userId = this.authService.getUserId();
    if (!userId) {
      input.value = '';
      return;
    }
    this.uploadingPicture = true;

    fileToResizedDataUrl(file, 300)
      .then(dataUrl => this.authService.updateProfilePicture(userId, dataUrl).subscribe({
        next: () => {
          this.uploadingPicture = false;
          this.toast.show('Profile picture updated');
          // Reassign so the async pipe in the template re-fetches the
          // now-updated user record.
          this.user$ = this.authService.getCurrentUser();
        },
        error: () => {
          this.uploadingPicture = false;
          this.toast.show('Something went wrong. Please try again.');
        }
      }))
      .catch(() => {
        this.uploadingPicture = false;
        this.toast.show('Could not process that image. Please try another one.');
      })
      .finally(() => {
        input.value = '';
      });
  }
  onFullNameInput(): void {
    this.fullName = sanitizeNameInput(this.fullName);
  }
  onCityInput(): void {
    this.city = sanitizeNameInput(this.city);
  }
  onAddressInput(): void {
    this.address = sanitizeAddressInput(this.address);
  }
  onPincodeInput(): void {
    this.pincode = sanitizePincodeInput(this.pincode);
  }
  isValidFullName(): boolean {
    return isValidName(this.fullName);
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
  saveAddress() {
    this.addressSubmitted = true;

    if (
      !this.isValidFullName() ||
      !this.isValidAddressLine() ||
      !this.isValidCityName() ||
      !this.isValidPin()
    ) {
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
    this.addressSubmitted = false;
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.addressSubmitted = false;
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