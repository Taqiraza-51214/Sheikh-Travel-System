export type MaintenanceRequestPriority = 'low' | 'medium' | 'high';

export type MaintenanceRequestStatus = 'open' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export type MaintenanceRequestCategory =
  | 'inspection'
  | 'body_damage'
  | 'engine'
  | 'tires'
  | 'electrical'
  | 'other';

export type MaintenanceRequestType = 'corrective' | 'preventive' | 'breakdown' | 'emergency';

export interface MaintenanceRequest {
  id: number;
  requestNumber: string;
  vehicleId: number;
  vehicleName: string;
  vehicleRegistration: string;
  priority: MaintenanceRequestPriority;
  category: MaintenanceRequestCategory;
  type: MaintenanceRequestType;
  description: string;
  status: MaintenanceRequestStatus;
  createdAt: string;
}

export interface CreateMaintenanceRequestDto {
  vehicleId: number;
  priority: MaintenanceRequestPriority;
  category: MaintenanceRequestCategory;
  type: MaintenanceRequestType;
  description: string;
}

export const MAINTENANCE_REQUEST_PRIORITY_LABELS: Record<MaintenanceRequestPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

export const MAINTENANCE_REQUEST_CATEGORY_LABELS: Record<MaintenanceRequestCategory, string> = {
  inspection: 'Inspection',
  body_damage: 'Body Damage',
  engine: 'Engine',
  tires: 'Tires',
  electrical: 'Electrical',
  other: 'Other'
};

export const MAINTENANCE_REQUEST_TYPE_LABELS: Record<MaintenanceRequestType, string> = {
  corrective: 'Corrective',
  preventive: 'Preventive',
  breakdown: 'Breakdown',
  emergency: 'Emergency'
};

export const MAINTENANCE_REQUEST_STATUS_LABELS: Record<MaintenanceRequestStatus, string> = {
  open: 'Open',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};
