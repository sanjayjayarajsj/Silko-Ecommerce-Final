import {  Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ProductListComponent } from './features/products/product-list/product-list.component';
import { ProductDetailsComponent } from './features/products/product-details/product-details.component';
import { CartComponent } from './features/cart/cart.component';
import { WishlistComponent } from './features/wishlist/wishlist.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { authGuard } from './core/guards/auth.guard';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { MyOrdersComponent } from './features/orders/my-orders/my-orders.component';
import { OrderSuccessComponent } from './features/checkout/order-success/order-success.component';
export const routes: Routes = [
  {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        component: HomeComponent
    },
    {
    path:'products',
    component:ProductListComponent
    },
    {
        path:'products/:id',
        component:ProductDetailsComponent
    },
{
    path: 'cart',
    component: CartComponent,
    canActivate: [authGuard]
},
 {
  path: 'wishlist',
  component: WishlistComponent,
  canActivate: [authGuard]
},
    {
        path:'login',
        component:LoginComponent
    },
    {
        path:'register',
        component:RegisterComponent
    },
    {
        path:'checkout',
        component:CheckoutComponent,
        canActivate:[authGuard]
    },
    {
        path:'order',
        component:MyOrdersComponent,
        canActivate:[authGuard]
    },
    {
    path:'order-success',
    component:OrderSuccessComponent,
    canActivate:[authGuard]
}
];
