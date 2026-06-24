export type WorkOrderStatus = 'open' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export type WorkOrderPriority = 'low' | 'medium' | 'high';

export interface WorkOrder {
  id: number;
  orderNumber: string;
  vehicleId: number;
  vehicleName?: string | null;
  vehicleRegistration?: string | null;
  serviceType: string;
  workshopName?: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  estimatedCost: number;
  actualCost?: number | null;
  startDate?: string | null;
  completedDate?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface CreateWorkOrderDto {
  vehicleId: number;
  serviceType: string;
  workshopName?: string | null;
  priority: WorkOrderPriority;
  estimatedCost: number;
  actualCost?: number | null;
  startDate?: string | null;
  description?: string | null;
}

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: 'Open',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

export const WORK_ORDER_SERVICE_TYPES = [
  'Oil Change',
  'Tire Rotation',
  'Brake Check',
  'AC Service',
  'Battery Check',
  'General Inspection'
] as const;
