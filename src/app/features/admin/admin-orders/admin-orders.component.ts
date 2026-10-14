import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  Order,
  OrderStatus,
  ORDER_FLOW,
  isStatusOptionDisabled,
  isStatusLocked,
  canCancelOrder,
  orderReturnSummary
} from '../../checkout/order.model';
import { CancelOrderDialogComponent } from '../cancel-order-dialog/cancel-order-dialog.component';
import { OrderService } from '../../checkout/order.service';
// import { ProductService } from '../../products/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';

const STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe,CancelOrderDialogComponent,ConfirmationDialogComponent],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css'
})
export class AdminOrdersComponent {
  private orderService = inject(OrderService);
  private toast = inject(ToastService);

  loading = true;

  allOrders: Order[] = [];
  filteredOrders: Order[] = [];
  pagedOrders: Order[] = [];

  statuses = STATUSES;

  // row dropdown shows the flow + Cancelled (Cancelled is never selectable)
  rowStatuses: OrderStatus[] = [...ORDER_FLOW, 'Cancelled'];

  // used by the template
  isOptionDisabled = isStatusOptionDisabled;
  isStatusLocked = isStatusLocked;
  canCancelOrder = canCancelOrder;

  // order currently shown in the cancel popup
  cancelTarget: Order | null = null;
  showStatusDialog = false;
statusOrder: Order | null = null;
statusToChange: OrderStatus | null = null;
previousStatus: OrderStatus | null = null;
statusSelect: HTMLSelectElement | null = null;

  searchTerm = '';
  statusFilter: OrderStatus | 'All' = 'All';
  paymentFilter: 'All' | 'Card' | 'UPI' | 'COD' = 'All';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  returnSummary = orderReturnSummary;
  constructor() {
    
    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    this.orderService.getAllOrders().subscribe(orders => {
      // newest first
      this.allOrders = orders.slice().sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      this.applyFilters();
      this.loading = false;
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    let result = this.allOrders;

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(o =>
        o.fullName.toLowerCase().includes(term) ||
        o.id?.toString().includes(term)
      );
    }

    if (this.statusFilter !== 'All') {
      result = result.filter(o => o.status === this.statusFilter);
    }

    if (this.paymentFilter !== 'All') {
      result = result.filter(o => o.paymentMethod === this.paymentFilter);
    }

    this.filteredOrders = result;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    this.updatePagedOrders();
  }

  updatePagedOrders() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedOrders = this.filteredOrders.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.updatePagedOrders();
  }

 changeStatus(order: Order, value: string, select: HTMLSelectElement) {
  const status = value as OrderStatus;
  const previousStatus = order.status;

  if (status === previousStatus) {
    return;
  }

  if (isStatusOptionDisabled(previousStatus, status)) {
    select.value = previousStatus;
    return;
  }

  this.statusOrder = order;
  this.statusToChange = status;
  this.previousStatus = previousStatus;
  this.statusSelect = select;
  this.showStatusDialog = true;
}
closeStatusDialog(): void {
  if (this.previousStatus && this.statusSelect) {
    this.statusSelect.value = this.previousStatus;
  }

  this.showStatusDialog = false;
  this.statusOrder = null;
  this.statusToChange = null;
  this.previousStatus = null;
  this.statusSelect = null;
}

confirmStatusChange(): void {
  const order = this.statusOrder;
  const status = this.statusToChange;
  const previousStatus = this.previousStatus;
  const select = this.statusSelect;

  if (!order || !status || !previousStatus || !select) {
    return;
  }

  order.status = status;
  this.showStatusDialog = false;

  this.orderService.updateOrderStatus(order.id!, status).subscribe({
    next: () => {
      this.toast.show(`Order #${order.id} marked as ${status}`);

      this.statusOrder = null;
      this.statusToChange = null;
      this.previousStatus = null;
      this.statusSelect = null;
    },
    error: () => {
      order.status = previousStatus;
      select.value = previousStatus;

      this.toast.show('Could not update order status');

      this.statusOrder = null;
      this.statusToChange = null;
      this.previousStatus = null;
      this.statusSelect = null;
    }
  });
}

  openCancel(order: Order) {
    this.cancelTarget = order;
  }

  confirmCancel(note: string) {
    const order = this.cancelTarget;
    if (!order) {
      return;
    }

    this.orderService.cancelOrder(order, note).subscribe({
      next: () => {
        order.status = 'Cancelled';
        order.cancelNote = note;
        this.cancelTarget = null;
        this.toast.show(`Order #${order.id} cancelled`);
      },
      error: () => {
        this.toast.show('Could not cancel the order. Please try again.');
      }
    });
  }

}