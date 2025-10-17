import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { signOut } from "../services/authService";

interface Memory {
  id: string;
  description: string;
  imageUrl: string;
  createdAt: any;
  albumName?: string;
}

export default function Menu() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const user = auth().currentUser;
    
    // Don't do anything if no user is logged in
    if (!user) {
      setLoading(false);
      return;
    }
    
    if (user?.displayName) {
      setUserName(user.displayName);
    } else if (user?.email) {
      setUserName(user.email.split('@')[0]);
    }

    // Subscribe to user's memories
    const unsubscribe = loadUserMemories();
    
    // Cleanup listener when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const loadUserMemories = () => {
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }

    const unsubscribe = firestore()
      .collection("memories")
      .where("createdBy", "==", user.uid)
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

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Memories</Text>
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
          <Text style={styles.greeting}>Hi, {userName}</Text>
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
                onPress={() => router.push(`/memories?albumId=${memory.albumName || 'uncategorized'}`)}
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
                    {memory.description || "Untitled memory"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.bottomPadding} />
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
});