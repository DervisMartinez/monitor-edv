import { Generator } from '../../domain/entities/Generator';
import { MotoRepository } from '../../domain/repositories/MotoRepository';

const MOCK_GENERATORS: Generator[] = [
  { 
    id: '1', 
    name: 'Planta Principal Sede Central', 
    brand: 'Blue Power Generation', 
    model: 'C125', 
    capacityKva: 125, 
    fuelType: 'diesel', 
    currentHours: 1245.5, 
    serviceIntervalHours: 200, 
    lastServiceHours: 1200.0, 
    status: 'standby' 
  },
  { 
    id: '2', 
    name: 'Planta DataCenter', 
    brand: 'Blue Power Generation', 
    model: 'C75', 
    capacityKva: 75, 
    fuelType: 'diesel', 
    currentHours: 540.0, 
    serviceIntervalHours: 200, 
    lastServiceHours: 400.0, 
    status: 'standby' 
  },
];

export class MotoRepositoryImpl implements MotoRepository {
  async getMotos(): Promise<Generator[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_GENERATORS);
      }, 500);
    });
  }

  async getMotoById(id: string): Promise<Generator | null> {
    const gen = MOCK_GENERATORS.find(m => m.id === id);
    return gen || null;
  }
}
