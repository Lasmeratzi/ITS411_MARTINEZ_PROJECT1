import { useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';

export default function TodoScreen() {
  const [todoList, setTodoList] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleAdd = (text: string) => {
    if (text.trim()) {
      setTodoList(prev => [...prev, text.trim()]);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(todoList[index]);
  };

  const handleSaveEdit = (index: number) => {
    const updatedList = [...todoList];
    updatedList[index] = editingText.trim();
    setTodoList(updatedList);
    setEditingIndex(null);
    setEditingText('');
  };

  const handleDelete = (index: number) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedList = todoList.filter((_, i) => i !== index);
            setTodoList(updatedList);
            if (editingIndex === index) {
              setEditingIndex(null);
              setEditingText('');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f2f2f2' }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>My Tasks</Text>

        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Add a new task..."
          placeholderTextColor={isDark ? '#aaa' : '#666'}
          onSubmitEditing={(e) => handleAdd(e.nativeEvent.text)}
          returnKeyType="done"
        />

        <FlatList
          data={todoList}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item, index }) => (
            <View style={[styles.card, isDark && styles.cardDark]}>
              {editingIndex === index ? (
                <TextInput
                  style={[styles.cardInput, isDark && styles.cardInputDark]}
                  value={editingText}
                  onChangeText={setEditingText}
                  onSubmitEditing={() => handleSaveEdit(index)}
                  returnKeyType="done"
                  autoFocus
                />
              ) : (
                <Text style={[styles.cardText, isDark && styles.cardTextDark]}>
                  {item}
                </Text>
              )}
              <View style={styles.cardActions}>
                {editingIndex === index ? (
                  <TouchableOpacity onPress={() => handleSaveEdit(index)} style={styles.button}>
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => handleEdit(index)} style={styles.button}>
                      <Text style={styles.buttonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(index)} style={[styles.button, styles.deleteButton]}>
                      <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  inputDark: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderColor: '#444',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#2c2c2e',
    shadowColor: '#000',
  },
  cardText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
  },
  cardTextDark: {
    color: '#fff',
  },
  cardInput: {
    fontSize: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    color: '#000',
    marginBottom: 8,
  },
  cardInputDark: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderColor: '#444',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});