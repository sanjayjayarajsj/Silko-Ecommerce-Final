import { Component, inject } from '@angular/core';
import { Order } from '../../checkout/order.model';
import { OrderService } from '../../checkout/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProductService } from '../../products/product.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [],
  templateUrl: './my-orders.component.html',
  styleUrl: './my-orders.component.css'
})
export class MyOrdersComponent {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  private toast = inject(ToastService);

  orders: Order[] = [];
  loading = true;

  constructor() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    this.orderService.getOrders(this.authService.getUserId() ?? 0).subscribe(orders => {
      this.orders = orders.slice().sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      this.loading = false;
    });
  }

  canCancel(order: Order): boolean {
    return order.status !== 'Cancelled' && order.status !== 'Delivered';
  }

  cancelOrder(order: Order) {
    const confirmed = window.confirm(`Cancel order #${order.id}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.orderService.updateOrderStatus(order.id!, 'Cancelled').subscribe({
      next: () => {
        order.status = 'Cancelled';

        // Give the stock back, since this order is no longer being fulfilled.
        order.items.forEach(item => {
          const restored = item.product.stock + item.quantity;
          this.productService.updateProduct(item.product.id, { stock: restored }).subscribe();
        });

        this.toast.show('Order cancelled');
      },
      error: () => {
        this.toast.show('Could not cancel this order. Please try again.');
      }
    });
  }
}