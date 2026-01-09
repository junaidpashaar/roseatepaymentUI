import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReservationComponent } from './components/reservation/reservation.component';
import { DepositComponent } from './components/deposit/deposit.component';

const routes: Routes = [
  { path: 'reservation', component: ReservationComponent },
  { path: 'deposit', component: DepositComponent },
  { path: '', redirectTo: '/reservation', pathMatch: 'full' },
  { path: '**', redirectTo: '/reservation' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }