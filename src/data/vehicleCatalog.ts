import { VehicleType } from '../domain/entities/Vehicle';

export interface CatalogVehicleItem {
  id: string;
  brand: string;
  model: string;
  vehicleType: VehicleType;
  category: string;
  year?: number;
  imageRes?: any;
  defaultOdometer?: number;
  description: string;
}

export const MOTO_CATALOG: CatalogVehicleItem[] = [
  {
    id: 'empire-keeway-new-horse-150',
    brand: 'EMPIRE KEEWAY',
    model: 'New Horse 150',
    vehicleType: 'moto',
    category: 'Mensajería / Trabajo',
    year: 2024,
    imageRes: require('../../assets/images/motos/EMPIRE KEEWAY/New Horse 150.png'),
    description: 'Motocicleta 150cc de alta eficiencia para mensajería, supervisión de plantas y rutas de operaciones.',
  },
  {
    id: 'empire-keeway-horse-150rl',
    brand: 'EMPIRE KEEWAY',
    model: 'Horse 150RL',
    vehicleType: 'moto',
    category: 'Mensajería / Trabajo',
    year: 2024,
    imageRes: require('../../assets/images/motos/EMPIRE KEEWAY/Horse 150RL.png'),
    description: 'Motocicleta utilitaria 150cc con balanceador antivibración para jornadas extendidas.',
  },
  {
    id: 'empire-keeway-xpress-150',
    brand: 'EMPIRE KEEWAY',
    model: 'Xpress 150',
    vehicleType: 'moto',
    category: 'Carga Ligera / Mensajería',
    year: 2024,
    imageRes: require('../../assets/images/motos/EMPIRE KEEWAY/Xpress 150.png'),
    description: 'Motocicleta para entrega rápida de repuestos livianos e inspecciones técnicas.',
  },
  {
    id: 'bera-sbr-150cc',
    brand: 'BERA',
    model: 'SBR 150cc',
    vehicleType: 'moto',
    category: 'Urbano / Transporte',
    year: 2024,
    imageRes: require('../../assets/images/motos/BERA/SBR 150cc.png'),
    description: 'Moto urbana de gran maniobrabilidad para traslado ágil entre sedes de la empresa.',
  },
  {
    id: 'bera-kavak-150cc',
    brand: 'BERA',
    model: 'Kavak 150cc',
    vehicleType: 'moto',
    category: 'Urbano / Trabajo',
    year: 2024,
    imageRes: require('../../assets/images/motos/BERA/Kavak 150cc.png'),
    description: 'Motocicleta de trabajo resistente con bajo consumo de combustible.',
  },
  {
    id: 'bera-super-dt-250cc',
    brand: 'BERA',
    model: 'Super DT 250cc',
    vehicleType: 'moto',
    category: 'Enduro / Terreno Mixto',
    year: 2024,
    imageRes: require('../../assets/images/motos/BERA/Super DT 250cc.png'),
    description: 'Motocicleta todoterreno 250cc para acceso a silos, fincas y plantas en áreas rústicas.',
  },
  {
    id: 'escuda-em-200',
    brand: 'ESCUDA',
    model: 'EM 200',
    vehicleType: 'moto',
    category: 'Trabajo Pesado 200cc',
    year: 2024,
    imageRes: require('../../assets/images/motos/ESCUDA/EM 200.png'),
    description: 'Moto de 200cc con chasis reforzado para trabajo técnico de mantenimiento.',
  },
];

export const CAR_CATALOG: CatalogVehicleItem[] = [
  {
    id: 'toyota-samurai-fj60-1982',
    brand: 'TOYOTA',
    model: 'Samurai FJ60',
    vehicleType: 'car',
    category: 'SUV / 4x4 Todo Terreno',
    year: 1982,
    imageRes: require('../../assets/images/autos/TOYOTA/1982/SAMURAI FJ60 1982.png'),
    description: 'Vehículo rústico 4x4 con motor Toyota 2F de servicio pesado para transporte técnico a plantas remotas.',
  },
  {
    id: 'chevrolet-optra-advance-2011',
    brand: 'CHEVROLET',
    model: 'Optra Advance',
    vehicleType: 'car',
    category: 'Sedán Corporativo',
    year: 2011,
    imageRes: require('../../assets/images/autos/CHEVROLET/SEDAN/OPTRA 2011.png'),
    description: 'Sedán corporativo de 4 puertas para visitas ejecutivas, auditorías y enlace inter-empresarial.',
  },
  {
    id: 'toyota-hilux-4x4',
    brand: 'TOYOTA',
    model: 'Hilux Doble Cabina 4x4',
    vehicleType: 'car',
    category: 'Pick-Up / Operaciones',
    year: 2023,
    description: 'Camioneta doble cabina de apoyo logístico para traslado de herramientas, repuestos pesados y cuadrillas técnicas.',
  },
  {
    id: 'ford-f350-super-duty',
    brand: 'FORD',
    model: 'F-350 Super Duty',
    vehicleType: 'car',
    category: 'Camión de Carga / Cuadrilla',
    year: 2020,
    description: 'Camión de carga y plataforma para transporte de generadores móviles, tambores de lubricante y repuestos mayores.',
  },
];

export const ALL_VEHICLE_CATALOG: CatalogVehicleItem[] = [
  ...MOTO_CATALOG,
  ...CAR_CATALOG,
];
