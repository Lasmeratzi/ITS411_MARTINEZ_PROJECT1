import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

// Create album with type differentiation
export async function createAlbum(
  title: string,
  color: string = "#FF9A8B", 
  description: string = "",
  date: string | null = null, 
  type: 'regular' | 'calendar' = 'regular'
) {
  const user = auth().currentUser;
  if (!user) throw new Error("User not logged in");

  // For calendar albums, use the provided date as creation date
  // For regular albums, use current date
  const albumData = {
    title,
    color,
    description,
    type,
    createdBy: user.uid,
    createdAt: firestore.FieldValue.serverTimestamp(),
    // Store the display date separately
    displayDate: type === 'calendar' && date ? date : null,
  };

  return firestore().collection("albums").add(albumData);
}

// Create calendar album (convenience function)
export async function createCalendarAlbum(
  title: string,
  date: string, // Required for calendar albums
  description: string = "",
  color: string = "#FF9A8B"
) {
  return createAlbum(title, color, description, date, 'calendar');
}

// Create regular album (convenience function)
export async function createRegularAlbum(
  title: string,
  description: string = "",
  color: string = "#FF9A8B"
) {
  return createAlbum(title, color, description, null, 'regular');
}

// Update album (existing - good as is)
export async function updateAlbum(
  id: string,
  data: Partial<{ 
    title: string; 
    color: string; 
    description: string;
    date: string | null;
    type?: 'regular' | 'calendar';
  }>
) {
  return firestore().collection("albums").doc(id).update(data);
}

// Delete album (existing - good as is)
export async function deleteAlbum(id: string) {
  return firestore().collection("albums").doc(id).delete();
}

// Get albums by type
export function subscribeToAlbumsByType(
  callback: (albums: any[]) => void,
  type: 'regular' | 'calendar'
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