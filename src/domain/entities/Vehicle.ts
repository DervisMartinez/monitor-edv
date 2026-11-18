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

export type VehicleDocCategory = 'vehicle' | 'driver';

export type VehicleDocStatusType = 'valid' | 'expiring' | 'expired' | 'permanent';

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
  assignedUserEmail?: string;

  // Datos completos del piloto / conductor asignado (como en Garage moto-app)
  driverDni?: string;
  driverPhone?: string;
  driverBloodType?: string;
  driverLicenseGrade?: string;
  driverEmergencyContact?: string;
  driverEmergencyPhone?: string;
  driverCity?: string;

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
  liters?: number; // Para registros de gasolina / combustible (type === 'fuel')
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

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  userId?: string;
  driverName?: string;
  docCategory: VehicleDocCategory; // 'vehicle' (Papel del Vehículo) | 'driver' (Papel del Piloto)
  title: string;                   // Ej: 'Carnet de Circulación', 'Seguro / RCV', 'Título de Propiedad', 'Licencia de Conducir', 'Certificado Médico Vial'
  docNumber: string;               // Número de documento / Póliza / Serial
  issueDate?: string;              // Fecha de emisión (YYYY-MM-DD)
  expiryDate: string;              // Fecha de vencimiento (YYYY-MM-DD) o 'PERMANENTE'
  isPermanent?: boolean;
  imageUrl?: string;               // Foto / Escaneo / PDF del documento (Archivo local o URL)
  notes?: string;
  createdAt?: string;
}
