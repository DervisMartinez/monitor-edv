import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Vehicle,
  VehicleType,
  VehicleStatus,
  VehicleServiceRecord,
  VehicleOdometerRecord,
  VehicleComponentType,
} from '../../../domain/entities/Vehicle';
import {
  MOTO_CATALOG,
  CAR_CATALOG,
  ALL_VEHICLE_CATALOG,
  CatalogVehicleItem,
} from '../../../data/vehicleCatalog';
import {
  VEHICLE_COMPONENT_NAMES,
  VEHICLE_COMPONENT_ICONS,
  getVehicleComponents,
  getVehicleComponentLifespan,
  calculateVehicleWearPercentage,
  getVehicleServiceStatus,
} from '../../../constants/vehicleTelemetry';
import { Company, Department, AppUser } from '../../../domain/entities/Generator';
import { ImageUploader } from './ImageUploader';

interface VehiclesSectionProps {
  vehicles: Vehicle[];
  vehicleServices: VehicleServiceRecord[];
  vehicleOdometerLogs: VehicleOdometerRecord[];
  companies: Company[];
  departments: Department[];
  appUsers: AppUser[];
  onSaveVehicle: (v: Vehicle) => Promise<void>;
  onUpdateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<{ success: boolean; error?: string }>;
  onAddVehicleService: (s: Omit<VehicleServiceRecord, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteVehicleService: (id: string) => Promise<void>;
  onAddVehicleOdometer: (o: Omit<VehicleOdometerRecord, 'id' | 'createdAt'>) => Promise<{ success: boolean; delta: number }>;
  isDark: boolean;
  colors: {
    primary: string;
    onSurface: string;
    onSurfaceVariant: string;
    surface: string;
  };
  onNotify?: (title: string, message: string) => void;
}

const F = {
  bold: 'Montserrat_700Bold',
  semibold: 'Montserrat_600SemiBold',
  medium: 'Montserrat_500Medium',
  regular: 'Montserrat_400Regular',
  extrabold: 'Montserrat_800ExtraBold',
};

export const VehiclesSection: React.FC<VehiclesSectionProps> = ({
  vehicles,
  vehicleServices,
  vehicleOdometerLogs,
  companies,
  departments,
  appUsers,
  onSaveVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onAddVehicleService,
  onDeleteVehicleService,
  onAddVehicleOdometer,
  isDark,
  colors,
  onNotify,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1180;

  // View state
  const [activeSubTab, setActiveSubTab] = useState<'fleet' | 'services' | 'odometers'>('fleet');
  const [filterType, setFilterType] = useState<'all' | 'moto' | 'car'>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddOdometerModal, setShowAddOdometerModal] = useState(false);
  const [inspectingVehicle, setInspectingVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form states: New / Edit Vehicle
  const [formVehicleType, setFormVehicleType] = useState<VehicleType>('moto');
  const [formCatalogOrCustom, setFormCatalogOrCustom] = useState<'catalog' | 'custom'>('catalog');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogVehicleItem | null>(MOTO_CATALOG[0]);
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('EMPIRE KEEWAY');
  const [formModel, setFormModel] = useState('New Horse 150');
  const [formYear, setFormYear] = useState('2024');
  const [formPlate, setFormPlate] = useState('');
  const [formCategory, setFormCategory] = useState('Mensajería / Trabajo');
  const [formOdometer, setFormOdometer] = useState('0');
  const [formCompanyId, setFormCompanyId] = useState(companies[0]?.id || '');
  const [formDeptId, setFormDeptId] = useState(departments[0]?.id || '');
  const [formUserId, setFormUserId] = useState('');
  const [formCustomImg, setFormCustomImg] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Form states: New Service
  const [serviceTargetVehId, setServiceTargetVehId] = useState(vehicles[0]?.id || '');
  const [serviceType, setServiceType] = useState<VehicleComponentType>('oil');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceOdo, setServiceOdo] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  const [servicePerformedBy, setServicePerformedBy] = useState('Taller Central EDV');
  const [serviceNotes, setServiceNotes] = useState('');

  // Form states: New Odometer
  const [odoTargetVehId, setOdoTargetVehId] = useState(vehicles[0]?.id || '');
  const [odoReading, setOdoReading] = useState('');
  const [odoNotes, setOdoNotes] = useState('Lectura rutinaria de odómetro');

  // Quick Assign User State
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [assigningVehicle, setAssigningVehicle] = useState<Vehicle | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [userSearchText, setUserSearchText] = useState('');

  // Quick Change Photo State
  const [showChangePhotoModal, setShowChangePhotoModal] = useState(false);
  const [photoVehicle, setPhotoVehicle] = useState<Vehicle | null>(null);
  const [photoCustomUri, setPhotoCustomUri] = useState('');
  const [photoCatalogItem, setPhotoCatalogItem] = useState<CatalogVehicleItem | null>(null);

  // Colors
  const cardBg = isDark ? '#001136' : '#FFFFFF';
  const subSurfaceBg = isDark ? '#0a2558' : '#F4F6FA';
  const borderCol = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.09)';
  const textPrimary = colors.onSurface;
  const textSecondary = colors.onSurfaceVariant;
  const accentPrimary = colors.primary;

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filterType !== 'all' && v.vehicleType !== filterType) return false;
      if (filterCompany !== 'all' && v.companyId !== filterCompany) return false;
      if (filterStatus !== 'all' && v.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBrand = (v.brand || '').toLowerCase().includes(q);
        const matchModel = (v.model || '').toLowerCase().includes(q);
        const matchPlate = (v.plate || '').toLowerCase().includes(q);
        const matchName = (v.name || '').toLowerCase().includes(q);
        const matchDriver = (v.assignedUserName || '').toLowerCase().includes(q);
        if (!matchBrand && !matchModel && !matchPlate && !matchName && !matchDriver) return false;
      }
      return true;
    });
  }, [vehicles, filterType, filterCompany, filterStatus, searchQuery]);

  // Overall KPI metrics
  const stats = useMemo(() => {
    const totalVehicles = vehicles.length;
    const totalMotos = vehicles.filter((v) => v.vehicleType === 'moto').length;
    const totalCars = vehicles.filter((v) => v.vehicleType === 'car').length;
    const totalKmFleet = vehicles.reduce((acc, v) => acc + (v.currentOdometer || 0), 0);
    const avgKmPerVehicle = totalVehicles > 0 ? Math.round(totalKmFleet / totalVehicles) : 0;
    const totalServicesCount = vehicleServices.length;
    const totalCostUSD = vehicleServices.reduce((acc, s) => acc + (s.costUSD || 0), 0);

    // Calculate critical or warning components
    let alertUnitsCount = 0;
    for (const v of vehicles) {
      const isCar = v.vehicleType === 'car';
      const comps = getVehicleComponents(isCar);
      let hasWarningOrCritical = false;
      for (const comp of comps) {
        // Find last service for this component
        const lastServ = vehicleServices.find(
          (s) => s.vehicleId === v.id && s.type === comp
        );
        const lastOdo = lastServ ? lastServ.odometer : 0;
        const wear = calculateVehicleWearPercentage(v.currentOdometer, lastOdo, comp, isCar);
        if (wear <= 15) {
          hasWarningOrCritical = true;
          break;
        }
      }
      if (hasWarningOrCritical) alertUnitsCount++;
    }

    return {
      totalVehicles,
      totalMotos,
      totalCars,
      totalKmFleet,
      avgKmPerVehicle,
      totalServicesCount,
      totalCostUSD,
      alertUnitsCount,
    };
  }, [vehicles, vehicleServices]);

  // Handle open add vehicle
  const handleOpenAddVehicle = () => {
    setEditingVehicle(null);
    setFormVehicleType('moto');
    setFormCatalogOrCustom('catalog');
    setSelectedCatalogItem(MOTO_CATALOG[0]);
    setFormName('');
    setFormBrand(MOTO_CATALOG[0].brand);
    setFormModel(MOTO_CATALOG[0].model);
    setFormYear('2024');
    setFormPlate('');
    setFormCategory(MOTO_CATALOG[0].category);
    setFormOdometer('0');
    setFormCompanyId(companies[0]?.id || '');
    setFormDeptId(departments[0]?.id || '');
    setFormUserId(appUsers[0]?.id || '');
    setFormCustomImg('');
    setFormNotes('');
    setShowAddVehicleModal(true);
  };

  // Handle select catalog item
  const handleSelectCatalogItem = (item: CatalogVehicleItem) => {
    setSelectedCatalogItem(item);
    setFormBrand(item.brand);
    setFormModel(item.model);
    setFormCategory(item.category);
    if (item.year) setFormYear(String(item.year));
    setFormName(`${item.vehicleType === 'moto' ? 'Moto' : 'Unidad'} - ${item.brand} ${item.model}`);
  };

  // Save new / edited vehicle
  const handleSaveVehicleSubmit = async () => {
    if (!formBrand.trim() || !formModel.trim()) {
      onNotify?.('Campos Requeridos', 'Por favor ingresa la marca y el modelo del vehículo.');
      return;
    }

    const matchedComp = companies.find((c) => c.id === formCompanyId);
    const matchedDept = departments.find((d) => d.id === formDeptId);
    const matchedUser = appUsers.find((u) => u.id === formUserId);

    const vehicleId = editingVehicle?.id || `veh-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const isCar = formVehicleType === 'car';
    const fallbackCatalog = isCar ? CAR_CATALOG[0].imageRes : MOTO_CATALOG[0].imageRes;
    const customImg = formCustomImg.trim();

    const newVehicle: Vehicle = {
      id: vehicleId,
      name: formName.trim() || `${formVehicleType === 'moto' ? 'Moto' : 'Vehículo'} ${formBrand} ${formModel}`,
      brand: formBrand.trim(),
      model: formModel.trim(),
      year: parseInt(formYear, 10) || 2024,
      plate: formPlate.trim().toUpperCase(),
      vehicleType: formVehicleType,
      category: formCategory.trim() || (formVehicleType === 'moto' ? 'Motocicleta' : 'Automóvil'),
      currentOdometer: parseInt(formOdometer, 10) || 0,
      status: editingVehicle?.status || 'operativo',
      companyId: formCompanyId || matchedComp?.id,
      companyName: matchedComp?.name || editingVehicle?.companyName,
      departmentId: formDeptId || matchedDept?.id,
      departmentName: matchedDept?.name || editingVehicle?.departmentName,
      assignedUserId: formUserId || undefined,
      assignedUserName: matchedUser ? (matchedUser.fullName || matchedUser.email) : undefined,
      customImageUri: customImg || undefined,
      imageUrl: customImg || undefined,
      catalogImageRes: customImg ? undefined : (selectedCatalogItem?.imageRes || (editingVehicle?.customImageUri ? undefined : editingVehicle?.catalogImageRes) || fallbackCatalog),
      catalogId: customImg ? undefined : (selectedCatalogItem?.id || editingVehicle?.catalogId),
      notes: formNotes.trim(),
      createdAt: editingVehicle?.createdAt || new Date().toISOString(),
    };

    if (editingVehicle) {
      await onUpdateVehicle(editingVehicle.id, newVehicle);
      onNotify?.('Vehículo Actualizado', `Se guardaron los cambios para ${newVehicle.brand} ${newVehicle.model}.`);
    } else {
      await onSaveVehicle(newVehicle);
      onNotify?.('Vehículo Registrado', `Se agregó ${newVehicle.brand} ${newVehicle.model} (${newVehicle.plate || 'Sin placa'}) a la flota.`);
    }

    setShowAddVehicleModal(false);
  };

  // Open edit vehicle
  const handleOpenEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormVehicleType(v.vehicleType);
    setFormCatalogOrCustom(v.customImageUri || v.imageUrl ? 'custom' : 'catalog');
    setSelectedCatalogItem(null);
    setFormName(v.name || '');
    setFormBrand(v.brand);
    setFormModel(v.model);
    setFormYear(String(v.year));
    setFormPlate(v.plate || '');
    setFormCategory(v.category || '');
    setFormOdometer(String(v.currentOdometer));
    setFormCompanyId(v.companyId || companies[0]?.id || '');
    setFormDeptId(v.departmentId || departments[0]?.id || '');
    setFormUserId(v.assignedUserId || '');
    setFormCustomImg(v.customImageUri || v.imageUrl || '');
    setFormNotes(v.notes || '');
    setShowAddVehicleModal(true);
  };

  // Open quick assign user modal
  const handleOpenAssignUser = (v: Vehicle) => {
    setAssigningVehicle(v);
    setSelectedAssigneeId(v.assignedUserId || '');
    setUserSearchText('');
    setShowAssignUserModal(true);
  };

  // Submit quick assign user
  const handleSaveAssignUser = async () => {
    if (!assigningVehicle) return;
    const targetUser = appUsers.find((u) => u.id === selectedAssigneeId);
    const updates: Partial<Vehicle> = {
      assignedUserId: selectedAssigneeId || undefined,
      assignedUserName: targetUser ? (targetUser.fullName || targetUser.email) : undefined,
    };
    await onUpdateVehicle(assigningVehicle.id, updates);
    setShowAssignUserModal(false);
    onNotify?.(
      'Conductor Asignado',
      targetUser
        ? `Se asignó a ${targetUser.fullName || targetUser.email} el vehículo ${assigningVehicle.brand} ${assigningVehicle.model}.`
        : `Se desvinculó el conductor de ${assigningVehicle.brand} ${assigningVehicle.model}.`
    );
  };

  // Open quick change photo modal
  const handleOpenChangePhoto = (v: Vehicle) => {
    setPhotoVehicle(v);
    setPhotoCustomUri(v.customImageUri || v.imageUrl || '');
    setPhotoCatalogItem(null);
    setShowChangePhotoModal(true);
  };

  // Submit quick change photo
  const handleSaveChangePhoto = async () => {
    if (!photoVehicle) return;
    const isCar = photoVehicle.vehicleType === 'car';
    const fallbackCatalog = isCar ? CAR_CATALOG[0].imageRes : MOTO_CATALOG[0].imageRes;
    const newUri = photoCustomUri.trim();

    const updates: Partial<Vehicle> = {
      customImageUri: newUri || undefined,
      imageUrl: newUri || undefined,
      catalogImageRes: newUri ? undefined : (photoCatalogItem?.imageRes || photoVehicle.catalogImageRes || fallbackCatalog),
      catalogId: newUri ? undefined : (photoCatalogItem?.id || photoVehicle.catalogId),
    };

    await onUpdateVehicle(photoVehicle.id, updates);
    setShowChangePhotoModal(false);
    onNotify?.(
      'Fotografía Actualizada',
      `Se guardó la nueva fotografía para ${photoVehicle.brand} ${photoVehicle.model}.`
    );
  };

  // Delete vehicle confirmation
  const handleDeleteVehicle = async (v: Vehicle) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm(`¿Deseas dar de baja y eliminar el vehículo ${v.brand} ${v.model} (${v.plate || 'Sin placa'})?`);
      if (!ok) return;
    }
    await onDeleteVehicle(v.id);
    onNotify?.('Vehículo Eliminado', `Se retiró ${v.brand} ${v.model} de la flota.`);
  };

  // Open add service modal
  const handleOpenAddService = (v?: Vehicle) => {
    const target = v || vehicles[0];
    if (!target) {
      onNotify?.('Sin Vehículos', 'Registra al menos un vehículo para cargar un servicio.');
      return;
    }
    setServiceTargetVehId(target.id);
    setServiceType('oil');
    setServiceDate(new Date().toISOString().split('T')[0]);
    setServiceOdo(String(target.currentOdometer));
    setServiceCost('');
    setServicePerformedBy('Taller Central EDV');
    setServiceNotes('');
    setShowAddServiceModal(true);
  };

  // Submit service
  const handleSaveServiceSubmit = async () => {
    const target = vehicles.find((v) => v.id === serviceTargetVehId);
    if (!target) return;

    const odoNum = parseInt(serviceOdo, 10);
    if (isNaN(odoNum) || odoNum < 0) {
      onNotify?.('Kilometraje Inválido', 'Ingresa el kilometraje actual en el momento del servicio.');
      return;
    }

    const costNum = parseFloat(serviceCost) || 0;

    await onAddVehicleService({
      vehicleId: target.id,
      userId: target.assignedUserId,
      userEmail: target.assignedUserName,
      type: serviceType,
      date: serviceDate || new Date().toISOString().split('T')[0],
      odometer: odoNum,
      costUSD: costNum,
      performedBy: servicePerformedBy.trim(),
      notes: serviceNotes.trim(),
    });

    onNotify?.(
      'Mantenimiento Registrado',
      `Se asentó ${VEHICLE_COMPONENT_NAMES[serviceType]} para ${target.brand} ${target.model} a los ${odoNum.toLocaleString()} km.`
    );
    setShowAddServiceModal(false);
  };

  // Open add odometer modal
  const handleOpenAddOdometer = (v?: Vehicle) => {
    const target = v || vehicles[0];
    if (!target) {
      onNotify?.('Sin Vehículos', 'Registra al menos un vehículo para actualizar el odómetro.');
      return;
    }
    setOdoTargetVehId(target.id);
    setOdoReading(String(target.currentOdometer));
    setOdoNotes('Lectura rutinaria de odómetro');
    setShowAddOdometerModal(true);
  };

  // Submit odometer
  const handleSaveOdometerSubmit = async () => {
    const target = vehicles.find((v) => v.id === odoTargetVehId);
    if (!target) return;

    const newOdo = parseInt(odoReading, 10);
    if (isNaN(newOdo) || newOdo < target.currentOdometer) {
      onNotify?.(
        'Kilometraje Inválido',
        `El nuevo kilometraje debe ser igual o superior al actual (${target.currentOdometer.toLocaleString()} km).`
      );
      return;
    }

    const res = await onAddVehicleOdometer({
      vehicleId: target.id,
      userId: target.assignedUserId,
      userEmail: target.assignedUserName,
      odometer: newOdo,
      date: new Date().toISOString(),
      notes: odoNotes.trim(),
    });

    onNotify?.(
      'Kilometraje Actualizado',
      `Se actualizó el odómetro de ${target.brand} ${target.model} a ${newOdo.toLocaleString()} km (+${res.delta.toLocaleString()} km).`
    );
    setShowAddOdometerModal(false);
  };

  // Quick calculate overall vehicle health (%)
  const computeVehicleHealth = (v: Vehicle): number => {
    const isCar = v.vehicleType === 'car';
    const comps = getVehicleComponents(isCar).filter((c) => c !== 'fuel' && c !== 'other');
    if (comps.length === 0) return 100;

    let sum = 0;
    for (const c of comps) {
      const lastServ = vehicleServices.find((s) => s.vehicleId === v.id && s.type === c);
      const lastOdo = lastServ ? lastServ.odometer : 0;
      sum += calculateVehicleWearPercentage(v.currentOdometer, lastOdo, c, isCar);
    }
    return Math.round(sum / comps.length);
  };

  return (
    <View style={{ gap: 20 }}>
      {/* HEADER & MAIN ACTIONS */}
      <View
        style={{
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons name="directions-car" size={24} color={accentPrimary} />
            <Text
              style={{
                fontFamily: F.extrabold,
                color: textPrimary,
                fontSize: isMobile ? 20 : 24,
              }}
            >
              Flota de Vehículos y Equipos (Garage EDV)
            </Text>
          </View>
          <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginTop: 4 }}>
            Monitoreo y control de kilometrajes, odómetros, desgaste predictivo de repuestos y bitácora de servicios para motos y carros.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={handleOpenAddVehicle}
            style={[styles.primaryActionBtn, { backgroundColor: accentPrimary }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={18} color={isDark ? '#001136' : '#FFFFFF'} />
            <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: isDark ? '#001136' : '#FFFFFF' }}>
              Registrar Vehículo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenAddService()}
            style={[styles.secondaryActionBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="build" size={16} color="#10B981" />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary }}>
              Cargar Mantenimiento
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenAddOdometer()}
            style={[styles.secondaryActionBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="speed" size={16} color="#3B82F6" />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary }}>
              Registrar Odómetro
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI STRIP */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: accentPrimary, width: isMobile ? '100%' : isTablet ? '48%' : '23.5%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>UNIDADES EN FLOTA</Text>
            <MaterialIcons name="directions-car" size={20} color={accentPrimary} />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>{stats.totalVehicles}</Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            {stats.totalMotos} Motos · {stats.totalCars} Carros / Camiones
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#3B82F6', width: isMobile ? '100%' : isTablet ? '48%' : '23.5%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>KILOMETRAJE TOTAL</Text>
            <MaterialIcons name="speed" size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>
            {stats.totalKmFleet.toLocaleString()} km
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            Prom. {stats.avgKmPerVehicle.toLocaleString()} km / vehículo
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#10B981', width: isMobile ? '100%' : isTablet ? '48%' : '23.5%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>MANTENIMIENTOS</Text>
            <MaterialIcons name="build" size={20} color="#10B981" />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>{stats.totalServicesCount}</Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            Inversión registrada: ${stats.totalCostUSD.toLocaleString()} USD
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: stats.alertUnitsCount > 0 ? '#EF4444' : '#10B981', width: isMobile ? '100%' : isTablet ? '48%' : '23.5%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>ALERTAS PREVENTIVAS</Text>
            <MaterialIcons name="warning" size={20} color={stats.alertUnitsCount > 0 ? '#EF4444' : '#10B981'} />
          </View>
          <Text style={[styles.kpiValue, { color: stats.alertUnitsCount > 0 ? '#EF4444' : textPrimary }]}>
            {stats.alertUnitsCount} unidades
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            {stats.alertUnitsCount > 0 ? 'Con servicio próximo o vencido' : 'Toda la flota en rango óptimo'}
          </Text>
        </View>
      </View>

      {/* FILTER & SEARCH BAR */}
      <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor: borderCol, padding: 16, gap: 14 }]}>
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14, alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between' }}>
          {/* Sub-view switcher */}
          <View style={{ flexDirection: 'row', backgroundColor: subSurfaceBg, borderRadius: 10, padding: 4, gap: 4 }}>
            <TouchableOpacity
              onPress={() => setActiveSubTab('fleet')}
              style={[
                styles.tabBtn,
                activeSubTab === 'fleet' && { backgroundColor: accentPrimary },
              ]}
            >
              <Text style={{ fontFamily: activeSubTab === 'fleet' ? F.bold : F.medium, fontSize: 12, color: activeSubTab === 'fleet' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                Flota Vehicular ({vehicles.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveSubTab('services')}
              style={[
                styles.tabBtn,
                activeSubTab === 'services' && { backgroundColor: accentPrimary },
              ]}
            >
              <Text style={{ fontFamily: activeSubTab === 'services' ? F.bold : F.medium, fontSize: 12, color: activeSubTab === 'services' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                Bitácora de Servicios ({vehicleServices.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveSubTab('odometers')}
              style={[
                styles.tabBtn,
                activeSubTab === 'odometers' && { backgroundColor: accentPrimary },
              ]}
            >
              <Text style={{ fontFamily: activeSubTab === 'odometers' ? F.bold : F.medium, fontSize: 12, color: activeSubTab === 'odometers' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                Odómetros ({vehicleOdometerLogs.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View style={[styles.searchBox, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
            <MaterialIcons name="search" size={18} color={textSecondary} />
            <TextInput
              style={{ flex: 1, fontFamily: F.medium, fontSize: 13, color: textPrimary }}
              placeholder="Buscar por marca, modelo, placa o chofer..."
              placeholderTextColor={textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={16} color={textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Chips: Type & Company */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Text style={{ fontFamily: F.bold, fontSize: 11, color: textSecondary, marginRight: 4 }}>TIPO:</Text>
          <TouchableOpacity
            onPress={() => setFilterType('all')}
            style={[styles.filterChip, { backgroundColor: filterType === 'all' ? accentPrimary : subSurfaceBg, borderColor: borderCol }]}
          >
            <Text style={{ fontFamily: filterType === 'all' ? F.bold : F.medium, fontSize: 11.5, color: filterType === 'all' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
              Todos ({vehicles.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterType('moto')}
            style={[styles.filterChip, { backgroundColor: filterType === 'moto' ? '#3B82F6' : subSurfaceBg, borderColor: borderCol }]}
          >
            <Text style={{ fontFamily: filterType === 'moto' ? F.bold : F.medium, fontSize: 11.5, color: filterType === 'moto' ? '#FFFFFF' : textPrimary }}>
              Motos ({stats.totalMotos})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterType('car')}
            style={[styles.filterChip, { backgroundColor: filterType === 'car' ? '#8B5CF6' : subSurfaceBg, borderColor: borderCol }]}
          >
            <Text style={{ fontFamily: filterType === 'car' ? F.bold : F.medium, fontSize: 11.5, color: filterType === 'car' ? '#FFFFFF' : textPrimary }}>
              Carros & Camiones ({stats.totalCars})
            </Text>
          </TouchableOpacity>

          <View style={{ width: 1, height: 18, backgroundColor: borderCol, marginHorizontal: 6 }} />

          <Text style={{ fontFamily: F.bold, fontSize: 11, color: textSecondary, marginRight: 4 }}>EMPRESA:</Text>
          <TouchableOpacity
            onPress={() => setFilterCompany('all')}
            style={[styles.filterChip, { backgroundColor: filterCompany === 'all' ? '#059669' : subSurfaceBg, borderColor: borderCol }]}
          >
            <Text style={{ fontFamily: filterCompany === 'all' ? F.bold : F.medium, fontSize: 11.5, color: filterCompany === 'all' ? '#FFFFFF' : textPrimary }}>
              Todas
            </Text>
          </TouchableOpacity>
          {companies.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setFilterCompany(c.id)}
              style={[styles.filterChip, { backgroundColor: filterCompany === c.id ? '#059669' : subSurfaceBg, borderColor: borderCol }]}
            >
              <Text style={{ fontFamily: filterCompany === c.id ? F.bold : F.medium, fontSize: 11.5, color: filterCompany === c.id ? '#FFFFFF' : textPrimary }}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* VIEW 1: FLEET VEHICLES CARDS & TABLE */}
      {activeSubTab === 'fleet' && (
        <View style={{ gap: 16 }}>
          {filteredVehicles.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <MaterialIcons name="directions-car" size={40} color={textSecondary} />
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: textPrimary, marginTop: 10 }}>
                No se encontraron vehículos registrados con este filtro
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary, marginTop: 4, textAlign: 'center' }}>
                Haz clic en "Registrar Vehículo" para agregar motos o carros del catálogo o ingresarlos manualmente.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              {filteredVehicles.map((veh) => {
                const isCar = veh.vehicleType === 'car';
                const health = computeVehicleHealth(veh);
                const healthColor = health <= 20 ? '#EF4444' : health <= 40 ? '#F59E0B' : '#10B981';

                // Find critical components for quick alert tag
                const comps = getVehicleComponents(isCar);
                let criticalCompName: string | null = null;
                for (const c of comps) {
                  const lastServ = vehicleServices.find((s) => s.vehicleId === veh.id && s.type === c);
                  const lastOdo = lastServ ? lastServ.odometer : 0;
                  const wear = calculateVehicleWearPercentage(veh.currentOdometer, lastOdo, c, isCar);
                  if (wear <= 15) {
                    criticalCompName = `${VEHICLE_COMPONENT_NAMES[c]} (${wear}%)`;
                    break;
                  }
                }

                return (
                  <View
                    key={veh.id}
                    style={[
                      styles.vehicleCard,
                      {
                        backgroundColor: cardBg,
                        borderColor: borderCol,
                        width: isMobile ? '100%' : isTablet ? '48%' : '31.8%',
                      },
                    ]}
                  >
                    {/* Top Row: Type & Plate */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: isCar ? 'rgba(139, 92, 246, 0.16)' : 'rgba(59, 130, 246, 0.16)' },
                          ]}
                        >
                          <MaterialIcons
                            name={isCar ? 'directions-car' : 'two-wheeler'}
                            size={14}
                            color={isCar ? '#8B5CF6' : '#3B82F6'}
                          />
                          <Text
                            style={{
                              fontFamily: F.bold,
                              fontSize: 10.5,
                              color: isCar ? '#8B5CF6' : '#3B82F6',
                              textTransform: 'uppercase',
                            }}
                          >
                            {isCar ? 'Carro / Carga' : 'Moto'}
                          </Text>
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: veh.status === 'operativo' ? '#10B981' : veh.status === 'mantenimiento' ? '#F59E0B' : '#EF4444' }]} />
                        <Text style={{ fontFamily: F.semibold, fontSize: 11, color: textSecondary, textTransform: 'capitalize' }}>
                          {veh.status}
                        </Text>
                      </View>

                      {veh.plate ? (
                        <View style={[styles.plateBox, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }]}>
                          <Text style={[styles.tabularText, { fontFamily: F.extrabold, fontSize: 11, color: textPrimary }]}>
                            {veh.plate}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Image & Main Info */}
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => handleOpenChangePhoto(veh)}
                        style={[styles.vehImageThumb, { backgroundColor: subSurfaceBg, borderColor: borderCol, position: 'relative' }]}
                        activeOpacity={0.8}
                        accessibilityLabel="Cambiar foto de la unidad"
                      >
                        {veh.customImageUri || veh.imageUrl ? (
                          <Image
                            source={{ uri: veh.customImageUri || veh.imageUrl }}
                            style={{ width: '100%', height: '100%', borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        ) : veh.catalogImageRes ? (
                          <Image
                            source={veh.catalogImageRes}
                            style={{ width: '85%', height: '85%' }}
                            resizeMode="contain"
                          />
                        ) : (
                          <Image
                            source={isCar ? CAR_CATALOG[0].imageRes : MOTO_CATALOG[0].imageRes}
                            style={{ width: '85%', height: '85%' }}
                            resizeMode="contain"
                          />
                        )}
                        <View style={styles.thumbEditOverlay}>
                          <MaterialIcons name="photo-camera" size={10} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.extrabold, fontSize: 14.5, color: textPrimary }} numberOfLines={1}>
                          {veh.brand} {veh.model}
                        </Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 12, color: textSecondary }}>
                          Año {veh.year} · {veh.category || (isCar ? 'Automóvil' : 'Moto')}
                        </Text>
                        <Text style={{ fontFamily: F.regular, fontSize: 11, color: textSecondary, marginTop: 2 }}>
                          {veh.companyName || 'Empresas del Valle'}
                        </Text>
                      </View>
                    </View>

                    {/* Conductor Asignado Strip */}
                    <TouchableOpacity
                      onPress={() => handleOpenAssignUser(veh)}
                      style={[
                        styles.driverStrip,
                        {
                          backgroundColor: veh.assignedUserId
                            ? (isDark ? 'rgba(56, 189, 248, 0.08)' : '#F0F9FF')
                            : (isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB'),
                          borderColor: veh.assignedUserId
                            ? 'rgba(56, 189, 248, 0.3)'
                            : 'rgba(245, 158, 11, 0.3)',
                        },
                      ]}
                      activeOpacity={0.7}
                      accessibilityLabel="Asignar o cambiar conductor"
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <MaterialIcons
                          name={veh.assignedUserId ? 'person' : 'person-add'}
                          size={15}
                          color={veh.assignedUserId ? colors.primary : '#F59E0B'}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: F.bold,
                              fontSize: 11,
                              color: veh.assignedUserId ? textPrimary : '#F59E0B',
                            }}
                            numberOfLines={1}
                          >
                            {veh.assignedUserName || 'Sin conductor asignado'}
                          </Text>
                          <Text style={{ fontFamily: F.regular, fontSize: 9.5, color: textSecondary }}>
                            {veh.assignedUserId
                              ? 'Conductor / Operador a cargo · Clic para reasignar'
                              : 'Clic para asignar operador de la empresa'}
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons name="swap-horiz" size={16} color={textSecondary} />
                    </TouchableOpacity>

                    {/* Odometer readout */}
                    <View style={[styles.odometerStrip, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
                      <View>
                        <Text style={{ fontFamily: F.bold, fontSize: 10, color: textSecondary, letterSpacing: 0.5 }}>
                          ODÓMETRO ACTUAL
                        </Text>
                        <Text style={[styles.tabularText, { fontFamily: F.extrabold, fontSize: 18, color: textPrimary }]}>
                          {veh.currentOdometer.toLocaleString()} <Text style={{ fontSize: 12 }}>km</Text>
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleOpenAddOdometer(veh)}
                        style={[styles.smallActionBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="speed" size={14} color="#3B82F6" />
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: textPrimary }}>Actualizar</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Health progress bar */}
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontFamily: F.semibold, fontSize: 11, color: textSecondary }}>
                          Salud de Mantenimiento
                        </Text>
                        <Text style={[styles.tabularText, { fontFamily: F.bold, fontSize: 12, color: healthColor }]}>
                          {health}% restante
                        </Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }]}>
                        <View style={[styles.barFill, { width: `${Math.max(5, health)}%`, backgroundColor: healthColor }]} />
                      </View>
                    </View>

                    {/* Critical alert tag if any */}
                    {criticalCompName && (
                      <View style={[styles.alertBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                        <MaterialIcons name="warning" size={14} color="#EF4444" />
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#EF4444' }} numberOfLines={1}>
                          Próximo servicio: {criticalCompName}
                        </Text>
                      </View>
                    )}

                    {/* Footer Actions */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: borderCol, paddingTop: 10, marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={() => setInspectingVehicle(veh)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <MaterialIcons name="analytics" size={16} color={accentPrimary} />
                        <Text style={{ fontFamily: F.bold, fontSize: 12, color: accentPrimary }}>
                          Inspección Técnica
                        </Text>
                      </TouchableOpacity>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => handleOpenAddService(veh)}
                          style={[styles.iconTouchBtn, { backgroundColor: subSurfaceBg }]}
                          accessibilityLabel="Cargar Mantenimiento"
                        >
                          <MaterialIcons name="build" size={15} color="#10B981" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleOpenEditVehicle(veh)}
                          style={[styles.iconTouchBtn, { backgroundColor: subSurfaceBg }]}
                          accessibilityLabel="Editar"
                        >
                          <MaterialIcons name="edit" size={15} color={textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteVehicle(veh)}
                          style={[styles.iconTouchBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                          accessibilityLabel="Eliminar"
                        >
                          <MaterialIcons name="delete-outline" size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* VIEW 2: SERVICES LOG (BITÁCORA) */}
      {activeSubTab === 'services' && (
        <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor: borderCol, padding: 18, gap: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <View>
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                Bitácora de Servicios y Mantenimientos Vehiculares
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary }}>
                Historial completo con componente, fecha, kilometraje, costo en USD y taller responsable.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleOpenAddService()}
              style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
            >
              <MaterialIcons name="add" size={16} color="#FFFFFF" />
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' }}>Nuevo Servicio</Text>
            </TouchableOpacity>
          </View>

          {vehicleServices.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
              <MaterialIcons name="build" size={36} color={textSecondary} />
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: textPrimary, marginTop: 8 }}>
                No hay servicios registrados todavía
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: textSecondary, marginTop: 2 }}>
                Registra mantenimientos preventivos o correctivos para llevar el control de costos y desgaste.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: 860, borderWidth: 1, borderColor: borderCol, borderRadius: 12, overflow: 'hidden' }}>
                <View style={[styles.tableHeaderRow, { backgroundColor: subSurfaceBg, borderBottomColor: borderCol }]}>
                  <Text style={[styles.thCell, { flex: 1.4, color: textSecondary }]}>VEHÍCULO</Text>
                  <Text style={[styles.thCell, { flex: 1.5, color: textSecondary }]}>COMPONENTE / SERVICIO</Text>
                  <Text style={[styles.thCell, { flex: 0.9, color: textSecondary }]}>FECHA</Text>
                  <Text style={[styles.thCell, { flex: 1, color: textSecondary, textAlign: 'right' }]}>ODÓMETRO</Text>
                  <Text style={[styles.thCell, { flex: 0.9, color: textSecondary, textAlign: 'right' }]}>COSTO USD</Text>
                  <Text style={[styles.thCell, { flex: 1.5, color: textSecondary, paddingLeft: 10 }]}>TALLER / NOTAS</Text>
                  <Text style={[styles.thCell, { flex: 0.6, color: textSecondary, textAlign: 'center' }]}>ACCIONES</Text>
                </View>

                {vehicleServices.map((s, idx) => {
                  const targetVeh = vehicles.find((v) => v.id === s.vehicleId);
                  return (
                    <View
                      key={s.id}
                      style={[
                        styles.tableDataRow,
                        {
                          borderBottomColor: borderCol,
                          borderBottomWidth: idx === vehicleServices.length - 1 ? 0 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1.4 }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textPrimary }}>
                          {targetVeh ? `${targetVeh.brand} ${targetVeh.model}` : 'Vehículo'}
                        </Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                          {targetVeh?.plate || 'Sin placa'}
                        </Text>
                      </View>

                      <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons
                          name={(VEHICLE_COMPONENT_ICONS[s.type] as any) || 'build'}
                          size={16}
                          color="#10B981"
                        />
                        <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textPrimary }}>
                          {VEHICLE_COMPONENT_NAMES[s.type] || s.type}
                        </Text>
                      </View>

                      <Text style={[styles.tdCell, { flex: 0.9, color: textSecondary }]}>{s.date}</Text>

                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1, textAlign: 'right', fontFamily: F.bold, color: textPrimary }]}>
                        {s.odometer.toLocaleString()} km
                      </Text>

                      <Text style={[styles.tdCell, styles.tabularText, { flex: 0.9, textAlign: 'right', fontFamily: F.bold, color: '#10B981' }]}>
                        ${(s.costUSD || 0).toFixed(2)}
                      </Text>

                      <View style={{ flex: 1.5, paddingLeft: 10 }}>
                        <Text style={{ fontFamily: F.medium, fontSize: 12, color: textPrimary }} numberOfLines={1}>
                          {s.performedBy || 'Taller'}
                        </Text>
                        {s.notes ? (
                          <Text style={{ fontFamily: F.regular, fontSize: 11, color: textSecondary }} numberOfLines={1}>
                            {s.notes}
                          </Text>
                        ) : null}
                      </View>

                      <View style={{ flex: 0.6, alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={async () => {
                            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                              if (!window.confirm('¿Deseas eliminar este registro de servicio?')) return;
                            }
                            await onDeleteVehicleService(s.id);
                          }}
                        >
                          <MaterialIcons name="delete-outline" size={17} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* VIEW 3: ODOMETER LOGS */}
      {activeSubTab === 'odometers' && (
        <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor: borderCol, padding: 18, gap: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <View>
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                Historial de Kilometrajes y Odómetros Reportados
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary }}>
                Registro periódico del kilometraje recorrido para auditar el uso de cada unidad de la empresa.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleOpenAddOdometer()}
              style={[styles.primaryActionBtn, { backgroundColor: '#3B82F6' }]}
            >
              <MaterialIcons name="add" size={16} color="#FFFFFF" />
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' }}>Nuevo Odómetro</Text>
            </TouchableOpacity>
          </View>

          {vehicleOdometerLogs.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
              <MaterialIcons name="speed" size={36} color={textSecondary} />
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: textPrimary, marginTop: 8 }}>
                No hay lecturas registradas en la bitácora
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: textSecondary, marginTop: 2 }}>
                Registra los kilometrajes periódicos para calcular promedios y alertas.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: 780, borderWidth: 1, borderColor: borderCol, borderRadius: 12, overflow: 'hidden' }}>
                <View style={[styles.tableHeaderRow, { backgroundColor: subSurfaceBg, borderBottomColor: borderCol }]}>
                  <Text style={[styles.thCell, { flex: 1.5, color: textSecondary }]}>VEHÍCULO</Text>
                  <Text style={[styles.thCell, { flex: 1.1, color: textSecondary }]}>FECHA LECTURA</Text>
                  <Text style={[styles.thCell, { flex: 1.2, color: textSecondary, textAlign: 'right' }]}>ODÓMETRO TOTAL</Text>
                  <Text style={[styles.thCell, { flex: 1, color: textSecondary, textAlign: 'right' }]}>KILÓMETROS RECORRIDOS</Text>
                  <Text style={[styles.thCell, { flex: 2, color: textSecondary, paddingLeft: 12 }]}>NOTAS / CONDUCTOR</Text>
                </View>

                {vehicleOdometerLogs.map((o, idx) => {
                  const targetVeh = vehicles.find((v) => v.id === o.vehicleId);
                  return (
                    <View
                      key={o.id}
                      style={[
                        styles.tableDataRow,
                        {
                          borderBottomColor: borderCol,
                          borderBottomWidth: idx === vehicleOdometerLogs.length - 1 ? 0 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1.5 }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textPrimary }}>
                          {targetVeh ? `${targetVeh.brand} ${targetVeh.model}` : 'Vehículo'}
                        </Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                          {targetVeh?.plate || 'Sin placa'}
                        </Text>
                      </View>

                      <Text style={[styles.tdCell, { flex: 1.1, color: textSecondary }]}>
                        {new Date(o.date).toLocaleDateString()}
                      </Text>

                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1.2, textAlign: 'right', fontFamily: F.bold, color: textPrimary }]}>
                        {o.odometer.toLocaleString()} km
                      </Text>

                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1, textAlign: 'right', fontFamily: F.bold, color: '#3B82F6' }]}>
                        +{o.deltaKm ? o.deltaKm.toLocaleString() : '0'} km
                      </Text>

                      <Text style={[styles.tdCell, { flex: 2, paddingLeft: 12, color: textSecondary, fontSize: 12 }]} numberOfLines={1}>
                        {o.notes || 'Lectura de odómetro'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* MODAL 1: REGISTRAR / EDITAR VEHÍCULO */}
      <Modal visible={showAddVehicleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name={editingVehicle ? 'edit' : 'add-circle-outline'} size={22} color={accentPrimary} />
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                  {editingVehicle ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo en Flota'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddVehicleModal(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14 }}>
                {/* Switcher: Moto o Carro */}
                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>TIPO DE VEHÍCULO</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setFormVehicleType('moto');
                        setFormBrand(MOTO_CATALOG[0].brand);
                        setFormModel(MOTO_CATALOG[0].model);
                        setFormCategory(MOTO_CATALOG[0].category);
                        setSelectedCatalogItem(MOTO_CATALOG[0]);
                      }}
                      style={[
                        styles.typeSelectBtn,
                        {
                          backgroundColor: formVehicleType === 'moto' ? '#3B82F6' : subSurfaceBg,
                          borderColor: formVehicleType === 'moto' ? '#3B82F6' : borderCol,
                        },
                      ]}
                    >
                      <MaterialIcons name="two-wheeler" size={20} color={formVehicleType === 'moto' ? '#FFFFFF' : textPrimary} />
                      <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: formVehicleType === 'moto' ? '#FFFFFF' : textPrimary }}>
                        Moto / Motocicleta
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setFormVehicleType('car');
                        setFormBrand(CAR_CATALOG[0].brand);
                        setFormModel(CAR_CATALOG[0].model);
                        setFormCategory(CAR_CATALOG[0].category);
                        setSelectedCatalogItem(CAR_CATALOG[0]);
                      }}
                      style={[
                        styles.typeSelectBtn,
                        {
                          backgroundColor: formVehicleType === 'car' ? '#8B5CF6' : subSurfaceBg,
                          borderColor: formVehicleType === 'car' ? '#8B5CF6' : borderCol,
                        },
                      ]}
                    >
                      <MaterialIcons name="directions-car" size={20} color={formVehicleType === 'car' ? '#FFFFFF' : textPrimary} />
                      <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: formVehicleType === 'car' ? '#FFFFFF' : textPrimary }}>
                        Carro / Camioneta / Carga
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sub-mode: Catálogo o Manual */}
                {!editingVehicle && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setFormCatalogOrCustom('catalog')}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: formCatalogOrCustom === 'catalog' ? accentPrimary : subSurfaceBg,
                          borderColor: borderCol,
                        },
                      ]}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: formCatalogOrCustom === 'catalog' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                        Elegir del Catálogo
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setFormCatalogOrCustom('custom')}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: formCatalogOrCustom === 'custom' ? accentPrimary : subSurfaceBg,
                          borderColor: borderCol,
                        },
                      ]}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: formCatalogOrCustom === 'custom' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                        Ingreso Manual
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Catalog Picker */}
                {formCatalogOrCustom === 'catalog' && !editingVehicle && (
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>MODELO DEL CATÁLOGO</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
                        {(formVehicleType === 'moto' ? MOTO_CATALOG : CAR_CATALOG).map((item) => {
                          const isSelected = selectedCatalogItem?.id === item.id;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              onPress={() => handleSelectCatalogItem(item)}
                              style={[
                                styles.catalogCard,
                                {
                                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : subSurfaceBg,
                                  borderColor: isSelected ? accentPrimary : borderCol,
                                },
                              ]}
                            >
                              <View style={styles.catalogThumb}>
                                {item.imageRes ? (
                                  <Image source={item.imageRes} style={{ width: '90%', height: '90%' }} resizeMode="contain" />
                                ) : (
                                  <MaterialIcons name="directions-car" size={24} color={textSecondary} />
                                )}
                              </View>
                              <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary }}>{item.brand}</Text>
                              <Text style={{ fontFamily: F.regular, fontSize: 11, color: textSecondary }} numberOfLines={1}>{item.model}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Form fields: Brand, Model, Year, Plate */}
                <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>MARCA</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                      placeholder="Ej: TOYOTA, BERA..."
                      placeholderTextColor={textSecondary}
                      value={formBrand}
                      onChangeText={setFormBrand}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>MODELO</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                      placeholder="Ej: Hilux, SBR 150..."
                      placeholderTextColor={textSecondary}
                      value={formModel}
                      onChangeText={setFormModel}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                  <View style={{ flex: 0.8 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>AÑO</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                      placeholder="2024"
                      placeholderTextColor={textSecondary}
                      value={formYear}
                      onChangeText={setFormYear}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={{ flex: 1.2 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>PLACA</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                      placeholder="Ej: AB123CD"
                      placeholderTextColor={textSecondary}
                      value={formPlate}
                      onChangeText={setFormPlate}
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={{ flex: 1.2 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>ODÓMETRO INICIAL (KM)</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                      placeholder="0"
                      placeholderTextColor={textSecondary}
                      value={formOdometer}
                      onChangeText={setFormOdometer}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Company & Department Assignment */}
                <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>EMPRESA ASOCIADA</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {companies.map((c) => {
                        const sel = formCompanyId === c.id;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            onPress={() => setFormCompanyId(c.id)}
                            style={[
                              styles.chipBtn,
                              { backgroundColor: sel ? '#059669' : subSurfaceBg, borderColor: borderCol },
                            ]}
                          >
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: sel ? '#FFFFFF' : textPrimary }}>
                              {c.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>CONDUCTOR / OPERADOR ASIGNADO</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => setFormUserId('')}
                          style={[
                            styles.chipBtn,
                            { backgroundColor: !formUserId ? '#EF4444' : subSurfaceBg, borderColor: borderCol },
                          ]}
                        >
                          <MaterialIcons name="person-off" size={13} color={!formUserId ? '#FFFFFF' : textSecondary} />
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: !formUserId ? '#FFFFFF' : textPrimary }}>
                            Ninguno
                          </Text>
                        </TouchableOpacity>

                        {appUsers.map((u) => {
                          const sel = formUserId === u.id;
                          return (
                            <TouchableOpacity
                              key={u.id}
                              onPress={() => setFormUserId(u.id)}
                              style={[
                                styles.chipBtn,
                                { backgroundColor: sel ? accentPrimary : subSurfaceBg, borderColor: borderCol },
                              ]}
                            >
                              <MaterialIcons name="person" size={13} color={sel ? (isDark ? '#001136' : '#FFFFFF') : textSecondary} />
                              <Text style={{ fontFamily: F.bold, fontSize: 11, color: sel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                                {u.fullName || u.email}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                </View>

                {/* Fotografía / Imagen de la Unidad (Archivo local o Enlace URL) */}
                <View style={{ marginTop: 4 }}>
                  <ImageUploader
                    label="Fotografía Real de la Unidad (Archivo local o Enlace URL):"
                    imageUri={formCustomImg}
                    onImageChange={setFormCustomImg}
                    isDark={isDark}
                  />
                </View>

                {/* Notes */}
                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>NOTAS / DETALLES DE LA UNIDAD</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary, height: 60 }]}
                    placeholder="Uso asignado, equipamiento adicional..."
                    placeholderTextColor={textSecondary}
                    value={formNotes}
                    onChangeText={setFormNotes}
                    multiline
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowAddVehicleModal(false)}
                style={[styles.cancelBtn, { borderColor: borderCol }]}
              >
                <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textSecondary }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveVehicleSubmit}
                style={[styles.primaryActionBtn, { backgroundColor: accentPrimary }]}
              >
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: isDark ? '#001136' : '#FFFFFF' }}>
                  {editingVehicle ? 'Guardar Cambios' : 'Registrar en Flota'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CARGAR MANTENIMIENTO / SERVICIO */}
      <Modal visible={showAddServiceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol, maxWidth: 480 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="build" size={22} color="#10B981" />
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                  Cargar Servicio de Mantenimiento
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddServiceModal(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14 }}>
                {/* Select Vehicle */}
                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>SELECCIONAR VEHÍCULO</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {vehicles.map((v) => {
                      const sel = serviceTargetVehId === v.id;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          onPress={() => {
                            setServiceTargetVehId(v.id);
                            setServiceOdo(String(v.currentOdometer));
                          }}
                          style={[
                            styles.chipBtn,
                            { backgroundColor: sel ? '#10B981' : subSurfaceBg, borderColor: borderCol },
                          ]}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: sel ? '#FFFFFF' : textPrimary }}>
                            {v.brand} {v.model} ({v.plate || 'Sin placa'})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Component serviced */}
                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>COMPONENTE ATENDIDO</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {(() => {
                      const targetVeh = vehicles.find((v) => v.id === serviceTargetVehId);
                      const isCar = targetVeh?.vehicleType === 'car';
                      const comps = getVehicleComponents(isCar);
                      return comps.map((c) => {
                        const sel = serviceType === c;
                        return (
                          <TouchableOpacity
                            key={c}
                            onPress={() => setServiceType(c)}
                            style={[
                              styles.chipBtn,
                              { backgroundColor: sel ? accentPrimary : subSurfaceBg, borderColor: borderCol },
                            ]}
                          >
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: sel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                              {VEHICLE_COMPONENT_NAMES[c]}
                            </Text>
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </View>
                </View>

                {/* Odometer, Date & Cost */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>KILOMETRAJE DEL SERVICIO</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                      placeholder="Ej: 14250"
                      placeholderTextColor={textSecondary}
                      value={serviceOdo}
                      onChangeText={setServiceOdo}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>COSTO (USD)</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                      placeholder="0.00"
                      placeholderTextColor={textSecondary}
                      value={serviceCost}
                      onChangeText={setServiceCost}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>FECHA DEL SERVICIO (AAAA-MM-DD)</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                    value={serviceDate}
                    onChangeText={setServiceDate}
                  />
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>TALLER / MECÁNICO RESPONSABLE</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                    placeholder="Taller Central EDV, Concesionario..."
                    placeholderTextColor={textSecondary}
                    value={servicePerformedBy}
                    onChangeText={setServicePerformedBy}
                  />
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>OBSERVACIONES / REPUESTOS</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary, height: 60 }]}
                    placeholder="Marca de aceite, número de parte, etc."
                    placeholderTextColor={textSecondary}
                    value={serviceNotes}
                    onChangeText={setServiceNotes}
                    multiline
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowAddServiceModal(false)}
                style={[styles.cancelBtn, { borderColor: borderCol }]}
              >
                <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textSecondary }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveServiceSubmit}
                style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
              >
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#FFFFFF' }}>Asentar Servicio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: ACTUALIZAR ODÓMETRO */}
      <Modal visible={showAddOdometerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol, maxWidth: 440 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="speed" size={22} color="#3B82F6" />
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                  Registrar Lectura de Odómetro
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddOdometerModal(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14 }}>
              <View>
                <Text style={[styles.formLabel, { color: textSecondary }]}>VEHÍCULO A ACTUALIZAR</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {vehicles.map((v) => {
                    const sel = odoTargetVehId === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => {
                          setOdoTargetVehId(v.id);
                          setOdoReading(String(v.currentOdometer));
                        }}
                        style={[
                          styles.chipBtn,
                          { backgroundColor: sel ? '#3B82F6' : subSurfaceBg, borderColor: borderCol },
                        ]}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: sel ? '#FFFFFF' : textPrimary }}>
                          {v.brand} {v.model} ({v.currentOdometer.toLocaleString()} km)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={[styles.formLabel, { color: textSecondary }]}>NUEVO KILOMETRAJE TOTAL (KM)</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary, fontSize: 16, fontFamily: F.extrabold }]}
                  placeholder="0"
                  placeholderTextColor={textSecondary}
                  value={odoReading}
                  onChangeText={setOdoReading}
                  keyboardType="numeric"
                />
                {(() => {
                  const target = vehicles.find((v) => v.id === odoTargetVehId);
                  const prev = target ? target.currentOdometer : 0;
                  const cur = parseInt(odoReading, 10) || 0;
                  const diff = cur - prev;
                  return (
                    <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: diff >= 0 ? '#10B981' : '#EF4444', marginTop: 4 }}>
                      {diff >= 0 ? `+${diff.toLocaleString()} km recorridos en este período` : 'El nuevo kilometraje no puede ser menor al anterior'}
                    </Text>
                  );
                })()}
              </View>

              <View>
                <Text style={[styles.formLabel, { color: textSecondary }]}>NOTAS / DETALLES DE LA RUTA</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                  placeholder="Ruta intersede, viaje a silos..."
                  placeholderTextColor={textSecondary}
                  value={odoNotes}
                  onChangeText={setOdoNotes}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                onPress={() => setShowAddOdometerModal(false)}
                style={[styles.cancelBtn, { borderColor: borderCol }]}
              >
                <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textSecondary }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveOdometerSubmit}
                style={[styles.primaryActionBtn, { backgroundColor: '#3B82F6' }]}
              >
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#FFFFFF' }}>Guardar Odómetro</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: INSPECCIÓN TÉCNICA VEHICULAR COMPLETA */}
      <Modal visible={Boolean(inspectingVehicle)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol, maxWidth: 640 }]}>
            {inspectingVehicle && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialIcons name="analytics" size={22} color={accentPrimary} />
                    <View>
                      <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                        Ficha Técnica & Desgaste de Componentes
                      </Text>
                      <Text style={{ fontFamily: F.regular, fontSize: 12, color: textSecondary }}>
                        {inspectingVehicle.brand} {inspectingVehicle.model} ({inspectingVehicle.plate || 'Sin Placa'}) · Odómetro: {inspectingVehicle.currentOdometer.toLocaleString()} km
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setInspectingVehicle(null)}>
                    <MaterialIcons name="close" size={20} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                  <View style={{ gap: 10 }}>
                    {(() => {
                      const isCar = inspectingVehicle.vehicleType === 'car';
                      const comps = getVehicleComponents(isCar).filter((c) => c !== 'fuel' && c !== 'other');

                      return comps.map((comp) => {
                        const lastServ = vehicleServices.find(
                          (s) => s.vehicleId === inspectingVehicle.id && s.type === comp
                        );
                        const lastOdo = lastServ ? lastServ.odometer : 0;
                        const wear = calculateVehicleWearPercentage(
                          inspectingVehicle.currentOdometer,
                          lastOdo,
                          comp,
                          isCar
                        );
                        const maxLife = getVehicleComponentLifespan(comp, isCar);
                        const kmTraveled = Math.max(0, inspectingVehicle.currentOdometer - lastOdo);
                        const status = getVehicleServiceStatus(wear);

                        return (
                          <View
                            key={comp}
                            style={[
                              styles.compInspectRow,
                              { backgroundColor: subSurfaceBg, borderColor: borderCol },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <MaterialIcons
                                  name={(VEHICLE_COMPONENT_ICONS[comp] as any) || 'build'}
                                  size={16}
                                  color={status.color}
                                />
                                <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                                  {VEHICLE_COMPONENT_NAMES[comp]}
                                </Text>
                              </View>
                              <View style={[styles.inlineBadge, { backgroundColor: `${status.color}20` }]}>
                                <Text style={[styles.tabularText, { fontFamily: F.bold, fontSize: 11, color: status.color }]}>
                                  {wear}% ({status.label})
                                </Text>
                              </View>
                            </View>

                            <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }]}>
                              <View style={[styles.barFill, { width: `${wear}%`, backgroundColor: status.color }]} />
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.tabularText, { fontFamily: F.regular, fontSize: 11, color: textSecondary }]}>
                                Recorrido: {kmTraveled.toLocaleString()} km de {maxLife.toLocaleString()} km max
                              </Text>
                              <Text style={[styles.tabularText, { fontFamily: F.medium, fontSize: 11, color: textSecondary }]}>
                                Último cambio: {lastServ ? `${lastServ.odometer.toLocaleString()} km (${lastServ.date})` : 'Sin registro previo'}
                              </Text>
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </View>
                </ScrollView>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const veh = inspectingVehicle;
                      setInspectingVehicle(null);
                      handleOpenAddService(veh);
                    }}
                    style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
                  >
                    <MaterialIcons name="build" size={16} color="#FFFFFF" />
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' }}>
                      Cargar Mantenimiento a esta Unidad
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setInspectingVehicle(null)}
                    style={[styles.cancelBtn, { borderColor: borderCol }]}
                  >
                    <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textSecondary }}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 5: CAMBIAR FOTOGRAFÍA / IMAGEN RÁPIDA */}
      <Modal visible={showChangePhotoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="photo-camera" size={22} color={accentPrimary} />
                <View>
                  <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                    Actualizar Fotografía del Vehículo
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textSecondary }}>
                    {photoVehicle?.brand} {photoVehicle?.model} ({photoVehicle?.plate || 'Sin placa'})
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowChangePhotoModal(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14 }}>
                {/* ImageUploader: Subir archivo o ingresar URL */}
                <ImageUploader
                  label="Montar Fotografía Real de la Unidad (Archivo local o Enlace URL):"
                  imageUri={photoCustomUri}
                  onImageChange={(uri) => {
                    setPhotoCustomUri(uri);
                    if (uri) setPhotoCatalogItem(null);
                  }}
                  isDark={isDark}
                />

                {/* Separador O elegir del Catálogo */}
                <View style={{ borderTopWidth: 1, borderTopColor: borderCol, paddingTop: 14 }}>
                  <Text style={[styles.formLabel, { color: textSecondary, marginBottom: 8 }]}>
                    O SELECCIONAR ILUSTRACIÓN DEL CATÁLOGO ({photoVehicle?.vehicleType === 'car' ? 'CARROS' : 'MOTOS'})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
                      {(photoVehicle?.vehicleType === 'car' ? CAR_CATALOG : MOTO_CATALOG).map((item) => {
                        const isSelected = photoCatalogItem?.id === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() => {
                              setPhotoCatalogItem(item);
                              setPhotoCustomUri('');
                            }}
                            style={[
                              styles.catalogCard,
                              {
                                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : subSurfaceBg,
                                borderColor: isSelected ? accentPrimary : borderCol,
                              },
                            ]}
                          >
                            <View style={styles.catalogThumb}>
                              {item.imageRes ? (
                                <Image source={item.imageRes} style={{ width: '90%', height: '90%' }} resizeMode="contain" />
                              ) : (
                                <MaterialIcons name="directions-car" size={24} color={textSecondary} />
                              )}
                            </View>
                            <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary }}>{item.brand}</Text>
                            <Text style={{ fontFamily: F.regular, fontSize: 11, color: textSecondary }} numberOfLines={1}>{item.model}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowChangePhotoModal(false)}
                style={[styles.cancelBtn, { borderColor: borderCol }]}
              >
                <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textSecondary }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveChangePhoto}
                style={[styles.primaryActionBtn, { backgroundColor: accentPrimary }]}
              >
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: isDark ? '#001136' : '#FFFFFF' }}>
                  Guardar Fotografía
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: ASIGNAR CONDUCTOR / OPERADOR RÁPIDO */}
      <Modal visible={showAssignUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol, maxWidth: 520 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="person-pin" size={22} color={accentPrimary} />
                <View>
                  <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                    Asignar Conductor / Operador
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textSecondary }}>
                    {assigningVehicle?.brand} {assigningVehicle?.model} ({assigningVehicle?.plate || 'Sin placa'})
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowAssignUserModal(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* User Search Input */}
            <View style={{ marginBottom: 12 }}>
              <TextInput
                style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="Buscar usuario por nombre o correo..."
                placeholderTextColor={textSecondary}
                value={userSearchText}
                onChangeText={setUserSearchText}
              />
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8 }}>
                {/* Opción 1: Sin Asignar */}
                <TouchableOpacity
                  onPress={() => setSelectedAssigneeId('')}
                  style={[
                    styles.userSelectCard,
                    {
                      backgroundColor: selectedAssigneeId === '' ? 'rgba(239, 68, 68, 0.1)' : subSurfaceBg,
                      borderColor: selectedAssigneeId === '' ? '#EF4444' : borderCol,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[styles.userAvatar, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <MaterialIcons name="person-off" size={18} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                        Ninguno (Sin conductor asignado)
                      </Text>
                      <Text style={{ fontFamily: F.regular, fontSize: 11, color: textSecondary }}>
                        Dejar la unidad como vehículo compartido sin responsable fijo
                      </Text>
                    </View>
                  </View>
                  {selectedAssigneeId === '' && (
                    <MaterialIcons name="check-circle" size={20} color="#EF4444" />
                  )}
                </TouchableOpacity>

                {/* Lista de Usuarios Registrados */}
                {appUsers
                  .filter((u) => {
                    if (!userSearchText.trim()) return true;
                    const q = userSearchText.toLowerCase();
                    return (
                      (u.fullName || '').toLowerCase().includes(q) ||
                      (u.email || '').toLowerCase().includes(q) ||
                      (u.role || '').toLowerCase().includes(q)
                    );
                  })
                  .map((u) => {
                    const isSelected = selectedAssigneeId === u.id;
                    const roleColor = u.role === 'superadmin' ? '#F59E0B' : u.role === 'tecnico' ? '#3B82F6' : '#10B981';
                    return (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => setSelectedAssigneeId(u.id)}
                        style={[
                          styles.userSelectCard,
                          {
                            backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : subSurfaceBg,
                            borderColor: isSelected ? accentPrimary : borderCol,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={[styles.userAvatar, { backgroundColor: `${roleColor}25` }]}>
                            <MaterialIcons name="person" size={18} color={roleColor} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }} numberOfLines={1}>
                                {u.fullName || u.email}
                              </Text>
                              <View style={[styles.rolePill, { backgroundColor: `${roleColor}20` }]}>
                                <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: roleColor, textTransform: 'uppercase' }}>
                                  {u.role}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ fontFamily: F.regular, fontSize: 11, color: textSecondary }} numberOfLines={1}>
                              {u.email} {u.companyName ? `· ${u.companyName}` : ''}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <MaterialIcons name="check-circle" size={20} color={accentPrimary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowAssignUserModal(false)}
                style={[styles.cancelBtn, { borderColor: borderCol }]}
              >
                <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textSecondary }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveAssignUser}
                style={[styles.primaryActionBtn, { backgroundColor: accentPrimary }]}
              >
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: isDark ? '#001136' : '#FFFFFF' }}>
                  Confirmar Asignación
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
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
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 260,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  vehicleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  plateBox: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vehImageThumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  odometerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  barTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  iconTouchBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  formLabel: {
    fontFamily: F.bold,
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
  inputBox: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    marginTop: 4,
  },
  typeSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  catalogCard: {
    width: 110,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  catalogThumb: {
    width: 70,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  compInspectRow: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  inlineBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  thumbEditOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 17, 54, 0.75)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  userSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
