// src/app/services/reservation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ReservationData {
  reservations: any;
  masterInfoList: any[];
  links: any[];
}

export interface DepositFolioData {
  reservationDepositFoliosInfo: any[];
  trxCodesInfo: any[];
  links: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private reservationDataSubject = new BehaviorSubject<ReservationData | null>(null);
  private depositFolioDataSubject = new BehaviorSubject<DepositFolioData | null>(null);
  
  public reservationData$ = this.reservationDataSubject.asObservable();
  public depositFolioData$ = this.depositFolioDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(hotelId: string): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hotelid': hotelId,
      'x-app-key': environment.appKey
    });
  }

  getReservation(hotelId: string, reservationId: string): Observable<ReservationData> {
    const url = `${environment.apiUrl}/rsv/v1/hotels/${hotelId}/reservations/${reservationId}?fetchInstructions=Reservation`;
    const headers = this.getHeaders(hotelId);

    return this.http.get<ReservationData>(url, { headers }).pipe(
      tap(data => this.reservationDataSubject.next(data))
    );
  }

  getDepositFolio(hotelId: string, reservationId: string): Observable<DepositFolioData> {
    const url = `${environment.apiUrl}/csh/v1/hotels/${hotelId}/depositFolio?id=${reservationId}&fetchInstructions=ProjectedRevenue`;
    const headers = this.getHeaders(hotelId);

    return this.http.get<DepositFolioData>(url, { headers }).pipe(
      tap(data => this.depositFolioDataSubject.next(data))
    );
  }

  getStoredReservationData(): ReservationData | null {
    return this.reservationDataSubject.value;
  }

  getStoredDepositFolioData(): DepositFolioData | null {
    return this.depositFolioDataSubject.value;
  }
}