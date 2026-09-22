import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Product } from '../../products/product.model';
import { ProductService } from '../../products/product.service';
import { Order, OrderStatus } from '../../checkout/order.model';
import { OrderService } from '../../checkout/order.service';
import { AuthService } from '../../../core/services/auth.service';

interface DayRevenue {
  label: string;
  key: string;
  amount: number;
}

interface StatusSlice {
  status: OrderStatus;
  count: number;
  color: string;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: '#f5c451',
  Processing: '#4a7fe8',
  Shipped: '#8b5cf6',
  Delivered: '#2e9e52',
  Cancelled: '#e0554f'
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent {
  private productService = inject(ProductService);
  private orderService = inject(OrderService);
  private authService = inject(AuthService);

  loading = true;

  totalProducts = 0;
  lowStockCount = 0;
  totalOrders = 0;
  totalRevenue = 0;
  totalUsers = 0;

  // Revenue overview - last 7 days
  revenueByDay: DayRevenue[] = [];
  maxDailyRevenue = 1;

  // Order status breakdown
  statusBreakdown: StatusSlice[] = [];
  statusGradient = '';

  // Stock alerts
  lowStockProducts: Product[] = [];

  constructor() {
    forkJoin({
      products: this.productService.getProducts(),
      orders: this.orderService.getAllOrders(),
      users: this.authService.getAllUsers()
    }).subscribe(({ products, orders, users }) => {

      this.totalProducts = products.length;
      this.lowStockCount = products.filter(p => p.stock <= 5).length;

      this.totalOrders = orders.length;
      this.totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

      this.totalUsers = users.length;

      this.revenueByDay = this.buildRevenueByDay(orders);
      this.maxDailyRevenue = Math.max(1, ...this.revenueByDay.map(d => d.amount));

      this.buildStatusBreakdown(orders);

      this.lowStockProducts = products
        .filter(p => p.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 8);

      this.loading = false;
    });
  }

  private buildRevenueByDay(orders: Order[]): DayRevenue[] {
    const days: DayRevenue[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        key: d.toISOString().slice(0, 10),
        amount: 0
      });
    }

    for (const order of orders) {
      const key = order.createdAt?.slice(0, 10);
      const day = days.find(d => d.key === key);
      if (day) {
        day.amount += order.total;
      }
    }

    return days;
  }

  private buildStatusBreakdown(orders: Order[]) {
    const counts: Record<OrderStatus, number> = {
      Pending: 0, Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0
    };

    for (const order of orders) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }

    const total = orders.length || 1;
    const breakdown: StatusSlice[] = (Object.keys(counts) as OrderStatus[]).map(status => ({
      status,
      count: counts[status],
      color: STATUS_COLORS[status]
    }));

    let cumulative = 0;
    const stops: string[] = [];

    for (const slice of breakdown) {
      if (slice.count === 0) {
        continue;
      }
      const start = (cumulative / total) * 360;
      cumulative += slice.count;
      const end = (cumulative / total) * 360;
      stops.push(`${slice.color} ${start}deg ${end}deg`);
    }

    this.statusBreakdown = breakdown;
    this.statusGradient = stops.length > 0
      ? `conic-gradient(${stops.join(', ')})`
      : `conic-gradient(var(--color-border) 0deg 360deg)`;
  }
}