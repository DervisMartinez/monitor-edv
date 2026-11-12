export interface GeneratorSpecs {
  engineBrand?: string;
  displacement?: string;
  powerKva?: string;
  powerKw?: string;
  voltage?: string;
  frequency?: string;
  rpm?: string;
  fuelType?: string;
  fuelCapacity?: string;
  fuelConsumption?: string;
  oilCapacity?: string;
  oilTypeRecommended?: string;
  coolantCapacity?: string;
  battery?: string;
  alternator?: string;
  controlPanel?: string;
  maintenanceIntervalOil?: string;
  maintenanceIntervalFilters?: string;
  dimensions?: string;
  weight?: string;
  soundLevel?: string;

  // Compatibility aliases
  timingBeltType?: string;
  chainType?: string;
  brakesFront?: string;
  frontTirePressure?: string;
  rearTirePressure?: string;
  hp?: string;
  transmission?: string;
}

export type MotoSpecs = GeneratorSpecs;
export type VehicleSpecs = GeneratorSpecs;

export const GENERATOR_SPECS_DB: Record<string, GeneratorSpecs> = {
  'blue power generation-c125': {
    engineBrand: 'Cummins 6BT5.9-G2 Turbocharged',
    displacement: '5.9 Litros - 6 Cilindros en Línea',
    powerKva: '125 kVA Standby (115 kVA Prime)',
    powerKw: '100 kW Standby (92 kW Prime)',
    voltage: '127/220V - 254/440V Trifásico',
    frequency: '60 Hz',
    rpm: '1800 RPM',
    fuelType: 'Diésel Automotriz / Industrial',
    fuelCapacity: '250 Litros (Autonomía aprox: 10-12 hrs a 75%)',
    fuelConsumption: '22.5 L/h al 75% de carga',
    oilCapacity: '16.4 Litros',
    oilTypeRecommended: '15W-40 API CK-4 / CJ-4 Heavy Duty Diesel',
    coolantCapacity: '24.5 Litros (Mezcla 50/50)',
    battery: '24V (2x 12V 100Ah en serie)',
    alternator: 'Stamford UCI274D Brushless con AVR',
    controlPanel: 'Deep Sea DSE6120 MKII con transferencia automática ATS',
    maintenanceIntervalOil: 'Cada 200 - 250 Horas de Operación',
    maintenanceIntervalFilters: 'Cada 250 Horas (Aceite, Combustible y Trampa)',
    soundLevel: '68 dB(A) a 7 metros en cabina acústica',
  },
  'blue power generation-c75': {
    engineBrand: 'Perkins / Cummins 4BTA3.9-G2',
    displacement: '3.9 Litros - 4 Cilindros Turbo',
    powerKva: '75 kVA Standby (68 kVA Prime)',
    powerKw: '60 kW Standby (54 kW Prime)',
    voltage: '127/220V Trifásico',
    frequency: '60 Hz',
    rpm: '1800 RPM',
    fuelType: 'Diésel',
    fuelCapacity: '180 Litros',
    fuelConsumption: '14.2 L/h al 75% de carga',
    oilCapacity: '11.0 Litros',
    oilTypeRecommended: '15W-40 Heavy Duty Diesel',
    coolantCapacity: '18.0 Litros',
    battery: '12V 100Ah libre de mantenimiento',
    alternator: 'Stamford Brushless clase H',
    controlPanel: 'ComAp InteliLite / DSE',
    maintenanceIntervalOil: 'Cada 200 Horas de Operación',
    maintenanceIntervalFilters: 'Cada 200 Horas',
    soundLevel: '65 dB(A) a 7 metros',
  },
  'caterpillar-de110e2': {
    engineBrand: 'Cat C4.4 Inline 4-Stroke',
    displacement: '4.4 Litros Turbo con Postenfriador',
    powerKva: '110 kVA',
    powerKw: '88 kW',
    voltage: '208V - 480V Ajustable',
    frequency: '60 Hz',
    rpm: '1800 RPM',
    fuelType: 'Diésel',
    fuelCapacity: '220 Litros',
    fuelConsumption: '19.8 L/h al 75%',
    oilCapacity: '14.0 Litros Cat DEO',
    oilTypeRecommended: 'Cat DEO 15W-40',
    coolantCapacity: '21.0 Litros Cat ELC',
    battery: '12V 120Ah',
    alternator: 'Cat R-Series',
    controlPanel: 'EMCP 4.1 Digital',
    maintenanceIntervalOil: 'Cada 250 Horas de Operación',
    maintenanceIntervalFilters: 'Cada 250 Horas',
  },
  'generac-guardian-22kw': {
    engineBrand: 'Generac G-Force 999cc V-Twin',
    displacement: '999 cc',
    powerKva: '27.5 kVA Gas LP / 24 kVA Gas Natural',
    powerKw: '22 kW Gas LP / 19.5 kW Gas Natural',
    voltage: '120/240V Monofásico',
    frequency: '60 Hz',
    rpm: '3600 RPM',
    fuelType: 'Gas Liquado de Petróleo (LP) o Gas Natural',
    fuelCapacity: 'Alimentación continua por tubería',
    oilCapacity: '1.9 Litros',
    oilTypeRecommended: '5W-30 Full Sintético',
    coolantCapacity: 'Refrigerado por aire forzado',
    battery: '12V Grupo 26R AGM',
    alternator: 'Generac con regulación digital',
    controlPanel: 'Evolution Digital Controller con Wi-Fi',
    maintenanceIntervalOil: 'Cada 200 Horas o Anual',
    maintenanceIntervalFilters: 'Cada 200 Horas',
  },
};

export const MOTO_SPECS_DB = GENERATOR_SPECS_DB;

export const getGeneratorSpecs = (brand?: string, model?: string): GeneratorSpecs | null => {
  if (!brand || !model) return null;
  const key = `${brand.trim().toLowerCase()}-${model.trim().toLowerCase()}`;
  if (GENERATOR_SPECS_DB[key]) return GENERATOR_SPECS_DB[key];
  
  const found = Object.keys(GENERATOR_SPECS_DB).find(k => k.includes(model.trim().toLowerCase()));
  if (found) return GENERATOR_SPECS_DB[found];
  
  return {
    engineBrand: `${brand} Industrial Engine`,
    powerKva: '100 kVA',
    powerKw: '80 kW',
    rpm: '1800 RPM',
    fuelType: 'Diésel Industrial',
    oilTypeRecommended: '15W-40 Heavy Duty Diesel',
    oilCapacity: '14.0 Litros',
    battery: '12V / 24V Heavy Duty',
    maintenanceIntervalOil: 'Cada 200 Horas',
    maintenanceIntervalFilters: 'Cada 200 Horas',
  };
};

export const getMotoSpecs = getGeneratorSpecs;
