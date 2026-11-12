import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyMoto } from '../../context/MotoContext';
import { useTheme } from '../../context/ThemeContext';
import { COMPONENT_NAMES, COMPONENT_ICONS } from '../../../constants/telemetry';

type FilterType = 'all' | 'horometer' | 'outages' | 'services';

export const HistoryTab = () => {
  const { horometerLogs, outages, services, activeGenerator } = useMyMoto();
  const { colors, isDark } = useTheme();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Combine and sort events
  const timelineEvents = useMemo(() => {
    const list: Array<{
      id: string;
      category: 'horometer' | 'outage' | 'service';
      title: string;
      subtitle: string;
      dateIso: string;
      dateFormatted: string;
      badge: string;
      badgeColor: string;
      icon: string;
      iconColor: string;
      notes?: string;
    }> = [];

    // 1. Horometer updates
    horometerLogs.forEach(h => {
      const d = new Date(h.date);
      list.push({
        id: `h-${h.id}`,
        category: 'horometer',
        title: `Horómetro: ${h.hours.toFixed(1)} Horas`,
        subtitle: `Incremento de +${h.deltaHours.toFixed(1)} hrs de operación | Por: ${h.userEmail || 'Operador'}`,
        dateIso: h.date,
        dateFormatted: d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        badge: 'CONSUMO',
        badgeColor: '#3B82F6',
        icon: 'speed',
        iconColor: '#3B82F6',
        notes: h.notes,
      });
    });

    // 2. Power Outages
    outages.forEach(o => {
      const d = new Date(o.startTime);
      const isReturned = Boolean(o.endTime);
      list.push({
        id: `o-${o.id}`,
        category: 'outage',
        title: isReturned 
          ? `Corte Eléctrico: ${o.durationMinutes ? `${Math.floor(o.durationMinutes / 60)}h ${o.durationMinutes % 60}m` : 'Resuelto'}`
          : '¡Corte Eléctrico en Curso!',
        subtitle: `Inicio: ${new Date(o.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${isReturned ? `| Regreso: ${new Date(o.endTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '| Sin luz actualmente'}`,
        dateIso: o.startTime,
        dateFormatted: d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
        badge: isReturned ? 'REGRESÓ' : 'ACTIVO',
        badgeColor: isReturned ? '#10B981' : '#EF4444',
        icon: 'flash-alert',
        iconColor: '#F59E0B',
        notes: o.notes,
      });
    });

    // 3. Maintenance Services
    services.forEach(s => {
      const d = new Date(s.date);
      list.push({
        id: `s-${s.id}`,
        category: 'service',
        title: COMPONENT_NAMES[s.serviceType] || 'Mantenimiento Preventivo',
        subtitle: `Ejecutado al horómetro ${s.horometer} h ${s.performedBy ? `| Técnico: ${s.performedBy}` : ''}`,
        dateIso: s.date,
        dateFormatted: d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
        badge: 'SERVICIO',
        badgeColor: '#8B5CF6',
        icon: 'build',
        iconColor: '#8B5CF6',
        notes: s.notes,
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
  }, [horometerLogs, outages, services]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return timelineEvents;
    if (activeFilter === 'horometer') return timelineEvents.filter(e => e.category === 'horometer');
    if (activeFilter === 'outages') return timelineEvents.filter(e => e.category === 'outage');
    if (activeFilter === 'services') return timelineEvents.filter(e => e.category === 'service');
    return timelineEvents;
  }, [timelineEvents, activeFilter]);

  const cardBg = isDark ? '#191C24' : '#FFFFFF';
  const textPrimary = colors.onSurface;
  const textSecondary = colors.onSurfaceVariant;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <View style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12, letterSpacing: 0.8 }}>
            AUDITORÍA DE REGISTROS
          </Text>
          <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 22 }}>
            Historial de Operación
          </Text>
          <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12, marginTop: 2 }}>
            {activeGenerator ? `${activeGenerator.brand} ${activeGenerator.model}` : 'Planta Eléctrica'}
          </Text>
        </View>

        {/* Filter Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 12 }}
          contentContainerStyle={[styles.filterRow, { marginBottom: 0 }]}
        >
          {[
            { id: 'all', label: 'Todos' },
            { id: 'horometer', label: 'Horómetros' },
            { id: 'outages', label: 'Cortes Luz' },
            { id: 'services', label: 'Servicios' },
          ].map((item) => {
            const isSelected = activeFilter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.filterPill,
                  isSelected && { backgroundColor: colors.primary }
                ]}
                onPress={() => setActiveFilter(item.id as FilterType)}
                activeOpacity={0.75}
              >
                <Text style={{
                  fontFamily: F.bold,
                  fontSize: 12,
                  color: isSelected ? '#FFFFFF' : textSecondary
                }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Timeline Events List */}
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredEvents.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: cardBg }]}>
              <MaterialIcons name="event-note" size={36} color={textSecondary} />
              <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 13, marginTop: 8 }}>
                No hay registros en esta categoría
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 10 }}>
              {filteredEvents.map((evt) => (
                <View key={evt.id} style={[styles.eventCard, { backgroundColor: cardBg }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={[styles.eventIconCircle, { backgroundColor: `${evt.iconColor}20` }]}>
                        {evt.category === 'outage' ? (
                          <MaterialCommunityIcons name="flash-alert" size={18} color={evt.iconColor} />
                        ) : (
                          <MaterialIcons name={evt.icon as any} size={18} color={evt.iconColor} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }}>
                          {evt.title}
                        </Text>
                        <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, marginTop: 2 }}>
                          {evt.subtitle}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.badgePill, { backgroundColor: `${evt.badgeColor}20` }]}>
                      <Text style={{ fontFamily: F.bold, color: evt.badgeColor, fontSize: 10 }}>
                        {evt.badge}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.eventFooter}>
                    <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>
                      📅 {evt.dateFormatted}
                    </Text>
                  </View>

                  {evt.notes ? (
                    <View style={styles.eventNotes}>
                      <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>
                        📝 {evt.notes}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  emptyBox: {
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  eventCard: {
    borderRadius: 12,
    padding: 14,
  },
  eventIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  eventFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  eventNotes: {
    marginTop: 6,
  },
});
