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
  const [description, setDescription] = useState("");
  const [albumTitle, setAlbumTitle] = useState("Memories");

  useEffect(() => {
    const unsubscribe = subscribeToUserMemories(setMemories, albumId);
    return () => unsubscribe();
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

      // Create memories directory if it doesn't exist
      const memoriesDir = `${FileSystem.documentDirectory}memories/`;
      const dirInfo = await FileSystem.getInfoAsync(memoriesDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(memoriesDir, { intermediates: true });
      }

      // Generate unique filename
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const localUri = `${memoriesDir}${fileName}`;

      // Copy image to local storage
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

  const handleSaveMemory = async () => {
    if (!image) {
      Alert.alert("Error", "Please select an image.");
      return;
    }

    try {
      // Save image to device local storage
      const localUri = await saveImageLocally(image);

      // Save memory with local file path to Firestore
      await createMemory(description || "Untitled memory", localUri, albumId || null);

      setImage(null);
      setDescription("");
      setShowForm(false);
      Alert.alert("Success", "Memory saved!");

    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Save failed", error.message);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.imageWrapper}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      {item.description && (
        <View style={styles.imageOverlay}>
          <Text style={styles.imageDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
          <Text style={styles.headerTitle}>Memories</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Memories</Text>
            <Text style={styles.infoSubtitle}>
              A collection of moments attached together for a better memory, and the feelings those shared.
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

        {/* Modal Form */}
        <Modal visible={showForm} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Memory</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowForm(false);
                    setImage(null);
                    setDescription("");
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
                  setDescription("");
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
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
    minHeight: 80,
    textAlignVertical: "top",
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