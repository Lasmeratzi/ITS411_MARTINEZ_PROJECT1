import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  profilePicture?: string;
  displayName?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface UserContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (firebaseUser: any) => {
    try {
      console.log('Fetching user data for:', firebaseUser.uid);
      const userDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
      const userData = userDoc.data();
      
      // FIX: Use proper TypeScript check for document existence
      if (userData) {
        console.log('User data found in Firestore:', userData);
        setUser({
          uid: firebaseUser.uid,
          email: userData.email || firebaseUser.email || '',
          username: userData.username || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          birthDate: userData.birthDate || '',
          profilePicture: userData.profilePicture,
          displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`.trim(),
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        });
      } else {
        // Wait a moment and try again - sometimes Firestore takes a moment to save
        console.log('User document not found, waiting and retrying...');
        setTimeout(async () => {
          try {
            const retryDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
            const retryData = retryDoc.data();
            
            if (retryData) {
              console.log('User data found on retry:', retryData);
              setUser({
                uid: firebaseUser.uid,
                email: retryData.email || firebaseUser.email || '',
                username: retryData.username || '',
                firstName: retryData.firstName || '',
                lastName: retryData.lastName || '',
                birthDate: retryData.birthDate || '',
                profilePicture: retryData.profilePicture,
                displayName: retryData.displayName || `${retryData.firstName} ${retryData.lastName}`.trim(),
                createdAt: retryData.createdAt,
                updatedAt: retryData.updatedAt,
              });
            } else {
              // Only create default document if it really doesn't exist after retry
              console.log('Creating default user document after retry failed');
              const newUserData: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                username: firebaseUser.email?.split('@')[0] || 'user',
                firstName: 'User',
                lastName: '',
                birthDate: '',
                displayName: 'User',
                createdAt: firestore.FieldValue.serverTimestamp(),
                updatedAt: firestore.FieldValue.serverTimestamp(),
              };
              
              await firestore().collection('users').doc(firebaseUser.uid).set(newUserData);
              setUser(newUserData);
            }
          } catch (retryError) {
            console.error('Error on retry:', retryError);
          } finally {
            setLoading(false);
          }
        }, 1000); // Wait 1 second before retry
        return; // Exit early since we're retrying
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      if (error.code === 'firestore/permission-denied') {
        console.error('Firestore permission denied. Please check your security rules.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        await fetchUserData(firebaseUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      const updatedData = {
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('users').doc(user.uid).update(updatedData);
      
      // Update local state
      setUser(prev => prev ? { ...prev, ...updatedData } : null);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.code === 'firestore/permission-denied') {
        throw new Error('Permission denied. Please check your Firestore security rules.');
      }
      throw error;
    }
  };

  const refreshUser = async () => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  };

  const value = {
    user,
    setUser,
    loading,
    updateProfile,
    refreshUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}