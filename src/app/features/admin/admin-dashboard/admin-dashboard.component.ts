import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Product } from '../../products/product.model';
import { ProductService } from '../../products/product.service';
import { Order, OrderStatus } from '../../checkout/order.model';
import { OrderService } from '../../checkout/order.service';
import { AuthService } from '../../../core/services/auth.service';

type RevenuePeriod = 'day' | 'month' | 'year';

interface RevenuePoint {
  key: string;        // used to match orders to this bar
  label: string;      // shown under the bar
  fullLabel: string;  // shown in the tooltip
  date: Date;
  amount: number;
  orders: number;
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
  imports: [RouterLink, CurrencyPipe],
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

  // Revenue overview (Daily / Monthly / Yearly)
  period: RevenuePeriod = 'day';
  readonly periodTabs: { value: RevenuePeriod; label: string }[] = [
    { value: 'day', label: 'Daily' },
    { value: 'month', label: 'Monthly' },
    { value: 'year', label: 'Yearly' }
  ];

  // How much history each view shows - change these numbers if you want more/less
  private readonly dayCount = 7;
  private readonly monthCount = 12;
  private readonly yearCount = 5;

  revenueData: RevenuePoint[] = [];
  maxRevenue = 1;
  periodLabel = '';
  periodTotal = 0;
  periodOrders = 0;
  periodAverage = 0;

  private allOrders: Order[] = [];

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
      // Cancelled orders are not counted as revenue
      this.totalRevenue = orders
        .filter(order => order.status !== 'Cancelled')
        .reduce((sum, order) => sum + order.total, 0);

      this.totalUsers = users.length;

      this.allOrders = orders;
      this.buildRevenue();

      this.buildStatusBreakdown(orders);

      this.lowStockProducts = products
        .filter(p => p.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 8);

      this.loading = false;
    });
  }

  setPeriod(period: RevenuePeriod) {
    this.period = period;
    this.buildRevenue();
  }

  // Builds the bars for the selected period and adds each order to its bar.
  private buildRevenue() {
    const points = this.createPoints(this.period);
    const lookup = new Map(points.map(point => [point.key, point]));

    for (const order of this.allOrders) {
      // Cancelled orders are not revenue
      if (order.status === 'Cancelled' || !order.createdAt) {
        continue;
      }

      const point = lookup.get(this.keyOf(new Date(order.createdAt), this.period));
      if (point) {
        point.amount += order.total;
        point.orders++;
      }
    }

    this.revenueData = points;
    this.maxRevenue = Math.max(1, ...points.map(point => point.amount));
    this.periodTotal = points.reduce((sum, point) => sum + point.amount, 0);
    this.periodOrders = points.reduce((sum, point) => sum + point.orders, 0);
    this.periodAverage = this.periodOrders > 0
      ? Math.round(this.periodTotal / this.periodOrders)
      : 0;
    this.periodLabel = this.rangeLabel(points);
  }

  // Creates the empty bars (oldest first, ending with today / this month / this year).
  private createPoints(period: RevenuePeriod): RevenuePoint[] {
    const now = new Date();
    const points: RevenuePoint[] = [];

    if (period === 'day') {
      for (let i = this.dayCount - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        points.push({
          key: this.keyOf(date, 'day'),
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          fullLabel: date.toLocaleDateString('en-US', {
            weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
          }),
          date,
          amount: 0,
          orders: 0
        });
      }
    } else if (period === 'month') {
      for (let i = this.monthCount - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        points.push({
          key: this.keyOf(date, 'month'),
          label: date.toLocaleDateString('en-US', { month: 'short' }),
          fullLabel: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          date,
          amount: 0,
          orders: 0
        });
      }
    } else {
      for (let i = this.yearCount - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear() - i, 0, 1);
        points.push({
          key: this.keyOf(date, 'year'),
          label: String(date.getFullYear()),
          fullLabel: String(date.getFullYear()),
          date,
          amount: 0,
          orders: 0
        });
      }
    }

    return points;
  }

  // Uses the LOCAL date, so an order placed at 1 AM lands on the correct day.
  private keyOf(date: Date, period: RevenuePeriod): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (period === 'year') {
      return `${year}`;
    }
    if (period === 'month') {
      return `${year}-${month}`;
    }
    return `${year}-${month}-${day}`;
  }

  private rangeLabel(points: RevenuePoint[]): string {
    if (this.period === 'day') {
      return `Last ${this.dayCount} days`;
    }

    const first = points[0].date;
    const last = points[points.length - 1].date;

    if (this.period === 'year') {
      return `${first.getFullYear()} – ${last.getFullYear()}`;
    }

    const format = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${format(first)} – ${format(last)}`;
  }

  // Short amount shown above each bar: 850 / ₹4.5k / ₹1.2L
  compact(amount: number): string {
    if (amount <= 0) {
      return '';
    }
    if (amount >= 100000) {
      return '₹' + (amount / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    }
    if (amount >= 1000) {
      return '₹' + (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return '₹' + amount;
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