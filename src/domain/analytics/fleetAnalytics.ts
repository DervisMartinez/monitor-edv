import {
  COMPONENT_ICONS,
  COMPONENT_NAMES,
  calculateWearPercentage,
  getServiceStatus,
} from '../../constants/telemetry';
import {
  AppUser,
  Company,
  Department,
  FuelType,
  Generator,
  GeneratorService,
  HorometerRecord,
  PowerOutage,
} from '../entities/Generator';

export type AnalyticsPeriod = 'all' | '7d' | '30d' | 'month' | '90d';

export interface FleetAnalyticsInput {
  generators: Generator[];
  horometerLogs: HorometerRecord[];
  outages: PowerOutage[];
  services: GeneratorService[];
  companies: Company[];
  departments: Department[];
  appUsers: AppUser[];
  period?: AnalyticsPeriod;
  companyFilterId?: string;
  nowMs?: number;
}

export interface FleetOverviewStats {
  totalPlants: number;
  runningPlants: number;
  standbyPlants: number;
  maintenancePlants: number;
  offlinePlants: number;
  totalCapacityKva: number;
  totalHorometerHours: number;
  avgHorometerHours: number;
  maxHorometerHours: number;
  minHorometerHours: number;
  periodLoggedHours: number;
  horometerLogsCount: number;
  avgHoursPerLog: number;
  avgHoursPerDayFleet: number;
  avgHoursPerPlantPerDay: number;
  outagesCount: number;
  activeOutagesCount: number;
  resolvedOutagesCount: number;
  totalOutageMinutes: number;
  avgOutageMinutes: number;
  maxOutageMinutes: number;
  minOutageMinutes: number;
  outagesPerWeek: number;
  atsStartedCount: number;
  atsSuccessRatePct: number;
  servicesCount: number;
  avgFleetHealthPct: number;
  plantsDueSoonOrOverdue: number;
  effectiveDaysSpan: number;
  networkAvgOutageMinutes: number;
  networkAvgOutagesPerPlant: number;
}

export interface CompanyOutageStats {
  companyKey: string;
  companyName: string;
  plantCount: number;
  totalCapacityKva: number;
  totalHorometerHours: number;
  avgHorometerPerPlant: number;
  periodLoggedHours: number;
  outageCount: number;
  activeCount: number;
  resolvedCount: number;
  totalOutageMinutes: number;
  avgOutageMinutes: number;
  maxOutageMinutes: number;
  minOutageMinutes: number;
  avgOutagesPerPlant: number;
  avgOutageMinutesPerWeek: number;
  atsStartedCount: number;
  atsRatePct: number;
  peakTimeSlot: string;
  vsNetworkAvgDurationPct: number | null;
  vsNetworkAvgOutagesPerPlantPct: number | null;
}

export interface PlantUsageStats {
  generatorId: string;
  name: string;
  brand: string;
  model: string;
  capacityKva: number;
  fuelType: FuelType;
  status: Generator['status'];
  companyKey: string;
  companyName: string;
  departmentName: string;
  currentHours: number;
  shareOfFleetHoursPct: number;
  vsFleetAvgHorometerPct: number | null;
  periodLoggedHours: number;
  logsCount: number;
  avgHoursPerLog: number;
  avgHoursPerDay: number;
  vsFleetAvgPeriodHoursPct: number | null;
  outagesCount: number;
  activeOutagesCount: number;
  outageMinutes: number;
  avgOutageMinutes: number;
  atsStartedCount: number;
  atsRatePct: number;
  servicesCount: number;
  lastServiceHours: number;
  serviceIntervalHours: number;
  hoursOperatedInCycle: number;
  hoursRemaining: number;
  healthRemainingPct: number;
  serviceCycleUsedPct: number;
  serviceStatus: 'optimal' | 'warning' | 'critical';
  usageRank: number;
}

export interface TimelineBucket {
  key: string;
  label: string;
  horometerLoggedHours: number;
  outagesCount: number;
  outageMinutes: number;
  servicesCount: number;
}

export interface TimeSlotStats {
  id: 'madrugada' | 'manana' | 'tarde' | 'noche';
  label: string;
  rangeLabel: string;
  count: number;
  sharePct: number;
  totalMinutes: number;
  avgMinutes: number;
}

export interface DepartmentStats {
  departmentKey: string;
  departmentName: string;
  companyName: string;
  plantCount: number;
  totalHorometerHours: number;
  periodLoggedHours: number;
  outageCount: number;
  totalOutageMinutes: number;
  avgOutageMinutes: number;
  servicesCount: number;
}

export interface ServiceTypeStats {
  serviceType: string;
  label: string;
  iconName: string;
  count: number;
  sharePct: number;
}

export interface FuelBreakdownStats {
  fuelType: FuelType;
  label: string;
  plantCount: number;
  totalCapacityKva: number;
  totalHorometerHours: number;
  avgHorometerHours: number;
  outageCount: number;
  totalOutageMinutes: number;
}

export interface OperatorActivityStats {
  key: string;
  name: string;
  email: string;
  role: string;
  horometerLogsCount: number;
  loggedHours: number;
  outagesReportedCount: number;
  servicesRecordedCount: number;
  totalActions: number;
}

export interface CompanyOption {
  key: string;
  name: string;
  plantCount: number;
}

export interface FleetAnalyticsResult {
  period: AnalyticsPeriod;
  companyFilterId: string;
  companyOptions: CompanyOption[];
  overview: FleetOverviewStats;
  companyOutages: CompanyOutageStats[];
  allCompanyOutages: CompanyOutageStats[];
  plantUsage: PlantUsageStats[];
  timeline: TimelineBucket[];
  timelineGranularity: 'day' | 'week' | 'month';
  timeSlots: TimeSlotStats[];
  departments: DepartmentStats[];
  serviceTypes: ServiceTypeStats[];
  fuelBreakdown: FuelBreakdownStats[];
  operators: OperatorActivityStats[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTHS_SHORT_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const FUEL_LABELS: Record<FuelType, string> = {
  diesel: 'Diésel',
  gasolina: 'Gasolina',
  gas: 'Gas',
};

const TIME_SLOT_DEFS: ReadonlyArray<{
  id: TimeSlotStats['id'];
  label: string;
  rangeLabel: string;
  minHour: number;
  maxHour: number;
}> = [
  { id: 'madrugada', label: 'Madrugada', rangeLabel: '00:00 - 05:59', minHour: 0, maxHour: 5 },
  { id: 'manana', label: 'Mañana', rangeLabel: '06:00 - 11:59', minHour: 6, maxHour: 11 },
  { id: 'tarde', label: 'Tarde', rangeLabel: '12:00 - 17:59', minHour: 12, maxHour: 17 },
  { id: 'noche', label: 'Noche', rangeLabel: '18:00 - 23:59', minHour: 18, maxHour: 23 },
];

export const parseSafeTimestamp = (iso?: string | null): number | null => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
};

export const getOutageDurationInfo = (
  outage: PowerOutage,
  nowMs: number = Date.now()
): { minutes: number; isActive: boolean } => {
  const isActive = !outage.endTime;
  if (typeof outage.durationMinutes === 'number' && Number.isFinite(outage.durationMinutes) && outage.durationMinutes >= 0 && !isActive) {
    return { minutes: outage.durationMinutes, isActive: false };
  }
  const startMs = parseSafeTimestamp(outage.startTime);
  if (isActive) {
    if (startMs !== null) {
      return { minutes: Math.max(0, Math.round((nowMs - startMs) / 60000)), isActive: true };
    }
    return { minutes: Math.max(0, outage.durationMinutes || 0), isActive: true };
  }
  const endMs = parseSafeTimestamp(outage.endTime);
  if (startMs !== null && endMs !== null && endMs >= startMs) {
    return { minutes: Math.round((endMs - startMs) / 60000), isActive: false };
  }
  return { minutes: Math.max(0, outage.durationMinutes || 0), isActive: false };
};

export const formatMinutesDuration = (minutes: number): string => {
  const safeMins = Math.max(0, Math.round(minutes));
  if (safeMins < 60) {
    return `${safeMins} min`;
  }
  const hrs = Math.floor(safeMins / 60);
  const rem = safeMins % 60;
  return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
};

export const formatHoursMinutes = (minutes: number): string => {
  const hrs = minutes / 60;
  return `${hrs.toFixed(1)} h`;
};

export const formatSignedPct = (pct: number | null): string => {
  if (pct === null || !Number.isFinite(pct)) return '—';
  const rounded = Math.round(pct * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}%`;
  if (rounded < 0) return `${rounded.toFixed(1)}%`;
  return '0.0%';
};

const getTimeSlotId = (timestampMs: number): TimeSlotStats['id'] => {
  const hour = new Date(timestampMs).getHours();
  if (hour >= 0 && hour <= 5) return 'madrugada';
  if (hour >= 6 && hour <= 11) return 'manana';
  if (hour >= 12 && hour <= 17) return 'tarde';
  return 'noche';
};

const getPeriodStartMs = (period: AnalyticsPeriod, nowMs: number): number | null => {
  if (period === 'all') return null;
  if (period === '7d') return nowMs - 7 * MS_PER_DAY;
  if (period === '30d') return nowMs - 30 * MS_PER_DAY;
  if (period === '90d') return nowMs - 90 * MS_PER_DAY;
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
};

const resolveGeneratorCompany = (
  gen: Generator,
  companies: Company[]
): { key: string; name: string } => {
  if (gen.companyId) {
    const byId = companies.find((c) => c.id === gen.companyId);
    if (byId) return { key: byId.id, name: byId.name };
  }
  const rawName = gen.companyName?.trim();
  if (rawName) {
    const normalized = rawName.toLowerCase();
    const byName = companies.find((c) => c.name.trim().toLowerCase() === normalized);
    if (byName) return { key: byName.id, name: byName.name };
    return { key: `name:${normalized}`, name: rawName };
  }
  return { key: '__unassigned__', name: 'Sin Empresa Asignada' };
};

const resolveGeneratorDepartment = (
  gen: Generator,
  departments: Department[],
  companyName: string
): { key: string; name: string } => {
  if (gen.departmentId) {
    const byId = departments.find((d) => d.id === gen.departmentId);
    if (byId) return { key: byId.id, name: byId.name };
  }
  const rawName = gen.departmentName?.trim();
  if (rawName) {
    const normalized = rawName.toLowerCase();
    const byName = departments.find((d) => d.name.trim().toLowerCase() === normalized);
    if (byName) return { key: byName.id, name: byName.name };
    return { key: `dept:${companyName.toLowerCase()}:${normalized}`, name: rawName };
  }
  return { key: `dept:${companyName.toLowerCase()}:__none__`, name: 'Sin Departamento' };
};

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const getBucketDescriptor = (
  ms: number,
  granularity: 'day' | 'week' | 'month'
): { key: string; label: string } => {
  const d = new Date(ms);
  if (granularity === 'day') {
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const label = `${d.getDate()} ${MONTHS_SHORT_ES[d.getMonth()]}`;
    return { key, label };
  }
  if (granularity === 'week') {
    // Monday-based week start
    const dayOfWeek = d.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
    const key = `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`;
    const label = `Sem ${monday.getDate()} ${MONTHS_SHORT_ES[monday.getMonth()]}`;
    return { key, label };
  }
  const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  const label = `${MONTHS_SHORT_ES[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
  return { key, label };
};

const computeCompanyOutagesList = (
  generators: Generator[],
  horometerLogs: HorometerRecord[],
  outages: PowerOutage[],
  companies: Company[],
  effectiveDaysSpan: number,
  nowMs: number
): {
  list: CompanyOutageStats[];
  networkAvgOutageMinutes: number;
  networkAvgOutagesPerPlant: number;
} => {
  const genCompanyMap = new Map<string, { key: string; name: string }>();
  const companyMap = new Map<
    string,
    {
      companyKey: string;
      companyName: string;
      plantCount: number;
      totalCapacityKva: number;
      totalHorometerHours: number;
      periodLoggedHours: number;
      outageCount: number;
      activeCount: number;
      resolvedCount: number;
      totalOutageMinutes: number;
      durations: number[];
      atsStartedCount: number;
      slotCounts: Record<TimeSlotStats['id'], number>;
    }
  >();

  const ensureCompanyEntry = (key: string, name: string) => {
    let entry = companyMap.get(key);
    if (!entry) {
      entry = {
        companyKey: key,
        companyName: name,
        plantCount: 0,
        totalCapacityKva: 0,
        totalHorometerHours: 0,
        periodLoggedHours: 0,
        outageCount: 0,
        activeCount: 0,
        resolvedCount: 0,
        totalOutageMinutes: 0,
        durations: [],
        atsStartedCount: 0,
        slotCounts: { madrugada: 0, manana: 0, tarde: 0, noche: 0 },
      };
      companyMap.set(key, entry);
    }
    return entry;
  };

  for (const c of companies) {
    ensureCompanyEntry(c.id, c.name);
  }

  for (const g of generators) {
    const resolved = resolveGeneratorCompany(g, companies);
    genCompanyMap.set(g.id, resolved);
    const entry = ensureCompanyEntry(resolved.key, resolved.name);
    entry.plantCount += 1;
    entry.totalCapacityKva += Number(g.capacityKva || 0);
    entry.totalHorometerHours += Number(g.currentHours || 0);
  }

  for (const log of horometerLogs) {
    const comp = genCompanyMap.get(log.generatorId);
    if (!comp) continue;
    const entry = companyMap.get(comp.key);
    if (!entry) continue;
    const delta = Number(log.deltaHours || 0);
    if (delta > 0) entry.periodLoggedHours += delta;
  }

  let totalNetOutages = 0;
  let totalNetMinutes = 0;

  for (const o of outages) {
    const comp = genCompanyMap.get(o.generatorId) || { key: '__unassigned__', name: 'Sin Empresa Asignada' };
    const entry = ensureCompanyEntry(comp.key, comp.name);
    const dur = getOutageDurationInfo(o, nowMs);

    entry.outageCount += 1;
    if (dur.isActive) entry.activeCount += 1;
    else entry.resolvedCount += 1;

    entry.totalOutageMinutes += dur.minutes;
    entry.durations.push(dur.minutes);
    if (o.generatorStarted) entry.atsStartedCount += 1;

    const startMs = parseSafeTimestamp(o.startTime) ?? parseSafeTimestamp(o.createdAt);
    if (startMs !== null) {
      const slot = getTimeSlotId(startMs);
      entry.slotCounts[slot] += 1;
    }

    totalNetOutages += 1;
    totalNetMinutes += dur.minutes;
  }

  const networkAvgOutageMinutes = totalNetOutages > 0 ? totalNetMinutes / totalNetOutages : 0;
  const networkAvgOutagesPerPlant = generators.length > 0 ? totalNetOutages / generators.length : 0;

  const list: CompanyOutageStats[] = Array.from(companyMap.values()).map((e) => {
    const avgOutageMinutes = e.outageCount > 0 ? e.totalOutageMinutes / e.outageCount : 0;
    const maxOutageMinutes = e.durations.length > 0 ? Math.max(...e.durations) : 0;
    const minOutageMinutes = e.durations.length > 0 ? Math.min(...e.durations) : 0;
    const avgOutagesPerPlant = e.plantCount > 0 ? e.outageCount / e.plantCount : 0;
    const avgOutageMinutesPerWeek = (e.totalOutageMinutes / Math.max(1, effectiveDaysSpan)) * 7;
    const atsRatePct = e.outageCount > 0 ? (e.atsStartedCount / e.outageCount) * 100 : 0;
    const avgHorometerPerPlant = e.plantCount > 0 ? e.totalHorometerHours / e.plantCount : 0;

    let peakSlotName = 'Sin datos';
    let bestCount = 0;
    for (const def of TIME_SLOT_DEFS) {
      const count = e.slotCounts[def.id];
      if (count > bestCount) {
        bestCount = count;
        peakSlotName = `${def.label} (${def.rangeLabel})`;
      }
    }

    const vsNetworkAvgDurationPct =
      networkAvgOutageMinutes > 0 && e.outageCount > 0
        ? ((avgOutageMinutes - networkAvgOutageMinutes) / networkAvgOutageMinutes) * 100
        : null;

    const vsNetworkAvgOutagesPerPlantPct =
      networkAvgOutagesPerPlant > 0 && e.plantCount > 0
        ? ((avgOutagesPerPlant - networkAvgOutagesPerPlant) / networkAvgOutagesPerPlant) * 100
        : null;

    return {
      companyKey: e.companyKey,
      companyName: e.companyName,
      plantCount: e.plantCount,
      totalCapacityKva: e.totalCapacityKva,
      totalHorometerHours: e.totalHorometerHours,
      avgHorometerPerPlant,
      periodLoggedHours: e.periodLoggedHours,
      outageCount: e.outageCount,
      activeCount: e.activeCount,
      resolvedCount: e.resolvedCount,
      totalOutageMinutes: e.totalOutageMinutes,
      avgOutageMinutes,
      maxOutageMinutes,
      minOutageMinutes,
      avgOutagesPerPlant,
      avgOutageMinutesPerWeek,
      atsStartedCount: e.atsStartedCount,
      atsRatePct,
      peakTimeSlot: peakSlotName,
      vsNetworkAvgDurationPct,
      vsNetworkAvgOutagesPerPlantPct,
    };
  });

  // Sort by average outage duration desc, then outage count desc, then name
  list.sort((a, b) => {
    if (b.avgOutageMinutes !== a.avgOutageMinutes) return b.avgOutageMinutes - a.avgOutageMinutes;
    if (b.outageCount !== a.outageCount) return b.outageCount - a.outageCount;
    return a.companyName.localeCompare(b.companyName);
  });

  return { list, networkAvgOutageMinutes, networkAvgOutagesPerPlant };
};

export const computeFleetAnalytics = (input: FleetAnalyticsInput): FleetAnalyticsResult => {
  const {
    generators,
    horometerLogs,
    outages,
    services,
    companies,
    departments,
    appUsers,
    period = 'all',
    companyFilterId = 'all',
    nowMs = Date.now(),
  } = input;

  const periodStartMs = getPeriodStartMs(period, nowMs);

  const inPeriod = (iso?: string | null): boolean => {
    if (periodStartMs === null) return true;
    const ms = parseSafeTimestamp(iso);
    if (ms === null) return false;
    return ms >= periodStartMs && ms <= nowMs + 60_000;
  };

  // Company dropdown options (always across entire registered fleet)
  const optionCountMap = new Map<string, { key: string; name: string; plantCount: number }>();
  for (const c of companies) {
    optionCountMap.set(c.id, { key: c.id, name: c.name, plantCount: 0 });
  }
  const genCompanyResolved = new Map<string, { key: string; name: string }>();
  for (const g of generators) {
    const resolved = resolveGeneratorCompany(g, companies);
    genCompanyResolved.set(g.id, resolved);
    const prev = optionCountMap.get(resolved.key);
    if (prev) {
      prev.plantCount += 1;
    } else {
      optionCountMap.set(resolved.key, { key: resolved.key, name: resolved.name, plantCount: 1 });
    }
  }
  const companyOptions: CompanyOption[] = Array.from(optionCountMap.values()).sort((a, b) => {
    if (a.key === '__unassigned__') return 1;
    if (b.key === '__unassigned__') return -1;
    return a.name.localeCompare(b.name);
  });

  // Scope generators by selected company
  const scopedGenerators =
    companyFilterId === 'all'
      ? generators
      : generators.filter((g) => genCompanyResolved.get(g.id)?.key === companyFilterId);

  const scopedGenIdSet = new Set(scopedGenerators.map((g) => g.id));
  const allGenIdSet = new Set(generators.map((g) => g.id));

  // Period-filtered logs/outages/services across entire fleet (needed for network averages)
  const periodLogsAll = horometerLogs.filter(
    (l) => allGenIdSet.has(l.generatorId) && inPeriod(l.date || l.createdAt)
  );
  const periodOutagesAll = outages.filter(
    (o) => (allGenIdSet.has(o.generatorId) || companyFilterId === 'all') && inPeriod(o.startTime || o.createdAt)
  );

  // Scope-filtered events
  const periodLogs =
    companyFilterId === 'all'
      ? periodLogsAll
      : periodLogsAll.filter((l) => scopedGenIdSet.has(l.generatorId));

  const periodOutages =
    companyFilterId === 'all'
      ? periodOutagesAll
      : periodOutagesAll.filter((o) => scopedGenIdSet.has(o.generatorId));

  const periodServices = services.filter((s) => {
    if (companyFilterId !== 'all' && !scopedGenIdSet.has(s.generatorId)) return false;
    return inPeriod(s.date || s.createdAt);
  });

  // Determine effective days span in selected window
  let effectiveDaysSpan = 1;
  if (period === '7d') effectiveDaysSpan = 7;
  else if (period === '30d') effectiveDaysSpan = 30;
  else if (period === '90d') effectiveDaysSpan = 90;
  else if (period === 'month') {
    effectiveDaysSpan = Math.max(1, new Date(nowMs).getDate());
  } else {
    const timestamps: number[] = [];
    for (const l of periodLogs) {
      const ms = parseSafeTimestamp(l.date || l.createdAt);
      if (ms !== null) timestamps.push(ms);
    }
    for (const o of periodOutages) {
      const ms = parseSafeTimestamp(o.startTime || o.createdAt);
      if (ms !== null) timestamps.push(ms);
    }
    for (const s of periodServices) {
      const ms = parseSafeTimestamp(s.date || s.createdAt);
      if (ms !== null) timestamps.push(ms);
    }
    for (const g of scopedGenerators) {
      const ms = parseSafeTimestamp(g.createdAt);
      if (ms !== null) timestamps.push(ms);
    }
    if (timestamps.length > 0) {
      const earliest = Math.min(...timestamps);
      effectiveDaysSpan = Math.max(1, Math.ceil((nowMs - earliest) / MS_PER_DAY));
    }
  }

  // Compute network-wide company stats (for benchmark comparison)
  const networkCompanyCalc = computeCompanyOutagesList(
    generators,
    periodLogsAll,
    periodOutagesAll,
    companies,
    effectiveDaysSpan,
    nowMs
  );

  const companyOutages =
    companyFilterId === 'all'
      ? networkCompanyCalc.list
      : networkCompanyCalc.list.filter((c) => c.companyKey === companyFilterId);

  // Fleet Overview Stats
  let runningPlants = 0;
  let standbyPlants = 0;
  let maintenancePlants = 0;
  let offlinePlants = 0;
  let totalCapacityKva = 0;
  let totalHorometerHours = 0;
  let totalHealthPct = 0;
  let plantsDueSoonOrOverdue = 0;

  for (const g of scopedGenerators) {
    if (g.status === 'running') runningPlants += 1;
    else if (g.status === 'standby') standbyPlants += 1;
    else if (g.status === 'maintenance') maintenancePlants += 1;
    else if (g.status === 'offline') offlinePlants += 1;

    totalCapacityKva += Number(g.capacityKva || 0);
    totalHorometerHours += Number(g.currentHours || 0);

    const interval = g.serviceIntervalHours || 200;
    const safeLast = g.lastServiceHours <= g.currentHours ? g.lastServiceHours : g.currentHours;
    const operated = Math.max(0, g.currentHours - safeLast);
    const remaining = interval - operated;
    if (remaining <= 25) plantsDueSoonOrOverdue += 1;
    totalHealthPct += calculateWearPercentage(g.currentHours, safeLast, interval);
  }

  const totalPlants = scopedGenerators.length;
  const avgHorometerHours = totalPlants > 0 ? totalHorometerHours / totalPlants : 0;
  const maxHorometerHours =
    totalPlants > 0 ? Math.max(...scopedGenerators.map((g) => Number(g.currentHours || 0))) : 0;
  const minHorometerHours =
    totalPlants > 0 ? Math.min(...scopedGenerators.map((g) => Number(g.currentHours || 0))) : 0;

  const periodLoggedHours = periodLogs.reduce(
    (sum, l) => sum + (Number(l.deltaHours || 0) > 0 ? Number(l.deltaHours || 0) : 0),
    0
  );
  const horometerLogsCount = periodLogs.length;
  const avgHoursPerLog = horometerLogsCount > 0 ? periodLoggedHours / horometerLogsCount : 0;
  const avgHoursPerDayFleet = effectiveDaysSpan > 0 ? periodLoggedHours / effectiveDaysSpan : 0;
  const avgHoursPerPlantPerDay = totalPlants > 0 ? avgHoursPerDayFleet / totalPlants : 0;

  let activeOutagesCount = 0;
  let resolvedOutagesCount = 0;
  let totalOutageMinutes = 0;
  let atsStartedCount = 0;
  const outageDurations: number[] = [];

  for (const o of periodOutages) {
    const dur = getOutageDurationInfo(o, nowMs);
    if (dur.isActive) activeOutagesCount += 1;
    else resolvedOutagesCount += 1;
    totalOutageMinutes += dur.minutes;
    outageDurations.push(dur.minutes);
    if (o.generatorStarted) atsStartedCount += 1;
  }

  const outagesCount = periodOutages.length;
  const avgOutageMinutes = outagesCount > 0 ? totalOutageMinutes / outagesCount : 0;
  const maxOutageMinutes = outageDurations.length > 0 ? Math.max(...outageDurations) : 0;
  const minOutageMinutes = outageDurations.length > 0 ? Math.min(...outageDurations) : 0;
  const outagesPerWeek = (outagesCount / Math.max(1, effectiveDaysSpan)) * 7;
  const atsSuccessRatePct = outagesCount > 0 ? (atsStartedCount / outagesCount) * 100 : 0;
  const avgFleetHealthPct = totalPlants > 0 ? totalHealthPct / totalPlants : 100;

  // Per-Plant Usage & Comparisons
  const logsByGen = new Map<string, HorometerRecord[]>();
  for (const l of periodLogs) {
    const arr = logsByGen.get(l.generatorId);
    if (arr) arr.push(l);
    else logsByGen.set(l.generatorId, [l]);
  }

  const outagesByGen = new Map<string, PowerOutage[]>();
  for (const o of periodOutages) {
    const arr = outagesByGen.get(o.generatorId);
    if (arr) arr.push(o);
    else outagesByGen.set(o.generatorId, [o]);
  }

  const servicesByGen = new Map<string, GeneratorService[]>();
  for (const s of periodServices) {
    const arr = servicesByGen.get(s.generatorId);
    if (arr) arr.push(s);
    else servicesByGen.set(s.generatorId, [s]);
  }

  const fleetAvgPeriodHours = totalPlants > 0 ? periodLoggedHours / totalPlants : 0;

  const plantUsageRaw: PlantUsageStats[] = scopedGenerators.map((g) => {
    const comp = genCompanyResolved.get(g.id) || { key: '__unassigned__', name: 'Sin Empresa Asignada' };
    const dept = resolveGeneratorDepartment(g, departments, comp.name);
    const gLogs = logsByGen.get(g.id) || [];
    const gOutages = outagesByGen.get(g.id) || [];
    const gServices = servicesByGen.get(g.id) || [];

    const periodHrs = gLogs.reduce(
      (sum, l) => sum + (Number(l.deltaHours || 0) > 0 ? Number(l.deltaHours || 0) : 0),
      0
    );
    const avgHrsLog = gLogs.length > 0 ? periodHrs / gLogs.length : 0;
    const avgHrsDay = effectiveDaysSpan > 0 ? periodHrs / effectiveDaysSpan : 0;

    let gActiveOutages = 0;
    let gOutageMins = 0;
    let gAtsStarted = 0;
    for (const o of gOutages) {
      const dur = getOutageDurationInfo(o, nowMs);
      if (dur.isActive) gActiveOutages += 1;
      gOutageMins += dur.minutes;
      if (o.generatorStarted) gAtsStarted += 1;
    }

    const gAvgOutageMins = gOutages.length > 0 ? gOutageMins / gOutages.length : 0;
    const gAtsRate = gOutages.length > 0 ? (gAtsStarted / gOutages.length) * 100 : 0;

    const interval = g.serviceIntervalHours || 200;
    const safeLast = g.lastServiceHours <= g.currentHours ? g.lastServiceHours : g.currentHours;
    const operated = Math.max(0, g.currentHours - safeLast);
    const remaining = interval - operated;
    const healthRemainingPct = calculateWearPercentage(g.currentHours, safeLast, interval);
    const serviceCycleUsedPct = interval > 0 ? Math.round((operated / interval) * 100) : 0;
    const svcStatus = getServiceStatus(remaining).status;

    const shareOfFleetHoursPct =
      totalHorometerHours > 0 ? (g.currentHours / totalHorometerHours) * 100 : 0;
    const vsFleetAvgHorometerPct =
      avgHorometerHours > 0 ? ((g.currentHours - avgHorometerHours) / avgHorometerHours) * 100 : null;
    const vsFleetAvgPeriodHoursPct =
      fleetAvgPeriodHours > 0 ? ((periodHrs - fleetAvgPeriodHours) / fleetAvgPeriodHours) * 100 : null;

    return {
      generatorId: g.id,
      name: g.name,
      brand: g.brand,
      model: g.model,
      capacityKva: g.capacityKva,
      fuelType: g.fuelType,
      status: g.status,
      companyKey: comp.key,
      companyName: comp.name,
      departmentName: dept.name,
      currentHours: g.currentHours,
      shareOfFleetHoursPct,
      vsFleetAvgHorometerPct,
      periodLoggedHours: periodHrs,
      logsCount: gLogs.length,
      avgHoursPerLog: avgHrsLog,
      avgHoursPerDay: avgHrsDay,
      vsFleetAvgPeriodHoursPct,
      outagesCount: gOutages.length,
      activeOutagesCount: gActiveOutages,
      outageMinutes: gOutageMins,
      avgOutageMinutes: gAvgOutageMins,
      atsStartedCount: gAtsStarted,
      atsRatePct: gAtsRate,
      servicesCount: gServices.length,
      lastServiceHours: safeLast,
      serviceIntervalHours: interval,
      hoursOperatedInCycle: operated,
      hoursRemaining: remaining,
      healthRemainingPct,
      serviceCycleUsedPct,
      serviceStatus: svcStatus,
      usageRank: 1,
    };
  });

  plantUsageRaw.sort((a, b) => {
    if (b.currentHours !== a.currentHours) return b.currentHours - a.currentHours;
    if (b.periodLoggedHours !== a.periodLoggedHours) return b.periodLoggedHours - a.periodLoggedHours;
    return a.name.localeCompare(b.name);
  });

  const plantUsage = plantUsageRaw.map((p, idx) => ({
    ...p,
    usageRank: idx + 1,
  }));

  // Chronological Timeline
  const timelineGranularity: 'day' | 'week' | 'month' =
    period === '7d'
      ? 'day'
      : period === '30d' || period === 'month' || period === '90d'
      ? 'week'
      : effectiveDaysSpan <= 21
      ? 'day'
      : effectiveDaysSpan <= 140
      ? 'week'
      : 'month';

  const bucketMap = new Map<string, TimelineBucket>();
  const ensureBucket = (key: string, label: string): TimelineBucket => {
    let b = bucketMap.get(key);
    if (!b) {
      b = { key, label, horometerLoggedHours: 0, outagesCount: 0, outageMinutes: 0, servicesCount: 0 };
      bucketMap.set(key, b);
    }
    return b;
  };

  if (period === '7d') {
    for (let i = 6; i >= 0; i -= 1) {
      const desc = getBucketDescriptor(nowMs - i * MS_PER_DAY, 'day');
      ensureBucket(desc.key, desc.label);
    }
  }

  for (const l of periodLogs) {
    const ms = parseSafeTimestamp(l.date || l.createdAt);
    if (ms === null) continue;
    const desc = getBucketDescriptor(ms, timelineGranularity);
    const b = ensureBucket(desc.key, desc.label);
    const delta = Number(l.deltaHours || 0);
    if (delta > 0) b.horometerLoggedHours += delta;
  }

  for (const o of periodOutages) {
    const ms = parseSafeTimestamp(o.startTime || o.createdAt);
    if (ms === null) continue;
    const desc = getBucketDescriptor(ms, timelineGranularity);
    const b = ensureBucket(desc.key, desc.label);
    const dur = getOutageDurationInfo(o, nowMs);
    b.outagesCount += 1;
    b.outageMinutes += dur.minutes;
  }

  for (const s of periodServices) {
    const ms = parseSafeTimestamp(s.date || s.createdAt);
    if (ms === null) continue;
    const desc = getBucketDescriptor(ms, timelineGranularity);
    const b = ensureBucket(desc.key, desc.label);
    b.servicesCount += 1;
  }

  const timeline = Array.from(bucketMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-14);

  // Time Slot Outage Distribution
  const slotTotals: Record<TimeSlotStats['id'], { count: number; totalMinutes: number }> = {
    madrugada: { count: 0, totalMinutes: 0 },
    manana: { count: 0, totalMinutes: 0 },
    tarde: { count: 0, totalMinutes: 0 },
    noche: { count: 0, totalMinutes: 0 },
  };

  for (const o of periodOutages) {
    const ms = parseSafeTimestamp(o.startTime || o.createdAt);
    if (ms === null) continue;
    const slotId = getTimeSlotId(ms);
    const dur = getOutageDurationInfo(o, nowMs);
    slotTotals[slotId].count += 1;
    slotTotals[slotId].totalMinutes += dur.minutes;
  }

  const timeSlots: TimeSlotStats[] = TIME_SLOT_DEFS.map((def) => {
    const data = slotTotals[def.id];
    return {
      id: def.id,
      label: def.label,
      rangeLabel: def.rangeLabel,
      count: data.count,
      sharePct: outagesCount > 0 ? (data.count / outagesCount) * 100 : 0,
      totalMinutes: data.totalMinutes,
      avgMinutes: data.count > 0 ? data.totalMinutes / data.count : 0,
    };
  });

  // Department Breakdown
  const deptMap = new Map<string, DepartmentStats>();
  for (const p of plantUsage) {
    const g = scopedGenerators.find((item) => item.id === p.generatorId);
    if (!g) continue;
    const dept = resolveGeneratorDepartment(g, departments, p.companyName);
    const existing = deptMap.get(dept.key);
    if (existing) {
      existing.plantCount += 1;
      existing.totalHorometerHours += p.currentHours;
      existing.periodLoggedHours += p.periodLoggedHours;
      existing.outageCount += p.outagesCount;
      existing.totalOutageMinutes += p.outageMinutes;
      existing.servicesCount += p.servicesCount;
    } else {
      deptMap.set(dept.key, {
        departmentKey: dept.key,
        departmentName: dept.name,
        companyName: p.companyName,
        plantCount: 1,
        totalHorometerHours: p.currentHours,
        periodLoggedHours: p.periodLoggedHours,
        outageCount: p.outagesCount,
        totalOutageMinutes: p.outageMinutes,
        avgOutageMinutes: 0,
        servicesCount: p.servicesCount,
      });
    }
  }
  const deptStatsList: DepartmentStats[] = Array.from(deptMap.values())
    .map((d) => ({
      ...d,
      avgOutageMinutes: d.outageCount > 0 ? d.totalOutageMinutes / d.outageCount : 0,
    }))
    .sort((a, b) => {
      if (b.totalOutageMinutes !== a.totalOutageMinutes) return b.totalOutageMinutes - a.totalOutageMinutes;
      return b.totalHorometerHours - a.totalHorometerHours;
    });

  // Maintenance / Service Type Breakdown
  const serviceTypeCounts = new Map<string, number>();
  for (const s of periodServices) {
    const st = s.serviceType || 'other';
    serviceTypeCounts.set(st, (serviceTypeCounts.get(st) || 0) + 1);
  }
  const serviceTypes: ServiceTypeStats[] = Array.from(serviceTypeCounts.entries())
    .map(([serviceType, count]) => ({
      serviceType,
      label: COMPONENT_NAMES[serviceType] || serviceType,
      iconName: COMPONENT_ICONS[serviceType] || 'build',
      count,
      sharePct: periodServices.length > 0 ? (count / periodServices.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Fuel Breakdown
  const fuelMap = new Map<FuelType, FuelBreakdownStats>();
  for (const p of plantUsage) {
    const existing = fuelMap.get(p.fuelType);
    if (existing) {
      existing.plantCount += 1;
      existing.totalCapacityKva += p.capacityKva;
      existing.totalHorometerHours += p.currentHours;
      existing.outageCount += p.outagesCount;
      existing.totalOutageMinutes += p.outageMinutes;
    } else {
      fuelMap.set(p.fuelType, {
        fuelType: p.fuelType,
        label: FUEL_LABELS[p.fuelType] || p.fuelType,
        plantCount: 1,
        totalCapacityKva: p.capacityKva,
        totalHorometerHours: p.currentHours,
        avgHorometerHours: 0,
        outageCount: p.outagesCount,
        totalOutageMinutes: p.outageMinutes,
      });
    }
  }
  const fuelBreakdown = Array.from(fuelMap.values())
    .map((f) => ({
      ...f,
      avgHorometerHours: f.plantCount > 0 ? f.totalHorometerHours / f.plantCount : 0,
    }))
    .sort((a, b) => b.plantCount - a.plantCount);

  // Operator Activity Breakdown
  const userById = new Map<string, AppUser>();
  const userByEmail = new Map<string, AppUser>();
  for (const u of appUsers) {
    if (u.id) userById.set(u.id, u);
    if (u.email) userByEmail.set(u.email.toLowerCase(), u);
  }

  const operatorMap = new Map<string, OperatorActivityStats>();
  const resolveOperatorEntry = (userId?: string, userEmail?: string): OperatorActivityStats => {
    const emailLower = userEmail?.trim().toLowerCase();
    const matched =
      (userId && userById.get(userId)) || (emailLower && userByEmail.get(emailLower)) || undefined;

    const key = matched?.id || (emailLower ? `email:${emailLower}` : userId ? `uid:${userId}` : 'unknown');
    let entry = operatorMap.get(key);
    if (!entry) {
      entry = {
        key,
        name: matched?.fullName || (userEmail ? userEmail.split('@')[0] : 'Sistema / Operador'),
        email: matched?.email || userEmail || 'Sin correo registrado',
        role: matched?.role || 'operador',
        horometerLogsCount: 0,
        loggedHours: 0,
        outagesReportedCount: 0,
        servicesRecordedCount: 0,
        totalActions: 0,
      };
      operatorMap.set(key, entry);
    }
    return entry;
  };

  for (const l of periodLogs) {
    const op = resolveOperatorEntry(l.userId, l.userEmail);
    op.horometerLogsCount += 1;
    const delta = Number(l.deltaHours || 0);
    if (delta > 0) op.loggedHours += delta;
    op.totalActions += 1;
  }

  for (const o of periodOutages) {
    const op = resolveOperatorEntry(o.userId, o.userEmail);
    op.outagesReportedCount += 1;
    op.totalActions += 1;
  }

  for (const s of periodServices) {
    const op = resolveOperatorEntry(s.userId, s.userEmail);
    op.servicesRecordedCount += 1;
    op.totalActions += 1;
  }

  const operators = Array.from(operatorMap.values()).sort((a, b) => {
    if (b.totalActions !== a.totalActions) return b.totalActions - a.totalActions;
    return b.loggedHours - a.loggedHours;
  });

  return {
    period,
    companyFilterId,
    companyOptions,
    overview: {
      totalPlants,
      runningPlants,
      standbyPlants,
      maintenancePlants,
      offlinePlants,
      totalCapacityKva,
      totalHorometerHours,
      avgHorometerHours,
      maxHorometerHours,
      minHorometerHours,
      periodLoggedHours,
      horometerLogsCount,
      avgHoursPerLog,
      avgHoursPerDayFleet,
      avgHoursPerPlantPerDay,
      outagesCount,
      activeOutagesCount,
      resolvedOutagesCount,
      totalOutageMinutes,
      avgOutageMinutes,
      maxOutageMinutes,
      minOutageMinutes,
      outagesPerWeek,
      atsStartedCount,
      atsSuccessRatePct,
      servicesCount: periodServices.length,
      avgFleetHealthPct,
      plantsDueSoonOrOverdue,
      effectiveDaysSpan,
      networkAvgOutageMinutes: networkCompanyCalc.networkAvgOutageMinutes,
      networkAvgOutagesPerPlant: networkCompanyCalc.networkAvgOutagesPerPlant,
    },
    companyOutages,
    allCompanyOutages: networkCompanyCalc.list,
    plantUsage,
    timeline,
    timelineGranularity,
    timeSlots,
    departments: deptStatsList,
    serviceTypes,
    fuelBreakdown,
    operators,
  };
};

const csvEscape = (value: string | number): string => {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const buildAnalyticsCsv = (analytics: FleetAnalyticsResult): string => {
  const lines: string[] = [];

  lines.push('REPORTE ESTADISTICO EDV MONITOR - CORTES POR EMPRESA');
  lines.push(
    [
      'Empresa',
      'Plantas',
      'Capacidad kVA',
      'Cortes Totales',
      'Cortes Activos',
      'Promedio Cortes / Planta',
      'Tiempo Total Cortes (min)',
      'Duracion Promedio / Corte (min)',
      'Duracion Max (min)',
      'Comparativa vs Promedio Red (%)',
      'Tasa Arranque ATS (%)',
      'Franja Horaria Pico',
    ]
      .map(csvEscape)
      .join(',')
  );

  for (const c of analytics.companyOutages) {
    lines.push(
      [
        c.companyName,
        c.plantCount,
        c.totalCapacityKva,
        c.outageCount,
        c.activeCount,
        c.avgOutagesPerPlant.toFixed(2),
        Math.round(c.totalOutageMinutes),
        Math.round(c.avgOutageMinutes),
        Math.round(c.maxOutageMinutes),
        c.vsNetworkAvgDurationPct === null ? 'N/A' : c.vsNetworkAvgDurationPct.toFixed(1),
        c.atsRatePct.toFixed(1),
        c.peakTimeSlot,
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  lines.push('');
  lines.push('USO PROMEDIO Y COMPARATIVA DE PLANTAS ELECTRICAS');
  lines.push(
    [
      'Ranking',
      'Planta',
      'Marca / Modelo',
      'Empresa',
      'Departamento',
      'kVA',
      'Horometro Actual (h)',
      'Participacion Flota (%)',
      'vs Promedio Horometro Flota (%)',
      'Horas Registradas Periodo (h)',
      'Promedio Horas / Dia (h)',
      'Promedio Horas / Registro (h)',
      'Cortes Atendidos',
      'Tiempo Cortes (min)',
      'Servicios Realizados',
      'Vida Restante Servicio (%)',
    ]
      .map(csvEscape)
      .join(',')
  );

  for (const p of analytics.plantUsage) {
    lines.push(
      [
        p.usageRank,
        p.name,
        `${p.brand} ${p.model}`,
        p.companyName,
        p.departmentName,
        p.capacityKva,
        p.currentHours.toFixed(1),
        p.shareOfFleetHoursPct.toFixed(1),
        p.vsFleetAvgHorometerPct === null ? 'N/A' : p.vsFleetAvgHorometerPct.toFixed(1),
        p.periodLoggedHours.toFixed(1),
        p.avgHoursPerDay.toFixed(2),
        p.avgHoursPerLog.toFixed(2),
        p.outagesCount,
        Math.round(p.outageMinutes),
        p.servicesCount,
        p.healthRemainingPct,
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  return '\uFEFF' + lines.join('\r\n');
};
