import { Routes } from '@angular/router';
import { SolarSystemComponent } from './components/solar-system/solar-system.component';

export const routes: Routes = [
  { path: '', component: SolarSystemComponent },
  { path: '**', redirectTo: '' }
]; 