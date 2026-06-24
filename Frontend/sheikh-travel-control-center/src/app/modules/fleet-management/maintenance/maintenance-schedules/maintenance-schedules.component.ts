import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe, NgClass, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, forkJoin, of } from 'rxjs';
import { VehicleListItem } from '../../../../core/models/vehicle.model';
import { VehicleService } from '../../../../core/services/vehicle.service';
import { UiButtonComponent } from '../../../../shared/components/ui/button/ui-button.component';
import { UiDrawerComponent } from '../../../../shared/components/ui/drawer/ui-drawer.component';
import { UiInputComponent } from '../../../../shared/components/ui/input/ui-input.component';
import { UiSelectComponent } from '../../../../shared/components/ui/select/ui-select.component';
import { UiSelectOption } from '../../../../shared/components/ui/types/ui.types';
import {
  MAINTENANCE_SCHEDULE_INTERVAL_LABELS,
  MAINTENANCE_SCHEDULE_PRIORITY_LABELS,
  MAINTENANCE_SERVICE_TYPES,
  MaintenanceSchedule,
  MaintenanceScheduleIntervalType,
  MaintenanceSchedulePriority,
  SCHEDULE_QUICK_TEMPLATES,
  ScheduleQuickTemplate,
  VehicleScheduleRow
} from '../models/maintenance-schedule.model';
import { MaintenanceScheduleService } from '../services/maintenance-schedule.service';

@Component({
  selector: 'app-maintenance-schedules',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    TitleCasePipe,
    NgClass,
    MatIconModule,
    UiButtonComponent,
    UiDrawerComponent,
    UiInputComponent,
    UiSelectComponent
  ],
  templateUrl: './maintenance-schedules.component.html',
  styleUrls: ['./maintenance-schedules.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaintenanceSchedulesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly scheduleService = inject(MaintenanceScheduleService);
  private readonly vehicleService = inject(VehicleService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly drawerOpen = signal(false);
  readonly submitAttempted = signal(false);
  readonly schedules = signal<MaintenanceSchedule[]>([]);
  readonly vehicles = signal<VehicleListItem[]>([]);
  readonly vehicleOptions = signal<UiSelectOption[]>([]);
  readonly viewMode = signal<'list' | 'calendar' | 'timeline'>('list');
  readonly editingScheduleId = signal<number | null>(null);
  readonly lockedVehicle = signal<VehicleListItem | null>(null);

  readonly form = this.fb.nonNullable.group({
    vehicleId: ['', Validators.required],
    serviceType: ['', Validators.required],
    customServiceType: [''],
    intervalType: ['mileage' as MaintenanceScheduleIntervalType, Validators.required],
    intervalValue: [5000, [Validators.required, Validators.min(1)]],
    lastServiceMileage: [null as number | null, [Validators.min(0)]],
    priority: ['medium' as MaintenanceSchedulePriority, Validators.required]
  });

  readonly serviceTypeOptions: UiSelectOption[] = MAINTENANCE_SERVICE_TYPES.map((value) => ({
    value,
    label: value
  }));

  readonly intervalTypeOptions: UiSelectOption<MaintenanceScheduleIntervalType>[] = (
    Object.keys(MAINTENANCE_SCHEDULE_INTERVAL_LABELS) as MaintenanceScheduleIntervalType[]
  ).map((value) => ({
    value,
    label: MAINTENANCE_SCHEDULE_INTERVAL_LABELS[value]
  }));

  readonly priorityOptions: UiSelectOption<MaintenanceSchedulePriority>[] = (
    Object.keys(MAINTENANCE_SCHEDULE_PRIORITY_LABELS) as MaintenanceSchedulePriority[]
  ).map((value) => ({
    value,
    label: MAINTENANCE_SCHEDULE_PRIORITY_LABELS[value]
  }));

  readonly quickTemplates = SCHEDULE_QUICK_TEMPLATES;

  readonly vehicleRows = computed(() => this.buildVehicleRows(this.vehicles(), this.schedules()));

  readonly drawerTitle = computed(() =>
    this.editingScheduleId() ? 'Edit Service Schedule' : 'Schedule Service'
  );

  readonly submitLabel = computed(() =>
    this.editingScheduleId() ? 'Save Changes' : 'Schedule'
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      schedules: this.scheduleService.getAll().pipe(catchError(() => of([]))),
      vehicles: this.vehicleService.getAll(1, 500).pipe(catchError(() => of({ items: [] })))
    }).subscribe({
      next: ({ schedules, vehicles }) => {
        this.schedules.set(schedules);
        this.vehicles.set(vehicles.items);
        this.vehicleOptions.set(
          vehicles.items.map((vehicle) => ({
            value: String(vehicle.id),
            label: `${vehicle.name} (${vehicle.registrationNumber})`
          }))
        );
        this.loading.set(false);
        this.openFromQueryParam();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load service schedules.', 'Close', { duration: 3000 });
      }
    });
  }

  openDrawer(): void {
    this.resetDrawerState();
    this.drawerOpen.set(true);
  }

  openDrawerForVehicle(vehicle: VehicleScheduleRow): void {
    const match = this.findVehicle(vehicle.vehicleId);
    if (!match) {
      this.snackBar.open('This vehicle is no longer available. Refresh the page and try again.', 'Close', { duration: 4000 });
      return;
    }
    this.resetDrawerState();
    this.lockedVehicle.set(match);
    this.patchVehicleId(match.id);
    this.drawerOpen.set(true);
  }

  openEditDrawer(schedule: MaintenanceSchedule): void {
    const vehicle = this.findVehicle(schedule.vehicleId);
    if (!vehicle) {
      this.snackBar.open('The vehicle for this schedule could not be found. Refresh and try again.', 'Close', { duration: 4000 });
      return;
    }

    this.resetDrawerState();
    this.editingScheduleId.set(schedule.id);
    this.lockedVehicle.set(vehicle);
    this.form.reset({
      vehicleId: String(schedule.vehicleId),
      serviceType: this.resolveServiceTypeOption(schedule.serviceType),
      customServiceType: this.resolveServiceTypeOption(schedule.serviceType) ? '' : schedule.serviceType,
      intervalType: schedule.intervalType,
      intervalValue: Number(schedule.intervalValue),
      lastServiceMileage: schedule.lastServiceMileage ?? null,
      priority: schedule.priority
    });
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.resetDrawerState();
  }

  applyTemplate(template: ScheduleQuickTemplate): void {
    this.form.patchValue({
      serviceType: template.serviceType,
      intervalType: 'mileage',
      intervalValue: template.intervalValue
    });
  }

  fieldError(label: string, controlName: keyof typeof this.form.controls): string | undefined {
    const control = this.form.get(controlName);
    if (!control || !this.shouldShowError(control)) {
      return undefined;
    }
    if (control.hasError('required') && this.isEmptyValue(control.value)) {
      return `${label} is required.`;
    }
    if (control.hasError('min')) {
      return `${label} must be greater than zero.`;
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
    const vehicleId = this.resolveVehicleId(value.vehicleId);
    if (!vehicleId || !this.findVehicle(vehicleId)) {
      this.snackBar.open('Please select a valid vehicle before scheduling.', 'Close', { duration: 3500 });
      return;
    }

    const serviceType = (value.customServiceType?.trim() || value.serviceType).trim();
    if (!serviceType) {
      this.snackBar.open('Service type is required.', 'Close', { duration: 3000 });
      return;
    }

    const payload = {
      serviceType,
      intervalType: value.intervalType,
      intervalValue: Number(value.intervalValue),
      lastServiceMileage: value.lastServiceMileage != null ? Number(value.lastServiceMileage) : null,
      priority: value.priority
    };

    this.submitting.set(true);
    const editingId = this.editingScheduleId();
    const request$ = editingId
      ? this.scheduleService.update(editingId, payload)
      : this.scheduleService.create({ vehicleId, ...payload });

    request$.subscribe({
      next: (saved) => {
        this.schedules.update((rows) => {
          if (editingId) {
            return rows.map((row) => (row.id === editingId ? saved : row));
          }
          return [saved, ...rows];
        });
        this.submitting.set(false);
        this.closeDrawer();
        this.snackBar.open(
          editingId ? 'Service schedule updated.' : 'Service scheduled successfully.',
          'Close',
          { duration: 2500 }
        );
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.snackBar.open(this.extractError(err), 'Close', { duration: 4500 });
      }
    });
  }

  priorityClass(priority: MaintenanceSchedulePriority): string {
    if (priority === 'high') return 'priority-high';
    if (priority === 'medium') return 'priority-medium';
    return 'priority-low';
  }

  private openFromQueryParam(): void {
    const raw = this.route.snapshot.queryParamMap.get('vehicleId');
    if (!raw) {
      return;
    }
    const vehicleId = Number(raw);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return;
    }
    const vehicle = this.findVehicle(vehicleId);
    if (!vehicle) {
      this.snackBar.open('The selected vehicle could not be found.', 'Close', { duration: 3500 });
      return;
    }
    this.openDrawerForVehicle({
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehicleRegistration: vehicle.registrationNumber,
      currentMileage: vehicle.currentMileage,
      schedules: []
    });
  }

  private resetDrawerState(): void {
    this.submitAttempted.set(false);
    this.editingScheduleId.set(null);
    this.lockedVehicle.set(null);
    this.form.reset({
      vehicleId: '',
      serviceType: '',
      customServiceType: '',
      intervalType: 'mileage',
      intervalValue: 5000,
      lastServiceMileage: null,
      priority: 'medium'
    });
  }

  private patchVehicleId(vehicleId: number): void {
    this.form.patchValue({ vehicleId: String(vehicleId) });
  }

  private resolveVehicleId(raw: string): number | null {
    const locked = this.lockedVehicle();
    if (locked) {
      return locked.id;
    }
    const vehicleId = Number(raw);
    return Number.isInteger(vehicleId) && vehicleId > 0 ? vehicleId : null;
  }

  private findVehicle(vehicleId: number): VehicleListItem | undefined {
    return this.vehicles().find((vehicle) => vehicle.id === vehicleId);
  }

  private resolveServiceTypeOption(serviceType: string): string {
    return MAINTENANCE_SERVICE_TYPES.includes(serviceType as typeof MAINTENANCE_SERVICE_TYPES[number])
      ? serviceType
      : '';
  }

  private buildVehicleRows(vehicles: VehicleListItem[], schedules: MaintenanceSchedule[]): VehicleScheduleRow[] {
    const schedulesByVehicle = new Map<number, MaintenanceSchedule[]>();
    for (const schedule of schedules) {
      const existing = schedulesByVehicle.get(schedule.vehicleId) ?? [];
      existing.push(schedule);
      schedulesByVehicle.set(schedule.vehicleId, existing);
    }

    return vehicles.map((vehicle) => {
      const vehicleSchedules = schedulesByVehicle.get(vehicle.id) ?? [];
      const primary = vehicleSchedules[0];
      return {
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        vehicleRegistration: vehicle.registrationNumber,
        currentMileage: vehicle.currentMileage,
        schedules: vehicleSchedules,
        nextServiceMileage: primary?.nextServiceMileage ?? null,
        primaryServiceType: primary?.serviceType ?? null
      };
    });
  }

  private shouldShowError(control: AbstractControl): boolean {
    return control.touched || control.dirty || this.submitAttempted();
  }

  private isEmptyValue(value: unknown): boolean {
    return value == null || value === '';
  }

  private extractError(err: HttpErrorResponse): string {
    const body = err?.error as { message?: string; errors?: Record<string, string[]> } | string | null;
    if (body && typeof body === 'object') {
      if (body.message) {
        if (/vehicle with key/i.test(body.message)) {
          return 'The selected vehicle could not be found. Choose another vehicle and try again.';
        }
        return body.message;
      }
      if (body.errors) {
        const flat = Object.values(body.errors).flat();
        if (flat.length) return String(flat[0]);
      }
    }
    return `Failed to schedule service (${err?.status || 'network'}).`;
  }
}
