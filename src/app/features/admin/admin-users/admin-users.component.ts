import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { User } from '../../auth/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';
@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, RouterLink, ConfirmationDialogComponent],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent {
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  loading = true;
showStatusDialog = false;
userToToggle: User | null = null;
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  pagedUsers: User[] = [];

  // The logged-in admin can't deactivate their own account from here.
  currentUserId = this.authService.getUserId();

  searchTerm = '';
  statusFilter: 'All' | 'Active' | 'Inactive' = 'All';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor() {
    this.loadUsers();
  }
  loadUsers() {
    this.loading = true;
    this.authService.getAllUsers().subscribe(users => {
      this.allUsers = users;
      this.applyFilters();
      this.loading = false;
    });
  }
  isActive(user: User): boolean {
    return user.active !== false;
  }
  onFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }
  applyFilters() {
    let result = this.allUsers;

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    }
    if (this.statusFilter === 'Active') {
      result = result.filter(u => this.isActive(u));
    } else if (this.statusFilter === 'Inactive') {
      result = result.filter(u => !this.isActive(u));
    }
    this.filteredUsers = result;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    this.updatePagedUsers();
  }
  updatePagedUsers() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedUsers = this.filteredUsers.slice(start, start + this.pageSize);
  }
  goToPage(page: number) {
    this.currentPage = page;
    this.updatePagedUsers();
  }
openStatusDialog(user: User): void {
  this.userToToggle = user;
  this.showStatusDialog = true;
}

closeStatusDialog(): void {
  this.showStatusDialog = false;
  this.userToToggle = null;
}

toggleActive(): void {
  const user = this.userToToggle;

  if (!user) {
    return;
  }

  const nextActive = !this.isActive(user);

  this.authService.setUserActive(user.id!, nextActive).subscribe({
    next: () => {
      user.active = nextActive;

      this.toast.show(
        `${user.name}'s account is now ${nextActive ? 'active' : 'deactivated'}`
      );

      this.closeStatusDialog();
    },
    error: () => {
      this.toast.show('Could not update this account. Please try again.');
      this.closeStatusDialog();
    }
  });
}
}