import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const GALLERY_DIR = `${FileSystem.documentDirectory}gallery/`;

// Initialize gallery directory
const initGallery = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(GALLERY_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(GALLERY_DIR, { intermediates: true });
      console.log('Gallery directory created');
    }
  } catch (error) {
    console.error('Error initializing gallery:', error);
    throw error;
  }
};

// Save image to app gallery
export const saveToAppGallery = async (imageUri: string, filename?: string): Promise<string> => {
  try {
    await initGallery();
    
    const fileExtension = imageUri.split('.').pop() || 'jpg';
    const fileName = filename || `gallery_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const destinationUri = `${GALLERY_DIR}${fileName}`;
    
    console.log('Saving image to gallery:', { from: imageUri, to: destinationUri });
    
    await FileSystem.copyAsync({
      from: imageUri,
      to: destinationUri,
    });
    
    console.log('Image saved to app gallery:', destinationUri);
    return destinationUri;
  } catch (error) {
    console.error('Error saving to app gallery:', error);
    throw new Error('Failed to save image to gallery');
  }
};

// Check if we're in a development build (MediaLibrary works)
export const isDevelopmentBuild = (): boolean => {
  return !!(MediaLibrary && MediaLibrary.requestPermissionsAsync);
};

// Save image to device gallery (only works in development build)
export const saveToDeviceGallery = async (imageUri: string): Promise<boolean> => {
  try {
    // Check if we're in a development build
    if (!isDevelopmentBuild()) {
      return false;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required', 
        'Please allow access to your photos to save images to your device gallery.',
        [
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return false;
    }
    
    const asset = await MediaLibrary.createAssetAsync(imageUri);
    
    if (asset) {
      console.log('Image saved to device gallery:', asset);
      
      try {
        const album = await MediaLibrary.getAlbumAsync('Reminora');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('Reminora', asset, false);
        }
      } catch (albumError) {
        console.log('Could not add to album, but image was saved to gallery');
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error saving to device gallery:', error);
    return false;
  }
};

// Share image (works in both Expo Go and development builds)
export const shareImage = async (imageUri: string): Promise<boolean> => {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Error', 'Sharing is not available on this device');
      return false;
    }

    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/jpeg',
      dialogTitle: 'Save Photo',
      UTI: 'public.image'
    });
    
    return true;
  } catch (error) {
    console.error('Error sharing image:', error);
    Alert.alert('Error', 'Failed to share image');
    return false;
  }
};

// Smart save function that tries device gallery first, then sharing
export const smartSaveImage = async (imageUri: string): Promise<boolean> => {
  // First try to save directly to device gallery (if in development build)
  if (isDevelopmentBuild()) {
    const deviceSaved = await saveToDeviceGallery(imageUri);
    if (deviceSaved) {
      Alert.alert("Success", "Photo saved to your device gallery!");
      return true;
    }
  }
  
  // If device gallery saving failed or we're in Expo Go, offer sharing
  Alert.alert(
    'Save Photo',
    isDevelopmentBuild() 
      ? 'Would you like to share the photo instead? You can save it to your device through the share menu.'
      : 'To save this photo, use the share option and save it to your device from there.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share',
        onPress: async () => {
          await shareImage(imageUri);
        }
      }
    ]
  );
  
  return false;
};

// Get all images from app gallery
export const getGalleryImages = async (): Promise<string[]> => {
  try {
    await initGallery();
    const files = await FileSystem.readDirectoryAsync(GALLERY_DIR);
    
    console.log('Found files in gallery:', files);
    
    const imageFiles = files.filter(file => 
      file.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)
    );
    
    console.log('Image files:', imageFiles);
    
    return imageFiles.map(file => `${GALLERY_DIR}${file}`);
  } catch (error) {
    console.error('Error reading gallery:', error);
    return [];
  }
};

// Delete image from app gallery
export const deleteFromAppGallery = async (imageUri: string): Promise<boolean> => {
  try {
    await FileSystem.deleteAsync(imageUri);
    console.log('Deleted image from gallery:', imageUri);
    return true;
  } catch (error) {
    console.error('Error deleting from gallery:', error);
    return false;
  }
};

// Get gallery info (size, count)
export const getGalleryInfo = async () => {
  try {
    const images = await getGalleryImages();
    let totalSize = 0;
    
    for (const imageUri of images) {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (fileInfo.exists && fileInfo.size) {
        totalSize += fileInfo.size;
      }
    }
    
    return {
      count: images.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  } catch (error) {
    console.error('Error getting gallery info:', error);
    return { count: 0, totalSize: 0, totalSizeMB: '0' };
  }
};