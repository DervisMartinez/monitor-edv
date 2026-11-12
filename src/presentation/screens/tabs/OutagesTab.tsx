import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyMoto } from '../../context/MotoContext';
import { useTheme } from '../../context/ThemeContext';
import { getServiceStatus, calculateWearPercentage } from '../../../constants/telemetry';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export const OutagesTab: React.FC = () => {
  const { 
    activeGenerator, 
    outages, 
    addOutage, 
    startOutage, 
    endOutage, 
    activeOutage 
  } = useMyMoto();
  const { colors, isDark } = useTheme();

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [startHour, setStartHour] = useState('14:00');
  const [endHour, setEndHour] = useState('18:00');
  const [isStillActive, setIsStillActive] = useState(false);
  const [outageNotes, setOutageNotes] = useState('');

  const F = {
    extrabold: 'Montserrat_800ExtraBold',
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Lunes = 0

  const parseSafeDate = (d: string) => {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date();
  };

  // Group outages by day
  const monthOutages = useMemo(() => {
    const map: Record<number, typeof outages> = {};
    outages.forEach(o => {
      const d = parseSafeDate(o.startTime);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(o);
      }
    });
    return map;
  }, [outages, currentYear, currentMonth]);

  // Service countdown metrics
  const serviceStats = useMemo(() => {
    if (!activeGenerator) {
      return { remainingHours: 0, nextTargetHours: 200, percent: 100, status: { label: 'ÓPTIMO', color: '#10B981' } };
    }
    const current = activeGenerator.currentHours;
    const interval = activeGenerator.serviceIntervalHours || 200;
    const rawLast = activeGenerator.lastServiceHours || 0;
    const last = (rawLast >= 0 && rawLast <= current) ? rawLast : current;
    const nextTarget = last > 0 ? last + interval : (current > 0 ? current + interval : interval);
    const remaining = Math.max(0, Number((nextTarget - current).toFixed(1)));
    const status = getServiceStatus(remaining);
    const percent = calculateWearPercentage(current, last, interval);
    return { remainingHours: remaining, nextTargetHours: nextTarget, percent, status };
  }, [activeGenerator]);

  const selectedDayOutages = monthOutages[selectedDay] || [];

  const handlePrevMonth = () => setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCalendarDate(new Date(currentYear, currentMonth + 1, 1));

  const handleSaveOutage = async () => {
    if (!startHour) {
      Alert.alert('Error', 'Indica la hora en que inició el corte.');
      return;
    }

    const baseDate = new Date(currentYear, currentMonth, selectedDay);
    const [sH, sM] = startHour.split(':').map(n => parseInt(n) || 0);
    const startIso = new Date(baseDate.setHours(sH, sM, 0, 0)).toISOString();

    let endIso: string | null = null;
    let durationMinutes: number | undefined = undefined;

    if (!isStillActive && endHour) {
      const [eH, eM] = endHour.split(':').map(n => parseInt(n) || 0);
      const endDate = new Date(currentYear, currentMonth, selectedDay);
      endDate.setHours(eH, eM, 0, 0);
      endIso = endDate.toISOString();
      durationMinutes = Math.max(1, Math.round((endDate.getTime() - new Date(startIso).getTime()) / 60000));
    }

    await addOutage({
      generatorId: activeGenerator?.id || 'gen-blue-power-c125',
      userId: 'user-001',
      startTime: startIso,
      endTime: endIso,
      durationMinutes,
      generatorStarted: true,
      notes: outageNotes || `Corte eléctrico del ${selectedDay} de ${MONTH_NAMES[currentMonth]}`,
    });

    setShowAddForm(false);
    setOutageNotes('');
    Alert.alert('Corte Guardado', 'El corte eléctrico y regreso han sido guardados.');
  };

  const cardBg = isDark ? '#191C24' : '#FFFFFF';
  const inputBg = isDark ? '#232733' : '#F1F4F9';
  const textPrimary = colors.onSurface;
  const textSecondary = colors.onSurfaceVariant;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 125 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12, letterSpacing: 0.8 }}>
            CALENDARIO DE SUMINISTRO
          </Text>
          <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 22 }}>
            Cortes Eléctricos & Servicio
          </Text>
        </View>

        {/* 1. Conteo de Servicio de la Planta */}
        <View style={[styles.countdownBox, { backgroundColor: cardBg }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 150 }}>
              <MaterialCommunityIcons name="timer-sand" size={18} color="#F59E0B" />
              <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12 }} numberOfLines={1}>
                CONTEO PRÓXIMO SERVICIO
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${serviceStats.status.color}20` }]}>
              <Text style={{ fontFamily: F.bold, color: serviceStats.status.color, fontSize: 10 }}>
                {serviceStats.status.label}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginVertical: 8, gap: 6 }}>
            <Text style={[styles.countdownNum, { fontFamily: F.extrabold, color: serviceStats.status.color }]}>
              {serviceStats.nextTargetHours.toFixed(1)}
            </Text>
            <View>
              <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 16 }}>
                HORÓMETRO META
              </Text>
              <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11 }}>
                {serviceStats.remainingHours > 0 ? `Restan ${serviceStats.remainingHours.toFixed(1)} h` : '¡Vencido!'}
              </Text>
            </View>
          </View>

          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(5, serviceStats.percent)}%`, backgroundColor: serviceStats.status.color }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
              Horómetro: {activeGenerator?.currentHours.toFixed(1)} h
            </Text>
            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11 }}>
              Meta Servicio: {serviceStats.nextTargetHours.toFixed(1)} h
            </Text>
          </View>
        </View>

        {/* 2. Banner de Estado Activo de Corte */}
        {activeOutage ? (
          <View style={styles.alertBanner}>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 13 }}>
                Corte Eléctrico Activo en la Zona
              </Text>
              <Text style={{ fontFamily: F.regular, color: '#FEE2E2', fontSize: 11 }}>
                Inició {new Date(activeOutage.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <TouchableOpacity style={styles.regresoBtn} onPress={() => endOutage()}>
              <Text style={{ fontFamily: F.bold, color: '#DC2626', fontSize: 11 }}>Regresó la Luz</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.healthyBanner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5' }]}>
            <MaterialCommunityIcons name="check-decagram" size={20} color="#10B981" />
            <Text style={{ fontFamily: F.semibold, color: '#10B981', fontSize: 12, flex: 1 }}>
              Suministro Eléctrico Comercial Normal
            </Text>
            <TouchableOpacity style={styles.huboCorteBtn} onPress={() => startOutage()}>
              <Text style={{ fontFamily: F.bold, color: '#F59E0B', fontSize: 11 }}>⚡ Registrar Corte</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Month Header */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
            <MaterialIcons name="chevron-left" size={24} color={textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 16 }}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
            <MaterialIcons name="chevron-right" size={24} color={textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekLabels}>
          {WEEK_DAYS.map((w, i) => (
            <Text key={i} style={[styles.weekLabel, { fontFamily: F.bold, color: textSecondary }]}>
              {w}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.grid}>
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.emptyCell} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasOutage = Boolean(monthOutages[day] && monthOutages[day].length > 0);
            const isSelected = selectedDay === day;

            return (
              <TouchableOpacity
                key={`day-${day}`}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: colors.primary },
                  hasOutage && !isSelected && { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' },
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={{
                  fontFamily: F.bold,
                  fontSize: 13,
                  color: isSelected ? '#FFFFFF' : textPrimary,
                }}>
                  {day}
                </Text>
                {hasOutage && (
                  <View style={[styles.dot, { backgroundColor: isSelected ? '#FDE68A' : '#F59E0B' }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. Selected Day Details */}
        <View style={[styles.detailsBox, { backgroundColor: cardBg }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 11 }}>CORTES REGISTRADOS</Text>
              <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 16 }}>
                {selectedDay} de {MONTH_NAMES[currentMonth]}
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: '#F59E0B' }]}
              onPress={() => setShowAddForm(true)}
            >
              <MaterialIcons name="add" size={16} color="#FFFFFF" />
              <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 12 }}>Anexar Corte</Text>
            </TouchableOpacity>
          </View>

          {selectedDayOutages.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 18 }}>
              <MaterialIcons name="power" size={28} color={textSecondary} />
              <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12, marginTop: 4 }}>
                No hubo interrupciones de energía en esta fecha
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 12 }}>
              {selectedDayOutages.map((outage, idx) => (
                <View key={outage.id || idx} style={[styles.outageCard, { backgroundColor: isDark ? '#232733' : '#F1F4F9' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialCommunityIcons name="flash-alert" size={16} color="#F59E0B" />
                      <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                        Corte #{idx + 1}
                      </Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: outage.endTime ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                      <Text style={{ fontFamily: F.bold, fontSize: 10, color: outage.endTime ? '#10B981' : '#EF4444' }}>
                        {outage.endTime ? 'REGRESÓ' : 'ACTIVO'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timeRow}>
                    <View>
                      <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 10 }}>Hora Corte:</Text>
                      <Text style={{ fontFamily: F.bold, color: '#EF4444', fontSize: 13 }}>
                        {new Date(outage.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <MaterialIcons name="arrow-forward" size={14} color={textSecondary} />
                    <View>
                      <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 10 }}>Hora Regreso:</Text>
                      <Text style={{ fontFamily: F.bold, color: '#10B981', fontSize: 13 }}>
                        {outage.endTime ? new Date(outage.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sin regreso'}
                      </Text>
                    </View>
                  </View>

                  {outage.durationMinutes ? (
                    <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11, marginTop: 4 }}>
                      ⏱️ Tiempo sin servicio: {Math.floor(outage.durationMinutes / 60)}h {outage.durationMinutes % 60}m
                    </Text>
                  ) : null}

                  {outage.notes ? (
                    <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11, marginTop: 4 }}>
                      📝 {outage.notes}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 5. Form to Add Outage */}
        {showAddForm && (
          <View style={[styles.addForm, { backgroundColor: cardBg, borderColor: '#F59E0B' }]}>
            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14, marginBottom: 10 }}>
              Anexar Corte del {selectedDay} de {MONTH_NAMES[currentMonth]}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>Hora de Inicio:</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]}
                  value={startHour}
                  onChangeText={setStartHour}
                  placeholder="14:00"
                  placeholderTextColor={textSecondary}
                />
              </View>

              {!isStillActive && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>Hora de Regreso:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]}
                    value={endHour}
                    onChangeText={setEndHour}
                    placeholder="18:00"
                    placeholderTextColor={textSecondary}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 8 }}
              onPress={() => setIsStillActive(!isStillActive)}
            >
              <MaterialIcons 
                name={isStillActive ? 'check-box' : 'check-box-outline-blank'} 
                size={18} 
                color={isStillActive ? '#F59E0B' : textSecondary} 
              />
              <Text style={{ fontFamily: F.medium, color: textPrimary, fontSize: 12 }}>
                El corte aún está activo (la luz no ha regresado)
              </Text>
            </TouchableOpacity>

            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, marginTop: 4 }}>Observaciones:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.regular, height: 60 }]}
              value={outageNotes}
              onChangeText={setOutageNotes}
              placeholder="Causa del corte, zona afectada..."
              placeholderTextColor={textSecondary}
              multiline
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <TouchableOpacity 
                style={[styles.btnCancel, { borderColor: textSecondary }]} 
                onPress={() => setShowAddForm(false)}
              >
                <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btnSave, { backgroundColor: '#F59E0B' }]} 
                onPress={handleSaveOutage}
              >
                <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 12 }}>Guardar Corte</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 14,
  },
  countdownBox: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countdownNum: {
    fontSize: 34,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  alertBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  regresoBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  healthyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  huboCorteBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arrowBtn: {
    padding: 4,
  },
  weekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekLabel: {
    width: '13.5%',
    maxWidth: 44,
    textAlign: 'center',
    fontSize: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  emptyCell: {
    width: '13.5%',
    maxWidth: 44,
    height: 40,
    marginVertical: 2,
  },
  dayCell: {
    width: '13.5%',
    maxWidth: 44,
    height: 40,
    marginVertical: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  detailsBox: {
    borderRadius: 14,
    padding: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  outageCard: {
    borderRadius: 10,
    padding: 12,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  addForm: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginTop: 14,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginTop: 4,
  },
  btnCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnSave: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
