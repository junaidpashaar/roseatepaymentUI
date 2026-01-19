import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DepositComponent } from './components/deposit/deposit.component';
import { ReservationComponent } from './components/reservation/reservation.component';
import { CommonModule } from '@angular/common';
import { PaymentFailureComponent } from './components/payment-failure/payment-failure.component';
import { PaymentSuccessComponent } from './components/payment-success/payment-success.component';
import { PaymentLinkComponent } from './components/payment-link/payment-link.component';

@NgModule({
  declarations: [
    AppComponent,
    DepositComponent,
    ReservationComponent,
    PaymentSuccessComponent,
    PaymentFailureComponent,
    PaymentLinkComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    CommonModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }