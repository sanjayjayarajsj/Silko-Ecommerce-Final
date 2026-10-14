import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface ReturnFormData {
  reason: string;
  comment: string;
}

// Popup where the customer asks to return a delivered order
@Component({
  selector: 'app-return-request-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="backdrop">
      <div class="dialog">

                <h2>Return {{ productName || ('order #' + orderId) }}</h2>
          <p class="sub">Tell us why you want to return this item.</p>

        <label>Reason</label>
        <select [(ngModel)]="reason" name="reason">
          <option value="">Select a reason</option>
          @for (r of reasons; track r) {
            <option [value]="r">{{ r }}</option>
          }
        </select>
        @if (submitted && !reason) {
          <small class="error">Please select a reason</small>
        }

        <label>
          Comment
          @if (reason !== 'Other') { <span class="optional">(optional)</span> }
        </label>
        <textarea
          rows="3"
          [maxlength]="maxLength"
          [(ngModel)]="comment"
          name="comment"
          placeholder="Add more details"
        ></textarea>
        @if (submitted && commentMissing) {
          <small class="error">Please describe the problem (at least 5 characters)</small>
        }

        <div class="actions">
          <button type="button" class="btn-secondary" (click)="closed.emit()">Close</button>
          <button type="button" class="btn-primary" (click)="submit()">Request Return</button>
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
      max-width: 440px;
      padding: 24px;
      border-radius: var(--radius-md);
      background: var(--color-white);
    }
    h2 { margin: 0 0 6px; font-size: 20px; color: var(--color-text); }
    .sub { margin: 0 0 16px; font-size: 13px; color: var(--color-text-muted); }
    label {
      display: block;
      margin: 14px 0 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text);
    }
    .optional { font-weight: 400; color: var(--color-text-muted); }
    select, textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 14px;
      outline: none;
      background: var(--color-white);
    }
    textarea { resize: vertical; }
    select:focus, textarea:focus { border-color: var(--color-primary); }
    .error { display: block; margin-top: 4px; color: var(--color-danger); font-size: 12px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    .btn-secondary, .btn-primary {
      padding: 10px 18px;
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary { border: 1px solid var(--color-border); background: var(--color-white); }
    .btn-primary {
      border: 1px solid var(--color-primary);
      background: var(--color-primary);
      color: var(--color-white);
    }
    .btn-primary:hover { background: var(--color-secondary); }
  `]
})
export class ReturnRequestDialogComponent {
    @Input() orderId: number | null = null;
    // When set, the popup is about this one watch
    @Input() productName = '';
  @Output() requested = new EventEmitter<ReturnFormData>();
  @Output() closed = new EventEmitter<void>();

  readonly maxLength = 300;

  readonly reasons = [
    'Product is damaged or defective',
    'Wrong item received',
    'Not as described',
    'Stopped working',
    'Changed my mind',
    'Other'
  ];

  reason = '';
  comment = '';
  submitted = false;

  // "Other" needs a few words of explanation
  get commentMissing(): boolean {
    return this.reason === 'Other' && this.comment.trim().length < 5;
  }

  submit(): void {
    this.submitted = true;

    if (!this.reason || this.commentMissing) {
      return;
    }

    this.requested.emit({ reason: this.reason, comment: this.comment.trim() });
  }
}