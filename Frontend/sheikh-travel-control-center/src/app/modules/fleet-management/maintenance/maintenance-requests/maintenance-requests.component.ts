import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, forkJoin, of } from 'rxjs';
import { VehicleService } from '../../../../core/services/vehicle.service';
import { UiButtonComponent } from '../../../../shared/components/ui/button/ui-button.component';
import { UiSelectComponent } from '../../../../shared/components/ui/select/ui-select.component';
import { UiSelectOption } from '../../../../shared/components/ui/types/ui.types';
import { FleetUiModule } from '../../../../shared/fleet-ui/fleet-ui.module';
import { SharedModule } from '../../../../shared/shared.module';
import {
  MAINTENANCE_REQUEST_CATEGORY_LABELS,
  MAINTENANCE_REQUEST_PRIORITY_LABELS,
  MAINTENANCE_REQUEST_STATUS_LABELS,
  MAINTENANCE_REQUEST_TYPE_LABELS,
  MaintenanceRequest,
  MaintenanceRequestCategory,
  MaintenanceRequestPriority,
  MaintenanceRequestStatus,
  MaintenanceRequestType
} from '../models/maintenance-request.model';
import { MaintenanceRequestService } from '../services/maintenance-request.service';

type StatusFilter = MaintenanceRequestStatus | 'all';

@Component({
  selector: 'app-maintenance-requests',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    MatIconModule,
    SharedModule,
    FleetUiModule,
    UiButtonComponent,
    UiSelectComponent
  ],
  templateUrl: './maintenance-requests.component.html',
  styleUrls: ['./maintenance-requests.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaintenanceRequestsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly requestService = inject(MaintenanceRequestService);
  private readonly vehicleService = inject(VehicleService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly showForm = signal(false);
  readonly submitAttempted = signal(false);
  readonly requests = signal<MaintenanceRequest[]>([]);
  readonly statusFilter = signal<StatusFilter>('open');
  readonly vehicleOptions = signal<UiSelectOption[]>([]);

  readonly form = this.fb.nonNullable.group({
    vehicleId: ['', Validators.required],
    priority: ['' as MaintenanceRequestPriority | '', Validators.required],
    category: ['' as MaintenanceRequestCategory | '', Validators.required],
    type: ['' as MaintenanceRequestType | '', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(2000)]]
  });

  readonly priorityOptions: UiSelectOption<MaintenanceRequestPriority>[] = (
    Object.keys(MAINTENANCE_REQUEST_PRIORITY_LABELS) as MaintenanceRequestPriority[]
  ).map((value) => ({
    value,
    label: MAINTENANCE_REQUEST_PRIORITY_LABELS[value]
  }));

  readonly categoryOptions: UiSelectOption<MaintenanceRequestCategory>[] = (
    Object.keys(MAINTENANCE_REQUEST_CATEGORY_LABELS) as MaintenanceRequestCategory[]
  ).map((value) => ({
    value,
    label: MAINTENANCE_REQUEST_CATEGORY_LABELS[value]
  }));

  readonly typeOptions: UiSelectOption<MaintenanceRequestType>[] = (
    Object.keys(MAINTENANCE_REQUEST_TYPE_LABELS) as MaintenanceRequestType[]
  ).map((value) => ({
    value,
    label: MAINTENANCE_REQUEST_TYPE_LABELS[value]
  }));

  readonly statusChips: { id: StatusFilter; label: string }[] = [
    { id: 'open', label: 'Open' },
    { id: 'approved', label: 'Approved' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'all', label: 'All Requests' }
  ];

  readonly filteredRequests = computed(() => {
    const filter = this.statusFilter();
    const rows = this.requests();
    if (filter === 'all') {
      return rows;
    }
    return rows.filter((row) => row.status === filter);
  });

  readonly openCount = computed(() => this.requestService.countByStatus('open', this.requests()));
  readonly approvedCount = computed(() => this.requestService.countByStatus('approved', this.requests()));
  readonly inProgressCount = computed(() => this.requestService.countByStatus('in_progress', this.requests()));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      requests: this.requestService.getAll(),
      vehicles: this.vehicleService.getAll(1, 500).pipe(catchError(() => of({ items: [] })))
    }).subscribe({
      next: ({ requests, vehicles }) => {
        this.requests.set(requests);
        this.vehicleOptions.set(
          vehicles.items.map((vehicle) => ({
            value: String(vehicle.id),
            label: `${vehicle.name} (${vehicle.registrationNumber})`
          }))
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load service requests.', 'Close', { duration: 3000 });
      }
    });
  }

  openNewRequestForm(): void {
    this.submitAttempted.set(false);
    this.form.reset({
      vehicleId: '',
      priority: '',
      category: '',
      type: '',
      description: ''
    });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.submitAttempted.set(false);
    this.form.reset();
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
  }

  descriptionLength(): number {
    return (this.form.controls.description.value ?? '').length;
  }

  fieldError(label: string, controlName: keyof typeof this.form.controls): string | undefined {
    const control = this.form.get(controlName);
    if (!control || !this.shouldShowError(control)) {
      return undefined;
    }
    if (control.hasError('required') && this.isEmptyValue(control.value)) {
      return `${label} is required.`;
    }
    if (control.hasError('maxlength')) {
      return `Maximum ${control.getError('maxlength').maxLength} characters allowed.`;
    }
    return undefined;
  }

  submit(): void {
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const vehicleId = Number(value.vehicleId);
    const vehicle = this.vehicleOptions().find((option) => option.value === String(vehicleId));
    const vehicleLabel = this.parseVehicleLabel(vehicle?.label ?? '');

    this.submitting.set(true);
    this.requestService.create(
      {
        vehicleId,
        priority: value.priority as MaintenanceRequestPriority,
        category: value.category as MaintenanceRequestCategory,
        type: value.type as MaintenanceRequestType,
        description: value.description
      },
      vehicleLabel
    ).subscribe({
      next: (created) => {
        this.requests.update((rows) => [created, ...rows]);
        this.submitting.set(false);
        this.showForm.set(false);
        this.submitAttempted.set(false);
        this.form.reset();
        this.snackBar.open('Service request created.', 'Close', { duration: 2500 });
      },
      error: () => {
        this.submitting.set(false);
        this.snackBar.open('Failed to create service request.', 'Close', { duration: 3000 });
      }
    });
  }

  priorityLabel(priority: MaintenanceRequestPriority): string {
    return MAINTENANCE_REQUEST_PRIORITY_LABELS[priority];
  }

  categoryLabel(category: MaintenanceRequestCategory): string {
    return MAINTENANCE_REQUEST_CATEGORY_LABELS[category];
  }

  typeLabel(type: MaintenanceRequestType): string {
    return MAINTENANCE_REQUEST_TYPE_LABELS[type];
  }

  statusLabel(status: MaintenanceRequestStatus): string {
    return MAINTENANCE_REQUEST_STATUS_LABELS[status];
  }

  priorityClass(priority: MaintenanceRequestPriority): string {
    if (priority === 'high') return 'priority-high';
    if (priority === 'medium') return 'priority-medium';
    return 'priority-low';
  }

  private shouldShowError(control: AbstractControl): boolean {
    return control.touched || control.dirty || this.submitAttempted();
  }

  private isEmptyValue(value: unknown): boolean {
    return value == null || value === '';
  }

  private parseVehicleLabel(label: string): { name: string; registration: string } {
    const match = /^(.*)\s+\(([^)]+)\)$/.exec(label.trim());
    if (!match) {
      return { name: label || 'Vehicle', registration: '' };
    }
    return { name: match[1].trim(), registration: match[2].trim() };
  }
}
