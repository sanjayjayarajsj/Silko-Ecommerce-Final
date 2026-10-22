import { Component, PLATFORM_ID, inject } from '@angular/core';
import { Router,RouterLink } from '@angular/router';
import { CurrencyPipe, isPlatformBrowser } from '@angular/common';

interface OrderSuccessProduct {
  id: number;
  name: string;
  brand: string;
  price: number;
  image: string;
}

interface OrderSuccessItem {
  product: OrderSuccessProduct;
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
  imports: [CurrencyPipe,RouterLink],
  templateUrl: './order-success.component.html',
  styleUrl: './order-success.component.css'
})
export class OrderSuccessComponent {

  private router = inject(Router);

  // History state only exists in the browser.
  // The server has no navigation history state.
  private state = (
    isPlatformBrowser(inject(PLATFORM_ID))
      ? history.state
      : null
  ) as OrderSuccessState | null;

  orderId = this.state?.orderId;
  total = this.state?.total;
  items = this.state?.items ?? [];
  paymentMethod = this.state?.paymentMethod;

  goHome() {
    this.router.navigate(['/home']);
  }
}

