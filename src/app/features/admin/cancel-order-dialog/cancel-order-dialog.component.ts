import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Popup shown when the admin cancels an order. A note is required, and the
// customer sees this note on their "My Orders" page.
@Component({
  selector: 'app-cancel-order-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="backdrop">
      <div class="dialog">

                  <h2>
            @if (productName) { Cancel {{ productName }} } @else { Cancel order #{{ orderId }} }
          </h2>
        <p class="sub">
          The customer will see this note on their orders page. This cannot be undone.
        </p>

        <div class="chips">
          @for (reason of quickReasons; track reason) {
            <button type="button" class="chip" (click)="pickReason(reason)">{{ reason }}</button>
          }
        </div>

        <textarea
          rows="4"
          [maxlength]="maxLength"
          [(ngModel)]="note"
          name="cancelNote"
          placeholder="Write the reason for cancelling this order"
        ></textarea>

        <div class="meta">
          @if (submitted && !isValid) {
            <small class="error">Please write at least {{ minLength }} characters</small>
          } @else {
            <span></span>
          }
          <small class="count">{{ note.length }}/{{ maxLength }}</small>
        </div>

        <div class="actions">
          <button type="button" class="btn-secondary" (click)="closed.emit()">Keep it</button>
            <button type="button" class="btn-danger" (click)="confirm()">{{ productName ? 'Cancel item' : 'Cancel Order' }}</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.55);
    }
    .dialog {
      width: 100%;
      max-width: 460px;
      padding: 22px;
      border-radius: var(--radius-md);
      background: var(--color-bg);
    }
    h2 { margin: 0 0 6px; font-size: 20px; }
    .sub { margin: 0 0 14px; font-size: 13px; color: var(--color-text-muted); }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .chip {
      padding: 5px 10px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-bg);
      font-size: 12px;
      cursor: pointer;
    }
    .chip:hover { border-color: var(--color-accent); }
    textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      outline: none;
    }
    textarea:focus { border-color: var(--color-accent); }
    .meta { display: flex; justify-content: space-between; margin-top: 4px; }
    .error { color: var(--color-danger); font-size: 12px; }
    .count { color: var(--color-text-muted); font-size: 12px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
    .btn-secondary, .btn-danger {
      padding: 10px 18px;
      border-radius: var(--radius-sm);
      font-size: 14px;
      cursor: pointer;
    }
    .btn-secondary { border: 1px solid var(--color-border); background: var(--color-bg); }
    .btn-danger { border: none; background: var(--color-danger); color: #fff; font-weight: 500; }
    .btn-danger:hover { opacity: 0.85; }
  `]
})
export class CancelOrderDialogComponent {
  @Input({ required: true }) orderId!: number;
      // When set, only this one watch of the order is being cancelled
    @Input() productName = '';
  @Output() confirmed = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  readonly minLength = 5;
  readonly maxLength = 200;

  readonly quickReasons = [
    'Item is out of stock',
    'Customer asked to cancel',
    'Address could not be verified',
    'Payment issue'
  ];

  note = '';
  submitted = false;

  get isValid(): boolean {
    return this.note.trim().length >= this.minLength;
  }

  pickReason(reason: string): void {
    this.note = reason;
  }

  confirm(): void {
    this.submitted = true;
    if (!this.isValid) {
      return;
    }
    this.confirmed.emit(this.note.trim());
  }
}