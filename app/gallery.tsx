import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { deleteFromAppGallery, getGalleryImages, getGalleryInfo, smartSaveImage } from '../services/galleryService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const numColumns = 3;
const imageSize = screenWidth / numColumns - 16;

export default function Gallery() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [galleryInfo, setGalleryInfo] = useState({ count: 0, totalSizeMB: '0' });

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const galleryImages = await getGalleryImages();
      setImages(galleryImages);
      
      const info = await getGalleryInfo();
      setGalleryInfo(info);
    } catch (error) {
      console.error('Error loading gallery:', error);
      Alert.alert('Error', 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = (imageUri: string) => {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo from your app gallery?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteFromAppGallery(imageUri);
              if (success) {
                setImages(prev => prev.filter(img => img !== imageUri));
                const info = await getGalleryInfo();
                setGalleryInfo(info);
                Alert.alert("Success", "Photo deleted from gallery");
                
                // If we're viewing this image in full screen, close it
                if (selectedImage === imageUri) {
                  setShowFullScreen(false);
                  setSelectedImage(null);
                }
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete photo");
            }
          }
        }
      ]
    );
  };

  const handleDownloadImage = async (imageUri: string) => {
    try {
      setSaving(true);
      await smartSaveImage(imageUri);
    } catch (error: any) {
      console.error('Error saving image:', error);
      Alert.alert("Error", "Failed to save photo");
    } finally {
      setSaving(false);
    }
  };

  const handleClearGallery = () => {
    if (images.length === 0) return;
    
    Alert.alert(
      "Clear Gallery",
      `Are you sure you want to delete all ${images.length} photos from your app gallery? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              for (const imageUri of images) {
                await deleteFromAppGallery(imageUri);
              }
              setImages([]);
              setGalleryInfo({ count: 0, totalSizeMB: '0' });
              setShowFullScreen(false);
              setSelectedImage(null);
              Alert.alert("Success", "Gallery cleared successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to clear gallery");
            }
          }
        }
      ]
    );
  };

  const renderImageItem = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.imageContainer}
      onPress={() => {
        setSelectedImage(item);
        setShowFullScreen(true);
      }}
      onLongPress={() => handleDeleteImage(item)}
    >
      <Image source={{ uri: item }} style={styles.galleryImage} />
      <TouchableOpacity 
        style={styles.downloadButton}
        onPress={(e) => {
          e.stopPropagation(); // Prevent triggering the parent onPress
          handleDownloadImage(item);
        }}
      >
        <Icon name="download" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>App Gallery</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
      
      {/* Full Screen Image Viewer */}
      {showFullScreen && selectedImage && (
        <View style={styles.fullScreenContainer}>
          <StatusBar backgroundColor="#000000" barStyle="light-content" />
          
          {/* Header with Back Button */}
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity 
              style={styles.fullScreenBackButton}
              onPress={() => {
                setShowFullScreen(false);
                setSelectedImage(null);
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>Photo</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Full Screen Image */}
          <View style={styles.imageViewerContainer}>
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </View>

          {/* Action Buttons at Bottom */}
          <View style={styles.fullScreenActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.downloadAction]}
              onPress={() => handleDownloadImage(selectedImage)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="download" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Save Photo</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteAction]}
              onPress={() => handleDeleteImage(selectedImage)}
            >
              <Icon name="delete" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Normal Gallery View (hidden when full screen is active) */}
      {!showFullScreen && (
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>App Gallery</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.content}>
            {/* Gallery Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <View style={styles.infoIcon}>
                  <Icon name="image-multiple" size={32} color="#7C3AED" />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Your App Gallery</Text>
                  <Text style={styles.infoSubtitle}>
                    Photos saved from your camera
                  </Text>
                </View>
              </View>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{galleryInfo.count}</Text>
                  <Text style={styles.statLabel}>Photos</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{galleryInfo.totalSizeMB}</Text>
                  <Text style={styles.statLabel}>MB Used</Text>
                </View>
              </View>

              {images.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={handleClearGallery}
                >
                  <Icon name="delete-sweep" size={20} color="#EF4444" />
                  <Text style={styles.clearButtonText}>Clear Gallery</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Gallery Grid */}
            {images.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="image-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No photos in gallery</Text>
                <Text style={styles.emptySubtitle}>
                  Photos you take with the camera will appear here when you choose to save them to the app gallery
                </Text>
                <TouchableOpacity 
                  style={styles.addMemoryButton}
                  onPress={() => router.push('/addMemory')}
                >
                  <Icon name="camera" size={20} color="#FFFFFF" />
                  <Text style={styles.addMemoryText}>Take Photos</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Your Photos ({images.length})</Text>
                <FlatList
                  data={images}
                  renderItem={renderImageItem}
                  keyExtractor={(item) => item}
                  numColumns={numColumns}
                  scrollEnabled={false}
                  contentContainerStyle={styles.grid}
                />
              </>
            )}
          </View>
        </>
      )}
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
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
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  grid: {
    paddingBottom: 20,
  },
  imageContainer: {
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
  galleryImage: {
    width: imageSize,
    height: imageSize,
  },
  downloadButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  addMemoryButton: {
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  addMemoryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Full Screen Viewer Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  fullScreenHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  fullScreenBackButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerPlaceholder: {
    width: 40,
  },
  imageViewerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 100, // Add margin to make space for buttons
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
    fullScreenActions: {
    padding: 20,
    backgroundColor: "#000000",
    flexDirection: "row",
    gap: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Safe area for Android navigation bar
    paddingBottom: Platform.OS === 'android' ? 90 : 30,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  downloadAction: {
    backgroundColor: "#7C3AED",
  },
  deleteAction: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});