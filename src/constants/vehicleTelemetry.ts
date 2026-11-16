import { VehicleComponentType, VehicleType } from '../domain/entities/Vehicle';

/**
 * Vida útil recomendada en KILÓMETROS para componentes de Motocicletas.
 * Basado en manuales de servicio y estándares de taller (Bera, Empire Keeway, Honda, Yamaha).
 */
export const MOTO_COMPONENT_LIFESPAN_KM: Record<Exclude<VehicleComponentType, 'fuel' | 'other'>, number> = {
  oil: 3000,                  // Aceite de motor 4T (20W-50 / 15W-40)
  oil_filter: 3000,           // Filtro o malla de aceite
  air_filter: 12000,          // Filtro de aire
  fuel_filter: 15000,         // Filtro de gasolina
  spark_plugs: 15000,         // Bujías (NGK / Denso)
  chain: 20000,               // Cadena y kit de arrastre (piñón/corona)
  timing_belt: 40000,         // No aplica para la mayoría de motos, fallback
  coolant: 30000,             // Refrigerante (en motos enfriadas por líquido)
  brake_fluid: 25000,         // Líquido de frenos DOT 4
  transmission_fluid: 20000,  // Aceite de transmisión / caja
  brakes_front: 12000,        // Pastillas de freno delantero
  brakes_rear: 10000,         // Bandas o pastillas de freno trasero
  tires_front: 15000,         // Caucho delantero
  tires_rear: 12000,          // Caucho trasero (mayor desgaste por tracción)
  battery: 30000,             // Batería 12V 7Ah / 9Ah
  shock_absorbers: 40000,     // Amortiguadores / suspensión
  accessory_belt: 30000,      // Correa de accesorios
  wiper_blades: 15000,        // No aplica a moto estándar, fallback
  clutch: 50000,              // Discos de embrague / clutch
  cabin_filter: 15000,        // Fallback
};

/**
 * Vida útil recomendada en KILÓMETROS para componentes de Automóviles / Camionetas / Camiones.
 * Basado en especificaciones OEM y servicio automotriz (Chevrolet, Toyota, Ford).
 */
export const CAR_COMPONENT_LIFESPAN_KM: Record<Exclude<VehicleComponentType, 'fuel' | 'other'>, number> = {
  oil: 7500,                  // Aceite de motor sintético/semi (15W-40 / 10W-30)
  oil_filter: 7500,           // Filtro de aceite
  air_filter: 15000,          // Filtro de aire motor
  cabin_filter: 15000,        // Filtro de aire acondicionado / habitáculo
  fuel_filter: 30000,         // Filtro de gasolina / trampa de combustible
  spark_plugs: 30000,         // Bujías de encendido
  timing_belt: 45000,         // Correa de distribución / tiempo (crítica en motores 16V)
  coolant: 40000,             // Refrigerante anticongelante 50/50
  brake_fluid: 40000,         // Líquido de frenos DOT 3 / DOT 4
  transmission_fluid: 50000,  // Aceite de caja manual o automática
  brakes_front: 30000,        // Pastillas de freno delanteras
  brakes_rear: 45000,         // Bandas o pastillas traseras
  tires_front: 40000,         // Cauchos delanteros (rotación periódica)
  tires_rear: 40000,          // Cauchos traseros
  battery: 40000,             // Batería automotriz (12V 650-800 CCA)
  shock_absorbers: 60000,     // Amortiguadores y espirales
  accessory_belt: 40000,      // Correa única de alternador y dirección hidráulica
  wiper_blades: 20000,        // Plumillas limpiaparabrisas
  clutch: 80000,              // Kit de embrague (plato, disco y collarín)
  chain: 80000,               // Cadena de distribución metálica
};

export const VEHICLE_COMPONENT_NAMES: Record<VehicleComponentType, string> = {
  oil: 'Aceite de Motor',
  oil_filter: 'Filtro de Aceite',
  air_filter: 'Filtro de Aire',
  fuel_filter: 'Filtro de Combustible',
  spark_plugs: 'Bujías de Encendido',
  timing_belt: 'Correa de Distribución (Tiempo)',
  chain: 'Cadena / Kit de Arrastre',
  coolant: 'Refrigerante / Anticongelante',
  brake_fluid: 'Líquido de Frenos',
  transmission_fluid: 'Aceite de Transmisión / Caja',
  brakes_front: 'Frenos Delanteros',
  brakes_rear: 'Frenos Traseros',
  tires_front: 'Cauchos Delanteros',
  tires_rear: 'Cauchos Traseros',
  battery: 'Batería de Arranque',
  shock_absorbers: 'Amortiguadores / Suspensión',
  accessory_belt: 'Correa de Accesorios',
  wiper_blades: 'Plumillas Limpiaparabrisas',
  clutch: 'Embrague / Clutch',
  cabin_filter: 'Filtro de A/C (Cabina)',
  fuel: 'Recarga de Combustible',
  other: 'Otro Mantenimiento',
};

export const VEHICLE_COMPONENT_ICONS: Record<VehicleComponentType, string> = {
  oil: 'opacity',
  oil_filter: 'filter-alt',
  air_filter: 'air',
  fuel_filter: 'local-gas-station',
  spark_plugs: 'flash-on',
  timing_belt: 'settings-suggest',
  chain: 'link',
  coolant: 'ac-unit',
  brake_fluid: 'water-drop',
  transmission_fluid: 'swap-vert',
  brakes_front: 'disc-full',
  brakes_rear: 'circle',
  tires_front: 'album',
  tires_rear: 'album',
  battery: 'battery-charging-full',
  shock_absorbers: 'waves',
  accessory_belt: 'all-inclusive',
  wiper_blades: 'cleaning-services',
  clutch: 'tune',
  cabin_filter: 'hvac',
  fuel: 'local-gas-station',
  other: 'handyman',
};

export const getVehicleComponents = (isCar: boolean): VehicleComponentType[] => {
  if (isCar) {
    return [
      'oil',
      'oil_filter',
      'timing_belt',
      'air_filter',
      'fuel_filter',
      'spark_plugs',
      'brakes_front',
      'brakes_rear',
      'tires_front',
      'tires_rear',
      'battery',
      'coolant',
      'brake_fluid',
      'transmission_fluid',
      'accessory_belt',
      'shock_absorbers',
      'wiper_blades',
      'clutch',
      'cabin_filter',
      'other',
    ];
  }
  return [
    'oil',
    'oil_filter',
    'chain',
    'air_filter',
    'fuel_filter',
    'spark_plugs',
    'brakes_front',
    'brakes_rear',
    'tires_front',
    'tires_rear',
    'battery',
    'coolant',
    'brake_fluid',
    'shock_absorbers',
    'clutch',
    'other',
  ];
};

export const getVehicleComponentLifespan = (
  component: VehicleComponentType,
  isCar = false
): number => {
  if (component === 'fuel' || component === 'other') return 5000;
  if (isCar) {
    return CAR_COMPONENT_LIFESPAN_KM[component] || 30000;
  }
  return MOTO_COMPONENT_LIFESPAN_KM[component] || 15000;
};

export const calculateVehicleWearPercentage = (
  currentOdo: number,
  lastChangeOdo: number,
  component: VehicleComponentType,
  isCar = false,
  lifespanOverride?: number
): number => {
  const maxLife = lifespanOverride || getVehicleComponentLifespan(component, isCar);
  const distanceTraveled = currentOdo - lastChangeOdo;

  if (distanceTraveled <= 0) return 100;
  if (distanceTraveled >= maxLife) return 0;

  const percentLeft = ((maxLife - distanceTraveled) / maxLife) * 100;
  return Math.max(0, Math.min(100, Math.round(percentLeft)));
};

export const getVehicleServiceStatus = (
  percentRemaining: number
): { status: 'optimal' | 'warning' | 'critical'; label: string; color: string } => {
  if (percentRemaining <= 0) {
    return { status: 'critical', label: 'SERVICIO VENCIDO', color: '#EF4444' };
  }
  if (percentRemaining <= 15) {
    return { status: 'warning', label: 'SERVICIO PRÓXIMO', color: '#F59E0B' };
  }
  return { status: 'optimal', label: 'OPERATIVO ÓPTIMO', color: '#10B981' };
};
