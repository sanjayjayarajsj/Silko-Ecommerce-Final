import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Store } from '@ngrx/store';
import { loadCart } from '../../../store/cart/cart.actions';
import { loadwishlist } from '../../../store/wishlist/wishlist.actions';
import { loadAddresses } from '../../../store/address/address.actions';
import { ToastService } from '../../../core/services/toast.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private store=inject(Store)
  private toast =inject(ToastService)
  email = '';
  password = '';
  errorMessage = '';
  showPassword = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  login() {
    this.authService.login(this.email, this.password).subscribe(user => {
      if (user) {
        this.errorMessage = '';
        this.toast.show("Login Successful")

        if (user.role === 'admin') {
          this.router.navigate(['/admin'], { replaceUrl: true });
          return;
        }

        this.store.dispatch(loadCart());
        this.store.dispatch(loadwishlist());
        this.store.dispatch(loadAddresses());
        this.router.navigate(['/home'], { replaceUrl: true });
      } else {
        this.errorMessage = 'Invalid email or password';
        this.toast.show("Invalid Email Or Password")
      }
    });
  }
}