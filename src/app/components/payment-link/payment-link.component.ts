import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router'; 
import { PaymentService } from 'src/app/services/payment.service';
import { ReservationService } from 'src/app/services/reservation.service';

interface PaymentLinkData {
  id: number;
  payment_link_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  amount: string;
  currency: string;
  description: string | null;
  short_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  hotelId: string;
  reservationId: string;
}

interface PaymentLinkResponse {
  success: boolean;
  data: PaymentLinkData;
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
  roomType?: string;
  nights?: number;
}

@Component({
  selector: 'app-payment-link',
  templateUrl: './payment-link.component.html',
  styleUrls: ['./payment-link.component.css']
})
export class PaymentLinkComponent implements OnInit {
  
  // Payment link data
  paymentLinkId: string = '';
  paymentLinkData: PaymentLinkData | null = null;
  
  // Reservation details
  reservation: ReservationData | null = null;
  
  // UI state
  isLoading: boolean = true;
  errorMessage: string = '';
  showPaymentFrame: boolean = false;
  paymentCompleted: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private paymentService: PaymentService,
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void { 
    this.extractPaymentLinkId();
    this.fetchPaymentLinkDetails();
    this.setupPaymentListener();
  }

  extractPaymentLinkId(): void {
    this.route.queryParams.subscribe(params => {
      this.paymentLinkId = params['paymentLinkId'] || '';
    });
  }

  setupPaymentListener(): void {
    // Listen for messages from Razorpay iframe
    window.addEventListener('message', (event) => {
      // Check if message is from Razorpay
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'payment.success' || data.razorpay_payment_id) {
            this.handlePaymentSuccess(data);
          }
        } catch (e) {
          // Not a JSON message, ignore
        }
      }
    });
  }

  fetchPaymentLinkDetails(): void {
    if (!this.paymentLinkId) {
      this.errorMessage = 'Payment link ID not found';
      this.isLoading = false;
      return;
    }
    
    this.paymentService.getTransactionByPaymentLink(this.paymentLinkId).subscribe({
      next: (response: PaymentLinkResponse) => {
        if (response.success && response.data) {
          this.paymentLinkData = response.data;
          
          // Fetch reservation details
          this.fetchReservationDetails(
            response.data.hotelId, 
            response.data.reservationId
          );
        } else {
          this.errorMessage = 'Payment link not found';
          this.isLoading = false;
        }
      },
      error: (error) => {
        this.errorMessage = 'Failed to load payment link details';
        this.isLoading = false;
        console.error('Error fetching payment link:', error);
      }
    });
  }

  fetchReservationDetails(hotelId: string, reservationId: string): void {
    this.reservationService
      .getCompleteReservationData(hotelId, reservationId)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.processReservationData(response.data.reservation);
          } else {
            this.errorMessage = 'Reservation not found';
            this.isLoading = false;
          }
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
      this.isLoading = false;
      return;
    }

    const res = data.reservations.reservation[0];
    const reservationStatus = res.reservationStatus;
    
    // Check if reservation is cancelled
    if (reservationStatus === 'Cancel' || reservationStatus === 'Cancelled') {
      this.errorMessage = 'This reservation has been cancelled and cannot accept payments';
      this.isLoading = false;
      return;
    }

    const guest = res.reservationGuests?.[0]?.profileInfo?.profile?.customer?.personName?.[0];
    const roomStay = res.roomStay;
    const resIds = res.reservationIdList || [];

    // Calculate nights
    const checkInDate = new Date(roomStay?.arrivalDate);
    const checkOutDate = new Date(roomStay?.departureDate);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    this.reservation = {
      resNo: resIds.find((id: any) => id.type === 'Reservation')?.id || '',
      confirmationNo: resIds.find((id: any) => id.type === 'Confirmation')?.id || '',
      guest: guest ? `${guest.givenName || ''} ${guest.surname || ''}`.trim() : '',
      email: res.reservationGuests?.[0]?.profileInfo?.profile?.customer?.email?.[0]?.value || '',
      mobile: res.reservationGuests?.[0]?.profileInfo?.profile?.customer?.telephone?.[0]?.phoneNumber || '',
      checkIn: this.formatDate(roomStay?.arrivalDate),
      checkOut: this.formatDate(roomStay?.departureDate),
      amount: this.formatAmount(roomStay?.total?.amountBeforeTax || 0),
      status: reservationStatus,
      roomType: roomStay?.roomTypes?.[0]?.roomType || 'Standard Room',
      nights: nights
    };

    // All validations passed, show payment frame
    this.isLoading = false;
    this.showPaymentFrame = true;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getPaymentAmount(): string {
    if (!this.paymentLinkData?.amount) return '0.00';
    const amount = parseFloat(this.paymentLinkData.amount);
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  handlePaymentSuccess(data: any): void {
    this.paymentCompleted = true; 
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}