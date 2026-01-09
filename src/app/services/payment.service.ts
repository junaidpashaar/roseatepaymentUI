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
}

export interface AdhocPaymentRequest extends PaymentLinkRequest {
  description?: string;
}

export interface FolioPaymentRequest extends PaymentLinkRequest {
  folioIds: string;
}

export interface PaymentLinkResponse {
  success: boolean;
  message: string;
  data: {
    paymentLinkId: string;
    paymentUrl: string;
    amount: number;
    currency: string;
    hotelId: string;
    reservationId: string;
    guestName: string;
    type: string;
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
}