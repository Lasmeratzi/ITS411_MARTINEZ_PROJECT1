import auth from "@react-native-firebase/auth";
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from "expo-router";
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { useEffect, useState } from "react";
import {
  Alert, Image, Modal, ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AlbumModal from "../modals/AlbumModal";
import { createCalendarAlbum } from "../services/albumsService";
import { createCalendarMemory, subscribeToUserMemories } from "../services/memoriesService";

// NEW: Color options for albums
const COLOR_OPTIONS = [
  "#FF9A8B", // Original pink
  "#7C3AED", // Purple
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
];

export default function CalendarDay() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [memories, setMemories] = useState<any[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const [showMemoryDetails, setShowMemoryDetails] = useState(false);
  const [videoThumbnails, setVideoThumbnails] = useState<{[key: string]: string}>({});
  
  // NEW: State for album creation
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [albumCoverImage, setAlbumCoverImage] = useState<string | null>(null);

  useEffect(() => {
    if (date) {
      // Handle both simple date string (YYYY-MM-DD) and ISO string
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Simple date string format (from fixed calendar.tsx)
        const [year, month, day] = date.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
      } else {
        // Fallback for ISO string or other formats
        setSelectedDate(new Date(date));
      }
    }
  }, [date]);

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
    // Load memories for this date
    const unsubscribe = subscribeToUserMemories((memoriesList) => {
      const dateMemories = memoriesList.filter(memory => {
        if (!memory.date) return false;
        const memoryDate = new Date(memory.date).toDateString();
        return memoryDate === selectedDate.toDateString();
      });
      
      // Generate thumbnails for videos
      dateMemories.forEach(memory => {
        if (memory.videoUrls && memory.videoUrls.length > 0) {
          memory.videoUrls.forEach((videoUri: string, index: number) => {
            generateVideoThumbnail(videoUri, memory.id, index);
          });
        }
      });
      
      setMemories(dateMemories);
    });
    return () => unsubscribe();
  }, [selectedDate]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateForAlbum = (date: Date) => {
    // Use local date instead of UTC to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Date formatting function for memory details
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return "Date not available";
    }
  };

  // UPDATED: Create album for this date with custom title and description
  const handleCreateAlbum = async () => {
    try {
      const formattedDate = formatDateForAlbum(selectedDate);
      
      // Use default title if user doesn't provide one
      const title = albumTitle.trim() || `Memories from ${formatDate(selectedDate)}`;
      
      await createCalendarAlbum(
        title,
        formattedDate,
        albumDescription.trim(),
        selectedColor,
        albumCoverImage
      );
      
      // Reset form and close modal
      setAlbumTitle("");
      setAlbumDescription("");
      setSelectedColor(COLOR_OPTIONS[0]);
      setAlbumCoverImage(null);
      setShowAlbumForm(false);
      
      Alert.alert("Success", "Calendar album created for this date!");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  // Add memory for this date
  const handleAddMemory = async () => {
    try {
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
        const user = auth().currentUser;
        if (!user) throw new Error("User not authenticated");

        // Save image locally
        const memoriesDir = `${FileSystem.documentDirectory}memories/`;
        const dirInfo = await FileSystem.getInfoAsync(memoriesDir);
        
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(memoriesDir, { intermediates: true });
        }

        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const localUri = `${memoriesDir}${fileName}`;

        await FileSystem.copyAsync({
          from: result.assets[0].uri,
          to: localUri,
        });

        // Use the calendar-specific memory creation
        await createCalendarMemory(
          `Memory from ${formatDate(selectedDate)}`,
          "",
          localUri,
          selectedDate,
          [] // Empty array - memory goes only to auto month/year albums
        );

        Alert.alert("Success", "Memory added for this date!");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  // FIXED: Navigate to memories filtered by this specific date
  const navigateToMemories = () => {
    const formattedDate = formatDateForAlbum(selectedDate);
    router.push({
      pathname: "/memories",
      params: { 
        date: formattedDate,
        title: `Memories from ${formatDate(selectedDate)}`
      }
    });
  };

  const navigateToAlbums = () => {
    router.push("/albums");
  };

  // Handle modal close
  const handleCloseAlbumModal = () => {
    setShowAlbumForm(false);
    setAlbumTitle("");
    setAlbumDescription("");
    setSelectedColor(COLOR_OPTIONS[0]);
    setAlbumCoverImage(null);
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
          <Text style={styles.headerTitle}>Date Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date Card */}
          <View style={styles.dateCard}>
            <View style={styles.dateIcon}>
              <Icon name="calendar" size={32} color="#7C3AED" />
            </View>
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => setShowAlbumForm(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#EDE9FE" }]}>
                <Icon name="book-plus" size={24} color="#7C3AED" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Create Album</Text>
                <Text style={styles.actionSubtitle}>
                  Start a new album for memories from this day
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={handleAddMemory}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FEE2E2" }]}>
                <Icon name="image-plus" size={24} color="#EF4444" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Add Memory</Text>
                <Text style={styles.actionSubtitle}>
                  Add a photo memory for this specific date
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Existing Memories */}
          <View style={styles.memoriesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Memories from this day ({memories.length})
              </Text>
              {memories.length > 0 && (
                <TouchableOpacity onPress={navigateToMemories}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>

            {memories.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="image-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No memories yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add your first memory for this date
                </Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.memoriesScroll}
              >
                {memories.slice(0, 5).map((memory) => {
                  // Get the first available image or video thumbnail
                  const displayImage = memory.imageUrls?.[0] || memory.imageUrl;
                  const hasVideos = memory.videoUrls && memory.videoUrls.length > 0;
                  const videoThumbnail = hasVideos ? videoThumbnails[`${memory.id}_0`] : null;
                  const isVideoOnly = !displayImage && hasVideos;
                  
                  return (
                    <TouchableOpacity 
                      key={memory.id}
                      style={styles.memoryThumbnail}
                      onPress={() => {
                        setSelectedMemory(memory);
                        setShowMemoryDetails(true);
                      }}
                    >
                      {displayImage ? (
                        <Image 
                          source={{ uri: displayImage }} 
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                      ) : videoThumbnail ? (
                        <View style={styles.thumbnailContainer}>
                          <Image 
                            source={{ uri: videoThumbnail }} 
                            style={styles.thumbnailImage}
                            resizeMode="cover"
                          />
                          <View style={styles.videoOverlay}>
                            <Icon name="play" size={20} color="#FFFFFF" />
                          </View>
                        </View>
                      ) : isVideoOnly ? (
                        <View style={styles.videoPlaceholder}>
                          <Icon name="play-circle-outline" size={24} color="#7C3AED" />
                          <Text style={styles.videoPlaceholderText}>Video</Text>
                        </View>
                      ) : (
                        <View style={styles.thumbnailPlaceholder}>
                          <Icon name="image-outline" size={24} color="#9CA3AF" />
                        </View>
                      )}
                      
                      {/* Video indicator badge */}
                      {hasVideos && (
                        <View style={styles.videoBadge}>
                          <Icon name="video" size={10} color="#FFFFFF" />
                        </View>
                      )}
                      
                      <Text style={styles.memoryTitle} numberOfLines={2}>
                        {memory.title || "Untitled memory"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Navigation Links */}
          <View style={styles.navigationSection}>
            <Text style={styles.sectionTitle}>More Options</Text>
            
            <TouchableOpacity 
              style={styles.navLink}
              onPress={navigateToMemories}
            >
              <View style={styles.navLinkIcon}>
                <Icon name="image-multiple" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.navLinkText}>Browse All Memories</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navLink}
              onPress={navigateToAlbums}
            >
              <View style={styles.navLinkIcon}>
                <Icon name="book-multiple" size={20} color="#10B981" />
              </View>
              <Text style={styles.navLinkText}>View All Albums</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.back()}
            >
              <View style={styles.navLinkIcon}>
                <Icon name="calendar" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.navLinkText}>Back to Calendar</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Memory Details Modal */}
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
                  {selectedMemory.imageUrls?.[0] || selectedMemory.imageUrl ? (
                    <Image 
                      source={{ uri: selectedMemory.imageUrls?.[0] || selectedMemory.imageUrl }} 
                      style={styles.detailImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.noImagePlaceholder}>
                      <Icon name="image-off" size={64} color="#9CA3AF" />
                      <Text style={styles.noImageText}>No Image</Text>
                    </View>
                  )}
                  
                  {/* Memory Title */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Title</Text>
                    <Text style={styles.detailTitle}>{selectedMemory.title || selectedMemory.description || "Untitled memory"}</Text>
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

        {/* Album Modal */}
        <AlbumModal
          visible={showAlbumForm}
          albumTitle={albumTitle}
          albumDescription={albumDescription}
          selectedColor={selectedColor}
          albumDate={selectedDate}
          albumCoverImage={albumCoverImage}
          onAlbumTitleChange={setAlbumTitle}
          onAlbumDescriptionChange={setAlbumDescription}
          onColorSelect={setSelectedColor}
          onDateChange={() => {}} // Empty function since date is fixed for calendar albums
          onCoverImageChange={setAlbumCoverImage}
          onSubmit={handleCreateAlbum}
          onClose={handleCloseAlbumModal}
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
  dateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 18,
  },
  memoriesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "600",
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
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  memoriesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  memoryThumbnail: {
    width: 120,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnailImage: {
    width: "100%",
    height: 80,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginBottom: 8,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholder: {
    width: "100%",
    height: 80,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  videoPlaceholderText: {
    marginTop: 4,
    fontSize: 10,
    color: "#7C3AED",
    fontWeight: "500",
  },
  videoBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  memoryTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
    textAlign: "center",
  },
  navigationSection: {
    marginBottom: 24,
  },
  navLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  navLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  navLinkText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  // Memory Detail Modal Styles
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
  detailModalContent: {
    maxHeight: '80%',
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
  thumbnailPlaceholder: {
    width: "100%",
    height: 80,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  noImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noImageText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9CA3AF",
  },
});