export type VehicleType = 'moto' | 'car';

export type VehicleStatus = 'operativo' | 'mantenimiento' | 'parado';

export type VehicleComponentType = 
  | 'oil'
  | 'oil_filter'
  | 'air_filter'
  | 'fuel_filter'
  | 'spark_plugs'
  | 'timing_belt'
  | 'chain'
  | 'coolant'
  | 'brake_fluid'
  | 'transmission_fluid'
  | 'brakes_front'
  | 'brakes_rear'
  | 'tires_front'
  | 'tires_rear'
  | 'battery'
  | 'shock_absorbers'
  | 'accessory_belt'
  | 'wiper_blades'
  | 'clutch'
  | 'cabin_filter'
  | 'fuel'
  | 'other';

export interface Vehicle {
  id: string;
  name?: string;
  brand: string;
  model: string;
  year: number;
  plate?: string;
  vehicleType: VehicleType;
  category?: string;
  currentOdometer: number; // en km
  status: VehicleStatus;
  companyId?: string;
  companyName?: string;
  departmentId?: string;
  departmentName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  imageUrl?: string;
  customImageUri?: string;
  catalogImageRes?: any;
  catalogId?: string;
  notes?: string;
  isFromAgency?: boolean;
  createdAt?: string;
}

export interface VehicleServiceRecord {
  id: string;
  vehicleId: string;
  userId?: string;
  userEmail?: string;
  type: VehicleComponentType;
  date: string;
  odometer: number;
  costUSD?: number;
  notes?: string;
  performedBy?: string;
  isAgency?: boolean;
  createdAt?: string;
}

export interface VehicleOdometerRecord {
  id: string;
  vehicleId: string;
  userId?: string;
  userEmail?: string;
  odometer: number;
  deltaKm?: number;
  date: string;
  notes?: string;
  createdAt?: string;
}
