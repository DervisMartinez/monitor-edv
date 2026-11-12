import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Image,
  Alert 
} from 'react-native';
import { useMyMoto } from '../context/MotoContext';
import { useTheme } from '../context/ThemeContext';
import { Generator, FuelType } from '../../domain/entities/Generator';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GENERATOR_CATALOG, CatalogGenerator } from '../../data/catalog';

export const SetupScreen = () => {
  const { saveGenerator, setIsAddingMoto, isAddingMoto, generators } = useMyMoto();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Blue Power Generation');
  const [model, setModel] = useState('C125');
  const [capacityKva, setCapacityKva] = useState('125');
  const [fuelType, setFuelType] = useState<FuelType>('diesel');
  const [currentHours, setCurrentHours] = useState('0');
  const [serviceInterval, setServiceInterval] = useState('200');
  const [location, setLocation] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogGenerator | null>(GENERATOR_CATALOG[0]);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const handleSelectCatalog = (item: CatalogGenerator) => {
    setSelectedCatalogItem(item);
    setBrand(item.brand);
    setModel(item.model);
    setCapacityKva(item.capacityKva.toString());
    setFuelType(item.fuelType);
    setServiceInterval(item.defaultIntervalHours.toString());
    if (!name) {
      setName(`Planta ${item.brand} ${item.model}`);
    }
  };

  const handleSave = async () => {
    const kvaNum = parseFloat(capacityKva) || 100;
    const hoursNum = parseFloat(currentHours) || 0;
    const intervalNum = parseFloat(serviceInterval) || 200;

    const newGen: Generator = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim() || `Planta ${brand} ${model}`,
      brand: brand.trim(),
      model: model.trim(),
      capacityKva: kvaNum,
      fuelType,
      currentHours: Number(hoursNum.toFixed(1)),
      serviceIntervalHours: intervalNum,
      lastServiceHours: 0,
      location: location.trim(),
      serialNumber: serialNumber.trim(),
      catalogImageRes: selectedCatalogItem?.imageRes || GENERATOR_CATALOG[0].imageRes,
      status: 'standby',
    };

    await saveGenerator(newGen);
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
        contentContainerStyle={{ padding: 24, paddingBottom: 60, maxWidth: 520, width: '100%', alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {isAddingMoto && generators.length > 0 && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setIsAddingMoto(false)}
            >
              <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12, letterSpacing: 0.8 }}>
              CONFIGURACIÓN INICIAL
            </Text>
            <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 22 }}>
              Registrar Planta Eléctrica
            </Text>
            <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginTop: 2 }}>
              Configura el generador eléctrico para iniciar el monitoreo de horas y cortes.
            </Text>
          </View>
        </View>

        {/* 1. Catálogo Rápido de Plantas Eléctricas */}
        <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15, marginTop: 16, marginBottom: 10 }}>
          Selecciona del Catálogo de Plantas:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24, paddingHorizontal: 24 }}>
          {GENERATOR_CATALOG.map((item) => {
            const isSelected = selectedCatalogItem?.id === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.catalogCard,
                  { backgroundColor: cardBg, borderColor: isSelected ? colors.primary : 'transparent' },
                  isSelected && { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' }
                ]}
                onPress={() => handleSelectCatalog(item)}
              >
                <Image source={item.imageRes} style={styles.catalogThumb} resizeMode="contain" />
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13, marginTop: 6 }} numberOfLines={1}>
                  {item.brand}
                </Text>
                <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }} numberOfLines={1}>
                  {item.model} • {item.capacityKva} kVA
                </Text>
                <View style={[styles.fuelTag, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                  <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 10 }}>
                    {item.fuelType.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2. Formulario de Datos Técnicos */}
        <View style={[styles.formContainer, { backgroundColor: cardBg, marginTop: 20 }]}>
          <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16, marginBottom: 14 }}>
            Especificaciones del Generador
          </Text>

          {/* Nombre */}
          <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
            Nombre Identificativo de la Planta:
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
            value={name}
            onChangeText={setName}
            placeholder="Ej: Planta Principal Sede Central"
            placeholderTextColor={textSecondary}
          />

          {/* Marca y Modelo */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Marca:</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                value={brand}
                onChangeText={setBrand}
                placeholder="Blue Power Generation"
                placeholderTextColor={textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Modelo:</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
                value={model}
                onChangeText={setModel}
                placeholder="C125"
                placeholderTextColor={textSecondary}
              />
            </View>
          </View>

          {/* Capacidad y Combustible */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Capacidad (kVA):</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]}
                value={capacityKva}
                onChangeText={setCapacityKva}
                keyboardType="numeric"
                placeholder="125"
                placeholderTextColor={textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>Combustible:</Text>
              <View style={styles.fuelBtnRow}>
                {(['diesel', 'gasolina', 'gas'] as FuelType[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.fuelOptionBtn,
                      { backgroundColor: inputBg },
                      fuelType === f && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setFuelType(f)}
                  >
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: fuelType === f ? '#FFFFFF' : textSecondary }}>
                      {f.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Horómetro Inicial e Intervalo */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                Horómetro Inicial (Horas):
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]}
                value={currentHours}
                onChangeText={setCurrentHours}
                keyboardType="numeric"
                placeholder="0.0"
                placeholderTextColor={textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
                Servicio cada (Horas):
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.bold }]}
                value={serviceInterval}
                onChangeText={setServiceInterval}
                keyboardType="numeric"
                placeholder="200"
                placeholderTextColor={textSecondary}
              />
            </View>
          </View>

          {/* Ubicación Física */}
          <Text style={[styles.label, { fontFamily: F.semibold, color: textSecondary }]}>
            Ubicación Física de la Planta:
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textPrimary, fontFamily: F.medium }]}
            value={location}
            onChangeText={setLocation}
            placeholder="Ej: Sala de Máquinas - Sótano 1"
            placeholderTextColor={textSecondary}
          />

          {/* Botón Guardar */}
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
            <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 15 }}>
              Guardar Planta Eléctrica
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    padding: 6,
  },
  catalogCard: {
    width: 145,
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  catalogThumb: {
    width: 100,
    height: 75,
  },
  fuelTag: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  formContainer: {
    borderRadius: 18,
    padding: 20,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  fuelBtnRow: {
    flexDirection: 'row',
    gap: 4,
  },
  fuelOptionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 22,
  },
});
