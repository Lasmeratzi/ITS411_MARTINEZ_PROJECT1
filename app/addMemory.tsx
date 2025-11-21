import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { saveToAppGallery, saveToDeviceGallery } from "../services/galleryService";
import { createMemoryWithMultipleImages } from "../services/memoriesService";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  savedToGallery?: boolean; // ADD THIS LINE
}

export default function AddMemory() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUris, setMediaUris] = useState<MediaItem[]>([]); // CHANGED: Now supports both images and videos
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMediaPreview, setShowMediaPreview] = useState(false); // CHANGED: Renamed from imagePreview
  const [previewMediaIndex, setPreviewMediaIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // NEW: Pick multiple images AND videos
  const pickMultipleMedia = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert("Permission required", "Sorry, we need camera roll permissions to upload media.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: false,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newMediaItems: MediaItem[] = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        // Remove thumbnail since it's not available
      }));
      
      setMediaUris(prev => [...prev, ...newMediaItems]);
    }
  } catch (error) {
    console.error("Error picking media:", error);
    Alert.alert("Error", "Failed to pick media. Please try again.");
  }
};
  // NEW: Pick only videos
  const pickVideos = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert("Permission required", "Sorry, we need camera roll permissions to upload videos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newMediaItems: MediaItem[] = result.assets.map(asset => ({
        uri: asset.uri,
        type: 'video',
        // Remove thumbnail since it's not available
      }));
      
      setMediaUris(prev => [...prev, ...newMediaItems]);
    }
  } catch (error) {
    console.error("Error picking videos:", error);
    Alert.alert("Error", "Failed to pick videos. Please try again.");
  }
};
  const takePhoto = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert("Permission required", "Sorry, we need camera permissions to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: false,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const newImageUri = result.assets[0].uri;
      
      // Show our custom save options
      Alert.alert(
        "Save Photo?",
        "What would you like to do with this photo?",
        [
          {
            text: "Just Use in Memory",
            style: "cancel",
            onPress: () => {
              setMediaUris(prev => [...prev, {
                uri: newImageUri,
                type: 'image'
              }]);
            }
          },
          {
            text: "Save to App Gallery & Use",
            onPress: async () => {
              try {
                const galleryUri = await saveToAppGallery(newImageUri);
                setMediaUris(prev => [...prev, {
                  uri: galleryUri,
                  type: 'image',
                  savedToGallery: true
                }]);
                Alert.alert("Success", "Photo saved to app gallery!");
              } catch (error: any) {
                console.error("Error saving to gallery:", error);
                // Fallback to original image
                setMediaUris(prev => [...prev, {
                  uri: newImageUri,
                  type: 'image'
                }]);
                Alert.alert("Error", "Failed to save to gallery, but photo was added to memory.");
              }
            }
          },
          {
            text: "Save to Device Gallery & Use",
            onPress: async () => {
              try {
                const deviceSaved = await saveToDeviceGallery(newImageUri);
                setMediaUris(prev => [...prev, {
                  uri: newImageUri,
                  type: 'image'
                }]);
                if (deviceSaved) {
                  Alert.alert("Success", "Photo saved to device gallery!");
                }
              } catch (error: any) {
                console.error("Error saving to device gallery:", error);
                setMediaUris(prev => [...prev, {
                  uri: newImageUri,
                  type: 'image'
                }]);
                Alert.alert("Error", "Failed to save to device gallery, but photo was added to memory.");
              }
            }
          }
        ]
      );
    }
  } catch (error) {
    console.error("Error taking photo:", error);
    Alert.alert("Error", "Failed to take photo. Please try again.");
  }
};
  // NEW: Take video with camera
  const takeVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert("Permission required", "Sorry, we need camera permissions to record videos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: 60, // 1 minute max
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setMediaUris(prev => [...prev, {
          uri: result.assets[0].uri,
          type: 'video'
        }]);
      }
    } catch (error) {
      console.error("Error recording video:", error);
      Alert.alert("Error", "Failed to record video. Please try again.");
    }
  };

  const cropImage = async (index: number) => {
    if (!mediaUris[index] || mediaUris[index].type !== 'image') return;

    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        mediaUris[index].uri,
        [
          {
            crop: {
              originX: 0,
              originY: 0,
              width: 0.8,
              height: 0.8,
            },
          },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      const updatedUris = [...mediaUris];
      updatedUris[index] = {
        ...updatedUris[index],
        uri: manipResult.uri
      };
      setMediaUris(updatedUris);
      setShowMediaPreview(false);
    } catch (error) {
      console.error("Error cropping image:", error);
      Alert.alert("Error", "Failed to crop image. Please try again.");
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCreateMemory = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a title for your memory.");
      return;
    }

    if (mediaUris.length === 0) {
      Alert.alert("No media", "Please select at least one image or video for your memory.");
      return;
    }

    setLoading(true);

    try {
      const formattedDate = formatDate(selectedDate);
      
      console.log("Creating memory with date:", formattedDate);
      
      // Separate images and videos
      const imageUris = mediaUris.filter(item => item.type === 'image').map(item => item.uri);
      const videoUris = mediaUris.filter(item => item.type === 'video').map(item => item.uri);
      
      // You'll need to update your service to handle videos
      await createMemoryWithMultipleImages(
  title.trim(),
  description.trim(),
  imageUris,
  videoUris, // This is now the 4th parameter (videoUrls)
  [], // This is the 5th parameter (albumIds) - empty array
  formattedDate // This is the 6th parameter (date)
);
      console.log("Memory created successfully, navigating back...");
      router.back();
      
    } catch (error: any) {
      console.error("Error creating memory:", error);
      Alert.alert("Error", "Failed to create memory. Please try again.");
      setLoading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUris(prev => prev.filter((_, i) => i !== index));
  };

  const removeAllMedia = () => {
    setMediaUris([]);
  };

  const handleBack = () => {
    router.back();
  };

  const openMediaPreview = (index: number) => {
    setPreviewMediaIndex(index);
    setShowMediaPreview(true);
  };

  const confirmMedia = () => {
    setShowMediaPreview(false);
  };

  const goToNextMedia = () => {
    if (previewMediaIndex < mediaUris.length - 1) {
      setPreviewMediaIndex(previewMediaIndex + 1);
    }
  };

  const goToPrevMedia = () => {
    if (previewMediaIndex > 0) {
      setPreviewMediaIndex(previewMediaIndex - 1);
    }
  };

  // Helper to count media types
  const getMediaCounts = () => {
    const images = mediaUris.filter(item => item.type === 'image').length;
    const videos = mediaUris.filter(item => item.type === 'video').length;
    return { images, videos };
  };

  const { images: imageCount, videos: videoCount } = getMediaCounts();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Memory</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Form */}
        <View style={styles.form}>
          {/* Media Upload Section */}
          <View style={styles.uploadSection}>
            <Text style={styles.sectionLabel}>
              Media {mediaUris.length > 0 && `(${mediaUris.length} selected)`}
              {mediaUris.length > 0 && ` - ${imageCount} images, ${videoCount} videos`}
            </Text>
            
            {mediaUris.length > 0 ? (
              <View style={styles.mediaPreviewsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.mediaPreviews}>
                    {mediaUris.map((media, index) => (
                      <View key={index} style={styles.mediaPreviewWrapper}>
                        <TouchableOpacity onPress={() => openMediaPreview(index)}>
                          <Image 
                            source={{ uri: media.uri }} 
                            style={styles.mediaPreview} 
                            resizeMode="cover"
                          />
                          {/* Video indicator */}
                          {media.type === 'video' && (
                            <View style={styles.videoIndicator}>
                              <Icon name="play" size={20} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.removeMediaButton}
                          onPress={() => removeMedia(index)}
                        >
                          <Icon name="close" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity 
                      style={styles.addMoreButton}
                      onPress={pickMultipleMedia}
                    >
                      <Icon name="plus" size={24} color="#7C3AED" />
                      <Text style={styles.addMoreText}>Add More</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
                
                {/* Remove All Button */}
                <TouchableOpacity 
                  style={styles.removeAllButton}
                  onPress={removeAllMedia}
                >
                  <Icon name="delete-outline" size={16} color="#EF4444" />
                  <Text style={styles.removeAllText}>Remove All</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadButtons}>
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={pickMultipleMedia}
                >
                  <Icon name="image-multiple-outline" size={32} color="#7C3AED" />
                  <Text style={styles.uploadButtonText}>Choose Photos & Videos</Text>
                  <Text style={styles.uploadButtonSubtext}>Select multiple photos and videos</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={pickVideos}
                >
                  <Icon name="video-outline" size={32} color="#7C3AED" />
                  <Text style={styles.uploadButtonText}>Choose Videos Only</Text>
                  <Text style={styles.uploadButtonSubtext}>Select multiple videos</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={takePhoto}
                >
                  <Icon name="camera-outline" size={32} color="#7C3AED" />
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                  <Text style={styles.uploadButtonSubtext}>Capture a new photo</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={takeVideo}
                >
                  <Icon name="video-box" size={32} color="#7C3AED" />
                  <Text style={styles.uploadButtonText}>Record Video</Text>
                  <Text style={styles.uploadButtonSubtext}>Record a new video</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Date Picker Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={showDatepicker}
            >
              <View style={styles.datePickerContent}>
                <Icon name="calendar" size={20} color="#7C3AED" />
                <Text style={styles.datePickerText}>
                  {formatDisplayDate(selectedDate)}
                </Text>
              </View>
              <Icon name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Give your memory a title"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* Create Button */}
          <TouchableOpacity 
            style={[
              styles.createButton,
              (!title.trim() || mediaUris.length === 0 || loading) && styles.createButtonDisabled
            ]}
            onPress={handleCreateMemory}
            disabled={!title.trim() || mediaUris.length === 0 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.createButtonText}>
                Create Memory {mediaUris.length > 0 && `(${mediaUris.length} items)`}
              </Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleBack}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Full Size Media Preview Modal */}
      <Modal
        visible={showMediaPreview}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.fullScreenPreview}>
          {mediaUris[previewMediaIndex] && (
            <>
              {mediaUris[previewMediaIndex].type === 'image' ? (
                <Image 
                  source={{ uri: mediaUris[previewMediaIndex].uri }} 
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.videoPreview}>
                  <Text style={styles.videoPreviewText}>Video Preview</Text>
                  <Icon name="play-circle-outline" size={64} color="#FFFFFF" />
                  <Text style={styles.videoPreviewSubtext}>
                    Video will play in memory view
                  </Text>
                </View>
              )}
              
              {/* Media Counter */}
              {mediaUris.length > 1 && (
                <View style={styles.mediaCounter}>
                  <Text style={styles.mediaCounterText}>
                    {previewMediaIndex + 1} / {mediaUris.length}
                  </Text>
                </View>
              )}

              {/* Navigation Arrows */}
              {mediaUris.length > 1 && (
                <>
                  {previewMediaIndex > 0 && (
                    <TouchableOpacity
                      style={[styles.navArrow, styles.prevArrow]}
                      onPress={goToPrevMedia}
                    >
                      <Icon name="chevron-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                  
                  {previewMediaIndex < mediaUris.length - 1 && (
                    <TouchableOpacity
                      style={[styles.navArrow, styles.nextArrow]}
                      onPress={goToNextMedia}
                    >
                      <Icon name="chevron-right" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </>
              )}

              <View style={styles.previewControls}>
                <TouchableOpacity 
                  style={[styles.previewButton, styles.previewButtonSecondary]}
                  onPress={() => setShowMediaPreview(false)}
                >
                  <Icon name="close" size={20} color="#FFFFFF" />
                  <Text style={styles.previewButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                {/* Only show crop for images */}
                {mediaUris[previewMediaIndex].type === 'image' && (
                  <TouchableOpacity 
                    style={[styles.previewButton, styles.previewButtonSecondary]}
                    onPress={() => cropImage(previewMediaIndex)}
                  >
                    <Icon name="crop" size={20} color="#FFFFFF" />
                    <Text style={styles.previewButtonText}>Crop</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.previewButton, styles.previewButtonPrimary]}
                  onPress={confirmMedia}
                >
                  <Icon name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.previewButtonText}>Use This</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF5FF",
  },
  scrollView: {
    flex: 1,
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
  headerPlaceholder: {
    width: 40,
  },
  form: {
    padding: 20,
  },
  uploadSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  uploadButtons: {
    gap: 16,
  },
  uploadButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#7C3AED",
    textAlign: 'center',
  },
  uploadButtonSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: 'center',
  },
  mediaPreviewsContainer: {
    marginBottom: 16,
  },
  mediaPreviews: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 20,
  },
  mediaPreviewWrapper: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  videoIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeMediaButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addMoreButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  addMoreText: {
    marginTop: 4,
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600",
    textAlign: 'center',
  },
  removeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    alignSelf: 'center',
  },
  removeAllText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#111827",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  datePickerButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  datePickerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  datePickerText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  createButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  createButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  // Full Screen Preview Styles
  fullScreenPreview: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  videoPreview: {
    width: screenWidth,
    height: screenHeight * 0.7,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPreviewText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  videoPreviewSubtext: {
    color: "#D1D5DB",
    fontSize: 14,
    marginTop: 8,
  },
  mediaCounter: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mediaCounterText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  prevArrow: {
    left: 20,
  },
  nextArrow: {
    right: 20,
  },
  previewControls: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  previewButtonPrimary: {
    backgroundColor: "#7C3AED",
  },
  previewButtonSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  previewButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});