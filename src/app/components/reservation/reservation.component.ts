import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReservationService } from '../../services/reservation.service';
import { PaymentService } from '../../services/payment.service';

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
    private reservationService: ReservationService,
    private paymentService: PaymentService
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

      this.loadReservationData();
    });
  }

  /**
   * Single API call to load reservation + deposit + folio data
   */
  loadReservationData(): void {
    this.reservationService
      .getCompleteReservationData(this.hotelId, this.reservationId)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.processReservationData(response.data.reservation);
          } else {
            this.errorMessage = 'Reservation not found';
          }
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to load reservation data';
          this.loading = false;
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
    const status = res.reservationStatus;

    if (status === 'Cancel' || status === 'Cancelled') {
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
      status
    };

    // Optional: assign folio list if backend sends it
    this.folioList = data.folios || [];
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()} ${date.toLocaleString('en', {
      month: 'short'
    })}, ${date.getFullYear()}`;
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  setTab(tab: 'deposit' | 'adhoc' | 'folio'): void {
    this.activeTab = tab;
  }

  /* ---------------- Adhoc Payment ---------------- */

  showEnterAmount(): void {
    this.showAdhocAmountInput = true;
  }

  generateAdhocPaymentLink(): void {
    if (!this.adhocAmount || this.adhocAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    this.paymentService
      .generateAdhocPaymentLink({
        hotelId: this.hotelId,
        reservationId: this.reservationId,
        amount: this.adhocAmount,
        description: 'Adhoc payment'
      })
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.paymentLink = response.data.paymentUrl;
            this.generateQrCode(this.paymentLink);
            this.showPaymentModal = true;
          }
        },
        error: (error) => {
          alert(error.error?.message || 'Failed to generate payment link');
        }
      });
  }

  /* ---------------- Folio Payment ---------------- */

  toggleSelectAllFolios(): void {
    this.folioList.forEach(f => (f.selected = this.selectAllFolios));
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

    this.paymentService
      .generateFolioPaymentLink({
        hotelId: this.hotelId,
        reservationId: this.reservationId,
        folioIds,
        amount: this.totalFolioAmount
      })
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.paymentLink = response.data.paymentUrl;
            this.generateQrCode(this.paymentLink);
            this.showPaymentModal = true;
          }
        },
        error: (error) => {
          alert(error.error?.message || 'Failed to generate payment link');
        }
      });
  }

  /* ---------------- Common ---------------- */

  private generateQrCode(link: string): void {
    this.qrCode =
      'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' +
      encodeURIComponent(link);
  }

  closeModal(): void {
    this.showPaymentModal = false;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.paymentLink);
  }
}
