import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  Order,
  ORDER_FLOW,
  RETURN_FLOW,
  canRequestReturn,
  returnDeadline
} from '../../checkout/order.model';
import { OrderService } from '../../checkout/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ReturnRequestDialogComponent, ReturnFormData } from './return-request-dialog/return-request-dialog.component';
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [RouterLink, DatePipe, ReturnRequestDialogComponent, ConfirmationDialogComponent],
  templateUrl: './my-orders.component.html',
  styleUrl: './my-orders.component.css'
})
export class MyOrdersComponent {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
showCancelDialog = false;
orderToCancel: Order | null = null; 
  orders: Order[] = [];
  loading = true;

  // Pending -> Processing -> Shipped -> Delivered (used by the progress bar)
  flow = ORDER_FLOW;

  // returns
  returnFlow = RETURN_FLOW;
  canRequestReturn = canRequestReturn;
  returnDeadline = returnDeadline;
  returnOrder: Order | null = null;   // order shown in the return popup

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

  // position of the order's status in the progress bar
  stepIndex(order: Order): number {
    return this.flow.indexOf(order.status);
  }

  // Customers can cancel only until the order is shipped
  canCancel(order: Order): boolean {
    return order.status === 'Pending' || order.status === 'Processing';
  }

openCancelDialog(order: Order): void {
  this.orderToCancel = order;
  this.showCancelDialog = true;
}

closeCancelDialog(): void {
  this.showCancelDialog = false;
  this.orderToCancel = null;
}

cancelOrder(): void {
  const order = this.orderToCancel;

  if (!order) {
    return;
  }

  this.orderService.cancelOrder(order, 'Cancelled by you', 'user').subscribe({
    next: () => {
      order.status = 'Cancelled';
      order.cancelNote = 'Cancelled by you';
      order.cancelledBy = 'user';
      order.cancelledAt = new Date().toISOString();

      this.toast.show('Order cancelled');
      this.closeCancelDialog();
    },
    error: () => {
      this.toast.show('Could not cancel this order. Please try again.');
      this.closeCancelDialog();
    }
  });
}

  // ---------- returns ----------

  returnStepIndex(order: Order): number {
    return this.returnFlow.indexOf(order.returnRequest!.status);
  }

  openReturn(order: Order) {
    this.returnOrder = order;
  }

  submitReturn(data: ReturnFormData) {
    const order = this.returnOrder;
    if (!order) {
      return;
    }

    this.orderService.requestReturn(order, data.reason, data.comment).subscribe({
      next: updated => {
        order.returnRequest = updated.returnRequest;
        this.returnOrder = null;
        this.toast.show('Return requested');
      },
      error: () => {
        this.toast.show('Could not request the return. Please try again.');
      }
    });
  }
}