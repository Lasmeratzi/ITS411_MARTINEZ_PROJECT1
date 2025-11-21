import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

interface AlbumModalProps {
  visible: boolean;
  albumTitle: string;
  albumDescription: string;
  selectedColor: string;
  albumDate: Date | null;
  albumCoverImage: string | null; // ADD THIS
  onAlbumTitleChange: (text: string) => void;
  onAlbumDescriptionChange: (text: string) => void;
  onColorSelect: (color: string) => void;
  onDateChange: (date: Date | null) => void;
  onCoverImageChange: (imageUri: string | null) => void; // ADD THIS
  onSubmit: () => void;
  onClose: () => void;
  isEditing?: boolean;
}

const COLOR_OPTIONS = [
  "#FF9A8B", "#7C3AED", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16", "#F97316",
];

export default function AlbumModal({
  visible,
  albumTitle,
  albumDescription,
  selectedColor,
  albumDate,
  albumCoverImage, // ADD THIS
  onAlbumTitleChange,
  onAlbumDescriptionChange,
  onColorSelect,
  onDateChange,
  onCoverImageChange, // ADD THIS
  onSubmit,
  onClose,
  isEditing = false,
}: AlbumModalProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Format date for display
  const formatDisplayDate = (date: Date | null) => {
    if (!date) return "No date selected";
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleClose = () => {
    setShowDatePicker(false);
    onClose();
  };

  // ADD: Cover image picker function
  const pickCoverImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow access to your gallery.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for album covers
      });

      if (!result.canceled) {
        // Save image locally
        const coversDir = `${FileSystem.documentDirectory}covers/`;
        const dirInfo = await FileSystem.getInfoAsync(coversDir);
        
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(coversDir, { intermediates: true });
        }

        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const localUri = `${coversDir}${fileName}`;

        await FileSystem.copyAsync({
          from: result.assets[0].uri,
          to: localUri,
        });

        onCoverImageChange(localUri);
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to select cover image");
      console.error('Cover image selection error:', error);
    }
  };

  // ADD: Remove cover image function
  const removeCoverImage = () => {
    onCoverImageChange(null);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? "Edit Album" : "Create New Album"}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* ADD: Cover Image Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Album Cover (Optional)</Text>
              <View style={styles.coverImageSection}>
                {albumCoverImage ? (
                  <View style={styles.coverImageContainer}>
                    <Image 
                      source={{ uri: albumCoverImage }} 
                      style={styles.coverImage}
                    />
                    <TouchableOpacity 
                      style={styles.removeCoverButton}
                      onPress={removeCoverImage}
                    >
                      <Icon name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.coverImagePlaceholder}
                    onPress={pickCoverImage}
                  >
                    <Icon name="image-plus" size={32} color="#9CA3AF" />
                    <Text style={styles.coverImagePlaceholderText}>
                      Add Cover Image
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.coverImageHelperText}>
                Choose a cover image to represent this album
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Album Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter album name"
                placeholderTextColor="#9CA3AF"
                value={albumTitle}
                onChangeText={onAlbumTitleChange}
              />
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter album description"
                placeholderTextColor="#9CA3AF"
                value={albumDescription}
                onChangeText={onAlbumDescriptionChange}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Color Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Album Color</Text>
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => onColorSelect(color)}
                  >
                    {selectedColor === color && (
                      <Icon name="check" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Picker Button - Optional for regular albums */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date (Optional)</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {formatDisplayDate(albumDate)}
                </Text>
                <Icon name="calendar" size={20} color="#6B7280" />
              </TouchableOpacity>
              
              {/* Clear Date Button */}
              {albumDate && (
                <TouchableOpacity 
                  style={styles.clearDateButton}
                  onPress={() => onDateChange(null)}
                >
                  <Text style={styles.clearDateText}>Clear Date</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
              <Text style={styles.submitButtonText}>
                {isEditing ? "Update Album" : "Create Album"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelModalButton} onPress={handleClose}>
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Album Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={albumDate || new Date()}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  onDateChange(selectedDate);
                }
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#111827",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // ADD: Cover Image Styles
  coverImageSection: {
    alignItems: 'center',
  },
  coverImageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeCoverButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImagePlaceholder: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  coverImageHelperText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: "#111827",
    transform: [{ scale: 1.1 }],
  },
  // Date Picker Styles
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
  },
  datePickerText: {
    fontSize: 15,
    color: '#111827',
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  clearDateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  submitButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelModalButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  cancelModalText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
});