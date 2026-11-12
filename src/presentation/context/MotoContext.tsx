import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { 
  Generator, 
  GeneratorService, 
  HorometerRecord, 
  PowerOutage, 
  AppUser,
  GeneratorComponentType,
  Company,
  Department
} from '../../domain/entities/Generator';
import { GENERATOR_CATALOG } from '../../data/catalog';
import { supabase } from '../../data/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initial Companies
export const DEFAULT_COMPANIES: Company[] = [
  {
    id: 'comp-edv-central',
    name: 'Empresas del Valle S.A.',
    description: 'Sede Principal Corporativa',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'comp-agro-valle',
    name: 'Agropecuaria El Valle',
    description: 'Complejo Agroindustrial y Silos',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'comp-logistica-valle',
    name: 'Transportes & Logística Valle',
    description: 'Flota y Distribución Regional',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
  },
];

// Initial Departments
export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: 'dep-infraestructura',
    companyId: 'comp-edv-central',
    name: 'Infraestructura & Operaciones',
    description: 'Edificio Central y Servicios Generales',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dep-tecnologia',
    companyId: 'comp-edv-central',
    name: 'Tecnología & DataCenter',
    description: 'Centro de Datos y Telecomunicaciones',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dep-planta-procesos',
    companyId: 'comp-agro-valle',
    name: 'Planta de Procesamiento',
    description: 'Línea de producción continua',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dep-mantenimiento-silos',
    companyId: 'comp-agro-valle',
    name: 'Mantenimiento & Silos',
    description: 'Área de almacenamiento de grano',
    imageUrl: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
  },
];

// Default initial generator fleet
// Flota base inicial de plantas eléctricas (inicia en 0.0 hrs para lecturas reales)
const DEFAULT_GENERATORS: Generator[] = [
  {
    id: 'gen-blue-power-c125',
    name: 'Planta Principal Sede Central',
    brand: 'Blue Power Generation',
    model: 'C125',
    capacityKva: 125,
    fuelType: 'diesel',
    currentHours: 0.0,
    serviceIntervalHours: 200,
    lastServiceHours: 0.0,
    location: 'Sala de Máquinas - Edificio Central',
    serialNumber: 'BPG-2024-C125-089',
    catalogImageRes: GENERATOR_CATALOG[0].imageRes,
    status: 'standby',
    companyId: 'comp-edv-central',
    companyName: 'Empresas del Valle S.A.',
    departmentId: 'dep-infraestructura',
    departmentName: 'Infraestructura & Operaciones',
  },
  {
    id: 'gen-blue-power-c75',
    name: 'Planta Respaldo Servidores / DataCenter',
    brand: 'Blue Power Generation',
    model: 'C75',
    capacityKva: 75,
    fuelType: 'diesel',
    currentHours: 0.0,
    serviceIntervalHours: 200,
    lastServiceHours: 0.0,
    location: 'Sótano 1 - Área Técnica',
    serialNumber: 'BPG-2024-C75-014',
    catalogImageRes: GENERATOR_CATALOG[1].imageRes,
    status: 'standby',
    companyId: 'comp-edv-central',
    companyName: 'Empresas del Valle S.A.',
    departmentId: 'dep-tecnologia',
    departmentName: 'Tecnología & DataCenter',
  },
];

// Sin datos ficticios - Las bitácoras inician vacías para registrar eventos reales en vivo
const DEFAULT_OUTAGES: PowerOutage[] = [];
const DEFAULT_HOROMETER_LOGS: HorometerRecord[] = [];
const DEFAULT_SERVICES: GeneratorService[] = [];

// Super Administrador oficial + usuarios iniciales con plantas asignadas
const DEFAULT_APP_USERS: AppUser[] = [
  {
    id: 'user-admin-edv',
    email: 'admin@empresasdelvalle.com',
    fullName: 'Super Administrador Empresas del Valle',
    role: 'superadmin',
    password: 'admin123',
    assignedGeneratorId: 'gen-blue-power-c125',
    assignedGeneratorName: 'Planta Principal Sede Central',
    companyId: 'comp-edv-central',
    companyName: 'Empresas del Valle S.A.',
    departmentId: 'dep-infraestructura',
    departmentName: 'Infraestructura & Operaciones',
    lastActive: 'En línea',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-op-edv',
    email: 'operador@empresasdelvalle.com.ve',
    fullName: 'Operador de Turno Empresas del Valle',
    role: 'operador',
    password: 'operador2026',
    assignedGeneratorId: 'gen-blue-power-c125',
    assignedGeneratorName: 'Planta Principal Sede Central',
    companyId: 'comp-edv-central',
    companyName: 'Empresas del Valle S.A.',
    departmentId: 'dep-infraestructura',
    departmentName: 'Infraestructura & Operaciones',
    lastActive: 'En línea',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-op-carlos',
    email: 'carlos.mendoza@empresasdelvalle.com',
    fullName: 'Carlos Mendoza',
    role: 'operador',
    password: 'operador2026',
    assignedGeneratorId: 'gen-blue-power-c125',
    assignedGeneratorName: 'Planta Principal Sede Central',
    companyId: 'comp-edv-central',
    companyName: 'Empresas del Valle S.A.',
    departmentId: 'dep-infraestructura',
    departmentName: 'Infraestructura & Operaciones',
    lastActive: 'Hoy, 08:30 AM',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-tec-roberto',
    email: 'roberto.gomez@empresasdelvalle.com',
    fullName: 'Roberto Gómez',
    role: 'tecnico',
    password: 'tecnico2026',
    assignedGeneratorId: 'gen-blue-power-c75',
    assignedGeneratorName: 'Planta Respaldo Servidores / DataCenter',
    companyId: 'comp-edv-central',
    companyName: 'Empresas del Valle S.A.',
    departmentId: 'dep-tecnologia',
    departmentName: 'Tecnología & DataCenter',
    lastActive: 'Ayer, 04:15 PM',
    createdAt: new Date().toISOString(),
  },
];

export interface GeneratorContextType {
  // Generator Fleet
  generators: Generator[];
  activeGenerator: Generator | null;
  myMoto: Generator | null; // Compatibility alias for activeGenerator
  motos: Generator[];       // Compatibility alias for generators
  isLoaded: boolean;
  isAddingMoto: boolean;
  setIsAddingMoto: (val: boolean) => void;

  // Real-time Records
  horometerLogs: HorometerRecord[];
  outages: PowerOutage[];
  services: GeneratorService[];
  records: GeneratorService[]; // Compatibility alias for services
  activeOutage: PowerOutage | null;

  // User Management
  appUsers: AppUser[];
  currentUser: { 
    id: string; 
    email: string; 
    fullName: string; 
    role: 'superadmin' | 'operador' | 'tecnico';
    assignedGeneratorId?: string;
    assignedGeneratorIds?: string[];
    assignedGeneratorName?: string;
    assignedGeneratorNames?: string[];
  } | null;
  isSuperUser: boolean;
  isAuthenticated: boolean;

  // Companies & Departments
  companies: Company[];
  departments: Department[];
  saveCompany: (company: Company) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  saveDepartment: (dept: Department) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  // Actions
  selectGenerator: (id: string) => void;
  selectMoto: (id: string) => void;
  saveGenerator: (generator: Generator) => Promise<void>;
  saveMoto: (generator: Generator) => Promise<void>;
  updateGenerator: (updates: Partial<Generator>, targetId?: string) => Promise<void>;
  updateMoto: (updates: Partial<Generator>) => Promise<void>;
  deleteGenerator: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteMoto: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Horometer Actions
  updateHorometer: (newHours: number, notes?: string) => Promise<{ success: boolean; delta: number }>;

  // Power Outage Actions
  startOutage: (notes?: string) => Promise<PowerOutage>;
  endOutage: (outageId?: string, notes?: string) => Promise<PowerOutage | null>;
  addOutage: (outage: Omit<PowerOutage, 'id' | 'createdAt'>) => Promise<void>;
  updateOutage: (id: string, updates: Partial<PowerOutage>) => Promise<void>;
  deleteOutage: (id: string) => Promise<void>;

  // Service Actions (NO COST)
  addService: (service: Omit<GeneratorService, 'id' | 'createdAt'>) => Promise<void>;
  addRecord: (service: GeneratorService) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;

  // Superuser Admin Actions
  createAppUser: (userData: { 
    email: string; 
    password?: string; 
    fullName: string; 
    role: 'superadmin' | 'operador' | 'tecnico'; 
    assignedGeneratorId?: string;
    assignedGeneratorIds?: string[];
    assignedGeneratorName?: string;
    assignedGeneratorNames?: string[];
    companyId?: string;
    companyName?: string;
    departmentId?: string;
    departmentName?: string;
  }) => Promise<{ success: boolean; user?: AppUser; error?: string }>;
  updateAppUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
  deleteAppUser: (id: string) => Promise<void>;
  unassignGeneratorFromUser: (userId: string, generatorId: string) => Promise<void>;

  // Auth
  logout: () => Promise<void>;
  loginDirectly: (
    email: string, 
    fullName?: string, 
    role?: 'superadmin' | 'operador' | 'tecnico',
    assignedGeneratorId?: string,
    assignedGeneratorName?: string
  ) => Promise<void>;
}

const GeneratorContext = createContext<GeneratorContextType | undefined>(undefined);

export const MotoProvider = ({ children }: { children: ReactNode }) => {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [activeGeneratorId, setActiveGeneratorId] = useState<string>('');
  const [horometerLogs, setHorometerLogs] = useState<HorometerRecord[]>([]);
  const [outages, setOutages] = useState<PowerOutage[]>([]);
  const [services, setServices] = useState<GeneratorService[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAddingMoto, setIsAddingMoto] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Active generator memo (null safe)
  const activeGenerator = useMemo(() => {
    if (generators.length === 0) return null;
    return generators.find(g => g.id === activeGeneratorId) || generators[0] || null;
  }, [generators, activeGeneratorId]);

  // Active ongoing outage (if any outage has no endTime)
  const activeOutage = useMemo(() => {
    if (!activeGenerator) return null;
    return outages.find(o => o.generatorId === activeGenerator.id && !o.endTime) || null;
  }, [outages, activeGenerator]);

  // Current user info and role
  const currentUser = useMemo(() => {
    const email = sessionUser?.email || 'admin@empresasdelvalle.com';
    const isSuper = email.includes('admin') || email.includes('super') || email.includes('gerencia');
    const matched = appUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    let assignedIds: string[] = [];
    if (matched?.assignedGeneratorIds && matched.assignedGeneratorIds.length > 0) {
      assignedIds = matched.assignedGeneratorIds;
    } else if (matched?.assignedGeneratorId) {
      assignedIds = [matched.assignedGeneratorId];
    } else if (sessionUser?.user_metadata?.assigned_generator) {
      assignedIds = [sessionUser.user_metadata.assigned_generator];
    }

    return {
      id: sessionUser?.id || matched?.id || 'admin-001',
      email,
      fullName: sessionUser?.user_metadata?.first_name 
        ? `${sessionUser.user_metadata.first_name} ${sessionUser.user_metadata.last_name || ''}`.trim()
        : (matched?.fullName || 'Super Administrador Empresas del Valle'),
      role: (matched?.role || sessionUser?.user_metadata?.role || (isSuper ? 'superadmin' : 'operador')) as 'superadmin' | 'operador' | 'tecnico',
      assignedGeneratorId: matched?.assignedGeneratorId || assignedIds[0] || sessionUser?.user_metadata?.assigned_generator,
      assignedGeneratorIds: assignedIds,
      assignedGeneratorName: matched?.assignedGeneratorName || sessionUser?.user_metadata?.assigned_generator_name,
      assignedGeneratorNames: matched?.assignedGeneratorNames || [],
    };
  }, [sessionUser, appUsers]);

  const isSuperUser = currentUser.role === 'superadmin';

  // Sincronizar automáticamente la planta activa con alguna de las asignadas al operador/técnico
  useEffect(() => {
    if (currentUser?.assignedGeneratorIds && currentUser.assignedGeneratorIds.length > 0 && generators.length > 0) {
      const isCurrentActiveAssigned = currentUser.assignedGeneratorIds.includes(activeGeneratorId);
      if (!isCurrentActiveAssigned) {
        const firstValid = generators.find(g => currentUser.assignedGeneratorIds.includes(g.id));
        if (firstValid) {
          setActiveGeneratorId(firstValid.id);
        }
      }
    } else if (currentUser?.assignedGeneratorId && generators.length > 0) {
      const exists = generators.some(g => g.id === currentUser.assignedGeneratorId);
      if (exists && activeGeneratorId !== currentUser.assignedGeneratorId) {
        setActiveGeneratorId(currentUser.assignedGeneratorId);
      }
    }
  }, [currentUser, generators, activeGeneratorId]);

  // Persistence Load on Mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        // 1. Check Supabase auth session or offline fallback session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSessionUser(session.user);
        } else {
          const savedLocalSession = await AsyncStorage.getItem('@edv_auth_session');
          if (savedLocalSession) {
            try {
              setSessionUser(JSON.parse(savedLocalSession));
            } catch {}
          }
        }

        // 2. Load cached local storage
        const [savedGens, savedLogs, savedOutages, savedServices, savedUsers, savedActiveId, savedCompanies, savedDepts] = await Promise.all([
          AsyncStorage.getItem('@generators_fleet'),
          AsyncStorage.getItem('@horometer_logs'),
          AsyncStorage.getItem('@power_outages'),
          AsyncStorage.getItem('@generator_services'),
          AsyncStorage.getItem('@app_users'),
          AsyncStorage.getItem('@active_generator_id'),
          AsyncStorage.getItem('@edv_companies'),
          AsyncStorage.getItem('@edv_departments'),
        ]);

        if (savedGens) {
          try {
            const parsed = JSON.parse(savedGens);
            if (Array.isArray(parsed)) {
              const mapped = parsed.map(g => {
                const catalogMatch = GENERATOR_CATALOG.find(c => c.brand.toLowerCase() === (g.brand || '').toLowerCase() && c.model.toLowerCase() === (g.model || '').toLowerCase());
                return {
                  ...g,
                  catalogImageRes: catalogMatch ? catalogMatch.imageRes : (g.catalogImageRes || GENERATOR_CATALOG[0].imageRes)
                };
              });
              setGenerators(mapped);
            }
          } catch {}
        }

        if (savedLogs) {
          try {
            const parsed = JSON.parse(savedLogs);
            if (Array.isArray(parsed)) setHorometerLogs(parsed);
          } catch {}
        }

        if (savedOutages) {
          try {
            const parsed = JSON.parse(savedOutages);
            if (Array.isArray(parsed)) setOutages(parsed);
          } catch {}
        }

        if (savedServices) {
          try {
            const parsed = JSON.parse(savedServices);
            if (Array.isArray(parsed)) setServices(parsed);
          } catch {}
        }

        if (savedUsers) {
          try {
            const parsed = JSON.parse(savedUsers);
            if (Array.isArray(parsed)) setAppUsers(parsed);
          } catch {}
        }

        if (savedCompanies) {
          try {
            const parsed = JSON.parse(savedCompanies);
            if (Array.isArray(parsed)) setCompanies(parsed);
          } catch {}
        }

        if (savedDepts) {
          try {
            const parsed = JSON.parse(savedDepts);
            if (Array.isArray(parsed)) setDepartments(parsed);
          } catch {}
        }

        if (savedActiveId) {
          setActiveGeneratorId(savedActiveId);
        }

        // 3. Sincronización en vivo de datos REALES desde Supabase
        await syncFromSupabase();

      } catch (err) {
        console.warn('Initialization error:', err);
      } finally {
        setIsLoaded(true);
      }
    };

    initializeData();

    // Supabase auth subscription
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
    });

    // Supabase Realtime Channel para escuchar cambios en vivo (sin datos estáticos)
    const channelName = `edv-live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const liveChannel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generators' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'horometer_logs' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'power_outages' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generator_services' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => {
        syncFromSupabase();
      })
      .subscribe();

    // Polling periódico de respaldo cada 5 segundos para sincronía total instantánea
    const pollInterval = setInterval(() => {
      syncFromSupabase();
    }, 5000);

    const handleFocus = () => {
      syncFromSupabase();
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      authListener?.subscription.unsubscribe();
      supabase.removeChannel(liveChannel);
      clearInterval(pollInterval);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, []);

  // Función de sincronización bidireccional de datos reales con Supabase
  const syncFromSupabase = async () => {
    try {
      // A. Plantas Eléctricas reales (100% dinámico)
      const { data: cloudGens, error: gensErr } = await supabase
        .from('generators')
        .select('*')
        .order('created_at', { ascending: true });

      if (gensErr) {
        if ((gensErr as any).status === 401 || (gensErr as any).code === 'PGRST301' || (gensErr as any).code === '401' || gensErr.message?.includes('JWT') || gensErr.message?.includes('Unauthorized')) {
          console.warn('[Sync Supabase] 401 Unauthorized detectado. Purgando tokens locales residuales...');
          await supabase.auth.signOut().catch(() => {});
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            try {
              Object.keys(window.localStorage).forEach(k => {
                if (k.startsWith('sb-') || k.startsWith('@edv_auth')) {
                  window.localStorage.removeItem(k);
                }
              });
            } catch {}
          }
        }
      }

      if (!gensErr && Array.isArray(cloudGens)) {
        const mappedCloud: Generator[] = cloudGens.map(cg => {
          const catalogMatch = GENERATOR_CATALOG.find(c => 
            c.brand.toLowerCase() === (cg.brand || '').toLowerCase() && 
            c.model.toLowerCase() === (cg.model || '').toLowerCase()
          );
          const curHours = Number(cg.current_hours) || 0;
          const rawLastService = Number(cg.last_service_hours) || 0;
          // Si el último servicio supera el horómetro actual (error tipográfico como 17680 h vs 1716 h),
          // lo normalizamos al horómetro actual para proteger los cálculos de mantenimiento y auto-corregir Supabase
          const safeLastService = (rawLastService >= 0 && rawLastService <= curHours) ? rawLastService : curHours;
          if (rawLastService > curHours && curHours > 0) {
            supabase.from('generators').update({ last_service_hours: curHours }).eq('id', cg.id).then(() => {});
          }

          return {
            id: cg.id,
            name: cg.name || `${cg.brand} ${cg.model}`,
            brand: cg.brand || 'Blue Power Generation',
            model: cg.model || 'C125',
            capacityKva: Number(cg.capacity_kva) || 125,
            fuelType: cg.fuel_type || 'diesel',
            currentHours: curHours,
            serviceIntervalHours: Number(cg.service_interval_hours) || 200,
            lastServiceHours: safeLastService,
            location: cg.location,
            serialNumber: cg.serial_number,
            status: cg.status || 'standby',
            companyId: cg.company_id || undefined,
            companyName: cg.company_name || undefined,
            departmentId: cg.department_id || undefined,
            departmentName: cg.department_name || undefined,
            customImageUri: cg.custom_image_uri || undefined,
            catalogImageRes: catalogMatch ? catalogMatch.imageRes : GENERATOR_CATALOG[0].imageRes,
          };
        });

        setGenerators(mappedCloud);
        await AsyncStorage.setItem('@generators_fleet', JSON.stringify(mappedCloud));

        if (mappedCloud.length > 0) {
          setActiveGeneratorId(prev => {
            if (prev && mappedCloud.some(g => g.id === prev)) return prev;
            return mappedCloud[0].id;
          });
        } else {
          setActiveGeneratorId('');
        }
      }

      // B. Lecturas reales de Horómetro
      const { data: cloudLogs, error: logsErr } = await supabase
        .from('horometer_logs')
        .select('*')
        .order('date', { ascending: false });

      if (!logsErr && Array.isArray(cloudLogs)) {
        const mappedLogs: HorometerRecord[] = cloudLogs.map(cl => ({
          id: cl.id,
          generatorId: cl.generator_id,
          userId: cl.user_id,
          userEmail: cl.user_email,
          hours: Number(cl.hours),
          deltaHours: Number(cl.delta_hours) || 0,
          date: cl.date,
          notes: cl.notes,
          createdAt: cl.created_at,
        }));
        setHorometerLogs(mappedLogs);
        await AsyncStorage.setItem('@horometer_logs', JSON.stringify(mappedLogs));
      }

      // C. Bitácora real de Cortes Eléctricos
      const { data: cloudOutages, error: outErr } = await supabase
        .from('power_outages')
        .select('*')
        .order('start_time', { ascending: false });

      if (!outErr && Array.isArray(cloudOutages)) {
        const mappedOutages: PowerOutage[] = cloudOutages.map(co => ({
          id: co.id,
          generatorId: co.generator_id,
          userId: co.user_id,
          userEmail: co.user_email,
          startTime: co.start_time,
          endTime: co.end_time,
          durationMinutes: co.duration_minutes,
          generatorStarted: co.generator_started,
          notes: co.notes,
          createdAt: co.created_at,
        }));
        setOutages(mappedOutages);
        await AsyncStorage.setItem('@power_outages', JSON.stringify(mappedOutages));
      }

      // D. Servicios técnicos reales
      const { data: cloudServices, error: servErr } = await supabase
        .from('generator_services')
        .select('*')
        .order('date', { ascending: false });

      if (!servErr && Array.isArray(cloudServices)) {
        const mappedServices: GeneratorService[] = cloudServices.map(cs => ({
          id: cs.id,
          generatorId: cs.generator_id,
          userId: cs.user_id,
          userEmail: cs.user_email,
          serviceType: cs.service_type,
          horometer: Number(cs.horometer),
          date: cs.date,
          performedBy: cs.performed_by,
          notes: cs.notes,
          createdAt: cs.created_at,
        }));
        setServices(mappedServices);
        await AsyncStorage.setItem('@generator_services', JSON.stringify(mappedServices));
      }

      // E. Usuarios reales de la plataforma
      const { data: cloudUsers, error: usersErr } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!usersErr && Array.isArray(cloudUsers)) {
        const mappedUsers: AppUser[] = cloudUsers.map(cu => {
          let assignedIds: string[] = [];
          if (Array.isArray(cu.assigned_generator_ids)) {
            assignedIds = cu.assigned_generator_ids;
          } else if (typeof cu.assigned_generator_ids === 'string') {
            try {
              const parsed = JSON.parse(cu.assigned_generator_ids);
              if (Array.isArray(parsed)) assignedIds = parsed;
            } catch {
              assignedIds = cu.assigned_generator_ids.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          }
          if (assignedIds.length === 0 && cu.assigned_generator_id) {
            assignedIds = [cu.assigned_generator_id];
          }

          return {
            id: cu.id,
            email: cu.email,
            fullName: cu.full_name,
            role: cu.role,
            password: cu.password || undefined,
            assignedGeneratorId: cu.assigned_generator_id || assignedIds[0],
            assignedGeneratorIds: assignedIds,
            assignedGeneratorName: cu.assigned_generator_name,
            companyId: cu.company_id,
            companyName: cu.company_name,
            departmentId: cu.department_id,
            departmentName: cu.department_name,
            createdAt: cu.created_at,
            lastActive: 'En línea',
          };
        });
        setAppUsers(mappedUsers);
        await AsyncStorage.setItem('@app_users', JSON.stringify(mappedUsers));
      }

      // F. Empresas reales
      const { data: cloudCompanies, error: compErr } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: true });

      if (!compErr && Array.isArray(cloudCompanies)) {
        const mappedComp: Company[] = cloudCompanies.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          imageUrl: c.image_url || '',
          createdAt: c.created_at,
        }));
        setCompanies(mappedComp);
        await AsyncStorage.setItem('@edv_companies', JSON.stringify(mappedComp));
      }

      // G. Departamentos reales
      const { data: cloudDepts, error: deptsErr } = await supabase
        .from('departments')
        .select('*')
        .order('created_at', { ascending: true });

      if (!deptsErr && Array.isArray(cloudDepts)) {
        const mappedDepts: Department[] = cloudDepts.map(d => ({
          id: d.id,
          companyId: d.company_id,
          name: d.name,
          description: d.description || '',
          imageUrl: d.image_url || '',
          createdAt: d.created_at,
        }));
        setDepartments(mappedDepts);
        await AsyncStorage.setItem('@edv_departments', JSON.stringify(mappedDepts));
      }

    } catch (err) {
      console.warn('Supabase real-data sync error:', err);
    }
  };

  // Sync generators to storage
  const persistGenerators = async (newList: Generator[]) => {
    setGenerators(newList);
    try {
      await AsyncStorage.setItem('@generators_fleet', JSON.stringify(newList));
    } catch {}
  };

  // Sync horometer logs to storage
  const persistHorometerLogs = async (newLogs: HorometerRecord[]) => {
    setHorometerLogs(newLogs);
    try {
      await AsyncStorage.setItem('@horometer_logs', JSON.stringify(newLogs));
    } catch {}
  };

  // Sync outages to storage
  const persistOutages = async (newOutages: PowerOutage[]) => {
    setOutages(newOutages);
    try {
      await AsyncStorage.setItem('@power_outages', JSON.stringify(newOutages));
    } catch {}
  };

  // Sync services to storage
  const persistServices = async (newServices: GeneratorService[]) => {
    setServices(newServices);
    try {
      await AsyncStorage.setItem('@generator_services', JSON.stringify(newServices));
    } catch {}
  };

  // Sync app users to storage
  const persistAppUsers = async (newUsers: AppUser[]) => {
    setAppUsers(newUsers);
    try {
      await AsyncStorage.setItem('@app_users', JSON.stringify(newUsers));
    } catch {}
  };

  // Sync companies to storage
  const persistCompanies = async (newCompanies: Company[]) => {
    setCompanies(newCompanies);
    try {
      await AsyncStorage.setItem('@edv_companies', JSON.stringify(newCompanies));
    } catch {}
  };

  // Sync departments to storage
  const persistDepartments = async (newDepts: Department[]) => {
    setDepartments(newDepts);
    try {
      await AsyncStorage.setItem('@edv_departments', JSON.stringify(newDepts));
    } catch {}
  };

  // Company Operations (Persisted in Supabase & Storage)
  const saveCompany = async (company: Company) => {
    const exists = companies.some(c => c.id === company.id);
    const updated = exists 
      ? companies.map(c => c.id === company.id ? company : c)
      : [...companies, company];
    await persistCompanies(updated);

    try {
      await supabase.from('companies').upsert([{
        id: company.id,
        name: company.name,
        description: company.description || null,
        image_url: company.imageUrl || null,
      }]);
    } catch (err) {
      console.warn('Error saving company in Supabase:', err);
    }
  };

  const deleteCompany = async (id: string) => {
    const updated = companies.filter(c => c.id !== id);
    await persistCompanies(updated);
    try {
      await supabase.from('companies').delete().eq('id', id);
    } catch (err) {
      console.warn('Error deleting company from Supabase:', err);
    }
  };

  // Department Operations (Persisted in Supabase & Storage)
  const saveDepartment = async (dept: Department) => {
    const exists = departments.some(d => d.id === dept.id);
    const updated = exists 
      ? departments.map(d => d.id === dept.id ? dept : d)
      : [...departments, dept];
    await persistDepartments(updated);

    try {
      await supabase.from('departments').upsert([{
        id: dept.id,
        company_id: dept.companyId || null,
        name: dept.name,
        description: dept.description || null,
        image_url: dept.imageUrl || null,
      }]);
    } catch (err) {
      console.warn('Error saving department in Supabase:', err);
    }
  };

  const deleteDepartment = async (id: string) => {
    const updated = departments.filter(d => d.id !== id);
    await persistDepartments(updated);
    try {
      await supabase.from('departments').delete().eq('id', id);
    } catch (err) {
      console.warn('Error deleting department from Supabase:', err);
    }
  };

  // 1. Actualizar Horómetro (Sincronizado en tiempo real con datos de usuario)
  const updateHorometer = async (newHours: number, notes?: string) => {
    if (!activeGenerator) return { success: false, delta: 0 };
    
    const prevHours = activeGenerator.currentHours;
    const delta = Math.max(0, Number((newHours - prevHours).toFixed(1)));
    const nowIso = new Date().toISOString();

    const authorDisplay = currentUser.fullName 
      ? `${currentUser.fullName} (${currentUser.role})`
      : currentUser.email;

    const newRecord: HorometerRecord = {
      id: `horo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      generatorId: activeGenerator.id,
      userId: currentUser.id,
      userEmail: `${currentUser.fullName} <${currentUser.email}>`,
      hours: Number(newHours.toFixed(1)),
      deltaHours: delta,
      date: nowIso,
      notes: notes || `Lectura reportada por ${authorDisplay}`,
      createdAt: nowIso,
    };

    // Update active generator
    const updatedGens = generators.map(g => {
      if (g.id === activeGenerator.id) {
        return {
          ...g,
          currentHours: Number(newHours.toFixed(1)),
        };
      }
      return g;
    });

    await persistGenerators(updatedGens);
    const updatedLogs = [newRecord, ...horometerLogs];
    await persistHorometerLogs(updatedLogs);

    // Save to Supabase
    try {
      await supabase.from('horometer_logs').insert([{
        id: newRecord.id,
        generator_id: activeGenerator.id,
        user_id: currentUser.id,
        user_email: `${currentUser.fullName} <${currentUser.email}>`,
        hours: newRecord.hours,
        delta_hours: newRecord.deltaHours,
        date: newRecord.date,
        notes: newRecord.notes,
      }]);

      await supabase.from('generators').update({
        current_hours: newRecord.hours,
      }).eq('id', activeGenerator.id);
    } catch (err) {
      console.warn('Error syncing horometer to Supabase:', err);
    }

    return { success: true, delta };
  };

  // 2. Registrar Corte Eléctrico
  const startOutage = async (genIdOrNotes?: string, optionalNotes?: string): Promise<PowerOutage> => {
    let targetGenId = activeGenerator?.id || generators[0]?.id || 'gen-blue-power-c125';
    let notes = optionalNotes;

    // Support both startOutage(notes) and startOutage(genId, notes)
    if (genIdOrNotes && generators.some(g => g.id === genIdOrNotes)) {
      targetGenId = genIdOrNotes;
    } else if (genIdOrNotes) {
      notes = genIdOrNotes;
    }

    const nowIso = new Date().toISOString();
    const newOutage: PowerOutage = {
      id: `outage-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      generatorId: targetGenId,
      userId: currentUser.id,
      userEmail: `${currentUser.fullName} <${currentUser.email}>`,
      startTime: nowIso,
      endTime: null,
      generatorStarted: true,
      notes: notes || 'Corte eléctrico en curso. Planta en marcha.',
      createdAt: nowIso,
    };

    const updated = [newOutage, ...outages];
    await persistOutages(updated);

    if (targetGenId) {
      await updateGenerator({ status: 'running' }, targetGenId);
    }

    try {
      await supabase.from('power_outages').insert([{
        id: newOutage.id,
        generator_id: newOutage.generatorId,
        user_id: newOutage.userId,
        user_email: newOutage.userEmail,
        start_time: newOutage.startTime,
        generator_started: true,
        notes: newOutage.notes,
      }]);
    } catch {}

    return newOutage;
  };

  // 3. Registrar Regreso de Electricidad
  const endOutage = async (outageId?: string, notes?: string): Promise<PowerOutage | null> => {
    const targetOutage = outageId 
      ? outages.find(o => o.id === outageId)
      : activeOutage;

    if (!targetOutage) return null;

    const endTimeIso = new Date().toISOString();
    const startMs = new Date(targetOutage.startTime).getTime();
    const endMs = new Date(endTimeIso).getTime();
    const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));

    const updatedOutage: PowerOutage = {
      ...targetOutage,
      endTime: endTimeIso,
      durationMinutes,
      notes: notes ? `${targetOutage.notes || ''} | ${notes}` : targetOutage.notes,
    };

    const updatedList = outages.map(o => o.id === targetOutage.id ? updatedOutage : o);
    await persistOutages(updatedList);

    // Update generator status back to standby
    if (targetOutage.generatorId) {
      await updateGenerator({ status: 'standby' }, targetOutage.generatorId);
    }

    try {
      await supabase.from('power_outages').update({
        end_time: endTimeIso,
        duration_minutes: durationMinutes,
        notes: updatedOutage.notes,
      }).eq('id', targetOutage.id);
    } catch {}

    return updatedOutage;
  };

  // 4. Agregar Corte Manualmente (con fecha y horas específicas)
  const addOutage = async (outageData: Omit<PowerOutage, 'id' | 'createdAt'> & { id?: string }) => {
    const nowIso = new Date().toISOString();
    let durationMinutes = outageData.durationMinutes;
    if (!durationMinutes && outageData.startTime && outageData.endTime) {
      const s = new Date(outageData.startTime).getTime();
      const e = new Date(outageData.endTime).getTime();
      durationMinutes = Math.max(1, Math.round((e - s) / 60000));
    }

    const newOutage: PowerOutage = {
      ...outageData,
      id: outageData.id || `outage-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: outageData.userId || currentUser.id,
      userEmail: outageData.userEmail || `${currentUser.fullName} <${currentUser.email}>`,
      durationMinutes: durationMinutes ?? undefined,
      createdAt: nowIso,
    };

    const updated = [newOutage, ...outages];
    await persistOutages(updated);

    // If outage is ongoing (no end time), mark generator as running
    if (!newOutage.endTime && newOutage.generatorId) {
      await updateGenerator({ status: 'running' }, newOutage.generatorId);
    }

    try {
      await supabase.from('power_outages').insert([{
        id: newOutage.id,
        generator_id: newOutage.generatorId,
        user_id: newOutage.userId,
        user_email: newOutage.userEmail,
        start_time: newOutage.startTime,
        end_time: newOutage.endTime || null,
        duration_minutes: newOutage.durationMinutes,
        generator_started: newOutage.generatorStarted,
        notes: newOutage.notes,
      }]);
    } catch (err) {
      console.warn('Error inserting outage to Supabase:', err);
    }
  };

  const updateOutage = async (id: string, updates: Partial<PowerOutage>) => {
    let finalUpdates = { ...updates };
    if (updates.startTime && updates.endTime && updates.durationMinutes === undefined) {
      const s = new Date(updates.startTime).getTime();
      const e = new Date(updates.endTime).getTime();
      finalUpdates.durationMinutes = Math.max(1, Math.round((e - s) / 60000));
    }

    const updated = outages.map(o => o.id === id ? { ...o, ...finalUpdates } : o);
    await persistOutages(updated);

    const matchOutage = updated.find(o => o.id === id);
    if (matchOutage && matchOutage.generatorId) {
      if (!matchOutage.endTime) {
        await updateGenerator({ status: 'running' }, matchOutage.generatorId);
      } else {
        await updateGenerator({ status: 'standby' }, matchOutage.generatorId);
      }
    }

    try {
      const dbUpdates: any = {};
      if (finalUpdates.generatorId !== undefined) dbUpdates.generator_id = finalUpdates.generatorId;
      if (finalUpdates.startTime !== undefined) dbUpdates.start_time = finalUpdates.startTime;
      if (finalUpdates.endTime !== undefined) dbUpdates.end_time = finalUpdates.endTime;
      if (finalUpdates.durationMinutes !== undefined) dbUpdates.duration_minutes = finalUpdates.durationMinutes;
      if (finalUpdates.generatorStarted !== undefined) dbUpdates.generator_started = finalUpdates.generatorStarted;
      if (finalUpdates.notes !== undefined) dbUpdates.notes = finalUpdates.notes;

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('power_outages').update(dbUpdates).eq('id', id);
      }
    } catch (err) {
      console.warn('Error updating outage in Supabase:', err);
    }
  };

  const deleteOutage = async (id: string) => {
    const updated = outages.filter(o => o.id !== id);
    await persistOutages(updated);
    try {
      await supabase.from('power_outages').delete().eq('id', id);
    } catch {}
  };

  // 5. Agregar Servicio de Mantenimiento (SIN COSTO NI MONTO)
  const addService = async (serviceData: Omit<GeneratorService, 'id' | 'createdAt'>) => {
    const nowIso = new Date().toISOString();
    const newService: GeneratorService = {
      ...serviceData,
      id: `serv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: nowIso,
    };

    const updated = [newService, ...services];
    await persistServices(updated);

    // If service was for oil or major component, update lastServiceHours on generator
    if (activeGenerator && (serviceData.serviceType === 'oil' || serviceData.serviceType === 'general_inspection')) {
      await updateGenerator({
        lastServiceHours: serviceData.horometer,
      });
    }

    try {
      await supabase.from('generator_services').insert([{
        generator_id: newService.generatorId,
        user_id: newService.userId,
        user_email: newService.userEmail,
        service_type: newService.serviceType,
        horometer: newService.horometer,
        date: newService.date,
        performed_by: newService.performedBy,
        notes: newService.notes,
      }]);
    } catch {}
  };

  const deleteService = async (id: string) => {
    const updated = services.filter(s => s.id !== id);
    await persistServices(updated);
    try {
      await supabase.from('generator_services').delete().eq('id', id);
    } catch {}
  };

  // 6. Superusuario: Crear y Administrar Usuarios de la App
  const createAppUser = async (userData: {
    email: string;
    password?: string;
    fullName: string;
    role: 'superadmin' | 'operador' | 'tecnico';
    assignedGeneratorId?: string;
    assignedGeneratorIds?: string[];
    assignedGeneratorName?: string;
    assignedGeneratorNames?: string[];
    companyId?: string;
    companyName?: string;
    departmentId?: string;
    departmentName?: string;
  }): Promise<{ success: boolean; user?: AppUser; error?: string }> => {
    if (!userData.email || !userData.fullName) {
      return { success: false, error: 'Correo y nombre completo son obligatorios' };
    }

    const existing = appUsers.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existing) {
      return { success: false, error: 'Ya existe un usuario registrado con este correo' };
    }

    const genIds = (userData.assignedGeneratorIds && userData.assignedGeneratorIds.length > 0)
      ? userData.assignedGeneratorIds
      : (userData.assignedGeneratorId ? [userData.assignedGeneratorId] : (activeGenerator ? [activeGenerator.id] : []));
    
    const assignedGens = generators.filter(g => genIds.includes(g.id));
    const genNames = assignedGens.map(g => g.name);
    const primaryGenId = genIds[0] || userData.assignedGeneratorId || activeGenerator?.id;
    const targetGen = assignedGens[0] || generators.find(g => g.id === primaryGenId) || activeGenerator;
    const targetComp = companies.find(c => c.id === (userData.companyId || targetGen?.companyId));
    const targetDept = departments.find(d => d.id === (userData.departmentId || targetGen?.departmentId));
    const combinedNames = genNames.join(', ') || userData.assignedGeneratorName || targetGen?.name || 'Planta Principal Sede Central';

    const newUser: AppUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      email: userData.email.trim().toLowerCase(),
      fullName: userData.fullName.trim(),
      role: userData.role,
      password: userData.password || '123456',
      assignedGeneratorId: primaryGenId,
      assignedGeneratorIds: genIds,
      assignedGeneratorName: combinedNames,
      assignedGeneratorNames: genNames,
      companyId: userData.companyId || targetGen?.companyId,
      companyName: userData.companyName || targetComp?.name || targetGen?.companyName,
      departmentId: userData.departmentId || targetGen?.departmentId,
      departmentName: userData.departmentName || targetDept?.name || targetGen?.departmentName,
      lastActive: 'Recién creado',
      createdAt: new Date().toISOString(),
    };

    const updatedList = [newUser, ...appUsers];
    await persistAppUsers(updatedList);

    // 1. Guardar y encriptar de forma segura en Supabase mediante RPC
    try {
      const { error: rpcErr } = await supabase.rpc('admin_create_or_update_user', {
        p_email: newUser.email,
        p_password: userData.password || '123456',
        p_full_name: newUser.fullName,
        p_role: newUser.role,
        p_assigned_generator_id: newUser.assignedGeneratorId || null,
        p_assigned_generator_name: newUser.assignedGeneratorName || null,
        p_company_id: newUser.companyId || null,
        p_company_name: newUser.companyName || null,
        p_department_id: newUser.departmentId || null,
        p_department_name: newUser.departmentName || null,
      });

      if (rpcErr) {
        console.warn('Fallback al crear usuario en app_users:', rpcErr);
        await supabase.from('app_users').insert([{
          id: newUser.id,
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.fullName,
          role: newUser.role,
          assigned_generator_id: newUser.assignedGeneratorId || null,
          assigned_generator_name: newUser.assignedGeneratorName || null,
          company_id: newUser.companyId || null,
          company_name: newUser.companyName || null,
          department_id: newUser.departmentId || null,
          department_name: newUser.departmentName || null,
        }]);
      }
    } catch (err) {
      console.warn('Error saving app user:', err);
    }

    return { success: true, user: newUser };
  };

  const updateAppUser = async (id: string, updates: Partial<AppUser>) => {
    let resolvedUpdates = { ...updates };
    if (updates.assignedGeneratorIds && updates.assignedGeneratorIds.length > 0) {
      const matchGens = generators.filter(g => updates.assignedGeneratorIds?.includes(g.id));
      const names = matchGens.map(g => g.name);
      resolvedUpdates.assignedGeneratorId = updates.assignedGeneratorIds[0];
      resolvedUpdates.assignedGeneratorName = names.join(', ');
      resolvedUpdates.assignedGeneratorNames = names;
    } else if (updates.assignedGeneratorId && !updates.assignedGeneratorName) {
      const matchGen = generators.find(g => g.id === updates.assignedGeneratorId);
      if (matchGen) {
        resolvedUpdates.assignedGeneratorName = matchGen.name;
        resolvedUpdates.assignedGeneratorIds = [updates.assignedGeneratorId];
        resolvedUpdates.assignedGeneratorNames = [matchGen.name];
        if (!updates.companyId && matchGen.companyId) resolvedUpdates.companyId = matchGen.companyId;
        if (!updates.companyName && matchGen.companyName) resolvedUpdates.companyName = matchGen.companyName;
        if (!updates.departmentId && matchGen.departmentId) resolvedUpdates.departmentId = matchGen.departmentId;
        if (!updates.departmentName && matchGen.departmentName) resolvedUpdates.departmentName = matchGen.departmentName;
      }
    }

    const updated = appUsers.map(u => {
      if (u.id === id) {
        return { ...u, ...resolvedUpdates };
      }
      return u;
    });

    await persistAppUsers(updated);

    try {
      const dbUpdates: any = {};
      if (resolvedUpdates.fullName !== undefined) dbUpdates.full_name = resolvedUpdates.fullName;
      if (resolvedUpdates.role !== undefined) dbUpdates.role = resolvedUpdates.role;
      if (resolvedUpdates.assignedGeneratorId !== undefined) dbUpdates.assigned_generator_id = resolvedUpdates.assignedGeneratorId || null;
      if (resolvedUpdates.assignedGeneratorName !== undefined) dbUpdates.assigned_generator_name = resolvedUpdates.assignedGeneratorName || null;
      if (resolvedUpdates.companyId !== undefined) dbUpdates.company_id = resolvedUpdates.companyId || null;
      if (resolvedUpdates.companyName !== undefined) dbUpdates.company_name = resolvedUpdates.companyName || null;
      if (resolvedUpdates.departmentId !== undefined) dbUpdates.department_id = resolvedUpdates.departmentId || null;
      if (resolvedUpdates.departmentName !== undefined) dbUpdates.department_name = resolvedUpdates.departmentName || null;

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('app_users').update(dbUpdates).eq('id', id);
      }
    } catch (err) {
      console.warn('Error updating app_user in Supabase:', err);
    }
  };

  const unassignGeneratorFromUser = async (userId: string, generatorId: string) => {
    const user = appUsers.find(u => u.id === userId);
    if (!user) return;

    const currentIds = user.assignedGeneratorIds && user.assignedGeneratorIds.length > 0
      ? user.assignedGeneratorIds
      : (user.assignedGeneratorId ? [user.assignedGeneratorId] : []);
    
    const remainingIds = currentIds.filter(id => id !== generatorId);
    const remainingGens = generators.filter(g => remainingIds.includes(g.id));
    const newPrimary = remainingIds[0] || undefined;
    const newName = remainingGens.length > 0 ? remainingGens.map(g => g.name).join(', ') : 'Sin Asignar';

    await updateAppUser(userId, {
      assignedGeneratorIds: remainingIds,
      assignedGeneratorId: newPrimary,
      assignedGeneratorName: newName,
      assignedGeneratorNames: remainingGens.map(g => g.name),
    });
  };

  const deleteAppUser = async (id: string) => {
    const updated = appUsers.filter(u => u.id !== id);
    await persistAppUsers(updated);
    try {
      await supabase.from('app_users').delete().eq('id', id);
    } catch (err) {
      console.warn('Error deleting app_user from Supabase:', err);
    }
  };

  // 7. Generator Fleet Operations
  const selectGenerator = async (id: string) => {
    setActiveGeneratorId(id);
    try {
      await AsyncStorage.setItem('@active_generator_id', id);
    } catch {}
  };

  const saveGenerator = async (gen: Generator) => {
    const catalogMatch = GENERATOR_CATALOG.find(c => 
      c.brand.toLowerCase() === gen.brand.toLowerCase() && 
      c.model.toLowerCase() === gen.model.toLowerCase()
    );
    const completeGen: Generator = {
      ...gen,
      catalogImageRes: catalogMatch ? catalogMatch.imageRes : (gen.catalogImageRes || GENERATOR_CATALOG[0].imageRes),
    };

    const exists = generators.some(g => g.id === completeGen.id);
    const updated = exists 
      ? generators.map(g => g.id === completeGen.id ? completeGen : g)
      : [...generators, completeGen];

    await persistGenerators(updated);
    setActiveGeneratorId(completeGen.id);
    setIsAddingMoto(false);

    try {
      const payload: any = {
        id: completeGen.id,
        name: completeGen.name,
        brand: completeGen.brand,
        model: completeGen.model,
        capacity_kva: completeGen.capacityKva,
        fuel_type: completeGen.fuelType,
        current_hours: completeGen.currentHours,
        service_interval_hours: completeGen.serviceIntervalHours,
        last_service_hours: completeGen.lastServiceHours,
        location: completeGen.location || '',
        serial_number: completeGen.serialNumber || '',
        status: completeGen.status || 'standby',
        company_id: completeGen.companyId || null,
        company_name: completeGen.companyName || null,
        department_id: completeGen.departmentId || null,
        department_name: completeGen.departmentName || null,
        custom_image_uri: completeGen.customImageUri || null,
      };
      await supabase.from('generators').upsert([payload]);
    } catch (err) {
      console.warn('Error saving generator in Supabase:', err);
    }
  };

  const updateGenerator = async (updates: Partial<Generator>, targetId?: string) => {
    const targetGenId = targetId || activeGenerator?.id;
    if (!targetGenId) return;

    const updated = generators.map(g => {
      if (g.id === targetGenId) {
        return { ...g, ...updates };
      }
      return g;
    });
    await persistGenerators(updated);

    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
      if (updates.model !== undefined) dbUpdates.model = updates.model;
      if (updates.capacityKva !== undefined) dbUpdates.capacity_kva = updates.capacityKva;
      if (updates.fuelType !== undefined) dbUpdates.fuel_type = updates.fuelType;
      if (updates.currentHours !== undefined) dbUpdates.current_hours = updates.currentHours;
      if (updates.serviceIntervalHours !== undefined) dbUpdates.service_interval_hours = updates.serviceIntervalHours;
      if (updates.lastServiceHours !== undefined) dbUpdates.last_service_hours = updates.lastServiceHours;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.serialNumber !== undefined) dbUpdates.serial_number = updates.serialNumber;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId || null;
      if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName || null;
      if (updates.departmentId !== undefined) dbUpdates.department_id = updates.departmentId || null;
      if (updates.departmentName !== undefined) dbUpdates.department_name = updates.departmentName || null;
      if (updates.customImageUri !== undefined) dbUpdates.custom_image_uri = updates.customImageUri || null;

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('generators').update(dbUpdates).eq('id', targetGenId);
      }
    } catch (err) {
      console.warn('Error updating generator in Supabase:', err);
    }
  };

  const deleteGenerator = async (id: string): Promise<{ success: boolean; error?: string }> => {
    // SECURITY GUARD: Solo el Super Administrador puede eliminar plantas de la base de datos corporativa
    if (!isSuperUser) {
      console.warn('[Security Guard] Bloqueado: Solo el superadmin puede eliminar plantas de la base de datos corporativa.');
      return { 
        success: false, 
        error: 'Acción no autorizada: Solo el Super Administrador puede eliminar plantas de la base de datos corporativa.' 
      };
    }

    try {
      // 1. Unlink any users assigned to this generator in Supabase first (avoids FK constraint 23503)
      try {
        await supabase
          .from('app_users')
          .update({ assigned_generator_id: null, assigned_generator_name: null })
          .eq('assigned_generator_id', id);
      } catch (userErr) {
        console.warn('Warning unlinking users in Supabase:', userErr);
      }

      // 2. Delete dependent records first to satisfy foreign key constraints
      try {
        await supabase.from('horometer_logs').delete().eq('generator_id', id);
      } catch {}
      try {
        await supabase.from('power_outages').delete().eq('generator_id', id);
      } catch {}
      try {
        await supabase.from('generator_services').delete().eq('generator_id', id);
      } catch {}

      // 3. Delete generator from Supabase
      const { error: delErr } = await supabase.from('generators').delete().eq('id', id);
      if (delErr) {
        console.error('Supabase generator delete error:', delErr);
        // If not found by ID, attempt delete by serial number if present
        const targetGen = generators.find(g => g.id === id);
        if (targetGen?.serialNumber) {
          try {
            await supabase.from('generators').delete().eq('serial_number', targetGen.serialNumber);
          } catch {}
        }
      }

      // 4. Update local state and persist to AsyncStorage
      const filtered = generators.filter(g => g.id !== id);
      await persistGenerators(filtered);

      const remainingLogs = horometerLogs.filter(l => l.generatorId !== id);
      await persistHorometerLogs(remainingLogs);

      const remainingOutages = outages.filter(o => o.generatorId !== id);
      await persistOutages(remainingOutages);

      const remainingServices = services.filter(s => s.generatorId !== id);
      await persistServices(remainingServices);

      const updatedUsers = appUsers.map(u => 
        u.assignedGeneratorId === id 
          ? { ...u, assignedGeneratorId: undefined, assignedGeneratorName: undefined } 
          : u
      );
      await persistAppUsers(updatedUsers);

      if (filtered.length > 0) {
        setActiveGeneratorId(prev => prev === id ? filtered[0].id : prev);
      } else {
        setActiveGeneratorId('');
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Error deleting generator from Supabase:', err);
      // Still update local state so user interface is responsive
      const filtered = generators.filter(g => g.id !== id);
      await persistGenerators(filtered);
      return { success: false, error: err?.message || 'Error al eliminar en Supabase' };
    }
  };

  const loginDirectly = async (
    email: string, 
    fullName?: string, 
    role: 'superadmin' | 'operador' | 'tecnico' = 'superadmin',
    assignedGeneratorId?: string,
    assignedGeneratorName?: string
  ) => {
    const userObj = {
      id: `usr-${Date.now()}`,
      email: email.trim().toLowerCase(),
      user_metadata: { 
        first_name: fullName || (role === 'superadmin' ? 'Super Administrador' : 'Operador'), 
        role,
        assigned_generator: assignedGeneratorId,
        assigned_generator_name: assignedGeneratorName,
      },
    };
    setSessionUser(userObj);
    try {
      await AsyncStorage.setItem('@edv_auth_session', JSON.stringify(userObj));
    } catch {}
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
    try {
      await AsyncStorage.removeItem('@edv_auth_session');
    } catch {}
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.includes('sb-') || key.includes('supabase') || key.includes('@edv_auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => window.localStorage.removeItem(k));
      } catch {}
    }
    setSessionUser(null);
  };

  return (
    <GeneratorContext.Provider
      value={{
        generators,
        activeGenerator,
        myMoto: activeGenerator,
        motos: generators,
        isLoaded,
        isAddingMoto,
        setIsAddingMoto,

        horometerLogs,
        outages,
        services,
        records: services,
        activeOutage,

        appUsers,
        currentUser,
        isSuperUser,
        isAuthenticated: Boolean(sessionUser),

        selectGenerator,
        selectMoto: selectGenerator,
        saveGenerator,
        saveMoto: saveGenerator,
        updateGenerator,
        updateMoto: updateGenerator,
        deleteGenerator,
        deleteMoto: deleteGenerator,

        updateHorometer,
        startOutage,
        endOutage,
        addOutage,
        updateOutage,
        deleteOutage,

        addService,
        addRecord: addService,
        deleteService,
        deleteRecord: deleteService,

        companies,
        departments,
        saveCompany,
        deleteCompany,
        saveDepartment,
        deleteDepartment,

        createAppUser,
        updateAppUser,
        deleteAppUser,
        unassignGeneratorFromUser,
        logout,
        loginDirectly,
      }}
    >
      {children}
    </GeneratorContext.Provider>
  );
};

export const useMyMoto = () => {
  const context = useContext(GeneratorContext);
  if (!context) {
    throw new Error('useMyMoto / useGenerator must be used within a MotoProvider');
  }
  return context;
};

export const useGenerator = useMyMoto;
// Sincronización limpia de contexto EDV Monitor

