import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe, NgClass, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, forkJoin, of } from 'rxjs';
import { VehicleService } from '../../../../core/services/vehicle.service';
import { UiButtonComponent } from '../../../../shared/components/ui/button/ui-button.component';
import { UiDrawerComponent } from '../../../../shared/components/ui/drawer/ui-drawer.component';
import { UiInputComponent } from '../../../../shared/components/ui/input/ui-input.component';
import { UiSelectComponent } from '../../../../shared/components/ui/select/ui-select.component';
import { UiSelectOption } from '../../../../shared/components/ui/types/ui.types';
import { FleetUiModule } from '../../../../shared/fleet-ui/fleet-ui.module';
import { SharedModule } from '../../../../shared/shared.module';
import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_SERVICE_TYPES,
  WORK_ORDER_STATUS_LABELS,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus
} from '../models/work-order.model';
import { WorkOrderService } from '../services/work-order.service';

type StatusFilter = WorkOrderStatus | 'all';

@Component({
  selector: 'app-maintenance-work-orders',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    CurrencyPipe,
    DecimalPipe,
    TitleCasePipe,
    NgClass,
    MatIconModule,
    SharedModule,
    FleetUiModule,
    UiButtonComponent,
    UiDrawerComponent,
    UiInputComponent,
    UiSelectComponent
  ],
  templateUrl: './maintenance-work-orders.component.html',
  styleUrls: ['./maintenance-work-orders.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaintenanceWorkOrdersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly workOrderService = inject(WorkOrderService);
  private readonly vehicleService = inject(VehicleService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly submitting = signal(false);
  readonly approving = signal(false);
  readonly drawerOpen = signal(false);
  readonly createMode = signal(false);
  readonly workOrders = signal<WorkOrder[]>([]);
  readonly selectedOrder = signal<WorkOrder | null>(null);
  readonly vehicleOptions = signal<UiSelectOption[]>([]);
  readonly statusFilter = signal<StatusFilter>('all');
  readonly vehicleFilter = signal('');
  readonly priorityFilter = signal<WorkOrderPriority | ''>('');

  readonly form = this.fb.nonNullable.group({
    vehicleId: ['', Validators.required],
    serviceType: ['', Validators.required],
    workshopName: [''],
    priority: ['medium' as WorkOrderPriority, Validators.required],
    estimatedCost: [0, [Validators.required, Validators.min(0)]],
    actualCost: [null as number | null, [Validators.min(0)]],
    startDate: [''],
    description: ['']
  });

  readonly serviceTypeOptions: UiSelectOption[] = WORK_ORDER_SERVICE_TYPES.map((value) => ({
    value,
    label: value
  }));

  readonly priorityOptions: UiSelectOption<WorkOrderPriority>[] = (
    Object.keys(WORK_ORDER_PRIORITY_LABELS) as WorkOrderPriority[]
  ).map((value) => ({ value, label: WORK_ORDER_PRIORITY_LABELS[value] }));

  readonly priorityFilterOptions: UiSelectOption<WorkOrderPriority | ''>[] = [
    { value: '', label: 'All priorities' },
    ...(Object.keys(WORK_ORDER_PRIORITY_LABELS) as WorkOrderPriority[]).map((value) => ({
      value,
      label: WORK_ORDER_PRIORITY_LABELS[value]
    }))
  ];

  readonly statusFilterOptions: UiSelectOption<StatusFilter>[] = [
    { value: 'all', label: 'All statuses' },
    ...(['open', 'approved', 'in_progress', 'completed', 'cancelled'] as WorkOrderStatus[]).map((value) => ({
      value,
      label: WORK_ORDER_STATUS_LABELS[value]
    }))
  ];

  readonly filteredOrders = computed(() => {
    let rows = this.workOrders();
    const status = this.statusFilter();
    const vehicle = this.vehicleFilter().trim().toLowerCase();
    const priority = this.priorityFilter();

    if (status !== 'all') {
      rows = rows.filter((row) => row.status === status);
    }
    if (priority) {
      rows = rows.filter((row) => row.priority === priority);
    }
    if (vehicle) {
      rows = rows.filter((row) =>
        `${row.vehicleName ?? ''} ${row.vehicleRegistration ?? ''}`.toLowerCase().includes(vehicle)
      );
    }
    return rows;
  });

  readonly openCount = computed(() => this.countByStatus('open'));
  readonly inProgressCount = computed(() => this.countByStatus('in_progress'));
  readonly completedCount = computed(() => this.countByStatus('completed'));
  readonly cancelledCount = computed(() => this.countByStatus('cancelled'));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      orders: this.workOrderService.getAll().pipe(catchError(() => of([]))),
      vehicles: this.vehicleService.getAll(1, 500).pipe(catchError(() => of({ items: [] })))
    }).subscribe({
      next: ({ orders, vehicles }) => {
        this.workOrders.set(orders);
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
        this.snackBar.open('Failed to load work orders.', 'Close', { duration: 3000 });
      }
    });
  }

  openCreateDrawer(): void {
    this.createMode.set(true);
    this.selectedOrder.set(null);
    this.form.reset({
      vehicleId: '',
      serviceType: '',
      workshopName: '',
      priority: 'medium',
      estimatedCost: 0,
      actualCost: null,
      startDate: '',
      description: ''
    });
    this.drawerOpen.set(true);
  }

  openDetail(order: WorkOrder): void {
    this.createMode.set(false);
    this.selectedOrder.set(order);
    this.drawerOpen.set(true);
    this.detailLoading.set(true);

    this.workOrderService.getById(order.id).subscribe({
      next: (detail) => {
        if (detail) {
          this.selectedOrder.set(detail);
          this.workOrders.update((rows) => rows.map((row) => (row.id === detail.id ? detail : row)));
        }
        this.detailLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.detailLoading.set(false);
        this.snackBar.open(this.extractError(err, 'Failed to load work order details.'), 'Close', { duration: 4500 });
      }
    });
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.createMode.set(false);
    this.selectedOrder.set(null);
    this.detailLoading.set(false);
  }

  resetFilters(): void {
    this.statusFilter.set('all');
    this.vehicleFilter.set('');
    this.priorityFilter.set('');
  }

  submitCreate(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const vehicleId = Number(value.vehicleId);
    if (!vehicleId || !this.vehicleOptions().some((option) => option.value === String(vehicleId))) {
      this.snackBar.open('Please select a valid vehicle.', 'Close', { duration: 3000 });
      return;
    }

    this.submitting.set(true);
    this.workOrderService.create({
      vehicleId,
      serviceType: value.serviceType,
      workshopName: value.workshopName?.trim() || null,
      priority: value.priority,
      estimatedCost: Number(value.estimatedCost),
      actualCost: value.actualCost != null ? Number(value.actualCost) : null,
      startDate: value.startDate || null,
      description: value.description?.trim() || null
    }).subscribe({
      next: (created) => {
        this.workOrders.update((rows) => [created, ...rows]);
        this.submitting.set(false);
        this.closeDrawer();
        this.snackBar.open('Work order created.', 'Close', { duration: 2500 });
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.snackBar.open(this.extractError(err, 'Failed to create work order.'), 'Close', { duration: 4500 });
      }
    });
  }

  approve(order: WorkOrder): void {
    if (order.status !== 'open' && order.status !== 'approved') {
      this.snackBar.open('Only open work orders can be approved.', 'Close', { duration: 3000 });
      return;
    }

    if (!this.drawerOpen()) {
      this.createMode.set(false);
      this.selectedOrder.set(order);
      this.drawerOpen.set(true);
    }

    this.approving.set(true);
    this.workOrderService.approve(order.id).subscribe({
      next: (updated) => {
        if (updated) {
          this.workOrders.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
          this.selectedOrder.set(updated);
        } else {
          this.workOrders.update((rows) =>
            rows.map((row) => (row.id === order.id ? { ...row, status: 'approved' as const } : row))
          );
          this.selectedOrder.update((current) =>
            current?.id === order.id ? { ...current, status: 'approved' } : current
          );
        }
        this.approving.set(false);
        this.snackBar.open('Work order approved.', 'Close', { duration: 2500 });
      },
      error: (err: HttpErrorResponse) => {
        this.approving.set(false);
        this.snackBar.open(this.extractError(err, 'Failed to approve work order.'), 'Close', { duration: 4500 });
      }
    });
  }

  statusLabel(status: WorkOrderStatus): string {
    return WORK_ORDER_STATUS_LABELS[status];
  }

  canApprove(order: WorkOrder | null): boolean {
    return !!order && order.status === 'open';
  }

  displayCost(order: WorkOrder): number {
    return order.actualCost ?? order.estimatedCost ?? 0;
  }

  private countByStatus(status: WorkOrderStatus): number {
    return this.workOrders().filter((row) => row.status === status).length;
  }

  private extractError(err: HttpErrorResponse, fallback: string): string {
    const body = err?.error as { message?: string; errors?: string[] } | string | null;
    if (body && typeof body === 'object') {
      if (body.message) {
        return body.message;
      }
      if (body.errors?.length) {
        return body.errors.join('; ');
      }
    }
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    return fallback;
  }
}
