import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  Alert, 
  Modal,
  Switch,
  useWindowDimensions,
  Platform 
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyMoto } from '../../context/MotoContext';
import { useTheme } from '../../context/ThemeContext';
import { COMPONENT_NAMES, COMPONENT_ICONS, getServiceStatus } from '../../../constants/telemetry';
import { Generator, FuelType, GeneratorStatus, Company, Department, AppUser, PowerOutage } from '../../../domain/entities/Generator';
import { GENERATOR_CATALOG } from '../../../data/catalog';
import { PlantReportModal } from './PlantReportModal';
import { ImageUploader } from './ImageUploader';
import { AnalyticsDashboardSection } from './AnalyticsDashboardSection';
import {
  computeFleetAnalytics,
  formatMinutesDuration,
  formatSignedPct,
} from '../../../domain/analytics/fleetAnalytics';

type AdminTab = 'overview' | 'analytics' | 'users' | 'generators' | 'companies' | 'horometers' | 'outages' | 'services';

export const AdminDashboard: React.FC = () => {
  const { 
    generators, 
    activeGenerator, 
    selectGenerator, 
    horometerLogs, 
    outages, 
    services, 
    appUsers, 
    currentUser, 
    companies,
    departments,
    saveCompany,
    deleteCompany,
    saveDepartment,
    deleteDepartment,
    createAppUser, 
    updateAppUser,
    deleteAppUser, 
    saveGenerator, 
    updateGenerator,
    deleteGenerator,
    addOutage,
    updateOutage,
    deleteOutage,
    startOutage,
    endOutage,
    activeOutage,
    logout 
  } = useMyMoto();
  const { colors, isDark, toggleTheme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  // Responsive Breakpoints
  const isWide = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isMobile = windowWidth < 768;

  // Navigation State
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ==========================================
  // REPORT STATE (EXECUTIVE REPORT MODAL)
  // ==========================================
  const [selectedReportPlant, setSelectedReportPlant] = useState<Generator | null>(null);

  // ==========================================
  // FLEET FILTER STATE (Empresa, Departamento y Estado)
  // ==========================================
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // ==========================================
  // OUTAGES STATE (CORTES ELÉCTRICOS EN WEB 8081)
  // ==========================================
  const [showOutageModal, setShowOutageModal] = useState(false);
  const [editingOutage, setEditingOutage] = useState<PowerOutage | null>(null);
  const [outageGenId, setOutageGenId] = useState('');
  const [outageIsActive, setOutageIsActive] = useState(false);
  const [outageStartDate, setOutageStartDate] = useState('');
  const [outageEndDate, setOutageEndDate] = useState('');
  const [outageAutoStart, setOutageAutoStart] = useState(true);
  const [outageNotes, setOutageNotes] = useState('');
  const [selectedOutageFilter, setSelectedOutageFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [selectedOutageGenFilter, setSelectedOutageGenFilter] = useState<string>('all');

  // ==========================================
  // CREATE USER STATE
  // ==========================================
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'operador' | 'tecnico' | 'superadmin'>('operador');
  const [newUserGenIds, setNewUserGenIds] = useState<string[]>([activeGenerator?.id || 'gen-blue-power-c125']);
  const newUserGenId = newUserGenIds[0] || activeGenerator?.id || 'gen-blue-power-c125';
  const setNewUserGenId = (id: string) => setNewUserGenIds([id]);
  const toggleNewUserGenId = (id: string) => {
    setNewUserGenIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Mantener al menos una planta seleccionada
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  const [newUserCompanyId, setNewUserCompanyId] = useState('');
  const [newUserDeptId, setNewUserDeptId] = useState('');

  // ==========================================
  // EDIT USER STATE (SUPERADMIN)
  // ==========================================
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'operador' | 'tecnico' | 'superadmin'>('operador');
  const [editUserGenIds, setEditUserGenIds] = useState<string[]>([]);
  const editUserGenId = editUserGenIds[0] || '';
  const setEditUserGenId = (id: string) => setEditUserGenIds([id]);
  const toggleEditUserGenId = (id: string) => {
    setEditUserGenIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  const [editUserCompanyId, setEditUserCompanyId] = useState('');
  const [editUserDeptId, setEditUserDeptId] = useState('');

  // ==========================================
  // CREATE PLANT STATE
  // ==========================================
  const [showAddPlantModal, setShowAddPlantModal] = useState(false);
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantBrand, setNewPlantBrand] = useState('Blue Power Generation');
  const [newPlantModel, setNewPlantModel] = useState('C125');
  const [newPlantKva, setNewPlantKva] = useState('125');
  const [newPlantFuel, setNewPlantFuel] = useState<FuelType>('diesel');
  const [newPlantHoro, setNewPlantHoro] = useState('0');
  const [newPlantInterval, setNewPlantInterval] = useState('200');
  const [newPlantLastService, setNewPlantLastService] = useState('0');
  const [newPlantLocation, setNewPlantLocation] = useState('');
  const [newPlantSerial, setNewPlantSerial] = useState('');
  const [newPlantCompanyId, setNewPlantCompanyId] = useState(companies[0]?.id || '');
  const [newPlantDeptId, setNewPlantDeptId] = useState(departments[0]?.id || '');
  const [newPlantCustomImg, setNewPlantCustomImg] = useState('');
  const [newPlantCatalogIdx, setNewPlantCatalogIdx] = useState(0);

  // ==========================================
  // EDIT PLANT STATE (SUPERADMIN)
  // ==========================================
  const [editingPlant, setEditingPlant] = useState<Generator | null>(null);
  const [editPlantName, setEditPlantName] = useState('');
  const [editPlantBrand, setEditPlantBrand] = useState('');
  const [editPlantModel, setEditPlantModel] = useState('');
  const [editPlantKva, setEditPlantKva] = useState('');
  const [editPlantFuel, setEditPlantFuel] = useState<FuelType>('diesel');
  const [editPlantHoro, setEditPlantHoro] = useState('');
  const [editPlantInterval, setEditPlantInterval] = useState('');
  const [editPlantLastService, setEditPlantLastService] = useState('');
  const [editPlantLocation, setEditPlantLocation] = useState('');
  const [editPlantStatus, setEditPlantStatus] = useState<GeneratorStatus>('standby');
  const [editPlantSerial, setEditPlantSerial] = useState('');
  const [editPlantCompanyId, setEditPlantCompanyId] = useState('');
  const [editPlantDeptId, setEditPlantDeptId] = useState('');
  const [editPlantCustomImg, setEditPlantCustomImg] = useState('');
  const [editPlantCatalogIdx, setEditPlantCatalogIdx] = useState(0);

  // ==========================================
  // CONFIRM DELETE STATE (IN-APP MODALS)
  // ==========================================
  const [plantToDelete, setPlantToDelete] = useState<Generator | null>(null);
  const [isDeletingPlant, setIsDeletingPlant] = useState(false);
  const [outageToDelete, setOutageToDelete] = useState<PowerOutage | null>(null);
  const [isDeletingOutage, setIsDeletingOutage] = useState(false);

  // ==========================================
  // COMPANY & DEPARTMENT STATE
  // ==========================================
  const [companySubTab, setCompanySubTab] = useState<'companies' | 'departments'>('companies');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [compName, setCompName] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compImage, setCompImage] = useState('');

  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCompanyId, setDeptCompanyId] = useState(companies[0]?.id || '');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptImage, setDeptImage] = useState('');

  const F = {
    extrabold: 'Montserrat_800ExtraBold',
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  // Live Fleet Statistical Summary (real Supabase telemetry)
  const fleetOverviewAnalytics = useMemo(
    () =>
      computeFleetAnalytics({
        generators,
        horometerLogs,
        outages,
        services,
        companies,
        departments,
        appUsers,
        period: 'all',
        companyFilterId: 'all',
      }),
    [generators, horometerLogs, outages, services, companies, departments, appUsers]
  );

  // KPI Computations
  const stats = useMemo(() => {
    const totalGens = generators.length;
    const totalHoursFleet = fleetOverviewAnalytics.overview.totalHorometerHours;
    const totalOutagesCount = fleetOverviewAnalytics.overview.outagesCount;
    const totalBlackoutHours = (fleetOverviewAnalytics.overview.totalOutageMinutes / 60).toFixed(1);
    const totalUsersCount = appUsers.length;
    const totalServicesCount = services.length;

    return {
      totalGens,
      totalHoursFleet: totalHoursFleet.toFixed(1),
      totalOutagesCount,
      totalBlackoutHours,
      totalUsersCount,
      totalServicesCount,
    };
  }, [generators.length, fleetOverviewAnalytics, appUsers.length, services.length]);

  // Filtered generators by company, department and operational status
  const filteredGenerators = useMemo(() => {
    return generators.filter(g => {
      if (selectedCompanyFilter !== 'all' && g.companyId !== selectedCompanyFilter) return false;
      if (selectedDeptFilter !== 'all' && g.departmentId !== selectedDeptFilter) return false;
      if (selectedStatusFilter !== 'all' && g.status !== selectedStatusFilter) return false;
      return true;
    });
  }, [generators, selectedCompanyFilter, selectedDeptFilter, selectedStatusFilter]);

  // Filtered outages by active/resolved and by generator
  const filteredOutages = useMemo(() => {
    return outages.filter(o => {
      if (selectedOutageFilter === 'active' && o.endTime) return false;
      if (selectedOutageFilter === 'resolved' && !o.endTime) return false;
      if (selectedOutageGenFilter !== 'all' && o.generatorId !== selectedOutageGenFilter) return false;
      return true;
    });
  }, [outages, selectedOutageFilter, selectedOutageGenFilter]);

  // Cross-platform confirmation & notifications (Web & Native)
  const confirmAction = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm(`${title ? `${title}\n\n` : ''}${message}`);
      if (ok) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', style: 'destructive', onPress: onConfirm }
      ]);
    }
  };

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title ? `${title}: ` : ''}${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // ==========================================
  // HANDLERS: USER CREATION & EDITING
  // ==========================================
  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      Alert.alert('Datos Incompletos', 'Ingresa nombre completo y correo electrónico');
      return;
    }

    const assignedGens = generators.filter(g => newUserGenIds.includes(g.id));
    const primaryGen = assignedGens[0] || generators[0];
    const assignedNames = assignedGens.map(g => g.name);
    const assignedComp = companies.find(c => c.id === (newUserCompanyId || primaryGen?.companyId));
    const assignedDept = departments.find(d => d.id === (newUserDeptId || primaryGen?.departmentId));

    const res = await createAppUser({
      fullName: newUserName.trim(),
      email: newUserEmail.trim(),
      password: newUserPassword || '123456',
      role: newUserRole,
      assignedGeneratorId: primaryGen?.id,
      assignedGeneratorIds: newUserGenIds,
      assignedGeneratorName: assignedNames.join(', ') || primaryGen?.name,
      assignedGeneratorNames: assignedNames,
      companyId: assignedComp?.id,
      companyName: assignedComp?.name,
      departmentId: assignedDept?.id,
      departmentName: assignedDept?.name,
    });

    if (res.success) {
      const summaryNames = assignedNames.length > 0 ? assignedNames.join(', ') : (primaryGen?.name || 'la flota');
      Alert.alert('Usuario Creado', `El usuario ${newUserName} fue registrado exitosamente asignado a: ${summaryNames}.`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
    } else {
      Alert.alert('Error', res.error || 'No se pudo crear el usuario');
    }
  };

  const handleOpenEditUser = (u: AppUser) => {
    setEditingUser(u);
    setEditUserName(u.fullName || '');
    setEditUserRole(u.role);
    const assigned = u.assignedGeneratorIds && u.assignedGeneratorIds.length > 0
      ? u.assignedGeneratorIds
      : (u.assignedGeneratorId ? [u.assignedGeneratorId] : (activeGenerator?.id ? [activeGenerator.id] : []));
    setEditUserGenIds(assigned);
    setEditUserCompanyId(u.companyId || '');
    setEditUserDeptId(u.departmentId || '');
  };

  const handleSaveUserEdits = async () => {
    if (!editingUser) return;
    if (!editUserName.trim()) {
      Alert.alert('Campo Requerido', 'El nombre completo es obligatorio.');
      return;
    }
    const assignedGens = generators.filter(g => editUserGenIds.includes(g.id));
    const primaryGen = assignedGens[0] || generators[0];
    const assignedNames = assignedGens.map(g => g.name);
    const targetComp = companies.find(c => c.id === editUserCompanyId);
    const targetDept = departments.find(d => d.id === editUserDeptId);

    await updateAppUser(editingUser.id, {
      fullName: editUserName.trim(),
      role: editUserRole,
      assignedGeneratorId: primaryGen?.id,
      assignedGeneratorIds: editUserGenIds,
      assignedGeneratorName: assignedNames.join(', ') || primaryGen?.name,
      assignedGeneratorNames: assignedNames,
      companyId: editUserCompanyId || primaryGen?.companyId,
      companyName: targetComp?.name || primaryGen?.companyName,
      departmentId: editUserDeptId || primaryGen?.departmentId,
      departmentName: targetDept?.name || primaryGen?.departmentName,
    });

    setEditingUser(null);
    Alert.alert('Usuario Actualizado', `Se guardaron exitosamente los datos del usuario "${editUserName}".`);
  };

  // ==========================================
  // HANDLERS: CREATE PLANT
  // ==========================================
  const handleOpenAddPlant = () => {
    setNewPlantName('');
    setNewPlantBrand('Blue Power Generation');
    setNewPlantModel('C125');
    setNewPlantKva('125');
    setNewPlantFuel('diesel');
    setNewPlantHoro('0');
    setNewPlantInterval('200');
    setNewPlantLastService('0');
    setNewPlantLocation('');
    setNewPlantSerial('');
    setNewPlantCompanyId(companies[0]?.id || '');
    setNewPlantDeptId(departments[0]?.id || '');
    setNewPlantCustomImg('');
    setNewPlantCatalogIdx(0);
    setShowAddPlantModal(true);
  };

  const handleCreatePlant = async () => {
    if (!newPlantName.trim()) {
      Alert.alert('Nombre Requerido', 'Por favor ingresa un nombre para la nueva planta eléctrica.');
      return;
    }

    const kvaNum = parseFloat(newPlantKva) || 125;
    const horoNum = parseFloat(newPlantHoro) || 0;
    const intervalNum = parseFloat(newPlantInterval) || 200;
    const lastServNum = parseFloat(newPlantLastService) || 0;
    const catalogItem = GENERATOR_CATALOG[newPlantCatalogIdx] || GENERATOR_CATALOG[0];
    const matchComp = companies.find(c => c.id === newPlantCompanyId);
    const matchDept = departments.find(d => d.id === newPlantDeptId);

    const newGen: Generator = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newPlantName.trim(),
      brand: newPlantBrand.trim() || catalogItem.brand,
      model: newPlantModel.trim() || catalogItem.model,
      capacityKva: kvaNum,
      fuelType: newPlantFuel,
      currentHours: Number(horoNum.toFixed(1)),
      serviceIntervalHours: intervalNum,
      lastServiceHours: Number(lastServNum.toFixed(1)),
      location: newPlantLocation.trim() || 'Sala de Máquinas',
      serialNumber: newPlantSerial.trim() || `GEN-${Date.now().toString().slice(-6)}`,
      status: 'standby',
      companyId: matchComp?.id,
      companyName: matchComp?.name,
      departmentId: matchDept?.id,
      departmentName: matchDept?.name,
      customImageUri: newPlantCustomImg.trim() || undefined,
      catalogImageRes: catalogItem.imageRes,
    };

    await saveGenerator(newGen);
    setShowAddPlantModal(false);
    Alert.alert('Planta Registrada', `La planta "${newGen.name}" fue anexada exitosamente a la flota de monitoreo.`);
  };

  // ==========================================
  // HANDLERS: EDIT PLANT (SUPERADMIN)
  // ==========================================
  const handleOpenEditPlant = (gen: Generator) => {
    setEditingPlant(gen);
    setEditPlantName(gen.name || '');
    setEditPlantBrand(gen.brand || 'Blue Power Generation');
    setEditPlantModel(gen.model || 'C125');
    setEditPlantKva(String(gen.capacityKva || 125));
    setEditPlantFuel(gen.fuelType || 'diesel');
    setEditPlantHoro(String(gen.currentHours || 0));
    setEditPlantInterval(String(gen.serviceIntervalHours || 200));
    setEditPlantLastService(String(gen.lastServiceHours || 0));
    setEditPlantLocation(gen.location || '');
    setEditPlantStatus(gen.status || 'standby');
    setEditPlantSerial(gen.serialNumber || '');
    setEditPlantCompanyId(gen.companyId || companies[0]?.id || '');
    setEditPlantDeptId(gen.departmentId || departments[0]?.id || '');
    setEditPlantCustomImg(gen.customImageUri || '');

    const catIdx = GENERATOR_CATALOG.findIndex(
      c => c.brand.toLowerCase() === (gen.brand || '').toLowerCase() && c.model.toLowerCase() === (gen.model || '').toLowerCase()
    );
    setEditPlantCatalogIdx(catIdx >= 0 ? catIdx : 0);
  };

  const handleSavePlantEdits = async () => {
    if (!editingPlant) return;
    if (!editPlantName.trim()) {
      Alert.alert('Nombre Requerido', 'Por favor ingresa un nombre para la planta eléctrica.');
      return;
    }

    const kvaNum = parseFloat(editPlantKva) || editingPlant.capacityKva;
    const horoNum = parseFloat(editPlantHoro);
    const validHoro = isNaN(horoNum) ? editingPlant.currentHours : Number(horoNum.toFixed(1));
    const intervalNum = parseFloat(editPlantInterval) || editingPlant.serviceIntervalHours;
    const lastServNum = parseFloat(editPlantLastService);
    const rawLastServ = isNaN(lastServNum) ? editingPlant.lastServiceHours : Number(lastServNum.toFixed(1));
    // Proteger contra errores tipográficos donde el último servicio supere al horómetro actual
    const validLastServ = (rawLastServ > validHoro) ? validHoro : rawLastServ;
    const selectedCatalog = GENERATOR_CATALOG[editPlantCatalogIdx] || GENERATOR_CATALOG[0];
    const matchComp = companies.find(c => c.id === editPlantCompanyId);
    const matchDept = departments.find(d => d.id === editPlantDeptId);

    const updatedGen: Generator = {
      ...editingPlant,
      name: editPlantName.trim(),
      brand: editPlantBrand.trim() || selectedCatalog.brand,
      model: editPlantModel.trim() || selectedCatalog.model,
      capacityKva: kvaNum,
      fuelType: editPlantFuel,
      currentHours: validHoro,
      serviceIntervalHours: intervalNum,
      lastServiceHours: validLastServ,
      location: editPlantLocation.trim(),
      status: editPlantStatus,
      serialNumber: editPlantSerial.trim() || editingPlant.serialNumber,
      companyId: matchComp?.id,
      companyName: matchComp?.name,
      departmentId: matchDept?.id,
      departmentName: matchDept?.name,
      customImageUri: editPlantCustomImg.trim() || undefined,
      catalogImageRes: selectedCatalog.imageRes,
    };

    await saveGenerator(updatedGen);
    setEditingPlant(null);
    Alert.alert('Planta Actualizada', `Se guardaron exitosamente los cambios técnicos de "${updatedGen.name}".`);
  };

  const handleDeletePlant = (gen: Generator) => {
    if (editingPlant?.id === gen.id) setEditingPlant(null);
    setPlantToDelete(gen);
  };

  const handleConfirmDeletePlant = async () => {
    if (!plantToDelete) return;
    setIsDeletingPlant(true);
    try {
      const res = await deleteGenerator(plantToDelete.id);
      const name = plantToDelete.name;
      setPlantToDelete(null);
      if (res && !res.success && res.error) {
        notify('Aviso de Eliminación', `La planta "${name}" fue eliminada localmente. Nota de base de datos: ${res.error}`);
      } else {
        notify('Planta Eliminada', `La planta "${name}" fue removida definitivamente de la base de datos de Supabase.`);
      }
    } catch (err: any) {
      notify('Error', err?.message || 'Error al eliminar la planta.');
    } finally {
      setIsDeletingPlant(false);
    }
  };

  const handleToggleGenStatus = async (gen: Generator, newStatus: GeneratorStatus) => {
    await updateGenerator({ status: newStatus }, gen.id);
    notify('Estado Actualizado', `La planta "${gen.name}" ahora está en estado ${newStatus.toUpperCase()}.`);
  };

  // ==========================================
  // HANDLERS: CORTES ELÉCTRICOS (OUTAGES EN WEB)
  // ==========================================
  const formatDateTimeLocal = (d: Date = new Date()) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenAddOutage = (targetGenId?: string) => {
    const genId = targetGenId || activeGenerator?.id || generators[0]?.id || '';
    setEditingOutage(null);
    setOutageGenId(genId);
    setOutageIsActive(true);
    setOutageStartDate(formatDateTimeLocal(new Date()));
    setOutageEndDate('');
    setOutageAutoStart(true);
    setOutageNotes('');
    setShowOutageModal(true);
  };

  const handleOpenEditOutage = (o: PowerOutage) => {
    setEditingOutage(o);
    setOutageGenId(o.generatorId);
    setOutageIsActive(!o.endTime);
    setOutageStartDate(o.startTime ? formatDateTimeLocal(new Date(o.startTime)) : formatDateTimeLocal(new Date()));
    setOutageEndDate(o.endTime ? formatDateTimeLocal(new Date(o.endTime)) : '');
    setOutageAutoStart(o.generatorStarted ?? true);
    setOutageNotes(o.notes || '');
    setShowOutageModal(true);
  };

  const handleSaveOutage = async () => {
    if (!outageGenId) {
      notify('Planta Requerida', 'Por favor selecciona la planta eléctrica asignada a este corte.');
      return;
    }
    if (!outageStartDate) {
      notify('Fecha Requerida', 'Por favor especifica la fecha y hora de inicio del corte.');
      return;
    }

    const startIso = new Date(outageStartDate).toISOString();
    let endIso: string | null = null;
    let durationMinutes: number | null = null;

    if (!outageIsActive) {
      if (!outageEndDate) {
        notify('Hora Requerida', 'Si el corte no está activo, ingresa la fecha y hora de restablecimiento.');
        return;
      }
      endIso = new Date(outageEndDate).toISOString();
      const s = new Date(outageStartDate).getTime();
      const e = new Date(outageEndDate).getTime();
      if (e <= s) {
        notify('Horas Inválidas', 'La fecha de restablecimiento debe ser posterior a la fecha de inicio.');
        return;
      }
      durationMinutes = Math.max(1, Math.round((e - s) / 60000));
    }

    const assignedGen = generators.find(g => g.id === outageGenId);

    if (editingOutage) {
      await updateOutage(editingOutage.id, {
        generatorId: outageGenId,
        startTime: startIso,
        endTime: endIso,
        durationMinutes: durationMinutes ?? undefined,
        generatorStarted: outageAutoStart,
        notes: outageNotes.trim() || undefined,
      });
      notify('Corte Actualizado', `El corte de "${assignedGen?.name || 'la planta'}" se actualizó en Supabase.`);
    } else {
      await addOutage({
        generatorId: outageGenId,
        userId: currentUser?.id || 'admin',
        userEmail: currentUser ? `${currentUser.fullName} <${currentUser.email}>` : 'Super Administrador',
        startTime: startIso,
        endTime: endIso,
        durationMinutes: durationMinutes ?? undefined,
        generatorStarted: outageAutoStart,
        notes: outageNotes.trim() || 'Corte reportado desde panel web de superusuario',
      });
      notify('Corte Registrado', `El corte de energía fue guardado en Supabase.`);
    }

    setShowOutageModal(false);
  };

  const handleFinalizeOutage = (o: PowerOutage) => {
    const matchGen = generators.find(g => g.id === o.generatorId);
    confirmAction(
      'Restablecimiento de Energía',
      `¿Confirmas que el servicio eléctrico ha retornado para "${matchGen?.name || 'la planta'}" ahora mismo?\nSe cerrará la bitácora de corte y el generador volverá a modo STANDBY.`,
      async () => {
        await endOutage(o.id);
        notify('Corte Finalizado', 'Se registró el regreso del fluido eléctrico en la red.');
      }
    );
  };

  const handleDeleteOutage = (o: PowerOutage) => {
    setOutageToDelete(o);
  };

  const handleConfirmDeleteOutage = async () => {
    if (!outageToDelete) return;
    setIsDeletingOutage(true);
    try {
      await deleteOutage(outageToDelete.id);
      setOutageToDelete(null);
      notify('Corte Eliminado', 'El registro de corte fue eliminado de la base de datos de Supabase.');
    } catch (err: any) {
      notify('Error', err?.message || 'Error al eliminar el registro de corte.');
    } finally {
      setIsDeletingOutage(false);
    }
  };

  // ==========================================
  // HANDLERS: COMPANIES & DEPARTMENTS
  // ==========================================
  const handleOpenAddCompany = () => {
    setEditingCompany(null);
    setCompName('');
    setCompDesc('');
    setCompImage('');
    setShowCompanyModal(true);
  };

  const handleOpenEditCompany = (c: Company) => {
    setEditingCompany(c);
    setCompName(c.name);
    setCompDesc(c.description || '');
    setCompImage(c.imageUrl || '');
    setShowCompanyModal(true);
  };

  const handleSaveCompany = async () => {
    if (!compName.trim()) {
      Alert.alert('Campo Requerido', 'El nombre de la empresa es obligatorio.');
      return;
    }
    const comp: Company = {
      id: editingCompany ? editingCompany.id : `comp-${Date.now()}`,
      name: compName.trim(),
      description: compDesc.trim(),
      imageUrl: compImage.trim() || undefined,
      createdAt: editingCompany?.createdAt || new Date().toISOString(),
    };
    await saveCompany(comp);
    setShowCompanyModal(false);
    Alert.alert('Empresa Guardada', `La empresa "${comp.name}" se guardó correctamente.`);
  };

  const handleDeleteCompany = (c: Company) => {
    confirmAction(
      'Eliminar Empresa',
      `¿Deseas eliminar la empresa "${c.name}" de la base de datos?`,
      async () => {
        await deleteCompany(c.id);
        notify('Empresa Eliminada', `Se eliminó "${c.name}".`);
      }
    );
  };

  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCompanyId(companies[0]?.id || '');
    setDeptDesc('');
    setDeptImage('');
    setShowDeptModal(true);
  };

  const handleOpenEditDept = (d: Department) => {
    setEditingDept(d);
    setDeptName(d.name);
    setDeptCompanyId(d.companyId || companies[0]?.id || '');
    setDeptDesc(d.description || '');
    setDeptImage(d.imageUrl || '');
    setShowDeptModal(true);
  };

  const handleSaveDept = async () => {
    if (!deptName.trim()) {
      notify('Campo Requerido', 'El nombre del departamento es obligatorio.');
      return;
    }
    const dept: Department = {
      id: editingDept ? editingDept.id : `dep-${Date.now()}`,
      companyId: deptCompanyId,
      name: deptName.trim(),
      description: deptDesc.trim(),
      imageUrl: deptImage.trim() || undefined,
      createdAt: editingDept?.createdAt || new Date().toISOString(),
    };
    await saveDepartment(dept);
    setShowDeptModal(false);
    notify('Departamento Guardado', `El departamento "${dept.name}" se guardó correctamente.`);
  };

  const handleDeleteDept = (d: Department) => {
    confirmAction(
      'Eliminar Departamento',
      `¿Deseas eliminar el departamento "${d.name}" de la base de datos?`,
      async () => {
        await deleteDepartment(d.id);
        notify('Departamento Eliminado', `Se eliminó "${d.name}".`);
      }
    );
  };

  const bgSidebar = isDark ? '#000b21' : '#F1F4F9';
  const cardBg = isDark ? '#001136' : '#FFFFFF';
  const inputBg = isDark ? '#0a2558' : '#F8FAFC';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textPrimary = colors.onSurface;
  const textSecondary = colors.onSurfaceVariant;

  const NAV_ITEMS = [
    { id: 'overview', label: 'Resumen General', icon: 'dashboard' },
    { id: 'analytics', label: 'Estadísticas y Comparativas', icon: 'bar-chart' },
    { id: 'users', label: 'Crear / Gestionar Usuarios', icon: 'group-add' },
    { id: 'generators', label: 'Plantas Eléctricas', icon: 'precision-manufacturing' },
    { id: 'companies', label: 'Empresas & Dptos', icon: 'domain' },
    { id: 'horometers', label: 'Horómetros en Vivo', icon: 'speed' },
    { id: 'outages', label: 'Cortes Eléctricos', icon: 'flash-off' },
    { id: 'services', label: 'Mantenimientos', icon: 'build' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      
      {/* ==================================================== */}
      {/* TOPBAR (RESPONSIVE) */}
      {/* ==================================================== */}
      <View style={[styles.topbar, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {/* Mobile Menu Hamburger */}
          {isMobile && (
            <TouchableOpacity 
              onPress={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              style={[styles.topbarIconBtn, { backgroundColor: inputBg }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name={mobileSidebarOpen ? "close" : "menu"} size={22} color={textPrimary} />
            </TouchableOpacity>
          )}

          {/* Logo Badge (tema claro: azul sobre blanco | tema oscuro: blanco sobre azul marino) */}
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: isDark ? '#0a2558' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(56, 189, 248, 0.32)' : 'rgba(31, 46, 84, 0.16)',
              },
            ]}
          >
            <Image
              source={
                isDark
                  ? require('../../../../assets/images/LOGO-EMPRESASDELVALLE.png')
                  : require('../../../../assets/images/EMPRESASDELVALLE-AZUL.png')
              }
              style={{ width: '90%', height: '90%' }}
              resizeMode="contain"
            />
          </View>

          {/* Title & Subtitle */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: isMobile ? 14 : 16, letterSpacing: 0.5 }} numberOfLines={1}>
              EMPRESAS DEL VALLE • EDV MONITOR
            </Text>
            {!isMobile && (
              <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }} numberOfLines={1}>
                Panel de Superusuario & Gestión de Plantas Eléctricas
              </Text>
            )}
          </View>
        </View>

        {/* Right Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          {/* Superuser Badge */}
          <View style={[styles.superBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <MaterialIcons name="admin-panel-settings" size={15} color="#F59E0B" />
            <Text style={{ fontFamily: F.bold, color: '#F59E0B', fontSize: isMobile ? 10 : 11 }}>
              SUPERUSUARIO
            </Text>
          </View>

          {/* User Email (Desktop/Tablet only) */}
          {!isMobile && (
            <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 12 }}>
              {currentUser?.email || 'admin@empresasdelvalle.com'}
            </Text>
          )}

          {/* Theme Toggle */}
          <TouchableOpacity 
            onPress={toggleTheme} 
            style={[styles.topbarIconBtn, { backgroundColor: inputBg }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={18} color={textPrimary} />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity 
            onPress={logout}
            style={[styles.topbarIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="logout" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ==================================================== */}
      {/* MAIN LAYOUT: SIDEBAR + CONTENT AREA */}
      {/* ==================================================== */}
      <View style={styles.mainLayout}>

        {/* DESKTOP & TABLET STATIC SIDEBAR */}
        {!isMobile && (
          <View style={[styles.sidebar, { backgroundColor: bgSidebar, borderRightColor: borderCol, width: isWide ? 250 : 70 }]}>
            <View style={{ paddingVertical: 14, gap: 6 }}>
              {NAV_ITEMS.map(tab => {
                const isSelected = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.sidebarItem,
                      isSelected && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setActiveTab(tab.id as AdminTab)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons 
                      name={tab.icon as any} 
                      size={20} 
                      color={isSelected ? (isDark ? '#001136' : '#FFFFFF') : textSecondary} 
                    />
                    {isWide && (
                      <Text style={{
                        fontFamily: isSelected ? F.bold : F.semibold,
                        color: isSelected ? (isDark ? '#001136' : '#FFFFFF') : textPrimary,
                        fontSize: 13,
                      }}>
                        {tab.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* MOBILE SLIDE-OVER SIDEBAR DRAWER */}
        {isMobile && mobileSidebarOpen && (
          <TouchableOpacity 
            style={styles.mobileDrawerOverlay}
            activeOpacity={1}
            onPress={() => setMobileSidebarOpen(false)}
          >
            <View style={[styles.mobileDrawerContent, { backgroundColor: bgSidebar, borderRightColor: borderCol }]}>
              <View style={{ paddingVertical: 14, gap: 6 }}>
                {NAV_ITEMS.map(tab => {
                  const isSelected = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={[
                        styles.sidebarItem,
                        isSelected && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => {
                        setActiveTab(tab.id as AdminTab);
                        setMobileSidebarOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons 
                        name={tab.icon as any} 
                        size={20} 
                        color={isSelected ? (isDark ? '#001136' : '#FFFFFF') : textSecondary} 
                      />
                      <Text style={{
                        fontFamily: isSelected ? F.bold : F.semibold,
                        color: isSelected ? (isDark ? '#001136' : '#FFFFFF') : textPrimary,
                        fontSize: 13,
                      }}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* MAIN SCROLLABLE CONTENT */}
        <ScrollView 
          style={styles.contentArea} 
          contentContainerStyle={{ padding: isMobile ? 14 : 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ==================================================== */}
          {/* TAB 1: OVERVIEW (RESUMEN GENERAL) */}
          {/* ==================================================== */}
          {activeTab === 'overview' && (
            <View>
              <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: isMobile ? 20 : 24, marginBottom: 4 }}>
                Centro de Operaciones y Resumen Ejecutivo
              </Text>
              <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginBottom: 20 }}>
                Visualización centralizada de plantas eléctricas, reportes de operadores y estado de la red.
              </Text>

              {/* KPI Cards Grid */}
              <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { backgroundColor: cardBg, borderLeftColor: colors.primary }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11 }}>PLANTAS MONITOREADAS</Text>
                    <MaterialCommunityIcons name="engine" size={22} color={colors.primary} />
                  </View>
                  <Text style={[styles.kpiNumber, { fontFamily: F.extrabold, color: textPrimary, fontVariant: ['tabular-nums'] }]}>
                    {stats.totalGens}
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: '#10B981', fontSize: 11, fontVariant: ['tabular-nums'] }}>
                    {fleetOverviewAnalytics.overview.runningPlants + fleetOverviewAnalytics.overview.standbyPlants} operativas · {fleetOverviewAnalytics.overview.totalCapacityKva} kVA totales
                  </Text>
                </View>

                <View style={[styles.kpiCard, { backgroundColor: cardBg, borderLeftColor: '#3B82F6' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11 }}>HORAS TOTALES FLOTA</Text>
                    <MaterialIcons name="timer" size={22} color="#3B82F6" />
                  </View>
                  <Text style={[styles.kpiNumber, { fontFamily: F.extrabold, color: textPrimary, fontVariant: ['tabular-nums'] }]}>
                    {stats.totalHoursFleet} h
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, fontVariant: ['tabular-nums'] }}>
                    Prom. {fleetOverviewAnalytics.overview.avgHorometerHours.toFixed(1)} h/planta · {fleetOverviewAnalytics.overview.avgHoursPerDayFleet.toFixed(1)} h/día
                  </Text>
                </View>

                <View style={[styles.kpiCard, { backgroundColor: cardBg, borderLeftColor: '#F59E0B' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11 }}>CORTES ELÉCTRICOS</Text>
                    <MaterialCommunityIcons name="flash-alert" size={22} color="#F59E0B" />
                  </View>
                  <Text style={[styles.kpiNumber, { fontFamily: F.extrabold, color: '#F59E0B', fontVariant: ['tabular-nums'] }]}>
                    {stats.totalOutagesCount} eventos
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, fontVariant: ['tabular-nums'] }}>
                    {stats.totalBlackoutHours} h totales · Prom. {formatMinutesDuration(fleetOverviewAnalytics.overview.avgOutageMinutes)}/corte
                  </Text>
                </View>

                <View style={[styles.kpiCard, { backgroundColor: cardBg, borderLeftColor: '#10B981' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11 }}>USUARIOS Y MANTENIMIENTO</Text>
                    <MaterialIcons name="people" size={22} color="#10B981" />
                  </View>
                  <Text style={[styles.kpiNumber, { fontFamily: F.extrabold, color: textPrimary, fontVariant: ['tabular-nums'] }]}>
                    {stats.totalUsersCount}
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: colors.primary, fontSize: 11, fontVariant: ['tabular-nums'] }}>
                    {stats.totalServicesCount} servicios · Salud flota {fleetOverviewAnalytics.overview.avgFleetHealthPct.toFixed(0)}%
                  </Text>
                </View>
              </View>

              {/* Live Plant Status Summary Cards */}
              <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 17, marginTop: 28, marginBottom: 14 }}>
                Plantas Eléctricas Activas en Sistema
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                {generators.length === 0 ? (
                  <View style={[styles.emptyFilterBox, { backgroundColor: cardBg, borderColor: borderCol, width: '100%', padding: 28 }]}>
                    <MaterialCommunityIcons name="engine-off" size={36} color={textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }}>
                      No hay plantas eléctricas registradas en la base de datos de Supabase.
                    </Text>
                    <TouchableOpacity
                      style={[styles.addPlantBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                      onPress={() => setActiveTab('generators')}
                    >
                      <MaterialIcons name="add" size={16} color={isDark ? '#001136' : '#FFFFFF'} />
                      <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 12 }}>
                        Anexar Planta en Flota
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  generators.map((gen) => {
                  const remaining = Math.max(0, (gen.lastServiceHours + gen.serviceIntervalHours) - gen.currentHours);
                  const status = getServiceStatus(remaining);
                  return (
                    <View key={gen.id} style={[styles.plantCard, { backgroundColor: cardBg, width: isWide ? '48.5%' : '100%', borderColor: borderCol, borderWidth: 1 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={[styles.plantIconCircle, { backgroundColor: isDark ? 'rgba(189,210,254,0.12)' : 'rgba(0,17,54,0.08)' }]}>
                            {gen.customImageUri || gen.imageUrl ? (
                              <Image source={{ uri: gen.customImageUri || gen.imageUrl }} style={{ width: 34, height: 34, borderRadius: 17 }} resizeMode="cover" />
                            ) : (
                              <MaterialCommunityIcons name="engine" size={22} color={colors.primary} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }} numberOfLines={1}>
                              {gen.name}
                            </Text>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                              {gen.brand} {gen.model} • {gen.capacityKva} kVA • {gen.fuelType.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: `${status.color}20` }]}>
                          <Text style={{ fontFamily: F.bold, color: status.color, fontSize: 10 }}>
                            {status.label}
                          </Text>
                        </View>
                      </View>

                      {/* Company & Dept tags */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        <View style={[styles.microBadge, { backgroundColor: isDark ? 'rgba(189,210,254,0.1)' : '#F1F5F9' }]}>
                          <MaterialIcons name="business" size={11} color={colors.primary} />
                          <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 10 }}>
                            {gen.companyName || 'Empresas del Valle'}
                          </Text>
                        </View>
                        {gen.departmentName && (
                          <View style={[styles.microBadge, { backgroundColor: isDark ? 'rgba(0,174,120,0.1)' : '#DCFCE7' }]}>
                            <MaterialIcons name="folder-special" size={11} color="#00ae78" />
                            <Text style={{ fontFamily: F.bold, color: '#00ae78', fontSize: 10 }}>
                              {gen.departmentName}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.plantMetricsRow}>
                        <View style={styles.plantMetricItem}>
                          <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 10 }}>Horómetro</Text>
                          <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 16 }}>
                            {gen.currentHours.toFixed(1)} h
                          </Text>
                        </View>
                        <View style={styles.plantMetricItem}>
                          <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 10 }}>Próx. Servicio en</Text>
                          <Text style={{ fontFamily: F.extrabold, color: status.color, fontSize: 16 }}>
                            {remaining.toFixed(1)} h
                          </Text>
                        </View>
                        <View style={styles.plantMetricItem}>
                          <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 10 }}>Ubicación</Text>
                          <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 11 }} numberOfLines={1}>
                            {gen.location || 'Sala de Máquinas'}
                          </Text>
                        </View>
                      </View>

                      {/* Action buttons on card */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: borderCol }}>
                        <TouchableOpacity
                          style={[styles.reportPlantBtn, { backgroundColor: '#00ae78', flex: 1 }]}
                          onPress={() => setSelectedReportPlant(gen)}
                          activeOpacity={0.85}
                        >
                          <MaterialIcons name="assessment" size={15} color="#FFFFFF" />
                          <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 12 }}>
                            Generar Informe
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.editPlantBtn, { backgroundColor: inputBg, borderColor: borderCol, borderWidth: 1 }]}
                          onPress={() => {
                            selectGenerator(gen.id);
                            setActiveTab('generators');
                          }}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="settings" size={15} color={textPrimary} />
                          <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                            Gestionar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
              </View>

              {/* Resumen Estadístico Ejecutivo: Cortes por Empresa & Comparativa de Plantas */}
              <View style={{ marginTop: 28, gap: 14 }}>
                <View style={{ flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 10 }}>
                  <View>
                    <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 17 }}>
                      Resumen Estadístico: Cortes por Empresa y Uso Comparativo de Plantas
                    </Text>
                    <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12.5 }}>
                      Promedios globales en tiempo real calculados desde Supabase ({fleetOverviewAnalytics.overview.effectiveDaysSpan} días evaluados).
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setActiveTab('analytics')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: colors.primary,
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 10,
                    }}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="bar-chart" size={16} color={isDark ? '#001136' : '#FFFFFF'} />
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: isDark ? '#001136' : '#FFFFFF' }}>
                      Ver Estadísticas Completas
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14 }}>
                  {/* Promedio de Cortes por Empresa */}
                  <View style={[styles.formPanel, { flex: 1, backgroundColor: cardBg, borderColor: borderCol, marginBottom: 0, padding: 18 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialIcons name="domain" size={18} color="#F59E0B" />
                        <Text style={{ fontFamily: F.bold, fontSize: 14.5, color: textPrimary }}>
                          Promedios de Corte por Empresa
                        </Text>
                      </View>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11, color: textSecondary, fontVariant: ['tabular-nums'] }}>
                        Red: {formatMinutesDuration(fleetOverviewAnalytics.overview.networkAvgOutageMinutes)}/corte
                      </Text>
                    </View>

                    {fleetOverviewAnalytics.companyOutages.length === 0 ? (
                      <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary }}>
                        Aún no hay empresas registradas para comparar cortes.
                      </Text>
                    ) : (
                      <View style={{ gap: 10 }}>
                        {fleetOverviewAnalytics.companyOutages.slice(0, 5).map((comp) => (
                          <View
                            key={comp.companyKey}
                            style={{
                              padding: 11,
                              borderRadius: 10,
                              backgroundColor: inputBg,
                              borderWidth: 1,
                              borderColor: borderCol,
                              gap: 4,
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                                {comp.companyName}
                              </Text>
                              <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#F59E0B', fontVariant: ['tabular-nums'] }}>
                                Prom. {formatMinutesDuration(comp.avgOutageMinutes)}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textSecondary, fontVariant: ['tabular-nums'] }}>
                                {comp.outageCount} cortes · {comp.avgOutagesPerPlant.toFixed(1)}/planta · {(comp.totalOutageMinutes / 60).toFixed(1)} h totales
                              </Text>
                              <Text
                                style={{
                                  fontFamily: F.bold,
                                  fontSize: 11,
                                  fontVariant: ['tabular-nums'],
                                  color:
                                    comp.vsNetworkAvgDurationPct === null
                                      ? textSecondary
                                      : comp.vsNetworkAvgDurationPct > 0
                                      ? '#D97706'
                                      : '#059669',
                                }}
                              >
                                {comp.vsNetworkAvgDurationPct === null ? 'Sin cortes' : `${formatSignedPct(comp.vsNetworkAvgDurationPct)} vs Red`}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Uso Promedio & Comparativa de Plantas */}
                  <View style={[styles.formPanel, { flex: 1, backgroundColor: cardBg, borderColor: borderCol, marginBottom: 0, padding: 18 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialCommunityIcons name="chart-bar" size={18} color="#3B82F6" />
                        <Text style={{ fontFamily: F.bold, fontSize: 14.5, color: textPrimary }}>
                          Comparativa de Uso por Planta
                        </Text>
                      </View>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11, color: textSecondary, fontVariant: ['tabular-nums'] }}>
                        Prom: {fleetOverviewAnalytics.overview.avgHorometerHours.toFixed(1)} h
                      </Text>
                    </View>

                    {fleetOverviewAnalytics.plantUsage.length === 0 ? (
                      <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textSecondary }}>
                        Aún no hay plantas eléctricas registradas.
                      </Text>
                    ) : (
                      <View style={{ gap: 10 }}>
                        {fleetOverviewAnalytics.plantUsage.slice(0, 5).map((plant) => (
                          <View
                            key={plant.generatorId}
                            style={{
                              padding: 11,
                              borderRadius: 10,
                              backgroundColor: inputBg,
                              borderWidth: 1,
                              borderColor: borderCol,
                              gap: 4,
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                                #{plant.usageRank} {plant.name}
                              </Text>
                              <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#3B82F6', fontVariant: ['tabular-nums'] }}>
                                {plant.currentHours.toFixed(1)} h ({plant.shareOfFleetHoursPct.toFixed(0)}%)
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textSecondary, fontVariant: ['tabular-nums'] }}>
                                {plant.companyName} · {plant.avgHoursPerDay.toFixed(2)} h/día · {plant.outagesCount} cortes
                              </Text>
                              <Text
                                style={{
                                  fontFamily: F.bold,
                                  fontSize: 11,
                                  fontVariant: ['tabular-nums'],
                                  color:
                                    plant.vsFleetAvgHorometerPct === null
                                      ? textSecondary
                                      : plant.vsFleetAvgHorometerPct >= 0
                                      ? '#3B82F6'
                                      : '#059669',
                                }}
                              >
                                {formatSignedPct(plant.vsFleetAvgHorometerPct)} vs Prom.
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Quick Link to Plant Fleet Tab */}
              <TouchableOpacity 
                style={[styles.manageFleetBanner, { backgroundColor: cardBg, borderColor: borderCol }]}
                onPress={() => setActiveTab('generators')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <MaterialIcons name="settings-suggest" size={24} color={colors.primary} />
                  <View>
                    <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }}>
                      ¿Deseas editar ubicación, horas o mantenimientos de las plantas?
                    </Text>
                    <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12 }}>
                      Haz clic aquí para ir a la pestaña de Gestión de Flota y editar cualquier grupo electrógeno.
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* ==================================================== */}
          {/* TAB 1B: ESTADÍSTICAS PROMEDIALES Y COMPARATIVAS */}
          {/* ==================================================== */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboardSection
              generators={generators}
              horometerLogs={horometerLogs}
              outages={outages}
              services={services}
              companies={companies}
              departments={departments}
              appUsers={appUsers}
              isDark={isDark}
              colors={colors}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onNotify={notify}
            />
          )}

          {/* ==================================================== */}
          {/* TAB 2: GESTIÓN DE USUARIOS */}
          {/* ==================================================== */}
          {activeTab === 'users' && (
            <View>
              <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: isMobile ? 20 : 24, marginBottom: 4 }}>
                Gestión de Usuarios de la Aplicación Móvil
              </Text>
              <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginBottom: 20 }}>
                Como Superusuario, crea credenciales para operadores y técnicos que reportarán horómetros, cortes y servicios.
              </Text>

              {/* Formulario de Creación de Usuario */}
              <View style={[styles.formPanel, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <MaterialIcons name="person-add" size={20} color={colors.primary} />
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15 }}>
                    Crear Nuevo Usuario para la App Móvil
                  </Text>
                </View>

                <View style={styles.formGrid}>
                  <View style={{ flex: 1, minWidth: isMobile ? '100%' : 220 }}>
                    <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                      Nombre y Apellido del Operador:
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                      value={newUserName}
                      onChangeText={setNewUserName}
                      placeholder="Ej: Carlos Mendoza"
                      placeholderTextColor={textSecondary}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: isMobile ? '100%' : 220 }}>
                    <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                      Correo Electrónico (Login):
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                      value={newUserEmail}
                      onChangeText={setNewUserEmail}
                      placeholder="carlos@empresa.com"
                      placeholderTextColor={textSecondary}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: isMobile ? '100%' : 180 }}>
                    <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                      Contraseña Provisional:
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                      value={newUserPassword}
                      onChangeText={setNewUserPassword}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor={textSecondary}
                      secureTextEntry
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: isMobile ? '100%' : 180 }}>
                    <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                      Rol en el Sistema:
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(['operador', 'tecnico', 'superadmin'] as const).map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.roleChip,
                            { backgroundColor: inputBg },
                            newUserRole === r && { backgroundColor: colors.primary }
                          ]}
                          onPress={() => setNewUserRole(r)}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: newUserRole === r ? (isDark ? '#001136' : '#FFFFFF') : textSecondary }}>
                            {r.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Asignación de Plantas a Cargo para Operadores y Técnicos (Selección Múltiple) */}
                <View style={{ marginTop: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialCommunityIcons name="engine" size={16} color={colors.primary} />
                      <Text style={[styles.label, { fontFamily: F.bold, color: textPrimary, marginBottom: 0 }]}>
                        Plantas a su Cargo (Selección Múltiple):
                      </Text>
                    </View>
                    <Text style={{ fontFamily: F.semibold, color: colors.primary, fontSize: 11 }}>
                      {newUserGenIds.length} asignada{newUserGenIds.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {generators.map((g) => {
                        const isSel = newUserGenIds.includes(g.id);
                        return (
                          <TouchableOpacity
                            key={g.id}
                            style={[
                              styles.chipBtn,
                              { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol },
                              isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                            ]}
                            onPress={() => {
                              toggleNewUserGenId(g.id);
                              if (g.companyId) setNewUserCompanyId(g.companyId);
                              if (g.departmentId) setNewUserDeptId(g.departmentId);
                            }}
                          >
                            <MaterialCommunityIcons 
                              name={isSel ? "check-circle" : "engine"} 
                              size={14} 
                              color={isSel ? (isDark ? '#001136' : '#FFFFFF') : textSecondary} 
                            />
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                              {g.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Organización: Empresa y Departamento */}
                <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14, marginTop: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                      Empresa Asociada:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {companies.map((c) => {
                          const isSel = (newUserCompanyId || companies[0]?.id) === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[
                                styles.chipBtn,
                                { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol },
                                isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                              ]}
                              onPress={() => setNewUserCompanyId(c.id)}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                                {c.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                      Departamento:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {departments.map((d) => {
                          const isSel = (newUserDeptId || departments[0]?.id) === d.id;
                          return (
                            <TouchableOpacity
                              key={d.id}
                              style={[
                                styles.chipBtn,
                                { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol },
                                isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                              ]}
                              onPress={() => setNewUserDeptId(d.id)}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                                {d.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.submitUserBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreateUser}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="check" size={18} color={isDark ? '#001136' : '#FFFFFF'} />
                  <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 13 }}>
                    Crear y Habilitar Usuario para la App
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tabla de Usuarios Existentes */}
              <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 17, marginTop: 24, marginBottom: 12 }}>
                Usuarios Registrados en el Sistema ({appUsers.length})
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={[styles.tableCard, { backgroundColor: cardBg }]}>
                <View style={{ minWidth: 900 }}>
                  <View style={[styles.tableHeader, { borderBottomColor: borderCol }]}>
                    <Text style={[styles.th, { flex: 2, fontFamily: F.bold, color: textSecondary }]}>NOMBRE COMPLETO</Text>
                    <Text style={[styles.th, { flex: 2, fontFamily: F.bold, color: textSecondary }]}>CORREO ELECTRÓNICO</Text>
                    <Text style={[styles.th, { flex: 1.2, fontFamily: F.bold, color: textSecondary }]}>ROL</Text>
                    <Text style={[styles.th, { flex: 2.2, fontFamily: F.bold, color: textSecondary }]}>PLANTA A SU CARGO</Text>
                    <Text style={[styles.th, { flex: 1.8, fontFamily: F.bold, color: textSecondary }]}>EMPRESA / DEPTO</Text>
                    <Text style={[styles.th, { flex: 1.2, textAlign: 'right', fontFamily: F.bold, color: textSecondary }]}>ACCIONES</Text>
                  </View>

                  {appUsers.map((u) => {
                    const assignedGen = generators.find(g => g.id === u.assignedGeneratorId);
                    return (
                      <View key={u.id} style={[styles.tableRow, { borderBottomColor: borderCol }]}>
                        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.userTableAvatar}>
                            <MaterialIcons name="person" size={16} color="#FFFFFF" />
                          </View>
                          <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                            {u.fullName}
                          </Text>
                        </View>

                        <Text style={{ flex: 2, fontFamily: F.medium, color: textSecondary, fontSize: 12 }}>
                          {u.email}
                        </Text>

                        <View style={{ flex: 1.2 }}>
                          <View style={[styles.roleTag, { backgroundColor: u.role === 'superadmin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(37, 99, 235, 0.15)' }]}>
                            <Text style={{ fontFamily: F.bold, color: u.role === 'superadmin' ? '#F59E0B' : colors.primary, fontSize: 10 }}>
                              {u.role.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        {/* Planta(s) a su cargo */}
                        <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialCommunityIcons name="engine" size={16} color={colors.primary} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }} numberOfLines={1}>
                              {u.assignedGeneratorIds && u.assignedGeneratorIds.length > 1
                                ? `${u.assignedGeneratorIds.length} Plantas: ${u.assignedGeneratorName || generators.filter(g => u.assignedGeneratorIds?.includes(g.id)).map(g => g.name).join(', ')}`
                                : (u.assignedGeneratorName || assignedGen?.name || 'Sin Asignar')}
                            </Text>
                            {u.assignedGeneratorIds && u.assignedGeneratorIds.length > 1 && (
                              <Text style={{ fontFamily: F.medium, color: colors.primary, fontSize: 10 }}>
                                Múltiples unidades asignadas
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Empresa / Depto */}
                        <View style={{ flex: 1.8 }}>
                          <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 11 }} numberOfLines={1}>
                            {u.companyName || assignedGen?.companyName || 'Empresas del Valle'}
                          </Text>
                          {(u.departmentName || assignedGen?.departmentName) && (
                            <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 10 }} numberOfLines={1}>
                              {u.departmentName || assignedGen?.departmentName}
                            </Text>
                          )}
                        </View>

                        {/* Acciones */}
                        <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                          <TouchableOpacity 
                            onPress={() => handleOpenEditUser(u)}
                            style={[styles.smallIconBtn, { backgroundColor: isDark ? 'rgba(189,210,254,0.1)' : 'rgba(0,17,54,0.06)' }]}
                          >
                            <MaterialIcons name="edit" size={16} color={colors.primary} />
                          </TouchableOpacity>

                          {u.role !== 'superadmin' && (
                            <TouchableOpacity 
                              onPress={() => {
                                confirmAction(
                                  'Eliminar Usuario',
                                  `¿Deseas eliminar al usuario "${u.fullName || u.email}" del sistema?`,
                                  async () => {
                                    await deleteAppUser(u.id);
                                    notify('Usuario Eliminado', 'El usuario fue eliminado correctamente.');
                                  }
                                );
                              }}
                              style={[styles.smallIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                            >
                              <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ==================================================== */}
          {/* TAB 3: HORÓMETROS EN VIVO */}
          {/* ==================================================== */}
          {activeTab === 'horometers' && (
            <View>
              <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: isMobile ? 20 : 24, marginBottom: 4 }}>
                Registro de Horómetros en Vivo
              </Text>
              <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginBottom: 20 }}>
                Visualiza en tiempo real cada actualización de horas ingresada por operadores desde la aplicación móvil.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={[styles.tableCard, { backgroundColor: cardBg }]}>
                <View style={{ minWidth: 700 }}>
                  <View style={[styles.tableHeader, { borderBottomColor: borderCol }]}>
                    <Text style={[styles.th, { flex: 2, fontFamily: F.bold, color: textSecondary }]}>HORÓMETRO REPORTADO</Text>
                    <Text style={[styles.th, { flex: 1.5, fontFamily: F.bold, color: textSecondary }]}>CONSUMO (DELTA)</Text>
                    <Text style={[styles.th, { flex: 2, fontFamily: F.bold, color: textSecondary }]}>OPERADOR</Text>
                    <Text style={[styles.th, { flex: 1.8, fontFamily: F.bold, color: textSecondary }]}>FECHA / HORA</Text>
                    <Text style={[styles.th, { flex: 2.5, fontFamily: F.bold, color: textSecondary }]}>OBSERVACIONES</Text>
                  </View>

                  {horometerLogs.length === 0 ? (
                    <View style={{ padding: 36, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="speed" size={36} color={textSecondary} style={{ opacity: 0.4, marginBottom: 8 }} />
                      <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15 }}>
                        Sin lecturas de horómetro registradas
                      </Text>
                      <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                        Tan pronto un técnico u operador ingrese las horas en la app móvil se reflejarán automáticamente aquí.
                      </Text>
                    </View>
                  ) : (
                    horometerLogs.map((log) => (
                      <View key={log.id} style={[styles.tableRow, { borderBottomColor: borderCol }]}>
                        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <MaterialIcons name="speed" size={18} color={colors.primary} />
                          <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 14 }}>
                            {log.hours.toFixed(1)} h
                          </Text>
                        </View>

                        <View style={{ flex: 1.5 }}>
                          <View style={[styles.deltaBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <Text style={{ fontFamily: F.bold, color: '#10B981', fontSize: 11 }}>
                              +{log.deltaHours.toFixed(1)} hrs
                            </Text>
                          </View>
                        </View>

                        <Text style={{ flex: 2, fontFamily: F.medium, color: textPrimary, fontSize: 12 }}>
                          {log.userEmail || 'Operador'}
                        </Text>

                        <Text style={{ flex: 1.8, fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>
                          {new Date(log.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </Text>

                        <Text style={{ flex: 2.5, fontFamily: F.regular, color: textSecondary, fontSize: 12 }}>
                          {log.notes || 'Operación regular'}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ==================================================== */}
          {/* TAB 4: CORTES ELÉCTRICOS (GESTIÓN COMPLETA WEB 8081) */}
          {/* ==================================================== */}
          {activeTab === 'outages' && (
            <View>
              {/* Header Row with Actions */}
              <View style={[styles.sectionHeaderFlex, { marginBottom: 16 }]}>
                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 300 }}>
                  <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: isMobile ? 20 : 24 }}>
                    Gestión & Historial de Cortes Eléctricos
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginTop: 4 }}>
                    Bitácora de fallas en red Corpoelec, control de eventos en curso y tiempos de generación de respaldo.
                  </Text>
                </View>

                {/* Top Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {outages.some(o => !o.endTime) && (
                    <TouchableOpacity
                      style={[styles.addPlantBtn, { backgroundColor: '#EF4444' }]}
                      onPress={() => {
                        const active = outages.find(o => !o.endTime);
                        if (active) handleFinalizeOutage(active);
                      }}
                    >
                      <MaterialCommunityIcons name="flash-off" size={17} color="#FFFFFF" />
                      <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 12 }}>
                        ⚡ Finalizar Corte Activo
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.addPlantBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenAddOutage()}
                  >
                    <MaterialIcons name="add" size={18} color={isDark ? '#001136' : '#FFFFFF'} />
                    <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 12 }}>
                      + Anexar Corte Eléctrico
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* KPI Bar for Outages */}
              <View style={[styles.kpiRowOutages, { marginBottom: 16 }]}>
                <View style={[styles.miniStatBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 11 }}>TOTAL REGISTRADOS</Text>
                  <Text style={{ fontFamily: F.extrabold, color: colors.primary, fontSize: 20, marginTop: 2 }}>
                    {outages.length}
                  </Text>
                </View>

                <View style={[styles.miniStatBox, { backgroundColor: cardBg, borderColor: outages.some(o => !o.endTime) ? '#EF4444' : borderCol }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.statusDot, { backgroundColor: outages.some(o => !o.endTime) ? '#EF4444' : '#10B981' }]} />
                    <Text style={{ fontFamily: F.bold, color: outages.some(o => !o.endTime) ? '#EF4444' : textSecondary, fontSize: 11 }}>
                      CORTES ACTIVOS
                    </Text>
                  </View>
                  <Text style={{ fontFamily: F.extrabold, color: outages.some(o => !o.endTime) ? '#EF4444' : textPrimary, fontSize: 20, marginTop: 2 }}>
                    {outages.filter(o => !o.endTime).length}
                  </Text>
                </View>

                <View style={[styles.miniStatBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 11 }}>RESTABLECIDOS</Text>
                  <Text style={{ fontFamily: F.extrabold, color: '#10B981', fontSize: 20, marginTop: 2 }}>
                    {outages.filter(o => o.endTime).length}
                  </Text>
                </View>

                <View style={[styles.miniStatBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 11 }}>HORAS TOTALES APAGÓN</Text>
                  <Text style={{ fontFamily: F.extrabold, color: colors.primary, fontSize: 20, marginTop: 2 }}>
                    {stats.totalBlackoutHours} h
                  </Text>
                </View>
              </View>

              {/* Filter Row for Outages */}
              <View style={[styles.fleetFilterCard, { backgroundColor: cardBg, borderColor: borderCol, marginBottom: 16 }]}>
                <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16, alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
                  {/* Status Filter */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 11 }}>Filtrar Estado:</Text>
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        { backgroundColor: inputBg, borderColor: selectedOutageFilter === 'all' ? colors.primary : borderCol },
                        selectedOutageFilter === 'all' && { backgroundColor: colors.primary, borderWidth: 1 }
                      ]}
                      onPress={() => setSelectedOutageFilter('all')}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedOutageFilter === 'all' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                        Todos ({outages.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        { backgroundColor: inputBg, borderColor: selectedOutageFilter === 'active' ? '#EF4444' : borderCol },
                        selectedOutageFilter === 'active' && { backgroundColor: '#EF4444', borderWidth: 1 }
                      ]}
                      onPress={() => setSelectedOutageFilter('active')}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedOutageFilter === 'active' ? '#FFFFFF' : textPrimary }}>
                        🔴 Activos ({outages.filter(o => !o.endTime).length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        { backgroundColor: inputBg, borderColor: selectedOutageFilter === 'resolved' ? '#10B981' : borderCol },
                        selectedOutageFilter === 'resolved' && { backgroundColor: '#10B981', borderWidth: 1 }
                      ]}
                      onPress={() => setSelectedOutageFilter('resolved')}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedOutageFilter === 'resolved' ? '#FFFFFF' : textPrimary }}>
                        🟢 Restablecidos ({outages.filter(o => o.endTime).length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Generator Filter */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 11 }}>Por Planta:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            { backgroundColor: inputBg, borderColor: selectedOutageGenFilter === 'all' ? colors.primary : borderCol },
                            selectedOutageGenFilter === 'all' && { backgroundColor: colors.primary, borderWidth: 1 }
                          ]}
                          onPress={() => setSelectedOutageGenFilter('all')}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedOutageGenFilter === 'all' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                            Todas
                          </Text>
                        </TouchableOpacity>
                        {generators.map(g => {
                          const count = outages.filter(o => o.generatorId === g.id).length;
                          const isSel = selectedOutageGenFilter === g.id;
                          return (
                            <TouchableOpacity
                              key={g.id}
                              style={[
                                styles.filterChip,
                                { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol },
                                isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                              ]}
                              onPress={() => setSelectedOutageGenFilter(g.id)}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                                {g.name} ({count})
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </View>

              {/* Table / List of Outages */}
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={[styles.tableCard, { backgroundColor: cardBg }]}>
                <View style={{ minWidth: 960 }}>
                  <View style={[styles.tableHeader, { borderBottomColor: borderCol }]}>
                    <Text style={[styles.th, { flex: 1.8, fontFamily: F.bold, color: textSecondary }]}>ESTADO DEL CORTE</Text>
                    <Text style={[styles.th, { flex: 2.2, fontFamily: F.bold, color: textSecondary }]}>PLANTA ELÉCTRICA</Text>
                    <Text style={[styles.th, { flex: 2, fontFamily: F.bold, color: textSecondary }]}>INICIO DEL APAGÓN</Text>
                    <Text style={[styles.th, { flex: 2, fontFamily: F.bold, color: textSecondary }]}>RESTABLECIMIENTO</Text>
                    <Text style={[styles.th, { flex: 1.4, fontFamily: F.bold, color: textSecondary }]}>DURACIÓN</Text>
                    <Text style={[styles.th, { flex: 1.4, fontFamily: F.bold, color: textSecondary }]}>ATS AUTO</Text>
                    <Text style={[styles.th, { flex: 2.4, fontFamily: F.bold, color: textSecondary }]}>NOTAS / CAUSA</Text>
                    <Text style={[styles.th, { flex: 1.6, textAlign: 'right', fontFamily: F.bold, color: textSecondary }]}>ACCIONES</Text>
                  </View>

                  {filteredOutages.length === 0 ? (
                    <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name="flash" size={40} color="#10B981" style={{ marginBottom: 10 }} />
                      <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15 }}>
                        No hay registros de cortes eléctricos
                      </Text>
                      <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center', maxWidth: 420 }}>
                        No se encontraron eventos coincidentes con los filtros aplicados. Puedes anexar un nuevo corte usando el botón superior.
                      </Text>
                      <TouchableOpacity
                        style={[styles.addPlantBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                        onPress={() => handleOpenAddOutage()}
                      >
                        <MaterialIcons name="add" size={17} color={isDark ? '#001136' : '#FFFFFF'} />
                        <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 12 }}>
                          + Anexar Corte Eléctrico
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    filteredOutages.map((o) => {
                      const isActive = !o.endTime;
                      const matchGen = generators.find(g => g.id === o.generatorId);

                      return (
                        <View key={o.id} style={[styles.tableRow, { borderBottomColor: borderCol }]}>
                          {/* Estado */}
                          <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[styles.statusDot, { backgroundColor: isActive ? '#EF4444' : '#10B981' }]} />
                            <View>
                              <Text style={{ fontFamily: F.bold, color: isActive ? '#EF4444' : '#10B981', fontSize: 11 }}>
                                {isActive ? 'CORTE ACTIVO' : 'RESTABLECIDO'}
                              </Text>
                              {isActive && (
                                <Text style={{ fontFamily: F.regular, color: '#EF4444', fontSize: 9 }}>
                                  (En curso)
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* Planta Asociada */}
                          <View style={{ flex: 2.2 }}>
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }} numberOfLines={1}>
                              {matchGen?.name || 'Planta No Identificada'}
                            </Text>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 10 }}>
                              {matchGen?.companyName || 'Empresas del Valle'}
                            </Text>
                          </View>

                          {/* Inicio Apagón */}
                          <Text style={{ flex: 2, fontFamily: F.medium, color: textPrimary, fontSize: 12 }}>
                            {new Date(o.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </Text>

                          {/* Restablecimiento */}
                          <Text style={{ flex: 2, fontFamily: F.medium, color: isActive ? '#EF4444' : textSecondary, fontSize: 12 }}>
                            {o.endTime ? new Date(o.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '⚡ En curso...'}
                          </Text>

                          {/* Duración */}
                          <Text style={{ flex: 1.4, fontFamily: F.extrabold, color: isActive ? '#EF4444' : colors.primary, fontSize: 12 }}>
                            {o.durationMinutes ? `${o.durationMinutes} min (${(o.durationMinutes / 60).toFixed(1)}h)` : 'Calculando...'}
                          </Text>

                          {/* Auto Start */}
                          <View style={{ flex: 1.4 }}>
                            <Text style={{ fontFamily: F.semibold, color: o.generatorStarted ? '#10B981' : '#F59E0B', fontSize: 11 }}>
                              {o.generatorStarted ? '✅ Sí (ATS)' : '⚠️ Manual'}
                            </Text>
                          </View>

                          {/* Notas */}
                          <Text style={{ flex: 2.4, fontFamily: F.regular, color: textSecondary, fontSize: 11 }} numberOfLines={2}>
                            {o.notes || 'Falla en red general Corpoelec'}
                          </Text>

                          {/* Acciones */}
                          <View style={{ flex: 1.6, flexDirection: 'row', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
                            {isActive && (
                              <TouchableOpacity
                                onPress={() => handleFinalizeOutage(o)}
                                style={[styles.smallActionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                              >
                                <MaterialIcons name="power" size={15} color="#10B981" />
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity
                              onPress={() => handleOpenEditOutage(o)}
                              style={[styles.smallActionBtn, { backgroundColor: isDark ? 'rgba(189,210,254,0.1)' : 'rgba(0,17,54,0.06)' }]}
                            >
                              <MaterialIcons name="edit" size={15} color={colors.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleDeleteOutage(o)}
                              style={[styles.smallActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                            >
                              <MaterialIcons name="delete-outline" size={15} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ==================================================== */}
          {/* TAB 5: MANTENIMIENTOS REALIZADOS */}
          {/* ==================================================== */}
          {activeTab === 'services' && (
            <View>
              <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: isMobile ? 20 : 24, marginBottom: 4 }}>
                Registro Técnico de Mantenimientos
              </Text>
              <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginBottom: 20 }}>
                Historial de servicios realizados a las plantas eléctricas sin cargos ni anexos financieros.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={[styles.tableCard, { backgroundColor: cardBg }]}>
                <View style={{ minWidth: 720 }}>
                  <View style={[styles.tableHeader, { borderBottomColor: borderCol }]}>
                    <Text style={[styles.th, { flex: 2, fontFamily: F.bold, color: textSecondary }]}>PLANTA</Text>
                    <Text style={[styles.th, { flex: 2.2, fontFamily: F.bold, color: textSecondary }]}>TIPO DE SERVICIO</Text>
                    <Text style={[styles.th, { flex: 1.3, fontFamily: F.bold, color: textSecondary }]}>HORÓMETRO</Text>
                    <Text style={[styles.th, { flex: 1.5, fontFamily: F.bold, color: textSecondary }]}>FECHA</Text>
                    <Text style={[styles.th, { flex: 2, fontFamily: F.bold, color: textSecondary }]}>TÉCNICO</Text>
                    <Text style={[styles.th, { flex: 2.5, fontFamily: F.bold, color: textSecondary }]}>DETALLE TÉCNICO</Text>
                  </View>

                  {services.length === 0 ? (
                    <View style={{ padding: 36, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="build" size={36} color={textSecondary} style={{ opacity: 0.4, marginBottom: 8 }} />
                      <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15 }}>
                        Sin mantenimientos registrados
                      </Text>
                      <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                        Los cambios de aceite, filtros y chequeos técnicos ejecutados se registrarán en esta bitácora.
                      </Text>
                    </View>
                  ) : (
                    services.map((s) => (
                      <View key={s.id} style={[styles.tableRow, { borderBottomColor: borderCol }]}>
                        <Text style={{ flex: 2, fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                          Planta Principal
                        </Text>

                        <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialIcons name={(COMPONENT_ICONS[s.serviceType] as any) || 'build'} size={16} color={colors.primary} />
                          <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                            {COMPONENT_NAMES[s.serviceType] || 'Mantenimiento Preventivo'}
                          </Text>
                        </View>

                        <Text style={{ flex: 1.3, fontFamily: F.extrabold, color: colors.primary, fontSize: 13 }}>
                          {s.horometer} h
                        </Text>

                        <Text style={{ flex: 1.5, fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                          {s.date}
                        </Text>

                        <Text style={{ flex: 2, fontFamily: F.semibold, color: textPrimary, fontSize: 12 }}>
                          {s.performedBy || 'Personal Autorizado'}
                        </Text>

                        <Text style={{ flex: 2.5, fontFamily: F.regular, color: textSecondary, fontSize: 12 }}>
                          {s.notes || 'Servicio rutinario'}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ==================================================== */}
          {/* TAB: GESTIÓN DE FLOTA DE PLANTAS ELÉCTRICAS (EDITABLE) */}
          {/* ==================================================== */}
          {activeTab === 'generators' && (
            <View>
              <View style={[styles.fleetHeaderRow, { flexDirection: isMobile ? 'column' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: isMobile ? 20 : 24 }}>
                    Flota de Plantas Eléctricas ({generators.length})
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginTop: 2 }}>
                    Edita ubicación, horómetros, mantenimientos preventivos y genera informes ejecutivos por planta.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: isMobile ? 12 : 0 }}>
                  <TouchableOpacity 
                    style={[styles.addPlantBtn, { backgroundColor: '#00ae78' }]}
                    onPress={() => setSelectedReportPlant(activeGenerator)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="assessment" size={18} color="#FFFFFF" />
                    <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 13 }}>
                      Informe Ejecutivo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.addPlantBtn, { backgroundColor: colors.primary }]}
                    onPress={handleOpenAddPlant}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="add" size={18} color={isDark ? '#001136' : '#FFFFFF'} />
                    <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 13 }}>
                      Anexar Nueva Planta
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Multi-Plant Operation Information Card */}
              <View style={[styles.multiGenBanner, { backgroundColor: isDark ? 'rgba(10,37,88,0.5)' : '#F0F5FF', borderColor: isDark ? '#2f4579' : '#BED6FF' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="hub" size={20} color={colors.primary} />
                  <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 13 }}>
                    Operación Multi-Planta Simultánea & Descentralizada
                  </Text>
                </View>
                <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                  En Empresas del Valle, múltiples plantas eléctricas pueden estar operando al mismo tiempo en diferentes empresas, sedes y departamentos. Cada grupo electrógeno acumula sus horas y eventos de manera independiente. El botón <Text style={{ fontFamily: F.bold }}>"Ver en Móvil"</Text> únicamente selecciona cuál se visualiza en la pantalla del celular (puerto 8082).
                </Text>
                {/* Status Summary Pills */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <View style={[styles.microSummaryPill, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#EF4444' }]}>
                    <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={{ fontFamily: F.bold, color: '#EF4444', fontSize: 10 }}>
                      {generators.filter(g => g.status === 'running').length} EN MARCHA (OPERATIVAS)
                    </Text>
                  </View>
                  <View style={[styles.microSummaryPill, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10B981' }]}>
                    <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                    <Text style={{ fontFamily: F.bold, color: '#10B981', fontSize: 10 }}>
                      {generators.filter(g => g.status === 'standby').length} EN STANDBY (LISTAS)
                    </Text>
                  </View>
                  <View style={[styles.microSummaryPill, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: '#F59E0B' }]}>
                    <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={{ fontFamily: F.bold, color: '#F59E0B', fontSize: 10 }}>
                      {generators.filter(g => g.status === 'maintenance').length} EN MANTENIMIENTO
                    </Text>
                  </View>
                </View>
              </View>

              {/* Filtros de Empresa y Departamento */}
              <View style={[styles.filterBarCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MaterialIcons name="filter-list" size={16} color={colors.primary} />
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                    Filtros de Organización:
                  </Text>
                </View>

                {/* Filtro Empresa */}
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, marginBottom: 4 }}>
                    Por Empresa:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          { backgroundColor: inputBg, borderColor: selectedCompanyFilter === 'all' ? colors.primary : borderCol },
                          selectedCompanyFilter === 'all' && { backgroundColor: colors.primary, borderWidth: 1 }
                        ]}
                        onPress={() => setSelectedCompanyFilter('all')}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedCompanyFilter === 'all' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                          Todas ({generators.length})
                        </Text>
                      </TouchableOpacity>
                      {companies.map((c) => {
                        const count = generators.filter(g => g.companyId === c.id).length;
                        const isSel = selectedCompanyFilter === c.id;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[
                              styles.filterChip,
                              { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol },
                              isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                            ]}
                            onPress={() => setSelectedCompanyFilter(c.id)}
                          >
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                              {c.name} ({count})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Filtro Departamento */}
                <View>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, marginBottom: 4 }}>
                    Por Departamento:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          { backgroundColor: inputBg, borderColor: selectedDeptFilter === 'all' ? '#00ae78' : borderCol },
                          selectedDeptFilter === 'all' && { backgroundColor: '#00ae78', borderWidth: 1 }
                        ]}
                        onPress={() => setSelectedDeptFilter('all')}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedDeptFilter === 'all' ? '#FFFFFF' : textPrimary }}>
                          Todos los Deptos
                        </Text>
                      </TouchableOpacity>
                      {departments.map((d) => {
                        const count = generators.filter(g => g.departmentId === d.id).length;
                        const isSel = selectedDeptFilter === d.id;
                        return (
                          <TouchableOpacity
                            key={d.id}
                            style={[
                              styles.filterChip,
                              { backgroundColor: inputBg, borderColor: isSel ? '#00ae78' : borderCol },
                              isSel && { backgroundColor: '#00ae78', borderWidth: 1 }
                            ]}
                            onPress={() => setSelectedDeptFilter(d.id)}
                          >
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? '#FFFFFF' : textPrimary }}>
                              {d.name} ({count})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Filtro Estado Operativo (Multi-Planta) */}
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, marginBottom: 4 }}>
                    Por Estado Operativo:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          { backgroundColor: inputBg, borderColor: selectedStatusFilter === 'all' ? colors.primary : borderCol },
                          selectedStatusFilter === 'all' && { backgroundColor: colors.primary, borderWidth: 1 }
                        ]}
                        onPress={() => setSelectedStatusFilter('all')}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedStatusFilter === 'all' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                          Todos ({generators.length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          { backgroundColor: inputBg, borderColor: selectedStatusFilter === 'standby' ? '#10B981' : borderCol },
                          selectedStatusFilter === 'standby' && { backgroundColor: '#10B981', borderWidth: 1 }
                        ]}
                        onPress={() => setSelectedStatusFilter('standby')}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedStatusFilter === 'standby' ? '#FFFFFF' : textPrimary }}>
                          🟢 Standby ({generators.filter(g => g.status === 'standby').length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          { backgroundColor: inputBg, borderColor: selectedStatusFilter === 'running' ? '#EF4444' : borderCol },
                          selectedStatusFilter === 'running' && { backgroundColor: '#EF4444', borderWidth: 1 }
                        ]}
                        onPress={() => setSelectedStatusFilter('running')}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedStatusFilter === 'running' ? '#FFFFFF' : textPrimary }}>
                          ⚡ En Marcha ({generators.filter(g => g.status === 'running').length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          { backgroundColor: inputBg, borderColor: selectedStatusFilter === 'maintenance' ? '#F59E0B' : borderCol },
                          selectedStatusFilter === 'maintenance' && { backgroundColor: '#F59E0B', borderWidth: 1 }
                        ]}
                        onPress={() => setSelectedStatusFilter('maintenance')}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedStatusFilter === 'maintenance' ? '#FFFFFF' : textPrimary }}>
                          🟡 Mantenimiento ({generators.filter(g => g.status === 'maintenance').length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          { backgroundColor: inputBg, borderColor: selectedStatusFilter === 'offline' ? '#6B7280' : borderCol },
                          selectedStatusFilter === 'offline' && { backgroundColor: '#6B7280', borderWidth: 1 }
                        ]}
                        onPress={() => setSelectedStatusFilter('offline')}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: selectedStatusFilter === 'offline' ? '#FFFFFF' : textPrimary }}>
                          🔴 Fuera de Servicio ({generators.filter(g => g.status === 'offline').length})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Plant Cards Grid */}
              <View style={styles.plantGridContainer}>
                {generators.length === 0 ? (
                  <View style={[styles.emptyFilterBox, { backgroundColor: cardBg, borderColor: borderCol, width: '100%', padding: 40 }]}>
                    <MaterialCommunityIcons name="engine-off" size={54} color={colors.primary} style={{ opacity: 0.6, marginBottom: 12 }} />
                    <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 18, textAlign: 'center' }}>
                      No hay plantas eléctricas registradas en la base de datos
                    </Text>
                    <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginTop: 6, marginBottom: 20, textAlign: 'center', maxWidth: 520 }}>
                      Tu flota de generadores en Supabase está actualmente vacía. Haz clic en el botón a continuación para registrar tu primera planta y comenzar el monitoreo en tiempo real.
                    </Text>
                    <TouchableOpacity
                      style={[styles.addPlantBtn, { backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 12 }]}
                      onPress={handleOpenAddPlant}
                    >
                      <MaterialIcons name="add" size={20} color={isDark ? '#001136' : '#FFFFFF'} />
                      <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 13 }}>
                        + Anexar Primera Planta
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : filteredGenerators.length === 0 ? (
                  <View style={[styles.emptyFilterBox, { backgroundColor: cardBg, borderColor: borderCol, width: '100%' }]}>
                    <MaterialCommunityIcons name="engine-off" size={42} color={textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                      No hay plantas que coincidan con los filtros seleccionados
                    </Text>
                    <TouchableOpacity
                      style={[styles.resetFilterBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setSelectedCompanyFilter('all');
                        setSelectedDeptFilter('all');
                        setSelectedStatusFilter('all');
                      }}
                    >
                      <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 12 }}>
                        Restablecer Filtros
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  filteredGenerators.map((gen) => {
                    const isActive = gen.id === activeGenerator?.id;
                    const interval = gen.serviceIntervalHours > 0 ? gen.serviceIntervalHours : 200;
                    // Proteger contra datos inconsistentes donde último servicio supere el horómetro actual
                    const validLastService = (gen.lastServiceHours >= 0 && gen.lastServiceHours <= gen.currentHours)
                      ? gen.lastServiceHours
                      : gen.currentHours;

                    // Próximo mantenimiento en horómetro objetivo (Meta de horómetro para el próximo servicio)
                    // Ej: 3500 h actual y cada 200 h -> Próximo en 3700.0 h
                    const nextTargetHours = validLastService > 0
                      ? validLastService + interval
                      : (gen.currentHours > 0 ? gen.currentHours + interval : interval);

                    const remainingHours = Math.max(0, Number((nextTargetHours - gen.currentHours).toFixed(1)));
                    const statusInfo = getServiceStatus(remainingHours);

                    // Operational status styling
                    const isRunning = gen.status === 'running';
                    const isMaint = gen.status === 'maintenance';
                    const isOffline = gen.status === 'offline';
                    const opColor = isRunning ? '#EF4444' : isMaint ? '#F59E0B' : isOffline ? '#6B7280' : '#10B981';
                    const opBg = isRunning ? 'rgba(239, 68, 68, 0.15)' : isMaint ? 'rgba(245, 158, 11, 0.15)' : isOffline ? 'rgba(107, 114, 128, 0.15)' : 'rgba(16, 185, 129, 0.15)';
                    const opLabel = isRunning ? 'EN MARCHA (GENERANDO)' : isMaint ? 'EN MANTENIMIENTO' : isOffline ? 'FUERA DE SERVICIO' : 'OPERATIVA (STANDBY)';

                    return (
                      <View 
                        key={gen.id} 
                        style={[
                          styles.genCardBig, 
                          { 
                            backgroundColor: cardBg, 
                            borderColor: isActive ? colors.primary : borderCol,
                            borderWidth: isActive ? 1.5 : 1,
                            width: isWide ? '48.5%' : '100%' 
                          }
                        ]}
                      >
                        {/* Top Badges Row: Operational Status + Direct Control + Mobile Focus */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View style={[styles.statusPill, { backgroundColor: opBg, borderColor: opColor, borderWidth: 1 }]}>
                              <Text style={{ fontFamily: F.bold, color: opColor, fontSize: 10 }}>
                                ● {opLabel}
                              </Text>
                            </View>

                            {/* 1-Click Operational Toggle: Allows multiple plants to run at the same time */}
                            {isRunning ? (
                              <TouchableOpacity
                                style={[styles.quickOpBtn, { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: '#3B82F6' }]}
                                onPress={() => handleToggleGenStatus(gen, 'standby')}
                              >
                                <MaterialIcons name="pause-circle-filled" size={13} color="#3B82F6" />
                                <Text style={{ fontFamily: F.bold, color: '#3B82F6', fontSize: 10 }}>Pasar a Standby</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.quickOpBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#EF4444' }]}
                                onPress={() => handleToggleGenStatus(gen, 'running')}
                              >
                                <MaterialIcons name="play-circle-fill" size={13} color="#EF4444" />
                                <Text style={{ fontFamily: F.bold, color: '#EF4444', fontSize: 10 }}>Poner en Marcha</Text>
                              </TouchableOpacity>
                            )}

                            {/* Cycle through other states (maintenance / offline) */}
                            <TouchableOpacity
                              style={[styles.cycleStatusBtn, { backgroundColor: inputBg, borderColor: borderCol }]}
                              onPress={() => {
                                const nextOrder: Record<GeneratorStatus, GeneratorStatus> = {
                                  standby: 'running',
                                  running: 'maintenance',
                                  maintenance: 'offline',
                                  offline: 'standby'
                                };
                                handleToggleGenStatus(gen, nextOrder[gen.status] || 'standby');
                              }}
                            >
                              <MaterialIcons name="swap-horiz" size={12} color={colors.primary} />
                              <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 10 }}>Estado</Text>
                            </TouchableOpacity>
                          </View>

                          {/* App Mobile Visualizer Focus */}
                          {isActive ? (
                            <View style={[styles.activeFleetPill, { backgroundColor: isDark ? 'rgba(189,210,254,0.18)' : 'rgba(0,17,54,0.1)' }]}>
                              <MaterialIcons name="phone-android" size={12} color={colors.primary} />
                              <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 10 }}>
                                EN PANTALLA MÓVIL (8082)
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[styles.selectForAppPill, { borderColor: borderCol, backgroundColor: inputBg }]}
                              onPress={() => selectGenerator(gen.id)}
                            >
                              <MaterialIcons name="phone-android" size={11} color={textSecondary} />
                              <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 10 }}>
                                Ver en Móvil (8082)
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Middle: Image + Specs */}
                        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14, alignItems: isMobile ? 'flex-start' : 'center' }}>
                          <View style={[styles.genImgContainer, { backgroundColor: isDark ? '#0a2558' : '#F8FAFC' }]}>
                            {gen.customImageUri || gen.imageUrl ? (
                              <Image source={{ uri: gen.customImageUri || gen.imageUrl }} style={{ width: 100, height: 85, borderRadius: 8 }} resizeMode="cover" />
                            ) : gen.catalogImageRes ? (
                              <Image source={gen.catalogImageRes} style={{ width: 100, height: 85 }} resizeMode="contain" />
                            ) : (
                              <MaterialCommunityIcons name="engine" size={48} color={colors.primary} />
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                              {gen.name}
                            </Text>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12, marginTop: 2 }}>
                              {gen.brand} {gen.model} • {gen.capacityKva} kVA ({Math.round(gen.capacityKva * 0.8)} kW) • {gen.fuelType.toUpperCase()}
                            </Text>
                            
                            {/* Location with Pin */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <MaterialIcons name="place" size={14} color="#EF4444" />
                              <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }} numberOfLines={1}>
                                {gen.location || 'Sala de Máquinas - Edificio Central'}
                              </Text>
                            </View>

                            {/* Organization: Company and Department Badges */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              <View style={[styles.microBadge, { backgroundColor: isDark ? 'rgba(189,210,254,0.1)' : '#F1F5F9' }]}>
                                <MaterialIcons name="business" size={11} color={colors.primary} />
                                <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 10 }}>
                                  {gen.companyName || 'Empresas del Valle'}
                                </Text>
                              </View>
                              {gen.departmentName && (
                                <View style={[styles.microBadge, { backgroundColor: isDark ? 'rgba(0,174,120,0.1)' : '#DCFCE7' }]}>
                                  <MaterialIcons name="folder-special" size={11} color="#00ae78" />
                                  <Text style={{ fontFamily: F.bold, color: '#00ae78', fontSize: 10 }}>
                                    {gen.departmentName}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {gen.serialNumber && (
                              <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 10, marginTop: 4 }}>
                                Serial: {gen.serialNumber}
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Technical Metrics Tray */}
                        <View style={[styles.genMetricsTray, { backgroundColor: inputBg }]}>
                          <View style={styles.metricBlock}>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 10 }}>HORÓMETRO</Text>
                            <Text style={{ fontFamily: F.extrabold, color: colors.primary, fontSize: 15 }}>
                              {gen.currentHours.toFixed(1)} h
                            </Text>
                          </View>
                          <View style={styles.metricBlock}>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 10 }}>INTERVALO</Text>
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                              Cada {gen.serviceIntervalHours} h
                            </Text>
                          </View>
                          <View style={styles.metricBlock}>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 10 }}>ÚLTIMO SERV.</Text>
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                              {validLastService.toFixed(1)} h
                            </Text>
                          </View>
                          <View style={styles.metricBlock}>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 10 }}>PRÓXIMO EN</Text>
                            <Text style={{ fontFamily: F.extrabold, color: statusInfo.color, fontSize: 14 }}>
                              {nextTargetHours.toFixed(1)} h
                            </Text>
                            <Text style={{ fontFamily: F.semibold, color: remainingHours <= 20 ? statusInfo.color : textSecondary, fontSize: 9 }}>
                              {remainingHours > 0 ? `(restan ${remainingHours.toFixed(1)} h)` : '¡VENCIDO!'}
                            </Text>
                          </View>
                        </View>

                        {/* Action Buttons Bar */}
                        <View style={styles.genCardActionsRow}>
                          {/* Generar Informe Ejecutivo */}
                          <TouchableOpacity
                            style={[styles.reportPlantBtn, { backgroundColor: '#00ae78' }]}
                            onPress={() => setSelectedReportPlant(gen)}
                            activeOpacity={0.85}
                          >
                            <MaterialIcons name="assessment" size={14} color="#FFFFFF" />
                            <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 11 }}>
                              Informe
                            </Text>
                          </TouchableOpacity>

                          {/* Anexar Corte Eléctrico Directo */}
                          <TouchableOpacity
                            style={[styles.reportPlantBtn, { backgroundColor: '#F59E0B' }]}
                            onPress={() => handleOpenAddOutage(gen.id)}
                            activeOpacity={0.85}
                          >
                            <MaterialCommunityIcons name="flash-off" size={14} color="#FFFFFF" />
                            <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 11 }}>
                              + Corte
                            </Text>
                          </TouchableOpacity>

                          {/* Editar Datos */}
                          <TouchableOpacity
                            style={[styles.editPlantBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleOpenEditPlant(gen)}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name="edit" size={14} color={isDark ? '#001136' : '#FFFFFF'} />
                            <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 11 }}>
                              Editar
                            </Text>
                          </TouchableOpacity>

                          {/* Seleccionar para ver en app */}
                          <TouchableOpacity
                            style={[
                              styles.setActiveBtn, 
                              { 
                                borderColor: isActive ? colors.primary : borderCol,
                                backgroundColor: isActive ? (isDark ? 'rgba(189,210,254,0.15)' : 'rgba(0,17,54,0.06)') : 'transparent'
                              }
                            ]}
                            onPress={() => selectGenerator(gen.id)}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name="phone-android" size={14} color={isActive ? colors.primary : textSecondary} />
                            <Text style={{ fontFamily: F.bold, color: isActive ? colors.primary : textSecondary, fontSize: 11 }}>
                              {isActive ? 'En Móvil' : 'Ver en Móvil'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deletePlantBtn}
                            onPress={() => handleDeletePlant(gen)}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>

                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* ==================================================== */}
          {/* TAB: ORGANIZACIÓN POR EMPRESAS & DEPARTAMENTOS */}
          {/* ==================================================== */}
          {activeTab === 'companies' && (
            <View>
              {/* Header */}
              <View style={[styles.fleetHeaderRow, { flexDirection: isMobile ? 'column' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: isMobile ? 20 : 24 }}>
                    Organización Corporativa: Empresas & Departamentos
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginTop: 2 }}>
                    Organiza las plantas eléctricas y operadores por empresas y áreas técnicas, con imágenes personalizadas.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: isMobile ? 12 : 0 }}>
                  <TouchableOpacity 
                    style={[styles.addPlantBtn, { backgroundColor: colors.primary }]}
                    onPress={companySubTab === 'companies' ? handleOpenAddCompany : handleOpenAddDept}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="add" size={18} color={isDark ? '#001136' : '#FFFFFF'} />
                    <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 13 }}>
                      {companySubTab === 'companies' ? 'Nueva Empresa' : 'Nuevo Departamento'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Subtab Switcher */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[
                    styles.subTabBtn,
                    { backgroundColor: cardBg, borderColor: borderCol, borderWidth: 1 },
                    companySubTab === 'companies' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setCompanySubTab('companies')}
                >
                  <MaterialIcons 
                    name="business" 
                    size={16} 
                    color={companySubTab === 'companies' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary} 
                  />
                  <Text style={{
                    fontFamily: F.bold,
                    color: companySubTab === 'companies' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary,
                    fontSize: 13
                  }}>
                    Empresas ({companies.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.subTabBtn,
                    { backgroundColor: cardBg, borderColor: borderCol, borderWidth: 1 },
                    companySubTab === 'departments' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setCompanySubTab('departments')}
                >
                  <MaterialIcons 
                    name="domain" 
                    size={16} 
                    color={companySubTab === 'departments' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary} 
                  />
                  <Text style={{
                    fontFamily: F.bold,
                    color: companySubTab === 'departments' ? (isDark ? '#001136' : '#FFFFFF') : textPrimary,
                    fontSize: 13
                  }}>
                    Departamentos ({departments.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Subtab 1: Companies Grid */}
              {companySubTab === 'companies' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                  {companies.map((comp) => {
                    const compGens = generators.filter(g => g.companyId === comp.id);
                    const compDepts = departments.filter(d => d.companyId === comp.id);
                    return (
                      <View 
                        key={comp.id}
                        style={[
                          styles.orgCard,
                          { backgroundColor: cardBg, borderColor: borderCol, width: isWide ? '31.5%' : isTablet ? '48%' : '100%' }
                        ]}
                      >
                        {/* Image Banner */}
                        <View style={styles.orgCardBanner}>
                          {comp.imageUrl ? (
                            <Image source={{ uri: comp.imageUrl }} style={styles.orgCardImg} resizeMode="cover" />
                          ) : (
                            <View style={[styles.orgCardImgPlaceholder, { backgroundColor: inputBg }]}>
                              <MaterialIcons name="business" size={40} color={colors.primary} />
                            </View>
                          )}
                        </View>

                        {/* Info Body */}
                        <View style={{ padding: 14, flex: 1, justifyContent: 'space-between' }}>
                          <View>
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                              {comp.name}
                            </Text>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                              {comp.description || 'Sede corporativa de operaciones.'}
                            </Text>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                              <View style={[styles.microBadge, { backgroundColor: isDark ? 'rgba(189,210,254,0.15)' : '#E2E8F0' }]}>
                                <MaterialCommunityIcons name="engine" size={12} color={colors.primary} />
                                <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 11 }}>
                                  {compGens.length} Plantas
                                </Text>
                              </View>
                              <View style={[styles.microBadge, { backgroundColor: isDark ? 'rgba(0,174,120,0.15)' : '#DCFCE7' }]}>
                                <MaterialIcons name="folder-special" size={12} color="#00ae78" />
                                <Text style={{ fontFamily: F.bold, color: '#00ae78', fontSize: 11 }}>
                                  {compDepts.length} Departamentos
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Card Actions */}
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: borderCol }}>
                            <TouchableOpacity
                              style={[styles.smallActionBtn, { backgroundColor: inputBg, flex: 1 }]}
                              onPress={() => handleOpenEditCompany(comp)}
                            >
                              <MaterialIcons name="edit" size={14} color={colors.primary} />
                              <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 11 }}>
                                Editar
                              </Text>
                            </TouchableOpacity>

                            {companies.length > 1 && (
                              <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', width: 36, paddingHorizontal: 0, justifyContent: 'center' }]}
                                onPress={() => handleDeleteCompany(comp)}
                              >
                                <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Subtab 2: Departments Grid */}
              {companySubTab === 'departments' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                  {departments.map((dept) => {
                    const deptGens = generators.filter(g => g.departmentId === dept.id);
                    const parentComp = companies.find(c => c.id === dept.companyId);
                    return (
                      <View 
                        key={dept.id}
                        style={[
                          styles.orgCard,
                          { backgroundColor: cardBg, borderColor: borderCol, width: isWide ? '31.5%' : isTablet ? '48%' : '100%' }
                        ]}
                      >
                        {/* Image Banner */}
                        <View style={styles.orgCardBanner}>
                          {dept.imageUrl ? (
                            <Image source={{ uri: dept.imageUrl }} style={styles.orgCardImg} resizeMode="cover" />
                          ) : (
                            <View style={[styles.orgCardImgPlaceholder, { backgroundColor: inputBg }]}>
                              <MaterialIcons name="domain" size={40} color="#00ae78" />
                            </View>
                          )}
                        </View>

                        {/* Info Body */}
                        <View style={{ padding: 14, flex: 1, justifyContent: 'space-between' }}>
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                              <MaterialIcons name="business" size={12} color={colors.primary} />
                              <Text style={{ fontFamily: F.semibold, color: colors.primary, fontSize: 11 }} numberOfLines={1}>
                                {parentComp?.name || 'Empresas del Valle'}
                              </Text>
                            </View>

                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                              {dept.name}
                            </Text>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                              {dept.description || 'Área técnica y operativa.'}
                            </Text>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                              <View style={[styles.microBadge, { backgroundColor: isDark ? 'rgba(189,210,254,0.15)' : '#E2E8F0' }]}>
                                <MaterialCommunityIcons name="engine" size={12} color={colors.primary} />
                                <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 11 }}>
                                  {deptGens.length} Plantas a cargo
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Card Actions */}
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: borderCol }}>
                            <TouchableOpacity
                              style={[styles.smallActionBtn, { backgroundColor: inputBg, flex: 1 }]}
                              onPress={() => handleOpenEditDept(dept)}
                            >
                              <MaterialIcons name="edit" size={14} color={colors.primary} />
                              <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 11 }}>
                                Editar
                              </Text>
                            </TouchableOpacity>

                            {departments.length > 1 && (
                              <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', width: 36, paddingHorizontal: 0, justifyContent: 'center' }]}
                                onPress={() => handleDeleteDept(dept)}
                              >
                                <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </View>

      {/* ==================================================== */}
      {/* MODAL 1: EDITAR PLANTA ELÉCTRICA (SUPERADMIN) */}
      {/* ==================================================== */}
      <Modal 
        visible={Boolean(editingPlant)} 
        transparent 
        animationType="fade"
        onRequestClose={() => setEditingPlant(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
            
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconBadge, { backgroundColor: isDark ? '#0a2558' : 'rgba(0,17,54,0.08)' }]}>
                  <MaterialIcons name="edit" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                    Editar Planta Eléctrica
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12 }} numberOfLines={1}>
                    {editingPlant?.name} • Edición Super Administrador
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setEditingPlant(null)}
                style={[styles.modalCloseBtn, { backgroundColor: inputBg }]}
              >
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Modal Scrollable Form */}
            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              
              {/* Sección 1: Identificación y Ubicación */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold }]}>
                1. IDENTIFICACIÓN Y UBICACIÓN
              </Text>
              
              <View style={styles.formGrid}>
                <View style={{ flex: 2, minWidth: isMobile ? '100%' : 260 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Nombre de la Planta:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={editPlantName} 
                    onChangeText={setEditPlantName} 
                    placeholder="Ej: Planta Principal Sede Central"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                <View style={{ flex: 2, minWidth: isMobile ? '100%' : 260 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Ubicación Física:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={editPlantLocation} 
                    onChangeText={setEditPlantLocation} 
                    placeholder="Ej: Sala de Máquinas - Edificio Central"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Número de Serie / Código:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={editPlantSerial} 
                    onChangeText={setEditPlantSerial} 
                    placeholder="BPG-2024-C125-089"
                    placeholderTextColor={textSecondary}
                  />
                </View>
              </View>

              {/* Sección 2: Organización por Empresa & Departamento */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 20 }]}>
                2. ORGANIZACIÓN: EMPRESA & DEPARTAMENTO
              </Text>

              <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Empresa Perteneciente:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {companies.map((c) => {
                        const isSel = (editPlantCompanyId || companies[0]?.id) === c.id;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[
                              styles.chipBtn,
                              { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol },
                              isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                            ]}
                            onPress={() => setEditPlantCompanyId(c.id)}
                          >
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                              {c.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Departamento:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {departments.map((d) => {
                        const isSel = (editPlantDeptId || departments[0]?.id) === d.id;
                        return (
                          <TouchableOpacity
                            key={d.id}
                            style={[
                              styles.chipBtn,
                              { backgroundColor: inputBg, borderColor: isSel ? '#00ae78' : borderCol },
                              isSel && { backgroundColor: '#00ae78', borderWidth: 1 }
                            ]}
                            onPress={() => setEditPlantDeptId(d.id)}
                          >
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? '#FFFFFF' : textPrimary }}>
                              {d.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Sección 3: Telemetría y Horas de Mantenimiento */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 20 }]}>
                3. HORÓMETRO Y MANTENIMIENTO PREVENTIVO
              </Text>

              <View style={styles.formGrid}>
                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 150 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                    Horómetro Actual (Horas):
                  </Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]} 
                    value={editPlantHoro} 
                    onChangeText={setEditPlantHoro} 
                    keyboardType="numeric" 
                  />
                </View>

                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 150 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                    Intervalo de Servicio (Horas):
                  </Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]} 
                    value={editPlantInterval} 
                    onChangeText={setEditPlantInterval} 
                    keyboardType="numeric" 
                    placeholder="200"
                  />
                </View>

                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 150 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                    Último Servicio Realizado en:
                  </Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]} 
                    value={editPlantLastService} 
                    onChangeText={setEditPlantLastService} 
                    keyboardType="numeric" 
                    placeholder="0.0"
                  />
                </View>
              </View>

              {/* Sección 4: Especificaciones de Máquina */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 20 }]}>
                4. ESPECIFICACIONES TÉCNICAS
              </Text>

              <View style={styles.formGrid}>
                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 140 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Marca:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={editPlantBrand} 
                    onChangeText={setEditPlantBrand} 
                  />
                </View>

                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 140 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Modelo:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={editPlantModel} 
                    onChangeText={setEditPlantModel} 
                  />
                </View>

                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 100 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Capacidad kVA:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={editPlantKva} 
                    onChangeText={setEditPlantKva} 
                    keyboardType="numeric" 
                  />
                </View>
              </View>

              {/* Combustible & Estado Chips */}
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Tipo de Combustible:</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {(['diesel', 'gasolina', 'gas'] as FuelType[]).map((ft) => (
                    <TouchableOpacity
                      key={ft}
                      style={[
                        styles.chipBtn,
                        { backgroundColor: inputBg },
                        editPlantFuel === ft && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => setEditPlantFuel(ft)}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: editPlantFuel === ft ? (isDark ? '#001136' : '#FFFFFF') : textSecondary }}>
                        {ft.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Estado Operativo:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {([
                    { id: 'standby', label: 'Standby (Espera de Red)' },
                    { id: 'running', label: 'En Marcha (Suministrando)' },
                    { id: 'maintenance', label: 'En Mantenimiento' },
                    { id: 'offline', label: 'Fuera de Servicio' },
                  ] as { id: GeneratorStatus; label: string }[]).map((st) => (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.chipBtn,
                        { backgroundColor: inputBg },
                        editPlantStatus === st.id && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => setEditPlantStatus(st.id)}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: editPlantStatus === st.id ? (isDark ? '#001136' : '#FFFFFF') : textSecondary }}>
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sección 5: Montar Fotografía / Imagen Personalizada */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 22 }]}>
                5. FOTOGRAFÍA / IMAGEN DE LA PLANTA
              </Text>
              <ImageUploader
                label="Montar Fotografía Real del Grupo Electrógeno (Archivo local o URL):"
                imageUri={editPlantCustomImg}
                onImageChange={setEditPlantCustomImg}
                isDark={isDark}
                presetImages={[
                  { label: 'C125 Insonorizada', uri: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80' },
                  { label: 'C75 Canopy Silencioso', uri: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80' },
                ]}
              />

              {/* Sección 6: Selector de Imagen del Catálogo */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 22 }]}>
                6. O SELECCIONAR ILUSTRACIÓN DEL CATÁLOGO
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {GENERATOR_CATALOG.map((cat, idx) => {
                    const isSelected = editPlantCatalogIdx === idx;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catalogThumbCard,
                          { backgroundColor: inputBg, borderColor: isSelected ? colors.primary : borderCol },
                          isSelected && { borderWidth: 2 }
                        ]}
                        onPress={() => {
                          setEditPlantCatalogIdx(idx);
                          if (!editPlantBrand || editPlantBrand === 'Blue Power Generation') setEditPlantBrand(cat.brand);
                          if (!editPlantModel || editPlantModel === 'C125') setEditPlantModel(cat.model);
                          if (!editPlantKva) setEditPlantKva(String(cat.capacityKva));
                        }}
                      >
                        <Image source={cat.imageRes} style={{ width: 70, height: 55 }} resizeMode="contain" />
                        <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11, marginTop: 4 }}>
                          {cat.model}
                        </Text>
                        <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 9 }}>
                          {cat.capacityKva} kVA
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              {editingPlant && (
                <TouchableOpacity 
                  style={styles.modalDeleteBtn}
                  onPress={() => handleDeletePlant(editingPlant)}
                >
                  <MaterialIcons name="delete" size={16} color="#EF4444" />
                  <Text style={{ fontFamily: F.bold, color: '#EF4444', fontSize: 12 }}>
                    Eliminar
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginLeft: 'auto' }}>
                <TouchableOpacity 
                  style={[styles.cancelBtn, { borderColor: textSecondary }]}
                  onPress={() => setEditingPlant(null)}
                >
                  <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitUserBtn, { backgroundColor: colors.primary, marginTop: 0 }]}
                  onPress={handleSavePlantEdits}
                >
                  <MaterialIcons name="save" size={17} color={isDark ? '#001136' : '#FFFFFF'} />
                  <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF' }}>Guardar Cambios Técnicos</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

      

      {/* ==================================================== */}
      {/* MODAL 2: ANEXAR NUEVA PLANTA ELÉCTRICA */}
      {/* ==================================================== */}
      <Modal 
        visible={showAddPlantModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowAddPlantModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
            
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconBadge, { backgroundColor: isDark ? '#0a2558' : 'rgba(0,17,54,0.08)' }]}>
                  <MaterialIcons name="add-circle" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                    Anexar Nueva Planta Eléctrica
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12 }}>
                    Registrar nuevo grupo electrógeno al sistema de telemetría
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setShowAddPlantModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: inputBg }]}
              >
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Modal Scrollable Form */}
            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold }]}>
                1. DATOS DE IDENTIFICACIÓN & SEDE
              </Text>
              
              <View style={styles.formGrid}>
                <View style={{ flex: 2, minWidth: isMobile ? '100%' : 260 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Nombre de la Planta:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={newPlantName} 
                    onChangeText={setNewPlantName} 
                    placeholder="Ej: Planta Respaldo Servidores / DataCenter"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                <View style={{ flex: 2, minWidth: isMobile ? '100%' : 260 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Ubicación Física:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={newPlantLocation} 
                    onChangeText={setNewPlantLocation} 
                    placeholder="Ej: Sótano 1 - Área Técnica"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Número de Serie:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={newPlantSerial} 
                    onChangeText={setNewPlantSerial} 
                    placeholder="BPG-2024-C75-014"
                    placeholderTextColor={textSecondary}
                  />
                </View>
              </View>

              {/* Organización: Empresa y Departamento */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 20 }]}>
                2. ORGANIZACIÓN: EMPRESA & DEPARTAMENTO
              </Text>
              <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Empresa Sede:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {companies.map((c) => {
                        const isSel = (newPlantCompanyId || companies[0]?.id) === c.id;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[
                              styles.chipBtn,
                              { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol },
                              isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                            ]}
                            onPress={() => setNewPlantCompanyId(c.id)}
                          >
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                              {c.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Departamento:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {departments.map((d) => {
                        const isSel = (newPlantDeptId || departments[0]?.id) === d.id;
                        return (
                          <TouchableOpacity
                            key={d.id}
                            style={[
                              styles.chipBtn,
                              { backgroundColor: inputBg, borderColor: isSel ? '#00ae78' : borderCol },
                              isSel && { backgroundColor: '#00ae78', borderWidth: 1 }
                            ]}
                            onPress={() => setNewPlantDeptId(d.id)}
                          >
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? '#FFFFFF' : textPrimary }}>
                              {d.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Horómetro e Intervalo */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 20 }]}>
                3. HORÓMETRO & INTERVALO
              </Text>

              <View style={styles.formGrid}>
                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 150 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Horómetro Inicial (Horas):</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]} 
                    value={newPlantHoro} 
                    onChangeText={setNewPlantHoro} 
                    keyboardType="numeric" 
                  />
                </View>

                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 150 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Intervalo de Servicio (Horas):</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]} 
                    value={newPlantInterval} 
                    onChangeText={setNewPlantInterval} 
                    keyboardType="numeric" 
                    placeholder="200"
                  />
                </View>

                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 150 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Último Servicio en:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]} 
                    value={newPlantLastService} 
                    onChangeText={setNewPlantLastService} 
                    keyboardType="numeric" 
                    placeholder="0.0"
                  />
                </View>
              </View>

              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 20 }]}>
                4. MODELO Y ESPECIFICACIONES
              </Text>

              <View style={styles.formGrid}>
                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 140 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Marca:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={newPlantBrand} 
                    onChangeText={setNewPlantBrand} 
                  />
                </View>

                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 140 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Modelo:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={newPlantModel} 
                    onChangeText={setNewPlantModel} 
                  />
                </View>

                <View style={{ flex: 1, minWidth: isMobile ? '100%' : 100 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>kVA:</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary }]} 
                    value={newPlantKva} 
                    onChangeText={setNewPlantKva} 
                    keyboardType="numeric" 
                  />
                </View>
              </View>

              {/* Montar Fotografía Real */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 20 }]}>
                5. FOTOGRAFÍA / IMAGEN DE LA PLANTA (MONTAR ARCHIVO)
              </Text>
              <ImageUploader
                label="Montar Fotografía de la Planta (Equipo / Archivo local o URL):"
                imageUri={newPlantCustomImg}
                onImageChange={setNewPlantCustomImg}
                isDark={isDark}
                presetImages={[
                  { label: 'C125 Insonorizada', uri: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80' },
                  { label: 'C75 Canopy Silencioso', uri: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80' },
                ]}
              />

              {/* Selector de Catálogo */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 20 }]}>
                6. O SELECCIONAR MODELO DE CATÁLOGO / FOTOGRAFÍA
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {GENERATOR_CATALOG.map((cat, idx) => {
                    const isSelected = newPlantCatalogIdx === idx;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catalogThumbCard,
                          { backgroundColor: inputBg, borderColor: isSelected ? colors.primary : borderCol },
                          isSelected && { borderWidth: 2 }
                        ]}
                        onPress={() => {
                          setNewPlantCatalogIdx(idx);
                          setNewPlantBrand(cat.brand);
                          setNewPlantModel(cat.model);
                          setNewPlantKva(String(cat.capacityKva));
                          setNewPlantInterval(String(cat.defaultIntervalHours));
                        }}
                      >
                        <Image source={cat.imageRes} style={{ width: 70, height: 55 }} resizeMode="contain" />
                        <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11, marginTop: 4 }}>
                          {cat.model}
                        </Text>
                        <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 9 }}>
                          {cat.capacityKva} kVA
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              <View style={{ flexDirection: 'row', gap: 10, marginLeft: 'auto' }}>
                <TouchableOpacity 
                  style={[styles.cancelBtn, { borderColor: textSecondary }]}
                  onPress={() => setShowAddPlantModal(false)}
                >
                  <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitUserBtn, { backgroundColor: colors.primary, marginTop: 0 }]}
                  onPress={handleCreatePlant}
                >
                  <MaterialIcons name="add" size={17} color={isDark ? '#001136' : '#FFFFFF'} />
                  <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF' }}>Guardar Planta</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

      

      {/* ==================================================== */}
      {/* MODAL 3: EDITAR USUARIO & PLANTA A SU CARGO */}
      {/* ==================================================== */}
      <Modal 
        visible={Boolean(editingUser)} 
        transparent 
        animationType="fade"
        onRequestClose={() => setEditingUser(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
            
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconBadge, { backgroundColor: isDark ? '#0a2558' : 'rgba(0,17,54,0.08)' }]}>
                  <MaterialIcons name="person" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                    Editar Usuario & Asignación de Planta
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12 }}>
                    {editingUser?.email}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setEditingUser(null)}
                style={[styles.modalCloseBtn, { backgroundColor: inputBg }]}
              >
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14 }}>
                <View>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Nombre Completo:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                    value={editUserName}
                    onChangeText={setEditUserName}
                  />
                </View>

                <View>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Rol del Usuario:</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {(['operador', 'tecnico', 'superadmin'] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.chipBtn,
                          { backgroundColor: inputBg },
                          editUserRole === r && { backgroundColor: colors.primary }
                        ]}
                        onPress={() => setEditUserRole(r)}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: editUserRole === r ? (isDark ? '#001136' : '#FFFFFF') : textSecondary }}>
                          {r.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Planta(s) Eléctrica(s) a su Cargo (Selección Múltiple) */}
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.label, { fontFamily: F.bold, color: textPrimary, marginBottom: 0 }]}>
                      Plantas a su Cargo (Selección Múltiple):
                    </Text>
                    <Text style={{ fontFamily: F.semibold, color: colors.primary, fontSize: 11 }}>
                      {editUserGenIds.length} asignada{editUserGenIds.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {generators.map((g) => {
                        const isSel = editUserGenIds.includes(g.id);
                        return (
                          <TouchableOpacity
                            key={g.id}
                            style={[
                              styles.chipBtn,
                              { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol },
                              isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                            ]}
                            onPress={() => {
                              toggleEditUserGenId(g.id);
                              if (g.companyId) setEditUserCompanyId(g.companyId);
                              if (g.departmentId) setEditUserDeptId(g.departmentId);
                            }}
                          >
                            <MaterialCommunityIcons 
                              name={isSel ? "check-circle" : "engine"} 
                              size={15} 
                              color={isSel ? (isDark ? '#001136' : '#FFFFFF') : textSecondary} 
                            />
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                              {g.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Empresa y Departamento */}
                <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Empresa:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {companies.map((c) => {
                          const isSel = (editUserCompanyId || companies[0]?.id) === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[
                                styles.chipBtn,
                                { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol },
                                isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                              ]}
                              onPress={() => setEditUserCompanyId(c.id)}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                                {c.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Departamento:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {departments.map((d) => {
                          const isSel = (editUserDeptId || departments[0]?.id) === d.id;
                          return (
                            <TouchableOpacity
                              key={d.id}
                              style={[
                                styles.chipBtn,
                                { backgroundColor: inputBg, borderColor: isSel ? '#00ae78' : borderCol },
                                isSel && { backgroundColor: '#00ae78', borderWidth: 1 }
                              ]}
                              onPress={() => setEditUserDeptId(d.id)}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? '#FFFFFF' : textPrimary }}>
                                {d.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                </View>

              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              <View style={{ flexDirection: 'row', gap: 10, marginLeft: 'auto' }}>
                <TouchableOpacity 
                  style={[styles.cancelBtn, { borderColor: textSecondary }]}
                  onPress={() => setEditingUser(null)}
                >
                  <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitUserBtn, { backgroundColor: colors.primary, marginTop: 0 }]}
                  onPress={handleSaveUserEdits}
                >
                  <MaterialIcons name="save" size={17} color={isDark ? '#001136' : '#FFFFFF'} />
                  <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF' }}>Guardar Cambios</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

      

      {/* ==================================================== */}
      {/* MODAL 4: EMPRESA (CREAR / EDITAR) */}
      {/* ==================================================== */}
      <Modal 
        visible={showCompanyModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowCompanyModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
            
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconBadge, { backgroundColor: isDark ? '#0a2558' : 'rgba(0,17,54,0.08)' }]}>
                  <MaterialIcons name="business" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                    {editingCompany ? 'Editar Empresa' : 'Anexar Nueva Empresa'}
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12 }}>
                    Organización corporativa de grupos electrógenos
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setShowCompanyModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: inputBg }]}
              >
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14 }}>
                <View>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Nombre de la Empresa:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                    value={compName}
                    onChangeText={setCompName}
                    placeholder="Ej: Agropecuaria El Valle"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                <View>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Descripción / Sede:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                    value={compDesc}
                    onChangeText={setCompDesc}
                    placeholder="Ej: Complejo Agroindustrial y Silos de Grano"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                {/* Montar Imagen de la Empresa */}
                <ImageUploader
                  label="Fotografía / Fachada de la Empresa (Subir o Pegar URL):"
                  imageUri={compImage}
                  onImageChange={setCompImage}
                  isDark={isDark}
                  presetImages={[
                    { label: 'Sede Corporativa Moderna', uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80' },
                    { label: 'Planta Agroindustrial', uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80' },
                    { label: 'Centro Logístico', uri: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80' },
                  ]}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              <View style={{ flexDirection: 'row', gap: 10, marginLeft: 'auto' }}>
                <TouchableOpacity 
                  style={[styles.cancelBtn, { borderColor: textSecondary }]}
                  onPress={() => setShowCompanyModal(false)}
                >
                  <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitUserBtn, { backgroundColor: colors.primary, marginTop: 0 }]}
                  onPress={handleSaveCompany}
                >
                  <MaterialIcons name="save" size={17} color={isDark ? '#001136' : '#FFFFFF'} />
                  <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF' }}>Guardar Empresa</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

      

      {/* ==================================================== */}
      {/* MODAL 5: DEPARTAMENTO (CREAR / EDITAR) */}
      {/* ==================================================== */}
      <Modal 
        visible={showDeptModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowDeptModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
            
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconBadge, { backgroundColor: isDark ? '#0a2558' : 'rgba(0,17,54,0.08)' }]}>
                  <MaterialIcons name="domain" size={20} color="#00ae78" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                    {editingDept ? 'Editar Departamento' : 'Anexar Nuevo Departamento'}
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12 }}>
                    Área técnica u operativa dentro de una empresa
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setShowDeptModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: inputBg }]}
              >
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14 }}>
                <View>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Nombre del Departamento:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                    value={deptName}
                    onChangeText={setDeptName}
                    placeholder="Ej: Infraestructura & Operaciones"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                {/* Empresa Perteneciente */}
                <View>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Empresa a la que Pertenece:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {companies.map((c) => {
                        const isSel = (deptCompanyId || companies[0]?.id) === c.id;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[
                              styles.chipBtn,
                              { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol },
                              isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                            ]}
                            onPress={() => setDeptCompanyId(c.id)}
                          >
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                              {c.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Descripción de Operaciones:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                    value={deptDesc}
                    onChangeText={setDeptDesc}
                    placeholder="Ej: Servicios Generales y Salas de Máquinas"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                {/* Montar Imagen del Departamento */}
                <ImageUploader
                  label="Fotografía del Área / Departamento (Subir o Pegar URL):"
                  imageUri={deptImage}
                  onImageChange={setDeptImage}
                  isDark={isDark}
                  presetImages={[
                    { label: 'Oficinas & Servicios', uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80' },
                    { label: 'DataCenter & Servidores', uri: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80' },
                    { label: 'Línea de Producción', uri: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80' },
                    { label: 'Silos y Almacenes', uri: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=600&q=80' },
                  ]}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              <View style={{ flexDirection: 'row', gap: 10, marginLeft: 'auto' }}>
                <TouchableOpacity 
                  style={[styles.cancelBtn, { borderColor: textSecondary }]}
                  onPress={() => setShowDeptModal(false)}
                >
                  <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitUserBtn, { backgroundColor: colors.primary, marginTop: 0 }]}
                  onPress={handleSaveDept}
                >
                  <MaterialIcons name="save" size={17} color={isDark ? '#001136' : '#FFFFFF'} />
                  <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF' }}>Guardar Departamento</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

      

      {/* ==================================================== */}
      {/* MODAL 6: INFORME TÉCNICO EJECUTIVO DE LA PLANTA */}
      {/* ==================================================== */}
      <PlantReportModal
        visible={Boolean(selectedReportPlant)}
        generator={selectedReportPlant}
        horometerLogs={horometerLogs}
        outages={outages}
        services={services}
        appUsers={appUsers}
        currentUser={currentUser}
        onClose={() => setSelectedReportPlant(null)}
      />

      {/* ==================================================== */}
      {/* MODAL 7: ANEXAR / EDITAR CORTE ELÉCTRICO */}
      {/* ==================================================== */}
      <Modal
        visible={showOutageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOutageModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
            
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconBadge, { backgroundColor: isDark ? '#0a2558' : 'rgba(0,17,54,0.08)' }]}>
                  <MaterialIcons name="flash-off" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                    {editingOutage ? 'Editar Registro de Corte Eléctrico' : 'Anexar Evento de Corte Eléctrico'}
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12 }}>
                    Bitácora de interrupción en la red pública y tiempo de generación de respaldo
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setShowOutageModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: inputBg }]}
              >
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Modal Form Scroll */}
            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              
              {/* 1. PLANTA AFECTADA */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold }]}>
                1. PLANTA ELÉCTRICA AFECTADA
              </Text>
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary, marginBottom: 6 }]}>
                Selecciona el grupo electrógeno que suministra respaldo ante este corte:
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {generators.map((g) => {
                    const isSel = (outageGenId || generators[0]?.id) === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.chipBtn,
                          { backgroundColor: inputBg, borderColor: isSel ? colors.primary : borderCol, paddingVertical: 8, paddingHorizontal: 12 },
                          isSel && { backgroundColor: colors.primary, borderWidth: 1 }
                        ]}
                        onPress={() => setOutageGenId(g.id)}
                      >
                        <MaterialCommunityIcons name="engine" size={15} color={isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary} />
                        <Text style={{ fontFamily: F.bold, fontSize: 12, color: isSel ? (isDark ? '#001136' : '#FFFFFF') : textPrimary }}>
                          {g.name}
                        </Text>
                        <Text style={{ fontFamily: F.regular, fontSize: 10, color: isSel ? (isDark ? 'rgba(0,17,54,0.7)' : 'rgba(255,255,255,0.8)') : textSecondary }}>
                          ({g.capacityKva} kVA)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* 2. ESTADO DEL CORTE & HORARIOS */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 10 }]}>
                2. ESTADO DEL EVENTO & HORARIOS
              </Text>

              {/* Switch Corte Activo */}
              <View style={[styles.switchCardRow, { backgroundColor: inputBg, borderColor: borderCol, marginBottom: 16 }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontFamily: F.bold, color: outageIsActive ? '#EF4444' : textPrimary, fontSize: 13 }}>
                    ¿Corte Eléctrico Activo en Curso?
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11, marginTop: 2 }}>
                    {outageIsActive 
                      ? 'La energía comercial aún no ha regresado. La planta eléctrica permanece en marcha (GENERANDO).'
                      : 'El servicio comercial ya fue restablecido y la planta regresó a modo STANDBY.'}
                  </Text>
                </View>
                <Switch
                  value={outageIsActive}
                  onValueChange={setOutageIsActive}
                  trackColor={{ false: '#767577', true: '#EF4444' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Fecha y Hora de Inicio */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary, marginBottom: 0 }]}>
                    Fecha y Hora de Inicio del Apagón:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity
                      style={[styles.quickTimeBtn, { backgroundColor: inputBg }]}
                      onPress={() => setOutageStartDate(formatDateTimeLocal(new Date()))}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 10, color: colors.primary }}>Ahora</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickTimeBtn, { backgroundColor: inputBg }]}
                      onPress={() => setOutageStartDate(formatDateTimeLocal(new Date(Date.now() - 30 * 60000)))}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 10, color: colors.primary }}>-30m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickTimeBtn, { backgroundColor: inputBg }]}
                      onPress={() => setOutageStartDate(formatDateTimeLocal(new Date(Date.now() - 60 * 60000)))}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 10, color: colors.primary }}>-1h</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                  value={outageStartDate}
                  onChangeText={setOutageStartDate}
                  placeholder="YYYY-MM-DDTHH:mm (ej: 2026-11-10T14:30)"
                  placeholderTextColor={textSecondary}
                />
              </View>

              {/* Fecha y Hora de Fin (si no está activo) */}
              {!outageIsActive && (
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary, marginBottom: 0 }]}>
                      Fecha y Hora de Restablecimiento:
                    </Text>
                    <TouchableOpacity
                      style={[styles.quickTimeBtn, { backgroundColor: inputBg }]}
                      onPress={() => setOutageEndDate(formatDateTimeLocal(new Date()))}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 10, color: '#10B981' }}>Ahora</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                    value={outageEndDate}
                    onChangeText={setOutageEndDate}
                    placeholder="YYYY-MM-DDTHH:mm (ej: 2026-11-10T16:45)"
                    placeholderTextColor={textSecondary}
                  />
                </View>
              )}

              {/* 3. SISTEMA DE TRANSFERENCIA & DETALLES */}
              <Text style={[styles.sectionSubtitle, { color: colors.primary, fontFamily: F.bold, marginTop: 10 }]}>
                3. RESPALDO & NOTAS TÉCNICAS
              </Text>

              {/* Switch Arranque Automático */}
              <View style={[styles.switchCardRow, { backgroundColor: inputBg, borderColor: borderCol, marginBottom: 14 }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                    ¿El grupo electrógeno arrancó automáticamente?
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11, marginTop: 2 }}>
                    Transferencia automática ATS detectó la caída de tensión en la red pública.
                  </Text>
                </View>
                <Switch
                  value={outageAutoStart}
                  onValueChange={setOutageAutoStart}
                  trackColor={{ false: '#767577', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Notas Técnicas / Causa del Corte */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                  Motivo de la Falla / Notas Técnicas:
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium, minHeight: 70, textAlignVertical: 'top' }]}
                  value={outageNotes}
                  onChangeText={setOutageNotes}
                  placeholder="Ej: Falla en subestación Corpoelec, disparo de interruptor principal por sobretensión."
                  placeholderTextColor={textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              {editingOutage && (
                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => {
                    setShowOutageModal(false);
                    handleDeleteOutage(editingOutage);
                  }}
                >
                  <MaterialIcons name="delete" size={16} color="#EF4444" />
                  <Text style={{ fontFamily: F.bold, color: '#EF4444', fontSize: 12 }}>
                    Eliminar
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginLeft: 'auto' }}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: textSecondary }]}
                  onPress={() => setShowOutageModal(false)}
                >
                  <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitUserBtn, { backgroundColor: colors.primary, marginTop: 0 }]}
                  onPress={handleSaveOutage}
                >
                  <MaterialIcons name="save" size={17} color={isDark ? '#001136' : '#FFFFFF'} />
                  <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF' }}>
                    {editingOutage ? 'Guardar Cambios' : 'Registrar Corte'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 8: CONFIRMAR ELIMINACIÓN DE PLANTA ELÉCTRICA */}
      {/* ==================================================== */}
      <Modal
        visible={!!plantToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeletingPlant && setPlantToDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: '#EF4444', maxWidth: 480, borderWidth: 1.5 }]}>
            
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <MaterialIcons name="delete-forever" size={24} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                    ¿Eliminar Planta Eléctrica?
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>
                    Acción permanente y directa en la base de datos de Supabase
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => !isDeletingPlant && setPlantToDelete(null)}
                style={[styles.modalCloseBtn, { backgroundColor: inputBg }]}
              >
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={{ padding: 20 }}>
              <Text style={{ fontFamily: F.regular, color: textPrimary, fontSize: 13, lineHeight: 20, marginBottom: 14 }}>
                Estás a punto de borrar definitivamente este grupo electrógeno de la flota:
              </Text>

              {plantToDelete && (
                <View style={[styles.deleteDetailsBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15, marginBottom: 4 }}>
                    {plantToDelete.name}
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12 }}>
                    {plantToDelete.brand} {plantToDelete.model} • {plantToDelete.capacityKva} kVA ({plantToDelete.fuelType.toUpperCase()})
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11, marginTop: 4 }}>
                    📍 Ubicación: {plantToDelete.location || 'Sala de Máquinas'}
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>
                    🏢 Empresa: {plantToDelete.companyName || 'Empresas del Valle'}
                  </Text>
                  <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 12, marginTop: 4 }}>
                    ⏱️ Horómetro Registrado: {plantToDelete.currentHours} h
                  </Text>
                  {plantToDelete.serialNumber && (
                    <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 10, marginTop: 2 }}>
                      Serial: {plantToDelete.serialNumber}
                    </Text>
                  )}
                </View>
              )}

              <View style={[styles.warningNoticeBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: '#EF4444' }]}>
                <MaterialIcons name="warning" size={18} color="#EF4444" style={{ marginTop: 2 }} />
                <Text style={{ fontFamily: F.regular, color: isDark ? '#FCA5A5' : '#B91C1C', fontSize: 11, flex: 1, lineHeight: 16 }}>
                  Esta acción eliminará el registro en la tabla <Text style={{ fontFamily: F.bold }}>generators</Text> de Supabase y limpiará automáticamente sus horómetros y cortes asociados para mantener la integridad de la base de datos.
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: textSecondary }]}
                disabled={isDeletingPlant}
                onPress={() => setPlantToDelete(null)}
              >
                <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDeleteModalBtn, { opacity: isDeletingPlant ? 0.6 : 1 }]}
                disabled={isDeletingPlant}
                onPress={handleConfirmDeletePlant}
              >
                <MaterialIcons name="delete-forever" size={18} color="#FFFFFF" />
                <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 13 }}>
                  {isDeletingPlant ? 'Eliminando de Supabase...' : 'Sí, Eliminar Definitivamente'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 9: CONFIRMAR ELIMINACIÓN DE REGISTRO DE CORTE */}
      {/* ==================================================== */}
      <Modal
        visible={!!outageToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeletingOutage && setOutageToDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: '#EF4444', maxWidth: 460, borderWidth: 1.5 }]}>
            
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <MaterialIcons name="delete-sweep" size={22} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16 }}>
                    ¿Eliminar Registro de Corte?
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>
                    Se borrará de la tabla de cortes en Supabase
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => !isDeletingOutage && setOutageToDelete(null)}
                style={[styles.modalCloseBtn, { backgroundColor: inputBg }]}
              >
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={{ padding: 20 }}>
              <Text style={{ fontFamily: F.regular, color: textPrimary, fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
                ¿Deseas eliminar este evento de apagón registrado en el sistema?
              </Text>
              {outageToDelete && (
                <View style={[styles.deleteDetailsBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                    ⚡ {generators.find(g => g.id === outageToDelete.generatorId)?.name || 'Planta'}
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, marginTop: 4 }}>
                    Inicio: {new Date(outageToDelete.startTime).toLocaleString()}
                  </Text>
                  {outageToDelete.endTime && (
                    <Text style={{ fontFamily: F.medium, color: '#10B981', fontSize: 11 }}>
                      Restablecido: {new Date(outageToDelete.endTime).toLocaleString()}
                    </Text>
                  )}
                  {outageToDelete.notes && (
                    <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11, marginTop: 4 }}>
                      Nota: {outageToDelete.notes}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: textSecondary }]}
                disabled={isDeletingOutage}
                onPress={() => setOutageToDelete(null)}
              >
                <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDeleteModalBtn, { opacity: isDeletingOutage ? 0.6 : 1 }]}
                disabled={isDeletingOutage}
                onPress={handleConfirmDeleteOutage}
              >
                <MaterialIcons name="delete" size={16} color="#FFFFFF" />
                <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 13 }}>
                  {isDeletingOutage ? 'Eliminando...' : 'Eliminar Registro'}
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
  root: {
    flex: 1,
    height: '100%',
  },
  topbar: {
    minHeight: 64,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    zIndex: 20,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  superBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  topbarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  mobileDrawerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 99,
  },
  mobileDrawerContent: {
    width: 250,
    height: '100%',
    borderRightWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  contentArea: {
    flex: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
  },
  kpiNumber: {
    fontSize: 24,
    marginVertical: 4,
  },
  plantCard: {
    borderRadius: 14,
    padding: 14,
  },
  plantIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  plantMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  plantMetricItem: {
    flex: 1,
  },
  manageFleetBanner: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  formPanel: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 5,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  submitUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  userTableAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deltaBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fleetHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  addPlantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  plantGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  genCardBig: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activeFleetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genImgContainer: {
    width: 105,
    height: 90,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  genMetricsTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  metricBlock: {
    flex: 1,
    minWidth: 70,
  },
  genCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  editPlantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  setActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  deletePlantBtn: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionSubtitle: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  catalogThumbCard: {
    width: 100,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  microBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reportPlantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBarCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyFilterBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  resetFilterBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  orgCard: {
    flex: 1,
    minWidth: 280,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  orgCardBanner: {
    height: 100,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orgCardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  orgCardImgPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  sectionHeaderFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiRowOutages: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  miniStatBox: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  fleetFilterCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  switchCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickTimeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  cycleStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  selectForAppPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  deleteDetailsBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  warningNoticeBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  confirmDeleteModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  quickOpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  multiGenBanner: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  microSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
});
