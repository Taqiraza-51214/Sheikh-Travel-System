import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface MaintenanceTab {
  id: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-fleet-maintenance-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fleet-maintenance-shell.component.html',
  styleUrls: ['./fleet-maintenance-shell.component.scss']
})
export class FleetMaintenanceShellComponent {
  readonly tabs: MaintenanceTab[] = [
    { id: 'dashboard', label: 'Dashboard', route: '/fleet/maintenance' },
    { id: 'requests', label: 'Service Requests', route: '/fleet/maintenance/requests' },
    { id: 'work-orders', label: 'Work Orders', route: '/fleet/maintenance/work-orders' },
    { id: 'schedules', label: 'Service Scheduler', route: '/fleet/maintenance/schedules' },
    { id: 'history', label: 'Service History', route: '/maintenance' },
    { id: 'parts', label: 'Spare Parts', route: '/fleet/maintenance/spare-parts' },
    { id: 'vendors', label: 'Workshops & Vendors', route: '/fleet/maintenance/vendors' }
  ];
}
