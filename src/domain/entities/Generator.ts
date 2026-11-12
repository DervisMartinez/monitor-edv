export type FuelType = 'diesel' | 'gasolina' | 'gas';
export type GeneratorStatus = 'standby' | 'running' | 'maintenance' | 'offline';

export type GeneratorComponentType = 
  | 'oil'                 // Cambio de Aceite de Motor
  | 'oil_filter'          // Filtro de Aceite
  | 'fuel_filter'         // Filtro de Combustible / Trampa de Agua
  | 'air_filter'          // Filtro de Aire
  | 'coolant'             // Refrigerante / Anticongelante
  | 'battery'             // Batería de Arranque (12V / 24V)
  | 'spark_plugs'         // Bujías (Plantas a Gas/Gasolina)
  | 'belts'               // Correas de Alternador / Ventilador
  | 'valves_calibration'  // Calibración de Válvulas e Inyectores
  | 'general_inspection'  // Inspección Preventiva General
  | 'other';              // Otro Servicio

export interface GeneratorService {
  id: string;
  generatorId: string;
  userId: string;
  userEmail?: string;
  serviceType: GeneratorComponentType;
  horometer: number;      // Horómetro al momento del servicio
  date: string;           // Fecha de realización
  performedBy?: string;   // Técnico u operador que lo realizó
  notes?: string;         // Observaciones técnicas
  createdAt?: string;

  // Compatibility fields
  type?: GeneratorComponentType;
  odometer?: number;
  costUSD?: number;
  isAgency?: boolean;
}

export interface HorometerRecord {
  id: string;
  generatorId: string;
  userId: string;
  userEmail?: string;
  hours: number;          // Horas actuales reportadas
  deltaHours: number;     // Horas acumuladas desde el registro anterior
  date: string;           // Timestamp del registro
  notes?: string;         // Notas de operación
  createdAt?: string;
}

export interface PowerOutage {
  id: string;
  generatorId: string;
  userId: string;
  userEmail?: string;
  startTime: string;      // Fecha y hora del inicio del corte eléctrico (ISO)
  endTime?: string | null;// Fecha y hora de restablecimiento (ISO o null si activo)
  durationMinutes?: number;// Minutos totales sin servicio eléctrico
  generatorStarted: boolean; // Si la planta arrancó durante el corte
  notes?: string;         // Observaciones (causa, zona, etc.)
  createdAt?: string;
}

export interface Company {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  createdAt?: string;
}

export interface Department {
  id: string;
  companyId?: string;
  name: string;
  imageUrl?: string;
  description?: string;
  createdAt?: string;
}

export interface Generator {
  id: string;
  name: string;           // Nombre identificativo
  brand: string;          // Marca
  model: string;          // Modelo
  capacityKva: number;    // Capacidad en kVA o kW
  fuelType: FuelType;     // Tipo de combustible
  currentHours: number;   // Horómetro actual en horas
  serviceIntervalHours: number; // Intervalo de mantenimiento (ej: 200 o 250 horas)
  lastServiceHours: number;     // Horómetro en el último servicio preventivo
  location?: string;      // Ubicación física
  serialNumber?: string;  // Número de serie
  imageUrl?: string;
  customImageUri?: string;// Imagen personalizada montada por el usuario
  catalogImageRes?: any;
  status: GeneratorStatus;
  userId?: string;
  companyId?: string;     // Organización por Empresa
  companyName?: string;
  departmentId?: string;  // Organización por Departamento
  departmentName?: string;
  createdAt?: string;

  // Compatibility aliases
  year?: number;
  plate?: string;
  currentOdometer?: number;
  isFromAgency?: boolean;
  vehicleType?: string;
}

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: 'superadmin' | 'operador' | 'tecnico';
  password?: string;
  assignedGeneratorId?: string;
  assignedGeneratorName?: string; // Planta principal
  assignedGeneratorIds?: string[]; // Múltiples plantas asignadas
  assignedGeneratorNames?: string[];
  departmentId?: string;
  departmentName?: string;
  companyId?: string;
  companyName?: string;
  lastActive?: string;
  createdAt?: string;
}

// Backward compatibility types for legacy components
export type ComponentType = GeneratorComponentType;
export type ServiceRecord = GeneratorService;
export type Moto = Generator;
