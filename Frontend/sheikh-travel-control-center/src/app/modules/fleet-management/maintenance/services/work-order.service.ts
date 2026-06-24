import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { CreateWorkOrderDto, WorkOrder } from '../models/work-order.model';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/workorders`;

  getAll(): Observable<WorkOrder[]> {
    return this.http.get<ApiEnvelope<WorkOrder[]> | WorkOrder[]>(this.base).pipe(map(unwrap));
  }

  getById(id: number): Observable<WorkOrder> {
    return this.http.get<ApiEnvelope<WorkOrder> | WorkOrder>(`${this.base}/${id}`).pipe(map(unwrap));
  }

  create(dto: CreateWorkOrderDto): Observable<WorkOrder> {
    return this.http.post<ApiEnvelope<WorkOrder> | WorkOrder>(this.base, dto).pipe(map(unwrap));
  }

  approve(id: number): Observable<WorkOrder> {
    return this.http.put<ApiEnvelope<WorkOrder> | WorkOrder>(`${this.base}/${id}/approve`, {}).pipe(map(unwrap));
  }

  updateStatus(id: number, status: string): Observable<WorkOrder> {
    return this.http
      .put<ApiEnvelope<WorkOrder> | WorkOrder>(`${this.base}/${id}/status`, { status })
      .pipe(map(unwrap));
  }
}

function unwrap<T>(res: ApiEnvelope<T> | T): T {
  const env = res as ApiEnvelope<T>;
  return env && typeof env === 'object' && 'data' in env && env.data !== undefined
    ? (env.data as T)
    : (res as T);
}
