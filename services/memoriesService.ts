import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { findOrCreateMonthAlbum, findOrCreateYearAlbum } from "./albumsService";

export async function createMemory(
  title: string,
  description: string,
  imageUrl: string,
  albumIds: string[] = [],
  date: string | null = null
) {
  // FIXED: Add empty videoUrls array as the 4th parameter
  return createMemoryWithMultipleImages(
    title, 
    description, 
    [imageUrl], 
    [], // ADD: empty videoUrls array
    albumIds, 
    date
  );
}

export async function createMemoryWithMultipleImages(
  title: string,
  description: string,
  imageUrls: string[],
  videoUrls: string[] = [], // ADD: Support for videos
  albumIds: string[] = [],
  date: string | null = null
) {
  const user = auth().currentUser;
  if (!user) throw new Error("User not logged in");

  let finalDate = date;
  const finalAlbumIds = [...albumIds];

  // Auto-add to hierarchical albums if date exists
  if (date) {
    try {
      const [year, month] = date.split('-');
      
      const monthAlbumId = await findOrCreateMonthAlbum(year, month);
      if (monthAlbumId && !finalAlbumIds.includes(monthAlbumId)) {
        finalAlbumIds.push(monthAlbumId);
      }
      
      const yearAlbumId = await findOrCreateYearAlbum(year);
      if (yearAlbumId && !finalAlbumIds.includes(yearAlbumId)) {
        finalAlbumIds.push(yearAlbumId);
      }
    } catch (error) {
      console.error('Error handling hierarchical albums:', error);
    }
  }

  return firestore().collection("memories").add({
    title,
    description,
    imageUrls,
    videoUrls, // ADD: Store video URLs
    albumIds: finalAlbumIds,
    createdBy: user.uid,
    createdAt: firestore.FieldValue.serverTimestamp(),
    date: finalDate,
  });
}

// Also update the updateMemory function to include title
export async function updateMemory(
  id: string,
  data: Partial<{ 
    title: string; 
    description: string; 
    imageUrls: string[];
    videoUrls: string[]; // ADD: Support for videos
    albumIds: string[];
    date?: string;
  }>
) {
  if (data.date) {
    data.date = new Date(data.date).toISOString();
  }
  return firestore().collection("memories").doc(id).update(data);
}

// Delete memory
export async function deleteMemory(id: string) {
  return firestore().collection("memories").doc(id).delete();
}

// Subscribe to current user's memories (optional: by album)
// Subscribe to current user's memories (optional: by album)
export function subscribeToUserMemories(
  callback: (memories: any[]) => void,
  albumId?: string
) {
  const user = auth().currentUser;
  if (!user) {
    callback([]);
    return () => {};
  }

  let query = firestore()
    .collection("memories")
    .where("createdBy", "==", user.uid)
    .orderBy("createdAt", "desc");

  // UPDATED: If albumId provided, check if memory belongs to this album
  if (albumId) {
    query = query.where("albumIds", "array-contains", albumId);
  }

  return query.onSnapshot(
    (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const memoryData = doc.data();
        return {
          id: doc.id,
          ...memoryData,
          // Ensure date is properly handled
          date: memoryData.date || null,
        };
      });
      callback(data);
    },
    (error) => {
      console.error("Firestore listener error:", error);
      callback([]); // Return empty array on error
    }
  );
}

export function subscribeToMemoriesByMonth(
  callback: (memories: any[]) => void,
  year: number,
  month: number
) {
  const user = auth().currentUser;
  if (!user) return () => {};

  // Calculate start and end of month
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month

  // Format dates for Firestore query (YYYY-MM-DD)
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];

  return firestore()
    .collection("memories")
    .where("createdBy", "==", user.uid)
    .where("date", ">=", startDateString)
    .where("date", "<=", endDateString)
    .onSnapshot(
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(data);
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );
}

// NEW: Create memory with proper date formatting for calendar
export async function createCalendarMemory(
  title: string,
  description: string,
  imageUrl: string,
  date: Date, // Specialized for calendar - accepts Date object
  albumIds: string[] = [] // ADD: Accept album IDs array
) {
  const user = auth().currentUser;
  if (!user) throw new Error("User not logged in");

  // Format date properly for calendar (YYYY-MM-DD)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;

  // Use the updated createMemory function
  return createMemory(
    title,
    description,
    imageUrl,
    albumIds, // PASS THE ALBUM IDs
    formattedDate
  );
}