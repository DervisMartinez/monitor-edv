import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GeneratorSpecs, getGeneratorSpecs } from '../../data/specs';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  myMoto?: any;
  specs?: GeneratorSpecs | null;
}

export const TechnicalSheetModal: React.FC<Props> = ({ visible, onClose, myMoto: propGen, specs: propSpecs }) => {
  const { colors } = useTheme();
  const { activeGenerator } = useMyMoto();

  const currentGen = propGen || activeGenerator;
  const genSpecs = propSpecs || (currentGen ? getGeneratorSpecs(currentGen.brand, currentGen.model) : null);

  if (!currentGen) return null;

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  const imageSource = currentGen.catalogImageRes || (currentGen.imageUrl ? { uri: currentGen.imageUrl } : null);

  const SpecItem = ({ label, value, icon, color = colors.onSurface }: { label: string; value?: string; icon: string; color?: string }) => {
    if (!value) return null;
    return (
      <View style={[styles.specRow, { borderBottomColor: colors.outlineVariant }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '48%', paddingRight: 8 }}>
          <MaterialIcons name={icon as any} size={17} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12.5 }} numberOfLines={2}>
            {label}
          </Text>
        </View>
        <Text style={{ fontFamily: F.bold, color, fontSize: 13, textAlign: 'right', flex: 1, flexWrap: 'wrap' }}>
          {value}
        </Text>
      </View>
    );
  };

  const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
      <MaterialCommunityIcons name={icon as any} size={18} color={colors.primary} style={{ marginRight: 8 }} />
      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.outlineVariant }]}>
            <View>
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 18 }}>
                Ficha Técnica de la Planta
              </Text>
              <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 13 }}>
                {currentGen.brand} {currentGen.model}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}>
              <MaterialIcons name="close" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Generator Hero Image */}
            {imageSource && (
              <View style={[styles.imageCard, { backgroundColor: colors.surfaceContainer }]}>
                <Image source={imageSource} style={styles.vehicleImage} resizeMode="contain" />
              </View>
            )}

            {/* SECCIÓN 1: POTENCIA Y GENERACIÓN ELÉCTRICA */}
            <SectionHeader title="Generación y Potencia" icon="flash" />
            <SpecItem label="Capacidad Standby" value={genSpecs?.powerKva || `${currentGen.capacityKva} kVA`} icon="bolt" color="#F59E0B" />
            <SpecItem label="Potencia Activa" value={genSpecs?.powerKw || `${Math.round(currentGen.capacityKva * 0.8)} kW`} icon="offline-bolt" />
            <SpecItem label="Voltaje / Frecuencia" value={`${genSpecs?.voltage || '127/220V Trifásico'} • ${genSpecs?.frequency || '60 Hz'}`} icon="electrical-services" />
            <SpecItem label="Régimen de Giro" value={genSpecs?.rpm || '1800 RPM'} icon="speed" />
            <SpecItem label="Alternador" value={genSpecs?.alternator || 'Stamford Brushless con AVR'} icon="rotate-right" />
            <SpecItem label="Panel de Control" value={genSpecs?.controlPanel || 'DSE / Deep Sea Automático ATS'} icon="settings-remote" />

            {/* SECCIÓN 2: MOTOR Y FLUIDOS */}
            <SectionHeader title="Motor y Consumo" icon="engine" />
            <SpecItem label="Marca del Motor" value={genSpecs?.engineBrand || 'Motor Industrial Diésel'} icon="branding-watermark" />
            <SpecItem label="Cilindrada" value={genSpecs?.displacement || '4 a 6 Cilindros Turbo'} icon="layers" />
            <SpecItem label="Combustible" value={genSpecs?.fuelType || currentGen.fuelType.toUpperCase()} icon="local-gas-station" color={colors.primary} />
            <SpecItem label="Capacidad de Tanque" value={genSpecs?.fuelCapacity || '250 Litros'} icon="battery-charging-full" />
            <SpecItem label="Consumo Estimado" value={genSpecs?.fuelConsumption || '18.5 L/h al 75%'} icon="opacity" />
            <SpecItem label="Capacidad de Aceite" value={genSpecs?.oilCapacity || '16.4 Litros'} icon="format-color-fill" />
            <SpecItem label="Aceite Recomendado" value={genSpecs?.oilTypeRecommended || '15W-40 CI-4 / CJ-4 Heavy Duty'} icon="invert-colors" color="#10B981" />
            <SpecItem label="Refrigerante" value={genSpecs?.coolantCapacity || '24.5 Litros (50/50)'} icon="ac-unit" />
            <SpecItem label="Batería de Arranque" value={genSpecs?.battery || '12V / 24V Heavy Duty AGM'} icon="battery-std" />

            {/* SECCIÓN 3: INTERVALOS DE SERVICIO */}
            <SectionHeader title="Intervalos de Mantenimiento" icon="calendar-clock" />
            <SpecItem label="Cambio de Aceite" value={genSpecs?.maintenanceIntervalOil || `Cada ${currentGen.serviceIntervalHours} Horas`} icon="alarm" color="#10B981" />
            <SpecItem label="Filtros (Aceite y Trampa)" value={genSpecs?.maintenanceIntervalFilters || `Cada ${currentGen.serviceIntervalHours} Horas`} icon="filter-alt" />

            {/* Ubicación y Serie */}
            <SectionHeader title="Datos de Instalación" icon="map-marker" />
            <SpecItem label="Ubicación Física" value={currentGen.location || 'Sala de Máquinas'} icon="place" />
            <SpecItem label="Número de Serie" value={currentGen.serialNumber || 'BPG-2024-C125'} icon="tag" />
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
  },
  imageCard: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleImage: {
    width: '90%',
    height: '90%',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});
