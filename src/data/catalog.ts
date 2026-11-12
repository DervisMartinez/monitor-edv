import { FuelType } from '../domain/entities/Generator';

export interface CatalogGenerator {
  id: string;
  brand: string;
  model: string;
  capacityKva: number;
  capacityKw: number;
  fuelType: FuelType;
  category: string;
  defaultIntervalHours: number;
  imageRes: any;
  description: string;
}

export type CatalogVehicle = CatalogGenerator;
export type CatalogMoto = CatalogGenerator;

export const GENERATOR_CATALOG: CatalogGenerator[] = [
  {
    id: 'blue-power-c125',
    brand: 'Blue Power Generation',
    model: 'C125',
    capacityKva: 125,
    capacityKw: 100,
    fuelType: 'diesel',
    category: 'Industrial Pesada',
    defaultIntervalHours: 200,
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png'),
    description: 'Generador diésel insonorizado de 125 kVA con motor Cummins / Perkins de alto rendimiento para servicio continuo y emergencia.',
  },
  {
    id: 'blue-power-c75',
    brand: 'Blue Power Generation',
    model: 'C75',
    capacityKva: 75,
    capacityKw: 60,
    fuelType: 'diesel',
    category: 'Comercial e Industrial',
    defaultIntervalHours: 200,
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C75 – BLUE POWER GENERATORS.png'),
    description: 'Planta eléctrica diésel de 75 kVA con cabina acústica para respaldo corporativo, comercial e industrial.',
  },
  {
    id: 'caterpillar-de110e2',
    brand: 'Caterpillar',
    model: 'DE110E2',
    capacityKva: 110,
    capacityKw: 88,
    fuelType: 'diesel',
    category: 'Industrial',
    defaultIntervalHours: 250,
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png'),
    description: 'Grupo electrógeno Cat C4.4 de 110 kVA a 1800 RPM con panel de control EMCP 4.1 y alta confiabilidad.',
  },
  {
    id: 'cummins-c150d5',
    brand: 'Cummins',
    model: 'C150D5',
    capacityKva: 150,
    capacityKw: 120,
    fuelType: 'diesel',
    category: 'Industrial Pesada',
    defaultIntervalHours: 250,
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png'),
    description: 'Planta de fuerza Cummins 6BTAA5.9-G2 de 150 kVA con alternador Stamford y transferencia automática.',
  },
  {
    id: 'generac-guardian-22kw',
    brand: 'Generac',
    model: 'Guardian 22kW',
    capacityKva: 27.5,
    capacityKw: 22,
    fuelType: 'gas',
    category: 'Residencial y Comercial',
    defaultIntervalHours: 200,
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C75 – BLUE POWER GENERATORS.png'),
    description: 'Generador estacionario a Gas Natural / LP con tecnología G-Force y monitoreo continuo Mobile Link.',
  },
  {
    id: 'perkins-1104a-44tg2',
    brand: 'Perkins',
    model: '1104A-44TG2',
    capacityKva: 60,
    capacityKw: 48,
    fuelType: 'diesel',
    category: 'Comercial',
    defaultIntervalHours: 200,
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C75 – BLUE POWER GENERATORS.png'),
    description: 'Motor Perkins 4 cilindros turboalimentado de 60 kVA con bajo consumo de combustible y mantenimiento simplificado.',
  },
  {
    id: 'kohler-30reozk',
    brand: 'Kohler',
    model: '30REOZK',
    capacityKva: 30,
    capacityKw: 24,
    fuelType: 'diesel',
    category: 'Comercial Ligera',
    defaultIntervalHours: 200,
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C75 – BLUE POWER GENERATORS.png'),
    description: 'Generador compacto Kohler de 30 kVA con regulador digital avanzado y arranque ultra rápido en cortes de energía.',
  },
];

// Compatibility exports
export const MOTO_CATALOG = GENERATOR_CATALOG;
export const CAR_CATALOG = GENERATOR_CATALOG;
export const VEHICLE_CATALOG = GENERATOR_CATALOG;
