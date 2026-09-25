import {  Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ProductListComponent } from './features/products/product-list/product-list.component';
import { ProductDetailsComponent } from './features/products/product-details/product-details.component';
import { CartComponent } from './features/cart/cart.component';
import { WishlistComponent } from './features/wishlist/wishlist.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { MyOrdersComponent } from './features/orders/my-orders/my-orders.component';
import { OrderSuccessComponent } from './features/checkout/order-success/order-success.component';
import { ProfileComponent } from './features/profile/profile.component';
import { adminGuard } from './core/guards/admin.guard';
import { AdminLayoutComponent } from './features/admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { AdminProductsComponent } from './features/admin/admin-products/admin-products.component';
import { AdminProductFormComponent } from './features/admin/admin-product-form/admin-product-form.component';
import { AdminOrdersComponent } from './features/admin/admin-orders/admin-orders.component';
import { AdminOrderDetailsComponent } from './features/admin/admin-order-details/admin-order-details.component';
import { AdminUsersComponent } from './features/admin/admin-users/admin-users.component';
import { AdminUserDetailsComponent } from './features/admin/admin-user-details/admin-user-details.component';
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
        component:LoginComponent,
        canActivate: [guestGuard],
        data: { hideChrome: true }
    },
    {
        path:'register',
        component:RegisterComponent,
        canActivate: [guestGuard],
        data: { hideChrome: true }
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
},
    {
    path:'profile',
    component:ProfileComponent,
    canActivate:[authGuard]
},
    {
        path: 'admin',
        component: AdminLayoutComponent,
        canActivate: [adminGuard],
        data: { hideChrome: true },
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: AdminDashboardComponent },
            { path: 'products', component: AdminProductsComponent },
            { path: 'products/add', component: AdminProductFormComponent },
            { path: 'products/edit/:id', component: AdminProductFormComponent },
            { path: 'orders', component: AdminOrdersComponent },
            { path: 'orders/:id', component: AdminOrderDetailsComponent },
            { path: 'users', component: AdminUsersComponent },
            { path: 'users/:id', component: AdminUserDetailsComponent }
        ]
    }
];