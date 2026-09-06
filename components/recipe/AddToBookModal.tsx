import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Check, BookOpen, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import {
  useRecipeBooks,
  useAddRecipeToBook,
  useRemoveRecipeFromBook,
  useCreateRecipeBook,
  useDeleteRecipeBook,
} from '../../lib/hooks/useRecipeBooks';

interface Props {
  visible: boolean;
  recipeId: string;
  onClose: () => void;
}

export function AddToBookModal({ visible, recipeId, onClose }: Props) {
  const { colors, typography } = useTheme();
  const [newBookName, setNewBookName] = useState('');
  const [showNewBook, setShowNewBook] = useState(false);

  const { data: books, isLoading } = useRecipeBooks();
  const addToBook = useAddRecipeToBook();
  const removeFromBook = useRemoveRecipeFromBook();
  const createBook = useCreateRecipeBook();
  const deleteBook = useDeleteRecipeBook();

  const handleToggleBook = (bookId: string, currentlyIn: boolean) => {
    if (currentlyIn) {
      removeFromBook.mutate({ bookId, recipeId });
    } else {
      addToBook.mutate({ bookId, recipeId });
    }
  };

  const handleCreateBook = () => {
    if (!newBookName.trim()) return;
    createBook.mutate(newBookName.trim(), {
      onSuccess: (newBook) => {
        addToBook.mutate({ bookId: newBook.id, recipeId });
        setNewBookName('');
        setShowNewBook(false);
      },
    });
  };

  const handleDeleteBook = (bookId: string, bookName: string) => {
    Alert.alert(
      'Delete Book',
      `Delete "${bookName}"? Recipes inside won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteBook.mutate(bookId) },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text
            style={[
              styles.title,
              { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
            ]}
          >
            Save to Book
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <X color={colors.textSecondary} size={22} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {books?.map((book) => {
              const isInBook = book.recipe_ids.includes(recipeId);
              return (
                <View
                  key={book.id}
                  style={[styles.bookRow, { borderBottomColor: colors.border }]}
                >
                  <TouchableOpacity
                    onPress={() => handleToggleBook(book.id, isInBook)}
                    style={styles.bookRowMain}
                  >
                    <View style={[styles.bookIcon, { backgroundColor: colors.surface }]}>
                      <BookOpen size={18} color={colors.primary} strokeWidth={1.75} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.bookName,
                          { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium },
                        ]}
                      >
                        {book.name}
                      </Text>
                      <Text
                        style={[
                          styles.bookCount,
                          { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
                        ]}
                      >
                        {book.recipe_count} {book.recipe_count === 1 ? 'recipe' : 'recipes'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isInBook ? colors.primary : colors.border,
                          backgroundColor: isInBook ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isInBook && <Check size={14} color="#fff" strokeWidth={2.5} />}
                    </View>
                  </TouchableOpacity>

                  {!book.is_default && (
                    <TouchableOpacity
                      onPress={() => handleDeleteBook(book.id, book.name)}
                      style={styles.deleteBtn}
                      hitSlop={8}
                    >
                      <Trash2 size={15} color={colors.textSecondary} strokeWidth={1.75} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* New book input or button */}
            {showNewBook ? (
              <View style={[styles.newBookRow, { borderBottomColor: colors.border }]}>
                <TextInput
                  style={[
                    styles.newBookInput,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.inputBorder,
                      backgroundColor: colors.inputBackground,
                      fontFamily: typography.fontFamilies.sansRegular,
                    },
                  ]}
                  placeholder="Book name..."
                  placeholderTextColor={colors.placeholder}
                  value={newBookName}
                  onChangeText={setNewBookName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateBook}
                />
                <TouchableOpacity
                  onPress={handleCreateBook}
                  disabled={!newBookName.trim() || createBook.isPending}
                  style={[styles.createBtn, { backgroundColor: colors.primary }]}
                >
                  {createBook.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.createBtnText,
                        { fontFamily: typography.fontFamilies.sansSemiBold },
                      ]}
                    >
                      Create
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowNewBook(false); setNewBookName(''); }}
                  hitSlop={8}
                >
                  <X size={18} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowNewBook(true)}
                style={[styles.addBookBtn, { borderBottomColor: colors.border }]}
              >
                <Plus size={18} color={colors.primary} strokeWidth={2} />
                <Text
                  style={[
                    styles.addBookText,
                    { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium },
                  ]}
                >
                  Create new book
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24 },
  list: { paddingBottom: 40 },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bookRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  bookIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookName: { fontSize: 15 },
  bookCount: { fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  newBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  newBookInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  addBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addBookText: { fontSize: 15 },
});
