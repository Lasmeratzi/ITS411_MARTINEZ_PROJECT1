import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUser } from "../contexts/UserContext"; // ADD THIS IMPORT
import { createRegularAlbum } from "../services/albumsService";
import { signOut } from "../services/authService";

interface Memory {
  id: string;
  title?: string;
  description: string;
  imageUrl: string;
  createdAt: any;
  date?: string;
  albumName?: string;
}

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

export default function Menu() {
  const router = useRouter();
  const { user } = useUser(); // ADD THIS HOOK
  const [userName, setUserName] = useState("User");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // State for memory details modal
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showMemoryDetails, setShowMemoryDetails] = useState(false);

  // NEW: State for album creation
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => {
    const currentUser = auth().currentUser;
    
    // Don't do anything if no user is logged in
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    // Use the user from context if available, otherwise fall back to old logic
    if (user?.username) {
      setUserName(user.username);
    } else if (user?.displayName) {
      setUserName(user.displayName);
    } else if (currentUser?.displayName) {
      setUserName(currentUser.displayName);
    } else if (currentUser?.email) {
      setUserName(currentUser.email.split('@')[0]);
    }

    // Subscribe to user's memories
    const unsubscribe = loadUserMemories();
    
    // Cleanup listener when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]); // ADD user TO DEPENDENCY ARRAY

  const loadUserMemories = () => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }

    const unsubscribe = firestore()
      .collection("memories")
      .where("createdBy", "==", currentUser.uid)
      .orderBy("createdAt", "desc")
      .limit(10)
      .onSnapshot(
        (snapshot) => {
          const fetchedMemories = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Memory[];
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

  // NEW: Function to create album
  const handleCreateAlbum = async () => {
    if (!albumTitle.trim()) {
      alert("Please enter an album title");
      return;
    }

    try {
      await createRegularAlbum(
        albumTitle.trim(),
        albumDescription.trim(),
        selectedColor
      );
      
      // Reset form
      setAlbumTitle("");
      setAlbumDescription("");
      setSelectedColor(COLOR_OPTIONS[0]);
      setShowAlbumForm(false);
      
      alert("Album created successfully!");
    } catch (error: any) {
      alert("Error creating album: " + error.message);
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

  // Date formatting function (same as in memories.tsx)
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
                
                {/* NEW: Create Album Option */}
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
          {/* FIXED: Use user from context with proper null checking */}
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
            memories.map((memory) => (
              <TouchableOpacity 
                key={memory.id}
                style={styles.memoryCard}
                onPress={() => {
                  setSelectedMemory(memory);
                  setShowMemoryDetails(true);
                }}
              >
                <Image 
                  source={{ uri: memory.imageUrl }} 
                  style={styles.memoryImage}
                  resizeMode="cover"
                />
                <View style={styles.memoryContent}>
                  <View style={styles.memoryHeader}>
                    <Text style={styles.memoryTime}>{formatTimeAgo(memory.createdAt)}</Text>
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
            ))
          )}
        </View>

        {/* ... rest of your component remains the same ... */}
      </ScrollView>
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
  memoryImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#F3F4F6",
  },
  memoryContent: {
    padding: 16,
  },
  memoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  memoryTime: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  albumBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
  // Modal Styles
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
  // NEW: Album Form Styles
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