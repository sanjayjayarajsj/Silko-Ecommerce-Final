import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { User } from '../../auth/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { Order } from '../../checkout/order.model';
import { OrderService } from '../../checkout/order.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-user-details',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-user-details.component.html',
  styleUrl: './admin-user-details.component.css'
})
export class AdminUserDetailsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private orderService = inject(OrderService);
  private toast = inject(ToastService);

  loading = true;
  user: User | null = null;
  orders: Order[] = [];

  currentUserId = this.authService.getUserId();

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.authService.getUser(id).subscribe(user => {
      this.user = user;
      this.loading = false;
    });

    this.orderService.getOrders(id).subscribe(orders => {
      this.orders = orders.slice().sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }

  isActive(): boolean {
    return this.user?.active !== false;
  }

  totalSpent(): number {
    return this.orders.reduce((sum, order) => sum + order.total, 0);
  }

  toggleActive() {
    if (!this.user) {
      return;
    }

    const nextActive = !this.isActive();
    const action = nextActive ? 'activate' : 'deactivate';

    const confirmed = window.confirm(`Are you sure you want to ${action} ${this.user.name}'s account?`);
    if (!confirmed) {
      return;
    }

    this.authService.setUserActive(this.user.id!, nextActive).subscribe({
      next: () => {
        this.user!.active = nextActive;
        this.toast.show(`Account is now ${nextActive ? 'active' : 'deactivated'}`);
      },
      error: () => {
        this.toast.show('Could not update this account. Please try again.');
      }
    });
  }

  back() {
    this.router.navigate(['/admin/users']);
  }
}