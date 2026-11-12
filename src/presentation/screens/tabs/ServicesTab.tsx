import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  Modal,
  StyleSheet,
  Alert
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyMoto } from '../../context/MotoContext';
import { useTheme } from '../../context/ThemeContext';
import { GeneratorComponentType } from '../../../domain/entities/Generator';
import { 
  COMPONENT_NAMES, 
  COMPONENT_ICONS, 
  getServiceStatus 
} from '../../../constants/telemetry';

interface ServicesTabProps {
  initialComponent?: GeneratorComponentType;
}

const SERVICE_OPTIONS: { type: GeneratorComponentType; label: string; desc: string }[] = [
  { type: 'oil', label: 'Aceite de Motor (15W-40)', desc: 'Cambio de lubricante diésel/gas según especificación del fabricante' },
  { type: 'oil_filter', label: 'Filtro de Aceite', desc: 'Reemplazo del elemento filtrante de lubricante' },
  { type: 'fuel_filter', label: 'Filtro de Combustible / Trampa', desc: 'Sustitución de filtro primario y purga de agua' },
  { type: 'air_filter', label: 'Filtro de Aire Tipo Seco', desc: 'Limpieza o sustitución del cartucho de admisión de aire' },
  { type: 'coolant', label: 'Refrigerante 50/50', desc: 'Revisión / cambio de refrigerante y lavado de radiador' },
  { type: 'battery', label: 'Batería de Arranque (12V/24V)', desc: 'Revisión de bornes, densidad de electrolito y voltaje de carga' },
  { type: 'belts', label: 'Correas de Transmisión', desc: 'Ajuste de tensión o sustitución de correa de alternador/bomba' },
  { type: 'valves_calibration', label: 'Calibración de Válvulas', desc: 'Ajuste de holgura de balancines e inyectores' },
  { type: 'general_inspection', label: 'Inspección Preventiva General', desc: 'Revisión de fugas, tornillería, panel de control y mangueras' },
  { type: 'other', label: 'Otro Servicio Técnico', desc: 'Cualquier otra intervención correctiva o preventiva' },
];

export const ServicesTab: React.FC<ServicesTabProps> = ({ initialComponent }) => {
  const { activeGenerator, services, addService, deleteService, currentUser } = useMyMoto();
  const { colors, isDark } = useTheme();

  const [selectedComp, setSelectedComp] = useState<GeneratorComponentType>(initialComponent || 'oil');
  const [horometerInput, setHorometerInput] = useState(activeGenerator?.currentHours.toString() || '0');
  const [performedBy, setPerformedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const handleSaveService = async () => {
    const hoursNum = parseFloat(horometerInput);
    if (isNaN(hoursNum) || hoursNum < 0) {
      Alert.alert('Horómetro Inválido', 'Por favor ingresa un horómetro válido en horas.');
      return;
    }

    await addService({
      generatorId: activeGenerator?.id || 'gen-blue-power-c125',
      userId: currentUser?.id || 'user-001',
      userEmail: currentUser?.email || 'operador@empresa.com',
      serviceType: selectedComp,
      horometer: Number(hoursNum.toFixed(1)),
      date: serviceDate,
      performedBy: performedBy.trim() || (currentUser?.fullName || 'Operador'),
      notes: notes.trim(),
    });

    setShowAddModal(false);
    setNotes('');
    Alert.alert('Servicio Registrado', 'El mantenimiento técnico fue guardado exitosamente sin requerir montos ni cobros.');
  };

  const handleDeleteService = (id: string) => {
    setServiceToDelete(id);
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      await deleteService(serviceToDelete);
    } finally {
      setServiceToDelete(null);
    }
  };

  const cardBg = isDark ? '#191C24' : '#FFFFFF';
  const inputBg = isDark ? '#232733' : '#F1F4F9';
  const textPrimary = colors.onSurface;
  const textSecondary = colors.onSurfaceVariant;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.surface }}
    >
      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 125 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12, letterSpacing: 0.8 }}>
              MANTENIMIENTO TÉCNICO
            </Text>
            <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 22 }}>
              Servicios de la Planta
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.newServiceBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setHorometerInput(activeGenerator?.currentHours.toString() || '0');
              setShowAddModal(true);
            }}
          >
            <MaterialIcons name="add" size={18} color="#FFFFFF" />
            <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 13 }}>
              Registrar Servicio
            </Text>
          </TouchableOpacity>
        </View>

        {/* Informative Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : '#EFF6FF' }]}>
          <MaterialCommunityIcons name="shield-check" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 13 }}>
              Control Operativo Estándar
            </Text>
            <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11, marginTop: 2 }}>
              Registro estrictamente técnico de intervenciones mecánicas y cambios de consumibles. Sin costos ni montos anexados.
            </Text>
          </View>
        </View>

        {/* Current Generator Status Summary */}
        {activeGenerator && (() => {
          const cur = activeGenerator.currentHours;
          const interval = activeGenerator.serviceIntervalHours || 200;
          const rawLast = activeGenerator.lastServiceHours || 0;
          const validLast = (rawLast >= 0 && rawLast <= cur) ? rawLast : cur;
          const nextTarget = validLast > 0 ? validLast + interval : (cur > 0 ? cur + interval : interval);
          const remaining = Math.max(0, Number((nextTarget - cur).toFixed(1)));

          return (
            <View style={[styles.generatorSummaryCard, { backgroundColor: cardBg }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15 }}>
                    {activeGenerator.brand} {activeGenerator.model}
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12 }}>
                    Capacidad: {activeGenerator.capacityKva} kVA | Combustible: {activeGenerator.fuelType.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.horoBadge, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                  <Text style={{ fontFamily: F.extrabold, color: colors.primary, fontSize: 14 }}>
                    {cur.toFixed(1)} hrs
                  </Text>
                </View>
              </View>

              <View style={styles.serviceMetaRow}>
                <View style={styles.serviceMetaCol}>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>Último Servicio</Text>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                    {validLast.toFixed(1)} hrs
                  </Text>
                </View>
                <View style={styles.serviceMetaCol}>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>Intervalo</Text>
                  <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 13 }}>
                    Cada {interval} hrs
                  </Text>
                </View>
                <View style={styles.serviceMetaCol}>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>Próximo en</Text>
                  <Text style={{ fontFamily: F.bold, color: '#F59E0B', fontSize: 13 }}>
                    {nextTarget.toFixed(1)} hrs
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 9 }}>
                    (restan {remaining.toFixed(1)} hrs)
                  </Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* List of Previous Services */}
        <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16, marginTop: 22, marginBottom: 12 }}>
          Historial de Mantenimientos Realizados ({services.length})
        </Text>

        {services.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
            <MaterialIcons name="build" size={36} color={textSecondary} />
            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 13, marginTop: 8 }}>
              No se han registrado servicios para esta planta eléctrica
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {services.map((item) => (
              <View key={item.id} style={[styles.serviceCard, { backgroundColor: cardBg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
                      <MaterialIcons 
                        name={(COMPONENT_ICONS[item.serviceType] as any) || 'build'} 
                        size={20} 
                        color={colors.primary} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }}>
                        {COMPONENT_NAMES[item.serviceType] || 'Servicio Técnico'}
                      </Text>
                      <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                        Fecha: {item.date} {item.performedBy ? `| Por: ${item.performedBy}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                    <Text style={{ fontFamily: F.extrabold, color: colors.primary, fontSize: 15 }}>
                      {item.horometer} h
                    </Text>
                    <TouchableOpacity 
                      onPress={() => handleDeleteService(item.id)}
                      style={{ marginTop: 4, padding: 4 }}
                    >
                      <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12 }}>
                      📝 {item.notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Modal: Registrar Servicio */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 17 }}>
                Registrar Mantenimiento Realizado
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Tipo de Servicio */}
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                Tipo de Mantenimiento / Pieza Atendida:
              </Text>
              <View style={styles.serviceChipsWrap}>
                {SERVICE_OPTIONS.map((opt) => {
                  const isSelected = selectedComp === opt.type;
                  return (
                    <TouchableOpacity
                      key={opt.type}
                      style={[
                        styles.serviceChip,
                        { backgroundColor: inputBg, borderColor: isSelected ? colors.primary : 'transparent' },
                        isSelected && { backgroundColor: 'rgba(37, 99, 235, 0.15)' }
                      ]}
                      onPress={() => setSelectedComp(opt.type)}
                    >
                      <MaterialIcons 
                        name={(COMPONENT_ICONS[opt.type] as any) || 'build'} 
                        size={16} 
                        color={isSelected ? colors.primary : textSecondary} 
                      />
                      <Text style={{ fontFamily: F.semibold, color: isSelected ? colors.primary : textPrimary, fontSize: 12 }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Horómetro */}
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary, marginTop: 14 }]}>
                Horómetro de la Planta al Momento del Servicio (Horas):
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]}
                value={horometerInput}
                onChangeText={setHorometerInput}
                keyboardType="numeric"
                placeholder="Ej: 1250.0"
                placeholderTextColor={textSecondary}
              />

              {/* Fecha */}
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary, marginTop: 14 }]}>
                Fecha de Realización (AAAA-MM-DD):
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                value={serviceDate}
                onChangeText={setServiceDate}
                placeholder="2026-11-10"
                placeholderTextColor={textSecondary}
              />

              {/* Responsable */}
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary, marginTop: 14 }]}>
                Técnico u Operador Responsable:
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                value={performedBy}
                onChangeText={setPerformedBy}
                placeholder="Nombre del técnico o taller autorizado"
                placeholderTextColor={textSecondary}
              />

              {/* Observaciones */}
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary, marginTop: 14 }]}>
                Observaciones Técnicas (Marcas de filtros, viscosidad de aceite, estado):
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.regular, height: 70 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Detalles técnicos de la intervención..."
                placeholderTextColor={textSecondary}
                multiline
              />

              {/* Actions */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity 
                  style={[styles.modalCancelBtn, { borderColor: textSecondary }]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveService}
                >
                  <Text style={{ fontFamily: F.bold, color: '#FFFFFF' }}>Guardar Registro</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Confirmación Eliminar Servicio */}
      <Modal
        visible={Boolean(serviceToDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setServiceToDelete(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmDialog, { backgroundColor: cardBg }]}>
            <View style={styles.deleteIconCircle}>
              <MaterialIcons name="delete-outline" size={26} color="#EF4444" />
            </View>

            <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 18, textAlign: 'center', marginTop: 14 }}>
              ¿Eliminar Registro?
            </Text>
            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
              ¿Deseas desvincular este registro de mantenimiento técnico?
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.btnCancel, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}
                onPress={() => setServiceToDelete(null)}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmDelete, { backgroundColor: '#EF4444' }]}
                onPress={handleConfirmDeleteService}
                activeOpacity={0.85}
              >
                <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 13 }}>
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  newServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  generatorSummaryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  horoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  serviceMetaCol: {
    flex: 1,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  serviceCard: {
    borderRadius: 12,
    padding: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  deleteIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnConfirmDelete: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCloseBtn: {
    padding: 4,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
  },
  serviceChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  textInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalSubmitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
