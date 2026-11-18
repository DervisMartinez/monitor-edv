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
  VehicleDocument,
  VehicleDocCategory,
} from '../../../domain/entities/Vehicle';
import {
  MOTO_CATALOG,
  CAR_CATALOG,
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
import { VehicleReportModal, computeDocumentStatus } from './VehicleReportModal';

interface VehiclesSectionProps {
  vehicles: Vehicle[];
  vehicleServices: VehicleServiceRecord[];
  vehicleOdometerLogs: VehicleOdometerRecord[];
  vehicleDocuments: VehicleDocument[];
  companies: Company[];
  departments: Department[];
  appUsers: AppUser[];
  currentUser?: any;
  onSaveVehicle: (v: Vehicle) => Promise<void>;
  onUpdateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<{ success: boolean; error?: string }>;
  onAddVehicleService: (s: Omit<VehicleServiceRecord, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteVehicleService: (id: string) => Promise<void>;
  onAddVehicleOdometer: (o: Omit<VehicleOdometerRecord, 'id' | 'createdAt'>) => Promise<{ success: boolean; delta: number }>;
  onSaveVehicleDocument: (doc: VehicleDocument) => Promise<void>;
  onUpdateVehicleDocument: (id: string, updates: Partial<VehicleDocument>) => Promise<void>;
  onDeleteVehicleDocument: (id: string) => Promise<void>;
  onUpdateAppUser?: (id: string, updates: Partial<AppUser>) => Promise<void>;
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

const DOC_PRESET_TITLES: { label: string; category: VehicleDocCategory; permanent?: boolean; icon: string; color: string }[] = [
  { label: 'Carnet de Circulación', category: 'vehicle', icon: 'directions-car', color: '#3B82F6' },
  { label: 'Título de Propiedad', category: 'vehicle', permanent: true, icon: 'verified', color: '#6366F1' },
  { label: 'Póliza de Seguro RCV', category: 'vehicle', icon: 'security', color: '#F59E0B' },
  { label: 'Trimestres Municipales', category: 'vehicle', icon: 'receipt-long', color: '#0EA5E9' },
  { label: 'Licencia de Conducir', category: 'driver', icon: 'badge', color: '#10B981' },
  { label: 'Certificado Médico Vial', category: 'driver', icon: 'medical-services', color: '#EC4899' },
];

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const LICENSE_GRADES = [
  '2do Grado (Motos)',
  '3er Grado (Automóviles)',
  '4to Grado (Transporte)',
  '5to Grado (Carga y 4x4)',
];

export const VehiclesSection: React.FC<VehiclesSectionProps> = ({
  vehicles,
  vehicleServices,
  vehicleOdometerLogs,
  vehicleDocuments,
  companies,
  departments,
  appUsers,
  currentUser,
  onSaveVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onAddVehicleService,
  onDeleteVehicleService,
  onAddVehicleOdometer,
  onSaveVehicleDocument,
  onUpdateVehicleDocument,
  onDeleteVehicleDocument,
  onUpdateAppUser,
  isDark,
  colors,
  onNotify,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1180;

  // Sub-tabs state
  const [activeSubTab, setActiveSubTab] = useState<'fleet' | 'documents' | 'expenses' | 'services' | 'odometers'>('fleet');
  const [filterType, setFilterType] = useState<'all' | 'moto' | 'car'>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDocStatus, setFilterDocStatus] = useState<'all' | 'valid' | 'expiring' | 'expired'>('all');
  const [filterDocVehicleId, setFilterDocVehicleId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [showAddOdometerModal, setShowAddOdometerModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [inspectingVehicle, setInspectingVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [reportVehicle, setReportVehicle] = useState<Vehicle | null>(null);
  const [previewDocImage, setPreviewDocImage] = useState<VehicleDocument | null>(null);

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
  const [formStatus, setFormStatus] = useState<VehicleStatus>('operativo');
  const [formCompanyId, setFormCompanyId] = useState(companies[0]?.id || '');
  const [formDeptId, setFormDeptId] = useState(departments[0]?.id || '');
  const [formUserId, setFormUserId] = useState('');
  const [formCustomImg, setFormCustomImg] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Pilot fields in Vehicle form / Assign modal
  const [pilotDni, setPilotDni] = useState('');
  const [pilotPhone, setPilotPhone] = useState('');
  const [pilotBloodType, setPilotBloodType] = useState('O+');
  const [pilotLicenseGrade, setPilotLicenseGrade] = useState('2do Grado (Motos)');
  const [pilotEmergencyContact, setPilotEmergencyContact] = useState('');
  const [pilotEmergencyPhone, setPilotEmergencyPhone] = useState('');
  const [pilotCity, setPilotCity] = useState('Valencia, Edo. Carabobo');

  // Form states: New Service
  const [serviceTargetVehId, setServiceTargetVehId] = useState(vehicles[0]?.id || '');
  const [serviceType, setServiceType] = useState<VehicleComponentType>('oil');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceOdo, setServiceOdo] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  const [servicePerformedBy, setServicePerformedBy] = useState('Taller Central EDV');
  const [serviceNotes, setServiceNotes] = useState('');

  // Form states: Quick Fuel / Expense
  const [fuelTargetVehId, setFuelTargetVehId] = useState(vehicles[0]?.id || '');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCostUSD, setFuelCostUSD] = useState('');
  const [fuelOdo, setFuelOdo] = useState('');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelStation, setFuelStation] = useState('Estación de Servicio EDV');
  const [fuelNotes, setFuelNotes] = useState('');

  // Form states: New Odometer
  const [odoTargetVehId, setOdoTargetVehId] = useState(vehicles[0]?.id || '');
  const [odoReading, setOdoReading] = useState('');
  const [odoNotes, setOdoNotes] = useState('Lectura rutinaria de odómetro');

  // Form states: New / Edit Document (Papeles)
  const [editingDoc, setEditingDoc] = useState<VehicleDocument | null>(null);
  const [docVehicleId, setDocVehicleId] = useState(vehicles[0]?.id || '');
  const [docCategory, setDocCategory] = useState<VehicleDocCategory>('vehicle');
  const [docTitle, setDocTitle] = useState('Carnet de Circulación');
  const [docNumber, setDocNumber] = useState('');
  const [docIssueDate, setDocIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [docExpiryDate, setDocExpiryDate] = useState('2027-06-01');
  const [docIsPermanent, setDocIsPermanent] = useState(false);
  const [docImageUri, setDocImageUri] = useState('');
  const [docNotes, setDocNotes] = useState('');

  // Quick Assign User + Pilot Data Modal State
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
        const matchDni = (v.driverDni || '').toLowerCase().includes(q);
        if (!matchBrand && !matchModel && !matchPlate && !matchName && !matchDriver && !matchDni) return false;
      }
      return true;
    });
  }, [vehicles, filterType, filterCompany, filterStatus, searchQuery]);

  // Overall KPI metrics (Fleet, Km, Financials, Documents, Wear Alerts)
  const stats = useMemo(() => {
    const totalVehicles = vehicles.length;
    const totalMotos = vehicles.filter((v) => v.vehicleType === 'moto').length;
    const totalCars = vehicles.filter((v) => v.vehicleType === 'car').length;
    const totalKmFleet = vehicles.reduce((acc, v) => acc + (v.currentOdometer || 0), 0);
    const avgKmPerVehicle = totalVehicles > 0 ? Math.round(totalKmFleet / totalVehicles) : 0;

    const fuelServices = vehicleServices.filter((s) => s.type === 'fuel');
    const maintServices = vehicleServices.filter((s) => s.type !== 'fuel');

    const totalFuelUSD = fuelServices.reduce((acc, s) => acc + (Number(s.costUSD) || 0), 0);
    const totalLiters = fuelServices.reduce((acc, s) => acc + (Number(s.liters) || 0), 0);
    const totalMaintUSD = maintServices.reduce((acc, s) => acc + (Number(s.costUSD) || 0), 0);
    const totalCostUSD = totalFuelUSD + totalMaintUSD;
    const avgCostPerKm = totalKmFleet > 0 ? totalCostUSD / totalKmFleet : 0;

    // Document alerts
    let expiredDocsCount = 0;
    let expiringDocsCount = 0;
    for (const d of vehicleDocuments) {
      const st = computeDocumentStatus(d);
      if (st.status === 'expired') expiredDocsCount++;
      else if (st.status === 'expiring') expiringDocsCount++;
    }

    // Critical or warning wear components
    let alertUnitsCount = 0;
    for (const v of vehicles) {
      const isCar = v.vehicleType === 'car';
      const comps = getVehicleComponents(isCar).filter((c) => c !== 'fuel' && c !== 'other');
      let hasWarningOrCritical = false;
      for (const comp of comps) {
        const lastServ = vehicleServices.find((s) => s.vehicleId === v.id && s.type === comp);
        const lastOdo = lastServ ? lastServ.odometer : 0;
        const wear = calculateVehicleWearPercentage(v.currentOdometer, lastOdo, comp, isCar);
        if (wear <= 20) {
          hasWarningOrCritical = true;
          break;
        }
      }
      if (hasWarningOrCritical) alertUnitsCount++;
    }

    // Monthly expense breakdown across fleet
    const monthlyMap: Record<string, { fuel: number; maint: number; total: number }> = {};
    vehicleServices.forEach((s) => {
      const monthKey = s.date ? s.date.slice(0, 7) : '2026-11';
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { fuel: 0, maint: 0, total: 0 };
      const c = Number(s.costUSD) || 0;
      if (s.type === 'fuel') monthlyMap[monthKey].fuel += c;
      else monthlyMap[monthKey].maint += c;
      monthlyMap[monthKey].total += c;
    });
    const monthlyData = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);

    return {
      totalVehicles,
      totalMotos,
      totalCars,
      totalKmFleet,
      avgKmPerVehicle,
      totalServicesCount: vehicleServices.length,
      maintCount: maintServices.length,
      fuelCount: fuelServices.length,
      totalFuelUSD,
      totalLiters,
      totalMaintUSD,
      totalCostUSD,
      avgCostPerKm,
      totalDocs: vehicleDocuments.length,
      expiredDocsCount,
      expiringDocsCount,
      alertUnitsCount,
      monthlyData,
    };
  }, [vehicles, vehicleServices, vehicleDocuments]);

  // Filtered Documents for Documents Tab
  const filteredDocuments = useMemo(() => {
    return vehicleDocuments.filter((doc) => {
      if (filterDocVehicleId !== 'all' && doc.vehicleId !== filterDocVehicleId) return false;
      const st = computeDocumentStatus(doc);
      if (filterDocStatus === 'valid' && st.status !== 'valid' && st.status !== 'permanent') return false;
      if (filterDocStatus === 'expiring' && st.status !== 'expiring') return false;
      if (filterDocStatus === 'expired' && st.status !== 'expired') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (doc.title || '').toLowerCase().includes(q);
        const matchNum = (doc.docNumber || '').toLowerCase().includes(q);
        const matchDriver = (doc.driverName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNum && !matchDriver) return false;
      }
      return true;
    });
  }, [vehicleDocuments, filterDocVehicleId, filterDocStatus, searchQuery]);

  // Helper to resolve pilot info for a vehicle
  const getVehiclePilotDetails = (v: Vehicle) => {
    const matchedUser = appUsers.find((u) => u.id === v.assignedUserId);
    return {
      name: v.assignedUserName || matchedUser?.fullName || 'Sin conductor asignado',
      email: v.assignedUserEmail || matchedUser?.email || '',
      dni: v.driverDni || matchedUser?.dni || 'S/C',
      phone: v.driverPhone || matchedUser?.phone || 'Sin teléfono',
      bloodType: v.driverBloodType || matchedUser?.bloodType || 'O+',
      licenseGrade: v.driverLicenseGrade || matchedUser?.licenseGrade || (v.vehicleType === 'car' ? '5to Grado' : '2do Grado'),
      emergencyContact: v.driverEmergencyContact || matchedUser?.emergencyContactName || '',
      emergencyPhone: v.driverEmergencyPhone || matchedUser?.emergencyContactPhone || '',
    };
  };

  // Populate pilot fields when selecting a user
  const syncPilotFieldsFromUser = (userId: string, vType: VehicleType) => {
    const u = appUsers.find((item) => item.id === userId);
    if (u) {
      setPilotDni(u.dni || '');
      setPilotPhone(u.phone || '');
      setPilotBloodType(u.bloodType || 'O+');
      setPilotLicenseGrade(u.licenseGrade || (vType === 'car' ? '5to Grado (Carga y 4x4)' : '2do Grado (Motos)'));
      setPilotEmergencyContact(u.emergencyContactName || '');
      setPilotEmergencyPhone(u.emergencyContactPhone || '');
      setPilotCity(u.city || 'Valencia, Edo. Carabobo');
    }
  };

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
    setFormStatus('operativo');
    setFormCompanyId(companies[0]?.id || '');
    setFormDeptId(departments[0]?.id || '');
    const defaultUser = appUsers[0];
    setFormUserId(defaultUser?.id || '');
    if (defaultUser) {
      syncPilotFieldsFromUser(defaultUser.id, 'moto');
    }
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
      status: formStatus,
      companyId: formCompanyId || matchedComp?.id,
      companyName: matchedComp?.name || editingVehicle?.companyName,
      departmentId: formDeptId || matchedDept?.id,
      departmentName: matchedDept?.name || editingVehicle?.departmentName,
      assignedUserId: formUserId || undefined,
      assignedUserName: matchedUser ? (matchedUser.fullName || matchedUser.email) : undefined,
      assignedUserEmail: matchedUser?.email,
      driverDni: pilotDni.trim() || matchedUser?.dni,
      driverPhone: pilotPhone.trim() || matchedUser?.phone,
      driverBloodType: pilotBloodType || matchedUser?.bloodType || 'O+',
      driverLicenseGrade: pilotLicenseGrade || matchedUser?.licenseGrade,
      driverEmergencyContact: pilotEmergencyContact.trim() || matchedUser?.emergencyContactName,
      driverEmergencyPhone: pilotEmergencyPhone.trim() || matchedUser?.emergencyContactPhone,
      driverCity: pilotCity.trim() || matchedUser?.city,
      customImageUri: customImg || undefined,
      imageUrl: customImg || undefined,
      catalogImageRes: customImg
        ? undefined
        : selectedCatalogItem?.imageRes ||
          (editingVehicle?.customImageUri ? undefined : editingVehicle?.catalogImageRes) ||
          fallbackCatalog,
      catalogId: customImg ? undefined : selectedCatalogItem?.id || editingVehicle?.catalogId,
      notes: formNotes.trim(),
      createdAt: editingVehicle?.createdAt || new Date().toISOString(),
    };

    if (matchedUser && onUpdateAppUser) {
      await onUpdateAppUser(matchedUser.id, {
        dni: pilotDni.trim() || matchedUser.dni,
        phone: pilotPhone.trim() || matchedUser.phone,
        bloodType: pilotBloodType || matchedUser.bloodType,
        licenseGrade: pilotLicenseGrade || matchedUser.licenseGrade,
        emergencyContactName: pilotEmergencyContact.trim() || matchedUser.emergencyContactName,
        emergencyContactPhone: pilotEmergencyPhone.trim() || matchedUser.emergencyContactPhone,
        city: pilotCity.trim() || matchedUser.city,
      });
    }

    if (editingVehicle) {
      await onUpdateVehicle(editingVehicle.id, newVehicle);
      onNotify?.('Vehículo Actualizado', `Se guardaron los cambios para ${newVehicle.brand} ${newVehicle.model}.`);
    } else {
      await onSaveVehicle(newVehicle);
      onNotify?.(
        'Vehículo Registrado',
        `Se agregó ${newVehicle.brand} ${newVehicle.model} (${newVehicle.plate || 'Sin placa'}) a la flota.`
      );
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
    setFormStatus(v.status || 'operativo');
    setFormCompanyId(v.companyId || companies[0]?.id || '');
    setFormDeptId(v.departmentId || departments[0]?.id || '');
    setFormUserId(v.assignedUserId || '');
    const p = getVehiclePilotDetails(v);
    setPilotDni(p.dni !== 'S/C' ? p.dni : '');
    setPilotPhone(p.phone !== 'Sin teléfono' ? p.phone : '');
    setPilotBloodType(p.bloodType || 'O+');
    setPilotLicenseGrade(p.licenseGrade || '2do Grado (Motos)');
    setPilotEmergencyContact(p.emergencyContact || '');
    setPilotEmergencyPhone(p.emergencyPhone || '');
    setPilotCity(v.driverCity || 'Valencia, Edo. Carabobo');
    setFormCustomImg(v.customImageUri || v.imageUrl || '');
    setFormNotes(v.notes || '');
    setShowAddVehicleModal(true);
  };

  // Open quick assign user + pilot details modal
  const handleOpenAssignUser = (v: Vehicle) => {
    setAssigningVehicle(v);
    setSelectedAssigneeId(v.assignedUserId || '');
    setUserSearchText('');
    const p = getVehiclePilotDetails(v);
    setPilotDni(p.dni !== 'S/C' ? p.dni : '');
    setPilotPhone(p.phone !== 'Sin teléfono' ? p.phone : '');
    setPilotBloodType(p.bloodType || 'O+');
    setPilotLicenseGrade(p.licenseGrade || (v.vehicleType === 'car' ? '5to Grado (Carga y 4x4)' : '2do Grado (Motos)'));
    setPilotEmergencyContact(p.emergencyContact || '');
    setPilotEmergencyPhone(p.emergencyPhone || '');
    setPilotCity(v.driverCity || 'Valencia, Edo. Carabobo');
    setShowAssignUserModal(true);
  };

  // Submit quick assign user + pilot details
  const handleSaveAssignUser = async () => {
    if (!assigningVehicle) return;
    const targetUser = appUsers.find((u) => u.id === selectedAssigneeId);
    const updates: Partial<Vehicle> = {
      assignedUserId: selectedAssigneeId || undefined,
      assignedUserName: targetUser ? targetUser.fullName || targetUser.email : undefined,
      assignedUserEmail: targetUser?.email,
      driverDni: selectedAssigneeId ? pilotDni.trim() : undefined,
      driverPhone: selectedAssigneeId ? pilotPhone.trim() : undefined,
      driverBloodType: selectedAssigneeId ? pilotBloodType : undefined,
      driverLicenseGrade: selectedAssigneeId ? pilotLicenseGrade : undefined,
      driverEmergencyContact: selectedAssigneeId ? pilotEmergencyContact.trim() : undefined,
      driverEmergencyPhone: selectedAssigneeId ? pilotEmergencyPhone.trim() : undefined,
      driverCity: selectedAssigneeId ? pilotCity.trim() : undefined,
    };

    if (targetUser && onUpdateAppUser) {
      await onUpdateAppUser(targetUser.id, {
        dni: pilotDni.trim() || targetUser.dni,
        phone: pilotPhone.trim() || targetUser.phone,
        bloodType: pilotBloodType || targetUser.bloodType,
        licenseGrade: pilotLicenseGrade || targetUser.licenseGrade,
        emergencyContactName: pilotEmergencyContact.trim() || targetUser.emergencyContactName,
        emergencyContactPhone: pilotEmergencyPhone.trim() || targetUser.emergencyContactPhone,
        city: pilotCity.trim() || targetUser.city,
      });
    }

    await onUpdateVehicle(assigningVehicle.id, updates);
    setShowAssignUserModal(false);
    onNotify?.(
      'Piloto y Ficha Actualizados',
      targetUser
        ? `Se asignó a ${targetUser.fullName || targetUser.email} (${pilotDni || 'S/C'}) al vehículo ${assigningVehicle.brand} ${assigningVehicle.model}.`
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
      catalogImageRes: newUri
        ? undefined
        : photoCatalogItem?.imageRes || photoVehicle.catalogImageRes || fallbackCatalog,
      catalogId: newUri ? undefined : photoCatalogItem?.id || photoVehicle.catalogId,
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
      const ok = window.confirm(
        `¿Deseas dar de baja y eliminar el vehículo ${v.brand} ${v.model} (${v.plate || 'Sin placa'})?`
      );
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
      `Se asentó ${VEHICLE_COMPONENT_NAMES[serviceType]} ($${costNum.toFixed(2)} USD) para ${target.brand} ${target.model}.`
    );
    setShowAddServiceModal(false);
  };

  // Open quick fuel / expense modal
  const handleOpenAddFuel = (v?: Vehicle) => {
    const target = v || vehicles[0];
    if (!target) {
      onNotify?.('Sin Vehículos', 'Registra al menos un vehículo para cargar gasolina/gasto.');
      return;
    }
    setFuelTargetVehId(target.id);
    setFuelOdo(String(target.currentOdometer));
    setFuelLiters('');
    setFuelCostUSD('');
    setFuelDate(new Date().toISOString().split('T')[0]);
    setFuelStation('E/S Bohío Internacional');
    setFuelNotes('Carga de combustible');
    setShowAddFuelModal(true);
  };

  // Submit quick fuel / expense
  const handleSaveFuelSubmit = async () => {
    const target = vehicles.find((v) => v.id === fuelTargetVehId);
    if (!target) return;

    const costNum = parseFloat(fuelCostUSD);
    if (isNaN(costNum) || costNum <= 0) {
      onNotify?.('Monto Requerido', 'Ingresa el monto invertido en USD.');
      return;
    }

    const litersNum = parseFloat(fuelLiters) || 0;
    const odoNum = parseInt(fuelOdo, 10) || target.currentOdometer;

    await onAddVehicleService({
      vehicleId: target.id,
      userId: target.assignedUserId,
      userEmail: target.assignedUserName,
      type: 'fuel',
      date: fuelDate || new Date().toISOString().split('T')[0],
      odometer: odoNum,
      costUSD: costNum,
      liters: litersNum > 0 ? litersNum : undefined,
      performedBy: fuelStation.trim() || 'Estación de Servicio',
      notes: `${litersNum > 0 ? `${litersNum} Litros · ` : ''}${fuelNotes.trim() || 'Carga de combustible'}`,
    });

    onNotify?.(
      'Gasto de Combustible Registrado',
      `Se registraron $${costNum.toFixed(2)} USD (${litersNum > 0 ? `${litersNum} L` : 'Combustible'}) para ${target.brand} ${target.model}.`
    );
    setShowAddFuelModal(false);
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
      userEmail: target.assignedUserName || currentUser?.fullName || 'Superadministrador',
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

  // Open add / edit document modal (Papeles)
  const handleOpenDocModal = (v?: Vehicle, existingDoc?: VehicleDocument) => {
    if (existingDoc) {
      setEditingDoc(existingDoc);
      setDocVehicleId(existingDoc.vehicleId);
      setDocCategory(existingDoc.docCategory);
      setDocTitle(existingDoc.title);
      setDocNumber(existingDoc.docNumber || '');
      setDocIssueDate(existingDoc.issueDate || new Date().toISOString().split('T')[0]);
      setDocIsPermanent(Boolean(existingDoc.isPermanent || existingDoc.expiryDate === 'PERMANENTE'));
      setDocExpiryDate(
        existingDoc.expiryDate && existingDoc.expiryDate !== 'PERMANENTE'
          ? existingDoc.expiryDate
          : '2027-06-01'
      );
      setDocImageUri(existingDoc.imageUrl || '');
      setDocNotes(existingDoc.notes || '');
    } else {
      const target = v || vehicles[0];
      if (!target) {
        onNotify?.('Sin Vehículos', 'Registra un vehículo primero para anexar sus papeles.');
        return;
      }
      setEditingDoc(null);
      setDocVehicleId(target.id);
      setDocCategory('vehicle');
      setDocTitle('Carnet de Circulación');
      setDocNumber('');
      setDocIssueDate(new Date().toISOString().split('T')[0]);
      setDocExpiryDate('2027-06-01');
      setDocIsPermanent(false);
      setDocImageUri('');
      setDocNotes('');
    }
    setShowDocModal(true);
  };

  // Save document
  const handleSaveDocSubmit = async () => {
    if (!docTitle.trim()) {
      onNotify?.('Título Requerido', 'Selecciona o escribe el nombre del documento.');
      return;
    }

    const targetVeh = vehicles.find((v) => v.id === docVehicleId);
    const docId = editingDoc?.id || `vdoc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const newDoc: VehicleDocument = {
      id: docId,
      vehicleId: docVehicleId,
      userId: targetVeh?.assignedUserId,
      driverName: targetVeh?.assignedUserName,
      docCategory,
      title: docTitle.trim(),
      docNumber: docNumber.trim() || 'S/N',
      issueDate: docIssueDate.trim(),
      expiryDate: docIsPermanent ? 'PERMANENTE' : docExpiryDate.trim() || '2027-01-01',
      isPermanent: docIsPermanent,
      imageUrl: docImageUri.trim() || undefined,
      notes: docNotes.trim() || undefined,
      createdAt: editingDoc?.createdAt || new Date().toISOString(),
    };

    if (editingDoc) {
      await onUpdateVehicleDocument(editingDoc.id, newDoc);
      onNotify?.('Papel Actualizado', `Se actualizaron los datos de ${newDoc.title}.`);
    } else {
      await onSaveVehicleDocument(newDoc);
      onNotify?.(
        'Papel Registrado',
        `Se agregó ${newDoc.title} al expediente de ${targetVeh?.brand || ''} ${targetVeh?.model || ''}.`
      );
    }

    setShowDocModal(false);
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
            Control integral de kilometraje, gastos invertidos, papeles legales, ficha del piloto asignado e informe ejecutivo de monitoreo.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={handleOpenAddVehicle}
            style={[styles.primaryActionBtn, { backgroundColor: accentPrimary }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={18} color={isDark ? '#001136' : '#FFFFFF'} />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: isDark ? '#001136' : '#FFFFFF' }}>
              Registrar Vehículo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenAddOdometer()}
            style={[styles.secondaryActionBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="speed" size={16} color="#3B82F6" />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary }}>
              Actualizar Km
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenAddFuel()}
            style={[styles.secondaryActionBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="local-gas-station" size={16} color="#0EA5E9" />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary }}>
              Cargar Gasolina / Gasto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenAddService()}
            style={[styles.secondaryActionBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="build" size={16} color="#10B981" />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary }}>
              Mantenimiento
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenDocModal()}
            style={[styles.secondaryActionBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="folder-shared" size={16} color="#F59E0B" />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary }}>
              Anexar Papel / Doc
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI STRIP (5 CARDS) */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: accentPrimary, width: isMobile ? '100%' : isTablet ? '48%' : '18.5%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>UNIDADES EN FLOTA</Text>
            <MaterialIcons name="directions-car" size={19} color={accentPrimary} />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>{stats.totalVehicles}</Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            {stats.totalMotos} Motos · {stats.totalCars} Carros
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#3B82F6', width: isMobile ? '100%' : isTablet ? '48%' : '18.5%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>KILOMETRAJE FLOTA</Text>
            <MaterialIcons name="speed" size={19} color="#3B82F6" />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>
            {stats.totalKmFleet.toLocaleString()} km
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            Prom. {stats.avgKmPerVehicle.toLocaleString()} km / unidad
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setActiveSubTab('expenses')}
          activeOpacity={0.8}
          style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#10B981', width: isMobile ? '100%' : isTablet ? '48%' : '18.5%' }]}
        >
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>GASTOS INVERTIDOS</Text>
            <MaterialIcons name="attach-money" size={19} color="#10B981" />
          </View>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>
            ${stats.totalCostUSD.toFixed(2)}
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            Mant: ${stats.totalMaintUSD.toFixed(0)} · Comb: ${stats.totalFuelUSD.toFixed(0)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSubTab('documents')}
          activeOpacity={0.8}
          style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: stats.expiredDocsCount > 0 ? '#EF4444' : '#F59E0B', width: isMobile ? '100%' : isTablet ? '48%' : '18.5%' }]}
        >
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>PAPELES Y DOCS</Text>
            <MaterialIcons name="folder-shared" size={19} color={stats.expiredDocsCount > 0 ? '#EF4444' : '#F59E0B'} />
          </View>
          <Text style={[styles.kpiValue, { color: textPrimary }]}>
            {stats.totalDocs} papeles
          </Text>
          <Text style={[styles.kpiSub, { color: stats.expiredDocsCount > 0 ? '#EF4444' : textSecondary }]}>
            {stats.expiredDocsCount > 0
              ? `${stats.expiredDocsCount} vencidos · ${stats.expiringDocsCount} por vencer`
              : stats.expiringDocsCount > 0
              ? `${stats.expiringDocsCount} próximos a vencer`
              : 'Todos los papeles al día'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: stats.alertUnitsCount > 0 ? '#EF4444' : '#10B981', width: isMobile ? '100%' : isTablet ? '48%' : '18.5%' }]}>
          <View style={styles.kpiCardTop}>
            <Text style={[styles.kpiTitle, { color: textSecondary }]}>ALERTAS DESGASTE</Text>
            <MaterialIcons name="warning" size={19} color={stats.alertUnitsCount > 0 ? '#EF4444' : '#10B981'} />
          </View>
          <Text style={[styles.kpiValue, { color: stats.alertUnitsCount > 0 ? '#EF4444' : textPrimary }]}>
            {stats.alertUnitsCount} unidades
          </Text>
          <Text style={[styles.kpiSub, { color: textSecondary }]}>
            {stats.alertUnitsCount > 0 ? 'Con servicio próximo o vencido' : 'Flota en rango óptimo'}
          </Text>
        </View>
      </View>

      {/* FILTER & SUB-TAB NAVIGATION BAR */}
      <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor: borderCol, padding: 16, gap: 14 }]}>
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14, alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between' }}>
          {/* Sub-view switcher */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', backgroundColor: subSurfaceBg, borderRadius: 10, padding: 4, gap: 4 }}>
              <TouchableOpacity
                onPress={() => setActiveSubTab('fleet')}
                style={[styles.tabBtn, activeSubTab === 'fleet' && { backgroundColor: accentPrimary }]}
              >
                <Text style={{ fontFamily: activeSubTab === 'fleet' ? F.bold : F.medium, fontSize: 12, color: activeSubTab === 'fleet' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                  🚗 Flota ({vehicles.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveSubTab('documents')}
                style={[styles.tabBtn, activeSubTab === 'documents' && { backgroundColor: accentPrimary }]}
              >
                <Text style={{ fontFamily: activeSubTab === 'documents' ? F.bold : F.medium, fontSize: 12, color: activeSubTab === 'documents' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                  🪪 Papeles y Docs ({vehicleDocuments.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveSubTab('expenses')}
                style={[styles.tabBtn, activeSubTab === 'expenses' && { backgroundColor: accentPrimary }]}
              >
                <Text style={{ fontFamily: activeSubTab === 'expenses' ? F.bold : F.medium, fontSize: 12, color: activeSubTab === 'expenses' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                  💰 Gastos Invertidos (${stats.totalCostUSD.toFixed(0)})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveSubTab('services')}
                style={[styles.tabBtn, activeSubTab === 'services' && { backgroundColor: accentPrimary }]}
              >
                <Text style={{ fontFamily: activeSubTab === 'services' ? F.bold : F.medium, fontSize: 12, color: activeSubTab === 'services' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                  🔧 Servicios ({vehicleServices.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveSubTab('odometers')}
                style={[styles.tabBtn, activeSubTab === 'odometers' && { backgroundColor: accentPrimary }]}
              >
                <Text style={{ fontFamily: activeSubTab === 'odometers' ? F.bold : F.medium, fontSize: 12, color: activeSubTab === 'odometers' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                  ⏱️ Kilometrajes ({vehicleOdometerLogs.length})
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Search input */}
          <View style={[styles.searchBox, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
            <MaterialIcons name="search" size={18} color={textSecondary} />
            <TextInput
              style={{ flex: 1, fontFamily: F.medium, fontSize: 13, color: textPrimary }}
              placeholder="Buscar marca, placa, piloto, cédula o papel..."
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
        {activeSubTab === 'fleet' && (
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
        )}
      </View>

      {/* ================================================================= */}
      {/* VIEW 1: FLEET VEHICLES CARDS (CON PILOTO, GASTOS, PAPELES E INFORME) */}
      {/* ================================================================= */}
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
                const pilot = getVehiclePilotDetails(veh);

                // Vehicle specific expenses
                const vehServices = vehicleServices.filter((s) => s.vehicleId === veh.id);
                const vehTotalUSD = vehServices.reduce((sum, s) => sum + (Number(s.costUSD) || 0), 0);
                const vehFuelUSD = vehServices.filter((s) => s.type === 'fuel').reduce((sum, s) => sum + (Number(s.costUSD) || 0), 0);
                const vehMaintUSD = vehTotalUSD - vehFuelUSD;

                // Vehicle specific documents
                const vehDocs = vehicleDocuments.filter((d) => d.vehicleId === veh.id);
                const hasExpiredDoc = vehDocs.some((d) => computeDocumentStatus(d).status === 'expired');
                const hasExpiringDoc = vehDocs.some((d) => computeDocumentStatus(d).status === 'expiring');

                // Find critical components for quick alert tag
                const comps = getVehicleComponents(isCar).filter((c) => c !== 'fuel' && c !== 'other');
                let criticalCompName: string | null = null;
                for (const c of comps) {
                  const lastServ = vehicleServices.find((s) => s.vehicleId === veh.id && s.type === c);
                  const lastOdo = lastServ ? lastServ.odometer : 0;
                  const wear = calculateVehicleWearPercentage(veh.currentOdometer, lastOdo, c, isCar);
                  if (wear <= 20) {
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

                    {/* Ficha del Piloto / Conductor Asignado Strip */}
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
                      accessibilityLabel="Ver o editar ficha del piloto asignado"
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <MaterialIcons
                          name={veh.assignedUserId ? 'badge' : 'person-add'}
                          size={18}
                          color={veh.assignedUserId ? colors.primary : '#F59E0B'}
                        />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={{
                                fontFamily: F.bold,
                                fontSize: 11.5,
                                color: veh.assignedUserId ? textPrimary : '#F59E0B',
                              }}
                              numberOfLines={1}
                            >
                              {pilot.name}
                            </Text>
                            {veh.assignedUserId && (
                              <View style={{ backgroundColor: 'rgba(220,38,38,0.14)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ fontFamily: F.extrabold, fontSize: 9, color: '#EF4444' }}>
                                  {pilot.bloodType}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontFamily: F.regular, fontSize: 10, color: textSecondary }} numberOfLines={1}>
                            {veh.assignedUserId
                              ? `C.I: ${pilot.dni} · Tel: ${pilot.phone} · ${pilot.licenseGrade}`
                              : 'Clic para asignar piloto y ficha técnica de conductor'}
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons name="edit" size={14} color={textSecondary} />
                    </TouchableOpacity>

                    {/* Odometer & Quick Fuel Readout */}
                    <View style={[styles.odometerStrip, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
                      <View>
                        <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: textSecondary, letterSpacing: 0.5 }}>
                          KILOMETRAJE ACTUAL
                        </Text>
                        <Text style={[styles.tabularText, { fontFamily: F.extrabold, fontSize: 17, color: textPrimary }]}>
                          {veh.currentOdometer.toLocaleString()} <Text style={{ fontSize: 11 }}>km</Text>
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => handleOpenAddOdometer(veh)}
                          style={[styles.smallActionBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="speed" size={13} color="#3B82F6" />
                          <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: textPrimary }}>+Km</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleOpenAddFuel(veh)}
                          style={[styles.smallActionBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="local-gas-station" size={13} color="#0EA5E9" />
                          <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: textPrimary }}>Gasolina</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Gastos Invertidos & Papeles Mini-Strip */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setActiveSubTab('expenses')}
                        style={[styles.miniStatBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, flex: 1 }]}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 9, color: textSecondary }}>GASTO INVERTIDO</Text>
                        <Text style={[styles.tabularText, { fontFamily: F.extrabold, fontSize: 13, color: '#10B981', marginTop: 1 }]}>
                          ${vehTotalUSD.toFixed(2)} USD
                        </Text>
                        <Text style={{ fontFamily: F.regular, fontSize: 9.5, color: textSecondary }}>
                          M: ${vehMaintUSD.toFixed(0)} · C: ${vehFuelUSD.toFixed(0)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setFilterDocVehicleId(veh.id);
                          setActiveSubTab('documents');
                        }}
                        style={[
                          styles.miniStatBox,
                          {
                            backgroundColor: subSurfaceBg,
                            borderColor: hasExpiredDoc ? '#EF4444' : hasExpiringDoc ? '#F59E0B' : borderCol,
                            flex: 1,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontFamily: F.bold, fontSize: 9, color: textSecondary }}>PAPELES / DOCS</Text>
                          <MaterialIcons
                            name="folder-shared"
                            size={12}
                            color={hasExpiredDoc ? '#EF4444' : hasExpiringDoc ? '#F59E0B' : '#3B82F6'}
                          />
                        </View>
                        <Text
                          style={{
                            fontFamily: F.extrabold,
                            fontSize: 12.5,
                            color: hasExpiredDoc ? '#EF4444' : hasExpiringDoc ? '#F59E0B' : textPrimary,
                            marginTop: 1,
                          }}
                        >
                          {vehDocs.length} registrados
                        </Text>
                        <Text style={{ fontFamily: F.regular, fontSize: 9.5, color: hasExpiredDoc ? '#EF4444' : textSecondary }}>
                          {hasExpiredDoc ? '¡Papel vencido!' : hasExpiringDoc ? 'Próximo a vencer' : 'Vigentes · Ver/Subir'}
                        </Text>
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

                    {/* Primary Executive Report Button + Secondary Actions */}
                    <View style={{ borderTopWidth: 1, borderTopColor: borderCol, paddingTop: 10, marginTop: 2, gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => setReportVehicle(veh)}
                          style={[styles.reportUnitBtn, { backgroundColor: '#00ae78', flex: 1.2 }]}
                          activeOpacity={0.85}
                        >
                          <MaterialIcons name="assessment" size={15} color="#FFFFFF" />
                          <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: '#FFFFFF' }}>
                            Generar Informe
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setInspectingVehicle(veh)}
                          style={[styles.reportUnitBtn, { backgroundColor: subSurfaceBg, borderWidth: 1, borderColor: borderCol, flex: 1 }]}
                          activeOpacity={0.85}
                        >
                          <MaterialIcons name="analytics" size={15} color={accentPrimary} />
                          <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: textPrimary }}>
                            Inspección
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => handleOpenDocModal(veh)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <MaterialIcons name="note-add" size={14} color="#F59E0B" />
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#F59E0B' }}>
                            + Subir Papel
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
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ================================================================= */}
      {/* VIEW 2: PAPELES Y DOCUMENTOS (BILLETERA LEGAL VEHICULAR Y PILOTO) */}
      {/* ================================================================= */}
      {activeSubTab === 'documents' && (
        <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor: borderCol, padding: 18, gap: 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <View>
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                Billetera Legal: Papeles de Vehículos y Documentación de Pilotos
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary }}>
                Control de Carnet de Circulación, Título de Propiedad, Seguro RCV, Licencia de Conducir y Certificado Médico Vial.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleOpenDocModal()}
              style={[styles.primaryActionBtn, { backgroundColor: '#F59E0B' }]}
            >
              <MaterialIcons name="add" size={16} color="#FFFFFF" />
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' }}>
                Registrar Nuevo Papel / Documento
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filters for Documents */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: textSecondary }}>ESTADO:</Text>
            {[
              { id: 'all', label: `Todos (${vehicleDocuments.length})` },
              { id: 'valid', label: 'Vigentes / Permanentes' },
              { id: 'expiring', label: `Por Vencer (${stats.expiringDocsCount})` },
              { id: 'expired', label: `Vencidos (${stats.expiredDocsCount})` },
            ].map((item) => {
              const sel = filterDocStatus === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setFilterDocStatus(item.id as any)}
                  style={[styles.filterChip, { backgroundColor: sel ? accentPrimary : subSurfaceBg, borderColor: borderCol }]}
                >
                  <Text style={{ fontFamily: sel ? F.bold : F.medium, fontSize: 11.5, color: sel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={{ width: 1, height: 18, backgroundColor: borderCol, marginHorizontal: 6 }} />

            <Text style={{ fontFamily: F.bold, fontSize: 11, color: textSecondary }}>VEHÍCULO:</Text>
            <TouchableOpacity
              onPress={() => setFilterDocVehicleId('all')}
              style={[styles.filterChip, { backgroundColor: filterDocVehicleId === 'all' ? '#3B82F6' : subSurfaceBg, borderColor: borderCol }]}
            >
              <Text style={{ fontFamily: filterDocVehicleId === 'all' ? F.bold : F.medium, fontSize: 11.5, color: filterDocVehicleId === 'all' ? '#FFFFFF' : textPrimary }}>
                Todos
              </Text>
            </TouchableOpacity>
            {vehicles.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => setFilterDocVehicleId(v.id)}
                style={[styles.filterChip, { backgroundColor: filterDocVehicleId === v.id ? '#3B82F6' : subSurfaceBg, borderColor: borderCol }]}
              >
                <Text style={{ fontFamily: filterDocVehicleId === v.id ? F.bold : F.medium, fontSize: 11.5, color: filterDocVehicleId === v.id ? '#FFFFFF' : textPrimary }}>
                  {v.brand} {v.model} ({v.plate || 'S/P'})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredDocuments.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
              <MaterialIcons name="folder-shared" size={38} color={textSecondary} />
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: textPrimary, marginTop: 8 }}>
                No se encontraron documentos con este filtro
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: textSecondary, marginTop: 2 }}>
                Haz clic en "Registrar Nuevo Papel / Documento" para cargar carnets, pólizas RCV o licencias.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {filteredDocuments.map((doc) => {
                const targetVeh = vehicles.find((v) => v.id === doc.vehicleId);
                const st = computeDocumentStatus(doc);
                const preset = DOC_PRESET_TITLES.find((p) =>
                  doc.title.toLowerCase().includes(p.label.toLowerCase().split(' ')[0])
                );
                const accentColor = preset?.color || '#3B82F6';

                return (
                  <View
                    key={doc.id}
                    style={[
                      styles.docWalletCard,
                      {
                        backgroundColor: subSurfaceBg,
                        borderColor: st.status === 'expired' ? '#EF4444' : borderCol,
                        borderTopColor: accentColor,
                        width: isMobile ? '100%' : isTablet ? '48%' : '31.8%',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.docIconCircle, { backgroundColor: `${accentColor}20` }]}>
                          <MaterialIcons name={(preset?.icon as any) || 'description'} size={18} color={accentColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.extrabold, fontSize: 13.5, color: textPrimary }} numberOfLines={1}>
                            {doc.title}
                          </Text>
                          <Text style={{ fontFamily: F.semibold, fontSize: 10.5, color: accentColor }}>
                            {doc.docCategory === 'driver' ? '👤 PAPEL DEL PILOTO' : '🚗 PAPEL DEL VEHÍCULO'}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.inlineBadge, { backgroundColor: st.bgColor }]}>
                        <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: st.color }}>{st.label}</Text>
                      </View>
                    </View>

                    {/* Document Metadata */}
                    <View style={{ gap: 4, marginTop: 6, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: borderCol }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>N° / Serial:</Text>
                        <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: textPrimary }}>{doc.docNumber || 'S/N'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>Unidad:</Text>
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: textPrimary }}>
                          {targetVeh ? `${targetVeh.brand} ${targetVeh.model} (${targetVeh.plate || 'S/P'})` : 'General'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>Piloto Titular:</Text>
                        <Text style={{ fontFamily: F.semibold, fontSize: 11, color: textPrimary }}>
                          {doc.driverName || targetVeh?.assignedUserName || 'Corporativo EDV'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>Vencimiento:</Text>
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: st.color }}>
                          {doc.isPermanent ? 'PERMANENTE' : doc.expiryDate}
                        </Text>
                      </View>
                    </View>

                    {/* Attached Scan / Image Preview if present */}
                    {doc.imageUrl ? (
                      <TouchableOpacity
                        onPress={() => setPreviewDocImage(doc)}
                        style={[styles.docImagePreviewStrip, { backgroundColor: cardBg, borderColor: borderCol }]}
                        activeOpacity={0.85}
                      >
                        <Image
                          source={{ uri: doc.imageUrl }}
                          style={{ width: 42, height: 32, borderRadius: 4 }}
                          resizeMode="cover"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: accentPrimary }}>
                            Ver Digitalización / Foto
                          </Text>
                          <Text style={{ fontFamily: F.regular, fontSize: 9.5, color: textSecondary }}>
                            Clic para ampliar soporte
                          </Text>
                        </View>
                        <MaterialIcons name="zoom-in" size={18} color={accentPrimary} />
                      </TouchableOpacity>
                    ) : null}

                    {/* Card Footer Actions */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleOpenDocModal(targetVeh, doc)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <MaterialIcons name="edit" size={14} color={accentPrimary} />
                        <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: accentPrimary }}>
                          Editar / Renovar
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={async () => {
                          if (Platform.OS === 'web' && typeof window !== 'undefined') {
                            if (!window.confirm(`¿Eliminar el documento "${doc.title}"?`)) return;
                          }
                          await onDeleteVehicleDocument(doc.id);
                          onNotify?.('Documento Eliminado', `Se eliminó ${doc.title} del registro.`);
                        }}
                      >
                        <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ================================================================= */}
      {/* VIEW 3: GASTOS INVERTIDOS Y ANÁLISIS FINANCIERO                   */}
      {/* ================================================================= */}
      {activeSubTab === 'expenses' && (
        <View style={{ gap: 16 }}>
          {/* Financial Summary Cards */}
          <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <View>
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                  Control de Gastos Invertidos y Rendimiento Financiero de Flota
                </Text>
                <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary }}>
                  Desglose auditado de inversión en mantenimientos, repuestos y cargas de combustible por unidad.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handleOpenAddFuel()}
                  style={[styles.primaryActionBtn, { backgroundColor: '#0EA5E9' }]}
                >
                  <MaterialIcons name="local-gas-station" size={16} color="#FFFFFF" />
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' }}>+ Cargar Gasolina</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleOpenAddService()}
                  style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
                >
                  <MaterialIcons name="build" size={16} color="#FFFFFF" />
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' }}>+ Cargar Servicio</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Monthly Bar Chart */}
            {stats.monthlyData.length > 0 && (
              <View style={{ backgroundColor: subSurfaceBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: borderCol }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary }}>
                    EVOLUCIÓN MENSUAL DE GASTOS DE FLOTA ($ USD)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#0EA5E9' }} />
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: textSecondary }}>Combustible</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#10B981' }} />
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: textSecondary }}>Mantenimiento</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 110, paddingTop: 10 }}>
                  {(() => {
                    const maxVal = Math.max(...stats.monthlyData.map((d) => d[1].total), 50);
                    return stats.monthlyData.map(([month, d]) => {
                      const fuelH = Math.max(4, Math.round((d.fuel / maxVal) * 75));
                      const maintH = Math.max(4, Math.round((d.maint / maxVal) * 75));
                      return (
                        <View key={month} style={{ alignItems: 'center', gap: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 }}>
                            <View style={{ width: 18, height: fuelH, backgroundColor: '#0EA5E9', borderRadius: 4 }} />
                            <View style={{ width: 18, height: maintH, backgroundColor: '#10B981', borderRadius: 4 }} />
                          </View>
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: textPrimary }}>{month}</Text>
                          <Text style={{ fontFamily: F.semibold, fontSize: 10, color: textSecondary }}>${d.total.toFixed(0)}</Text>
                        </View>
                      );
                    });
                  })()}
                </View>
              </View>
            )}

            {/* Per-Vehicle Investment Breakdown Table */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: 880, borderWidth: 1, borderColor: borderCol, borderRadius: 12, overflow: 'hidden' }}>
                <View style={[styles.tableHeaderRow, { backgroundColor: subSurfaceBg, borderBottomColor: borderCol }]}>
                  <Text style={[styles.thCell, { flex: 1.6, color: textSecondary }]}>VEHÍCULO / PLACA</Text>
                  <Text style={[styles.thCell, { flex: 1.4, color: textSecondary }]}>PILOTO ASIGNADO</Text>
                  <Text style={[styles.thCell, { flex: 1.1, color: textSecondary, textAlign: 'right' }]}>ODÓMETRO</Text>
                  <Text style={[styles.thCell, { flex: 1.1, color: textSecondary, textAlign: 'right' }]}>MANTENIMIENTO</Text>
                  <Text style={[styles.thCell, { flex: 1.1, color: textSecondary, textAlign: 'right' }]}>COMBUSTIBLE</Text>
                  <Text style={[styles.thCell, { flex: 1.2, color: textSecondary, textAlign: 'right' }]}>TOTAL INVERTIDO</Text>
                  <Text style={[styles.thCell, { flex: 0.9, color: textSecondary, textAlign: 'right' }]}>COSTO $/KM</Text>
                  <Text style={[styles.thCell, { flex: 1.1, color: textSecondary, textAlign: 'center' }]}>EXPEDIENTE</Text>
                </View>

                {vehicles.map((v, idx) => {
                  const uServ = vehicleServices.filter((s) => s.vehicleId === v.id);
                  const fuelUSD = uServ.filter((s) => s.type === 'fuel').reduce((sum, s) => sum + (Number(s.costUSD) || 0), 0);
                  const maintUSD = uServ.filter((s) => s.type !== 'fuel').reduce((sum, s) => sum + (Number(s.costUSD) || 0), 0);
                  const totUSD = fuelUSD + maintUSD;
                  const perKm = v.currentOdometer > 0 ? totUSD / v.currentOdometer : 0;
                  const pilot = getVehiclePilotDetails(v);

                  return (
                    <View
                      key={v.id}
                      style={[
                        styles.tableDataRow,
                        {
                          borderBottomColor: borderCol,
                          borderBottomWidth: idx === vehicles.length - 1 ? 0 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1.6 }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textPrimary }}>
                          {v.brand} {v.model}
                        </Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                          {v.plate || 'Sin placa'} · {v.vehicleType === 'car' ? 'Carro' : 'Moto'}
                        </Text>
                      </View>

                      <View style={{ flex: 1.4 }}>
                        <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textPrimary }} numberOfLines={1}>
                          {pilot.name}
                        </Text>
                        <Text style={{ fontFamily: F.regular, fontSize: 10.5, color: textSecondary }}>
                          {pilot.dni}
                        </Text>
                      </View>

                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1.1, textAlign: 'right', fontFamily: F.bold, color: textPrimary }]}>
                        {v.currentOdometer.toLocaleString()} km
                      </Text>

                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1.1, textAlign: 'right', fontFamily: F.semibold, color: textPrimary }]}>
                        ${maintUSD.toFixed(2)}
                      </Text>

                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1.1, textAlign: 'right', fontFamily: F.semibold, color: '#0EA5E9' }]}>
                        ${fuelUSD.toFixed(2)}
                      </Text>

                      <Text style={[styles.tdCell, styles.tabularText, { flex: 1.2, textAlign: 'right', fontFamily: F.extrabold, color: '#10B981' }]}>
                        ${totUSD.toFixed(2)} USD
                      </Text>

                      <Text style={[styles.tdCell, styles.tabularText, { flex: 0.9, textAlign: 'right', color: textSecondary }]}>
                        ${perKm.toFixed(3)}/km
                      </Text>

                      <View style={{ flex: 1.1, alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => setReportVehicle(v)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: '#00ae78',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 6,
                          }}
                        >
                          <MaterialIcons name="picture-as-pdf" size={13} color="#FFFFFF" />
                          <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: '#FFFFFF' }}>Informe</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* ================================================================= */}
      {/* VIEW 4: SERVICES & FUEL LOG (BITÁCORA)                            */}
      {/* ================================================================= */}
      {activeSubTab === 'services' && (
        <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor: borderCol, padding: 18, gap: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <View>
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                Bitácora de Servicios, Repuestos y Cargas de Combustible
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary }}>
                Historial completo con componente, fecha, kilometraje, monto invertido en USD y taller responsable.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleOpenAddFuel()}
                style={[styles.primaryActionBtn, { backgroundColor: '#0EA5E9' }]}
              >
                <MaterialIcons name="local-gas-station" size={16} color="#FFFFFF" />
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' }}>Cargar Gasolina</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleOpenAddService()}
                style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
              >
                <MaterialIcons name="add" size={16} color="#FFFFFF" />
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' }}>Nuevo Servicio</Text>
              </TouchableOpacity>
            </View>
          </View>

          {vehicleServices.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: subSurfaceBg, borderColor: borderCol }]}>
              <MaterialIcons name="build" size={36} color={textSecondary} />
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: textPrimary, marginTop: 8 }}>
                No hay servicios registrados todavía
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: 860, borderWidth: 1, borderColor: borderCol, borderRadius: 12, overflow: 'hidden' }}>
                <View style={[styles.tableHeaderRow, { backgroundColor: subSurfaceBg, borderBottomColor: borderCol }]}>
                  <Text style={[styles.thCell, { flex: 1.4, color: textSecondary }]}>VEHÍCULO</Text>
                  <Text style={[styles.thCell, { flex: 1.6, color: textSecondary }]}>CONCEPTO / COMPONENTE</Text>
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

                      <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons
                          name={(VEHICLE_COMPONENT_ICONS[s.type] as any) || 'build'}
                          size={16}
                          color={s.type === 'fuel' ? '#0EA5E9' : '#10B981'}
                        />
                        <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textPrimary }}>
                          {VEHICLE_COMPONENT_NAMES[s.type] || s.type}
                          {s.type === 'fuel' && s.liters ? ` (${s.liters} L)` : ''}
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
                              if (!window.confirm('¿Deseas eliminar este registro?')) return;
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

      {/* ================================================================= */}
      {/* VIEW 5: ODOMETER LOGS                                             */}
      {/* ================================================================= */}
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
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: 780, borderWidth: 1, borderColor: borderCol, borderRadius: 12, overflow: 'hidden' }}>
                <View style={[styles.tableHeaderRow, { backgroundColor: subSurfaceBg, borderBottomColor: borderCol }]}>
                  <Text style={[styles.thCell, { flex: 1.5, color: textSecondary }]}>VEHÍCULO</Text>
                  <Text style={[styles.thCell, { flex: 1.1, color: textSecondary }]}>FECHA LECTURA</Text>
                  <Text style={[styles.thCell, { flex: 1.2, color: textSecondary, textAlign: 'right' }]}>ODÓMETRO TOTAL</Text>
                  <Text style={[styles.thCell, { flex: 1, color: textSecondary, textAlign: 'right' }]}>RECORRIDO (+KM)</Text>
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
                        {o.userEmail ? `${o.userEmail} · ` : ''}{o.notes || 'Lectura de odómetro'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: REGISTRAR / EDITAR VEHÍCULO                              */}
      {/* ================================================================= */}
      <Modal visible={showAddVehicleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol, maxWidth: 580 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name={editingVehicle ? 'edit' : 'add-circle-outline'} size={22} color={accentPrimary} />
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                  {editingVehicle ? 'Editar Vehículo y Piloto' : 'Registrar Nuevo Vehículo en Flota'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddVehicleModal(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 540 }} showsVerticalScrollIndicator={false}>
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
                        { backgroundColor: formCatalogOrCustom === 'catalog' ? accentPrimary : subSurfaceBg, borderColor: borderCol },
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
                        { backgroundColor: formCatalogOrCustom === 'custom' ? accentPrimary : subSurfaceBg, borderColor: borderCol },
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
                    <Text style={[styles.formLabel, { color: textSecondary }]}>ODÓMETRO ACTUAL (KM)</Text>
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

                {/* Estado Operativo */}
                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>ESTADO OPERATIVO</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {(['operativo', 'mantenimiento', 'parado'] as VehicleStatus[]).map((st) => {
                      const sel = formStatus === st;
                      const col = st === 'operativo' ? '#10B981' : st === 'mantenimiento' ? '#F59E0B' : '#EF4444';
                      return (
                        <TouchableOpacity
                          key={st}
                          onPress={() => setFormStatus(st)}
                          style={[styles.chipBtn, { backgroundColor: sel ? col : subSurfaceBg, borderColor: borderCol }]}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: sel ? '#FFFFFF' : textPrimary, textTransform: 'capitalize' }}>
                            {st}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Company & Pilot Assignment */}
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
                            style={[styles.chipBtn, { backgroundColor: sel ? '#059669' : subSurfaceBg, borderColor: borderCol }]}
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
                    <Text style={[styles.formLabel, { color: textSecondary }]}>PILOTO / OPERADOR ASIGNADO</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => setFormUserId('')}
                          style={[styles.chipBtn, { backgroundColor: !formUserId ? '#EF4444' : subSurfaceBg, borderColor: borderCol }]}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: !formUserId ? '#FFFFFF' : textPrimary }}>
                            Ninguno
                          </Text>
                        </TouchableOpacity>

                        {appUsers.map((u) => {
                          const sel = formUserId === u.id;
                          return (
                            <TouchableOpacity
                              key={u.id}
                              onPress={() => {
                                setFormUserId(u.id);
                                syncPilotFieldsFromUser(u.id, formVehicleType);
                              }}
                              style={[styles.chipBtn, { backgroundColor: sel ? accentPrimary : subSurfaceBg, borderColor: borderCol }]}
                            >
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

                {/* Datos del Piloto si hay usuario seleccionado */}
                {Boolean(formUserId) && (
                  <View style={{ backgroundColor: subSurfaceBg, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: borderCol, gap: 10 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: accentPrimary }}>
                      🪪 DATOS DEL PILOTO ASIGNADO (PARA EL INFORME Y AUDITORÍA)
                    </Text>
                    <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: textSecondary }]}>CÉDULA / DNI DEL PILOTO</Text>
                        <TextInput
                          style={[styles.inputBox, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                          placeholder="Ej: V-19.482.310"
                          placeholderTextColor={textSecondary}
                          value={pilotDni}
                          onChangeText={setPilotDni}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: textSecondary }]}>TELÉFONO MÓVIL</Text>
                        <TextInput
                          style={[styles.inputBox, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                          placeholder="Ej: +58 412-4458912"
                          placeholderTextColor={textSecondary}
                          value={pilotPhone}
                          onChangeText={setPilotPhone}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: textSecondary }]}>CONTACTO EMERGENCIA SOS</Text>
                        <TextInput
                          style={[styles.inputBox, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                          placeholder="Nombre familiar / supervisor"
                          placeholderTextColor={textSecondary}
                          value={pilotEmergencyContact}
                          onChangeText={setPilotEmergencyContact}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: textSecondary }]}>TELÉFONO SOS</Text>
                        <TextInput
                          style={[styles.inputBox, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                          placeholder="+58 414-0000000"
                          placeholderTextColor={textSecondary}
                          value={pilotEmergencyPhone}
                          onChangeText={setPilotEmergencyPhone}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Fotografía / Imagen de la Unidad */}
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

      {/* ================================================================= */}
      {/* MODAL 2: CARGAR GASOLINA / GASTO DE COMBUSTIBLE                   */}
      {/* ================================================================= */}
      <Modal visible={showAddFuelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol, maxWidth: 460 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="local-gas-station" size={22} color="#0EA5E9" />
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                  Cargar Gasolina / Gasto de Combustible
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddFuelModal(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.formLabel, { color: textSecondary }]}>VEHÍCULO</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {vehicles.map((v) => {
                    const sel = fuelTargetVehId === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => {
                          setFuelTargetVehId(v.id);
                          setFuelOdo(String(v.currentOdometer));
                        }}
                        style={[styles.chipBtn, { backgroundColor: sel ? '#0EA5E9' : subSurfaceBg, borderColor: borderCol }]}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: sel ? '#FFFFFF' : textPrimary }}>
                          {v.brand} {v.model} ({v.plate || 'S/P'})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>MONTO INVERTIDO (USD)</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary, fontFamily: F.bold }]}
                    placeholder="Ej: 25.00"
                    placeholderTextColor={textSecondary}
                    value={fuelCostUSD}
                    onChangeText={setFuelCostUSD}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>LITROS SURTIDOS</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                    placeholder="Ej: 50"
                    placeholderTextColor={textSecondary}
                    value={fuelLiters}
                    onChangeText={setFuelLiters}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>ODÓMETRO (KM)</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                    value={fuelOdo}
                    onChangeText={setFuelOdo}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>FECHA (AAAA-MM-DD)</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                    value={fuelDate}
                    onChangeText={setFuelDate}
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.formLabel, { color: textSecondary }]}>ESTACIÓN DE SERVICIO / PROVEEDOR</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                  value={fuelStation}
                  onChangeText={setFuelStation}
                />
              </View>

              <View>
                <Text style={[styles.formLabel, { color: textSecondary }]}>OBSERVACIONES</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                  value={fuelNotes}
                  onChangeText={setFuelNotes}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowAddFuelModal(false)}
                style={[styles.cancelBtn, { borderColor: borderCol }]}
              >
                <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveFuelSubmit}
                style={[styles.primaryActionBtn, { backgroundColor: '#0EA5E9' }]}
              >
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#FFFFFF' }}>Registrar Gasto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 3: CARGAR MANTENIMIENTO / SERVICIO                          */}
      {/* ================================================================= */}
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
                          style={[styles.chipBtn, { backgroundColor: sel ? '#10B981' : subSurfaceBg, borderColor: borderCol }]}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: sel ? '#FFFFFF' : textPrimary }}>
                            {v.brand} {v.model} ({v.plate || 'Sin placa'})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

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
                            style={[styles.chipBtn, { backgroundColor: sel ? accentPrimary : subSurfaceBg, borderColor: borderCol }]}
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
                    <Text style={[styles.formLabel, { color: textSecondary }]}>COSTO INVERTIDO (USD)</Text>
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

      {/* ================================================================= */}
      {/* MODAL 4: ACTUALIZAR ODÓMETRO                                      */}
      {/* ================================================================= */}
      <Modal visible={showAddOdometerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol, maxWidth: 440 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="speed" size={22} color="#3B82F6" />
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                  Actualizar Kilometraje (Odómetro)
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
                        style={[styles.chipBtn, { backgroundColor: sel ? '#3B82F6' : subSurfaceBg, borderColor: borderCol }]}
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

      {/* ================================================================= */}
      {/* MODAL 5: REGISTRAR / EDITAR PAPEL O DOCUMENTO LEGAL               */}
      {/* ================================================================= */}
      <Modal visible={showDocModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol, maxWidth: 520 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="folder-shared" size={22} color="#F59E0B" />
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                  {editingDoc ? 'Editar / Renovar Documento' : 'Registrar Papel / Documento Legal'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDocModal(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>VEHÍCULO ASOCIADO</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {vehicles.map((v) => {
                      const sel = docVehicleId === v.id;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          onPress={() => setDocVehicleId(v.id)}
                          style={[styles.chipBtn, { backgroundColor: sel ? accentPrimary : subSurfaceBg, borderColor: borderCol }]}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: sel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                            {v.brand} {v.model} ({v.plate || 'S/P'})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>TIPO DE PAPEL / DOCUMENTO</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {DOC_PRESET_TITLES.map((preset) => {
                      const sel = docTitle === preset.label;
                      return (
                        <TouchableOpacity
                          key={preset.label}
                          onPress={() => {
                            setDocTitle(preset.label);
                            setDocCategory(preset.category);
                            setDocIsPermanent(Boolean(preset.permanent));
                          }}
                          style={[styles.chipBtn, { backgroundColor: sel ? preset.color : subSurfaceBg, borderColor: borderCol }]}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: sel ? '#FFFFFF' : textPrimary }}>
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>NOMBRE DEL DOCUMENTO</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                      value={docTitle}
                      onChangeText={setDocTitle}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: textSecondary }]}>N° DE DOCUMENTO / PÓLIZA</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                      placeholder="Ej: RCV-2026-8891"
                      placeholderTextColor={textSecondary}
                      value={docNumber}
                      onChangeText={setDocNumber}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setDocIsPermanent(!docIsPermanent)}
                    style={[
                      styles.chipBtn,
                      { backgroundColor: docIsPermanent ? '#2563EB' : subSurfaceBg, borderColor: borderCol, marginTop: 14 },
                    ]}
                  >
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: docIsPermanent ? '#FFFFFF' : textPrimary }}>
                      {docIsPermanent ? '✓ Documento Permanente' : 'Con Fecha de Vencimiento'}
                    </Text>
                  </TouchableOpacity>

                  {!docIsPermanent && (
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: textSecondary }]}>FECHA DE VENCIMIENTO (AAAA-MM-DD)</Text>
                      <TextInput
                        style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                        placeholder="2027-06-01"
                        placeholderTextColor={textSecondary}
                        value={docExpiryDate}
                        onChangeText={setDocExpiryDate}
                      />
                    </View>
                  )}
                </View>

                <ImageUploader
                  label="Subir Foto / Escaneo del Papel (Archivo local o Enlace URL):"
                  imageUri={docImageUri}
                  onImageChange={setDocImageUri}
                  isDark={isDark}
                />

                <View>
                  <Text style={[styles.formLabel, { color: textSecondary }]}>OBSERVACIONES LEGALES</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                    placeholder="Aseguradora, cobertura, grado de licencia..."
                    placeholderTextColor={textSecondary}
                    value={docNotes}
                    onChangeText={setDocNotes}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowDocModal(false)}
                style={[styles.cancelBtn, { borderColor: borderCol }]}
              >
                <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveDocSubmit}
                style={[styles.primaryActionBtn, { backgroundColor: '#F59E0B' }]}
              >
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#FFFFFF' }}>
                  {editingDoc ? 'Guardar Cambios' : 'Registrar Papel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 6: INSPECCIÓN TÉCNICA VEHICULAR COMPLETA                    */}
      {/* ================================================================= */}
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

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        const veh = inspectingVehicle;
                        setInspectingVehicle(null);
                        setReportVehicle(veh);
                      }}
                      style={[styles.primaryActionBtn, { backgroundColor: '#00ae78' }]}
                    >
                      <MaterialIcons name="assessment" size={16} color="#FFFFFF" />
                      <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' }}>
                        Generar Informe PDF
                      </Text>
                    </TouchableOpacity>

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
                        Cargar Mantenimiento
                      </Text>
                    </TouchableOpacity>
                  </View>

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

      {/* ================================================================= */}
      {/* MODAL 7: CAMBIAR FOTOGRAFÍA / IMAGEN RÁPIDA                       */}
      {/* ================================================================= */}
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
                <ImageUploader
                  label="Montar Fotografía Real de la Unidad (Archivo local o Enlace URL):"
                  imageUri={photoCustomUri}
                  onImageChange={(uri) => {
                    setPhotoCustomUri(uri);
                    if (uri) setPhotoCatalogItem(null);
                  }}
                  isDark={isDark}
                />

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

      {/* ================================================================= */}
      {/* MODAL 8: ASIGNAR CONDUCTOR Y FICHA COMPLETA DEL PILOTO            */}
      {/* ================================================================= */}
      <Modal visible={showAssignUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol, maxWidth: 560 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="badge" size={22} color={accentPrimary} />
                <View>
                  <Text style={{ fontFamily: F.bold, fontSize: 16, color: textPrimary }}>
                    Asignar Conductor y Datos del Piloto
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

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12 }}>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: subSurfaceBg, borderColor: borderCol, color: textPrimary }]}
                  placeholder="Buscar usuario por nombre o correo..."
                  placeholderTextColor={textSecondary}
                  value={userSearchText}
                  onChangeText={setUserSearchText}
                />

                <View style={{ gap: 6 }}>
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
                        <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textPrimary }}>
                          Ninguno (Sin conductor asignado)
                        </Text>
                        <Text style={{ fontFamily: F.regular, fontSize: 10.5, color: textSecondary }}>
                          Dejar como unidad compartida sin piloto fijo
                        </Text>
                      </View>
                    </View>
                    {selectedAssigneeId === '' && <MaterialIcons name="check-circle" size={20} color="#EF4444" />}
                  </TouchableOpacity>

                  {appUsers
                    .filter((u) => {
                      if (!userSearchText.trim()) return true;
                      const q = userSearchText.toLowerCase();
                      return (
                        (u.fullName || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q) ||
                        (u.dni || '').toLowerCase().includes(q)
                      );
                    })
                    .map((u) => {
                      const isSelected = selectedAssigneeId === u.id;
                      const roleColor = u.role === 'superadmin' ? '#F59E0B' : u.role === 'tecnico' ? '#3B82F6' : '#10B981';
                      return (
                        <TouchableOpacity
                          key={u.id}
                          onPress={() => {
                            setSelectedAssigneeId(u.id);
                            syncPilotFieldsFromUser(u.id, assigningVehicle?.vehicleType || 'moto');
                          }}
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
                                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textPrimary }} numberOfLines={1}>
                                  {u.fullName || u.email}
                                </Text>
                                <View style={[styles.rolePill, { backgroundColor: `${roleColor}20` }]}>
                                  <Text style={{ fontFamily: F.bold, fontSize: 9, color: roleColor, textTransform: 'uppercase' }}>
                                    {u.role}
                                  </Text>
                                </View>
                              </View>
                              <Text style={{ fontFamily: F.regular, fontSize: 10.5, color: textSecondary }} numberOfLines={1}>
                                {u.email} {u.dni ? `· C.I: ${u.dni}` : ''}
                              </Text>
                            </View>
                          </View>
                          {isSelected && <MaterialIcons name="check-circle" size={20} color={accentPrimary} />}
                        </TouchableOpacity>
                      );
                    })}
                </View>

                {/* Ficha Técnica del Piloto Seleccionado */}
                {Boolean(selectedAssigneeId) && (
                  <View style={{ backgroundColor: subSurfaceBg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: borderCol, gap: 10, marginTop: 4 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: accentPrimary }}>
                      🪪 FICHA DEL PILOTO ASIGNADO (SE INCLUYE EN EL INFORME DE MONITOREO)
                    </Text>

                    <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: textSecondary }]}>CÉDULA / DOCUMENTO ID</Text>
                        <TextInput
                          style={[styles.inputBox, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                          placeholder="Ej: V-19.482.310"
                          placeholderTextColor={textSecondary}
                          value={pilotDni}
                          onChangeText={setPilotDni}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: textSecondary }]}>TELÉFONO MÓVIL</Text>
                        <TextInput
                          style={[styles.inputBox, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                          placeholder="+58 412-4458912"
                          placeholderTextColor={textSecondary}
                          value={pilotPhone}
                          onChangeText={setPilotPhone}
                        />
                      </View>
                    </View>

                    <View>
                      <Text style={[styles.formLabel, { color: textSecondary }]}>GRUPO SANGUÍNEO (SOS)</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {BLOOD_TYPES.map((bt) => {
                          const sel = pilotBloodType === bt;
                          return (
                            <TouchableOpacity
                              key={bt}
                              onPress={() => setPilotBloodType(bt)}
                              style={[styles.chipBtn, { backgroundColor: sel ? '#EF4444' : cardBg, borderColor: borderCol }]}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 11, color: sel ? '#FFFFFF' : textPrimary }}>
                                {bt}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View>
                      <Text style={[styles.formLabel, { color: textSecondary }]}>GRADO DE LICENCIA</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {LICENSE_GRADES.map((lg) => {
                          const sel = pilotLicenseGrade === lg;
                          return (
                            <TouchableOpacity
                              key={lg}
                              onPress={() => setPilotLicenseGrade(lg)}
                              style={[styles.chipBtn, { backgroundColor: sel ? '#3B82F6' : cardBg, borderColor: borderCol }]}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: sel ? '#FFFFFF' : textPrimary }}>
                                {lg}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: textSecondary }]}>CONTACTO EMERGENCIA SOS</Text>
                        <TextInput
                          style={[styles.inputBox, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                          placeholder="Nombre contacto SOS"
                          placeholderTextColor={textSecondary}
                          value={pilotEmergencyContact}
                          onChangeText={setPilotEmergencyContact}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: textSecondary }]}>TELÉFONO SOS</Text>
                        <TextInput
                          style={[styles.inputBox, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                          placeholder="+58 414-3217788"
                          placeholderTextColor={textSecondary}
                          value={pilotEmergencyPhone}
                          onChangeText={setPilotEmergencyPhone}
                        />
                      </View>
                    </View>
                  </View>
                )}
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
                  Guardar Piloto y Ficha
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 9: VISOR DE DOCUMENTO ESCANEADO / FOTO EN GRANDE            */}
      {/* ================================================================= */}
      <Modal visible={Boolean(previewDocImage)} transparent animationType="fade" onRequestClose={() => setPreviewDocImage(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol, maxWidth: 680, alignItems: 'center' }]}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: textPrimary }}>
                  {previewDocImage?.title} ({previewDocImage?.docNumber})
                </Text>
                <Text style={{ fontFamily: F.regular, fontSize: 11.5, color: textSecondary }}>
                  Vencimiento: {previewDocImage?.isPermanent ? 'Permanente' : previewDocImage?.expiryDate}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewDocImage(null)}>
                <MaterialIcons name="close" size={22} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {previewDocImage?.imageUrl ? (
              <Image
                source={{ uri: previewDocImage.imageUrl }}
                style={{ width: '100%', height: 420, borderRadius: 10 }}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 10: INFORME EJECUTIVO DE MONITOREO VEHICULAR (PDF / HTML)   */}
      {/* ================================================================= */}
      <VehicleReportModal
        visible={Boolean(reportVehicle)}
        onClose={() => setReportVehicle(null)}
        vehicle={reportVehicle}
        vehicleServices={vehicleServices}
        vehicleOdometerLogs={vehicleOdometerLogs}
        vehicleDocuments={vehicleDocuments}
        appUsers={appUsers}
        currentUser={currentUser}
        isDark={isDark}
      />
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
    gap: 12,
  },
  kpiCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 4,
    flexGrow: 1,
  },
  kpiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiTitle: {
    fontFamily: F.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontFamily: F.extrabold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  kpiSub: {
    fontFamily: F.medium,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  tabBtn: {
    paddingHorizontal: 12,
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
    gap: 10,
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
  miniStatBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  reportUnitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
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
  docWalletCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 4,
    padding: 14,
    gap: 8,
  },
  docIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docImagePreviewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
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
    fontSize: 10,
    letterSpacing: 0.5,
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
    marginVertical: 2,
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
