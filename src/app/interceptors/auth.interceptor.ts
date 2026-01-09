// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private retryCount = new Map<string, number>();

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip adding token for login requests
    if (request.url.includes('/oauth/v1/tokens')) {
      return next.handle(request);
    }

    const token = this.authService.getToken();
    if (token) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const requestKey = `${request.method}-${request.url}`;
    const currentRetryCount = this.retryCount.get(requestKey) || 0;

    // If already retried 2 times, throw error
    if (currentRetryCount >= 2) {
      this.retryCount.delete(requestKey);
      this.authService.clearToken();
      return throwError(() => new Error('Unauthorized: Maximum retry attempts reached'));
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.login().pipe(
        switchMap((response: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response.access_token);
          
          // Increment retry count
          this.retryCount.set(requestKey, currentRetryCount + 1);
          
          // Retry the original request
          return next.handle(this.addToken(request, response.access_token));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.authService.clearToken();
          this.retryCount.delete(requestKey);
          return throwError(() => err);
        })
      );
    } else {
      // Wait for the token refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => {
          this.retryCount.set(requestKey, currentRetryCount + 1);
          return next.handle(this.addToken(request, token));
        })
      );
    }
  }
}