/**
 * PALETA OFICIAL CORPORATIVA - EMPRESAS DEL VALLE
 * Extraída de PALETAEDV.jpg:
 * - Blanco Puro: #FFFFFF
 * - Blanco Cálido: #FBFBF5
 * - Arena Suave: #CFCDBC
 * - Pizarra Suave: #B4BCC8
 * - Azul Acero: #40606E
 * - Petróleo Oscuro / Contenedor: #1A3441
 * - Azul Marino Petróleo / Fondo Dark: #092332
 * - Azul Real Corporativo / Primario: #1F2E54
 */

export const EDVPalette = {
  white: '#FFFFFF',
  warmWhite: '#FBFBF5',
  sand: '#CFCDBC',
  softSlate: '#B4BCC8',
  steelTeal: '#40606E',
  deepPetrol: '#1A3441',
  darkNavy: '#092332',
  corporateNavy: '#1F2E54',
  electricGreen: '#10B981',
  electricRed: '#EF4444',
  amberAlert: '#F59E0B',
};

export const DarkTheme = {
  surface: '#092332',                     // Fondo principal oscuro oficial
  surfaceContainerLowest: '#061722',
  surfaceContainerLow: '#0E2938',
  surfaceContainer: '#1A3441',            // Contenedor de tarjetas oficial
  surfaceContainerHigh: '#254454',
  surfaceContainerHighest: '#33576A',
  surfaceBright: '#1A3441',
  onSurface: '#FBFBF5',                   // Texto principal (Blanco Cálido)
  onSurfaceVariant: '#B4BCC8',            // Etiquetas secundarias (Pizarra suave)
  primary: '#38BDF8',                     // Acento celeste legible en Dark sobre Navy
  primaryContainer: '#1F2E54',            // Azul corporativo institucional
  onPrimary: '#092332',
  onPrimaryContainer: '#FBFBF5',
  secondary: '#10B981',                   // Verde generador activo / óptimo
  secondaryContainer: '#064E3B',
  onSecondary: '#FFFFFF',
  tertiary: '#40606E',                    // Azul acero
  tertiaryContainer: '#1A3441',
  onTertiary: '#FBFBF5',
  error: '#EF4444',                       // Alerta corte eléctrico / falla
  errorContainer: '#7F1D1D',
  onError: '#FFFFFF',
  onErrorContainer: '#FEE2E2',
  surfaceTint: '#38BDF8',
  outline: '#40606E',                     // Borde azul acero
  outlineVariant: 'rgba(180, 188, 200, 0.2)', // Hairline pizarra
  statusBar: 'light-content' as const,

  // Corporate Fixed Tokens
  primaryFixed: '#dae2ff',
  primaryFixedDim: '#b1c5ff',
  secondaryFixed: '#d7e2ff',
  secondaryFixedDim: '#b2c7f2',
  tertiaryFixed: '#dfe3e7',
  tertiaryFixedDim: '#c3c7cb',
  corporateNavy: '#1F2E54',
  corporateBlue: '#1A3441',
  corporateDark: '#092332',
};

export const LightTheme = {
  surface: '#FBFBF5',                     // Fondo principal claro oficial
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#FFFFFF',         // Tarjetas blancas nítidas
  surfaceContainer: '#F0EFE6',            // Contenedor suave
  surfaceContainerHigh: '#E5E3D5',
  surfaceContainerHighest: '#CFCDBC',     // Arena neutro
  surfaceBright: '#FFFFFF',
  onSurface: '#092332',                   // Texto principal (Azul Marino Petróleo)
  onSurfaceVariant: '#40606E',            // Texto secundario (Azul Acero)
  primary: '#1F2E54',                     // Azul corporativo Empresas del Valle
  primaryContainer: '#1F2E54',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FFFFFF',
  secondary: '#059669',                   // Verde generador
  secondaryContainer: '#D1FAE5',
  onSecondary: '#FFFFFF',
  tertiary: '#40606E',
  tertiaryContainer: '#CFCDBC',
  onTertiary: '#092332',
  error: '#DC2626',
  errorContainer: '#FEE2E2',
  onError: '#FFFFFF',
  onErrorContainer: '#991B1B',
  surfaceTint: '#1F2E54',
  outline: '#B4BCC8',                     // Borde pizarra suave
  outlineVariant: 'rgba(31, 46, 84, 0.12)',
  statusBar: 'dark-content' as const,

  // Corporate Fixed Tokens
  primaryFixed: '#dae2ff',
  primaryFixedDim: '#b1c5ff',
  secondaryFixed: '#d7e2ff',
  secondaryFixedDim: '#b2c7f2',
  tertiaryFixed: '#dfe3e7',
  tertiaryFixedDim: '#c3c7cb',
  corporateNavy: '#1F2E54',
  corporateBlue: '#1A3441',
  corporateDark: '#092332',
};

export type AppThemeColors = Omit<typeof LightTheme, 'statusBar'> & {
  statusBar: 'light-content' | 'dark-content';
};
