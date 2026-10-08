import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="nf">
      <p class="code">404</p>
      <h1>Page not found</h1>
      <p class="msg">The page you're looking for doesn't exist or has moved.</p>
      <div class="actions">
        <a routerLink="/home" class="btn primary">Back to home</a>
        <a routerLink="/products" class="btn">Browse watches</a>
      </div>
    </main>
  `,
  styles: [`
    .nf { min-height: 60vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center; text-align: center;
          padding: 96px 24px; gap: 8px; }
    .code { font-size: 72px; font-weight: 700; margin: 0; letter-spacing: 4px; opacity: .15; }
    h1 { margin: 0; font-size: 28px; }
    .msg { margin: 0 0 16px; opacity: .7; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
    .btn { padding: 12px 24px; border: 1px solid currentColor; border-radius: 4px;
           text-decoration: none; color: inherit; }
    .btn.primary { background: #111; color: #fff; border-color: #111; }
  `]
})
export class NotFoundComponent {
  constructor() {
    inject(Title).setTitle('Page not found | SILKO');
  }
}