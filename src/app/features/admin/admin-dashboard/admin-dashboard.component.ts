import { Component, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ProductService } from '../../products/product.service';
import { OrderService } from '../../checkout/order.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [],
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

      this.loading = false;
    });
  }
}