import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Store } from '@ngrx/store';
import { loadCart } from '../../../store/cart/cart.actions';
import { loadwishlist } from '../../../store/wishlist/wishlist.actions';
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
  username = '';
  password = '';
  errorMessage = '';
  login() {
    this.authService.login(this.username, this.password).subscribe(user => {
      if (user) {
        this.errorMessage = '';
        this.store.dispatch(loadCart());
        this.store.dispatch(loadwishlist());
        this.toast.show("Login Successful")
        this.router.navigate(['/']);
      } else {
        this.errorMessage = 'Invalid username or password';
        this.toast.show("Invalid Username Or Password")
      }
    });
  }
}
