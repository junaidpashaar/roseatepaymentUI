// src/app/services/reservation.service.ts (Angular - Updated)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

export interface CompleteReservationData {
  reservation: ReservationData;
  depositFolio: DepositFolioData;
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

  /**
   * Get reservation details from backend
   */
  getReservation(hotelId: string, reservationId: string): Observable<any> {
    const url = `${environment.apiUrl}/reservation/${hotelId}/${reservationId}`;
    
    return this.http.get<any>(url).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.reservationDataSubject.next(response.data);
        }
      })
    );
  }

  /**
   * Get deposit folio details from backend
   */
  getDepositFolio(hotelId: string, reservationId: string): Observable<any> {
    const url = `${environment.apiUrl}/reservation/${hotelId}/${reservationId}/deposit-folio`;
    
    return this.http.get<any>(url).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.depositFolioDataSubject.next(response.data);
        }
      })
    );
  }

  /**
   * Get complete reservation data (reservation + deposit folio) in one call
   */
  getCompleteReservationData(hotelId: string, reservationId: string): Observable<any> {
    const url = `${environment.apiUrl}/reservation/${hotelId}/${reservationId}/complete`;
    
    return this.http.get<any>(url).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.reservationDataSubject.next(response.data.reservation);
          this.depositFolioDataSubject.next(response.data.depositFolio);
        }
      })
    );
  }

  /**
   * Validate reservation status
   */
  validateReservation(hotelId: string, reservationId: string): Observable<any> {
    const url = `${environment.apiUrl}/reservation/${hotelId}/${reservationId}/validate`;
    return this.http.get<any>(url);
  }

  getStoredReservationData(): ReservationData | null {
    return this.reservationDataSubject.value;
  }

  getStoredDepositFolioData(): DepositFolioData | null {
    return this.depositFolioDataSubject.value;
  }
}