import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { User } from '../../features/auth/user.model';
import { Observable, map, BehaviorSubject, of, catchError, throwError } from 'rxjs';
import { API_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly url = `${API_URL}/users`;

  private loggedIn$ = new BehaviorSubject<boolean>(this.hasSession());
  readonly isLoggedIn$: Observable<boolean> = this.loggedIn$.asObservable();

  // A session needs both the flag and the token the server gave us.
  // (Sessions from before tokens existed have no token, so they count as logged out.)
  private hasSession(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('isLoggedIn') === 'true' && !!localStorage.getItem('token');
  }

  checkEmailExists(email: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${API_URL}/email-exists`, { params: { email } })
      .pipe(map(res => res.exists));
  }

  // True if this email belongs to an admin account.
  // Used by the login page to hide the "Create an account" link.
  isAdminEmail(email: string): Observable<boolean> {
    if (!email) {
      return of(false);
    }

    return this.http
      .get<{ exists: boolean; isAdmin: boolean }>(`${API_URL}/email-exists`, { params: { email } })
      .pipe(map(res => res.isAdmin));
  }

  // Goes through the server's /register so it can hash the password
  // and decide the role itself.
  register(name: string, email: string, password: string): Observable<User> {
    return this.http.post<User>(`${API_URL}/register`, { name, email, password });
  }

  // The password travels in the request body (not the URL) and the server
  // checks it. It answers with the user plus a signed token.
  // A 401 means wrong email/password or a deactivated account.
  login(email: string, password: string): Observable<User | null> {
    return this.http.post<User>(`${API_URL}/login`, { email, password }).pipe(
      map(user => {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userId', user.id!.toString());
        localStorage.setItem('role', user.role ?? 'user');
        localStorage.setItem('token', user.token ?? '');
        this.loggedIn$.next(true);
        return user;
      }),
      catchError((err: HttpErrorResponse) =>
        err.status === 401 || err.status === 400 || err.status === 429
          ? of(null)
          : throwError(() => err)
      )
    );
  }

  logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    this.loggedIn$.next(false);
  }

  isLoggedIn(): boolean {
    return this.hasSession();
  }

  getUserId(): number | null {
    if (typeof window === 'undefined') return null;
    const id = localStorage.getItem('userId');
    return id ? Number(id) : null;
  }

  getCurrentUser(): Observable<User | null> {
    const userId = this.getUserId();
    return userId ? this.http.get<User>(`${this.url}/${userId}`) : of(null);
  }

  getRole(): 'user' | 'admin' | null {
    if (typeof window === 'undefined') return null;
    const role = localStorage.getItem('role');
    return role === 'admin' ? 'admin' : role === 'user' ? 'user' : null;
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.url);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.url}/${id}`);
  }

  updateName(id: number, name: string): Observable<User> {
    return this.http.patch<User>(`${this.url}/${id}`, { name });
  }

  setUserActive(id: number, active: boolean): Observable<User> {
    return this.http.patch<User>(`${this.url}/${id}`, { active });
  }

  updateProfilePicture(id: number, profilePicture: string): Observable<User> {
    return this.http.patch<User>(`${this.url}/${id}`, { profilePicture });
  }
}