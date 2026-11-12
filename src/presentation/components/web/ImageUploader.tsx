import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface ImageUploaderProps {
  label: string;
  imageUri?: string;
  onImageChange: (uri: string) => void;
  presetImages?: { label: string; uri: string }[];
  isDark?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  imageUri,
  onImageChange,
  presetImages = [],
  isDark = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  const handlePickLocalImage = async () => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result as string;
              if (result) {
                onImageChange(result);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } else {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.granted) {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
            base64: true,
          });
          if (!result.canceled && result.assets && result.assets[0]) {
            const asset = result.assets[0];
            const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            onImageChange(uri);
          }
        }
      } catch (err) {
        console.warn('ImagePicker error:', err);
      }
    }
  };

  const cardBg = isDark ? '#0a2558' : '#F8FAFC';
  const borderCol = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const textColor = isDark ? '#FFFFFF' : '#001136';
  const subtextColor = isDark ? '#bdd2fe' : '#4b5f84';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { fontFamily: F.semibold, color: subtextColor }]}>
        {label}
      </Text>

      {/* Main Preview Box & Actions */}
      <View style={[styles.uploadBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
        {imageUri ? (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: imageUri }} 
              style={styles.previewImage} 
              resizeMode="cover" 
            />
            <TouchableOpacity 
              style={styles.removeBtn} 
              onPress={() => onImageChange('')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <MaterialIcons name="add-photo-alternate" size={32} color={subtextColor} />
            <Text style={{ fontFamily: F.medium, color: subtextColor, fontSize: 12, marginTop: 4 }}>
              Ninguna imagen seleccionada
            </Text>
          </View>
        )}

        {/* Action Controls */}
        <View style={styles.controlsCol}>
          <TouchableOpacity 
            style={[styles.uploadBtn, { backgroundColor: isDark ? '#bdd2fe' : '#001136' }]}
            onPress={handlePickLocalImage}
            activeOpacity={0.85}
          >
            <MaterialIcons 
              name="file-upload" 
              size={18} 
              color={isDark ? '#001136' : '#FFFFFF'} 
            />
            <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 12 }}>
              {imageUri ? 'Cambiar Imagen' : 'Subir Imagen del Equipo'}
            </Text>
          </TouchableOpacity>

          {/* Quick URL Input */}
          <View style={[styles.urlInputRow, { borderColor: borderCol }]}>
            <MaterialIcons name="link" size={16} color={subtextColor} />
            <TextInput
              style={[styles.urlInput, { color: textColor, fontFamily: F.medium }]}
              value={imageUri?.startsWith('http') ? imageUri : ''}
              onChangeText={onImageChange}
              placeholder="O pegar URL de imagen..."
              placeholderTextColor={subtextColor}
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>

      {/* Preset Suggestions (if available) */}
      {presetImages.length > 0 && (
        <View style={styles.presetsRow}>
          <Text style={{ fontFamily: F.medium, color: subtextColor, fontSize: 11 }}>
            Sugerencias corporativas:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {presetImages.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.presetChip, 
                  { backgroundColor: cardBg, borderColor: borderCol },
                  imageUri === preset.uri && { borderColor: '#00ae78', borderWidth: 1.5 }
                ]}
                onPress={() => onImageChange(preset.uri)}
              >
                <Text style={{ fontFamily: F.semibold, color: textColor, fontSize: 10 }}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  previewContainer: {
    width: 90,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    width: 90,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  controlsCol: {
    flex: 1,
    gap: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  urlInput: {
    flex: 1,
    fontSize: 11,
    padding: 2,
  },
  presetsRow: {
    marginTop: 6,
    gap: 4,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
});
