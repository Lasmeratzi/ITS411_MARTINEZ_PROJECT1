import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AlbumModal from "../modals/AlbumModal";
import {
  createRegularAlbum,
  deleteAlbum,
  subscribeToUserAlbums,
  updateAlbum
} from "../services/albumsService";

// Color options for albums
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

type AlbumTab = 'regular' | 'year' | 'month';

export default function Albums() {
  const router = useRouter();
  const [albums, setAlbums] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [albumDate, setAlbumDate] = useState<Date | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState("");
  const [albumCoverImage, setAlbumCoverImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AlbumTab>('regular');

  useEffect(() => {
    const unsubscribe = subscribeToUserAlbums(setAlbums);
    return unsubscribe;
  }, []);

  // Filter albums by type
  const regularAlbums = albums.filter(album => !album.type || album.type === 'regular' || album.type === 'calendar');
  const yearAlbums = albums.filter(album => album.type === 'year');
  const monthAlbums = albums.filter(album => album.type === 'month');

  // Get current active albums based on tab
  const getActiveAlbums = () => {
    switch (activeTab) {
      case 'regular': return regularAlbums;
      case 'year': return yearAlbums;
      case 'month': return monthAlbums;
      default: return regularAlbums;
    }
  };

  function openFormForEdit(album: any) {
    setTitle(album.title);
    setDescription(album.description || "");
    setAlbumDate(album.date ? new Date(album.date) : null);
    setSelectedColor(album.color || COLOR_OPTIONS[0]);
    setAlbumCoverImage(album.coverImage || null);
    setEditingAlbumId(album.id);
    setShowForm(true);
  }

  function openFormForCreate() {
    setTitle("");
    setDescription("");
    setAlbumDate(null);
    setSelectedColor(COLOR_OPTIONS[0]);
    setAlbumCoverImage(null);
    setEditingAlbumId(null);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an album title.");
      return;
    }

    try {
      const formattedDate = albumDate ? albumDate.toISOString().split('T')[0] : null;

      if (editingAlbumId) {
        await updateAlbum(editingAlbumId, { 
          title: title.trim(), 
          color: selectedColor,
          description: description.trim(),
          date: formattedDate,
          coverImage: albumCoverImage
        });
      } else {
        await createRegularAlbum(
          title.trim(), 
          description.trim(),
          selectedColor,
          formattedDate,
          albumCoverImage
        );
      }

      setTitle("");
      setDescription("");
      setAlbumDate(null);
      setSelectedColor(COLOR_OPTIONS[0]);
      setAlbumCoverImage(null);
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

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return "No date selected";
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAlbumTypeText = (album: any) => {
    if (album.type === 'calendar') return 'Calendar Album';
    if (album.type === 'month') return 'Month Album';
    if (album.type === 'year') return 'Year Album';
    return 'Regular Album';
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingAlbumId(null);
    setTitle("");
    setDescription("");
    setAlbumDate(null);
    setSelectedColor(COLOR_OPTIONS[0]);
    setAlbumCoverImage(null);
  };

  const renderAlbumGrid = (albumList: any[]) => (
    <View style={styles.albumsGrid}>
      {albumList.map((album) => (
        <View key={album.id} style={styles.albumColumn}>
          <TouchableOpacity
            style={styles.albumBox}
            onPress={() => router.push(`/memories?albumId=${album.id}`)}
            onLongPress={() => openFormForEdit(album)}
          >
            {/* Professional cover image display */}
            <View style={styles.coverContainer}>
              {album.coverImage ? (
                <View style={styles.coverImageWrapper}>
                  <Image 
                    source={{ uri: album.coverImage }} 
                    style={styles.coverImage}
                    resizeMode="cover"
                  />
                  <View style={[styles.coverImageOverlay, { backgroundColor: album.color || COLOR_OPTIONS[0] }]} />
                  {/* Gradient overlays */}
                  <View style={styles.gradientOverlayTop} />
                  <View style={styles.gradientOverlayBottom} />
                </View>
              ) : (
                <View style={[styles.defaultCover, { backgroundColor: album.color || COLOR_OPTIONS[0] }]}>
                  <Icon name="folder-image" size={32} color="#FFFFFF" />
                </View>
              )}
              
              {/* Album Type Badge */}
              <View style={styles.albumTypeBadge}>
                <Text style={styles.albumTypeText}>{getAlbumTypeText(album)}</Text>
              </View>
            </View>
            
            {/* Album Info */}
            <View style={styles.albumInfo}>
              <Text style={styles.albumName} numberOfLines={1}>
                {album.title}
              </Text>
              
              {album.description ? (
                <Text style={styles.albumDescription} numberOfLines={2}>
                  {album.description}
                </Text>
              ) : null}
              
              {album.date && (
                <View style={styles.dateContainer}>
                  <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.albumDate}>
                    {new Date(album.date).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
            
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
        </View>
      ))}
    </View>
  );

  const activeAlbums = getActiveAlbums();

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
          {/* Info Card with Create Button */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Albums</Text>
                <Text style={styles.infoSubtitle}>
                  A collection of moments attached together for a better memory, and the feelings those shared.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.createAlbumButton}
                onPress={openFormForCreate}
              >
                <Icon name="plus" size={20} color="#FFFFFF" />
                <Text style={styles.createAlbumButtonText}>Create Album</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <View style={styles.tabBackground}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'regular' && styles.activeTab
                ]}
                onPress={() => setActiveTab('regular')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'regular' && styles.activeTabText
                ]}>
                  Regular Albums ({regularAlbums.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'year' && styles.activeTab
                ]}
                onPress={() => setActiveTab('year')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'year' && styles.activeTabText
                ]}>
                  Year Albums ({yearAlbums.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'month' && styles.activeTab
                ]}
                onPress={() => setActiveTab('month')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'month' && styles.activeTabText
                ]}>
                  Month Albums ({monthAlbums.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Albums Grid for Active Tab */}
          {activeAlbums.length > 0 ? (
            renderAlbumGrid(activeAlbums)
          ) : (
            <View style={styles.emptyState}>
              <Icon name="folder-open-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'regular' && "No regular albums yet"}
                {activeTab === 'year' && "No year albums yet"}
                {activeTab === 'month' && "No month albums yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'regular' && "Create your first album to organize memories"}
                {activeTab === 'year' && "Year albums will appear here automatically"}
                {activeTab === 'month' && "Month albums will appear here automatically"}
              </Text>
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

        {/* Album Modal */}
        <AlbumModal
          visible={showForm}
          albumTitle={title}
          albumDescription={description}
          selectedColor={selectedColor}
          albumDate={albumDate}
          albumCoverImage={albumCoverImage}
          onAlbumTitleChange={setTitle}
          onAlbumDescriptionChange={setDescription}
          onColorSelect={setSelectedColor}
          onDateChange={setAlbumDate}
          onCoverImageChange={setAlbumCoverImage}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
          isEditing={!!editingAlbumId}
        />

        {/* Date Picker Modal */}
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Album Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={albumDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setAlbumDate(selectedDate);
                  }
                }}
              />
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
    padding: 16,
    paddingBottom: 40,
  },
  // Info Card with Create Button
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
    marginRight: 16,
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
  createAlbumButton: {
    backgroundColor: "#7C3AED",
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createAlbumButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Tab Navigation
  tabContainer: {
    marginBottom: 24,
  },
  tabBackground: {
    backgroundColor: "#F3F4F6",
    borderRadius: 30,
    padding: 4,
    flexDirection: 'row',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 25,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: 'center',
  },
  activeTabText: {
    color: "#7C3AED",
  },
  // Grid Layout
  albumsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  albumColumn: {
    width: "48%",
    marginBottom: 12,
  },
  albumBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 0,
    minHeight: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  // Cover image styles
  coverContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  coverImageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  // Gradient overlays
  gradientOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  gradientOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  defaultCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumTypeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  albumTypeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#7C3AED",
  },
  albumInfo: {
    padding: 16,
    paddingTop: 12,
  },
  albumName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  albumDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  albumDate: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  albumActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'flex-end',
  },
  iconAction: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
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
});