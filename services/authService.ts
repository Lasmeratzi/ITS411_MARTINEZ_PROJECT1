import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  birthDate: string;
}

export async function signIn(email: string, password: string) {
  return auth().signInWithEmailAndPassword(email, password);
}

export async function signUp(userData: SignUpData) {
  const { email, password, username, firstName, lastName, birthDate } = userData;
  
  console.log('Creating user with data:', userData); // Debug log
  
  // Create user in Firebase Auth
  const userCredential = await auth().createUserWithEmailAndPassword(email, password);
  const user = userCredential.user;

  // Create user profile in Firestore with ALL the data
  const userProfile = {
    uid: user.uid,
    email: email,
    username: username.trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    birthDate: birthDate,
    displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };

  console.log('Saving user profile to Firestore:', userProfile); // Debug log

  await firestore().collection('users').doc(user.uid).set(userProfile);

  // Update auth profile
  await user.updateProfile({
    displayName: `${firstName} ${lastName}`.trim(),
  });

  return userCredential;
}

export async function signOut() {
  return auth().signOut();
}