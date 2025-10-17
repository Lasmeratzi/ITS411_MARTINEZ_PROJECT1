import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

// Create a memory (image + description + date)
export async function createMemory(
  description: string,
  imageUrl: string,
  albumId: string | null = null,
  date: string | null = null // optional date
) {
  const user = auth().currentUser;
  if (!user) throw new Error("User not logged in");

  return firestore().collection("memories").add({
    description,
    imageUrl,
    albumId,
    createdBy: user.uid,
    createdAt: firestore.FieldValue.serverTimestamp(),
    date: date ? new Date(date).toISOString() : null, // ensure proper format
  });
}

// Update memory
export async function updateMemory(
  id: string,
  data: Partial<{ description: string; imageUrl: string; albumId: string | null; date?: string }>
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
export function subscribeToUserMemories(
  callback: (memories: any[]) => void,
  albumId?: string
) {
  const user = auth().currentUser;
  if (!user) return () => {};

  let query = firestore()
    .collection("memories")
    .where("createdBy", "==", user.uid)
    .orderBy("createdAt", "desc");

  if (albumId) {
    query = query.where("albumId", "==", albumId);
  }

  return query.onSnapshot(
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date ? new Date(doc.data().date).toLocaleDateString() : null, // readable format
      }));
      callback(data);
    },
    (error) => {
      console.error("Firestore listener error:", error);
    }
  );
}
