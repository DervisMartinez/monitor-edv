export interface GeneratorSpecs {
  engineBrand?: string;
  engineType?: string;
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
  maintenanceIntervalTimingBelt?: string;
  dimensions?: string;
  weight?: string;
  soundLevel?: string;

  // Vehicle OEM fields (from Garage moto-app)
  hp?: string;
  torque?: string;
  transmission?: string;
  frontTireSize?: string;
  frontTirePressure?: string;
  rearTireSize?: string;
  rearTirePressure?: string;
  chainType?: string;
  timingBeltType?: string;
  sparkPlug?: string;
  brakesFront?: string;
  brakesRear?: string;
  cooling?: string;
  suspensionFront?: string;
  suspensionRear?: string;
  trunkCapacity?: string;
  equipment?: string;
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
    fuelType: 'Gas Licuado de Petróleo (LP) o Gas Natural',
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

export const VEHICLE_SPECS_DB: Record<string, VehicleSpecs> = {
  'empire keeway-new horse 150': {
    engineType: 'Monocilíndrico 4T, OHV con árbol de levas inferior',
    displacement: '149 cc',
    hp: '11.5 HP @ 8500 RPM',
    torque: '10.0 Nm @ 7500 RPM',
    transmission: '5 Velocidades multidisco húmedo',
    weight: '120 kg',
    fuelCapacity: '12 Litros (Reserva: 2.0L)',
    oilCapacity: '1.0 Litro',
    oilTypeRecommended: '20W-50 4T JASO MA2',
    frontTireSize: '2.75 - 18',
    frontTirePressure: '28 PSI',
    rearTireSize: '90/90 - 18',
    rearTirePressure: '32 PSI',
    chainType: 'Paso 428H x 118 eslabones',
    sparkPlug: 'NGK D8EA / Resistencia 0.7mm',
    battery: '12V - 7Ah libre de mantenimiento',
    brakesFront: 'Disco hidráulico 240mm',
    brakesRear: 'Tambor mecánico con zapatas',
    cooling: 'Enfriado por aire natural',
    maintenanceIntervalOil: 'Cada 2,000 - 3,000 km',
  },
  'empire keeway-horse 150rl': {
    engineType: 'Monocilíndrico 4T con balanceador anti-vibración',
    displacement: '149.2 cc',
    hp: '11.8 HP @ 8200 RPM',
    torque: '10.5 Nm @ 7000 RPM',
    transmission: '5 Velocidades',
    weight: '122 kg',
    fuelCapacity: '13 Litros',
    oilCapacity: '1.0 Litro',
    oilTypeRecommended: '20W-50 o 15W-40 JASO MA2',
    frontTireSize: '2.75 - 18',
    frontTirePressure: '28 PSI',
    rearTireSize: '3.00 - 18',
    rearTirePressure: '32 PSI',
    chainType: '428H Reforzada',
    sparkPlug: 'NGK D8EA',
    battery: '12V 7Ah',
    brakesFront: 'Disco hidráulico',
    brakesRear: 'Tambor',
    cooling: 'Aire',
    maintenanceIntervalOil: 'Cada 2,500 km',
  },
  'empire keeway-xpress 150': {
    engineType: 'Monocilíndrico 4T, varillero económico',
    displacement: '149 cc',
    hp: '11.0 HP @ 8000 RPM',
    torque: '9.8 Nm @ 7000 RPM',
    transmission: '5 Velocidades',
    weight: '112 kg',
    fuelCapacity: '10 Litros',
    oilCapacity: '1.0 Litro',
    oilTypeRecommended: '20W-50 Mineral',
    frontTireSize: '2.75 - 18',
    frontTirePressure: '28 PSI',
    rearTireSize: '3.00 - 18',
    rearTirePressure: '30 PSI',
    chainType: '428H',
    sparkPlug: 'NGK D8EA',
    battery: '12V 6.5Ah',
    brakesFront: 'Tambor mecánico',
    brakesRear: 'Tambor mecánico',
    cooling: 'Aire',
    maintenanceIntervalOil: 'Cada 2,000 km',
  },
  'bera-sbr 150cc': {
    engineType: 'Monocilíndrico 4T con tecnología balanceada',
    displacement: '150 cc',
    hp: '12.0 HP @ 8500 RPM',
    torque: '11.0 Nm @ 7500 RPM',
    transmission: '5 Velocidades',
    weight: '118 kg',
    fuelCapacity: '12.5 Litros',
    oilCapacity: '1.0 Litro',
    oilTypeRecommended: '20W-50 4T JASO MA2',
    frontTireSize: '2.75 - 18',
    frontTirePressure: '28 PSI',
    rearTireSize: '90/90 - 18',
    rearTirePressure: '32 PSI',
    chainType: '428H x 120L',
    sparkPlug: 'NGK D8EA',
    battery: '12V 7Ah',
    brakesFront: 'Disco hidráulico con cáliper de doble pistón',
    brakesRear: 'Tambor mecánico',
    cooling: 'Aire forzado',
    maintenanceIntervalOil: 'Cada 2,000 km',
  },
  'bera-kavak 150cc': {
    engineType: 'Monocilíndrico 4T, diseño utilitario reforzado',
    displacement: '150 cc',
    hp: '12.0 HP @ 8000 RPM',
    torque: '10.8 Nm @ 7000 RPM',
    transmission: '5 Velocidades',
    weight: '115 kg',
    fuelCapacity: '11 Litros',
    oilCapacity: '1.0 Litro',
    oilTypeRecommended: '20W-50 Mineral / Semi',
    frontTireSize: '2.75 - 18',
    frontTirePressure: '28 PSI',
    rearTireSize: '3.00 - 18',
    rearTirePressure: '32 PSI',
    chainType: '428H',
    sparkPlug: 'NGK D8EA',
    battery: '12V 7Ah',
    brakesFront: 'Disco hidráulico',
    brakesRear: 'Tambor mecánico',
    cooling: 'Aire',
    maintenanceIntervalOil: 'Cada 2,000 km',
  },
  'bera-super dt 250cc': {
    engineType: 'Monocilíndrico 4T, refrigeración dual aire/aceite',
    displacement: '249 cc',
    hp: '19.0 HP @ 7500 RPM',
    torque: '18.5 Nm @ 6000 RPM',
    transmission: '5 Velocidades de alto torque',
    weight: '138 kg',
    fuelCapacity: '13 Litros',
    oilCapacity: '1.3 Litros',
    oilTypeRecommended: 'Semi-Sintético 15W-50',
    frontTireSize: '80/100 - 21 (Enduro)',
    frontTirePressure: '25 PSI',
    rearTireSize: '110/90 - 18 (Enduro)',
    rearTirePressure: '28 PSI',
    chainType: '520 O-Ring',
    sparkPlug: 'NGK DPR8EA-9',
    battery: '12V 7Ah',
    brakesFront: 'Disco hidráulico wave 260mm',
    brakesRear: 'Disco hidráulico 220mm',
    cooling: 'Radiador de aceite con deflector',
    maintenanceIntervalOil: 'Cada 2,500 km',
  },
  'escuda-em 200': {
    engineType: 'Monocilíndrico 4T con contrapeso anti-vibración',
    displacement: '198 cc',
    hp: '14.2 HP @ 8000 RPM',
    torque: '13.8 Nm @ 6500 RPM',
    transmission: '5 Velocidades',
    weight: '128 kg',
    fuelCapacity: '13 Litros',
    oilCapacity: '1.1 Litros',
    oilTypeRecommended: '20W-50 JASO MA2',
    frontTireSize: '90/90 - 17',
    frontTirePressure: '29 PSI',
    rearTireSize: '110/80 - 17',
    rearTirePressure: '32 PSI',
    chainType: '428H Reforzada',
    sparkPlug: 'NGK D8EA',
    battery: '12V 7Ah',
    brakesFront: 'Disco hidráulico',
    brakesRear: 'Disco hidráulico',
    cooling: 'Aire',
    maintenanceIntervalOil: 'Cada 2,500 km',
  },
  'chevrolet-optra 2011': {
    engineType: '4 Cilindros en línea, 1.8L DOHC 16 Válvulas E-TEC II / D-TEC MPFI',
    displacement: '1.799 cc (1.8L)',
    hp: '121 HP @ 5.800 RPM',
    torque: '165 Nm @ 4.000 RPM',
    transmission: 'Manual 5 velocidades / Automática 4 velocidades con Hold Mode',
    weight: '1.250 kg',
    fuelCapacity: '60 Litros - Gasolina 91/95 Octanos',
    oilCapacity: '4.0 Litros (con filtro)',
    oilTypeRecommended: '10W-30 / 15W-40 Semi-Sintético o 5W-30 Sintético',
    coolantCapacity: '7.0 Litros (Dex-Cool 50/50)',
    frontTireSize: '195/55 R15',
    frontTirePressure: '30 - 32 PSI',
    rearTireSize: '195/55 R15',
    rearTirePressure: '30 - 32 PSI',
    timingBeltType: 'Correa DOHC 16V (162 dientes)',
    sparkPlug: 'NGK BKR6E-11 (Luz: 1.1 mm)',
    battery: '12V 60Ah - 550 CCA',
    brakesFront: 'Discos ventilados 256 mm',
    brakesRear: 'Discos sólidos 258 mm (ABS + EBD)',
    cooling: 'Líquido presurizado, electroventilador doble',
    maintenanceIntervalOil: 'Cada 5.000 - 7.500 km',
    maintenanceIntervalTimingBelt: 'Cada 45.000 km',
  },
  'toyota-samurai fj60': {
    engineType: 'Toyota 2F, 6 Cilindros en línea, OHV a gasolina, 12 válvulas',
    displacement: '4.230 cc (4.2 Litros)',
    hp: '135 HP @ 3.600 RPM',
    torque: '285 Nm (210 lb-pie) @ 1.800 RPM',
    transmission: 'Manual 4 velocidades sincrónica (caja H41/H42 con transfer 4x4)',
    weight: '2.040 kg',
    fuelCapacity: '90 Litros - Carburador doble garganta',
    oilCapacity: '7.8 Litros (con filtro)',
    oilTypeRecommended: '20W-50 / 15W-40 Mineral para motor 2F pesado',
    coolantCapacity: '14.5 Litros',
    frontTireSize: '235/75 R15 o 31x10.50 R15',
    frontTirePressure: '30 - 32 PSI',
    rearTireSize: '235/75 R15 o 31x10.50 R15',
    rearTirePressure: '32 - 35 PSI',
    timingBeltType: 'Distribución por engranajes directos (Gear-driven)',
    sparkPlug: 'NGK BPR5EY / Denso W16EX-U',
    battery: '12V 75Ah - 700 CCA',
    brakesFront: 'Discos ventilados asistidos por vacío',
    brakesRear: 'Tambores hidráulicos de servicio pesado',
    cooling: 'Líquido presurizado con fan clutch viscoso',
    maintenanceIntervalOil: 'Cada 5.000 km',
    maintenanceIntervalTimingBelt: 'Engranajes directos - Libre de mantenimiento',
  },
  'toyota-hilux 2.7 4x4': {
    engineType: 'Toyota 2TR-FE, 4 Cilindros 2.7L DOHC 16V Dual VVT-i',
    displacement: '2.694 cc (2.7 Litros)',
    hp: '164 HP @ 5.200 RPM',
    torque: '245 Nm @ 4.000 RPM',
    transmission: 'Manual 5 velocidades / Automática 6 velocidades 4x4',
    weight: '1.980 kg',
    fuelCapacity: '80 Litros',
    oilCapacity: '5.6 Litros (con filtro)',
    oilTypeRecommended: '5W-30 / 10W-30 Sintético API SP',
    coolantCapacity: '8.5 Litros Super Long Life',
    frontTireSize: '265/65 R17',
    frontTirePressure: '32 PSI',
    rearTireSize: '265/65 R17',
    rearTirePressure: '35 PSI (Con carga: 38 PSI)',
    timingBeltType: 'Cadena metálica de distribución bañada en aceite',
    sparkPlug: 'Denso Iridium SK20HR11',
    battery: '12V 75Ah - 680 CCA',
    brakesFront: 'Discos ventilados 319 mm con cáliper de 4 pistones',
    brakesRear: 'Tambores con válvula proporcional de carga (ABS)',
    cooling: 'Líquido presurizado',
    maintenanceIntervalOil: 'Cada 5.000 - 7.500 km',
  },
  'ford-f-350 super duty': {
    engineType: 'Ford 6.2L V8 SOHC 16V Boss / Triton Heavy Duty',
    displacement: '6.210 cc (6.2 Litros V8)',
    hp: '385 HP @ 5.750 RPM',
    torque: '583 Nm (430 lb-pie) @ 3.800 RPM',
    transmission: 'TorqShift Heavy Duty 6 velocidades',
    weight: '3.150 kg',
    fuelCapacity: '151 Litros',
    oilCapacity: '6.6 Litros (7 cuartos con filtro)',
    oilTypeRecommended: '5W-30 / 10W-30 Motorcraft Synthetic Blend',
    coolantCapacity: '19.5 Litros',
    frontTireSize: '245/75 R17 (Morochas traseras)',
    frontTirePressure: '65 PSI',
    rearTireSize: '245/75 R17 Dual',
    rearTirePressure: '75 PSI',
    timingBeltType: 'Cadena de distribución doble de servicio pesado',
    sparkPlug: 'Motorcraft SP-526 (16 bujías - 2 por cilindro)',
    battery: '12V 750 CCA Motorcraft Max',
    brakesFront: 'Discos ventilados Heavy Duty 363 mm',
    brakesRear: 'Discos ventilados Heavy Duty 363 mm con Hydro-Boost',
    cooling: 'Líquido de servicio pesado',
    maintenanceIntervalOil: 'Cada 5.000 - 7.500 km',
  },
};

export const MOTO_SPECS_DB: Record<string, GeneratorSpecs> = {
  ...GENERATOR_SPECS_DB,
  ...VEHICLE_SPECS_DB,
};

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

export const getVehicleSpecs = (brand?: string, model?: string, isCar?: boolean): VehicleSpecs => {
  const cleanBrand = (brand || '').trim().toLowerCase();
  const cleanModel = (model || '').trim().toLowerCase();
  const exactKey = `${cleanBrand}-${cleanModel}`;

  if (VEHICLE_SPECS_DB[exactKey]) {
    return VEHICLE_SPECS_DB[exactKey];
  }

  if (cleanBrand.includes('toyota') && (cleanModel.includes('samurai') || cleanModel.includes('fj60'))) {
    return VEHICLE_SPECS_DB['toyota-samurai fj60'];
  }
  if (cleanBrand.includes('toyota') && cleanModel.includes('hilux')) {
    return VEHICLE_SPECS_DB['toyota-hilux 2.7 4x4'];
  }
  if (cleanModel.includes('optra') || cleanBrand.includes('chevrolet')) {
    return VEHICLE_SPECS_DB['chevrolet-optra 2011'];
  }
  if (cleanModel.includes('f-350') || cleanModel.includes('f350') || cleanBrand.includes('ford')) {
    return VEHICLE_SPECS_DB['ford-f-350 super duty'];
  }

  for (const k of Object.keys(VEHICLE_SPECS_DB)) {
    const modelPart = k.split('-')[1] || '';
    if (cleanModel && (k.includes(cleanModel) || cleanModel.includes(modelPart))) {
      return VEHICLE_SPECS_DB[k];
    }
  }

  if (isCar) {
    return {
      engineType: `${brand || 'Automotriz'} 4 Cilindros Gasolina / Diésel`,
      displacement: '2.0 Litros',
      hp: '140 HP @ 5500 RPM',
      torque: '195 Nm @ 4000 RPM',
      transmission: 'Sincrónica 5 Vel. / Automática',
      fuelCapacity: '60 Litros',
      oilCapacity: '4.5 Litros (con filtro)',
      oilTypeRecommended: '10W-30 / 15W-40 Semi-Sintético API SP',
      frontTirePressure: '32 PSI',
      rearTirePressure: '34 PSI',
      timingBeltType: 'Correa / Cadena de Distribución OEM',
      battery: '12V 65Ah - 600 CCA',
      brakesFront: 'Discos ventilados',
      brakesRear: 'Discos / Tambores ABS',
      maintenanceIntervalOil: 'Cada 5,000 - 7,500 km',
    };
  }

  return {
    engineType: 'Monocilíndrico 4 Tiempos OHV / OHC',
    displacement: cleanModel.includes('250') ? '250 cc' : cleanModel.includes('200') ? '200 cc' : '150 cc',
    hp: cleanModel.includes('250') ? '18.5 HP @ 8000 RPM' : '11.5 HP @ 8200 RPM',
    torque: cleanModel.includes('250') ? '17.0 Nm @ 6500 RPM' : '10.2 Nm @ 7000 RPM',
    transmission: '5 Velocidades multidisco húmedo',
    fuelCapacity: '12 Litros',
    oilCapacity: '1.0 Litro',
    oilTypeRecommended: '20W-50 4T JASO MA2',
    frontTirePressure: '28 PSI',
    rearTirePressure: '32 PSI',
    chainType: 'Paso 428H Reforzada',
    battery: '12V 7Ah libre de mantenimiento',
    brakesFront: 'Disco hidráulico ventilado',
    brakesRear: 'Tambor mecánico',
    maintenanceIntervalOil: 'Cada 2,500 - 3,000 km',
  };
};

export const getMotoSpecs = (brand?: string, model?: string): VehicleSpecs => {
  return getVehicleSpecs(brand, model);
};
