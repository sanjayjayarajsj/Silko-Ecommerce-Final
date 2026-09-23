import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Order, OrderStatus } from '../../checkout/order.model';
import { OrderService } from '../../checkout/order.service';
import { ProductService } from '../../products/product.service';
import { ToastService } from '../../../core/services/toast.service';

const STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css'
})
export class AdminOrdersComponent {
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private toast = inject(ToastService);

  loading = true;

  allOrders: Order[] = [];
  filteredOrders: Order[] = [];
  pagedOrders: Order[] = [];

  statuses = STATUSES;

  searchTerm = '';
  statusFilter: OrderStatus | 'All' = 'All';
  paymentFilter: 'All' | 'Card' | 'UPI' | 'COD' = 'All';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

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

  changeStatus(order: Order, status: OrderStatus) {
    const previousStatus = order.status;
    order.status = status;

    this.orderService.updateOrderStatus(order.id!, status).subscribe({
      next: () => {
        this.toast.show(`Order #${order.id} marked as ${status}`);

        // Give the stock back, since this order is no longer being fulfilled.
        if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
          order.items.forEach(item => {
            const restored = item.product.stock + item.quantity;
            this.productService.updateProduct(item.product.id, { stock: restored }).subscribe();
          });
        }
      },
      error: () => {
        order.status = previousStatus;
        this.toast.show('Could not update order status');
      }
    });
  }

  cancelOrder(order: Order) {
    const confirmed = window.confirm(`Cancel order #${order.id}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }
    this.changeStatus(order, 'Cancelled');
  }
}