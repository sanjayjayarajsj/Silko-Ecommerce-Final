import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface CancelFormData {
  reason: string;
  comment: string;
}

// Popup where the customer cancels a whole order, or just one item of it.
// The reason they pick is saved and shown on My Orders.
@Component({
  selector: 'app-cancel-item-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
        (click)="$event.stopPropagation()"
      >

        <h2 id="cancel-dialog-title">{{ heading }}</h2>
        <p class="sub">{{ sub }}</p>

        <fieldset>
          <legend>Why are you cancelling?</legend>

          @for (r of reasons; track r) {
            <label class="reason" [class.picked]="reason === r">
              <input
                type="radio"
                name="cancelReason"
                [value]="r"
                [(ngModel)]="reason"
              >
              <span>{{ r }}</span>
            </label>
          }
        </fieldset>
        @if (submitted && !reason) {
          <small class="error">Please choose a reason</small>
        }

        <label class="comment-label" for="cancel-comment">
          Anything else?
          @if (reason !== 'Other') { <span class="optional">(optional)</span> }
        </label>
        <textarea
          id="cancel-comment"
          rows="3"
          [maxlength]="maxLength"
          [(ngModel)]="comment"
          name="cancelComment"
          placeholder="Add more details"
        ></textarea>
        @if (submitted && commentMissing) {
          <small class="error">Please tell us a little more (at least 5 characters)</small>
        }

        <div class="actions">
          <button type="button" class="btn-secondary" (click)="closed.emit()">Keep it</button>
          <button type="button" class="btn-danger" [disabled]="busy" (click)="submit()">
            {{ busy ? 'Cancelling…' : confirmLabel }}
          </button>
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
      max-height: 92vh;
      overflow-y: auto;
      padding: 24px;
      border-radius: var(--radius-md);
      background: var(--color-white);
    }
    h2 { margin: 0 0 6px; font-size: 20px; color: var(--color-text); }
    .sub { margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: var(--color-text-muted); }
    fieldset { margin: 0; padding: 0; border: none; }
    legend { margin-bottom: 8px; font-size: 12px; font-weight: 600; color: var(--color-text); }
    .reason {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 14px;
      cursor: pointer;
    }
    .reason.picked { border-color: var(--color-primary); background: var(--color-surface); }
    .reason input { accent-color: var(--color-primary); }
    .comment-label {
      display: block;
      margin: 14px 0 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text);
    }
    .optional { font-weight: 400; color: var(--color-text-muted); }
    textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 14px;
      outline: none;
      resize: vertical;
    }
    textarea:focus { border-color: var(--color-primary); }
    .error { display: block; margin-top: 4px; color: var(--color-danger); font-size: 12px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    .btn-secondary, .btn-danger {
      padding: 10px 18px;
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary { border: 1px solid var(--color-border); background: var(--color-white); }
    .btn-danger {
      border: 1px solid var(--color-danger);
      background: var(--color-danger);
      color: var(--color-white);
    }
    .btn-danger:disabled { opacity: 0.6; cursor: default; }
  `]
})
export class CancelItemDialogComponent {
  @Input({ required: true }) heading!: string;
  @Input() sub = 'This cannot be undone.';
  @Input() confirmLabel = 'Cancel item';
  @Input() busy = false;
  @Output() confirmed = new EventEmitter<CancelFormData>();
  @Output() closed = new EventEmitter<void>();

  readonly maxLength = 200;

  readonly reasons = [
    'Ordered by mistake',
    'Want to order a different watch',
    'Found a better price elsewhere',
    'Delivery is taking too long',
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

    this.confirmed.emit({ reason: this.reason, comment: this.comment.trim() });
  }
}