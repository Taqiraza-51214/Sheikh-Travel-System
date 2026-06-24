import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-fleet-maintenance-placeholder',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <section class="fm-placeholder">
      <mat-icon>construction</mat-icon>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </section>
  `,
  styles: [`
    .fm-placeholder {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.5rem; min-height: 240px; text-align: center; color: #64748b;
    }
    .fm-placeholder mat-icon { font-size: 2rem; width: 2rem; height: 2rem; }
    .fm-placeholder h2 { margin: 0; color: #0f172a; font-size: 1.125rem; }
    .fm-placeholder p { margin: 0; max-width: 420px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FleetMaintenancePlaceholderComponent {
  title = 'Coming soon';
  description = 'This section is being prepared for the next maintenance release.';
}
