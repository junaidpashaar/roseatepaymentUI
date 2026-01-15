// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getStoredToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  login(): Observable<TokenResponse> {
    const url = `${environment.apiUrl}/oauth/v1/tokens`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-app-key': environment.appKey,
      'enterpriseId': environment.enterpriseId,
      'Authorization': 'Basic ' + btoa(`${environment.clientId}:${environment.clientSecret}`)
    });

    const body = new URLSearchParams({
      'grant_type': 'client_credentials',
      'scope': 'urn:opc:hgbu:ws:__myscopes__'
    });

    return this.http.post<TokenResponse>(url, body.toString(), { headers }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('token_expiry', (Date.now() + response.expires_in * 1000).toString());
        this.tokenSubject.next(response.access_token);
      }),
      catchError(error => {
        console.error('Login failed:', error);
        return throwError(() => error);
      })
    );
  }

  isTokenExpired(): boolean {
    const expiry = localStorage.getItem('token_expiry');
    if (!expiry) return true;
    return Date.now() >= parseInt(expiry);
  }

  clearToken(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expiry');
    this.tokenSubject.next(null);
  }
}