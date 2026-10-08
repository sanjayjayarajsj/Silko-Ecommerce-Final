import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Order,
  OrderStatus,
  ORDER_FLOW,
  isStatusOptionDisabled,
  isStatusLocked,
  canCancelOrder,
  ReturnStatus,
  RETURN_FLOW,
  isReturnOptionDisabled,
  isReturnLocked,
  canRejectReturn,
  returnStatusClass
} from '../../checkout/order.model';
import { OrderService } from '../../checkout/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { CancelOrderDialogComponent } from '../cancel-order-dialog/cancel-order-dialog.component';

@Component({
  selector: 'app-admin-order-details',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, CancelOrderDialogComponent],
  templateUrl: './admin-order-details.component.html',
  styleUrl: './admin-order-details.component.css'
})
export class AdminOrderDetailsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private toast = inject(ToastService);

  // Dropdown shows the normal flow, plus "Cancelled" only when the order
  // actually is cancelled (so the dropdown can display it).
  statuses: OrderStatus[] = [...ORDER_FLOW];

  // used by the template
  isOptionDisabled = isStatusOptionDisabled;
  isStatusLocked = isStatusLocked;
  canCancelOrder = canCancelOrder;

  // return handling
  isReturnOptionDisabled = isReturnOptionDisabled;
  isReturnLocked = isReturnLocked;
  canRejectReturn = canRejectReturn;
  returnStatusClass = returnStatusClass;

  showRejectBox = false;
  rejectNote = '';
  rejectSubmitted = false;

  order: Order | null = null;
  loading = true;
  showCancelDialog = false;

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.orderService.getOrder(id).subscribe(order => {
      this.order = order;
      if (order.status === 'Cancelled') {
        this.statuses = [...ORDER_FLOW, 'Cancelled'];
      }
      this.loading = false;
    });
  }

  changeStatus(value: string, select: HTMLSelectElement) {
    if (!this.order) {
      return;
    }

    const order = this.order;
    const status = value as OrderStatus;
    const previousStatus = order.status;

    if (status === previousStatus) {
      return;
    }

    // Safety net: only the next step is allowed
    if (isStatusOptionDisabled(previousStatus, status)) {
      select.value = previousStatus;
      return;
    }

    const confirmed = window.confirm(
      `Mark order #${order.id} as ${status}? You cannot go back to an earlier status.`
    );
    if (!confirmed) {
      select.value = previousStatus;
      return;
    }

    order.status = status;

    this.orderService.updateOrderStatus(order.id!, status).subscribe({
      next: () => {
        this.toast.show(`Order marked as ${status}`);
      },
      error: () => {
        order.status = previousStatus;
        select.value = previousStatus;
        this.toast.show('Could not update order status');
      }
    });
  }

  openCancel() {
    this.showCancelDialog = true;
  }

  confirmCancel(note: string) {
    if (!this.order) {
      return;
    }

    const order = this.order;

    this.orderService.cancelOrder(order, note).subscribe({
      next: () => {
        order.status = 'Cancelled';
        order.cancelNote = note;
        this.statuses = [...ORDER_FLOW, 'Cancelled'];
        this.showCancelDialog = false;
        this.toast.show(`Order #${order.id} cancelled`);
      },
      error: () => {
        this.toast.show('Could not cancel the order. Please try again.');
      }
    });
  }

  // ---------- returns ----------

  // dropdown shows the flow, plus "Rejected" only if it was rejected
  returnOptions(status: ReturnStatus): ReturnStatus[] {
    return status === 'Rejected' ? [...RETURN_FLOW, 'Rejected'] : RETURN_FLOW;
  }

  changeReturnStatus(value: string, select: HTMLSelectElement) {
    const order = this.order;
    const request = order?.returnRequest;
    if (!order || !request) {
      return;
    }

    const status = value as ReturnStatus;
    const previousStatus = request.status;

    if (status === previousStatus) {
      return;
    }

    // Safety net: only the next step is allowed
    if (isReturnOptionDisabled(previousStatus, status)) {
      select.value = previousStatus;
      return;
    }

    const confirmed = window.confirm(
      `Move this return to "${status}"? You cannot go back to an earlier step.`
    );
    if (!confirmed) {
      select.value = previousStatus;
      return;
    }

    this.orderService.updateReturn(order, { status }).subscribe({
      next: updated => {
        order.returnRequest = updated.returnRequest;
        this.toast.show(`Return marked as ${status}`);
      },
      error: () => {
        select.value = previousStatus;
        this.toast.show('Could not update the return');
      }
    });
  }

  openReject() {
    this.rejectNote = '';
    this.rejectSubmitted = false;
    this.showRejectBox = true;
  }

  confirmReject() {
    const order = this.order;
    if (!order || !order.returnRequest) {
      return;
    }

    this.rejectSubmitted = true;
    const note = this.rejectNote.trim();
    if (note.length < 5) {
      return;
    }

    this.orderService.updateReturn(order, { status: 'Rejected', adminNote: note }).subscribe({
      next: updated => {
        order.returnRequest = updated.returnRequest;
        this.showRejectBox = false;
        this.toast.show('Return rejected');
      },
      error: () => {
        this.toast.show('Could not reject the return. Please try again.');
      }
    });
  }

  back() {
    this.router.navigate(['/admin/orders']);
  }
}