import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { loadCart } from '../../../store/cart/cart.actions';
import { loadwishlist } from '../../../store/wishlist/wishlist.actions';
import { loadAddresses } from '../../../store/address/address.actions';
import { EmailService } from '../../../core/services/email.service.ts.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private emailService = inject(EmailService);
  private route = inject(ActivatedRoute);
  private store = inject(Store);

  // Set in app.routes.ts:  data: { mode: 'login' }  or  data: { mode: 'register' }
  readonly mode: 'login' | 'register' =
    this.route.snapshot.data['mode'] === 'register' ? 'register' : 'login';

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = ''; // login error

  // ---------- OTP (dummy) ----------
  // 'form' = registration form, 'otp' = OTP verification screen.
  step: 'form' | 'otp' = 'form';

  // false = OTP is sent by email using EmailJS (normal use).
  // true  = no email is sent; the OTP is shown on screen (handy for testing offline
  //         or if the EmailJS monthly limit is used up).
  readonly demoMode = false;

  private readonly otpValiditySeconds = 60; // OTP valid for 1 minute
  private readonly maxAttempts = 3;

  otpInput = '';
  otpError = '';
  demoOtp = '';
  secondsLeft = 0; // live countdown shown on screen
  submitting = false;
  sending = false; // true while the OTP email is being sent

  private generatedOtp = '';
  private attempts = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;

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

  // ---------- LOGIN ----------
  login() {
    this.authService.login(this.email, this.password).subscribe(user => {
      if (user) {
        this.errorMessage = '';
        this.toast.show('Login Successful');

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
        this.toast.show('Invalid Email Or Password');
      }
    });
  }

  // ---------- REGISTER ----------
  // Step 1: check the email, then send the OTP. The account is NOT created yet.
  register() {
    if (this.sending) {
      return;
    }

    this.authService.checkEmailExists(this.email).subscribe(async exists => {
      if (exists) {
        this.toast.show('User already exists with this email');
        return;
      }

      const sent = await this.sendOtp();
      if (sent) {
        this.step = 'otp';
      }
    });
  }

  // Generates a 6-digit OTP and emails it with EmailJS.
  // Returns true if it was sent (the 1-minute timer starts only after that).
  private async sendOtp(): Promise<boolean> {
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    this.sending = true;

    try {
      if (this.demoMode) {
        this.demoOtp = otp;
      } else {
        await this.emailService.sendOtp({
          toEmail: this.email,
          toName: this.name,
          otp: otp,
          validMinutes: Math.ceil(this.otpValiditySeconds / 60)
        });
      }
    } catch (error) {
      console.error('EmailJS error:', error);
      this.toast.show('Could not send OTP email. Please try again.');
      return false;
    } finally {
      this.sending = false;
    }

    this.generatedOtp = otp;
    this.attempts = 0;
    this.otpInput = '';
    this.otpError = '';
    this.startTimer();

    return true;
  }

  // Shown as mm:ss, e.g. 0:45
  get timerText(): string {
    const m = Math.floor(this.secondsLeft / 60);
    const sec = this.secondsLeft % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  private startTimer() {
    this.clearTimer();
    this.secondsLeft = this.otpValiditySeconds;

    this.timerId = setInterval(() => {
      this.secondsLeft--;
      if (this.secondsLeft <= 0) {
        this.secondsLeft = 0;
        this.clearTimer();
      }
    }, 1000);
  }

  private clearTimer() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  onOtpInput() {
    // digits only, max 6
    this.otpInput = this.otpInput.replace(/\D/g, '').slice(0, 6);
    this.otpError = '';
  }

  async resendOtp() {
    if (this.secondsLeft > 0 || this.sending) {
      return;
    }

    const sent = await this.sendOtp();
    if (sent) {
      this.toast.show('A new OTP has been sent to your email');
    }
  }

  // Step 2: verify the OTP, then create the account.
  verifyOtp() {
    if (this.submitting) {
      return;
    }

    if (this.otpInput.length !== 6) {
      this.otpError = 'Enter the 6-digit OTP';
      return;
    }

    if (this.secondsLeft <= 0) {
      this.otpError = 'OTP has expired. Please request a new one.';
      return;
    }

    if (this.otpInput !== this.generatedOtp) {
      this.attempts++;

      if (this.attempts >= this.maxAttempts) {
        // Too many wrong tries - invalidate this OTP, user must request a new one.
        this.generatedOtp = '';
        this.demoOtp = '';
        this.otpError = 'Too many wrong attempts. Please request a new OTP.';
      } else {
        this.otpError = `Incorrect OTP. ${this.maxAttempts - this.attempts} attempt(s) left.`;
      }
      return;
    }

    this.submitting = true;

    this.authService.register(this.name, this.email, this.password).subscribe({
      next: () => {
        this.clearTimer();
        this.toast.show('Email verified. Registration successful!');
      this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: () => {
        this.submitting = false;
        this.toast.show('Something went wrong. Please try again.');
      }
    });
  }

  // Go back to the form to correct name / email / password.
  backToForm() {
    this.clearTimer();
    this.generatedOtp = '';
    this.demoOtp = '';
    this.otpInput = '';
    this.otpError = '';
    this.secondsLeft = 0;
    this.step = 'form';
  }

  ngOnDestroy() {
    this.clearTimer();
  }
}