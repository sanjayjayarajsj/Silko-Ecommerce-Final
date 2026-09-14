import { Component,inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { Store } from '@ngrx/store';
import { loadCart } from './store/cart/cart.actions';
import { loadwishlist } from './store/wishlist/wishlist.actions';
import { AuthService } from './core/services/auth.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,NavbarComponent,FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'seiko';
  private store=inject(Store);
  private authService=inject(AuthService)
constructor() {
  const userId = this.authService.getUserId();
  if (userId) {
    this.store.dispatch(loadCart());
    this.store.dispatch(loadwishlist());
  }
}
}
