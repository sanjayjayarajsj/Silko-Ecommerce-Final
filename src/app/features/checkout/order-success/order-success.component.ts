import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Product } from '../../products/product.model';

interface OrderSuccessItem {
  product: Product;
  quantity: number;
}

interface OrderSuccessState {
  orderId?: number;
  total?: number;
  items?: OrderSuccessItem[];
  paymentMethod?: string;
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
  items = this.state?.items ?? [];
  paymentMethod = this.state?.paymentMethod;

  goHome() {
    this.router.navigate(['/home']);
  }
}