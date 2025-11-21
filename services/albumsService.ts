import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

// Update the album type to include 'month' and 'year'
type AlbumType = 'regular' | 'calendar' | 'month' | 'year';

// ===== HELPER FUNCTIONS =====
function getMonthName(month: string): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[parseInt(month) - 1] || 'Unknown';
}

function getMonthColor(month: string): string {
  const monthColors = [
    "#FF9A8B", "#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
    "#8B5CF6", "#06B6D4", "#84CC16", "#F97316", "#8B5CF6", "#7C3AED"
  ];
  return monthColors[parseInt(month) - 1] || "#FF9A8B";
}

function getYearColor(year: string): string {
  // Use a consistent color for year albums
  return "#7C3AED"; // Purple for years
}
// ===== END HELPER FUNCTIONS =====

// Create album with type differentiation
export async function createAlbum(
  title: string,
  color: string = "#FF9A8B", 
  description: string = "",
  date: string | null = null, 
  type: AlbumType = 'regular',
  monthKey?: string,
  yearKey?: string,
  year?: number,
  month?: number,
  coverImage: string | null = null // ADD THIS
) {
  const user = auth().currentUser;
  if (!user) throw new Error("User not logged in");

  const albumData = {
    title,
    color,
    description,
    type,
    coverImage, // ADD THIS
    createdBy: user.uid,
    createdAt: firestore.FieldValue.serverTimestamp(),
    date: date,
    displayDate: date,
    ...(type === 'month' && { monthKey, year, month }),
    ...(type === 'year' && { yearKey, year }),
  };

  return firestore().collection("albums").add(albumData);
}

// Create calendar album (convenience function)
export async function createCalendarAlbum(
  title: string,
  date: string,
  description: string = "",
  color: string = "#FF9A8B",
  coverImage: string | null = null // ADD THIS
) {
  return createAlbum(title, color, description, date, 'calendar', undefined, undefined, undefined, undefined, coverImage);
}

// Create regular album (convenience function)
export async function createRegularAlbum(
  title: string,
  description: string = "",
  color: string = "#FF9A8B",
  date: string | null = null,
  coverImage: string | null = null // ADD THIS
) {
  return createAlbum(title, color, description, date, 'regular', undefined, undefined, undefined, undefined, coverImage);
}

// Update album (existing - good as is)
export async function updateAlbum(
  id: string,
  data: Partial<{ 
    title: string; 
    color: string; 
    description: string;
    date: string | null;
    coverImage: string | null; // ADD THIS
    type?: AlbumType;
  }>
) {
  const updateData = {
    ...data,
    displayDate: data.date // Sync displayDate with date
  };
  
  return firestore().collection("albums").doc(id).update(updateData);
}

// Delete album (existing - good as is)
export async function deleteAlbum(id: string) {
  return firestore().collection("albums").doc(id).delete();
}

// Get albums by type
export function subscribeToAlbumsByType(
  callback: (albums: any[]) => void,
  type: AlbumType
) {
  let unsubscribeAlbums: (() => void) | null = null;

  const unsubscribeAuth = auth().onAuthStateChanged((user) => {
    if (unsubscribeAlbums) {
      unsubscribeAlbums();
      unsubscribeAlbums = null;
    }

    if (!user) {
      callback([]);
      return;
    }

    unsubscribeAlbums = firestore()
      .collection("albums")
      .where("createdBy", "==", user.uid)
      .where("type", "==", type)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            callback([]);
            return;
          }
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          callback(data);
        },
        (error) => {
          console.error("Firestore listener error:", error);
          callback([]);
        }
      );
  });

  return () => {
    if (unsubscribeAlbums) unsubscribeAlbums();
    unsubscribeAuth();
  };
}

// Subscribe to current user's albums (existing - good as is)
export function subscribeToUserAlbums(callback: (albums: any[]) => void) {
  let unsubscribeAlbums: (() => void) | null = null;

  const unsubscribeAuth = auth().onAuthStateChanged((user) => {
    if (unsubscribeAlbums) {
      unsubscribeAlbums();
      unsubscribeAlbums = null;
    }

    if (!user) {
      callback([]);
      return;
    }

    unsubscribeAlbums = firestore()
      .collection("albums")
      .where("createdBy", "==", user.uid)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            callback([]);
            return;
          }
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          callback(data);
        },
        (error) => {
          console.error("Firestore listener error:", error);
          callback([]);
        }
      );
  });

  return () => {
    if (unsubscribeAlbums) unsubscribeAlbums();
    unsubscribeAuth();
  };
}

// Subscribe to albums by month (for calendar view)
export function subscribeToAlbumsByMonth(
  callback: (albums: any[]) => void,
  year: number,
  month: number
) {
  const user = auth().currentUser;
  if (!user) return () => {};

  // Calculate start and end of month
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  // Format dates for Firestore query (YYYY-MM-DD)
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];

  return firestore()
    .collection("albums")
    .where("createdBy", "==", user.uid)
    .where("type", "==", 'calendar') // Only calendar albums have dates
    .where("displayDate", ">=", startDateString)
    .where("displayDate", "<=", endDateString)
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

// ADD THIS FUNCTION: Get album by ID (minimal version)
export async function getAlbumById(albumId: string) {
  try {
    const doc = await firestore().collection("albums").doc(albumId).get();
    // @ts-ignore - Ignore TypeScript checking for now
    if (doc.exists) {
      // @ts-ignore
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting album:", error);
    return null;
  }
}

// ===== NEW FUNCTIONS FOR HIERARCHICAL ALBUMS =====

// Helper function to find or create month album
export async function findOrCreateMonthAlbum(year: string, month: string): Promise<string | null> {
  const user = auth().currentUser;
  if (!user) return null;

  const monthAlbumName = `${year}-${month}`; // e.g., "2025-11"
  const monthAlbumTitle = `${getMonthName(month)} ${year}`; // e.g., "November 2025"

  try {
    // Try to find existing month album
    const snapshot = await firestore()
      .collection("albums")
      .where("createdBy", "==", user.uid)
      .where("type", "==", 'month')
      .where("monthKey", "==", monthAlbumName)
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].id; // Return existing album ID
    }

    // Create new month album
    const albumData = {
      title: monthAlbumTitle,
      color: getMonthColor(month),
      description: `Memories from ${getMonthName(month)} ${year}`,
      type: 'month' as AlbumType,
      monthKey: monthAlbumName,
      year: parseInt(year),
      month: parseInt(month),
      createdBy: user.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
      date: null,
      displayDate: null,
    };

    const docRef = await firestore().collection("albums").add(albumData);
    return docRef.id;
  } catch (error) {
    console.error('Error finding/creating month album:', error);
    return null;
  }
}

// Helper function to find or create year album
export async function findOrCreateYearAlbum(year: string): Promise<string | null> {
  const user = auth().currentUser;
  if (!user) return null;

  const yearAlbumTitle = `Year ${year}`; // e.g., "Year 2025"

  try {
    // Try to find existing year album
    const snapshot = await firestore()
      .collection("albums")
      .where("createdBy", "==", user.uid)
      .where("type", "==", 'year')
      .where("year", "==", parseInt(year))
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].id; // Return existing album ID
    }

    // Create new year album
    const albumData = {
      title: yearAlbumTitle,
      color: getYearColor(year),
      description: `Memories from ${year}`,
      type: 'year' as AlbumType,
      yearKey: year,
      year: parseInt(year),
      createdBy: user.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
      date: null,
      displayDate: null,
    };

    const docRef = await firestore().collection("albums").add(albumData);
    return docRef.id;
  } catch (error) {
    console.error('Error finding/creating year album:', error);
    return null;
  }
}