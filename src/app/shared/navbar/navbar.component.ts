import { Component,inject,HostListener } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink,Router,RouterLinkActive,NavigationEnd } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { filter, map, startWith } from 'rxjs';
import { selectCartCount } from '../../store/cart/cart.selectors';
import { selectWishlistCount } from '../../store/wishlist/wishlist.selectors';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { clearWishlist } from '../../store/wishlist/wishlist.actions';
import { clearCart } from '../../store/cart/cart.actions';
import { clearAddresses } from '../../store/address/address.actions';
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink,RouterLinkActive,AsyncPipe,FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
private router=inject(Router);
private store=inject(Store);
private authService=inject(AuthService);
searchText='';
showAccount=false;
scrolled=false;
hidden=false;
private lastScrollY=0;
isLoggedIn=toSignal(this.authService.isLoggedIn$, { initialValue: this.authService.isLoggedIn() });
cartCount=this.store.select(selectCartCount);
wishlistCount=this.store.select(selectWishlistCount)

private isHomeUrl(url: string): boolean {
  const path = url.split('#')[0].split('?')[0];
  return path === '/' || path === '/home';
}

private isHomePage = toSignal(
  this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map(e => this.isHomeUrl(e.urlAfterRedirects)),
    startWith(this.isHomeUrl(this.router.url))
  ),
  { initialValue: this.isHomeUrl(this.router.url) }
);

overHero(): boolean {
  return this.isHomePage() && !this.scrolled;
}

@HostListener('window:scroll')
onWindowScroll() {
  const currentY = window.scrollY;
  this.scrolled = currentY > 8;

  if (this.showAccount || currentY < 100) {
    this.hidden = false;
  } else if (currentY > this.lastScrollY) {
    this.hidden = true;
  } else {
    this.hidden = false;
  }

  this.lastScrollY = currentY;
}

search() {
  if (!this.searchText.trim()) {
    return;
  }

  this.router.navigate(['/products'], {
    queryParams: {
      search: this.searchText
    }
  });
}
logout() {
  this.authService.logout();
  this.store.dispatch(clearCart());
  this.store.dispatch(clearWishlist());
  this.store.dispatch(clearAddresses());
  this.showAccount = false;
  this.router.navigate(['/login']);
}
}