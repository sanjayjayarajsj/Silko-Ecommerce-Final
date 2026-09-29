import {  Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ProductListComponent } from './features/products/product-list/product-list.component';
import { ProductDetailsComponent } from './features/products/product-details/product-details.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';
import { noAdminGuard } from './core/guards/no-admin.guard';
export const routes: Routes = [
  {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        // Kept eager - this (or /products) is what almost every visitor
        // lands on first, so there's nothing to gain by lazy-loading it.
        // noAdminGuard keeps a logged-in admin off it - they get sent
        // back to /admin instead of browsing as a customer.
        path: 'home',
        component: HomeComponent,
        canActivate: [noAdminGuard]
    },
    {
    // Kept eager for the same reason - core browsing pages.
    path:'products',
    component:ProductListComponent,
    canActivate: [noAdminGuard]
    },
    {
        path:'products/:id',
        component:ProductDetailsComponent,
        canActivate: [noAdminGuard]
    },
{
    // Not needed until the user opens the cart, so it's lazy - same
    // treatment as the admin section.
    path: 'cart',
    loadComponent: () =>
        import('./features/cart/cart.component').then(m => m.CartComponent),
    canActivate: [authGuard, noAdminGuard]
},
 {
  path: 'wishlist',
  loadComponent: () =>
      import('./features/wishlist/wishlist.component').then(m => m.WishlistComponent),
  canActivate: [authGuard, noAdminGuard]
},
     {
    path: 'login',
    loadComponent: () => import('./features/auth/auth/auth.component').then(m => m.AuthComponent),
    canActivate: [guestGuard],
    data: { hideChrome: true, mode: 'login' }
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/auth/auth.component').then(m => m.AuthComponent),
    canActivate: [guestGuard],
    data: { hideChrome: true, mode: 'register' }
  },
    {
        path:'checkout',
        loadComponent: () =>
            import('./features/checkout/checkout.component').then(m => m.CheckoutComponent),
        canActivate:[authGuard, noAdminGuard]
    },
    {
        path:'order',
        loadComponent: () =>
            import('./features/orders/my-orders/my-orders.component').then(m => m.MyOrdersComponent),
        canActivate:[authGuard, noAdminGuard]
    },
    {
    path:'order-success',
    loadComponent: () =>
        import('./features/checkout/order-success/order-success.component').then(m => m.OrderSuccessComponent),
    canActivate:[authGuard, noAdminGuard]
},
    {
    path:'profile',
    loadComponent: () =>
        import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate:[authGuard, noAdminGuard]
},
    {
        path: 'admin',
        loadComponent: () =>
            import('./features/admin/admin-layout/admin-layout.component')
                .then(m => m.AdminLayoutComponent),
        canActivate: [adminGuard],
        data: { hideChrome: true },
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./features/admin/admin-dashboard/admin-dashboard.component')
                        .then(m => m.AdminDashboardComponent)
            },
            {
                path: 'products',
                loadComponent: () =>
                    import('./features/admin/admin-products/admin-products.component')
                        .then(m => m.AdminProductsComponent)
            },
            {
                path: 'products/add',
                loadComponent: () =>
                    import('./features/admin/admin-product-form/admin-product-form.component')
                        .then(m => m.AdminProductFormComponent)
            },
            {
                path: 'products/edit/:id',
                loadComponent: () =>
                    import('./features/admin/admin-product-form/admin-product-form.component')
                        .then(m => m.AdminProductFormComponent)
            },
            {
                path: 'orders',
                loadComponent: () =>
                    import('./features/admin/admin-orders/admin-orders.component')
                        .then(m => m.AdminOrdersComponent)
            },
            {
                path: 'orders/:id',
                loadComponent: () =>
                    import('./features/admin/admin-order-details/admin-order-details.component')
                        .then(m => m.AdminOrderDetailsComponent)
            },
            {
                path: 'users',
                loadComponent: () =>
                    import('./features/admin/admin-users/admin-users.component')
                        .then(m => m.AdminUsersComponent)
            },
            {
                path: 'users/:id',
                loadComponent: () =>
                    import('./features/admin/admin-user-details/admin-user-details.component')
                        .then(m => m.AdminUserDetailsComponent)
            }
        ]
    }
];