import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import {
  AnalyticsPeriod,
  CompanyOutageStats,
  FleetAnalyticsResult,
  PlantUsageStats,
  buildAnalyticsCsv,
  computeFleetAnalytics,
  formatHoursMinutes,
  formatMinutesDuration,
  formatSignedPct,
} from '../../../domain/analytics/fleetAnalytics';
import {
  AppUser,
  Company,
  Department,
  Generator,
  GeneratorService,
  HorometerRecord,
  PowerOutage,
} from '../../../domain/entities/Generator';

interface AnalyticsDashboardSectionProps {
  generators: Generator[];
  horometerLogs: HorometerRecord[];
  outages: PowerOutage[];
  services: GeneratorService[];
  companies: Company[];
  departments: Department[];
  appUsers: AppUser[];
  isDark: boolean;
  colors: {
    primary: string;
    onSurface: string;
    onSurfaceVariant: string;
    surface: string;
  };
  onNavigateTab?: (tab: 'outages' | 'horometers' | 'services' | 'generators' | 'companies') => void;
  onNotify?: (title: string, msg: string) => void;
}

type CompanySortMetric = 'avgDuration' | 'totalOutages' | 'totalTime' | 'atsRate';
type PlantCompareMetric = 'currentHours' | 'avgHoursPerDay' | 'periodLoggedHours' | 'outageMinutes' | 'serviceCycleUsedPct';

const F = {
  bold: 'Montserrat_700Bold',
  semibold: 'Montserrat_600SemiBold',
  medium: 'Montserrat_500Medium',
  regular: 'Montserrat_400Regular',
  extrabold: 'Montserrat_800ExtraBold',
};

const PERIOD_OPTIONS: Array<{ id: AnalyticsPeriod; label: string }> = [
  { id: 'all', label: 'Todo el Historial' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: 'month', label: 'Este Mes' },
  { id: '90d', label: 'Últimos 90 días' },
];

const PLANT_METRIC_OPTIONS: Array<{ id: PlantCompareMetric; label: string; shortUnit: string }> = [
  { id: 'currentHours', label: 'Horómetro Acumulado', shortUnit: 'h' },
  { id: 'avgHoursPerDay', label: 'Uso Diario Promedio', shortUnit: 'h/día' },
  { id: 'periodLoggedHours', label: 'Horas en Período', shortUnit: 'h' },
  { id: 'outageMinutes', label: 'Respaldo en Cortes', shortUnit: 'min' },
  { id: 'serviceCycleUsedPct', label: 'Uso Ciclo Servicio', shortUnit: '%' },
];

const COMPANY_SORT_OPTIONS: Array<{ id: CompanySortMetric; label: string }> = [
  { id: 'avgDuration', label: 'Duración Promedio' },
  { id: 'totalOutages', label: 'Cantidad de Cortes' },
  { id: 'totalTime', label: 'Tiempo Total Sin Red' },
  { id: 'atsRate', label: 'Tasa ATS' },
];

const statusLabelMap: Record<Generator['status'], { label: string; color: string }> = {
  running: { label: 'En Carga', color: '#10B981' },
  standby: { label: 'En Espera', color: '#3B82F6' },
  maintenance: { label: 'Mantenimiento', color: '#F59E0B' },
  offline: { label: 'Fuera de Línea', color: '#EF4444' },
};

const getPlantMetricValue = (p: PlantUsageStats, metric: PlantCompareMetric): number => {
  switch (metric) {
    case 'currentHours':
      return p.currentHours;
    case 'avgHoursPerDay':
      return p.avgHoursPerDay;
    case 'periodLoggedHours':
      return p.periodLoggedHours;
    case 'outageMinutes':
      return p.outageMinutes;
    case 'serviceCycleUsedPct':
      return p.serviceCycleUsedPct;
  }
};

const formatPlantMetricValue = (val: number, metric: PlantCompareMetric): string => {
  if (metric === 'outageMinutes') return formatMinutesDuration(val);
  if (metric === 'serviceCycleUsedPct') return `${Math.round(val)}%`;
  if (metric === 'avgHoursPerDay') return `${val.toFixed(2)} h/d`;
  return `${val.toFixed(1)} h`;
};

const getDeltaTone = (pct: number | null, inverseGood = false): { color: string; bg: string } => {
  if (pct === null || Math.abs(pct) < 1) {
    return { color: '#64748B', bg: 'rgba(100,116,139,0.12)' };
  }
  const isPositive = pct > 0;
  const good = inverseGood ? !isPositive : isPositive;
  if (good) {
    return { color: '#059669', bg: 'rgba(16,185,129,0.13)' };
  }
  return { color: '#D97706', bg: 'rgba(245,158,11,0.14)' };
};

export const AnalyticsDashboardSection: React.FC<AnalyticsDashboardSectionProps> = ({
  generators,
  horometerLogs,
  outages,
  services,
  companies,
  departments,
  appUsers,
  isDark,
  colors,
  onNavigateTab,
  onNotify,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1180;

  const [period, setPeriod] = useState<AnalyticsPeriod>('all');
  const [companyFilterId, setCompanyFilterId] = useState<string>('all');
  const [companySort, setCompanySort] = useState<CompanySortMetric>('avgDuration');
  const [plantMetric, setPlantMetric] = useState<PlantCompareMetric>('currentHours');
  const [comparePlantAId, setComparePlantAId] = useState<string>('');
  const [comparePlantBId, setComparePlantBId] = useState<string>('');

  const cardBg = isDark ? '#001136' : '#FFFFFF';
  const subSurfaceBg = isDark ? '#0a2558' : '#F4F6FA';
  const borderCol = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.09)';
  const textPrimary = colors.onSurface;
  const textSecondary = colors.onSurfaceVariant;
  const accentPrimary = colors.primary;

  const analytics: FleetAnalyticsResult = useMemo(
    () =>
      computeFleetAnalytics({
        generators,
        horometerLogs,
        outages,
        services,
        companies,
        departments,
        appUsers,
        period,
        companyFilterId,
      }),
    [generators, horometerLogs, outages, services, companies, departments, appUsers, period, companyFilterId]
  );

  // Sorted company outages according to chosen criterion
  const sortedCompanies = useMemo(() => {
    const copy = [...analytics.companyOutages];
    copy.sort((a, b) => {
      if (companySort === 'avgDuration') {
        if (b.avgOutageMinutes !== a.avgOutageMinutes) return b.avgOutageMinutes - a.avgOutageMinutes;
        return b.outageCount - a.outageCount;
      }
      if (companySort === 'totalOutages') {
        if (b.outageCount !== a.outageCount) return b.outageCount - a.outageCount;
        return b.totalOutageMinutes - a.totalOutageMinutes;
      }
      if (companySort === 'totalTime') {
        if (b.totalOutageMinutes !== a.totalOutageMinutes) return b.totalOutageMinutes - a.totalOutageMinutes;
        return b.outageCount - a.outageCount;
      }
      if (b.atsRatePct !== a.atsRatePct) return b.atsRatePct - a.atsRatePct;
      return b.outageCount - a.outageCount;
    });
    return copy;
  }, [analytics.companyOutages, companySort]);

  // Sorted plants according to selected comparative metric
  const sortedPlants = useMemo(() => {
    const copy = [...analytics.plantUsage];
    copy.sort((a, b) => getPlantMetricValue(b, plantMetric) - getPlantMetricValue(a, plantMetric));
    return copy;
  }, [analytics.plantUsage, plantMetric]);

  const plantMetricAvg = useMemo(() => {
    if (sortedPlants.length === 0) return 0;
    const sum = sortedPlants.reduce((acc, p) => acc + getPlantMetricValue(p, plantMetric), 0);
    return sum / sortedPlants.length;
  }, [sortedPlants, plantMetric]);

  const plantMetricMax = useMemo(() => {
    if (sortedPlants.length === 0) return 1;
    const m = Math.max(...sortedPlants.map((p) => getPlantMetricValue(p, plantMetric)), plantMetricAvg);
    return m > 0 ? m : 1;
  }, [sortedPlants, plantMetric, plantMetricAvg]);

  // Resolve 1-to-1 comparator plants safely
  const resolvedPlantA = useMemo(() => {
    if (analytics.plantUsage.length === 0) return null;
    return (
      analytics.plantUsage.find((p) => p.generatorId === comparePlantAId) ||
      analytics.plantUsage[0]
    );
  }, [analytics.plantUsage, comparePlantAId]);

  const resolvedPlantB = useMemo(() => {
    if (analytics.plantUsage.length < 2) return null;
    const found = analytics.plantUsage.find(
      (p) => p.generatorId === comparePlantBId && p.generatorId !== resolvedPlantA?.generatorId
    );
    if (found) return found;
    return analytics.plantUsage.find((p) => p.generatorId !== resolvedPlantA?.generatorId) || null;
  }, [analytics.plantUsage, comparePlantBId, resolvedPlantA]);

  const handleExportCsv = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const csv = buildAnalyticsCsv(analytics);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `edv-estadisticas-${period}-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onNotify?.('CSV Exportado', 'Se descargó el reporte estadístico completo con promedios y comparativas.');
    } else {
      onNotify?.('Exportación CSV', 'La descarga directa de CSV está optimizada para el Panel Web.');
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const { overview } = analytics;
  const maxCompanyAvgOutageMins = Math.max(
    1,
    overview.networkAvgOutageMinutes,
    ...sortedCompanies.map((c) => c.avgOutageMinutes)
  );
  const maxTimelineHours = Math.max(1, ...analytics.timeline.map((t) => t.horometerLoggedHours));
  const maxTimelineOutageCount = Math.max(1, ...analytics.timeline.map((t) => t.outagesCount));
  const peakTimeSlot = analytics.timeSlots.reduce(
    (best, cur) => (cur.count > best.count ? cur : best),
    analytics.timeSlots[0]
  );

  return (
    <View style={{ gap: 20 }}>
      {/* HEADER BAR & ACTIONS */}
      <View
        style={{
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: isMobile ? 20 : 24, marginBottom: 4 }}>
            Estadísticas Promediales y Comparativas de Flota
          </Text>
          <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13 }}>
            Métricas en tiempo real calculadas directamente desde los registros de Supabase ({overview.effectiveDaysSpan} días evaluados · {overview.totalPlants} plantas · {overview.outagesCount} cortes · {overview.horometerLogsCount} registros de horómetro).
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={handleExportCsv}
            style={[styles.actionPillBtn, { backgroundColor: accentPrimary }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="download" size={16} color={isDark ? '#001136' : '#FFFFFF'} />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: isDark ? '#001136' : '#FFFFFF' }}>
              Exportar CSV
            </Text>
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <TouchableOpacity
              onPress={handlePrint}
              style={[styles.actionPillBtn, { backgroundColor: cardBg, borderWidth: 1, borderColor: borderCol }]}
              activeOpacity={0.85}
            >
              <MaterialIcons name="print" size={16} color={textPrimary} />
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary }}>
                Imprimir
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FILTER BAR: PERIOD & COMPANY */}
      <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor: borderCol, padding: 16, gap: 14 }]}>
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16, justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.filterGroupLabel, { color: textSecondary }]}>
              PERÍODO DE ANÁLISIS
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PERIOD_OPTIONS.map((opt) => {
                const active = period === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setPeriod(opt.id)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? accentPrimary : subSurfaceBg,
                        borderColor: active ? accentPrimary : borderCol,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontFamily: active ? F.bold : F.medium,
                        fontSize: 12,
                        color: active ? (isDark ? '#001136' : '#FFFFFF') : textPrimary,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.filterGroupLabel, { color: textSecondary }]}>
              FILTRAR POR EMPRESA
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setCompanyFilterId('all')}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: companyFilterId === 'all' ? '#059669' : subSurfaceBg,
                    borderColor: companyFilterId === 'all' ? '#059669' : borderCol,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontFamily: companyFilterId === 'all' ? F.bold : F.medium,
                    fontSize: 12,
                    color: companyFilterId === 'all' ? '#FFFFFF' : textPrimary,
                  }}
                >
                  Todas ({generators.length} plantas)
                </Text>
              </TouchableOpacity>

              {analytics.companyOptions.map((c) => {
                const active = companyFilterId === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => setCompanyFilterId(c.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? '#059669' : subSurfaceBg,
                        borderColor: active ? '#059669' : borderCol,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontFamily: active ? F.bold : F.medium,
                        fontSize: 12,
                        color: active ? '#FFFFFF' : textPrimary,
                      }}
                    >
                      {c.name} ({c.plantCount})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* SECTION 1: INTEGRAL KPI STRIP (6 CARDS WITH AVERAGES ACROSS ALL SYSTEM DATA) */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#F59E0B', width: isMobile ? '100%' : isTablet ? '48%' : '32%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>DURACIÓN PROMEDIO / CORTE</Text>
            <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>
            {formatMinutesDuration(overview.avgOutageMinutes)}
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            Mín {formatMinutesDuration(overview.minOutageMinutes)} · Máx {formatMinutesDuration(overview.maxOutageMinutes)} · Total {formatHoursMinutes(overview.totalOutageMinutes)}
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#EF4444', width: isMobile ? '100%' : isTablet ? '48%' : '32%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>CORTES Y FRECUENCIA SEMANAL</Text>
            <MaterialCommunityIcons name="flash-off" size={20} color="#EF4444" />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>
            {overview.outagesCount} cortes ({overview.outagesPerWeek.toFixed(1)}/sem)
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            {overview.activeOutagesCount} activos · Arranque ATS: {overview.atsSuccessRatePct.toFixed(0)}%
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#3B82F6', width: isMobile ? '100%' : isTablet ? '48%' : '32%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>PROMEDIO HORÓMETRO / PLANTA</Text>
            <MaterialIcons name="speed" size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>
            {overview.avgHorometerHours.toFixed(1)} h
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            Acumulado flota: {overview.totalHorometerHours.toFixed(1)} h · Rango {overview.minHorometerHours.toFixed(0)}–{overview.maxHorometerHours.toFixed(0)} h
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#10B981', width: isMobile ? '100%' : isTablet ? '48%' : '32%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>USO PROMEDIO DIARIO DE FLOTA</Text>
            <MaterialIcons name="trending-up" size={20} color="#10B981" />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>
            {overview.avgHoursPerDayFleet.toFixed(2)} h/día
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            {overview.avgHoursPerPlantPerDay.toFixed(2)} h/planta · {overview.periodLoggedHours.toFixed(1)} h en período
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: accentPrimary, width: isMobile ? '100%' : isTablet ? '48%' : '32%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>PROMEDIO HORAS / REGISTRO</Text>
            <MaterialIcons name="assignment" size={20} color={accentPrimary} />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>
            {overview.avgHoursPerLog.toFixed(2)} h
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            En {overview.horometerLogsCount} reportes de operadores · {overview.totalCapacityKva.toLocaleString()} kVA totales
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#8B5CF6', width: isMobile ? '100%' : isTablet ? '48%' : '32%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>SALUD DE MANTENIMIENTO PROM.</Text>
            <MaterialIcons name="build" size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>
            {overview.avgFleetHealthPct.toFixed(0)}%
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            {overview.servicesCount} servicios ejecutados · {overview.plantsDueSoonOrOverdue} plantas en alerta
          </Text>
        </View>
      </View>

      {/* SECTION 2: ESTADÍSTICAS PROMEDIALES DE CORTES DE LUZ POR EMPRESA */}
      <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="domain" size={20} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Estadísticas Promediales de Cortes de Luz por Empresa
              </Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
              Comparativa por empresa de frecuencia de apagones, duración promedio por evento y desviación frente al promedio general de la red ({formatMinutesDuration(overview.networkAvgOutageMinutes)}/corte · {overview.networkAvgOutagesPerPlant.toFixed(2)} cortes/planta).
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {COMPANY_SORT_OPTIONS.map((opt) => {
              const active = companySort === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setCompanySort(opt.id)}
                  style={[
                    styles.miniSortPill,
                    {
                      backgroundColor: active ? '#F59E0B' : subSurfaceBg,
                      borderColor: active ? '#F59E0B' : borderCol,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: active ? F.bold : F.medium,
                      fontSize: 11,
                      color: active ? '#FFFFFF' : textPrimary,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {sortedCompanies.length === 0 ? (
          <View style={[styles.emptyStateBox, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
            <MaterialIcons name="domain-disabled" size={32} color={textSecondary} />
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: textPrimary, marginTop: 8 }}>
              No hay empresas ni plantas asociadas en este filtro
            </Text>
            <Text style={{ fontFamily: F.regular, fontSize: 12, color: textSecondary, textAlign: 'center', marginTop: 4 }}>
              Registra empresas o asigna plantas eléctricas en Empresas & Dptos para calcular promedios por sede.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            {/* Comparative Horizontal Bars: Avg Duration per Outage by Company */}
            <View style={{ gap: 10 }}>
              {sortedCompanies.map((c: CompanyOutageStats) => {
                const widthPct =
                  c.outageCount > 0 ? Math.max(4, Math.min(100, (c.avgOutageMinutes / maxCompanyAvgOutageMins) * 100)) : 0;
                const networkMarkerPct =
                  overview.networkAvgOutageMinutes > 0
                    ? Math.min(100, (overview.networkAvgOutageMinutes / maxCompanyAvgOutageMins) * 100)
                    : 0;
                const deltaStyle = getDeltaTone(c.vsNetworkAvgDurationPct, true);
                const barColor =
                  c.vsNetworkAvgDurationPct !== null && c.vsNetworkAvgDurationPct > 15
                    ? '#EF4444'
                    : c.vsNetworkAvgDurationPct !== null && c.vsNetworkAvgDurationPct > 0
                    ? '#F59E0B'
                    : '#10B981';

                return (
                  <View key={c.companyKey} style={[styles.compRowCard, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
                    <View style={{ flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 6, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: textPrimary }}>
                          {c.companyName}
                        </Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textSecondary }}>
                          {c.plantCount} {c.plantCount === 1 ? 'planta' : 'plantas'} · {c.totalCapacityKva} kVA
                        </Text>
                        {c.activeCount > 0 && (
                          <View style={[styles.inlineBadge, { backgroundColor: 'rgba(239,68,68,0.14)' }]}>
                            <Text style={{ fontFamily: F.bold, fontSize: 10, color: '#EF4444' }}>
                              {c.activeCount} CORTE ACTIVO
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Text style={[styles.tabularText, { fontFamily: F.bold, fontSize: 13, color: textPrimary }]}>
                          Prom. {formatMinutesDuration(c.avgOutageMinutes)} / corte
                        </Text>
                        <View style={[styles.inlineBadge, { backgroundColor: deltaStyle.bg }]}>
                          <Text style={[styles.tabularText, { fontFamily: F.bold, fontSize: 11, color: deltaStyle.color }]}>
                            {c.vsNetworkAvgDurationPct === null ? 'Sin cortes en período' : `${formatSignedPct(c.vsNetworkAvgDurationPct)} vs Red`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Bar + Network Average Reference Line */}
                    <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${widthPct}%`,
                            backgroundColor: c.outageCount > 0 ? barColor : 'transparent',
                          },
                        ]}
                      />
                      {networkMarkerPct > 0 && (
                        <View
                          style={[
                            styles.barRefMarker,
                            {
                              left: `${networkMarkerPct}%`,
                              backgroundColor: isDark ? '#F8FAFC' : '#0F172A',
                            },
                          ]}
                        />
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8, gap: 10 }}>
                      <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11.5, color: textSecondary }]}>
                        Cortes totales: <Text style={{ fontFamily: F.bold, color: textPrimary }}>{c.outageCount}</Text> ({c.avgOutagesPerPlant.toFixed(2)}/planta)
                      </Text>
                      <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11.5, color: textSecondary }]}>
                        Tiempo total sin red: <Text style={{ fontFamily: F.bold, color: textPrimary }}>{formatHoursMinutes(c.totalOutageMinutes)}</Text> ({formatMinutesDuration(c.avgOutageMinutesPerWeek)}/sem)
                      </Text>
                      <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11.5, color: textSecondary }]}>
                        ATS autoarranque: <Text style={{ fontFamily: F.bold, color: '#10B981' }}>{c.atsRatePct.toFixed(0)}%</Text> · Franja pico: <Text style={{ fontFamily: F.semibold, color: textPrimary }}>{c.peakTimeSlot}</Text>
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Structured Summary Table */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: 880, borderWidth: 1, borderColor: borderCol, borderRadius: 12, overflow: 'hidden' }}>
                <View style={[styles.tableHeaderRow, { backgroundColor: subSurfaceBg, borderBottomColor: borderCol }]}>
                  <Text style={[styles.thCell, { flex: 1.6, color: textSecondary }]}>EMPRESA</Text>
                  <Text style={[styles.thCell, { flex: 0.8, color: textSecondary, textAlign: 'right' }]}>PLANTAS</Text>
                  <Text style={[styles.thCell, { flex: 0.9, color: textSecondary, textAlign: 'right' }]}>CORTES</Text>
                  <Text style={[styles.thCell, { flex: 1, color: textSecondary, textAlign: 'right' }]}>PROM / PLANTA</Text>
                  <Text style={[styles.thCell, { flex: 1.1, color: textSecondary, textAlign: 'right' }]}>TIEMPO TOTAL</Text>
                  <Text style={[styles.thCell, { flex: 1.1, color: textSecondary, textAlign: 'right' }]}>DUR. PROMEDIO</Text>
                  <Text style={[styles.thCell, { flex: 1, color: textSecondary, textAlign: 'right' }]}>VS PROM. RED</Text>
                  <Text style={[styles.thCell, { flex: 0.8, color: textSecondary, textAlign: 'right' }]}>ATS %</Text>
                  <Text style={[styles.thCell, { flex: 1.4, color: textSecondary, paddingLeft: 12 }]}>FRANJA PICO</Text>
                </View>

                {sortedCompanies.map((c, idx) => {
                  const deltaStyle = getDeltaTone(c.vsNetworkAvgDurationPct, true);
                  return (
                    <View
                      key={c.companyKey}
                      style={[
                        styles.tableDataRow,
                        {
                          borderBottomColor: borderCol,
                          borderBottomWidth: idx === sortedCompanies.length - 1 ? 0 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.tdCell, { flex: 1.6, fontFamily: F.bold, color: textPrimary }]}>
                        {c.companyName}
                      </Text>
                      <Text style={[styles.tdCell, styles.tabularText, { flex: 0.8, textAlign: 'right', color: textPrimary }]}>
                        {c.plantCount}
                      </Text>
                      <Text style={[styles.tdCell, styles.tabularText, { flex: 0.9, textAlign: 'right', fontFamily: F.bold, color: textPrimary }]}>
                        {c.outageCount}
                      </Text>
                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1, textAlign: 'right', color: textPrimary }]}>
                        {c.avgOutagesPerPlant.toFixed(2)}
                      </Text>
                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1.1, textAlign: 'right', color: textPrimary }]}>
                        {formatHoursMinutes(c.totalOutageMinutes)}
                      </Text>
                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1.1, textAlign: 'right', fontFamily: F.bold, color: textPrimary }]}>
                        {formatMinutesDuration(c.avgOutageMinutes)}
                      </Text>
                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1, textAlign: 'right', fontFamily: F.bold, color: deltaStyle.color }]}>
                        {formatSignedPct(c.vsNetworkAvgDurationPct)}
                      </Text>
                      <Text style={[styles.tdCell, styles.tabularText, { flex: 0.8, textAlign: 'right', color: '#10B981', fontFamily: F.semibold }]}>
                        {c.outageCount > 0 ? `${c.atsRatePct.toFixed(0)}%` : '—'}
                      </Text>
                      <Text style={[styles.tdCell, { flex: 1.4, paddingLeft: 12, color: textSecondary, fontSize: 11.5 }]}>
                        {c.peakTimeSlot}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* SECTION 3: USO PROMEDIO DE CADA PLANTA Y COMPARATIVAS RESPECTO A OTRAS */}
      <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="chart-bar" size={20} color="#3B82F6" />
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Uso Promedio de Cada Planta y Comparativas de Flota
              </Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
              Compara cada grupo electrógeno frente al promedio de la flota ({formatPlantMetricValue(plantMetricAvg, plantMetric)} en la métrica seleccionada) y su participación en la carga total.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {PLANT_METRIC_OPTIONS.map((opt) => {
              const active = plantMetric === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setPlantMetric(opt.id)}
                  style={[
                    styles.miniSortPill,
                    {
                      backgroundColor: active ? accentPrimary : subSurfaceBg,
                      borderColor: active ? accentPrimary : borderCol,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: active ? F.bold : F.medium,
                      fontSize: 11,
                      color: active ? (isDark ? '#001136' : '#FFFFFF') : textPrimary,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {sortedPlants.length === 0 ? (
          <View style={[styles.emptyStateBox, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
            <MaterialCommunityIcons name="engine-off" size={32} color={textSecondary} />
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: textPrimary, marginTop: 8 }}>
              No hay plantas eléctricas en el filtro actual
            </Text>
            <Text style={{ fontFamily: F.regular, fontSize: 12, color: textSecondary, textAlign: 'center', marginTop: 4 }}>
              Registra o asigna plantas en la pestaña Plantas Eléctricas para generar el ranking y comparativas.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            {/* Benchmark Reference Banner */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: subSurfaceBg,
                borderWidth: 1,
                borderColor: borderCol,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: isDark ? '#F8FAFC' : '#0F172A' }} />
                <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textPrimary }}>
                  Línea de referencia = Promedio de flota: <Text style={styles.tabularText}>{formatPlantMetricValue(plantMetricAvg, plantMetric)}</Text>
                </Text>
              </View>
              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textSecondary }}>
                Plantas comparadas: {sortedPlants.length}
              </Text>
            </View>

            {/* Visual Comparative Bar Chart across Plants */}
            <View style={{ gap: 10 }}>
              {sortedPlants.map((p, index) => {
                const metricVal = getPlantMetricValue(p, plantMetric);
                const barPct = metricVal > 0 ? Math.max(4, Math.min(100, (metricVal / plantMetricMax) * 100)) : 0;
                const avgRefPct = plantMetricAvg > 0 ? Math.min(100, (plantMetricAvg / plantMetricMax) * 100) : 0;
                const vsAvgPct =
                  plantMetricAvg > 0 ? ((metricVal - plantMetricAvg) / plantMetricAvg) * 100 : null;
                const statusInfo = statusLabelMap[p.status];
                const barColor =
                  plantMetric === 'serviceCycleUsedPct'
                    ? p.serviceCycleUsedPct >= 100
                      ? '#EF4444'
                      : p.serviceCycleUsedPct >= 85
                      ? '#F59E0B'
                      : '#10B981'
                    : plantMetric === 'outageMinutes'
                    ? '#F59E0B'
                    : index === 0
                    ? '#3B82F6'
                    : accentPrimary;

                return (
                  <View key={p.generatorId} style={[styles.compRowCard, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
                    <View style={{ flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 8, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <View style={[styles.rankCircle, { backgroundColor: index === 0 ? accentPrimary : cardBg, borderColor: borderCol }]}>
                          <Text style={[styles.tabularText, { fontFamily: F.extrabold, fontSize: 11, color: index === 0 ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }]}>
                            #{index + 1}
                          </Text>
                        </View>
                        <View>
                          <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: textPrimary }}>
                            {p.name}
                          </Text>
                          <Text style={{ fontFamily: F.regular, fontSize: 11.5, color: textSecondary }}>
                            {p.companyName} · {p.departmentName} · {p.brand} {p.model} ({p.capacityKva} kVA)
                          </Text>
                        </View>
                        <View style={[styles.inlineBadge, { backgroundColor: `${statusInfo.color}20` }]}>
                          <Text style={{ fontFamily: F.bold, fontSize: 10, color: statusInfo.color }}>
                            {statusInfo.label}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={[styles.tabularText, { fontFamily: F.extrabold, fontSize: 14, color: textPrimary }]}>
                          {formatPlantMetricValue(metricVal, plantMetric)}
                        </Text>
                        <View
                          style={[
                            styles.inlineBadge,
                            {
                              backgroundColor:
                                vsAvgPct === null
                                  ? 'rgba(100,116,139,0.12)'
                                  : vsAvgPct >= 0
                                  ? 'rgba(59,130,246,0.14)'
                                  : 'rgba(16,185,129,0.14)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tabularText,
                              {
                                fontFamily: F.bold,
                                fontSize: 11,
                                color: vsAvgPct === null ? textSecondary : vsAvgPct >= 0 ? '#2563EB' : '#059669',
                              },
                            ]}
                          >
                            {vsAvgPct === null ? '—' : `${formatSignedPct(vsAvgPct)} vs Prom.`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }]}>
                      <View style={[styles.barFill, { width: `${barPct}%`, backgroundColor: barColor }]} />
                      {avgRefPct > 0 && (
                        <View
                          style={[
                            styles.barRefMarker,
                            { left: `${avgRefPct}%`, backgroundColor: isDark ? '#F8FAFC' : '#0F172A' },
                          ]}
                        />
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8, gap: 10 }}>
                      <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11.5, color: textSecondary }]}>
                        Participación flota: <Text style={{ fontFamily: F.bold, color: textPrimary }}>{p.shareOfFleetHoursPct.toFixed(1)}%</Text>
                      </Text>
                      <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11.5, color: textSecondary }]}>
                        Prom. diario: <Text style={{ fontFamily: F.bold, color: textPrimary }}>{p.avgHoursPerDay.toFixed(2)} h/d</Text> ({p.logsCount} lecturas · {p.avgHoursPerLog.toFixed(2)} h/reg)
                      </Text>
                      <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11.5, color: textSecondary }]}>
                        Cortes: <Text style={{ fontFamily: F.bold, color: textPrimary }}>{p.outagesCount}</Text> ({formatMinutesDuration(p.outageMinutes)}) · Vida servicio: <Text style={{ fontFamily: F.bold, color: p.healthRemainingPct <= 15 ? '#EF4444' : '#10B981' }}>{p.healthRemainingPct}%</Text>
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Full Plant Comparison Table */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: 940, borderWidth: 1, borderColor: borderCol, borderRadius: 12, overflow: 'hidden' }}>
                <View style={[styles.tableHeaderRow, { backgroundColor: subSurfaceBg, borderBottomColor: borderCol }]}>
                  <Text style={[styles.thCell, { flex: 0.45, color: textSecondary }]}>#</Text>
                  <Text style={[styles.thCell, { flex: 1.7, color: textSecondary }]}>PLANTA / EMPRESA</Text>
                  <Text style={[styles.thCell, { flex: 1, color: textSecondary, textAlign: 'right' }]}>HORÓMETRO</Text>
                  <Text style={[styles.thCell, { flex: 0.85, color: textSecondary, textAlign: 'right' }]}>% FLOTA</Text>
                  <Text style={[styles.thCell, { flex: 1, color: textSecondary, textAlign: 'right' }]}>VS PROM.</Text>
                  <Text style={[styles.thCell, { flex: 1, color: textSecondary, textAlign: 'right' }]}>USO PERÍODO</Text>
                  <Text style={[styles.thCell, { flex: 0.9, color: textSecondary, textAlign: 'right' }]}>PROM / DÍA</Text>
                  <Text style={[styles.thCell, { flex: 1.1, color: textSecondary, textAlign: 'right' }]}>CORTES (PROM.)</Text>
                  <Text style={[styles.thCell, { flex: 0.9, color: textSecondary, textAlign: 'right' }]}>SERVICIOS</Text>
                  <Text style={[styles.thCell, { flex: 0.95, color: textSecondary, textAlign: 'right' }]}>VIDA ÚTIL</Text>
                </View>

                {analytics.plantUsage.map((p, idx) => (
                  <View
                    key={p.generatorId}
                    style={[
                      styles.tableDataRow,
                      {
                        borderBottomColor: borderCol,
                        borderBottomWidth: idx === analytics.plantUsage.length - 1 ? 0 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.tdCell, styles.tabularText, { flex: 0.45, fontFamily: F.bold, color: textSecondary }]}>
                      {p.usageRank}
                    </Text>
                    <View style={{ flex: 1.7 }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textPrimary }}>{p.name}</Text>
                      <Text style={{ fontFamily: F.regular, fontSize: 11, color: textSecondary }}>{p.companyName} · {p.capacityKva} kVA</Text>
                    </View>
                    <Text style={[styles.tdCell, styles.tabularText, { flex: 1, textAlign: 'right', fontFamily: F.bold, color: textPrimary }]}>
                      {p.currentHours.toFixed(1)} h
                    </Text>
                    <Text style={[styles.tdCell, styles.tabularText, { flex: 0.85, textAlign: 'right', color: textPrimary }]}>
                      {p.shareOfFleetHoursPct.toFixed(1)}%
                    </Text>
                    <Text
                      style={[
                        styles.tdCell,
                        styles.tabularText,
                        {
                          flex: 1,
                          textAlign: 'right',
                          fontFamily: F.bold,
                          color:
                            p.vsFleetAvgHorometerPct === null
                              ? textSecondary
                              : p.vsFleetAvgHorometerPct >= 0
                              ? '#3B82F6'
                              : '#059669',
                        },
                      ]}
                    >
                      {formatSignedPct(p.vsFleetAvgHorometerPct)}
                    </Text>
                    <Text style={[styles.tdCell, styles.tabularText, { flex: 1, textAlign: 'right', color: textPrimary }]}>
                      {p.periodLoggedHours.toFixed(1)} h ({p.logsCount})
                    </Text>
                    <Text style={[styles.tdCell, styles.tabularText, { flex: 0.9, textAlign: 'right', color: textPrimary }]}>
                      {p.avgHoursPerDay.toFixed(2)} h/d
                    </Text>
                    <Text style={[styles.tdCell, styles.tabularText, { flex: 1.1, textAlign: 'right', color: textPrimary }]}>
                      {p.outagesCount} ({formatMinutesDuration(p.avgOutageMinutes)})
                    </Text>
                    <Text style={[styles.tdCell, styles.tabularText, { flex: 0.9, textAlign: 'right', color: textPrimary }]}>
                      {p.servicesCount}
                    </Text>
                    <Text
                      style={[
                        styles.tdCell,
                        styles.tabularText,
                        {
                          flex: 0.95,
                          textAlign: 'right',
                          fontFamily: F.bold,
                          color: p.serviceStatus === 'critical' ? '#EF4444' : p.serviceStatus === 'warning' ? '#F59E0B' : '#10B981',
                        },
                      ]}
                    >
                      {p.healthRemainingPct}%
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Direct 1-to-1 Plant A vs Plant B Comparator */}
            <DirectPlantComparatorCard
              plants={analytics.plantUsage}
              plantA={resolvedPlantA}
              plantB={resolvedPlantB}
              onSelectA={setComparePlantAId}
              onSelectB={setComparePlantBId}
              subSurfaceBg={subSurfaceBg}
              cardBg={cardBg}
              borderCol={borderCol}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              accentPrimary={accentPrimary}
              isDark={isDark}
              isMobile={isMobile}
            />
          </View>
        )}
      </View>

      {/* SECTION 4: CHRONOLOGICAL TREND & TIME SLOT OUTAGE ANALYSIS */}
      <View style={{ flexDirection: isMobile || isTablet ? 'column' : 'row', gap: 18 }}>
        {/* Timeline Trend */}
        <View style={[styles.panelCard, { flex: 1.35, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="show-chart" size={20} color="#3B82F6" />
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Evolución Cronológica de Uso y Cortes
              </Text>
            </View>
            <Text style={{ fontFamily: F.semibold, fontSize: 11, color: textSecondary }}>
              Vista {analytics.timelineGranularity === 'day' ? 'Diaria' : analytics.timelineGranularity === 'week' ? 'Semanal' : 'Mensual'}
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: textSecondary, marginBottom: 16 }]}>
            Comparativa temporal entre horas registradas en horómetros y eventos de corte eléctrico reportados.
          </Text>

          {analytics.timeline.length === 0 ? (
            <View style={[styles.emptyStateBox, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: textPrimary }}>
                Sin eventos cronológicos en el período seleccionado
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: textSecondary, marginTop: 4, textAlign: 'center' }}>
                Cambia a "Todo el Historial" o registra lecturas de horómetro/cortes para graficar la tendencia.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#3B82F6' }} />
                  <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textSecondary }}>Horas Horómetro (Δ h)</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#F59E0B' }} />
                  <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textSecondary }}>Cortes Eléctricos (eventos)</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, minHeight: 165, paddingTop: 18, paddingBottom: 4, paddingHorizontal: 4 }}>
                  {analytics.timeline.map((b) => {
                    const hrsHeight = b.horometerLoggedHours > 0 ? Math.max(8, (b.horometerLoggedHours / maxTimelineHours) * 110) : 3;
                    const outHeight = b.outagesCount > 0 ? Math.max(8, (b.outagesCount / maxTimelineOutageCount) * 110) : 3;
                    return (
                      <View key={b.key} style={{ alignItems: 'center', minWidth: 52 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 126 }}>
                          <View style={{ alignItems: 'center' }}>
                            {b.horometerLoggedHours > 0 && (
                              <Text style={[styles.tabularText, { fontFamily: F.bold, fontSize: 10, color: '#3B82F6', marginBottom: 2 }]}>
                                {b.horometerLoggedHours.toFixed(1)}h
                              </Text>
                            )}
                            <View style={{ width: 16, height: hrsHeight, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: b.horometerLoggedHours > 0 ? '#3B82F6' : borderCol }} />
                          </View>
                          <View style={{ alignItems: 'center' }}>
                            {b.outagesCount > 0 && (
                              <Text style={[styles.tabularText, { fontFamily: F.bold, fontSize: 10, color: '#F59E0B', marginBottom: 2 }]}>
                                {b.outagesCount}c
                              </Text>
                            )}
                            <View style={{ width: 16, height: outHeight, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: b.outagesCount > 0 ? '#F59E0B' : borderCol }} />
                          </View>
                        </View>
                        <Text style={{ fontFamily: F.semibold, fontSize: 10.5, color: textSecondary, marginTop: 6 }}>
                          {b.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Time Slots Outage Distribution */}
        <View style={[styles.panelCard, { flex: 1, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <MaterialIcons name="schedule" size={20} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              Franja Horaria de Cortes Eléctricos
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: textSecondary, marginBottom: 14 }]}>
            Identifica en qué bloque del día ocurren más fallos de red y su duración promedio.
          </Text>

          <View style={{ gap: 10 }}>
            {analytics.timeSlots.map((slot) => {
              const isPeak = slot.count > 0 && peakTimeSlot && slot.id === peakTimeSlot.id;
              return (
                <View key={slot.id} style={[styles.slotRow, { backgroundColor: subSurfaceBg, borderColor: isPeak ? '#F59E0B' : borderCol }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>{slot.label}</Text>
                      <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11.5, color: textSecondary }]}>{slot.rangeLabel}</Text>
                      {isPeak && (
                        <View style={[styles.inlineBadge, { backgroundColor: 'rgba(245,158,11,0.16)' }]}>
                          <Text style={{ fontFamily: F.bold, fontSize: 10, color: '#D97706' }}>FRANJA PICO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.tabularText, { fontFamily: F.bold, fontSize: 12.5, color: textPrimary }]}>
                      {slot.count} ({slot.sharePct.toFixed(0)}%)
                    </Text>
                  </View>

                  <View style={[styles.barTrack, { height: 7, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }]}>
                    <View
                      style={{
                        height: '100%',
                        borderRadius: 4,
                        width: `${slot.sharePct > 0 ? Math.max(4, slot.sharePct) : 0}%`,
                        backgroundColor: isPeak ? '#F59E0B' : '#3B82F6',
                      }}
                    />
                  </View>

                  <Text style={[styles.tabularText, { fontFamily: F.regular, fontSize: 11, color: textSecondary, marginTop: 6 }]}>
                    Prom. duración: {formatMinutesDuration(slot.avgMinutes)} · Acumulado: {formatHoursMinutes(slot.totalMinutes)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* SECTION 5: DEPARTMENTS, MAINTENANCE & OPERATORS */}
      <View style={{ flexDirection: isMobile ? 'column' : isTablet ? 'column' : 'row', gap: 18 }}>
        {/* Departments */}
        <View style={[styles.panelCard, { flex: 1, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.compactCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="account-tree" size={18} color={accentPrimary} />
              <Text style={[styles.compactCardTitle, { color: textPrimary }]}>Departamentos y Áreas</Text>
            </View>
            {onNavigateTab && (
              <TouchableOpacity onPress={() => onNavigateTab('companies')}>
                <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: accentPrimary }}>Ver áreas</Text>
              </TouchableOpacity>
            )}
          </View>

          {analytics.departments.length === 0 ? (
            <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary, paddingVertical: 12 }}>
              Sin departamentos con plantas asignadas.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {analytics.departments.slice(0, 6).map((d) => (
                <View key={d.departmentKey} style={[styles.compactRow, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textPrimary }}>{d.departmentName}</Text>
                    <Text style={{ fontFamily: F.regular, fontSize: 11, color: textSecondary }}>
                      {d.companyName} · {d.plantCount} plantas
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.tabularText, { fontFamily: F.bold, fontSize: 12.5, color: textPrimary }]}>
                      {d.totalHorometerHours.toFixed(1)} h
                    </Text>
                    <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11, color: textSecondary }]}>
                      {d.outageCount} cortes · Prom {formatMinutesDuration(d.avgOutageMinutes)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Maintenance & Fuel */}
        <View style={[styles.panelCard, { flex: 1, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.compactCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="handyman" size={18} color="#10B981" />
              <Text style={[styles.compactCardTitle, { color: textPrimary }]}>Mantenimientos y Combustible</Text>
            </View>
            {onNavigateTab && (
              <TouchableOpacity onPress={() => onNavigateTab('services')}>
                <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: '#10B981' }}>Bitácora</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {analytics.fuelBreakdown.map((f) => (
              <View key={f.fuelType} style={[styles.fuelBadgeCard, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
                <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: textPrimary }}>{f.label} ({f.plantCount})</Text>
                <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11, color: textSecondary }]}>
                  Prom {f.avgHorometerHours.toFixed(1)} h · {f.totalCapacityKva} kVA
                </Text>
              </View>
            ))}
          </View>

          {analytics.serviceTypes.length === 0 ? (
            <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary, paddingVertical: 8 }}>
              Aún no se registran servicios de mantenimiento en el período.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {analytics.serviceTypes.slice(0, 5).map((s) => (
                <View key={s.serviceType} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textPrimary }}>{s.label}</Text>
                    <Text style={[styles.tabularText, { fontFamily: F.bold, fontSize: 12, color: textPrimary }]}>
                      {s.count} ({s.sharePct.toFixed(0)}%)
                    </Text>
                  </View>
                  <View style={[styles.barTrack, { height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }]}>
                    <View style={{ height: '100%', borderRadius: 3, width: `${Math.max(5, s.sharePct)}%`, backgroundColor: '#10B981' }} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Operator Activity */}
        <View style={[styles.panelCard, { flex: 1, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.compactCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="people-outline" size={18} color="#8B5CF6" />
              <Text style={[styles.compactCardTitle, { color: textPrimary }]}>Actividad por Operador</Text>
            </View>
            <Text style={[styles.tabularText, { fontFamily: F.semibold, fontSize: 11, color: textSecondary }]}>
              {analytics.operators.length} activos
            </Text>
          </View>

          {analytics.operators.length === 0 ? (
            <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary, paddingVertical: 12 }}>
              Sin reportes de operadores o técnicos en el período actual.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {analytics.operators.slice(0, 6).map((op) => (
                <View key={op.key} style={[styles.compactRow, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textPrimary }} numberOfLines={1}>
                      {op.name}
                    </Text>
                    <Text style={{ fontFamily: F.regular, fontSize: 11, color: textSecondary }} numberOfLines={1}>
                      {op.role.toUpperCase()} · {op.email}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.tabularText, { fontFamily: F.bold, fontSize: 12.5, color: textPrimary }]}>
                      {op.totalActions} acciones
                    </Text>
                    <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11, color: textSecondary }]}>
                      {op.horometerLogsCount} horóm. · {op.outagesReportedCount} cortes · {op.servicesRecordedCount} serv.
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

interface DirectPlantComparatorProps {
  plants: PlantUsageStats[];
  plantA: PlantUsageStats | null;
  plantB: PlantUsageStats | null;
  onSelectA: (id: string) => void;
  onSelectB: (id: string) => void;
  subSurfaceBg: string;
  cardBg: string;
  borderCol: string;
  textPrimary: string;
  textSecondary: string;
  accentPrimary: string;
  isDark: boolean;
  isMobile: boolean;
}

const DirectPlantComparatorCard: React.FC<DirectPlantComparatorProps> = ({
  plants,
  plantA,
  plantB,
  onSelectA,
  onSelectB,
  subSurfaceBg,
  cardBg,
  borderCol,
  textPrimary,
  textSecondary,
  accentPrimary,
  isDark,
  isMobile,
}) => {
  if (plants.length < 2 || !plantA || !plantB) {
    return (
      <View style={[styles.emptyStateBox, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
        <MaterialIcons name="compare-arrows" size={28} color={textSecondary} />
        <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: textPrimary, marginTop: 6 }}>
          Comparador Directo 1 a 1 entre Plantas
        </Text>
        <Text style={{ fontFamily: F.regular, fontSize: 12, color: textSecondary, marginTop: 4, textAlign: 'center' }}>
          Se necesitan al menos 2 plantas eléctricas en la vista actual para enfrentarlas métrica por métrica.
        </Text>
      </View>
    );
  }

  const rows: Array<{
    label: string;
    valA: number;
    valB: number;
    format: (v: number) => string;
    unitDiff: string;
  }> = [
    { label: 'Horómetro Acumulado', valA: plantA.currentHours, valB: plantB.currentHours, format: (v) => `${v.toFixed(1)} h`, unitDiff: 'h' },
    { label: 'Horas Registradas (Período)', valA: plantA.periodLoggedHours, valB: plantB.periodLoggedHours, format: (v) => `${v.toFixed(1)} h`, unitDiff: 'h' },
    { label: 'Uso Promedio Diario', valA: plantA.avgHoursPerDay, valB: plantB.avgHoursPerDay, format: (v) => `${v.toFixed(2)} h/d`, unitDiff: 'h/d' },
    { label: 'Cantidad de Cortes', valA: plantA.outagesCount, valB: plantB.outagesCount, format: (v) => `${v}`, unitDiff: 'cortes' },
    { label: 'Tiempo Total Cortes', valA: plantA.outageMinutes, valB: plantB.outageMinutes, format: (v) => formatMinutesDuration(v), unitDiff: 'min' },
    { label: 'Duración Promedio / Corte', valA: plantA.avgOutageMinutes, valB: plantB.avgOutageMinutes, format: (v) => formatMinutesDuration(v), unitDiff: 'min' },
    { label: 'Mantenimientos Ejecutados', valA: plantA.servicesCount, valB: plantB.servicesCount, format: (v) => `${v}`, unitDiff: 'serv.' },
    { label: 'Salud Restante de Servicio', valA: plantA.healthRemainingPct, valB: plantB.healthRemainingPct, format: (v) => `${v}%`, unitDiff: 'pts' },
  ];

  return (
    <View style={{ borderWidth: 1, borderColor: borderCol, borderRadius: 14, padding: 16, backgroundColor: subSurfaceBg, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialIcons name="compare-arrows" size={20} color={accentPrimary} />
        <Text style={{ fontFamily: F.bold, fontSize: 15, color: textPrimary }}>
          Comparador Directo 1 a 1 (Planta vs Planta)
        </Text>
      </View>

      <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#3B82F6' }}>PLANTA A (REFERENCIA)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {plants.map((p) => {
              const selected = p.generatorId === plantA.generatorId;
              const disabled = p.generatorId === plantB.generatorId;
              return (
                <TouchableOpacity
                  key={p.generatorId}
                  disabled={disabled}
                  onPress={() => onSelectA(p.generatorId)}
                  style={[
                    styles.miniSortPill,
                    {
                      opacity: disabled ? 0.45 : 1,
                      backgroundColor: selected ? '#3B82F6' : cardBg,
                      borderColor: selected ? '#3B82F6' : borderCol,
                    },
                  ]}
                >
                  <Text style={{ fontFamily: selected ? F.bold : F.medium, fontSize: 11.5, color: selected ? '#FFFFFF' : textPrimary }}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#10B981' }}>PLANTA B (COMPARACIÓN)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {plants.map((p) => {
              const selected = p.generatorId === plantB.generatorId;
              const disabled = p.generatorId === plantA.generatorId;
              return (
                <TouchableOpacity
                  key={p.generatorId}
                  disabled={disabled}
                  onPress={() => onSelectB(p.generatorId)}
                  style={[
                    styles.miniSortPill,
                    {
                      opacity: disabled ? 0.45 : 1,
                      backgroundColor: selected ? '#10B981' : cardBg,
                      borderColor: selected ? '#10B981' : borderCol,
                    },
                  ]}
                >
                  <Text style={{ fontFamily: selected ? F.bold : F.medium, fontSize: 11.5, color: selected ? '#FFFFFF' : textPrimary }}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, overflow: 'hidden' }}>
        <View style={[styles.tableHeaderRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderBottomColor: borderCol }]}>
          <Text style={[styles.thCell, { flex: 1.5, color: textSecondary }]}>MÉTRICA COMPARATIVA</Text>
          <Text style={[styles.thCell, { flex: 1, color: '#3B82F6', textAlign: 'right' }]} numberOfLines={1}>
            {plantA.name}
          </Text>
          <Text style={[styles.thCell, { flex: 1, color: '#10B981', textAlign: 'right' }]} numberOfLines={1}>
            {plantB.name}
          </Text>
          <Text style={[styles.thCell, { flex: 1.1, color: textSecondary, textAlign: 'right' }]}>DIFERENCIA (A - B)</Text>
        </View>

        {rows.map((r, idx) => {
          const diff = r.valA - r.valB;
          const pctDiff = r.valB > 0 ? ((r.valA - r.valB) / r.valB) * 100 : null;
          const diffStr =
            diff === 0
              ? 'Igual (0)'
              : `${diff > 0 ? '+' : ''}${Number.isInteger(diff) ? diff : diff.toFixed(1)} ${r.unitDiff}${pctDiff !== null ? ` (${formatSignedPct(pctDiff)})` : ''}`;

          return (
            <View
              key={r.label}
              style={[
                styles.tableDataRow,
                {
                  borderBottomColor: borderCol,
                  borderBottomWidth: idx === rows.length - 1 ? 0 : 1,
                },
              ]}
            >
              <Text style={[styles.tdCell, { flex: 1.5, fontFamily: F.semibold, color: textPrimary }]}>{r.label}</Text>
              <Text style={[styles.tdCell, styles.tabularText, { flex: 1, textAlign: 'right', fontFamily: F.bold, color: '#3B82F6' }]}>
                {r.format(r.valA)}
              </Text>
              <Text style={[styles.tdCell, styles.tabularText, { flex: 1, textAlign: 'right', fontFamily: F.bold, color: '#10B981' }]}>
                {r.format(r.valB)}
              </Text>
              <Text style={[styles.tdCell, styles.tabularText, { flex: 1.1, textAlign: 'right', fontFamily: F.semibold, color: textSecondary }]}>
                {diffStr}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panelCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  filterGroupLabel: {
    fontFamily: F.bold,
    fontSize: 10.5,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniSortPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  kpiCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    gap: 6,
    flexGrow: 1,
  },
  kpiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiTitle: {
    fontFamily: F.bold,
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontFamily: F.extrabold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  kpiSub: {
    fontFamily: F.medium,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitle: {
    fontFamily: F.bold,
    fontSize: 17,
  },
  sectionSubtitle: {
    fontFamily: F.regular,
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 18,
  },
  compRowCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  inlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  barTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'visible',
    position: 'relative',
    justifyContent: 'center',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barRefMarker: {
    position: 'absolute',
    top: -3,
    width: 2.5,
    height: 16,
    borderRadius: 2,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  thCell: {
    fontFamily: F.bold,
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  tdCell: {
    fontFamily: F.regular,
    fontSize: 12.5,
  },
  tabularText: {
    fontVariant: ['tabular-nums'],
  },
  emptyStateBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotRow: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  compactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactCardTitle: {
    fontFamily: F.bold,
    fontSize: 15,
  },
  compactRow: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  fuelBadgeCard: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
});
