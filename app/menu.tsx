import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function Menu() {
  const router = useRouter();
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemTag, setItemTag] = useState('');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(user => {
      if (user) {
        setUserEmail(user.email);

        firestore()
          .collection('items')
          .where('createdBy.uid', '==', user.uid)
          .onSnapshot(snapshot => {
            const userItems = snapshot?.docs?.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) ?? [];
            setItems(userItems);
          });
      } else {
        router.replace('/');
      }
    });

    return unsubscribe;
  }, []);

  function openFormForEdit(item: any) {
    setItemName(item.name);
    setItemDescription(item.description);
    setItemTag(item.tag);
    setEditingItemId(item.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!itemName || !itemDescription || !itemTag) {
      setMessage('Please fill out all fields.');
      return;
    }

    const currentUser = auth().currentUser;

    try {
      if (editingItemId) {
        await firestore().collection('items').doc(editingItemId).update({
          name: itemName,
          description: itemDescription,
          tag: itemTag,
        });
        setMessage(`Item "${itemName}" updated successfully!`);
      } else {
        await firestore().collection('items').add({
          name: itemName,
          description: itemDescription,
          tag: itemTag,
          createdBy: {
            uid: currentUser?.uid,
            email: currentUser?.email,
          },
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        setMessage(`Item "${itemName}" submitted successfully!`);
      }

      setItemName('');
      setItemDescription('');
      setItemTag('');
      setEditingItemId(null);
      setShowForm(false);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    }
  }

  function confirmDelete(itemId: string) {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(itemId),
        },
      ],
      { cancelable: true }
    );
  }

  async function handleDelete(itemId: string) {
    try {
      await firestore().collection('items').doc(itemId).delete();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Logged in as {userEmail}</Text>

        <TouchableOpacity style={styles.addBox} onPress={() => setShowForm(true)}>
          <Text style={styles.plusIcon}>＋</Text>
          <Text style={styles.addText}>Add Item</Text>
        </TouchableOpacity>

        <Modal
          visible={showForm}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowForm(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingItemId ? 'Edit Item' : 'Add New Item'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Item Name"
                placeholderTextColor="#888"
                value={itemName}
                onChangeText={setItemName}
              />
              <TextInput
                style={styles.input}
                placeholder="Item Description"
                placeholderTextColor="#888"
                value={itemDescription}
                onChangeText={setItemDescription}
              />
              <TextInput
                style={styles.input}
                placeholder="Item Tag"
                placeholderTextColor="#888"
                value={itemTag}
                onChangeText={setItemTag}
              />

              {message ? <Text style={styles.message}>{message}</Text> : null}

              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>
                  {editingItemId ? 'Update' : 'Submit'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setShowForm(false);
                  setEditingItemId(null);
                  setItemName('');
                  setItemDescription('');
                  setItemTag('');
                  setMessage('');
                }}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Text style={styles.sectionTitle}>Your Items</Text>
        {items.length === 0 ? (
          <Text style={styles.noItems}>No items submitted yet.</Text>
        ) : (
          <View style={styles.itemsContainer}>
            {items.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <Text style={styles.itemTag}>#{item.tag}</Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cardButton}
                    onPress={() => openFormForEdit(item)}
                  >
                    <Text style={styles.cardButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cardButton, styles.deleteButton]}
                    onPress={() => confirmDelete(item.id)}
                  >
                    <Text style={[styles.cardButtonText, styles.deleteButtonText]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={() => auth().signOut().then(() => router.replace('/'))}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  addBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#0077b6',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  plusIcon: {
    fontSize: 32,
    color: '#0077b6',
    marginBottom: 5,
  },
  addText: {
    fontSize: 16,
    color: '#0077b6',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  message: {
    color: '#0077b6',
    textAlign: 'center',
    marginBottom: 15,
  },
   button: {
    backgroundColor: '#0077b6',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0077b6',
  },
  secondaryButtonText: {
    color: '#0077b6',
  },
  logoutButton: {
    marginTop: 30,
    backgroundColor: '#e63946',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  noItems: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#f1f1f1',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    width: '48%',
    minHeight: 140,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  itemDescription: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  itemTag: {
    fontSize: 12,
    color: '#0077b6',
    marginTop: 4,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cardButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#0077b6',
  },
  cardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#e63946',
  },
  deleteButtonText: {
    color: '#fff',
  },
});