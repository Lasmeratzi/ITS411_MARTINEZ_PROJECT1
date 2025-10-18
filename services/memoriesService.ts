import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { getAlbumById } from "./albumsService"; // ADD THIS IMPORT

export async function createMemory(
  title: string,
  description: string,
  imageUrl: string,
  albumId: string | null = null,
  date: string | null = null
) {
  const user = auth().currentUser;
  if (!user) throw new Error("User not logged in");

  let finalDate = date;

  // NEW: If albumId is provided, check if it's a calendar album
  if (albumId) {
    try {
      const album = await getAlbumById(albumId);
      
      // Use type assertion to fix TypeScript issues
      const albumData = album as any;
      
      // If it's a calendar album, use the album's displayDate
      if (albumData && albumData.type === 'calendar' && albumData.displayDate) {
        console.log('Calendar album detected, using album date:', albumData.displayDate);
        finalDate = albumData.displayDate;
      }
    } catch (error) {
      console.error('Error checking album type, using user-provided date:', error);
      // If there's an error, fall back to the user-provided date
    }
  }

  return firestore().collection("memories").add({
    title,
    description,
    imageUrl,
    albumId,
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
    imageUrl: string; 
    albumId: string | null; 
    date?: string 
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

  if (albumId) {
    query = query.where("albumId", "==", albumId);
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
  date: Date // Specialized for calendar - accepts Date object
) {
  const user = auth().currentUser;
  if (!user) throw new Error("User not logged in");

  // Format date properly for calendar (YYYY-MM-DD)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;

  return firestore().collection("memories").add({
    title,
    description,
    imageUrl,
    albumId: null, // Calendar memories don't go to albums by default
    createdBy: user.uid,
    createdAt: firestore.FieldValue.serverTimestamp(),
    date: formattedDate,
  });
}