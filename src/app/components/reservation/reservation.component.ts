import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReservationService } from '../../services/reservation.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-reservation',
  templateUrl: './reservation.component.html',
  styleUrls: ['./reservation.component.css']
})
export class ReservationComponent implements OnInit {
  activeTab: 'deposit' | 'adhoc' | 'folio' = 'deposit';
  
  hotelId: string = '';
  reservationId: string = '';
  
  loading: boolean = true;
  errorMessage: string = '';
  isValidReservation: boolean = false;

  reservation = {
    resNo: '',
    confirmationNo: '',
    guest: '',
    email: '',
    mobile: '',
    checkIn: '',
    checkOut: '',
    amount: '0.00',
    status: ''
  };

  // Adhoc payment
  showAdhocAmountInput: boolean = false;
  adhocAmount: number | null = null;
  
  // Folio
  folioList: any[] = [];
  selectAllFolios: boolean = false;
  totalFolioAmount: number = 0;

  // Payment modal
  paymentLink: string = '';
  qrCode: string = '';
  showPaymentModal: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.hotelId = params['hotelID'] || '';
      this.reservationId = params['reservationId'] || '';

      if (!this.hotelId || !this.reservationId) {
        this.errorMessage = 'Invalid Link: Missing hotel ID or reservation ID';
        this.loading = false;
        return;
      }

      this.initializeApp();
    });
  }

  initializeApp(): void {
    const token = this.authService.getToken();
    
    if (!token || this.authService.isTokenExpired()) {
      this.authService.login().subscribe({
        next: () => {
          this.loadReservationData();
        },
        error: (error) => {
          this.errorMessage = 'Authentication failed. Please try again.';
          this.loading = false;
          console.error('Login error:', error);
        }
      });
    } else {
      this.loadReservationData();
    }
  }

  loadReservationData(): void {
    forkJoin({
      reservation: this.reservationService.getReservation(this.hotelId, this.reservationId),
      depositFolio: this.reservationService.getDepositFolio(this.hotelId, this.reservationId)
    }).subscribe({
      next: (result) => {
        this.processReservationData(result.reservation);
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load reservation data. Please try again.';
        this.loading = false;
        console.error('Data loading error:', error);
      }
    });
  }

  processReservationData(data: any): void {
    if (!data?.reservations?.reservation?.[0]) {
      this.errorMessage = 'Reservation not found';
      return;
    }

    const res = data.reservations.reservation[0];
    const status = res.reservationStatus;

    if (status === 'Cancel' || status === 'Cancelled') {
      this.errorMessage = 'Invalid Reservation: This reservation has been cancelled';
      return;
    }

    this.isValidReservation = true;

    // Extract reservation details
    const guest = res.reservationGuests?.[0]?.profileInfo?.profile?.customer?.personName?.[0];
    const roomStay = res.roomStay;
    const resIds = res.reservationIdList || [];

    this.reservation = {
      resNo: resIds.find((id: any) => id.type === 'Reservation')?.id || '',
      confirmationNo: resIds.find((id: any) => id.type === 'Confirmation')?.id || '',
      guest: guest ? `${guest.givenName || ''} ${guest.surname || ''}`.trim() : '',
      email: '', // Extract from communication if available
      mobile: '', // Extract from communication if available
      checkIn: this.formatDate(roomStay?.arrivalDate),
      checkOut: this.formatDate(roomStay?.departureDate),
      amount: this.formatAmount(roomStay?.total?.amountBeforeTax || 0),
      status: status
    };
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  setTab(tab: 'deposit' | 'adhoc' | 'folio'): void {
    this.activeTab = tab;
  }

  // Adhoc methods
  showEnterAmount(): void {
    this.showAdhocAmountInput = true;
  }

  generateAdhocPaymentLink(): void {
    if (!this.adhocAmount || this.adhocAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    this.paymentLink = `https://payment.evolveback.com/payment?adhocAmount=${this.adhocAmount}`;
    this.generateQrCode(this.paymentLink);
    this.showPaymentModal = true;
  }

  // Folio methods (placeholder - implement as needed)
  toggleSelectAllFolios(): void {
    this.folioList.forEach(f => f.selected = this.selectAllFolios);
    this.calculateTotalFolioAmount();
  }

  onSingleFolioSelect(): void {
    this.selectAllFolios = this.folioList.every(f => f.selected);
    this.calculateTotalFolioAmount();
  }

  hasSelectedFolios(): boolean {
    return this.folioList.some(f => f.selected);
  }

  calculateTotalFolioAmount(): void {
    this.totalFolioAmount = this.folioList
      .filter(f => f.selected)
      .reduce((sum, item) => sum + Number(item.amount), 0);
  }

  generateFolioPaymentLink(): void {
    const selectedFolios = this.folioList.filter(f => f.selected);
    if (selectedFolios.length === 0) {
      alert('Please select at least one folio');
      return;
    }

    const folioIds = selectedFolios.map(f => f.folioNo).join(',');
    this.paymentLink = `https://payment.evolveback.com/payment?folios=${folioIds}&amount=${this.totalFolioAmount}`;
    this.generateQrCode(this.paymentLink);
    this.showPaymentModal = true;
  }

  // Common modal methods
  private generateQrCode(link: string): void {
    this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
  }

  closeModal(): void {
    this.showPaymentModal = false;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.paymentLink);
  }
}