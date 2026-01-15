// payment-success.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.css']
})
export class PaymentSuccessComponent implements OnInit {
  
  // Razorpay payment details
  paymentId: string = '';
  paymentLinkId: string = '';
  paymentLinkReferenceId: string = '';
  paymentStatus: string = '';
  signature: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void { 
    this.extractPaymentDetails();
  }

  extractPaymentDetails(): void {
    this.route.queryParams.subscribe(params => {
      this.paymentId = params['razorpay_payment_id'] || this.generateTransactionId();
      this.paymentLinkId = params['razorpay_payment_link_id'] || '';
      this.paymentLinkReferenceId = params['razorpay_payment_link_reference_id'] || 'N/A';
      this.paymentStatus = params['razorpay_payment_link_status'] || 'completed';
      this.signature = params['razorpay_signature'] || '';
    });
  }

  generateTransactionId(): string {
    return 'TXN' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  }

  getStatusClass(): string {
    return this.paymentStatus === 'paid' ? 'status-completed' : 'status-pending';
  }

  getStatusText(): string {
    return this.paymentStatus === 'paid' ? 'Completed' : 'Pending';
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  }
  
}