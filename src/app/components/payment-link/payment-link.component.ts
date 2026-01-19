import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router'; 
import { PaymentService } from 'src/app/services/payment.service';
import { ReservationService } from 'src/app/services/reservation.service';

interface TransactionData {
  id: number;
  payment_link_id: string | null;
  payment_id: string;
  order_id: string;
  signature: string | null;
  amount: string;
  currency: string;
  status: string;
  method: string;
  email: string;
  contact: string;
  webhook_payload: {
    payload: {
      payment: {
        entity: {
          notes: {
            info: string;
            hotelId: string;
            reservationId: string;
          };
          bank: string;
          created_at: number;
          fee: number;
          tax: number;
        };
      };
    };
  };
  created_at: string;
}

interface TransactionResponse {
  success: boolean;
  count: number;
  data: TransactionData[];
}

interface PaymentInfo {
  hotelId: string;
  reservationId: string;
  amount: number;
  description: string;
}

interface ReservationData {
  resNo: string;
  confirmationNo: string;
  guest: string;
  email: string;
  mobile: string;
  checkIn: string;
  checkOut: string;
  amount: string;
  status: string;
}

@Component({
  selector: 'app-payment-link',
  templateUrl: './payment-link.component.html',
  styleUrls: ['./payment-link.component.css']
})
export class PaymentLinkComponent implements OnInit {
  
  // Razorpay payment details from URL
  paymentId: string = '';
  paymentLinkId: string = '';
  paymentLinkReferenceId: string = '';
  paymentStatus: string = '';
  signature: string = '';

  // Transaction details from API
  transactionData: TransactionData | null = null;
  paymentInfo: any | null = null;
  
  // Reservation details
  hotelId: string = '';
  reservationId: string = '';
  reservation: ReservationData | null = null;
  reservationStatus: string = '';
  isValidReservation: boolean = false;
  
  // UI state
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private paymentService: PaymentService,
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void { 
    this.extractPaymentDetails();
    this.fetchTransactionDetails();
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

  fetchTransactionDetails(): void {
    if (!this.paymentId) {
      this.isLoading = false;
      this.errorMessage = 'Payment ID not found';
      return;
    }
    
    this.paymentService.getTransactionByPaymentLink(this.paymentId).subscribe({
      next: (response: TransactionResponse) => {
        if (response.success && response.data && response.data.length > 0) {
          this.transactionData = response.data[0];
          this.parsePaymentInfo();
          // Fetch reservation data after getting payment info
          if (this.hotelId && this.reservationId) {
            this.fetchReservationDetails();
          } else {
            this.isLoading = false;
          }
        } else {
          this.isLoading = false;
          this.errorMessage = 'No transaction data found';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to fetch transaction details';
        console.error('Error fetching transaction:', error);
      }
    });
  }

  parsePaymentInfo(): void {
    if (this.transactionData?.webhook_payload?.payload?.payment?.entity?.notes?.info) {
      try {
        const infoString = this.transactionData.webhook_payload.payload.payment.entity.notes.info;
        this.paymentInfo = JSON.parse(infoString);
        
        // Extract hotelId and reservationId
        this.hotelId = this.paymentInfo.hotelId;
        this.reservationId = this.paymentInfo.reservationId;
      } catch (error) {
        console.error('Error parsing payment info:', error);
        // Fallback: extract from notes directly
        const notes = this.transactionData.webhook_payload.payload.payment.entity.notes;
        this.hotelId = notes.hotelId || '';
        this.reservationId = notes.reservationId || '';
        this.paymentInfo = {
          hotelId: this.hotelId,
          reservationId: this.reservationId,
          amount: 0,
          description: 'Adhoc payment'
        };
      }
    }
  }

  fetchReservationDetails(): void {
    this.reservationService
      .getCompleteReservationData(this.hotelId, this.reservationId)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.processReservationData(response.data.reservation);
          } else {
            this.errorMessage = 'Reservation not found';
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to load reservation data';
          this.isLoading = false;
          console.error('Reservation load error:', error);
        }
      });
  }

  processReservationData(data: any): void {
    if (!data?.reservations?.reservation?.[0]) {
      this.errorMessage = 'Reservation not found';
      return;
    }

    const res = data.reservations.reservation[0];
    this.reservationStatus = res.reservationStatus;
    
    if (this.reservationStatus === 'Cancel' || this.reservationStatus === 'Cancelled') {
      this.errorMessage = 'Invalid Reservation: This reservation has been cancelled';
      return;
    }

    this.isValidReservation = true;

    const guest =
      res.reservationGuests?.[0]?.profileInfo?.profile?.customer?.personName?.[0];
    const roomStay = res.roomStay;
    const resIds = res.reservationIdList || [];

    this.reservation = {
      resNo: resIds.find((id: any) => id.type === 'Reservation')?.id || '',
      confirmationNo: resIds.find((id: any) => id.type === 'Confirmation')?.id || '',
      guest: guest
        ? `${guest.givenName || ''} ${guest.surname || ''}`.trim()
        : '',
      email: '',
      mobile: '',
      checkIn: this.formatDate(roomStay?.arrivalDate),
      checkOut: this.formatDate(roomStay?.departureDate),
      amount: this.formatAmount(roomStay?.total?.amountBeforeTax || 0),
      status: this.reservationStatus
    };
    console.log("this.reservation",this.reservation);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  formatAmount(amount: number): string {
    return amount.toFixed(2);
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

  getTransactionTime(): string {
    if (!this.transactionData?.webhook_payload?.payload?.payment?.entity?.created_at) {
      return this.getCurrentTime();
    }
    
    const timestamp = this.transactionData.webhook_payload.payload.payment.entity.created_at;
    const date = new Date(timestamp * 1000);
    
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  }

  getFormattedAmount(): string {
    if (!this.transactionData?.amount) return '0.00';
    
    const amount = parseFloat(this.transactionData.amount);
    return amount.toFixed(2);
  }

  getPaymentMethod(): string {
    return this.transactionData?.method?.toUpperCase() || 'N/A';
  }

  getBankName(): string {
    return this.transactionData?.webhook_payload?.payload?.payment?.entity?.bank || 'N/A';
  }

  getTransactionFee(): string {
    const fee = this.transactionData?.webhook_payload?.payload?.payment?.entity?.fee;
    if (!fee) return '0.00';
    return (fee / 100).toFixed(2);
  }

  getStatusClass(): string {
    const status = this.transactionData?.status || this.paymentStatus;
    return status === 'paid' || status === 'captured' ? 'status-completed' : 'status-pending';
  }

  getStatusText(): string {
    const status = this.transactionData?.status || this.paymentStatus;
    return status === 'paid' || status === 'captured' ? 'Completed' : 'Pending';
  }

  copyToClipboard(text: string | undefined | null): void {
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  downloadReceipt(): void {
    console.log('Downloading receipt for payment:', this.paymentId);
  }

  closeModal(): void {
    this.router.navigate(['/']);
  }
}