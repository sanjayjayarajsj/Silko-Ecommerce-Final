import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Order, OrderStatus } from '../../checkout/order.model';
import { OrderService } from '../../checkout/order.service';
import { ToastService } from '../../../core/services/toast.service';

const STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

@Component({
  selector: 'app-admin-order-details',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './admin-order-details.component.html',
  styleUrl: './admin-order-details.component.css'
})
export class AdminOrderDetailsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private toast = inject(ToastService);

  statuses = STATUSES;
  order: Order | null = null;
  loading = true;

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.orderService.getOrder(id).subscribe(order => {
      this.order = order;
      this.loading = false;
    });
  }

  changeStatus(status: OrderStatus) {
    if (!this.order) {
      return;
    }

    const previousStatus = this.order.status;
    this.order.status = status;

    this.orderService.updateOrderStatus(this.order.id!, status).subscribe({
      next: () => {
        this.toast.show(`Order marked as ${status}`);
      },
      error: () => {
        this.order!.status = previousStatus;
        this.toast.show('Could not update order status');
      }
    });
  }

  cancelOrder() {
    if (!this.order) {
      return;
    }
    const confirmed = window.confirm(`Cancel order #${this.order.id}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }
    this.changeStatus('Cancelled');
  }

  back() {
    this.router.navigate(['/admin/orders']);
  }
}