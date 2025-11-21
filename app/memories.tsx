import DateTimePicker from '@react-native-community/datetimepicker';
import auth from "@react-native-firebase/auth";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as VideoThumbnails from 'expo-video-thumbnails'; // ADD THIS IMPORT
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
import MemoryModal from "../modals/MemoryModal";
import { createMemory, subscribeToUserMemories } from "../services/memoriesService";

const screenWidth = Dimensions.get("window").width;
const numColumns = 3;
const imageSize = screenWidth / numColumns - 16;

export default function Memories() {
  const router = useRouter();
  const { albumId, date, title } = useLocalSearchParams<{ albumId: string; date: string; title: string }>();
  const [memories, setMemories] = useState<any[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [description, setDescription] = useState("");
  const [memoryDate, setMemoryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pageTitle, setPageTitle] = useState("Memories");
  const [videoThumbnails, setVideoThumbnails] = useState<{[key: string]: string}>({}); // ADD THIS
  
  // State for memory details modal
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const [showMemoryDetails, setShowMemoryDetails] = useState(false);

  // Function to generate video thumbnail
  const generateVideoThumbnail = async (videoUri: string, memoryId: string, index: number = 0) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // 1 second into the video
      });
      setVideoThumbnails(prev => ({
        ...prev,
        [`${memoryId}_${index}`]: uri
      }));
    } catch (error) {
      console.error('Error generating video thumbnail:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToUserMemories((memoriesList) => {
      setMemories(memoriesList);
      
      // Filter memories based on albumId or date
      let filtered = memoriesList;
      
      if (albumId) {
        // Filter by album
        filtered = memoriesList.filter(memory => 
          memory.albumIds && memory.albumIds.includes(albumId)
        );
        setPageTitle("Album Memories");
      } else if (date) {
        // Filter by specific date
        filtered = memoriesList.filter(memory => {
          if (!memory.date) return false;
          const memoryDate = new Date(memory.date).toDateString();
          const targetDate = new Date(date).toDateString();
          return memoryDate === targetDate;
        });
        setPageTitle(title || `Memories from ${new Date(date).toLocaleDateString()}`);
      } else {
        setPageTitle("All Memories");
      }
      
      // Generate thumbnails for videos in filtered memories
      filtered.forEach(memory => {
        if (memory.videoUrls && memory.videoUrls.length > 0) {
          memory.videoUrls.forEach((videoUri: string, index: number) => {
            generateVideoThumbnail(videoUri, memory.id, index);
          });
        }
      });
      
      setFilteredMemories(filtered);
    }, albumId);
    
    return () => unsubscribe();
  }, [albumId, date, title]);

  // Format time ago function
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Just now";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
  };

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "No date";
    
    try {
      const date = new Date(dateString);
      
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

  const handleSaveMemory = async () => {
    if (!image) {
      Alert.alert("Error", "Please select an image.");
      return;
    }
    
    if (!titleInput.trim()) {
      Alert.alert("Error", "Please enter a memory title.");
      return;
    }

    try {
      const localUri = await saveImageLocally(image);
      const formattedDate = memoryDate.toISOString().split('T')[0];

      // If we're in a date-specific view, use that date for the new memory
      const memoryDateToUse = date ? date : formattedDate;

      await createMemory(
        titleInput.trim(), 
        description || "", 
        localUri, 
        albumId ? [albumId] : [],
        memoryDateToUse
      );

      setTitleInput("");
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

  // Function to handle memory click
  const handleMemoryPress = (memory: any) => {
    setSelectedMemory(memory);
    setShowMemoryDetails(true);
  };

  // Handle modal close
  const handleCloseMemoryModal = () => {
    setShowMemoryDetails(false);
    setSelectedMemory(null);
  };

  // UPDATED: renderItem function to handle both imageUrl and imageUrls
  const renderItem = ({ item }: { item: any }) => {
    if (!item) return null;
    
    // Get display media - prefer first image from array, fallback to single image
    const displayImage = item.imageUrls?.[0] || item.imageUrl || '';
    const hasVideos = item.videoUrls && item.videoUrls.length > 0;
    const videoThumbnail = hasVideos ? videoThumbnails[`${item.id}_0`] : null;
    const isVideoOnly = !displayImage && hasVideos;
    
    return (
      <TouchableOpacity 
        style={styles.imageWrapper}
        onPress={() => handleMemoryPress(item)}
      >
        {displayImage ? (
          <Image 
            source={{ uri: displayImage }} 
            style={styles.image} 
          />
        ) : videoThumbnail ? (
          <View style={styles.thumbnailContainer}>
            <Image 
              source={{ uri: videoThumbnail }} 
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.videoOverlay}>
              <Icon name="play" size={20} color="#FFFFFF" />
            </View>
          </View>
        ) : isVideoOnly ? (
          <View style={styles.videoThumbnail}>
            <Icon name="play-circle-outline" size={32} color="#7C3AED" />
            <Text style={styles.videoThumbnailText}>Video</Text>
          </View>
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Icon name="image-off" size={32} color="#9CA3AF" />
            <Text style={styles.placeholderText}>No media</Text>
          </View>
        )}
        
        {/* Video indicator badge */}
        {hasVideos && (
          <View style={styles.videoBadge}>
            <Icon name="video" size={12} color="#FFFFFF" />
          </View>
        )}
        
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
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{pageTitle}</Text>
            <Text style={styles.infoSubtitle}>
              {albumId 
                ? "Memories collected in this album, attached together for a better memory."
                : date
                ? `Memories from ${new Date(date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}`
                : "A collection of moments attached together for a better memory, and the feelings those shared."
              }
            </Text>
            {date && (
              <View style={styles.dateBadge}>
                <Icon name="calendar" size={14} color="#7C3AED" />
                <Text style={styles.dateBadgeText}>
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            )}
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
          {filteredMemories.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="image-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No memories yet</Text>
              <Text style={styles.emptySubtitle}>
                {date 
                  ? `No memories for ${new Date(date).toLocaleDateString()}`
                  : albumId
                  ? "No memories in this album yet"
                  : "Add your first memory to start your collection"
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredMemories}
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
                    setTitleInput("");
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
                  value={titleInput}
                  onChangeText={setTitleInput}
                />
              </View>

              {/* Date Picker - Hide if we're in date-specific view */}
              {!date && (
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
              )}

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
                  setTitleInput("");
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

        {/* Memory Modal */}
        <MemoryModal
          visible={showMemoryDetails}
          memory={selectedMemory}
          onClose={handleCloseMemoryModal}
          formatDisplayDate={formatDisplayDate}
          formatTimeAgo={formatTimeAgo}
        />
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
    marginBottom: 8,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dateBadgeText: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600",
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
  videoThumbnail: {
    width: imageSize,
    height: imageSize,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  videoThumbnailText: {
    marginTop: 8,
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600",
  },
  placeholderThumbnail: {
    width: imageSize,
    height: imageSize,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#9CA3AF",
  },
  videoBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
   thumbnailContainer: {
    position: 'relative',
    width: imageSize,
    height: imageSize,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});