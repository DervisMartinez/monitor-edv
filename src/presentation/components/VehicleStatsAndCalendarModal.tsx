import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  ScrollView, 
  TouchableOpacity, 
  useWindowDimensions, 
  Platform,
  Animated,
  TouchableWithoutFeedback,
  TextInput,
  Alert
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';
import { 
  COMPONENT_NAMES, 
  COMPONENT_ICONS, 
  calculateWearPercentage, 
  getServiceStatus,
  GeneratorComponentType 
} from '../../constants/telemetry';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

interface Props {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'calendar' | 'countdown';
  onOpenNewService?: () => void;
}

export const VehicleStatsAndCalendarModal: React.FC<Props> = ({ 
  visible, 
  onClose,
  initialTab = 'calendar',
  onOpenNewService
}) => {
  const { colors, mode } = useTheme();
  const { 
    activeGenerator, 
    outages, 
    services, 
    addOutage, 
    startOutage, 
    endOutage,
    activeOutage 
  } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();

  const [activeScreen, setActiveScreen] = useState<'calendar' | 'countdown'>(initialTab);
  
  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // Anexar corte manual modal state
  const [showAddOutageForm, setShowAddOutageForm] = useState(false);
  const [outageStartHour, setOutageStartHour] = useState('14:00');
  const [outageEndHour, setOutageEndHour] = useState('18:00');
  const [outageNotes, setOutageNotes] = useState('');
  const [isStillOngoing, setIsStillOngoing] = useState(false);

  // Slide & Fade Animation for Drawer
  const slideAnim = useRef(new Animated.Value(480)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 9, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(480);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 480, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  };

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const isDark = mode === 'dark';

  const parseSafeDate = (d: string) => {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date();
  };

  // Calendar grouping
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Lunes = 0

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

  // Group services by day
  const monthServices = useMemo(() => {
    const map: Record<number, typeof services> = {};
    services.forEach(s => {
      const d = parseSafeDate(s.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(s);
      }
    });
    return map;
  }, [services, currentYear, currentMonth]);

  // Maintenance countdown calculations
  const countdownStats = useMemo(() => {
    if (!activeGenerator) {
      return {
        currentHours: 0,
        lastServiceHours: 0,
        intervalHours: 200,
        nextTargetHours: 200,
        remainingHours: 200,
        status: { status: 'optimal', label: 'OPERATIVO ÓPTIMO', color: '#10B981' },
        percent: 100,
      };
    }

    const currentHours = activeGenerator.currentHours;
    const intervalHours = activeGenerator.serviceIntervalHours || 200;
    const rawLast = activeGenerator.lastServiceHours || 0;
    const lastServiceHours = (rawLast >= 0 && rawLast <= currentHours) ? rawLast : currentHours;
    const nextTargetHours = lastServiceHours > 0 
      ? lastServiceHours + intervalHours 
      : (currentHours > 0 ? currentHours + intervalHours : intervalHours);
    const remainingHours = Math.max(0, Number((nextTargetHours - currentHours).toFixed(1)));
    const status = getServiceStatus(remainingHours);
    const percent = calculateWearPercentage(currentHours, lastServiceHours, intervalHours);

    return {
      currentHours,
      lastServiceHours,
      intervalHours,
      nextTargetHours,
      remainingHours,
      status,
      percent,
    };
  }, [activeGenerator]);

  // Selected day items
  const selectedDayOutages = monthOutages[selectedDay] || [];
  const selectedDayServices = monthServices[selectedDay] || [];

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSaveManualOutage = async () => {
    if (!outageStartHour) {
      Alert.alert('Error', 'Indica la hora de inicio del corte');
      return;
    }

    const baseDate = new Date(currentYear, currentMonth, selectedDay);
    const [startH, startM] = outageStartHour.split(':').map(n => parseInt(n) || 0);
    const startIso = new Date(baseDate.setHours(startH, startM, 0, 0)).toISOString();

    let endIso: string | null = null;
    let durationMinutes: number | undefined = undefined;

    if (!isStillOngoing && outageEndHour) {
      const [endH, endM] = outageEndHour.split(':').map(n => parseInt(n) || 0);
      const endDate = new Date(currentYear, currentMonth, selectedDay);
      endDate.setHours(endH, endM, 0, 0);
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
      notes: outageNotes || `Corte eléctrico del día ${selectedDay} de ${MONTH_NAMES[currentMonth]}`,
    });

    setShowAddOutageForm(false);
    setOutageNotes('');
    Alert.alert('Éxito', 'Corte eléctrico guardado correctamente en el calendario');
  };

  const formatMinutes = (mins?: number) => {
    if (!mins) return 'Duración no registrada';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} minutos`;
    return `${h}h ${m}m sin servicio eléctrico`;
  };

  const formatHour = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const sidebarBg = isDark ? 'rgba(17, 20, 27, 0.98)' : '#FFFFFF';
  const cardBg = isDark ? 'rgba(29, 34, 46, 0.8)' : '#F1F4F9';
  const textPrimary = colors.onSurface;
  const textSecondary = colors.onSurfaceVariant;
  const panelWidth = Math.min(480, windowWidth);

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlayRoot}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[
          styles.sidebarDrawer,
          { 
            width: panelWidth,
            backgroundColor: sidebarBg,
            borderLeftColor: isDark ? 'rgba(64, 72, 92, 0.45)' : 'rgba(0, 0, 0, 0.1)',
            transform: [{ translateX: slideAnim }]
          }
        ]}>

          {/* Header */}
          <View style={[styles.sidebarHeader, { borderBottomColor: isDark ? 'rgba(64, 72, 92, 0.3)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="flash-alert" size={18} color="#F59E0B" />
                <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Monitoreo de Energía & Mantenimiento
                </Text>
              </View>
              <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 19, marginTop: 2 }}>
                {activeScreen === 'calendar' ? 'Calendario de Cortes Eléctricos' : 'Conteo de Servicio de la Planta'}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={handleClose} 
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <MaterialIcons name="close" size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Navigation Pills */}
          <View style={styles.navPillsRow}>
            <TouchableOpacity
              style={[
                styles.navPill,
                activeScreen === 'calendar' && { backgroundColor: '#F59E0B' }
              ]}
              onPress={() => setActiveScreen('calendar')}
            >
              <MaterialIcons 
                name="calendar-month" 
                size={16} 
                color={activeScreen === 'calendar' ? '#FFFFFF' : textSecondary} 
              />
              <Text style={[
                styles.navPillText,
                { fontFamily: F.bold, color: activeScreen === 'calendar' ? '#FFFFFF' : textSecondary }
              ]}>
                Cortes y Regresos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navPill,
                activeScreen === 'countdown' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveScreen('countdown')}
            >
              <MaterialCommunityIcons 
                name="timer-sand" 
                size={16} 
                color={activeScreen === 'countdown' ? '#FFFFFF' : textSecondary} 
              />
              <Text style={[
                styles.navPillText,
                { fontFamily: F.bold, color: activeScreen === 'countdown' ? '#FFFFFF' : textSecondary }
              ]}>
                Conteo de Servicio
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* SCREEN 1: CALENDARIO DE CORTES ELECTRICOS Y REGRESOS */}
            {activeScreen === 'calendar' && (
              <View>

                {/* Banner de estado en vivo */}
                {activeOutage ? (
                  <View style={styles.activeOutageBanner}>
                    <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFFFFF" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activeOutageTitle, { fontFamily: F.bold }]}>
                        ¡CORTE ELÉCTRICO EN CURSO!
                      </Text>
                      <Text style={[styles.activeOutageSub, { fontFamily: F.regular }]}>
                        Inició: {formatHour(activeOutage.startTime)} | Planta suministrando energía
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.returnPowerBtn}
                      onPress={() => endOutage()}
                    >
                      <Text style={[styles.returnPowerBtnText, { fontFamily: F.bold }]}>Regresó la Luz</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.gridHealthyBanner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5' }]}>
                    <MaterialCommunityIcons name="check-decagram" size={20} color="#10B981" />
                    <Text style={{ fontFamily: F.semibold, color: '#10B981', fontSize: 13, flex: 1 }}>
                      Red Eléctrica Comercial Estable (Sin cortes activos)
                    </Text>
                    <TouchableOpacity 
                      style={styles.cutReportQuickBtn}
                      onPress={() => startOutage()}
                    >
                      <Text style={{ fontFamily: F.bold, color: '#F59E0B', fontSize: 12 }}>⚡ Hubo Corte</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Month Selector */}
                <View style={styles.monthHeader}>
                  <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
                    <MaterialIcons name="chevron-left" size={24} color={textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.monthTitle, { fontFamily: F.extrabold, color: textPrimary }]}>
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </Text>
                  <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
                    <MaterialIcons name="chevron-right" size={24} color={textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Day Labels */}
                <View style={styles.weekLabelsRow}>
                  {WEEK_DAYS.map((w, i) => (
                    <Text key={i} style={[styles.weekLabelText, { fontFamily: F.bold, color: textSecondary }]}>
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.calCellEmpty} />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const hasOutage = Boolean(monthOutages[day] && monthOutages[day].length > 0);
                    const hasService = Boolean(monthServices[day] && monthServices[day].length > 0);
                    const isSelected = selectedDay === day;

                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        style={[
                          styles.calCell,
                          isSelected && { backgroundColor: isDark ? '#2563EB' : '#1D4ED8', borderColor: '#60A5FA' },
                          hasOutage && !isSelected && { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' },
                        ]}
                        onPress={() => setSelectedDay(day)}
                      >
                        <Text style={[
                          styles.calDayNum,
                          { fontFamily: F.bold, color: isSelected ? '#FFFFFF' : textPrimary }
                        ]}>
                          {day}
                        </Text>

                        {/* Event Markers */}
                        <View style={styles.markerRow}>
                          {hasOutage && (
                            <View style={[styles.calDot, { backgroundColor: isSelected ? '#FDE68A' : '#F59E0B' }]} />
                          )}
                          {hasService && (
                            <View style={[styles.calDot, { backgroundColor: isSelected ? '#93C5FD' : '#3B82F6' }]} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Legend */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.calDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>Día con Corte Eléctrico</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.calDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>Servicio Realizado</Text>
                  </View>
                </View>

                {/* Selected Day Details Card */}
                <View style={[styles.dayDetailsCard, { backgroundColor: cardBg }]}>
                  <View style={styles.dayDetailsHeader}>
                    <View>
                      <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12 }}>
                        REGISTROS DEL DÍA
                      </Text>
                      <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 16 }}>
                        {selectedDay} de {MONTH_NAMES[currentMonth]} {currentYear}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={[styles.addOutageBtn, { backgroundColor: '#F59E0B' }]}
                      onPress={() => setShowAddOutageForm(true)}
                    >
                      <MaterialIcons name="add" size={16} color="#FFFFFF" />
                      <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 12 }}>Anexar Corte</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Outage Items */}
                  {selectedDayOutages.length === 0 && selectedDayServices.length === 0 ? (
                    <View style={styles.emptyDayBox}>
                      <MaterialCommunityIcons name="weather-sunny" size={32} color={textSecondary} />
                      <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 13, marginTop: 6 }}>
                        No hubo cortes eléctricos ni servicios en este día
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10, marginTop: 12 }}>
                      {selectedDayOutages.map((outage, idx) => (
                        <View key={outage.id || idx} style={[styles.outageLogCard, { backgroundColor: isDark ? '#1F2430' : '#FFFFFF' }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={[styles.boltCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                                <MaterialCommunityIcons name="flash-alert" size={18} color="#F59E0B" />
                              </View>
                              <View>
                                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }}>
                                  Corte Eléctrico #{idx + 1}
                                </Text>
                                <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12 }}>
                                  {formatMinutes(outage.durationMinutes)}
                                </Text>
                              </View>
                            </View>

                            <View style={[styles.statusBadge, { backgroundColor: outage.endTime ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                              <Text style={{ fontFamily: F.bold, fontSize: 11, color: outage.endTime ? '#10B981' : '#EF4444' }}>
                                {outage.endTime ? 'REGRESÓ' : 'ACTIVO'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.outageTimingRow}>
                            <View style={styles.timingCol}>
                              <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>Corte Inició:</Text>
                              <Text style={{ fontFamily: F.bold, color: '#EF4444', fontSize: 13 }}>
                                {formatHour(outage.startTime)}
                              </Text>
                            </View>
                            <MaterialIcons name="arrow-forward" size={16} color={textSecondary} />
                            <View style={styles.timingCol}>
                              <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>Luz Regresó:</Text>
                              <Text style={{ fontFamily: F.bold, color: '#10B981', fontSize: 13 }}>
                                {outage.endTime ? formatHour(outage.endTime) : 'En curso...'}
                              </Text>
                            </View>
                          </View>

                          {outage.notes && (
                            <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12, marginTop: 6 }}>
                              📝 {outage.notes}
                            </Text>
                          )}
                        </View>
                      ))}

                      {selectedDayServices.map((service, idx) => (
                        <View key={service.id || idx} style={[styles.outageLogCard, { backgroundColor: isDark ? '#1F2430' : '#FFFFFF', borderLeftColor: '#3B82F6', borderLeftWidth: 4 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialIcons name="build" size={18} color="#3B82F6" />
                            <View>
                              <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }}>
                                {COMPONENT_NAMES[service.serviceType] || 'Servicio de Mantenimiento'}
                              </Text>
                              <Text style={{ fontFamily: F.semibold, color: '#3B82F6', fontSize: 12 }}>
                                Realizado a las {service.horometer} Horas
                              </Text>
                            </View>
                          </View>
                          {service.notes && (
                            <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12, marginTop: 6 }}>
                              {service.notes}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Formulario para Anexar Corte Eléctrico */}
                {showAddOutageForm && (
                  <View style={[styles.manualFormCard, { backgroundColor: isDark ? '#191C24' : '#FFFFFF' }]}>
                    <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15, marginBottom: 12 }}>
                      Anexar Registro de Corte Eléctrico ({selectedDay} de {MONTH_NAMES[currentMonth]})
                    </Text>

                    <View style={styles.formRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { fontFamily: F.semibold, color: textSecondary }]}>
                          Hora del Corte:
                        </Text>
                        <TextInput
                          style={[styles.formInput, { backgroundColor: cardBg, color: textPrimary, fontFamily: F.medium }]}
                          value={outageStartHour}
                          onChangeText={setOutageStartHour}
                          placeholder="Ej: 14:30"
                          placeholderTextColor={textSecondary}
                        />
                      </View>

                      {!isStillOngoing && (
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.inputLabel, { fontFamily: F.semibold, color: textSecondary }]}>
                            Hora de Regreso:
                          </Text>
                          <TextInput
                            style={[styles.formInput, { backgroundColor: cardBg, color: textPrimary, fontFamily: F.medium }]}
                            value={outageEndHour}
                            onChangeText={setOutageEndHour}
                            placeholder="Ej: 18:45"
                            placeholderTextColor={textSecondary}
                          />
                        </View>
                      )}
                    </View>

                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 }}
                      onPress={() => setIsStillOngoing(!isStillOngoing)}
                    >
                      <MaterialIcons 
                        name={isStillOngoing ? 'check-box' : 'check-box-outline-blank'} 
                        size={20} 
                        color={isStillOngoing ? '#F59E0B' : textSecondary} 
                      />
                      <Text style={{ fontFamily: F.medium, color: textPrimary, fontSize: 13 }}>
                        El corte sigue activo (la luz no ha regresado)
                      </Text>
                    </TouchableOpacity>

                    <Text style={[styles.inputLabel, { fontFamily: F.semibold, color: textSecondary, marginTop: 6 }]}>
                      Notas u Observaciones:
                    </Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: cardBg, color: textPrimary, fontFamily: F.regular, height: 60 }]}
                      value={outageNotes}
                      onChangeText={setOutageNotes}
                      placeholder="Causa del corte, fase caída, comportamiento de la planta..."
                      placeholderTextColor={textSecondary}
                      multiline
                    />

                    <View style={styles.formBtnRow}>
                      <TouchableOpacity 
                        style={[styles.cancelBtn, { borderColor: textSecondary }]}
                        onPress={() => setShowAddOutageForm(false)}
                      >
                        <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.submitBtn, { backgroundColor: '#F59E0B' }]}
                        onPress={handleSaveManualOutage}
                      >
                        <Text style={{ fontFamily: F.bold, color: '#FFFFFF' }}>Guardar Corte</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </View>
            )}

            {/* SCREEN 2: CONTEO DE CUANTO TOCA HACERLE SERVICIO A LA PLANTA */}
            {activeScreen === 'countdown' && (
              <View>

                {/* Big Countdown Hero Card */}
                <View style={[styles.countdownHeroCard, { backgroundColor: isDark ? '#161B26' : '#F8FAFC' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12, letterSpacing: 0.5 }}>
                      CONTEO REGRESIVO DE MANTENIMIENTO
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${countdownStats.status.color}20` }]}>
                      <Text style={{ fontFamily: F.bold, color: countdownStats.status.color, fontSize: 11 }}>
                        {countdownStats.status.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.countdownBigNumberRow}>
                    <Text style={[styles.countdownBigNumber, { fontFamily: F.extrabold, color: countdownStats.status.color }]}>
                      {countdownStats.nextTargetHours.toFixed(1)}
                    </Text>
                    <View style={{ marginLeft: 8 }}>
                      <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 18 }}>
                        HORÓMETRO META
                      </Text>
                      <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 12 }}>
                        {countdownStats.remainingHours > 0 
                          ? `Restan ${countdownStats.remainingHours.toFixed(1)} hrs de operación`
                          : '¡Mantenimiento vencido!'}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarTrack}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${Math.max(5, countdownStats.percent)}%`,
                          backgroundColor: countdownStats.status.color 
                        }
                      ]} 
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                      {countdownStats.percent}% de ciclo operativo restante
                    </Text>
                    <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11 }}>
                      Meta: {countdownStats.nextTargetHours.toFixed(1)} hrs
                    </Text>
                  </View>

                  {/* Key Metrics Grid */}
                  <View style={styles.metricsGridRow}>
                    <View style={[styles.metricCol, { backgroundColor: cardBg }]}>
                      <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>Horómetro Actual</Text>
                      <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                        {countdownStats.currentHours.toFixed(1)} h
                      </Text>
                    </View>
                    <View style={[styles.metricCol, { backgroundColor: cardBg }]}>
                      <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>Último Servicio</Text>
                      <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                        {countdownStats.lastServiceHours.toFixed(1)} h
                      </Text>
                    </View>
                    <View style={[styles.metricCol, { backgroundColor: cardBg }]}>
                      <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>Intervalo</Text>
                      <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 16 }}>
                        Cada {countdownStats.intervalHours} h
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Component Breakdown Checklist */}
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15, marginBottom: 12 }}>
                    Desglose por Componente de la Planta
                  </Text>

                  {(['oil', 'oil_filter', 'fuel_filter', 'air_filter', 'coolant', 'battery'] as GeneratorComponentType[]).map((comp) => {
                    const compInterval = comp === 'coolant' || comp === 'battery' ? 1000 : comp === 'air_filter' ? 300 : 200;
                    const compLast = countdownStats.lastServiceHours;
                    const compHoursOperated = Math.max(0, countdownStats.currentHours - compLast);
                    const compLeft = Math.max(0, compInterval - compHoursOperated);
                    const compStatus = getServiceStatus(compLeft);

                    return (
                      <View key={comp} style={[styles.compCard, { backgroundColor: cardBg }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={[styles.compIconCircle, { backgroundColor: `${compStatus.color}20` }]}>
                            <MaterialIcons 
                              name={(COMPONENT_ICONS[comp] as any) || 'build'} 
                              size={18} 
                              color={compStatus.color} 
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                              {COMPONENT_NAMES[comp]}
                            </Text>
                            <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>
                              Intervalo: cada {compInterval} hrs | Operadas: {compHoursOperated.toFixed(1)} hrs
                            </Text>
                          </View>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontFamily: F.extrabold, color: compStatus.color, fontSize: 14 }}>
                            {compLeft > 0 ? `${compLeft.toFixed(1)} h` : 'VENCIDO'}
                          </Text>
                          <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 10 }}>
                            restantes
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

              </View>
            )}

          </ScrollView>

        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarDrawer: {
    height: '100%',
    borderLeftWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 20,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  navPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  navPillText: {
    fontSize: 12,
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  activeOutageBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  activeOutageTitle: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  activeOutageSub: {
    color: '#FEE2E2',
    fontSize: 11,
    marginTop: 2,
  },
  returnPowerBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  returnPowerBtnText: {
    color: '#DC2626',
    fontSize: 11,
  },
  gridHealthyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  cutReportQuickBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthArrow: {
    padding: 6,
  },
  monthTitle: {
    fontSize: 16,
  },
  weekLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekLabelText: {
    fontSize: 11,
    width: 38,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calCellEmpty: {
    width: 38,
    height: 42,
    marginVertical: 3,
  },
  calCell: {
    width: 38,
    height: 42,
    marginVertical: 3,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  calDayNum: {
    fontSize: 13,
  },
  markerRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayDetailsCard: {
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
  },
  dayDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addOutageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyDayBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  outageLogCard: {
    borderRadius: 10,
    padding: 12,
  },
  boltCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  outageTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  timingCol: {
    flex: 1,
  },
  manualFormCard: {
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  formInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  countdownHeroCard: {
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
  },
  countdownBigNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 14,
  },
  countdownBigNumber: {
    fontSize: 48,
    lineHeight: 52,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricsGridRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  metricCol: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  compCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  compIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
