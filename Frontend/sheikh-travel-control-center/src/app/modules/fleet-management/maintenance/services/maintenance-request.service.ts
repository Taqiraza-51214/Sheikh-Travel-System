import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  CreateMaintenanceRequestDto,
  MaintenanceRequest,
  MaintenanceRequestStatus
} from '../models/maintenance-request.model';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceRequestService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/fleet/maintenance/requests`;

  private nextId = 9;
  private readonly localRequests: MaintenanceRequest[] = [...DEMO_REQUESTS];

  getAll(): Observable<MaintenanceRequest[]> {
    return this.http.get<ApiEnvelope<MaintenanceRequest[]> | MaintenanceRequest[]>(this.base).pipe(
      map(unwrap),
      catchError(() => of([...this.localRequests]))
    );
  }

  create(dto: CreateMaintenanceRequestDto, vehicleLabel: { name: string; registration: string }): Observable<MaintenanceRequest> {
    const payload = {
      vehicleId: dto.vehicleId,
      priority: dto.priority,
      category: dto.category,
      type: dto.type,
      description: dto.description.trim()
    };

    return this.http.post<ApiEnvelope<MaintenanceRequest> | MaintenanceRequest>(this.base, payload).pipe(
      map((res) => unwrap(res)),
      catchError(() => {
        const id = this.nextId++;
        const created: MaintenanceRequest = {
          id,
          requestNumber: `MR-${String(id).padStart(5, '0')}`,
          vehicleId: dto.vehicleId,
          vehicleName: vehicleLabel.name,
          vehicleRegistration: vehicleLabel.registration,
          priority: dto.priority,
          category: dto.category,
          type: dto.type,
          description: dto.description.trim(),
          status: 'open',
          createdAt: new Date().toISOString()
        };
        this.localRequests.unshift(created);
        return of(created);
      })
    );
  }

  countByStatus(status: MaintenanceRequestStatus | 'all', requests: MaintenanceRequest[]): number {
    if (status === 'all') {
      return requests.length;
    }
    return requests.filter((r) => r.status === status).length;
  }
}

function unwrap<T>(res: ApiEnvelope<T> | T): T {
  const env = res as ApiEnvelope<T>;
  return env && typeof env === 'object' && 'data' in env && env.data !== undefined
    ? (env.data as T)
    : (res as T);
}

const DEMO_REQUESTS: MaintenanceRequest[] = [
  {
    id: 8,
    requestNumber: 'MR-00008',
    vehicleId: 2,
    vehicleName: 'Suzuki Mehran',
    vehicleRegistration: 'LHR-111',
    priority: 'high',
    category: 'body_damage',
    type: 'breakdown',
    description: 'Front bumper damage after minor collision.',
    status: 'open',
    createdAt: '2026-06-23T08:00:00.000Z'
  }
];
