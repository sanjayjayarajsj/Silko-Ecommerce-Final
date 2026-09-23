import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router,RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule,RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast=inject(ToastService)
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;

onNameInput(): void {
  this.name = this.name.replace(/[^A-Za-z ]/g, '');
}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get passwordsMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  register() {
    // Check if this email is already registered before creating an account.
    this.authService.checkEmailExists(this.email).subscribe(exists => {
      if (exists) {
        this.toast.show('User already exists with this email');
        return;
      }

      this.authService.register(
        this.name,
        this.email,
        this.password
      ).subscribe(() => {
        this.toast.show('Registration successful!');
        this.router.navigate(['/login']);
      });
    });
  }
}