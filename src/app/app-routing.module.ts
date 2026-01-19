import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReservationComponent } from './components/reservation/reservation.component';
import { DepositComponent } from './components/deposit/deposit.component';
import { PaymentSuccessComponent } from './components/payment-success/payment-success.component';
import { PaymentFailureComponent } from './components/payment-failure/payment-failure.component';
import { PaymentLinkComponent } from './components/payment-link/payment-link.component';

const routes: Routes = [
  { path: 'reservation', component: ReservationComponent },
  { path: 'deposit', component: DepositComponent },
  { path: 'payment-success', component: PaymentSuccessComponent },
  { path: 'payment-link', component: PaymentLinkComponent },
  { path: 'payment-failure', component: PaymentFailureComponent },
  { path: '', redirectTo: '/reservation', pathMatch: 'full' },
  { path: '**', redirectTo: '/reservation' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }