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
  username = '';
  password = '';
  register() {
   this.authService.register(
  this.username,
  this.password
).subscribe(() => {
  this.toast.show('Registration successful!');
  this.router.navigate(['/login']);
});
}
}
