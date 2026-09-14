import { Component,inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { OrderService } from '../../checkout/order.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './my-orders.component.html',
  styleUrl: './my-orders.component.css'
})
export class MyOrdersComponent {
private orderService=inject(OrderService);
private authService=inject(AuthService);
orders=this.orderService.getOrders(this.authService.getUserId() ?? 0);
}
