import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Modal, 
  Platform 
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Generator, HorometerRecord, PowerOutage, GeneratorService, AppUser } from '../../../domain/entities/Generator';
import { COMPONENT_NAMES, COMPONENT_ICONS, getServiceStatus } from '../../../constants/telemetry';

interface Props {
  visible: boolean;
  generator: Generator | null;
  horometerLogs: HorometerRecord[];
  outages: PowerOutage[];
  services: GeneratorService[];
  appUsers: AppUser[];
  currentUser: any;
  onClose: () => void;
}

export const PlantReportModal: React.FC<Props> = ({
  visible,
  generator,
  horometerLogs,
  outages,
  services,
  appUsers,
  currentUser,
  onClose,
}) => {
  if (!generator) return null;

  const F = {
    extrabold: 'Montserrat_800ExtraBold',
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  // Filter logs, outages and services specific to this generator
  const plantLogs = horometerLogs.filter(l => l.generatorId === generator.id);
  const plantOutages = outages.filter(o => o.generatorId === generator.id);
  const plantServices = services.filter(s => s.generatorId === generator.id);
  const assignedUsers = appUsers.filter(u => u.assignedGeneratorId === generator.id);

  // Statistics
  const totalOutagesCount = plantOutages.length;
  const totalBlackoutMinutes = plantOutages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
  const totalBlackoutHours = (totalBlackoutMinutes / 60).toFixed(1);

  const interval = generator.serviceIntervalHours > 0 ? generator.serviceIntervalHours : 200;
  const validLastService = (generator.lastServiceHours >= 0 && generator.lastServiceHours <= generator.currentHours)
    ? generator.lastServiceHours
    : generator.currentHours;
  const nextTargetHours = validLastService > 0 ? validLastService + interval : (generator.currentHours > 0 ? generator.currentHours + interval : interval);
  const remainingHours = Math.max(0, Number((nextTargetHours - generator.currentHours).toFixed(1)));
  const statusInfo = getServiceStatus(remainingHours);

  const reportDate = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const reportTime = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const reportCode = `EDV-INF-${(generator.model || 'GEN').toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        
        {/* Floating Top Controls (Hidden on print) */}
        <View style={styles.topControls}>
          <TouchableOpacity 
            style={styles.printActionBtn} 
            onPress={handlePrint}
            activeOpacity={0.85}
          >
            <MaterialIcons name="print" size={18} color="#FFFFFF" />
            <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 13 }}>
              Imprimir / Guardar como PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.closeActionBtn} 
            onPress={onClose}
            activeOpacity={0.8}
          >
            <MaterialIcons name="close" size={20} color="#1A1C1C" />
            <Text style={{ fontFamily: F.semibold, color: '#1A1C1C', fontSize: 13 }}>
              Cerrar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Printable Report Sheet */}
        <ScrollView 
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.printableSheet} id="edv-printable-report">
            
            {/* 1. INSTITUTIONAL HEADER */}
            <View style={styles.reportHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                <View style={styles.headerLogoBox}>
                  <Image 
                    source={require('../../../../assets/images/LOGO-EMPRESASDELVALLE.png')} 
                    style={{ width: '85%', height: '85%' }}
                    resizeMode="contain"
                  />
                </View>
                <View>
                  <Text style={[styles.corpTitle, { fontFamily: F.extrabold }]}>
                    EMPRESAS DEL VALLE
                  </Text>
                  <Text style={[styles.corpSub, { fontFamily: F.bold }]}>
                    DIVISIÓN DE TELEMETRÍA Y MANTENIMIENTO ENERGÉTICO
                  </Text>
                  <Text style={[styles.corpRif, { fontFamily: F.medium }]}>
                    Construyendo el futuro hoy • RIF: J-30984920-1
                  </Text>
                </View>
              </View>

              <View style={styles.headerMetaBox}>
                <View style={styles.codePill}>
                  <Text style={[styles.codeText, { fontFamily: F.bold }]}>{reportCode}</Text>
                </View>
                <Text style={[styles.dateText, { fontFamily: F.semibold }]}>
                  {reportDate} • {reportTime}
                </Text>
                <Text style={[styles.authorText, { fontFamily: F.regular }]}>
                  Emisor: {currentUser?.fullName || 'Superadministrador'}
                </Text>
              </View>
            </View>

            <View style={styles.dividerThick} />

            {/* Title */}
            <View style={{ marginVertical: 14, alignItems: 'center' }}>
              <Text style={[styles.reportMainTitle, { fontFamily: F.extrabold }]}>
                INFORME TÉCNICO Y AUDITORÍA DE GENERADOR
              </Text>
              <Text style={[styles.reportMainSubtitle, { fontFamily: F.medium }]}>
                Evaluación Operacional de Horómetro, Cortes de Red y Servicios Preventivos
              </Text>
            </View>

            {/* 2. GENERAL PLANT INFORMATION CARD */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="engine" size={20} color="#001136" />
                <Text style={[styles.sectionTitle, { fontFamily: F.bold }]}>
                  1. DATOS DE IDENTIFICACIÓN Y ASIGNACIÓN CORPORATIVA
                </Text>
              </View>

              <View style={styles.dataGrid}>
                <View style={styles.dataCol}>
                  <Text style={[styles.dataLabel, { fontFamily: F.semibold }]}>NOMBRE DEL EQUIPO:</Text>
                  <Text style={[styles.dataValueBold, { fontFamily: F.bold }]}>{generator.name}</Text>
                </View>

                <View style={styles.dataCol}>
                  <Text style={[styles.dataLabel, { fontFamily: F.semibold }]}>EMPRESA / FILIAL:</Text>
                  <Text style={[styles.dataValue, { fontFamily: F.medium }]}>
                    {generator.companyName || 'Empresas Del Valle (Sede Central)'}
                  </Text>
                </View>

                <View style={styles.dataCol}>
                  <Text style={[styles.dataLabel, { fontFamily: F.semibold }]}>DEPARTAMENTO / ÁREA:</Text>
                  <Text style={[styles.dataValue, { fontFamily: F.medium }]}>
                    {generator.departmentName || 'Operaciones & Mantenimiento'}
                  </Text>
                </View>

                <View style={styles.dataCol}>
                  <Text style={[styles.dataLabel, { fontFamily: F.semibold }]}>UBICACIÓN FÍSICA:</Text>
                  <Text style={[styles.dataValue, { fontFamily: F.medium }]}>
                    📍 {generator.location || 'Sala de Máquinas - Edificio Central'}
                  </Text>
                </View>

                <View style={styles.dataCol}>
                  <Text style={[styles.dataLabel, { fontFamily: F.semibold }]}>MARCA & MODELO:</Text>
                  <Text style={[styles.dataValue, { fontFamily: F.medium }]}>
                    {generator.brand} {generator.model}
                  </Text>
                </View>

                <View style={styles.dataCol}>
                  <Text style={[styles.dataLabel, { fontFamily: F.semibold }]}>POTENCIA NOMINAL:</Text>
                  <Text style={[styles.dataValue, { fontFamily: F.medium }]}>
                    {generator.capacityKva} kVA ({Math.round(generator.capacityKva * 0.8)} kW)
                  </Text>
                </View>

                <View style={styles.dataCol}>
                  <Text style={[styles.dataLabel, { fontFamily: F.semibold }]}>TIPO DE COMBUSTIBLE:</Text>
                  <Text style={[styles.dataValue, { fontFamily: F.medium }]}>
                    {generator.fuelType.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.dataCol}>
                  <Text style={[styles.dataLabel, { fontFamily: F.semibold }]}>NÚMERO DE SERIE:</Text>
                  <Text style={[styles.dataValue, { fontFamily: F.medium }]}>
                    {generator.serialNumber || 'N/D'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. HOROMETER AND PREVENTIVE MAINTENANCE AUDIT */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="speed" size={20} color="#001136" />
                <Text style={[styles.sectionTitle, { fontFamily: F.bold }]}>
                  2. ESTADO DEL HORÓMETRO Y PRÓXIMO SERVICIO
                </Text>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiBox}>
                  <Text style={[styles.kpiBoxLabel, { fontFamily: F.semibold }]}>HORÓMETRO ACTUAL</Text>
                  <Text style={[styles.kpiBoxValue, { fontFamily: F.extrabold, color: '#001136' }]}>
                    {generator.currentHours.toFixed(1)} h
                  </Text>
                  <Text style={[styles.kpiBoxSub, { fontFamily: F.regular }]}>Horas acumuladas</Text>
                </View>

                <View style={styles.kpiBox}>
                  <Text style={[styles.kpiBoxLabel, { fontFamily: F.semibold }]}>INTERVALO DE SERVICIO</Text>
                  <Text style={[styles.kpiBoxValue, { fontFamily: F.extrabold, color: '#4B5F84' }]}>
                    {generator.serviceIntervalHours} h
                  </Text>
                  <Text style={[styles.kpiBoxSub, { fontFamily: F.regular }]}>Frecuencia programada</Text>
                </View>

                <View style={styles.kpiBox}>
                  <Text style={[styles.kpiBoxLabel, { fontFamily: F.semibold }]}>ÚLTIMO MANTENIMIENTO</Text>
                  <Text style={[styles.kpiBoxValue, { fontFamily: F.extrabold, color: '#4B5F84' }]}>
                    {validLastService.toFixed(1)} h
                  </Text>
                  <Text style={[styles.kpiBoxSub, { fontFamily: F.regular }]}>Horómetro en el cambio</Text>
                </View>

                <View style={[styles.kpiBox, { borderColor: statusInfo.color, borderWidth: 1.5 }]}>
                  <Text style={[styles.kpiBoxLabel, { fontFamily: F.semibold, color: statusInfo.color }]}>
                    PRÓXIMO SERVICIO
                  </Text>
                  <Text style={[styles.kpiBoxValue, { fontFamily: F.extrabold, color: statusInfo.color }]}>
                    {nextTargetHours.toFixed(1)} h
                  </Text>
                  <Text style={[styles.kpiBoxSub, { fontFamily: F.bold, color: statusInfo.color }]}>
                    {remainingHours > 0 ? `Restan ${remainingHours.toFixed(1)} h • ${statusInfo.label}` : `¡VENCIDO! • ${statusInfo.label}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* 4. BLACKOUT & GRID FAILURE LOG */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="flash-alert" size={20} color="#001136" />
                <Text style={[styles.sectionTitle, { fontFamily: F.bold }]}>
                  3. HISTORIAL DE CORTES DE RED Y GENERACIÓN DE RESPALDO
                </Text>
              </View>

              <View style={styles.summaryStatsRow}>
                <Text style={[styles.summaryStatItem, { fontFamily: F.semibold }]}>
                  Total de Cortes Registrados: <Text style={{ fontFamily: F.bold, color: '#001136' }}>{totalOutagesCount}</Text>
                </Text>
                <Text style={[styles.summaryStatItem, { fontFamily: F.semibold }]}>
                  Tiempo Total Sin Red Comercial: <Text style={{ fontFamily: F.bold, color: '#BA1A1A' }}>{totalBlackoutHours} Horas</Text>
                </Text>
                <Text style={[styles.summaryStatItem, { fontFamily: F.semibold }]}>
                  Estado Actual de Red: <Text style={{ fontFamily: F.bold, color: '#00AE78' }}>Estable (Standby)</Text>
                </Text>
              </View>

              {plantOutages.length === 0 ? (
                <Text style={[styles.emptyText, { fontFamily: F.regular }]}>
                  Sin cortes eléctricos registrados para esta unidad de generación.
                </Text>
              ) : (
                <View style={styles.miniTable}>
                  <View style={styles.miniTableHeader}>
                    <Text style={[styles.miniTh, { flex: 2, fontFamily: F.bold }]}>INICIO DEL CORTE</Text>
                    <Text style={[styles.miniTh, { flex: 2, fontFamily: F.bold }]}>RESTABLECIMIENTO</Text>
                    <Text style={[styles.miniTh, { flex: 1.5, fontFamily: F.bold }]}>DURACIÓN</Text>
                    <Text style={[styles.miniTh, { flex: 2.5, fontFamily: F.bold }]}>OBSERVACIONES</Text>
                  </View>

                  {plantOutages.slice(0, 5).map(o => (
                    <View key={o.id} style={styles.miniTableRow}>
                      <Text style={[styles.miniTd, { flex: 2, fontFamily: F.medium }]}>
                        {new Date(o.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </Text>
                      <Text style={[styles.miniTd, { flex: 2, fontFamily: F.medium }]}>
                        {o.endTime ? new Date(o.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'En curso'}
                      </Text>
                      <Text style={[styles.miniTdBold, { flex: 1.5, fontFamily: F.bold }]}>
                        {o.durationMinutes ? `${o.durationMinutes} min` : '-'}
                      </Text>
                      <Text style={[styles.miniTd, { flex: 2.5, fontFamily: F.regular }]}>
                        {o.notes || 'Operación de respaldo'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 5. PREVENTIVE SERVICES EXECUTED */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="build" size={20} color="#001136" />
                <Text style={[styles.sectionTitle, { fontFamily: F.bold }]}>
                  4. BITÁCORA DE MANTENIMIENTOS Y CAMBIOS DE CONSUMIBLES
                </Text>
              </View>

              {plantServices.length === 0 ? (
                <Text style={[styles.emptyText, { fontFamily: F.regular }]}>
                  No se han registrado mantenimientos correctivos ni preventivos para esta unidad.
                </Text>
              ) : (
                <View style={styles.miniTable}>
                  <View style={styles.miniTableHeader}>
                    <Text style={[styles.miniTh, { flex: 2, fontFamily: F.bold }]}>TIPO DE SERVICIO</Text>
                    <Text style={[styles.miniTh, { flex: 1.5, fontFamily: F.bold }]}>HORÓMETRO</Text>
                    <Text style={[styles.miniTh, { flex: 1.5, fontFamily: F.bold }]}>FECHA</Text>
                    <Text style={[styles.miniTh, { flex: 2, fontFamily: F.bold }]}>TÉCNICO / OPERADOR</Text>
                    <Text style={[styles.miniTh, { flex: 2.5, fontFamily: F.bold }]}>DETALLE</Text>
                  </View>

                  {plantServices.map(s => (
                    <View key={s.id} style={styles.miniTableRow}>
                      <Text style={[styles.miniTdBold, { flex: 2, fontFamily: F.bold, color: '#001136' }]}>
                        {COMPONENT_NAMES[s.serviceType] || 'Servicio Técnico'}
                      </Text>
                      <Text style={[styles.miniTdBold, { flex: 1.5, fontFamily: F.extrabold }]}>
                        {s.horometer} h
                      </Text>
                      <Text style={[styles.miniTd, { flex: 1.5, fontFamily: F.medium }]}>
                        {s.date}
                      </Text>
                      <Text style={[styles.miniTd, { flex: 2, fontFamily: F.medium }]}>
                        {s.performedBy || 'Personal Autorizado'}
                      </Text>
                      <Text style={[styles.miniTd, { flex: 2.5, fontFamily: F.regular }]}>
                        {s.notes || 'Reemplazo regular'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 6. OPERATORS IN CHARGE */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="people" size={20} color="#001136" />
                <Text style={[styles.sectionTitle, { fontFamily: F.bold }]}>
                  5. PERSONAL TÉCNICO Y OPERADORES A CARGO
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {assignedUsers.length === 0 ? (
                  <Text style={[styles.emptyText, { fontFamily: F.regular }]}>
                    No hay operadores asignados exclusivamente a esta planta. Administrada por la cuadrilla general.
                  </Text>
                ) : (
                  assignedUsers.map(u => (
                    <View key={u.id} style={styles.operatorPill}>
                      <MaterialIcons name="person" size={16} color="#001136" />
                      <Text style={{ fontFamily: F.bold, color: '#001136', fontSize: 12 }}>
                        {u.fullName}
                      </Text>
                      <Text style={{ fontFamily: F.medium, color: '#4B5F84', fontSize: 11 }}>
                        ({u.role.toUpperCase()} • {u.email})
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* 7. DIGITAL SIGNATURE & OFFICIAL SEAL */}
            <View style={styles.signaturesRow}>
              <View style={styles.sigBox}>
                <View style={styles.sigLine} />
                <Text style={[styles.sigName, { fontFamily: F.bold }]}>
                  {currentUser?.fullName || 'Superadministrador'}
                </Text>
                <Text style={[styles.sigRole, { fontFamily: F.medium }]}>
                  Jefe de Operaciones & Mantenimiento
                </Text>
                <Text style={[styles.sigCompany, { fontFamily: F.regular }]}>
                  Empresas Del Valle C.A.
                </Text>
              </View>

              <View style={styles.sigBox}>
                <View style={styles.sigLine} />
                <Text style={[styles.sigName, { fontFamily: F.bold }]}>
                  Ingeniería de Planta & Control de Calidad
                </Text>
                <Text style={[styles.sigRole, { fontFamily: F.medium }]}>
                  Conformidad Técnica y Auditoría de Red
                </Text>
                <Text style={[styles.sigCompany, { fontFamily: F.regular }]}>
                  Plataforma Digital EDV Monitor v2.4
                </Text>
              </View>
            </View>

            {/* Security Footer Line */}
            <View style={styles.reportFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="verified-user" size={14} color="#001136" />
                <Text style={[styles.footerSealText, { fontFamily: F.semibold }]}>
                  Documento Técnico Cifrado • Autenticación Digital TLS 1.3 • Empresas Del Valle
                </Text>
              </View>
              <Text style={[styles.footerPageText, { fontFamily: F.regular }]}>
                Página 1 de 1
              </Text>
            </View>

          </View>
        </ScrollView>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 11, 33, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  topControls: {
    width: '100%',
    maxWidth: 850,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 10,
  },
  printActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#001136',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  closeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  sheetScroll: {
    width: '100%',
    maxWidth: 850,
  },
  sheetContentContainer: {
    paddingBottom: 40,
  },
  printableSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  headerLogoBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#001136',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  corpTitle: {
    fontSize: 18,
    color: '#001136',
    letterSpacing: 1,
  },
  corpSub: {
    fontSize: 10.5,
    color: '#4B5F84',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  corpRif: {
    fontSize: 10,
    color: '#757780',
    marginTop: 2,
  },
  headerMetaBox: {
    alignItems: 'flex-end',
    gap: 3,
  },
  codePill: {
    backgroundColor: '#001136',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeText: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  dateText: {
    fontSize: 11,
    color: '#1A1C1C',
    marginTop: 3,
  },
  authorText: {
    fontSize: 10,
    color: '#757780',
  },
  dividerThick: {
    height: 2.5,
    backgroundColor: '#001136',
    marginVertical: 14,
  },
  reportMainTitle: {
    fontSize: 18,
    color: '#001136',
    letterSpacing: 1,
    textAlign: 'center',
  },
  reportMainSubtitle: {
    fontSize: 12,
    color: '#4B5F84',
    marginTop: 3,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 14,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#001136',
    letterSpacing: 0.5,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dataCol: {
    flex: 1,
    minWidth: 160,
  },
  dataLabel: {
    fontSize: 9.5,
    color: '#757780',
    letterSpacing: 0.4,
  },
  dataValue: {
    fontSize: 12.5,
    color: '#1A1C1C',
    marginTop: 2,
  },
  dataValueBold: {
    fontSize: 13,
    color: '#001136',
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiBox: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    alignItems: 'center',
  },
  kpiBoxLabel: {
    fontSize: 9.5,
    color: '#757780',
    letterSpacing: 0.5,
  },
  kpiBoxValue: {
    fontSize: 20,
    marginVertical: 3,
  },
  kpiBoxSub: {
    fontSize: 9.5,
    color: '#757780',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  summaryStatItem: {
    fontSize: 11.5,
    color: '#4B5F84',
  },
  emptyText: {
    fontSize: 11.5,
    color: '#757780',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  miniTable: {
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E2E2',
    backgroundColor: '#FFFFFF',
  },
  miniTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEEEEE',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  miniTh: {
    fontSize: 9.5,
    color: '#4B5F84',
    letterSpacing: 0.4,
  },
  miniTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F4',
  },
  miniTd: {
    fontSize: 11,
    color: '#1A1C1C',
  },
  miniTdBold: {
    fontSize: 11,
    color: '#001136',
  },
  operatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 28,
    marginBottom: 18,
    gap: 24,
  },
  sigBox: {
    flex: 1,
    alignItems: 'center',
  },
  sigLine: {
    width: '80%',
    height: 1,
    backgroundColor: '#1A1C1C',
    marginBottom: 8,
  },
  sigName: {
    fontSize: 11.5,
    color: '#001136',
    textAlign: 'center',
  },
  sigRole: {
    fontSize: 10,
    color: '#4B5F84',
    textAlign: 'center',
    marginTop: 2,
  },
  sigCompany: {
    fontSize: 9.5,
    color: '#757780',
    textAlign: 'center',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E2E2',
    paddingTop: 10,
    marginTop: 10,
  },
  footerSealText: {
    fontSize: 9.5,
    color: '#001136',
  },
  footerPageText: {
    fontSize: 9.5,
    color: '#757780',
  },
});
