import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Order,
  OrderItem,
  ORDER_FLOW,
  RETURN_FLOW,
  activeItems,
  orderNetTotal,
  canCustomerCancel,
  canCancelItem,
  canReturnItem,
  itemState,
  returnDeadline,
  returnStatusClass
} from '../../checkout/order.model';
import { OrderService } from '../../checkout/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ReturnRequestDialogComponent, ReturnFormData } from './return-request-dialog/return-request-dialog.component';
import { CancelItemDialogComponent, CancelFormData } from './cancel-item-dialog/cancel-item-dialog.component';

type OrderTab = 'all' | 'active' | 'delivered' | 'cancelled' | 'returns';

const PAGE_SIZE = 5;

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe, ReturnRequestDialogComponent, CancelItemDialogComponent],
  templateUrl: './my-orders.component.html',
  styleUrl: './my-orders.component.css'
})
export class MyOrdersComponent {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);

  // ---------- finding orders ----------
  readonly tab = signal<OrderTab>('all');
  readonly search = signal('');
  readonly visibleCount = signal(PAGE_SIZE);

  private matches(order: Order, tab: OrderTab): boolean {
    switch (tab) {
      case 'active':
        return order.status === 'Pending' || order.status === 'Processing' || order.status === 'Shipped';
      case 'delivered':
        return order.status === 'Delivered';
      case 'cancelled':
        return order.status === 'Cancelled' || order.items.some(item => !!item.cancelled);
      case 'returns':
        return !!order.returnRequest || order.items.some(item => !!item.returnRequest);
      default:
        return true;
    }
  }

  readonly tabs = computed(() => {
    const all = this.orders();
    const list: { key: OrderTab; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'active', label: 'In progress' },
      { key: 'delivered', label: 'Delivered' },
      { key: 'cancelled', label: 'Cancelled' },
      { key: 'returns', label: 'Returns' }
    ];
    return list.map(entry => ({ ...entry, count: all.filter(order => this.matches(order, entry.key)).length }));
  });

  readonly filtered = computed(() => {
    const words = this.search().toLowerCase().split(/\s+/).filter(Boolean);
    return this.orders().filter(order => {
      if (!this.matches(order, this.tab())) {
        return false;
      }
      if (words.length === 0) {
        return true;
      }
      const text = [
        String(order.id),
        ...order.items.map(item => `${item.product.name} ${item.product.brand}`)
      ].join(' ').toLowerCase();
      return words.every(word => text.includes(word.replace('#', '')));
    });
  });

  readonly visible = computed(() => this.filtered().slice(0, this.visibleCount()));

  // ---------- what the template needs ----------
  flow = ORDER_FLOW;
  returnFlow = RETURN_FLOW;
  activeItems = activeItems;
  orderNetTotal = orderNetTotal;
  canCancelItem = canCancelItem;
  canReturnItem = canReturnItem;
  itemState = itemState;
  returnDeadline = returnDeadline;
  returnStatusClass = returnStatusClass;

  // orders whose "details" panel is open
  readonly expanded = signal<ReadonlySet<number>>(new Set());

  // popups
  readonly cancelTarget = signal<{ order: Order; item: OrderItem | null } | null>(null);
  readonly returnTarget = signal<{ order: Order; item: OrderItem } | null>(null);
  readonly busy = signal(false);

  constructor() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.failed.set(false);

    this.orderService.getOrders(this.authService.getUserId() ?? 0).subscribe({
      next: orders => {
        this.orders.set(
          orders.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      }
    });
  }

  // ---------- tabs, search, paging ----------
  setTab(tab: OrderTab) {
    this.tab.set(tab);
    this.visibleCount.set(PAGE_SIZE);
  }

  onSearch(value: string) {
    this.search.set(value);
    this.visibleCount.set(PAGE_SIZE);
  }

  clearFilters() {
    this.tab.set('all');
    this.search.set('');
    this.visibleCount.set(PAGE_SIZE);
  }

  showMore() {
    this.visibleCount.update(count => count + PAGE_SIZE);
  }

  toggleDetails(order: Order) {
    this.expanded.update(open => {
      const next = new Set(open);
      next.has(order.id!) ? next.delete(order.id!) : next.add(order.id!);
      return next;
    });
  }

  isExpanded(order: Order): boolean {
    return this.expanded().has(order.id!);
  }

  // ---------- reading an order ----------
  stepIndex(order: Order): number {
    return this.flow.indexOf(order.status);
  }

  returnStepIndex(status: string): number {
    return this.returnFlow.indexOf(status as never);
  }

  // The whole-order cancel button is only offered when there are 2+ items left;
  // with one item left, that item's own button already cancels the order.
  canCancelAll(order: Order): boolean {
    return canCustomerCancel(order) && activeItems(order).length > 1;
  }

  cancelLabel(order: Order): string {
    return activeItems(order).length === 1 ? 'Cancel order' : 'Cancel item';
  }

  hasRefund(order: Order): boolean {
    return (order.refundedTotal ?? 0) > 0;
  }

  // ---------- cancelling ----------
  askCancel(order: Order, item: OrderItem | null) {
    this.cancelTarget.set({ order, item });
  }

  confirmCancel(data: CancelFormData) {
    const target = this.cancelTarget();
    if (!target || this.busy()) {
      return;
    }

    const note = (data.comment ? `${data.reason} - ${data.comment}` : data.reason).slice(0, 300);
    const request = target.item
      ? this.orderService.cancelItem(target.order, target.item.product.id, note)
      : this.orderService.cancelOrder(target.order, note);

    this.busy.set(true);
    request.subscribe({
      next: updated => {
        this.replaceOrder(updated);
        this.busy.set(false);
        this.cancelTarget.set(null);
        this.toast.show(updated.status === 'Cancelled' ? 'Order cancelled' : 'Item cancelled');
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(false);
        this.cancelTarget.set(null);
        this.toast.show(error.error?.message ?? 'Could not cancel. Please try again.');
        this.loadOrders(); // the order may have moved on (for example, it just shipped)
      }
    });
  }

  // ---------- returning ----------
  askReturn(order: Order, item: OrderItem) {
    this.returnTarget.set({ order, item });
  }

  submitReturn(data: ReturnFormData) {
    const target = this.returnTarget();
    if (!target) {
      return;
    }

    this.orderService.returnItem(target.order, target.item.product.id, data.reason, data.comment).subscribe({
      next: updated => {
        this.replaceOrder(updated);
        this.returnTarget.set(null);
        this.toast.show('Return requested');
      },
      error: (error: HttpErrorResponse) => {
        this.returnTarget.set(null);
        this.toast.show(error.error?.message ?? 'Could not request the return. Please try again.');
        this.loadOrders();
      }
    });
  }

  // Swap in the order the server sent back
  private replaceOrder(updated: Order) {
    this.orders.update(list => list.map(order => (order.id === updated.id ? updated : order)));
  }
}