import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

// Create album
export async function createAlbum(title: string, date: string | null = null) {
  const user = auth().currentUser;
  if (!user) throw new Error("User not logged in");

  return firestore().collection("albums").add({
    title,
    date, // optional calendar date (can be null)
    createdBy: user.uid,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}

// Update album
export async function updateAlbum(
  id: string,
  data: Partial<{ title: string; date: string | null }>
) {
  return firestore().collection("albums").doc(id).update(data);
}

// Delete album
export async function deleteAlbum(id: string) {
  return firestore().collection("albums").doc(id).delete();
}

// Subscribe to current user's albums (safe version)
export function subscribeToUserAlbums(callback: (albums: any[]) => void) {
  let unsubscribeAlbums: (() => void) | null = null;

  // Watch for auth state changes
  const unsubscribeAuth = auth().onAuthStateChanged((user) => {
    // Stop any previous album listener when auth changes
    if (unsubscribeAlbums) {
      unsubscribeAlbums();
      unsubscribeAlbums = null;
    }

    if (!user) {
      callback([]); // no user, clear list
      return;
    }

    // Start Firestore listener for current user's albums
    unsubscribeAlbums = firestore()
      .collection("albums")
      .where("createdBy", "==", user.uid)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            callback([]); // safety fallback
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

  // Return cleanup function for both listeners
  return () => {
    if (unsubscribeAlbums) unsubscribeAlbums();
    unsubscribeAuth();
  };
}
