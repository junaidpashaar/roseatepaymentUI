import { Component, OnInit, Input } from '@angular/core';
import { ReservationService } from '../../services/reservation.service';
import { PaymentService } from '../../services/payment.service';
import { environment } from 'src/environments/environment';

interface DepositPolicy {
  revenueType: string;
  deadline: string;
  amountDue: number;
  selected: boolean;
  disabled: boolean;
  policyId: string;
}

@Component({
  selector: 'app-deposit',
  templateUrl: './deposit.component.html',
  styleUrls: ['./deposit.component.css']
})
export class DepositComponent implements OnInit {
  @Input() hotelId: string = '';
  @Input() reservationId: string = '';
  @Input() type: 'deposit' | 'adhoc' = 'deposit'; // ✅ ADD THIS

  depositPolicies: DepositPolicy[] = [];
  selectAll: boolean = false;
  totalAmount: number = 0;
  loading: boolean = false;
  showPaymentModal: boolean = false;
  paymentLink: string = '';
  qrCode: string = '';

  constructor(
    private reservationService: ReservationService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.loadDepositData();
  }

  loadDepositData(): void {
    this.reservationService.depositFolioData$.subscribe(data => {
      if (data && data.reservationDepositFoliosInfo?.length > 0) {
        const folioInfo = data.reservationDepositFoliosInfo[0];
        const policies = folioInfo.policySummaryInfo?.depositPolicies || [];

        this.depositPolicies = policies.map((policy: any) => {
          const amountDue = policy.amountDue?.amount || 0;
          const disabled = amountDue <= 0;

          return {
            revenueType: policy.revenueType || 'N/A',
            deadline: this.formatDate(policy.policy?.deadline?.absoluteDeadline),
            amountDue: amountDue,
            selected: !disabled,
            disabled: disabled,
            policyId: policy.policyId?.id || ''
          };
        });

        this.selectAll = this.depositPolicies.every(p => p.selected || p.disabled);
        this.calculateTotal();
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}${this.getOrdinalSuffix(day)} ${month}, ${year}`;
  }

  getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  toggleSelectAll(): void {
    this.depositPolicies.forEach(policy => {
      if (!policy.disabled) {
        policy.selected = this.selectAll;
      }
    });
    this.calculateTotal();
  }

  onPolicySelect(): void {
    this.selectAll = this.depositPolicies
      .filter(p => !p.disabled)
      .every(p => p.selected);
    this.calculateTotal();
  }

  calculateTotal(): void {
    this.totalAmount = this.depositPolicies
      .filter(p => p.selected && !p.disabled)
      .reduce((sum, policy) => sum + policy.amountDue, 0);
  }

  hasSelectedPolicies(): boolean {
    return this.depositPolicies.some(p => p.selected && !p.disabled) && this.totalAmount > 0;
  }

  generatePaymentLink(): void {
    if (!this.hasSelectedPolicies()) {
      alert('Please select at least one deposit policy with amount due');
      return;
    }

    const selectedPolicyIds = this.depositPolicies
      .filter(p => p.selected && !p.disabled)
      .map(p => p.policyId)
      .join(',');

    this.loading = true;

    console.log("ss",{
      hotelId: this.hotelId,
      reservationId: this.reservationId,
      policyIds: selectedPolicyIds,
      amount: this.totalAmount
    });
    this.paymentService.generateDepositPaymentLink({
      hotelId: this.hotelId,
      reservationId: this.reservationId,
      type:this.type,
      policyIds: selectedPolicyIds,
      amount: this.totalAmount
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          this.paymentLink = `${environment.paymentLink}`+'?paymentLinkId='+response?.data?.payment_link_id;
          this.generateQrCode(this.paymentLink);
          this.showPaymentModal = true;
        }
      },
      error: (error) => {
        this.loading = false;
        alert(error.error?.message || 'Failed to generate payment link');
      }
    });
  }

  private generateQrCode(link: string): void {
    this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
  }

  closeModal(): void {
    this.showPaymentModal = false;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.paymentLink).then(() => {
      console.log('Payment link copied to clipboard');
    });
  }
}
