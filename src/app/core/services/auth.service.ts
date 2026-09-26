import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../../features/auth/user.model';
import { Observable, map, BehaviorSubject, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);

  private loggedIn$ = new BehaviorSubject<boolean>(this.hasStoredSession());
  readonly isLoggedIn$: Observable<boolean> = this.loggedIn$.asObservable();

  private hasStoredSession(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return localStorage.getItem('isLoggedIn') === 'true';
  }

  // Used by the register form to check if an account with this email
  // already exists, before creating a new one.
  checkEmailExists(email: string): Observable<boolean> {
    return this.http.get<User[]>(
      `http://localhost:3000/users?email=${email}`
    ).pipe(
      map(users => users.length > 0)
    );
  }

  register(name: string, email: string, password: string): Observable<User> {
    const user: User = {
      name: name,
      email: email,
      password: password
    };

    return this.http.post<User>(
      'http://localhost:3000/users',
      user
    );
  }

  login(email: string, password: string): Observable<User | null> {
    return this.http.get<User[]>(
      `http://localhost:3000/users?email=${email}&password=${password}`
    ).pipe(
      map(users => {
        // A deactivated account (active === false) should not be able to
        // log in at all - treated the same as a wrong email/password.
        if (users.length > 0 && users[0].active !== false) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem(
            'userId',
            users[0].id!.toString()
          );
          localStorage.setItem(
            'role',
            users[0].role ?? 'user'
          );
          this.loggedIn$.next(true);

          return users[0];
        }

        return null;
      })
    );
  }

  logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    this.loggedIn$.next(false);
  }

  isLoggedIn(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return localStorage.getItem('isLoggedIn') === 'true';
  }

getUserId(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const id = localStorage.getItem('userId');

  return id ? Number(id) : null;
  }

  // Fetches the full profile (name/email) of the currently logged-in user.
  // Used by the profile page - getUserId() only gives the id.
  getCurrentUser(): Observable<User | null> {
    const userId = this.getUserId();

    if (!userId) {
      return of(null);
    }

    return this.http.get<User>(
      `http://localhost:3000/users/${userId}`
    );
  }

  getRole(): 'user' | 'admin' | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const role = localStorage.getItem('role');
    return role === 'admin' ? 'admin' : role === 'user' ? 'user' : null;
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  // Used by the admin panel's Users section.
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>('http://localhost:3000/users');
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`http://localhost:3000/users/${id}`);
  }

  setUserActive(id: number, active: boolean): Observable<User> {
    return this.http.patch<User>(
      `http://localhost:3000/users/${id}`,
      { active }
    );
  }

  // Saves the (already resized/compressed) base64 image string as the
  // user's profile picture.
  updateProfilePicture(id: number, profilePicture: string): Observable<User> {
    return this.http.patch<User>(
      `http://localhost:3000/users/${id}`,
      { profilePicture }
    );
  }
}