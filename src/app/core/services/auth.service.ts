import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../../features/auth/user.model';
import { Observable, map, BehaviorSubject } from 'rxjs';

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

  register(username: string, password: string): Observable<User> {
    const user: User = {
      username: username,
      password: password
    };

    return this.http.post<User>(
      'http://localhost:3000/users',
      user
    );
  }

  login(username: string, password: string): Observable<User | null> {
    return this.http.get<User[]>(
      `http://localhost:3000/users?username=${username}&password=${password}`
    ).pipe(
      map(users => {
        if (users.length > 0) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem(
            'userId',
            users[0].id!.toString()
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
}