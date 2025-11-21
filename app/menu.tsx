import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUser } from "../contexts/UserContext";
import AlbumModal from "../modals/AlbumModal";
import MemoryModal from "../modals/MemoryModal";
import { createRegularAlbum } from "../services/albumsService";
import { signOut } from "../services/authService";

interface Memory {
  id: string;
  title?: string;
  description: string;
  imageUrl?: string;        // Single image (old format)
  imageUrls?: string[];     // Multiple images (new format)
  videoUrls?: string[];     // Multiple videos
  createdAt: any;
  date?: string;
  albumName?: string;
}

// Color options for albums (moved to AlbumModal, keeping here for reference)
const COLOR_OPTIONS = [
  "#FF9A8B", "#7C3AED", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16", "#F97316",
];

export default function Menu() {
  const router = useRouter();
  const { user } = useUser();
  const [userName, setUserName] = useState("User");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // State for memory details modal
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showMemoryDetails, setShowMemoryDetails] = useState(false);

  // State for album creation modal
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [albumDate, setAlbumDate] = useState<Date | null>(null);
  const [albumCoverImage, setAlbumCoverImage] = useState<string | null>(null);
  const [videoThumbnails, setVideoThumbnails] = useState<{[key: string]: string}>({});

  useEffect(() => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    setLoading(false);
    return;
  }

  if (user?.username) {
    setUserName(user.username);
  } else if (user?.displayName) {
    setUserName(user.displayName);
  } else if (currentUser?.displayName) {
    setUserName(currentUser.displayName);
  } else if (currentUser?.email) {
    setUserName(currentUser.email.split('@')[0]);
  }

  const unsubscribe = loadUserMemories();
  
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}, [user]);

 const loadUserMemories = () => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    setLoading(false);
    return () => {};
  }

  const unsubscribe = firestore()
    .collection("memories")
    .where("createdBy", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .limit(10)
    .onSnapshot(
      (snapshot) => {
        const fetchedMemories = snapshot.docs.map((doc) => {
          const data = doc.data();
          const memory = {
            id: doc.id,
            title: data.title,
            description: data.description,
            imageUrl: data.imageUrl,
            imageUrls: data.imageUrls,
            videoUrls: data.videoUrls,
            createdAt: data.createdAt,
            date: data.date,
            albumName: data.albumName,
          } as Memory;

          // Generate thumbnails for videos
          if (memory.videoUrls && memory.videoUrls.length > 0) {
            memory.videoUrls.forEach((videoUri, index) => {
              generateVideoThumbnail(videoUri, `${memory.id}_${index}`);
            });
          }

          return memory;
        });
        setMemories(fetchedMemories);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading memories:", error);
        setLoading(false);
      }
    );

  return unsubscribe;
};

  // Function to create album - UPDATED
  const handleCreateAlbum = async () => {
  if (!albumTitle.trim()) {
    Alert.alert("Error", "Please enter an album title.");
    return;
  }

  try {
    const formattedDate = albumDate ? albumDate.toISOString().split('T')[0] : null;
    
    await createRegularAlbum(
      albumTitle.trim(),
      albumDescription.trim(),
      selectedColor,
      formattedDate,
      albumCoverImage
    );

    // Reset form
    setAlbumTitle("");
    setAlbumDescription("");
    setSelectedColor(COLOR_OPTIONS[0]);
    setAlbumDate(null);
    setAlbumCoverImage(null);
    setShowAlbumForm(false);
  } catch (error: any) {
    Alert.alert("Error", error.message);
  }
};


const generateVideoThumbnail = async (videoUri: string, memoryId: string) => {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000, // 1 second into the video
    });
    setVideoThumbnails(prev => ({
      ...prev,
      [memoryId]: uri
    }));
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
  }
};
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

  // Date formatting function
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

  // NEW: Format date for memory cards (shorter version)
  const formatMemoryDate = (dateString: string) => {
    if (!dateString) return "";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "";
      }
      const now = new Date();
      const isCurrentYear = date.getFullYear() === now.getFullYear();
      
      if (isCurrentYear) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (error) {
      console.error("Error formatting memory date:", error);
      return "";
    }
  };

  const handleCloseMemoryModal = () => {
    setShowMemoryDetails(false);
    setSelectedMemory(null);
  };

  // UPDATED: handleCloseAlbumModal function
  const handleCloseAlbumModal = () => {
  setShowAlbumForm(false);
  setAlbumTitle("");
  setAlbumDescription("");
  setSelectedColor(COLOR_OPTIONS[0]);
  setAlbumDate(null);
  setAlbumCoverImage(null);
};

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Reminora</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Dropdown Menu */}
          {showDropdown && (
            <>
              <TouchableOpacity 
                style={styles.dropdownOverlay}
                activeOpacity={1}
                onPress={() => setShowDropdown(false)}
              />
              <View style={styles.dropdownMenu}>
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowDropdown(false);
                    router.push("/profile");
                  }}
                >
                  <Icon name="account-outline" size={20} color="#111827" style={styles.dropdownIcon} />
                  <Text style={styles.dropdownText}>Profile</Text>
                </TouchableOpacity>
                
                {/* Create Album Option */}
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowDropdown(false);
                    setShowAlbumForm(true);
                  }}
                >
                  <Icon name="folder-plus" size={20} color="#111827" style={styles.dropdownIcon} />
                  <Text style={styles.dropdownText}>Create Album</Text>
                </TouchableOpacity>

                <TouchableOpacity 
  style={styles.dropdownItem}
  onPress={() => {
    setShowDropdown(false);
    router.push("/gallery");
  }}
>
  <Icon name="image-multiple" size={20} color="#111827" style={styles.dropdownIcon} />
  <Text style={styles.dropdownText}>App Gallery</Text>
</TouchableOpacity>
                
                <View style={styles.dropdownDivider} />
                
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={async () => {
                    setShowDropdown(false);
                    await signOut();
                    router.replace("/");
                  }}
                >
                  <Icon name="logout" size={20} color="#DC2626" style={styles.dropdownIcon} />
                  <Text style={[styles.dropdownText, styles.logoutText]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Greeting Card */}
        <View style={styles.greetingCard}>
          <Text style={styles.greeting}>
            Hi, {user?.username || user?.displayName || userName}
          </Text>
          <Text style={styles.tagline}>
            Your memories matter. Let's keep writing them together.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push("/addMemory")}
            >
              <View style={styles.actionIcon}>
                <Icon name="plus-circle" size={32} color="#EF4444" />
              </View>
              <Text style={styles.actionLabel}>Create a memory</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push("/albums")}
            >
              <View style={[styles.actionIcon, styles.actionIconSecondary]}>
                <Icon name="book-multiple" size={32} color="#3B82F6" />
              </View>
              <Text style={styles.actionLabel}>Albums</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push("/calendar")}
            >
              <View style={[styles.actionIcon, styles.actionIconTertiary]}>
                <Icon name="calendar" size={32} color="#6B7280" />
              </View>
              <Text style={styles.actionLabel}>View Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Memories Feed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Memories</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7C3AED" />
            </View>
          ) : memories.length === 0 ? (
            <TouchableOpacity 
              style={styles.emptyCard}
              onPress={() => router.push("/addMemory")}
            >
              <Icon name="image-outline" size={48} color="#9CA3AF" style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No memories yet</Text>
              <Text style={styles.emptySubtitle}>Tap to create your first memory</Text>
            </TouchableOpacity>
          ) : (
            memories.map((memory) => {
              // Get the first available image for preview
              const previewImage = memory.imageUrls?.[0] || memory.imageUrl;
const hasVideos = memory.videoUrls && memory.videoUrls.length > 0;
const videoThumbnail = hasVideos ? videoThumbnails[`${memory.id}_0`] : null;
const isVideoOnly = !previewImage && hasVideos;

              return (
  <TouchableOpacity 
    key={memory.id}
    style={styles.memoryCard}
    onPress={() => {
      setSelectedMemory(memory);
      setShowMemoryDetails(true);
    }}
  >
    {/* Media Display */}
    <View style={styles.memoryMediaContainer}>
      {previewImage ? (
        <Image 
          source={{ uri: previewImage }} 
          style={styles.memoryImage}
          resizeMode="cover"
        />
      ) : videoThumbnail ? (
        <Image 
          source={{ uri: videoThumbnail }} 
          style={styles.memoryImage}
          resizeMode="cover"
        />
      ) : isVideoOnly ? (
        <View style={styles.videoPlaceholder}>
          <Icon name="play-circle-outline" size={40} color="#7C3AED" />
          <Text style={styles.videoPlaceholderText}>Video Memory</Text>
          <Text style={styles.videoCountText}>
            {memory.videoUrls ? memory.videoUrls.length : 0} video{memory.videoUrls && memory.videoUrls.length > 1 ? 's' : ''}
          </Text>
        </View>
      ) : (
        <View style={styles.noMediaPlaceholder}>
          <Icon name="image-off" size={40} color="#9CA3AF" />
          <Text style={styles.noMediaText}>No Media</Text>
        </View>
      )}
      
      {/* Video Indicator Badge */}
      {hasVideos && (
        <View style={styles.videoIndicator}>
          <Icon name="video" size={16} color="#FFFFFF" />
          {memory.videoUrls && memory.videoUrls.length > 1 && (
            <Text style={styles.videoCountBadge}>{memory.videoUrls.length}</Text>
          )}
        </View>
      )}
    </View>

                  <View style={styles.memoryContent}>
                    <View style={styles.memoryHeader}>
                      <View style={styles.dateInfo}>
                        {/* Show both the actual date and time ago */}
                        {memory.date && (
                          <Text style={styles.memoryDate}>
                            {formatMemoryDate(memory.date)}
                          </Text>
                        )}
                        <Text style={styles.memoryTime}>
                          {formatTimeAgo(memory.createdAt)}
                        </Text>
                      </View>
                      {memory.albumName && (
                        <View style={styles.albumBadge}>
                          <Text style={styles.albumBadgeText}>{memory.albumName}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memoryDescription} numberOfLines={2}>
                      {memory.title || memory.description || "Untitled memory"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Memory Details Modal */}
      <MemoryModal
        visible={showMemoryDetails}
        memory={selectedMemory}
        onClose={handleCloseMemoryModal}
        formatDisplayDate={formatDisplayDate}
        formatTimeAgo={formatTimeAgo}
      />

      {/* Album Creation Modal - UPDATED WITH COVER IMAGE */}
      <AlbumModal
        visible={showAlbumForm}
        albumTitle={albumTitle}
        albumDescription={albumDescription}
        selectedColor={selectedColor}
        albumDate={albumDate}
        albumCoverImage={albumCoverImage}
        onAlbumTitleChange={setAlbumTitle}
        onAlbumDescriptionChange={setAlbumDescription}
        onColorSelect={setSelectedColor}
        onDateChange={setAlbumDate}
        onCoverImageChange={setAlbumCoverImage}
        onSubmit={handleCreateAlbum}
        onClose={handleCloseAlbumModal}
      />
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
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -1000,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  dropdownMenu: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
    zIndex: 2,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  logoutText: {
    color: "#DC2626",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },
  greetingCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionIconSecondary: {
    backgroundColor: "#DBEAFE",
  },
  actionIconTertiary: {
    backgroundColor: "#E5E7EB",
  },
  actionLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "500",
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyCard: {
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
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  memoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  memoryMediaContainer: {
    position: 'relative',
  },
  memoryImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#F3F4F6",
  },
  videoPlaceholder: {
    width: "100%",
    height: 220,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    color: "#7C3AED",
    fontWeight: "600",
  },
  videoCountText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  noMediaPlaceholder: {
    width: "100%",
    height: 220,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  noMediaText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9CA3AF",
  },
  videoIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 24,
    justifyContent: 'center',
  },
  videoCountBadge: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  memoryContent: {
    padding: 16,
  },
  memoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  dateInfo: {
    flex: 1,
  },
  memoryDate: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "600",
    marginBottom: 2,
  },
  memoryTime: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  albumBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  albumBadgeText: {
    fontSize: 11,
    color: "#7C3AED",
    fontWeight: "600",
  },
  memoryDescription: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
    lineHeight: 22,
  },
  bottomPadding: {
    height: 40,
  },
});