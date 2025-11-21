import { AVPlaybackStatus, Video } from 'expo-av';
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Memory {
  id: string;
  title?: string;
  description: string;
  imageUrls?: string[];
  videoUrls?: string[];
  imageUrl?: string;
  createdAt: any;
  date?: string;
  albumName?: string;
}

interface MemoryModalProps {
  visible: boolean;
  memory: Memory | null;
  onClose: () => void;
  formatDisplayDate: (dateString: string) => string;
  formatTimeAgo: (timestamp: any) => string;
}

export default function MemoryModal({
  visible,
  memory,
  onClose,
  formatDisplayDate,
  formatTimeAgo,
}: MemoryModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [videoStatus, setVideoStatus] = useState<{[key: number]: AVPlaybackStatus}>({});
  const [videoErrors, setVideoErrors] = useState<{[key: number]: boolean}>({});
  const flatListRef = useRef<FlatList>(null);
  const videoRefs = useRef<{[key: number]: Video | null}>({});

  // Get all media (images + videos)
  const getAllMedia = () => {
    if (!memory) return [];
    
    const images = memory.imageUrls || (memory.imageUrl ? [memory.imageUrl] : []);
    const videos = memory.videoUrls || [];
    
    // Combine and mark type
    const media = [
      ...images.map(uri => ({ uri, type: 'image' as const })),
      ...videos.map(uri => ({ uri, type: 'video' as const }))
    ];
    
    return media;
  };

  const media = getAllMedia();
  const hasMultipleMedia = media.length > 1;

  const goToNextMedia = () => {
    if (currentMediaIndex < media.length - 1) {
      const newIndex = currentMediaIndex + 1;
      setCurrentMediaIndex(newIndex);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true
      });
    }
  };

  const goToPrevMedia = () => {
    if (currentMediaIndex > 0) {
      const newIndex = currentMediaIndex - 1;
      setCurrentMediaIndex(newIndex);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true
      });
    }
  };

  const handleSwipe = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / screenWidth);
    if (newIndex !== currentMediaIndex) {
      setCurrentMediaIndex(newIndex);
    }
  };

  // Pause videos when they go out of view
  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const currentIndex = viewableItems[0].index;
      
      // Pause all other videos
      Object.keys(videoRefs.current).forEach((key: any) => {
        const index = parseInt(key);
        if (index !== currentIndex && videoRefs.current[index]) {
          videoRefs.current[index]?.pauseAsync();
        }
      });
    }
  }).current;

  const handleVideoError = (index: number, error: any) => {
    console.log('Video error at index', index, error);
    setVideoErrors(prev => ({ ...prev, [index]: true }));
  };

  const handleVideoLoad = (index: number, status: AVPlaybackStatus) => {
    console.log('Video load status at index', index, status);
    if (status.isLoaded) {
      setVideoErrors(prev => ({ ...prev, [index]: false }));
    }
  };

  const renderMediaItem = ({ item, index }: { item: { uri: string; type: 'image' | 'video' }; index: number }) => (
    <View style={styles.mediaSlide}>
      {item.type === 'image' ? (
        <Image 
          source={{ uri: item.uri }} 
          style={styles.detailImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.videoContainer}>
          {videoErrors[index] ? (
            <View style={styles.videoError}>
              <Icon name="alert-circle-outline" size={48} color="#FFFFFF" />
              <Text style={styles.errorText}>Failed to load video</Text>
              <Text style={styles.errorSubtext}>The video file may be corrupted or unavailable</Text>
            </View>
          ) : (
            <>
              <Video
                ref={(ref) => {
                  videoRefs.current[index] = ref;
                }}
                source={{ uri: item.uri }}
                style={styles.videoPlayer}
                useNativeControls
                isLooping={false}
                onPlaybackStatusUpdate={(status) => {
                  setVideoStatus(prev => ({ ...prev, [index]: status }));
                  handleVideoLoad(index, status);
                }}
                onError={(error) => handleVideoError(index, error)}
                shouldPlay={false} // Don't autoplay
              />
              {/* Loading indicator - only show if video exists but hasn't loaded yet */}
              {(!videoStatus[index] || videoStatus[index]?.isLoaded === false) && !videoErrors[index] && (
                <View style={styles.videoLoading}>
                  <Icon name="loading" size={48} color="#FFFFFF" />
                  <Text style={styles.loadingText}>Loading video...</Text>
                  <Text style={styles.loadingSubtext}>{item.uri.split('/').pop()}</Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.9)" barStyle="light-content" />
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Media Section with Swipe Support */}
          {memory && media.length > 0 && (
            <View style={styles.mediaContainer}>
              {hasMultipleMedia ? (
                <>
                  <FlatList
                    ref={flatListRef}
                    data={media}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleSwipe}
                    renderItem={renderMediaItem}
                    keyExtractor={(item, index) => index.toString()}
                    getItemLayout={(data, index) => ({
                      length: screenWidth,
                      offset: screenWidth * index,
                      index,
                    })}
                    initialScrollIndex={currentMediaIndex}
                    onScrollToIndexFailed={(info) => {
                      const wait = new Promise(resolve => setTimeout(resolve, 500));
                      wait.then(() => {
                        flatListRef.current?.scrollToIndex({
                          index: info.index,
                          animated: true
                        });
                      });
                    }}
                    onViewableItemsChanged={handleViewableItemsChanged}
                    viewabilityConfig={{
                      itemVisiblePercentThreshold: 50
                    }}
                  />
                  
                  {/* Media Counter */}
                  <View style={styles.mediaCounter}>
                    <Text style={styles.mediaCounterText}>
                      {currentMediaIndex + 1} / {media.length}
                    </Text>
                    {media[currentMediaIndex]?.type === 'video' && (
                      <View style={styles.videoBadge}>
                        <Icon name="video" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  {/* Navigation Arrows */}
                  <TouchableOpacity
                    style={[
                      styles.navArrow, 
                      styles.prevArrow, 
                      currentMediaIndex === 0 && styles.navArrowDisabled
                    ]}
                    onPress={goToPrevMedia}
                    disabled={currentMediaIndex === 0}
                  >
                    <Icon name="chevron-left" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.navArrow, 
                      styles.nextArrow,
                      currentMediaIndex === media.length - 1 && styles.navArrowDisabled
                    ]}
                    onPress={goToNextMedia}
                    disabled={currentMediaIndex === media.length - 1}
                  >
                    <Icon name="chevron-right" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              ) : (
                // Single media view
                <View style={styles.singleMediaContainer}>
                  {media[0].type === 'image' ? (
                    <Image 
                      source={{ uri: media[0].uri }} 
                      style={styles.singleImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.videoContainer}>
                      {videoErrors[0] ? (
                        <View style={styles.videoError}>
                          <Icon name="alert-circle-outline" size={64} color="#FFFFFF" />
                          <Text style={styles.errorText}>Failed to load video</Text>
                          <Text style={styles.errorSubtext}>The video file may be corrupted or unavailable</Text>
                        </View>
                      ) : (
                        <>
                          <Video
                            ref={(ref) => {
                              videoRefs.current[0] = ref;
                            }}
                            source={{ uri: media[0].uri }}
                            style={styles.videoPlayer}
                            useNativeControls
                            isLooping={false}
                            onPlaybackStatusUpdate={(status) => {
                              setVideoStatus(prev => ({ ...prev, [0]: status }));
                              handleVideoLoad(0, status);
                            }}
                            onError={(error) => handleVideoError(0, error)}
                            shouldPlay={false} // Don't autoplay
                          />
                          {/* Loading indicator */}
                          {(!videoStatus[0] || videoStatus[0]?.isLoaded === false) && !videoErrors[0] && (
                            <View style={styles.videoLoading}>
                              <Icon name="loading" size={64} color="#FFFFFF" />
                              <Text style={styles.loadingText}>Loading video...</Text>
                              <Text style={styles.loadingSubtext}>{media[0].uri.split('/').pop()}</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              )}
              
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Show message if no media */}
          {memory && media.length === 0 && (
            <View style={styles.noMediaContainer}>
              <Icon name="image-off" size={64} color="#9CA3AF" />
              <Text style={styles.noMediaText}>No media available</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Details Container */}
          {memory && (
            <View style={styles.detailsContainer}>
              {/* Date at the top */}
              <View style={styles.dateSection}>
                <View style={styles.dateRow}>
                  <Icon name="calendar" size={16} color="#7C3AED" />
                  <Text style={styles.detailDate}>
                    {formatDisplayDate(memory.date || '')}
                  </Text>
                </View>
              </View>

              {/* Title centered */}
              <View style={styles.titleSection}>
                <Text style={styles.detailTitle}>
                  {memory.title || memory.description || "Untitled memory"}
                </Text>
              </View>

              {/* Description below title */}
              {memory.description && memory.description !== memory.title && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.detailDescription}>
                    {memory.description}
                  </Text>
                </View>
              )}

              {/* Media type indicator */}
              <View style={styles.mediaTypeSection}>
                <View style={styles.mediaTypeRow}>
                  {memory.imageUrls && memory.imageUrls.length > 0 && (
                    <View style={styles.mediaTypeBadge}>
                      <Icon name="image" size={14} color="#7C3AED" />
                      <Text style={styles.mediaTypeText}>
                        {memory.imageUrls.length} photo{memory.imageUrls.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                  {memory.videoUrls && memory.videoUrls.length > 0 && (
                    <View style={styles.mediaTypeBadge}>
                      <Icon name="video" size={14} color="#EF4444" />
                      <Text style={styles.mediaTypeText}>
                        {memory.videoUrls.length} video{memory.videoUrls.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Created time at bottom right */}
              <View style={styles.createdTimeSection}>
                <View style={styles.createdTimeRow}>
                  <Icon name="clock-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.createdTimeText}>
                    {formatTimeAgo(memory.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  mediaContainer: {
    flex: 1,
    backgroundColor: "#000000",
    position: 'relative',
  },
  noMediaContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    position: 'relative',
  },
  noMediaText: {
    color: "#9CA3AF",
    fontSize: 18,
    marginTop: 16,
  },
  mediaSlide: {
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  singleMediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  detailImage: {
    width: screenWidth,
    height: '100%',
  },
  singleImage: {
    width: screenWidth,
    height: '100%',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    width: screenWidth,
  },
  videoPlayer: {
    width: screenWidth,
    height: '100%',
  },
  videoLoading: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
  },
  videoError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: "#D1D5DB",
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    color: "#FFFFFF",
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    color: "#D1D5DB",
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  mediaCounter: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaCounterText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  videoBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.8,
  },
  navArrowDisabled: {
    opacity: 0.3,
  },
  prevArrow: {
    left: 20,
  },
  nextArrow: {
    right: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  detailsContainer: {
    padding: 24,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
  },
  dateSection: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: 'center',
  },
  detailDate: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "600",
  },
  titleSection: {
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    lineHeight: 32,
  },
  descriptionSection: {
    marginBottom: 16,
  },
  detailDescription: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    textAlign: "center",
  },
  mediaTypeSection: {
    marginBottom: 16,
  },
  mediaTypeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  mediaTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  mediaTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  createdTimeSection: {
    alignItems: 'flex-end',
  },
  createdTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  createdTimeText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});