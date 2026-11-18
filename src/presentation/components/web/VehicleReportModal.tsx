import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Vehicle,
  VehicleServiceRecord,
  VehicleOdometerRecord,
  VehicleDocument,
} from '../../../domain/entities/Vehicle';
import { AppUser } from '../../../domain/entities/Generator';
import {
  VEHICLE_COMPONENT_NAMES,
  getVehicleComponents,
  getVehicleComponentLifespan,
  calculateVehicleWearPercentage,
} from '../../../constants/vehicleTelemetry';
import { getVehicleSpecs } from '../../../data/specs';
import { CAR_CATALOG, MOTO_CATALOG } from '../../../data/vehicleCatalog';

interface VehicleReportModalProps {
  visible: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  vehicleServices: VehicleServiceRecord[];
  vehicleOdometerLogs: VehicleOdometerRecord[];
  vehicleDocuments: VehicleDocument[];
  appUsers: AppUser[];
  currentUser?: any;
  isDark?: boolean;
}

export interface ComputedDocStatus {
  status: 'valid' | 'expiring' | 'expired' | 'permanent';
  label: string;
  color: string;
  bgColor: string;
  daysRemaining?: number;
}

export const computeDocumentStatus = (doc: VehicleDocument): ComputedDocStatus => {
  const lowerTitle = (doc.title || '').toLowerCase();
  if (
    doc.isPermanent ||
    doc.expiryDate === 'PERMANENTE' ||
    lowerTitle.includes('título') ||
    lowerTitle.includes('titulo')
  ) {
    return {
      status: 'permanent',
      label: 'PERMANENTE',
      color: '#2563EB',
      bgColor: 'rgba(37, 99, 235, 0.14)',
    };
  }

  if (!doc.expiryDate || doc.expiryDate === 'INDEFINIDO') {
    return {
      status: 'valid',
      label: 'VIGENTE',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.14)',
    };
  }

  const expiry = new Date(doc.expiryDate);
  if (isNaN(expiry.getTime())) {
    return {
      status: 'valid',
      label: 'REGISTRADO',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.14)',
    };
  }

  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      label: `VENCIDO (${Math.abs(diffDays)}d)`,
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      daysRemaining: diffDays,
    };
  }

  if (diffDays <= 30) {
    return {
      status: 'expiring',
      label: `POR VENCER (${diffDays}d)`,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.16)',
      daysRemaining: diffDays,
    };
  }

  return {
    status: 'valid',
    label: `VIGENTE (${diffDays}d)`,
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.14)',
    daysRemaining: diffDays,
  };
};

const F = {
  extrabold: 'Montserrat_800ExtraBold',
  bold: 'Montserrat_700Bold',
  semibold: 'Montserrat_600SemiBold',
  medium: 'Montserrat_500Medium',
  regular: 'Montserrat_400Regular',
};

export const VehicleReportModal: React.FC<VehicleReportModalProps> = ({
  visible,
  onClose,
  vehicle,
  vehicleServices,
  vehicleOdometerLogs,
  vehicleDocuments,
  appUsers,
  currentUser,
}) => {
  const [generating, setGenerating] = useState(false);

  const isCar = vehicle?.vehicleType === 'car';

  // Assigned pilot / user details (combines vehicle's pilot fields + assigned AppUser)
  const pilotInfo = useMemo(() => {
    if (!vehicle) return null;
    const assignedUser = appUsers.find(
      (u) =>
        (vehicle.assignedUserId && u.id === vehicle.assignedUserId) ||
        (vehicle.assignedUserEmail && u.email.toLowerCase() === vehicle.assignedUserEmail.toLowerCase())
    );

    return {
      fullName: vehicle.assignedUserName || assignedUser?.fullName || 'Sin conductor asignado',
      email: vehicle.assignedUserEmail || assignedUser?.email || 'No registrado',
      role: assignedUser?.role ? assignedUser.role.toUpperCase() : 'OPERADOR DE FLOTA',
      dni: vehicle.driverDni || assignedUser?.dni || 'No registrado',
      phone: vehicle.driverPhone || assignedUser?.phone || 'No registrado',
      bloodType: vehicle.driverBloodType || assignedUser?.bloodType || 'O+',
      licenseGrade:
        vehicle.driverLicenseGrade ||
        assignedUser?.licenseGrade ||
        (isCar ? '3er / 5to Grado (Automóviles)' : '2do Grado (Motos)'),
      emergencyContact:
        vehicle.driverEmergencyContact ||
        assignedUser?.emergencyContactName ||
        'Central de Operaciones EDV',
      emergencyPhone:
        vehicle.driverEmergencyPhone ||
        assignedUser?.emergencyContactPhone ||
        '+58 241-8500000',
      city: vehicle.driverCity || assignedUser?.city || 'Valencia, Edo. Carabobo',
    };
  }, [vehicle, appUsers, isCar]);

  // OEM Specifications
  const specs = useMemo(() => {
    if (!vehicle) return null;
    return getVehicleSpecs(vehicle.brand, vehicle.model, isCar);
  }, [vehicle, isCar]);

  // Filtered records for this specific vehicle
  const unitServices = useMemo(() => {
    if (!vehicle) return [];
    return vehicleServices
      .filter((s) => s.vehicleId === vehicle.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [vehicle, vehicleServices]);

  const unitOdometers = useMemo(() => {
    if (!vehicle) return [];
    return vehicleOdometerLogs
      .filter((o) => o.vehicleId === vehicle.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [vehicle, vehicleOdometerLogs]);

  const unitDocuments = useMemo(() => {
    if (!vehicle) return [];
    return vehicleDocuments.filter((d) => d.vehicleId === vehicle.id);
  }, [vehicle, vehicleDocuments]);

  // Component wear telemetry
  const componentsAnalysis = useMemo(() => {
    if (!vehicle) return [];
    const comps = getVehicleComponents(isCar).filter((c) => c !== 'fuel' && c !== 'other');

    return comps.map((comp) => {
      const compServices = unitServices.filter((s) => s.type === comp);
      const lastServ =
        compServices.length > 0
          ? compServices.reduce((prev, curr) => (curr.odometer > prev.odometer ? curr : prev), compServices[0])
          : null;
      const lastOdo = lastServ ? lastServ.odometer : 0;
      const nominalLife = getVehicleComponentLifespan(comp, isCar);
      const kmSince = Math.max(0, vehicle.currentOdometer - lastOdo);
      const wear = calculateVehicleWearPercentage(vehicle.currentOdometer, lastOdo, comp, isCar);
      const kmRemaining = Math.max(0, nominalLife - kmSince);

      let statusLabel: 'ÓPTIMO' | 'PREVENTIVO' | 'CRÍTICO' = 'ÓPTIMO';
      let statusColor = '#10B981';

      if (wear <= 15) {
        statusLabel = 'CRÍTICO';
        statusColor = '#EF4444';
      } else if (wear <= 40) {
        statusLabel = 'PREVENTIVO';
        statusColor = '#F59E0B';
      }

      return {
        id: comp,
        name: VEHICLE_COMPONENT_NAMES[comp] || comp,
        wear,
        nominalLife,
        lastOdo,
        lastDate: lastServ?.date || null,
        kmSince,
        kmRemaining,
        statusLabel,
        statusColor,
        servicesCount: compServices.length,
      };
    });
  }, [vehicle, unitServices, isCar]);

  // Overall Health Score
  const generalHealth = useMemo(() => {
    if (componentsAnalysis.length === 0) return 100;
    const sum = componentsAnalysis.reduce((acc, c) => acc + c.wear, 0);
    return Math.round(sum / componentsAnalysis.length);
  }, [componentsAnalysis]);

  // Financial & Fuel Analysis
  const financialStats = useMemo(() => {
    const fuelRecords = unitServices.filter((r) => r.type === 'fuel');
    const maintRecords = unitServices.filter((r) => r.type !== 'fuel');

    const totalFuelUSD = fuelRecords.reduce((sum, r) => sum + (Number(r.costUSD) || 0), 0);
    const totalLiters = fuelRecords.reduce((sum, r) => sum + (Number(r.liters) || 0), 0);
    const totalServicesUSD = maintRecords.reduce((sum, r) => sum + (Number(r.costUSD) || 0), 0);
    const totalCostUSD = totalFuelUSD + totalServicesUSD;

    const costPerKm =
      vehicle && vehicle.currentOdometer > 0 ? totalCostUSD / vehicle.currentOdometer : 0;

    // Monthly breakdown
    const monthlyMap: Record<string, { fuel: number; services: number; total: number }> = {};
    unitServices.forEach((r) => {
      const monthKey = r.date ? r.date.slice(0, 7) : '2026-11';
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { fuel: 0, services: 0, total: 0 };
      }
      const cost = Number(r.costUSD) || 0;
      if (r.type === 'fuel') {
        monthlyMap[monthKey].fuel += cost;
      } else {
        monthlyMap[monthKey].services += cost;
      }
      monthlyMap[monthKey].total += cost;
    });

    const monthlyData = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);

    return {
      totalFuelUSD,
      totalLiters,
      totalServicesUSD,
      totalCostUSD,
      costPerKm,
      fuelRecordsCount: fuelRecords.length,
      serviceRecordsCount: maintRecords.length,
      monthlyData,
    };
  }, [unitServices, vehicle]);

  const reportDate = useMemo(() => {
    return new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const reportTime = useMemo(() => {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const reportFolio = useMemo(() => {
    if (!vehicle) return 'EDV-VEH-0000';
    const dateNum = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanPlate = (vehicle.plate || vehicle.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    return `EDV-GAR-${dateNum}-${cleanPlate}`;
  }, [vehicle]);

  if (!vehicle || !pilotInfo) return null;

  // Generate standalone printable HTML
  const generateReportHTML = () => {
    const maxMonthly = Math.max(
      ...financialStats.monthlyData.map((d) => d[1].total),
      50
    );

    const monthlyChartBars = financialStats.monthlyData
      .map(([month, data]) => {
        const fuelH = Math.round((data.fuel / maxMonthly) * 75);
        const servH = Math.round((data.services / maxMonthly) * 75);
        const monthLabel = month.slice(5) + '/' + month.slice(2, 4);
        return `
          <div style="display:flex; flex-direction:column; align-items:center; width:64px; font-size:11px;">
            <div style="height:85px; display:flex; align-items:flex-end; gap:4px;">
              <div title="Combustible: $${data.fuel.toFixed(2)}" style="width:20px; height:${Math.max(4, fuelH)}px; background:#0EA5E9; border-radius:4px 4px 0 0;"></div>
              <div title="Mantenimiento: $${data.services.toFixed(2)}" style="width:20px; height:${Math.max(4, servH)}px; background:#001136; border-radius:4px 4px 0 0;"></div>
            </div>
            <div style="margin-top:6px; font-weight:700; color:#1E293B;">${monthLabel}</div>
            <div style="font-size:10px; font-weight:600; color:#64748B;">$${data.total.toFixed(1)}</div>
          </div>
        `;
      })
      .join('');

    const docsRows =
      unitDocuments.length > 0
        ? unitDocuments
            .map((doc) => {
              const st = computeDocumentStatus(doc);
              return `
              <tr style="border-bottom:1px solid #E2E8F0; font-size:11.5px;">
                <td style="padding:8px; font-weight:700; color:#0F172A;">${doc.title}</td>
                <td style="padding:8px; color:#475569;">${doc.docCategory === 'driver' ? `Piloto (${doc.driverName || pilotInfo.fullName})` : 'Vehículo Corporativo'}</td>
                <td style="padding:8px; font-weight:600; color:#1E293B;">${doc.docNumber || 'S/N'}</td>
                <td style="padding:8px; text-align:center; color:#475569;">${doc.isPermanent ? 'PERMANENTE' : doc.expiryDate}</td>
                <td style="padding:8px; text-align:center;">
                  <span style="display:inline-block; padding:3px 9px; border-radius:10px; font-size:10px; font-weight:700; color:${st.color}; background:${st.bgColor};">
                    ${st.label}
                  </span>
                </td>
              </tr>
            `;
            })
            .join('')
        : `<tr><td colspan="5" style="padding:14px; text-align:center; color:#64748B;">No hay documentos legales registrados para esta unidad.</td></tr>`;

    const componentRows = componentsAnalysis
      .map(
        (c) => `
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:8px; font-weight:600; font-size:11.5px; color:#0F172A;">${c.name}</td>
          <td style="padding:8px; text-align:center;">
            <span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:9.5px; font-weight:700; color:#FFFFFF; background:${c.statusColor};">
              ${c.statusLabel}
            </span>
          </td>
          <td style="padding:8px; width:130px;">
            <div style="background:#E2E8F0; border-radius:4px; height:7px; width:100%; overflow:hidden;">
              <div style="background:${c.statusColor}; height:100%; width:${c.wear}%;"></div>
            </div>
          </td>
          <td style="padding:8px; text-align:center; font-weight:700; font-size:11.5px; color:#1E293B;">
            ${c.wear}%
          </td>
          <td style="padding:8px; text-align:right; font-size:11px; color:#475569;">
            ${c.kmSince.toLocaleString()} km
          </td>
          <td style="padding:8px; text-align:right; font-size:11px; font-weight:700; color:${c.kmRemaining < 1000 ? '#EF4444' : '#001136'};">
            ${c.kmRemaining.toLocaleString()} km
          </td>
        </tr>
      `
      )
      .join('');

    const odoRows =
      unitOdometers.length > 0
        ? unitOdometers
            .slice(0, 15)
            .map(
              (o) => `
          <tr style="border-bottom:1px solid #E2E8F0; font-size:11px;">
            <td style="padding:7px 8px; color:#475569;">${new Date(o.date).toLocaleDateString('es-ES')}</td>
            <td style="padding:7px 8px; text-align:right; font-weight:700; color:#0F172A;">${o.odometer.toLocaleString()} km</td>
            <td style="padding:7px 8px; text-align:right; font-weight:700; color:#2563EB;">+${(o.deltaKm || 0).toLocaleString()} km</td>
            <td style="padding:7px 8px; color:#334155;">${o.userEmail || pilotInfo.fullName}</td>
            <td style="padding:7px 8px; color:#64748B;">${o.notes || 'Lectura rutinaria'}</td>
          </tr>
        `
            )
            .join('')
        : `<tr><td colspan="5" style="padding:14px; text-align:center; color:#64748B;">Sin lecturas de odómetro registradas.</td></tr>`;

    const serviceRows =
      unitServices.length > 0
        ? unitServices
            .slice(0, 30)
            .map(
              (r) => `
          <tr style="border-bottom:1px solid #E2E8F0; font-size:11px;">
            <td style="padding:7px 8px; color:#475569;">${r.date || 'S/F'}</td>
            <td style="padding:7px 8px; font-weight:700; color:#0F172A;">
              ${VEHICLE_COMPONENT_NAMES[r.type] || r.type}
              ${r.type === 'fuel' && r.liters ? ` (${r.liters} L)` : ''}
            </td>
            <td style="padding:7px 8px; text-align:right; color:#1E293B;">${r.odometer.toLocaleString()} km</td>
            <td style="padding:7px 8px; text-align:right; font-weight:700; color:#059669;">$${(r.costUSD || 0).toFixed(2)} USD</td>
            <td style="padding:7px 8px; color:#334155;">${r.performedBy || 'Taller EDV'}</td>
            <td style="padding:7px 8px; color:#64748B;">${r.notes || '—'}</td>
          </tr>
        `
            )
            .join('')
        : `<tr><td colspan="6" style="padding:14px; text-align:center; color:#64748B;">No hay servicios ni gastos registrados en la bitácora.</td></tr>`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe de Monitoreo Vehicular - ${vehicle.brand} ${vehicle.model} (${vehicle.plate || 'Sin Placa'})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F1F5F9;
      color: #1E293B;
      padding: 24px;
      line-height: 1.45;
    }
    .sheet {
      max-width: 920px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 8px 24px rgba(0, 17, 54, 0.08);
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #001136;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }
    .corp-title { font-size: 22px; font-weight: 800; color: #001136; letter-spacing: 0.5px; }
    .corp-sub { font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.4px; margin-top: 2px; }
    .folio-pill { background: #001136; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; display: inline-block; }
    .section-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #001136;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-left: 4px solid #001136;
      padding-left: 10px;
      margin-top: 22px;
      margin-bottom: 12px;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; }
    .card-label { font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .card-val { font-size: 14px; font-weight: 700; color: #0F172A; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; border: 1px solid #E2E8F0; }
    th { background: #F1F5F9; color: #334155; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 8px; text-align: left; }
    .top-bar { display: flex; justify-content: flex-end; gap: 10px; max-width: 920px; margin: 0 auto 14px auto; }
    .btn { background: #001136; color: #FFFFFF; border: none; border-radius: 8px; padding: 10px 18px; font-weight: 700; font-size: 12.5px; cursor: pointer; }
    .btn-outline { background: #FFFFFF; color: #001136; border: 1.5px solid #001136; }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .top-bar { display: none !important; }
      .sheet { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      @page { size: A4 portrait; margin: 10mm; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <button class="btn btn-outline" onclick="window.close()">Cerrar Ventana</button>
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
  </div>

  <div class="sheet">
    <div class="header-row">
      <div>
        <div class="corp-title">EMPRESAS DEL VALLE</div>
        <div class="corp-sub">DIVISIÓN DE FLOTA VEHICULAR, TELEMETRÍA Y CONTROL DE ACTIVOS (GARAGE EDV)</div>
        <div style="font-size:10.5px; color:#64748B; margin-top:3px;">
          RIF: J-30984920-1 • Emisión: <b>${reportDate} (${reportTime})</b> • Emitido por: <b>${currentUser?.fullName || 'Superadministrador'}</b>
        </div>
      </div>
      <div style="text-align:right;">
        <div class="folio-pill">${reportFolio}</div>
        <div style="font-size:18px; font-weight:800; color:${generalHealth <= 20 ? '#EF4444' : generalHealth <= 40 ? '#F59E0B' : '#10B981'}; margin-top:6px;">
          SALUD OPERATIVA: ${generalHealth}%
        </div>
      </div>
    </div>

    <div style="text-align:center; margin-bottom:18px;">
      <div style="font-size:17px; font-weight:800; color:#001136; letter-spacing:0.6px;">
        INFORME EJECUTIVO DE MONITOREO, GASTOS, PAPELES Y PILOTO ASIGNADO
      </div>
      <div style="font-size:11.5px; color:#475569; margin-top:2px;">
        Expediente Técnico Integral de Unidad Corporativa • ${vehicle.companyName || 'Empresas del Valle S.A.'}
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-label">1. IDENTIFICACIÓN DEL VEHÍCULO CORPORATIVO</div>
        <div style="font-size:18px; font-weight:800; color:#001136; margin-top:2px;">
          ${vehicle.brand} ${vehicle.model} (${vehicle.year})
        </div>
        <div style="margin-top:8px; font-size:11.5px; color:#334155; line-height:1.6;">
          <div>Placa: <b style="color:#001136;">${vehicle.plate || 'Sin Placa'}</b> | Tipo: <b>${isCar ? 'CARRO / CAMIONETA' : 'MOTOCICLETA'}</b></div>
          <div>Categoría: <b>${vehicle.category || 'Uso Corporativo'}</b> | Estado: <b style="text-transform:uppercase;">${vehicle.status}</b></div>
          <div>Empresa: <b>${vehicle.companyName || 'Empresas del Valle'}</b> | Depto: <b>${vehicle.departmentName || 'Operaciones'}</b></div>
          <div>Kilometraje Actual (Odómetro): <b style="font-size:13px; color:#001136;">${vehicle.currentOdometer.toLocaleString()} km</b></div>
        </div>
      </div>

      <div class="card">
        <div class="card-label">2. FICHA DEL PILOTO / CONDUCTOR ASIGNADO</div>
        <div style="font-size:16px; font-weight:800; color:#001136; margin-top:2px;">
          ${pilotInfo.fullName}
        </div>
        <div style="margin-top:8px; font-size:11.5px; color:#334155; line-height:1.6;">
          <div>Cédula / DNI: <b>${pilotInfo.dni}</b> | Teléfono: <b>${pilotInfo.phone}</b></div>
          <div>Correo: <b>${pilotInfo.email}</b> | Cargo: <b>${pilotInfo.role}</b></div>
          <div>Grupo Sanguíneo: <b style="color:#DC2626;">${pilotInfo.bloodType}</b> | Licencia: <b>${pilotInfo.licenseGrade}</b></div>
          <div>Contacto SOS: <b>${pilotInfo.emergencyContact} (${pilotInfo.emergencyPhone})</b></div>
        </div>
      </div>
    </div>

    <div class="section-title">3. Especificaciones Técnicas OEM de Fábrica</div>
    <div class="grid-3">
      <div class="card">
        <div class="card-label">Motor & Potencia</div>
        <div class="card-val">${specs?.engineType || 'Motor 4 Tiempos'}</div>
        <div style="font-size:11px; color:#64748B; margin-top:3px;">${specs?.displacement || 'N/D'} • ${specs?.hp || 'N/D'}</div>
      </div>
      <div class="card">
        <div class="card-label">Lubricación Recomendada</div>
        <div class="card-val">${specs?.oilTypeRecommended || '20W-50 / 10W-30'}</div>
        <div style="font-size:11px; color:#64748B; margin-top:3px;">Capacidad: ${specs?.oilCapacity || 'N/D'} | Intervalo: ${specs?.maintenanceIntervalOil || '3,000 km'}</div>
      </div>
      <div class="card">
        <div class="card-label">Tanque, Transmisión & PSI</div>
        <div class="card-val">Tanque: ${specs?.fuelCapacity || 'N/D'}</div>
        <div style="font-size:11px; color:#64748B; margin-top:3px;">Presión: Del ${specs?.frontTirePressure || '30 PSI'} / Tras ${specs?.rearTirePressure || '32 PSI'}</div>
      </div>
    </div>

    <div class="section-title">4. Estado de Papeles y Documentación Legal (Vehículo y Piloto)</div>
    <table>
      <thead>
        <tr>
          <th>Documento / Papel Legal</th>
          <th>Titular / Asignación</th>
          <th>N° Documento / Póliza</th>
          <th style="text-align:center;">Vencimiento</th>
          <th style="text-align:center;">Estado Legal</th>
        </tr>
      </thead>
      <tbody>
        ${docsRows}
      </tbody>
    </table>

    <div class="section-title">5. Resumen de Gastos Invertidos y Análisis Financiero</div>
    <div class="grid-3" style="margin-bottom:12px;">
      <div class="card" style="border-left:4px solid #0EA5E9;">
        <div class="card-label">Gasto en Combustible</div>
        <div class="card-val" style="color:#0284C7; font-size:17px;">$${financialStats.totalFuelUSD.toFixed(2)} USD</div>
        <div style="font-size:10.5px; color:#64748B; margin-top:2px;">${financialStats.fuelRecordsCount} cargas (${financialStats.totalLiters.toFixed(1)} L totales)</div>
      </div>
      <div class="card" style="border-left:4px solid #001136;">
        <div class="card-label">Gasto en Mantenimiento</div>
        <div class="card-val" style="color:#001136; font-size:17px;">$${financialStats.totalServicesUSD.toFixed(2)} USD</div>
        <div style="font-size:10.5px; color:#64748B; margin-top:2px;">${financialStats.serviceRecordsCount} servicios / repuestos</div>
      </div>
      <div class="card" style="border-left:4px solid #10B981;">
        <div class="card-label">Inversión Total Acumulada</div>
        <div class="card-val" style="color:#059669; font-size:17px;">$${financialStats.totalCostUSD.toFixed(2)} USD</div>
        <div style="font-size:10.5px; color:#64748B; margin-top:2px;">Costo operativo: $${financialStats.costPerKm.toFixed(3)} USD / km</div>
      </div>
    </div>

    ${
      financialStats.monthlyData.length > 0
        ? `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div class="card-label">Evolución Mensual de Gastos Invertidos ($ USD)</div>
          <div style="display:flex; gap:14px; font-size:10px; font-weight:700;">
            <span style="color:#0EA5E9;">■ Combustible</span>
            <span style="color:#001136;">■ Mantenimiento</span>
          </div>
        </div>
        <div style="display:flex; justify-content:space-around; align-items:flex-end; padding-top:8px;">
          ${monthlyChartBars}
        </div>
      </div>
    `
        : ''
    }

    <div class="section-title">6. Telemetría de Desgaste Preventivo por Componente</div>
    <table>
      <thead>
        <tr>
          <th>Componente / Sistema</th>
          <th style="text-align:center;">Estado</th>
          <th>Vida Útil</th>
          <th style="text-align:center;">% Salud</th>
          <th style="text-align:right;">Recorrido</th>
          <th style="text-align:right;">Remanente Sugerido</th>
        </tr>
      </thead>
      <tbody>
        ${componentRows}
      </tbody>
    </table>

    <div class="section-title">7. Historial de Actualizaciones de Kilometraje (Odómetro)</div>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th style="text-align:right;">Odómetro Total</th>
          <th style="text-align:right;">Recorrido (+Km)</th>
          <th>Conductor / Usuario</th>
          <th>Notas de Ruta / Operación</th>
        </tr>
      </thead>
      <tbody>
        ${odoRows}
      </tbody>
    </table>

    <div class="section-title">8. Bitácora Histórica de Servicios, Repuestos y Combustible</div>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Servicio / Concepto</th>
          <th style="text-align:right;">Odómetro</th>
          <th style="text-align:right;">Inversión USD</th>
          <th>Taller / Proveedor</th>
          <th>Observaciones Técnicas</th>
        </tr>
      </thead>
      <tbody>
        ${serviceRows}
      </tbody>
    </table>

    <div style="display:flex; justify-content:space-around; margin-top:36px; padding-top:16px; gap:24px;">
      <div style="flex:1; text-align:center;">
        <div style="border-bottom:1px solid #0F172A; width:80%; margin:0 auto 6px auto; height:24px;"></div>
        <div style="font-size:11px; font-weight:700; color:#001136;">${currentUser?.fullName || 'Superadministrador'}</div>
        <div style="font-size:9.5px; color:#64748B;">Gerencia de Flota & Operaciones EDV</div>
      </div>
      <div style="flex:1; text-align:center;">
        <div style="border-bottom:1px solid #0F172A; width:80%; margin:0 auto 6px auto; height:24px;"></div>
        <div style="font-size:11px; font-weight:700; color:#001136;">${pilotInfo.fullName}</div>
        <div style="font-size:9.5px; color:#64748B;">Conductor / Piloto Asignado (${pilotInfo.dni})</div>
      </div>
      <div style="flex:1; text-align:center;">
        <div style="border-bottom:1px solid #0F172A; width:80%; margin:0 auto 6px auto; height:24px;"></div>
        <div style="font-size:11px; font-weight:700; color:#001136;">Auditoría Técnica Vehicular</div>
        <div style="font-size:9.5px; color:#64748B;">Plataforma Digital EDV Monitor • Garage</div>
      </div>
    </div>

    <div style="margin-top:24px; padding-top:12px; border-top:1px solid #E2E8F0; display:flex; justify-content:space-between; font-size:9.5px; color:#64748B;">
      <div>Expediente Oficial Generado por EDV Monitor (Módulo Garage Corporativo) • Folio: ${reportFolio}</div>
      <div>Empresas del Valle S.A. • Todos los derechos reservados</div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    setGenerating(true);
    const htmlContent = generateReportHTML();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            setGenerating(false);
          }, 350);
        } else {
          const iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.right = '0';
          iframe.style.bottom = '0';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = '0';
          document.body.appendChild(iframe);
          iframe.contentWindow?.document.write(htmlContent);
          iframe.contentWindow?.document.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            document.body.removeChild(iframe);
            setGenerating(false);
          }, 450);
        }
      } catch (e) {
        console.error('Error al imprimir informe vehicular:', e);
        setGenerating(false);
      }
    } else {
      setGenerating(false);
    }
  };

  const handleDownloadHTML = () => {
    const htmlContent = generateReportHTML();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `informe-vehicular-${vehicle.brand}-${vehicle.model}-${vehicle.plate || 'edv'}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const healthColor =
    generalHealth <= 20 ? '#EF4444' : generalHealth <= 40 ? '#F59E0B' : '#10B981';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* TOP ACTION BAR */}
        <View style={styles.topControls}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.pdfBadge}>
              <MaterialIcons name="picture-as-pdf" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 15 }}>
                Informe Ejecutivo de Monitoreo Vehicular
              </Text>
              <Text style={{ fontFamily: F.regular, color: '#CBD5E1', fontSize: 11 }}>
                Folio: {reportFolio} • Se actualiza en tiempo real con cada registro
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={handleDownloadHTML}
              activeOpacity={0.85}
            >
              <MaterialIcons name="download" size={17} color="#001136" />
              <Text style={{ fontFamily: F.bold, color: '#001136', fontSize: 12 }}>
                Descargar HTML
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.printBtn}
              onPress={handlePrint}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="print" size={18} color="#FFFFFF" />
                  <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 12.5 }}>
                    Imprimir / Guardar PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <MaterialIcons name="close" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* PRINTABLE SHEET PREVIEW */}
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.printableSheet}>
            {/* 1. INSTITUTIONAL HEADER */}
            <View style={styles.reportHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                <View style={styles.logoCircle}>
                  <Image
                    source={require('../../../../assets/images/EMPRESASDELVALLE-AZUL.png')}
                    style={{ width: 46, height: 46 }}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.corpTitle, { fontFamily: F.extrabold }]}>
                    EMPRESAS DEL VALLE
                  </Text>
                  <Text style={[styles.corpSub, { fontFamily: F.bold }]}>
                    DIVISIÓN DE FLOTA VEHICULAR, TELEMETRÍA Y CONTROL DE ACTIVOS (GARAGE EDV)
                  </Text>
                  <Text style={[styles.corpRif, { fontFamily: F.medium }]}>
                    RIF: J-30984920-1 • Emisión: {reportDate} ({reportTime})
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={styles.codePill}>
                  <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 10.5 }}>
                    {reportFolio}
                  </Text>
                </View>
                <View style={[styles.healthPill, { backgroundColor: `${healthColor}18`, borderColor: healthColor }]}>
                  <Text style={{ fontFamily: F.extrabold, color: healthColor, fontSize: 13 }}>
                    SALUD FLOTA: {generalHealth}%
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.dividerThick} />

            {/* MAIN REPORT TITLE */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: F.extrabold, fontSize: 17, color: '#001136', textAlign: 'center' }}>
                EXPEDIENTE TÉCNICO, FINANCIERO, DOCUMENTAL Y DE PILOTO ASIGNADO
              </Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                Monitoreo integral de kilometraje, gastos invertidos, papeles vigentes y estado de repuestos
              </Text>
            </View>

            {/* 2. VEHICLE & ASSIGNED PILOT OVERVIEW (2 COLUMNS) */}
            <View style={styles.twoColGrid}>
              {/* Vehicle Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeaderStrip}>
                  <MaterialIcons
                    name={isCar ? 'directions-car' : 'two-wheeler'}
                    size={18}
                    color="#001136"
                  />
                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#001136' }}>
                    1. DATOS DE LA UNIDAD VEHICULAR
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginVertical: 8 }}>
                  <View style={styles.vehThumbBox}>
                    {vehicle.customImageUri || vehicle.imageUrl ? (
                      <Image
                        source={{ uri: vehicle.customImageUri || vehicle.imageUrl }}
                        style={{ width: '100%', height: '100%', borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={
                          vehicle.catalogImageRes ||
                          (isCar ? CAR_CATALOG[0].imageRes : MOTO_CATALOG[0].imageRes)
                        }
                        style={{ width: '90%', height: '90%' }}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.extrabold, fontSize: 16, color: '#001136' }}>
                      {vehicle.brand} {vehicle.model}
                    </Text>
                    <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: '#475569' }}>
                      Año {vehicle.year} • {isCar ? 'Carro / Camioneta' : 'Motocicleta'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <View style={styles.plateTag}>
                        <Text style={{ fontFamily: F.extrabold, fontSize: 11, color: '#001136' }}>
                          PLACA: {vehicle.plate || 'S/P'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }}>
                  <Text style={styles.detailLine}>
                    Empresa: <Text style={{ fontFamily: F.bold }}>{vehicle.companyName || 'Empresas del Valle S.A.'}</Text>
                  </Text>
                  <Text style={styles.detailLine}>
                    Departamento: <Text style={{ fontFamily: F.bold }}>{vehicle.departmentName || 'Operaciones'}</Text>
                  </Text>
                  <Text style={styles.detailLine}>
                    Kilometraje Actual (Odómetro):{' '}
                    <Text style={{ fontFamily: F.extrabold, color: '#2563EB', fontSize: 13 }}>
                      {vehicle.currentOdometer.toLocaleString()} km
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Pilot / Assigned User Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeaderStrip}>
                  <MaterialIcons name="badge" size={18} color="#001136" />
                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#001136' }}>
                    2. DATOS DEL PILOTO / USUARIO ASIGNADO
                  </Text>
                </View>

                <Text style={{ fontFamily: F.extrabold, fontSize: 16, color: '#001136', marginTop: 6 }}>
                  {pilotInfo.fullName}
                </Text>
                <Text style={{ fontFamily: F.semibold, fontSize: 11, color: '#0284C7', marginBottom: 8 }}>
                  {pilotInfo.role} • {pilotInfo.email}
                </Text>

                <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }}>
                  <Text style={styles.detailLine}>
                    Cédula / Documento ID: <Text style={{ fontFamily: F.bold }}>{pilotInfo.dni}</Text>
                  </Text>
                  <Text style={styles.detailLine}>
                    Teléfono Móvil: <Text style={{ fontFamily: F.bold }}>{pilotInfo.phone}</Text>
                  </Text>
                  <Text style={styles.detailLine}>
                    Grupo Sanguíneo:{' '}
                    <Text style={{ fontFamily: F.extrabold, color: '#DC2626' }}>{pilotInfo.bloodType}</Text>
                    {'  '}|{'  '}Licencia: <Text style={{ fontFamily: F.bold }}>{pilotInfo.licenseGrade}</Text>
                  </Text>
                  <Text style={styles.detailLine}>
                    Contacto SOS: <Text style={{ fontFamily: F.bold }}>{pilotInfo.emergencyContact}</Text> ({pilotInfo.emergencyPhone})
                  </Text>
                  <Text style={styles.detailLine}>
                    Sede / Ciudad: <Text style={{ fontFamily: F.semibold }}>{pilotInfo.city}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. OEM TECHNICAL SPECIFICATIONS */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="car-cog" size={18} color="#001136" />
                <Text style={styles.sectionTitleText}>
                  3. ESPECIFICACIONES TÉCNICAS OEM DE FÁBRICA
                </Text>
              </View>

              <View style={styles.threeColGrid}>
                <View style={styles.miniCard}>
                  <Text style={styles.miniCardLabel}>MOTOR & CILINDRADA</Text>
                  <Text style={styles.miniCardVal}>{specs?.engineType || '4 Tiempos'}</Text>
                  <Text style={styles.miniCardSub}>
                    {specs?.displacement || 'N/D'} • {specs?.hp || 'N/D'}
                  </Text>
                </View>

                <View style={styles.miniCard}>
                  <Text style={styles.miniCardLabel}>LUBRICACIÓN & ACEITE</Text>
                  <Text style={styles.miniCardVal}>{specs?.oilTypeRecommended || '20W-50 / 10W-30'}</Text>
                  <Text style={styles.miniCardSub}>
                    Capacidad: {specs?.oilCapacity || 'N/D'} • Cambio: {specs?.maintenanceIntervalOil || '3,000 km'}
                  </Text>
                </View>

                <View style={styles.miniCard}>
                  <Text style={styles.miniCardLabel}>TANQUE & NEUMÁTICOS</Text>
                  <Text style={styles.miniCardVal}>Tanque: {specs?.fuelCapacity || 'N/D'}</Text>
                  <Text style={styles.miniCardSub}>
                    PSI: Del {specs?.frontTirePressure || '28 PSI'} / Tras {specs?.rearTirePressure || '32 PSI'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 4. PAPELES Y DOCUMENTACIÓN LEGAL */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="folder-shared" size={18} color="#001136" />
                <Text style={styles.sectionTitleText}>
                  4. PAPELES Y DOCUMENTACIÓN LEGAL (VEHÍCULO Y PILOTO)
                </Text>
              </View>

              <View style={styles.tableBox}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 1.8 }]}>DOCUMENTO / PAPEL</Text>
                  <Text style={[styles.th, { flex: 1.5 }]}>TITULAR</Text>
                  <Text style={[styles.th, { flex: 1.4 }]}>N° / PÓLIZA</Text>
                  <Text style={[styles.th, { flex: 1.1, textAlign: 'center' }]}>VENCIMIENTO</Text>
                  <Text style={[styles.th, { flex: 1.2, textAlign: 'center' }]}>ESTADO</Text>
                </View>

                {unitDocuments.length === 0 ? (
                  <View style={{ padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: '#64748B' }}>
                      No se han cargado papeles para este vehículo todavía.
                    </Text>
                  </View>
                ) : (
                  unitDocuments.map((doc) => {
                    const st = computeDocumentStatus(doc);
                    return (
                      <View key={doc.id} style={styles.tr}>
                        <Text style={[styles.tdBold, { flex: 1.8 }]}>{doc.title}</Text>
                        <Text style={[styles.td, { flex: 1.5 }]}>
                          {doc.docCategory === 'driver'
                            ? `Piloto (${doc.driverName || pilotInfo.fullName})`
                            : 'Vehículo'}
                        </Text>
                        <Text style={[styles.td, { flex: 1.4, fontFamily: F.semibold }]}>
                          {doc.docNumber || 'S/N'}
                        </Text>
                        <Text style={[styles.td, { flex: 1.1, textAlign: 'center' }]}>
                          {doc.isPermanent ? 'PERMANENTE' : doc.expiryDate}
                        </Text>
                        <View style={{ flex: 1.2, alignItems: 'center' }}>
                          <View style={[styles.statusBadge, { backgroundColor: st.bgColor }]}>
                            <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: st.color }}>
                              {st.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* 5. GASTOS INVERTIDOS Y FINANZAS */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="attach-money" size={18} color="#001136" />
                <Text style={styles.sectionTitleText}>
                  5. GASTOS INVERTIDOS Y RESUMEN FINANCIERO DE LA UNIDAD
                </Text>
              </View>

              <View style={styles.threeColGrid}>
                <View style={[styles.financeBox, { borderLeftColor: '#0EA5E9' }]}>
                  <Text style={styles.miniCardLabel}>GASTO EN COMBUSTIBLE</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 18, color: '#0284C7', marginTop: 2 }}>
                    ${financialStats.totalFuelUSD.toFixed(2)} USD
                  </Text>
                  <Text style={styles.miniCardSub}>
                    {financialStats.fuelRecordsCount} cargas ({financialStats.totalLiters.toFixed(1)} Litros)
                  </Text>
                </View>

                <View style={[styles.financeBox, { borderLeftColor: '#001136' }]}>
                  <Text style={styles.miniCardLabel}>GASTO EN MANTENIMIENTO</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 18, color: '#001136', marginTop: 2 }}>
                    ${financialStats.totalServicesUSD.toFixed(2)} USD
                  </Text>
                  <Text style={styles.miniCardSub}>
                    {financialStats.serviceRecordsCount} servicios y repuestos
                  </Text>
                </View>

                <View style={[styles.financeBox, { borderLeftColor: '#10B981' }]}>
                  <Text style={styles.miniCardLabel}>INVERSIÓN TOTAL ACUMULADA</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 18, color: '#059669', marginTop: 2 }}>
                    ${financialStats.totalCostUSD.toFixed(2)} USD
                  </Text>
                  <Text style={styles.miniCardSub}>
                    Costo por km: ${financialStats.costPerKm.toFixed(3)} USD/km
                  </Text>
                </View>
              </View>
            </View>

            {/* 6. TELEMETRÍA DE DESGASTE DE COMPONENTES */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="analytics" size={18} color="#001136" />
                <Text style={styles.sectionTitleText}>
                  6. TELEMETRÍA DE DESGASTE Y SALUD DE CADA COMPONENTE
                </Text>
              </View>

              <View style={styles.tableBox}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 2 }]}>COMPONENTE / SISTEMA</Text>
                  <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>ESTADO</Text>
                  <Text style={[styles.th, { flex: 1.5, textAlign: 'center' }]}>VIDA ÚTIL (%)</Text>
                  <Text style={[styles.th, { flex: 1.1, textAlign: 'right' }]}>RECORRIDO</Text>
                  <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>REMANENTE</Text>
                </View>

                {componentsAnalysis.map((comp) => (
                  <View key={comp.id} style={styles.tr}>
                    <Text style={[styles.tdBold, { flex: 2 }]}>{comp.name}</Text>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={[styles.statusBadge, { backgroundColor: comp.statusColor }]}>
                        <Text style={{ fontFamily: F.bold, fontSize: 9, color: '#FFFFFF' }}>
                          {comp.statusLabel}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        flex: 1.5,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 8,
                      }}
                    >
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${comp.wear}%`, backgroundColor: comp.statusColor },
                          ]}
                        />
                      </View>
                      <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: comp.statusColor, width: 32 }}>
                        {comp.wear}%
                      </Text>
                    </View>
                    <Text style={[styles.td, { flex: 1.1, textAlign: 'right' }]}>
                      {comp.kmSince.toLocaleString()} km
                    </Text>
                    <Text
                      style={[
                        styles.tdBold,
                        {
                          flex: 1.2,
                          textAlign: 'right',
                          color: comp.kmRemaining < 1000 ? '#EF4444' : '#001136',
                        },
                      ]}
                    >
                      {comp.kmRemaining.toLocaleString()} km
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 7. HISTORIAL DE ACTUALIZACIONES DE KILOMETRAJE */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="speed" size={18} color="#001136" />
                <Text style={styles.sectionTitleText}>
                  7. BITÁCORA DE ACTUALIZACIONES DE KILOMETRAJE (ODÓMETRO)
                </Text>
              </View>

              <View style={styles.tableBox}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 1.1 }]}>FECHA</Text>
                  <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>ODÓMETRO TOTAL</Text>
                  <Text style={[styles.th, { flex: 1.1, textAlign: 'right' }]}>RECORRIDO (+KM)</Text>
                  <Text style={[styles.th, { flex: 1.4, paddingLeft: 10 }]}>PILOTO / USUARIO</Text>
                  <Text style={[styles.th, { flex: 2 }]}>OBSERVACIONES DE RUTA</Text>
                </View>

                {unitOdometers.length === 0 ? (
                  <View style={{ padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: '#64748B' }}>
                      Sin lecturas de odómetro registradas para esta unidad.
                    </Text>
                  </View>
                ) : (
                  unitOdometers.map((o) => (
                    <View key={o.id} style={styles.tr}>
                      <Text style={[styles.td, { flex: 1.1 }]}>
                        {new Date(o.date).toLocaleDateString('es-ES')}
                      </Text>
                      <Text style={[styles.tdBold, { flex: 1.2, textAlign: 'right' }]}>
                        {o.odometer.toLocaleString()} km
                      </Text>
                      <Text
                        style={[
                          styles.tdBold,
                          { flex: 1.1, textAlign: 'right', color: '#2563EB' },
                        ]}
                      >
                        +{(o.deltaKm || 0).toLocaleString()} km
                      </Text>
                      <Text style={[styles.td, { flex: 1.4, paddingLeft: 10 }]}>
                        {o.userEmail || pilotInfo.fullName}
                      </Text>
                      <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>
                        {o.notes || 'Lectura rutinaria'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* 8. BITÁCORA HISTÓRICA DE SERVICIOS Y GASTOS */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="build" size={18} color="#001136" />
                <Text style={styles.sectionTitleText}>
                  8. BITÁCORA HISTÓRICA DE SERVICIOS, REPUESTOS Y CARGAS DE COMBUSTIBLE
                </Text>
              </View>

              <View style={styles.tableBox}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 1 }]}>FECHA</Text>
                  <Text style={[styles.th, { flex: 1.8 }]}>SERVICIO / CONCEPTO</Text>
                  <Text style={[styles.th, { flex: 1.1, textAlign: 'right' }]}>ODÓMETRO</Text>
                  <Text style={[styles.th, { flex: 1.1, textAlign: 'right' }]}>MONTO USD</Text>
                  <Text style={[styles.th, { flex: 1.4, paddingLeft: 8 }]}>TALLER / E.S.</Text>
                  <Text style={[styles.th, { flex: 2 }]}>DETALLE TÉCNICO</Text>
                </View>

                {unitServices.length === 0 ? (
                  <View style={{ padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: '#64748B' }}>
                      No hay servicios ni gastos registrados para esta unidad.
                    </Text>
                  </View>
                ) : (
                  unitServices.map((r) => (
                    <View key={r.id} style={styles.tr}>
                      <Text style={[styles.td, { flex: 1 }]}>{r.date}</Text>
                      <Text style={[styles.tdBold, { flex: 1.8 }]}>
                        {VEHICLE_COMPONENT_NAMES[r.type] || r.type}
                        {r.type === 'fuel' && r.liters ? ` (${r.liters} L)` : ''}
                      </Text>
                      <Text style={[styles.td, { flex: 1.1, textAlign: 'right' }]}>
                        {r.odometer.toLocaleString()} km
                      </Text>
                      <Text
                        style={[
                          styles.tdBold,
                          { flex: 1.1, textAlign: 'right', color: '#059669' },
                        ]}
                      >
                        ${(r.costUSD || 0).toFixed(2)}
                      </Text>
                      <Text style={[styles.td, { flex: 1.4, paddingLeft: 8 }]} numberOfLines={1}>
                        {r.performedBy || 'Taller EDV'}
                      </Text>
                      <Text style={[styles.td, { flex: 2 }]} numberOfLines={2}>
                        {r.notes || '—'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* 9. SIGNATURES & FOOTER */}
            <View style={styles.signaturesRow}>
              <View style={styles.sigCol}>
                <View style={styles.sigLine} />
                <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#001136' }}>
                  {currentUser?.fullName || 'Superadministrador'}
                </Text>
                <Text style={{ fontFamily: F.regular, fontSize: 9.5, color: '#64748B' }}>
                  Gerencia de Flota & Operaciones EDV
                </Text>
              </View>

              <View style={styles.sigCol}>
                <View style={styles.sigLine} />
                <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#001136' }}>
                  {pilotInfo.fullName}
                </Text>
                <Text style={{ fontFamily: F.regular, fontSize: 9.5, color: '#64748B' }}>
                  Piloto / Conductor Asignado ({pilotInfo.dni})
                </Text>
              </View>

              <View style={styles.sigCol}>
                <View style={styles.sigLine} />
                <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#001136' }}>
                  Control de Activos & Auditoría
                </Text>
                <Text style={{ fontFamily: F.regular, fontSize: 9.5, color: '#64748B' }}>
                  Plataforma Digital EDV Monitor • Garage
                </Text>
              </View>
            </View>

            <View style={styles.footerBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="verified-user" size={14} color="#001136" />
                <Text style={{ fontFamily: F.semibold, fontSize: 9.5, color: '#001136' }}>
                  Expediente Oficial de Monitoreo Vehicular • Empresas Del Valle S.A. • Folio: {reportFolio}
                </Text>
              </View>
              <Text style={{ fontFamily: F.regular, fontSize: 9.5, color: '#64748B' }}>
                Documento Auditado
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
    backgroundColor: 'rgba(0, 11, 33, 0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  topControls: {
    width: '100%',
    maxWidth: 920,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 10,
  },
  pdfBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 9,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetScroll: {
    width: '100%',
    maxWidth: 920,
  },
  sheetContainer: {
    paddingBottom: 40,
  },
  printableSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 28,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#001136',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corpTitle: {
    fontSize: 18,
    color: '#001136',
    letterSpacing: 0.8,
  },
  corpSub: {
    fontSize: 10,
    color: '#475569',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  corpRif: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  codePill: {
    backgroundColor: '#001136',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  healthPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  dividerThick: {
    height: 2.5,
    backgroundColor: '#001136',
    marginVertical: 14,
  },
  twoColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 14,
  },
  infoCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  cardHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
  },
  vehThumbBox: {
    width: 72,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateTag: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detailLine: {
    fontFamily: F.regular,
    fontSize: 11.5,
    color: '#334155',
  },
  sectionBlock: {
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  sectionTitleText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: '#001136',
    letterSpacing: 0.4,
  },
  threeColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  miniCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  miniCardLabel: {
    fontFamily: F.bold,
    fontSize: 9.5,
    color: '#64748B',
    letterSpacing: 0.4,
  },
  miniCardVal: {
    fontFamily: F.bold,
    fontSize: 12.5,
    color: '#0F172A',
    marginTop: 2,
  },
  miniCardSub: {
    fontFamily: F.regular,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  financeBox: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    padding: 12,
  },
  tableBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  th: {
    fontFamily: F.bold,
    fontSize: 9.5,
    color: '#475569',
    letterSpacing: 0.4,
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  td: {
    fontFamily: F.regular,
    fontSize: 11,
    color: '#334155',
  },
  tdBold: {
    fontFamily: F.bold,
    fontSize: 11,
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 28,
    marginBottom: 14,
    gap: 16,
  },
  sigCol: {
    flex: 1,
    alignItems: 'center',
  },
  sigLine: {
    width: '80%',
    height: 1,
    backgroundColor: '#0F172A',
    marginBottom: 6,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    marginTop: 8,
  },
});
