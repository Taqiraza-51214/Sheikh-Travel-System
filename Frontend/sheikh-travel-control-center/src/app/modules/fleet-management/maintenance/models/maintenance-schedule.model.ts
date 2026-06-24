export type MaintenanceSchedulePriority = 'low' | 'medium' | 'high';

export type MaintenanceScheduleIntervalType = 'mileage' | 'date' | 'hours';

export interface MaintenanceSchedule {
  id: number;
  vehicleId: number;
  vehicleName?: string | null;
  vehicleRegistration?: string | null;
  currentMileage?: number | null;
  serviceType: string;
  intervalType: MaintenanceScheduleIntervalType;
  intervalValue: number;
  lastServiceMileage?: number | null;
  nextServiceMileage?: number | null;
  priority: MaintenanceSchedulePriority;
  isActive: boolean;
  createdAt: string;
}

export interface CreateMaintenanceScheduleDto {
  vehicleId: number;
  serviceType: string;
  intervalType: MaintenanceScheduleIntervalType;
  intervalValue: number;
  lastServiceMileage?: number | null;
  priority: MaintenanceSchedulePriority;
}

export interface UpdateMaintenanceScheduleDto {
  serviceType: string;
  intervalType: MaintenanceScheduleIntervalType;
  intervalValue: number;
  lastServiceMileage?: number | null;
  priority: MaintenanceSchedulePriority;
}

export interface VehicleScheduleRow {
  vehicleId: number;
  vehicleName: string;
  vehicleRegistration: string;
  currentMileage: number;
  schedules: MaintenanceSchedule[];
  nextServiceMileage?: number | null;
  primaryServiceType?: string | null;
}

export const MAINTENANCE_SCHEDULE_PRIORITY_LABELS: Record<MaintenanceSchedulePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

export const MAINTENANCE_SCHEDULE_INTERVAL_LABELS: Record<MaintenanceScheduleIntervalType, string> = {
  mileage: 'Mileage (km)',
  date: 'Date',
  hours: 'Engine Hours'
};

export const MAINTENANCE_SERVICE_TYPES = [
  'Oil Change',
  'AC Service',
  'Brake Check',
  'Tire Rotation',
  'Battery Check',
  'General Inspection'
] as const;

export interface ScheduleQuickTemplate {
  label: string;
  serviceType: string;
  intervalValue: number;
}

export const SCHEDULE_QUICK_TEMPLATES: ScheduleQuickTemplate[] = [
  { label: 'Oil Change (5,000 km)', serviceType: 'Oil Change', intervalValue: 5000 },
  { label: 'Brake Check (10,000 km)', serviceType: 'Brake Check', intervalValue: 10000 },
  { label: 'Tire Rotation (15,000 km)', serviceType: 'Tire Rotation', intervalValue: 15000 }
];
