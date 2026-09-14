import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';

interface OrderSuccessState {
  orderId?: number;
  total?: number;
}

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './order-success.component.html',
  styleUrl: './order-success.component.css'
})
export class OrderSuccessComponent {
  private router = inject(Router);

  private state = history.state as OrderSuccessState;

  orderId = this.state?.orderId;
  total = this.state?.total;

  goHome() {
    this.router.navigate(['/home']);
  }
}