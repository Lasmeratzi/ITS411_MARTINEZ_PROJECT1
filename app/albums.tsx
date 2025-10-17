import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  createAlbum,
  deleteAlbum,
  subscribeToUserAlbums,
  updateAlbum,
} from "../services/albumsService";

export default function Albums() {
  const router = useRouter();
  const [albums, setAlbums] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToUserAlbums(setAlbums);
    return unsubscribe;
  }, []);

  function openFormForEdit(album: any) {
    setTitle(album.title);
    setDate(album.date || null);
    setEditingAlbumId(album.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an album title.");
      return;
    }

    try {
      if (editingAlbumId) {
        await updateAlbum(editingAlbumId, { title: title.trim(), date });
      } else {
        await createAlbum(title.trim(), date);
      }

      setTitle("");
      setDate(null);
      setEditingAlbumId(null);
      setShowForm(false);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert("Delete Album", "Are you sure you want to delete this album?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteAlbum(id) },
    ]);
  }

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
          <Text style={styles.headerTitle}>Albums</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Albums</Text>
            <Text style={styles.infoSubtitle}>
              A collection of moments attached together for a better memory, and the feelings those shared.
            </Text>
          </View>

          {/* Albums Grid */}
          <View style={styles.albumsGrid}>
            {albums.map((album) => (
              <TouchableOpacity
                key={album.id}
                style={styles.albumBox}
                onPress={() => router.push(`/memories?albumId=${album.id}`)}
                onLongPress={() => openFormForEdit(album)}
              >
                <Icon name="folder" size={48} color="#FF9A8B" />
                <Text style={styles.albumName} numberOfLines={1}>
                  {album.title}
                </Text>
                {album.date && (
                  <Text style={styles.albumDate}>{album.date}</Text>
                )}
                
                {/* Action Buttons */}
                <View style={styles.albumActions}>
                  <TouchableOpacity
                    style={styles.iconAction}
                    onPress={() => openFormForEdit(album)}
                  >
                    <Icon name="pencil" size={16} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconAction}
                    onPress={() => handleDelete(album.id)}
                  >
                    <Icon name="delete" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {/* Add Album Box */}
            <TouchableOpacity
              style={[styles.albumBox, styles.addAlbumBox]}
              onPress={() => setShowForm(true)}
            >
              <Icon name="plus-circle" size={48} color="#FF9A8B" />
              <Text style={styles.albumName}>Create Album</Text>
            </TouchableOpacity>
          </View>

          {/* Empty State */}
          {albums.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="folder-open-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No albums yet</Text>
              <Text style={styles.emptySubtitle}>Create your first album to organize memories</Text>
            </View>
          )}

          {/* Go Back Button */}
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => router.back()}
          >
            <Icon name="arrow-left" size={20} color="#7C3AED" />
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal for Add/Edit Album */}
        <Modal visible={showForm} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingAlbumId ? "Edit Album" : "Create New Album"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowForm(false);
                    setEditingAlbumId(null);
                    setTitle("");
                    setDate(null);
                  }}
                >
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Album Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter album name"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2025-10-06"
                  placeholderTextColor="#9CA3AF"
                  value={date || ""}
                  onChangeText={setDate}
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>
                  {editingAlbumId ? "Update Album" : "Create Album"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setShowForm(false);
                  setEditingAlbumId(null);
                  setTitle("");
                  setDate(null);
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  albumsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  albumBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: "48%",
    minHeight: 140,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  addAlbumBox: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    backgroundColor: "#F9FAFB",
  },
  albumName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
    textAlign: "center",
  },
  albumDate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  albumActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  iconAction: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
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