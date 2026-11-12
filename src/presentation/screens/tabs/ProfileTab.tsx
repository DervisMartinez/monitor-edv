import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Alert
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyMoto } from '../../context/MotoContext';
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Generator } from '../../../domain/entities/Generator';

export const ProfileTab: React.FC = () => {
  const { 
    activeGenerator, 
    generators, 
    selectGenerator, 
    deleteGenerator, 
    unassignGeneratorFromUser,
    setIsAddingMoto, 
    currentUser, 
    isSuperUser,
    logout 
  } = useMyMoto();
  const { colors, isDark, toggleTheme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  // Modals de confirmación cross-platform (Web y Nativo)
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [plantActionTarget, setPlantActionTarget] = useState<{ id: string; name: string; isDeleteDB: boolean } | null>(null);

  // Plantas asignadas al usuario: Superadmin ve toda la flota, operador ve las plantas a su cargo
  const displayGenerators = useMemo(() => {
    if (isSuperUser || !currentUser?.assignedGeneratorIds || currentUser.assignedGeneratorIds.length === 0) {
      return generators;
    }
    const filtered = generators.filter(g => currentUser.assignedGeneratorIds?.includes(g.id));
    return filtered.length > 0 ? filtered : generators;
  }, [generators, isSuperUser, currentUser]);

  const F = {
    extrabold: 'Montserrat_800ExtraBold',
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setShowLogoutModal(false);
    } catch (err) {
      console.warn('Error during logout:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Solo Superadmin puede eliminar de la BD. Operadores solo desvinculan de su perfil.
  const handleOpenPlantAction = (id: string, name: string, isDeleteDB: boolean) => {
    setPlantActionTarget({ id, name, isDeleteDB });
  };

  const handleConfirmPlantAction = async () => {
    if (!plantActionTarget) return;
    try {
      if (plantActionTarget.isDeleteDB) {
        if (!isSuperUser) {
          Alert.alert('Acceso Denegado', 'Solo el Super Administrador puede eliminar plantas de la base de datos.');
          return;
        }
        await deleteGenerator(plantActionTarget.id);
      } else {
        // Desvincular de perfil de usuario sin tocar la base de datos de plantas
        if (currentUser?.id) {
          await unassignGeneratorFromUser(currentUser.id, plantActionTarget.id);
        }
      }
    } finally {
      setPlantActionTarget(null);
    }
  };

  const cardBg = isDark ? '#191C24' : '#FFFFFF';
  const textPrimary = colors.onSurface;
  const textSecondary = colors.onSurfaceVariant;
  const isSmallPhone = windowWidth < 360;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isSmallPhone ? 14 : 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            CONFIGURACIÓN Y CUENTA
          </Text>
          <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: isSmallPhone ? 20 : 23, marginTop: 2 }}>
            Perfil de Operación
          </Text>
        </View>

        {/* User Profile Card */}
        <View style={[styles.userCard, { backgroundColor: cardBg }]}>
          <View style={styles.avatarCircle}>
            <MaterialIcons name="person" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15 }} numberOfLines={1}>
              {currentUser?.fullName || 'Super Administrador Empresas del Valle'}
            </Text>
            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
              {currentUser?.email || 'admin@empresasdelvalle.com'}
            </Text>
            <View style={[
              styles.rolePill, 
              { backgroundColor: currentUser?.role === 'superadmin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(37, 99, 235, 0.15)' }
            ]}>
              <Text style={{ 
                fontFamily: F.bold, 
                fontSize: 10, 
                color: currentUser?.role === 'superadmin' ? '#F59E0B' : colors.primary 
              }}>
                ROL: {currentUser?.role?.toUpperCase() || 'OPERADOR'}
              </Text>
            </View>
          </View>
        </View>

        {/* Fleet Section */}
        <View style={{ marginTop: 22 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15 }}>
              {isSuperUser ? `Plantas Eléctricas Flota (${displayGenerators.length})` : `Plantas a tu Cargo (${displayGenerators.length})`}
            </Text>
            {isSuperUser && (
              <TouchableOpacity 
                style={[styles.addPlantBtn, { backgroundColor: colors.primary }]}
                onPress={() => setIsAddingMoto(true)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={16} color="#FFFFFF" />
                <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 11 }}>Nueva Planta</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: 10 }}>
            {displayGenerators.map((gen: Generator) => {
              const isActive = gen.id === activeGenerator?.id;
              return (
                <TouchableOpacity
                  key={gen.id}
                  style={[
                    styles.genItemCard,
                    { backgroundColor: cardBg, borderColor: isActive ? colors.primary : 'transparent' },
                    isActive && { borderWidth: 2 }
                  ]}
                  onPress={() => selectGenerator(gen.id)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={[
                      styles.genIconCircle, 
                      { backgroundColor: isActive ? 'rgba(37, 99, 235, 0.15)' : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F4F9') }
                    ]}>
                      <MaterialCommunityIcons name="engine" size={20} color={isActive ? colors.primary : textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }}>
                          {gen.name}
                        </Text>
                        {isActive && (
                          <View style={styles.activeTag}>
                            <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 9 }}>ACTIVA</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, marginTop: 2 }}>
                        {gen.brand} {gen.model} • {gen.capacityKva} kVA • {gen.currentHours.toFixed(1)} hrs
                      </Text>
                    </View>
                  </View>

                  {/* Acciones de Planta: Solo Superadmin puede borrar de la BD. Operadores solo desvinculan */}
                  {isSuperUser ? (
                    <TouchableOpacity 
                      onPress={() => handleOpenPlantAction(gen.id, gen.name, true)}
                      style={{ padding: 8 }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="delete-outline" size={19} color="#EF4444" />
                    </TouchableOpacity>
                  ) : displayGenerators.length > 1 ? (
                    <TouchableOpacity 
                      onPress={() => handleOpenPlantAction(gen.id, gen.name, false)}
                      style={{ padding: 8 }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="link-off" size={18} color={textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Preferences */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 15, marginBottom: 10 }}>
            Preferencias de la Aplicación
          </Text>

          <View style={[styles.prefCard, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 }}>
              <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }}>
                  Modo Oscuro (Dark Theme)
                </Text>
                <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11, marginTop: 2 }}>
                  Optimizado para salas de control y visibilidad técnica nocturna
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialIcons name="logout" size={19} color="#EF4444" />
          <Text style={{ fontFamily: F.bold, color: '#EF4444', fontSize: 14 }}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>

        {/* Corporate Security Footer */}
        <View style={styles.corporateFooter}>
          <View style={styles.footerSealRow}>
            <MaterialIcons name="verified-user" size={14} color={isDark ? '#bdd2fe' : '#4b5f84'} />
            <Text style={[styles.footerSealText, { fontFamily: F.semibold, color: textSecondary }]}>
              Empresas Del Valle • Plataforma Segura
            </Text>
            <Text style={{ color: textSecondary }}>•</Text>
            <Text style={{ fontFamily: F.bold, color: isDark ? '#bdd2fe' : '#001136', fontSize: 11 }}>v2.4</Text>
          </View>
          <Text style={[styles.footerLegalText, { fontFamily: F.medium, color: textSecondary }]}>
            CONECTIVIDAD CIFRADA TLS 1.3
          </Text>
        </View>

      </ScrollView>

      {/* ==================================================== */}
      {/* MODAL: CONFIRMACIÓN CERRAR SESIÓN */}
      {/* ==================================================== */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.confirmDialog, { backgroundColor: cardBg }]}>
            <View style={styles.logoutIconCircle}>
              <MaterialIcons name="logout" size={26} color="#EF4444" />
            </View>

            <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 18, textAlign: 'center', marginTop: 14 }}>
              ¿Cerrar Sesión?
            </Text>
            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
              ¿Estás seguro de que deseas salir del dispositivo? Deberás ingresar tus credenciales nuevamente para acceder.
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.btnCancel, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmLogout, { backgroundColor: '#EF4444' }]}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
                activeOpacity={0.85}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="logout" size={16} color="#FFFFFF" />
                    <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 13 }}>
                      Cerrar Sesión
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL: ACCIONES DE PLANTA (ELIMINAR BD O DESVINCULAR) */}
      {/* ==================================================== */}
      <Modal
        visible={Boolean(plantActionTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setPlantActionTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.confirmDialog, { backgroundColor: cardBg }]}>
            <View style={[
              styles.logoutIconCircle, 
              { backgroundColor: plantActionTarget?.isDeleteDB ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)' }
            ]}>
              <MaterialCommunityIcons 
                name={plantActionTarget?.isDeleteDB ? "delete-sweep" : "link-off"} 
                size={26} 
                color={plantActionTarget?.isDeleteDB ? "#EF4444" : "#F59E0B"} 
              />
            </View>

            <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 18, textAlign: 'center', marginTop: 14 }}>
              {plantActionTarget?.isDeleteDB ? '¿Eliminar de la Base de Datos?' : '¿Desvincular de tu Perfil?'}
            </Text>
            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
              {plantActionTarget?.isDeleteDB 
                ? `Esta acción eliminará permanentemente la planta "${plantActionTarget?.name}" de la flota corporativa y del panel administrativo.`
                : `La planta "${plantActionTarget?.name}" se retirará de tu perfil móvil. Seguirá activa y protegida en la base de datos y en el panel web.`}
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.btnCancel, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}
                onPress={() => setPlantActionTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnConfirmLogout, 
                  { backgroundColor: plantActionTarget?.isDeleteDB ? '#EF4444' : '#F59E0B' }
                ]}
                onPress={handleConfirmPlantAction}
                activeOpacity={0.85}
              >
                <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 13 }}>
                  {plantActionTarget?.isDeleteDB ? 'Eliminar de la BD' : 'Desvincular'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    paddingBottom: 125,
  },
  header: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addPlantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  genItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
  },
  genIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTag: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  corporateFooter: {
    marginTop: 32,
    alignItems: 'center',
    gap: 6,
  },
  footerSealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.85,
  },
  footerSealText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  footerLegalText: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  modalBackdrop: {
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
  logoutIconCircle: {
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
  btnConfirmLogout: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
