import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  CreateMaintenanceScheduleDto,
  MaintenanceSchedule,
  UpdateMaintenanceScheduleDto
} from '../models/maintenance-schedule.model';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceScheduleService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/fleet/maintenance/schedules`;

  getAll(): Observable<MaintenanceSchedule[]> {
    return this.http.get<ApiEnvelope<MaintenanceSchedule[]> | MaintenanceSchedule[]>(this.base).pipe(
      map(unwrap)
    );
  }

  create(dto: CreateMaintenanceScheduleDto): Observable<MaintenanceSchedule> {
    return this.http.post<ApiEnvelope<MaintenanceSchedule> | MaintenanceSchedule>(this.base, dto).pipe(
      map(unwrap)
    );
  }

  update(id: number, dto: UpdateMaintenanceScheduleDto): Observable<MaintenanceSchedule> {
    return this.http.put<ApiEnvelope<MaintenanceSchedule> | MaintenanceSchedule>(`${this.base}/${id}`, dto).pipe(
      map(unwrap)
    );
  }
}

function unwrap<T>(res: ApiEnvelope<T> | T): T {
  const env = res as ApiEnvelope<T>;
  return env && typeof env === 'object' && 'data' in env && env.data !== undefined
    ? (env.data as T)
    : (res as T);
}
