import { GeneratorComponentType } from '../domain/entities/Generator';
export { GeneratorComponentType, GeneratorComponentType as ComponentType };

/**
 * Vida útil recomendada en HORAS de operación para componentes de planta eléctrica.
 * Basado en estándares de fabricantes (Caterpillar, Cummins, Perkins, Generac).
 */
export const GENERATOR_COMPONENT_LIFESPAN_HOURS: Record<string, number> = {
  oil: 200,                  // Aceite de Motor (cada 200 - 250 hrs de operación)
  oil_filter: 200,           // Filtro de Aceite
  fuel_filter: 250,          // Filtro de Combustible / Trampa de Agua
  air_filter: 300,           // Filtro de Aire
  coolant: 1000,             // Refrigerante / Anticongelante
  battery: 1000,             // Batería de Arranque
  spark_plugs: 300,          // Bujías (Plantas a gas/gasolina)
  belts: 500,                // Correas de ventilador / alternador
  valves_calibration: 500,   // Calibración de válvulas e inyectores
  general_inspection: 250,   // Inspección preventiva general
  other: 200,

  // Compatibility aliases
  tires_front: 500,
  tires_rear: 500,
  brakes_front: 500,
  brakes_rear: 500,
  chain: 500,
  timing_belt: 500,
  cabin_filter: 500,
  brake_fluid: 500,
  transmission_fluid: 500,
  shock_absorbers: 500,
  accessory_belt: 500,
  wiper_blades: 500,
  clutch: 500,
  fuel: 500,
};

export const COMPONENT_NAMES: Record<string, string> = {
  oil: 'Aceite de Motor (15W-40)',
  oil_filter: 'Filtro de Aceite',
  fuel_filter: 'Filtro de Combustible / Trampa de Agua',
  air_filter: 'Filtro de Aire',
  coolant: 'Refrigerante 50/50',
  battery: 'Batería de Arranque',
  spark_plugs: 'Bujías de Encendido',
  belts: 'Correas de Transmisión',
  valves_calibration: 'Calibración de Válvulas',
  general_inspection: 'Inspección General',
  other: 'Otro Mantenimiento',

  // Compatibility aliases
  tires_front: 'Inspección Mecánica Delantera',
  tires_rear: 'Inspección Mecánica Trasera',
  brakes_front: 'Sistema de Frenado',
  brakes_rear: 'Sistema de Frenado Secundario',
  chain: 'Transmisión',
  timing_belt: 'Correa de Distribución',
  cabin_filter: 'Filtro de Aire',
  brake_fluid: 'Líquido Hidráulico',
  transmission_fluid: 'Fluidos de Transmisión',
  shock_absorbers: 'Soportes Antivibratorios',
  accessory_belt: 'Correa de Accesorios',
  wiper_blades: 'Protección',
  clutch: 'Acople',
  fuel: 'Combustible',
};

export const COMPONENT_ICONS: Record<string, string> = {
  oil: 'opacity',
  oil_filter: 'filter-alt',
  fuel_filter: 'local-gas-station',
  air_filter: 'air',
  coolant: 'ac-unit',
  battery: 'battery-charging-full',
  spark_plugs: 'flash-on',
  belts: 'all-inclusive',
  valves_calibration: 'build',
  general_inspection: 'verified',
  other: 'handyman',
};

export const getVehicleComponents = (_isCar = false): GeneratorComponentType[] => [
  'oil',
  'oil_filter',
  'fuel_filter',
  'air_filter',
  'coolant',
  'battery',
  'belts',
  'general_inspection',
];

export const getComponentLifespan = (component: string, _isCar = false): number => {
  return GENERATOR_COMPONENT_LIFESPAN_HOURS[component] || 200;
};

export const calculateWearPercentage = (
  currentHours: number,
  lastServiceHours: number,
  intervalHours: number = 200,
  ..._rest: any[]
): number => {
  if (currentHours <= lastServiceHours) return 100;
  const hoursOperated = currentHours - lastServiceHours;
  const remaining = intervalHours - hoursOperated;
  if (remaining <= 0) return 0;
  return Math.min(100, Math.round((remaining / intervalHours) * 100));
};

export const getServiceStatus = (
  hoursRemaining: number
): { status: 'optimal' | 'warning' | 'critical'; label: string; color: string } => {
  if (hoursRemaining <= 0) {
    return { status: 'critical', label: 'SERVICIO VENCIDO', color: '#EF4444' };
  }
  if (hoursRemaining <= 25) {
    return { status: 'warning', label: 'SERVICIO PRÓXIMO', color: '#F59E0B' };
  }
  return { status: 'optimal', label: 'OPERATIVO ÓPTIMO', color: '#10B981' };
};
