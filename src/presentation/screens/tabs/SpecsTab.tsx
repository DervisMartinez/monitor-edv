import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useMyMoto } from '../../context/MotoContext';
import { getGeneratorSpecs } from '../../../data/specs';

interface SpecsTabProps {
  onNavigateToServices?: () => void;
}

export const SpecsTab: React.FC<SpecsTabProps> = ({ onNavigateToServices }) => {
  const { colors, isDark } = useTheme();
  const { activeGenerator } = useMyMoto();

  const [activeCategory, setActiveCategory] = useState<'all' | 'power' | 'engine' | 'fluids' | 'maintenance'>('all');

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const specs = useMemo(() => {
    if (!activeGenerator) return null;
    return getGeneratorSpecs(activeGenerator.brand, activeGenerator.model);
  }, [activeGenerator]);

  if (!activeGenerator) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: colors.surface }}>
        <MaterialCommunityIcons name="engine" size={60} color={colors.onSurfaceVariant} />
        <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 18, marginTop: 16 }}>
          No hay planta eléctrica activa
        </Text>
      </View>
    );
  }

  const cardBg = isDark ? '#191C24' : '#FFFFFF';
  const textPrimary = colors.onSurface;
  const textSecondary = colors.onSurfaceVariant;

  const SpecRow = ({ label, value, icon, color = textPrimary }: { label: string; value?: string; icon: string; color?: string }) => {
    if (!value) return null;
    return (
      <View style={[styles.specRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <MaterialIcons name={icon as any} size={18} color={colors.primary} />
          <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 13 }}>
            {label}
          </Text>
        </View>
        <Text style={{ fontFamily: F.bold, color, fontSize: 13, textAlign: 'right' }}>
          {value}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12, letterSpacing: 0.8 }}>
          MANUAL TÉCNICO & DATASHEET
        </Text>
        <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 22 }}>
          Ficha Técnica de Planta
        </Text>
        <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12, marginTop: 2 }}>
          {activeGenerator.brand} {activeGenerator.model} • {activeGenerator.capacityKva} kVA
        </Text>
      </View>

      {/* Hero Image */}
      {(activeGenerator.customImageUri || activeGenerator.imageUrl || activeGenerator.catalogImageRes) && (
        <View style={[styles.imageCard, { backgroundColor: cardBg }]}>
          <Image 
            source={activeGenerator.customImageUri || activeGenerator.imageUrl ? { uri: activeGenerator.customImageUri || activeGenerator.imageUrl } : activeGenerator.catalogImageRes} 
            style={styles.image} 
            resizeMode="contain" 
          />
        </View>
      )}

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {[
          { id: 'all', label: 'Todas' },
          { id: 'power', label: 'Potencia' },
          { id: 'engine', label: 'Motor' },
          { id: 'fluids', label: 'Fluidos & Aceite' },
          { id: 'maintenance', label: 'Mantenimiento' },
        ].map(cat => {
          const isSelected = activeCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                { backgroundColor: cardBg },
                isSelected && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveCategory(cat.id as any)}
            >
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: isSelected ? '#FFFFFF' : textSecondary }}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 1. Potencia y Generación */}
      {(activeCategory === 'all' || activeCategory === 'power') && (
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { fontFamily: F.bold, color: colors.primary }]}>
            ⚡ GENERACIÓN & POTENCIA ELÉCTRICA
          </Text>
          <SpecRow label="Capacidad Standby" value={specs?.powerKva || `${activeGenerator.capacityKva} kVA`} icon="bolt" color="#F59E0B" />
          <SpecRow label="Potencia Activa" value={specs?.powerKw || `${Math.round(activeGenerator.capacityKva * 0.8)} kW`} icon="flash-on" />
          <SpecRow label="Voltaje de Salida" value={specs?.voltage || '127/220V - 440V Trifásico'} icon="electrical-services" />
          <SpecRow label="Frecuencia y RPM" value={`${specs?.frequency || '60 Hz'} • ${specs?.rpm || '1800 RPM'}`} icon="speed" />
          <SpecRow label="Alternador" value={specs?.alternator || 'Stamford Brushless con AVR'} icon="rotate-right" />
          <SpecRow label="Panel de Control" value={specs?.controlPanel || 'DSE 6120 MKII con ATS'} icon="settings-remote" />
        </View>
      )}

      {/* 2. Motor y Mecánica */}
      {(activeCategory === 'all' || activeCategory === 'engine') && (
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { fontFamily: F.bold, color: colors.primary }]}>
            ⚙️ MOTOR INDUSTRIAL
          </Text>
          <SpecRow label="Marca del Motor" value={specs?.engineBrand || 'Motor Heavy Duty'} icon="engineering" />
          <SpecRow label="Cilindrada" value={specs?.displacement || '4 a 6 Cilindros en Línea'} icon="view-day" />
          <SpecRow label="Tipo de Combustible" value={specs?.fuelType || activeGenerator.fuelType.toUpperCase()} icon="local-gas-station" color={colors.primary} />
          <SpecRow label="Batería de Arranque" value={specs?.battery || '12V / 24V Heavy Duty AGM'} icon="battery-charging-full" />
        </View>
      )}

      {/* 3. Fluidos y Consumo */}
      {(activeCategory === 'all' || activeCategory === 'fluids') && (
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { fontFamily: F.bold, color: colors.primary }]}>
            🛢️ FLUIDOS & CONSUMO
          </Text>
          <SpecRow label="Aceite Recomendado" value={specs?.oilTypeRecommended || '15W-40 CK-4 / CJ-4 Heavy Duty'} icon="opacity" color="#10B981" />
          <SpecRow label="Capacidad de Aceite" value={specs?.oilCapacity || '16.4 Litros'} icon="format-color-fill" />
          <SpecRow label="Capacidad de Tanque" value={specs?.fuelCapacity || '250 Litros'} icon="local-gas-station" />
          <SpecRow label="Consumo Estimado" value={specs?.fuelConsumption || '18.5 L/h al 75%'} icon="timer" />
          <SpecRow label="Líquido Refrigerante" value={specs?.coolantCapacity || '24.5 Litros 50/50'} icon="ac-unit" />
        </View>
      )}

      {/* 4. Mantenimiento */}
      {(activeCategory === 'all' || activeCategory === 'maintenance') && (
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { fontFamily: F.bold, color: colors.primary }]}>
            🛠️ INTERVALOS DE SERVICIO RECOMENDADOS
          </Text>
          <SpecRow label="Cambio de Aceite" value={specs?.maintenanceIntervalOil || `Cada ${activeGenerator.serviceIntervalHours} Horas`} icon="alarm" color="#10B981" />
          <SpecRow label="Filtros de Aceite y Combustible" value={specs?.maintenanceIntervalFilters || `Cada ${activeGenerator.serviceIntervalHours} Horas`} icon="filter-alt" />
          <SpecRow label="Ubicación Física" value={activeGenerator.location || 'Sala de Máquinas'} icon="place" />
        </View>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  imageCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 180,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});
