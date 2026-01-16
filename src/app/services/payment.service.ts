// src/app/services/payment.service.ts (Angular - New)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymentLinkRequest {
  hotelId: string;
  reservationId: string;
  amount: number;
}

export interface DepositPaymentRequest extends PaymentLinkRequest {
  policyIds: string;
  hotelId: string;
  reservationId: string;
  type: string;
}

export interface AdhocPaymentRequest extends PaymentLinkRequest {
  description?: string;
  hotelId: string;
  reservationId: string;
}

export interface FolioPaymentRequest extends PaymentLinkRequest {
  folioIds: string;
  hotelId: string;
  reservationId: string;
}

export interface PaymentLinkResponse {
  success: boolean;
  message: string;
  data: {
    payment_link_id: string;
    short_url: string;
    amount: number;
    currency: string;
    customer_name: string;
    createdAt: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private http: HttpClient) {}

  /**
   * Generate payment link for deposit
   */
  generateDepositPaymentLink(request: DepositPaymentRequest): Observable<PaymentLinkResponse> {
    const url = `${environment.apiUrl}/payment/deposit/generate`;
    return this.http.post<PaymentLinkResponse>(url, request);
  }

  /**
   * Generate payment link for adhoc payment
   */
  generateAdhocPaymentLink(request: AdhocPaymentRequest): Observable<PaymentLinkResponse> {
    const url = `${environment.apiUrl}/payment/adhoc/generate`;
    return this.http.post<PaymentLinkResponse>(url, request);
  }

  /**
   * Generate payment link for folio
   */
  generateFolioPaymentLink(request: FolioPaymentRequest): Observable<PaymentLinkResponse> {
    const url = `${environment.apiUrl}/payment/folio/generate`;
    return this.http.post<PaymentLinkResponse>(url, request);
  }

  /**
   * Get folio data for a reservation
   */
  getCheckoutFolio(hotelId: string, reservationId: string): Observable<any> {
    const url = `${environment.apiUrl}/reservation/${hotelId}/${reservationId}/checkout-folio`;
    return this.http.get(url);
  }

  
  /**
   * Generate Transaction payment
   */
  getTransactionByPaymentId(paymentId: string): Observable<any> {
      const url = `${environment.apiUrl}/payment/links/${paymentId}/transactions`;
      return this.http.get(url);
  }
}