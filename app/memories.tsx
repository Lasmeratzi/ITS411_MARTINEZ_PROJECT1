import DateTimePicker from '@react-native-community/datetimepicker';
import auth from "@react-native-firebase/auth";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createMemory, subscribeToUserMemories } from "../services/memoriesService";

const screenWidth = Dimensions.get("window").width;
const numColumns = 3;
const imageSize = screenWidth / numColumns - 16;

export default function Memories() {
  const router = useRouter();
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const [memories, setMemories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memoryDate, setMemoryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("Memories");
  
  // NEW: State for memory details modal
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const [showMemoryDetails, setShowMemoryDetails] = useState(false);

   useEffect(() => {
    const unsubscribe = subscribeToUserMemories(setMemories, albumId);
    return () => unsubscribe();
  }, [albumId]);

  // ADD THIS RIGHT HERE - after the existing useEffect:
  useEffect(() => {
    if (albumId) {
      // You could fetch album details here if needed
      // For now, we'll just update the header title
      setAlbumTitle("Album Memories");
    } else {
      setAlbumTitle("Memories"); // Reset to default if no albumId
    }
  }, [albumId]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your gallery.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Save image locally to device storage
  const saveImageLocally = async (uri: string): Promise<string> => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      const memoriesDir = `${FileSystem.documentDirectory}memories/`;
      const dirInfo = await FileSystem.getInfoAsync(memoriesDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(memoriesDir, { intermediates: true });
      }

      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const localUri = `${memoriesDir}${fileName}`;

      await FileSystem.copyAsync({
        from: uri,
        to: localUri,
      });

      console.log("Image saved locally at:", localUri);
      return localUri;
    } catch (error) {
      console.error("Error saving image locally:", error);
      throw error;
    }
  };

  // UPDATED: handleSaveMemory function
  const handleSaveMemory = async () => {
    if (!image) {
      Alert.alert("Error", "Please select an image.");
      return;
    }
    
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a memory title.");
      return;
    }

    try {
      const localUri = await saveImageLocally(image);
      const formattedDate = memoryDate.toISOString().split('T')[0];

      await createMemory(
        title.trim(), 
        description || "", 
        localUri, 
        albumId || null, 
        formattedDate
      );

      setTitle("");
      setDescription("");
      setImage(null);
      setMemoryDate(new Date());
      setShowForm(false);
      Alert.alert("Success", "Memory saved!");

    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Save failed", error.message);
    }
  };

  // NEW: Function to handle memory click
  const handleMemoryPress = (memory: any) => {
    setSelectedMemory(memory);
    setShowMemoryDetails(true);
  };

  // UPDATED: renderItem function with click handler
  // In your renderItem, add extra safety:
const renderItem = ({ item }: { item: any }) => {
  // Safety check
  if (!item) return null;
  
  return (
    <TouchableOpacity 
      style={styles.imageWrapper}
      onPress={() => handleMemoryPress(item)}
    >
      <Image 
        source={{ uri: item.imageUrl || '' }} 
        style={styles.image} 
      />
      {item.title ? (
        <View style={styles.imageOverlay}>
          <Text style={styles.imageDescription} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

  // NEW: Format date for display
  // UPDATED: Fix date formatting function
const formatDisplayDate = (dateString: string) => {
  if (!dateString) return "No date";
  
  try {
    // Handle both formats: "2022-10-17" and "2022-10-17T00:00:00.000Z"
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date not available";
  }
};

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
  <TouchableOpacity 
    style={styles.backButton}
    onPress={() => router.back()}
  >
    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>{albumTitle}</Text> {/* UPDATED: Use dynamic title */}
  <View style={styles.placeholder} />
</View>

<View style={styles.content}>
  {/* Info Card */}
  <View style={styles.infoCard}>
    <Text style={styles.infoTitle}>{albumTitle}</Text> {/* UPDATED: Use dynamic title */}
    <Text style={styles.infoSubtitle}>
      {albumId 
        ? "Memories collected in this album, attached together for a better memory."
        : "A collection of moments attached together for a better memory, and the feelings those shared."
      }
    </Text>
  </View>

          {/* Add Memory Button */}
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setShowForm(true)}
          >
            <Icon name="plus-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Memory</Text>
          </TouchableOpacity>

          {/* Memories Grid */}
          {memories.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="image-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No memories yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your first memory to start your collection
              </Text>
            </View>
          ) : (
            <FlatList
              data={memories}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Go Back Button */}
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => router.back()}
          >
            <Icon name="arrow-left" size={20} color="#7C3AED" />
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>

        {/* Modal Form for Creating Memory */}
        <Modal visible={showForm} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Memory</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowForm(false);
                    setImage(null);
                    setTitle("");
                    setDescription("");
                    setMemoryDate(new Date());
                  }}
                >
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Image Picker */}
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Icon name="image-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.imagePickerText}>Select an image</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Memory Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Give your memory a title"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Date Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>When did this happen?</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.datePickerText}>
                    {memoryDate.toLocaleDateString()}
                  </Text>
                  <Icon name="calendar" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter memory description"
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity style={styles.submitButton} onPress={handleSaveMemory}>
                <Text style={styles.submitButtonText}>Save Memory</Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity 
                style={styles.cancelModalButton} 
                onPress={() => {
                  setShowForm(false);
                  setImage(null);
                  setTitle("");
                  setDescription("");
                  setMemoryDate(new Date());
                }}
              >
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
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={memoryDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setMemoryDate(selectedDate);
                  }
                }}
              />
            </View>
          </View>
        </Modal>

        {/* NEW: Memory Details Modal */}
        <Modal visible={showMemoryDetails} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.detailModalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Memory Details</Text>
                <TouchableOpacity
                  onPress={() => setShowMemoryDetails(false)}
                >
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedMemory && (
                <>
                  {/* Memory Image */}
                  <Image 
                    source={{ uri: selectedMemory.imageUrl }} 
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                  
                  {/* Memory Title */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Title</Text>
                    <Text style={styles.detailTitle}>{selectedMemory.title}</Text>
                  </View>

                  {/* Memory Date */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <View style={styles.dateRow}>
                      <Icon name="calendar" size={16} color="#6B7280" />
                      <Text style={styles.detailDate}>
                        {formatDisplayDate(selectedMemory.date)}
                      </Text>
                    </View>
                  </View>

                  {/* Memory Description */}
                  {selectedMemory.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.detailDescription}>
                        {selectedMemory.description}
                      </Text>
                    </View>
                  )}

                  {/* Close Button */}
                  <TouchableOpacity 
                    style={styles.closeDetailButton} 
                    onPress={() => setShowMemoryDetails(false)}
                  >
                    <Text style={styles.closeDetailText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF5FF",
  },
  header: {
    backgroundColor: "#7C3AED",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  grid: {
    paddingBottom: 20,
  },
  imageWrapper: {
    margin: 4,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  image: {
    width: imageSize,
    height: imageSize,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 8,
  },
  imageDescription: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    flex: 1,
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  goBackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goBackText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7C3AED",
  },
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
  // NEW: Detail modal specific styles
  detailModalContent: {
    maxHeight: '80%',
  },
  detailImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 28,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailDate: {
    fontSize: 16,
    color: "#7C3AED",
    fontWeight: "600",
  },
  detailDescription: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  closeDetailButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  closeDetailText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // Existing styles...
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
  imagePicker: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },
  imagePickerPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 8,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  inputGroup: {
    marginBottom: 20,
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