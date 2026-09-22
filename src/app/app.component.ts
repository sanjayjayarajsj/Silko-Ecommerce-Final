import { Component,inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { Store } from '@ngrx/store';
import { loadCart } from './store/cart/cart.actions';
import { loadwishlist } from './store/wishlist/wishlist.actions';
import { loadAddresses } from './store/address/address.actions';
import { AuthService } from './core/services/auth.service';
import { filter, map, startWith } from 'rxjs';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,NavbarComponent,FooterComponent,AsyncPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'seiko';
  private store=inject(Store);
  private authService=inject(AuthService)
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  // True on routes (like /login, /register) that opt out of the navbar/footer
  // via `data: { hideChrome: true }` in app.routes.ts.
  hideChrome$ = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => {
      let route = this.activatedRoute;
      while (route.firstChild) {
        route = route.firstChild;
      }
      return route.snapshot.data['hideChrome'] === true;
    })
  );

constructor() {
  const userId = this.authService.getUserId();
  if (userId) {
    this.store.dispatch(loadCart());
    this.store.dispatch(loadwishlist());
    this.store.dispatch(loadAddresses());
  }
}
}