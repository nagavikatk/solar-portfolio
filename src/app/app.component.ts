import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SolarSystemComponent } from './components/solar-system/solar-system.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SolarSystemComponent],
  template: `
    <app-solar-system></app-solar-system>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: #0a0a23; /* fallback for deep space */
    }
  `]
})
export class AppComponent {
  title = 'Frontend Developer Portfolio';
} 