import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UiButtonComponent } from '../../../../shared/components/ui/button/ui-button.component';

@Component({
  selector: 'app-fleet-maintenance-dashboard',
  standalone: true,
  imports: [RouterLink, MatIconModule, UiButtonComponent],
  template: `
    <section class="fm-dash">
      <h2 class="fm-dash-title">Maintenance Dashboard</h2>
      <p class="fm-dash-copy">Track service requests, schedules, and fleet health from one place.</p>
      <div class="fm-dash-grid">
        <a routerLink="/fleet/maintenance/requests" class="fm-dash-card">
          <mat-icon>assignment</mat-icon>
          <strong>Service Requests</strong>
          <span>Create and approve maintenance requests</span>
        </a>
        <a routerLink="/fleet/maintenance/schedules" class="fm-dash-card">
          <mat-icon>event_repeat</mat-icon>
          <strong>Service Scheduler</strong>
          <span>Plan recurring mileage-based services</span>
        </a>
        <a routerLink="/maintenance" class="fm-dash-card">
          <mat-icon>history</mat-icon>
          <strong>Service History</strong>
          <span>View completed maintenance records</span>
        </a>
      </div>
    </section>
  `,
  styles: [`
    .fm-dash { display: flex; flex-direction: column; gap: 1rem; }
    .fm-dash-title { margin: 0; font-size: 1.125rem; font-weight: 700; }
    .fm-dash-copy { margin: 0; color: #64748b; }
    .fm-dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; }
    .fm-dash-card {
      display: flex; flex-direction: column; gap: 0.375rem;
      padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.75rem;
      background: #fff; text-decoration: none; color: inherit;
    }
    .fm-dash-card mat-icon { color: #0f766e; }
    .fm-dash-card span { font-size: 0.8125rem; color: #64748b; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FleetMaintenanceDashboardComponent {}
