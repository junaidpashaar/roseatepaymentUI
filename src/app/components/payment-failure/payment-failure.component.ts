import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-failure',
  templateUrl: './payment-failure.component.html',
  styleUrls: ['./payment-failure.component.css']
})
export class PaymentFailureComponent implements OnInit {
  showModal: boolean = false;
  errorReasons: string[] = [
    'Insufficient funds',
    'Incorrect card details',
    'Card expired or blocked',
    'Network connection issue'
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 300);
  }

  retryPayment(): void {
    this.showModal = false;
    setTimeout(() => {
      this.router.navigate(['/checkout']);
    }, 300);
  }

  contactSupport(): void {
    this.showModal = false;
    setTimeout(() => {
      this.router.navigate(['/support']);
    }, 300);
  }
}