import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Search, Grid3x3, Camera as CameraIcon, X } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useFoodBankItems, useFoodBankItemSearch, groupByCategory } from '../../lib/hooks/useFoodBankItems';
import { useAddPantryItem } from '../../lib/hooks/useUserPantry';
import { FoodBankItem } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { imageUriToBase64 } from '../../lib/utils/webCompat';

type Mode = 'search' | 'browse' | 'scan';

interface AddPantryModalProps {
  visible: boolean;
  onClose: () => void;
}

async function identifyFoodItems(base64: string): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const response = await fetch(`${supabaseUrl}/functions/v1/identify-food-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ image_base64: base64 }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Scan failed');
  return data.items as string[];
}

/** Best catalog match for a free-text detected name, or null if nothing close enough. */
function bestMatch(detectedName: string, catalog: FoodBankItem[]): FoodBankItem | null {
  const needle = detectedName.trim().toLowerCase();
  const exact = catalog.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact;
  const partial = catalog.find(
    (c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase())
  );
  return partial ?? null;
}

export function AddPantryModal({ visible, onClose }: AddPantryModalProps) {
  const { colors, typography } = useTheme();
  const [mode, setMode] = useState<Mode>('search');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMatches, setScanMatches] = useState<FoodBankItem[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);

  const addItem = useAddPantryItem();
  const { data: allItems } = useFoodBankItems();
  const { data: searchResults } = useFoodBankItemSearch(search);

  const handleAdd = (id: string) => {
    addItem.mutate(id);
  };

  const resetScan = () => {
    setScanMatches([]);
    setConfirmedIds([]);
  };

  const handleScan = async () => {
    const result = Platform.OS === 'web'
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
      : await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled) return;

    setScanning(true);
    resetScan();
    try {
      const base64 = await imageUriToBase64(result.assets[0].uri);
      const detectedNames = await identifyFoodItems(base64);
      const catalog = allItems ?? [];
      const matches = detectedNames
        .map((name) => bestMatch(name, catalog))
        .filter((m): m is FoodBankItem => m !== null);
      // De-dupe by id in case two detected names map to the same catalog item
      const unique = Array.from(new Map(matches.map((m) => [m.id, m])).values());
      setScanMatches(unique);
    } catch (e: any) {
      Alert.alert('Scan failed', e.message);
    } finally {
      setScanning(false);
    }
  };

  const toggleScanMatch = (id: string) => {
    setConfirmedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addConfirmedScanItems = () => {
    confirmedIds.forEach((id) => addItem.mutate(id));
    resetScan();
    onClose();
  };

  const groups = groupByCategory(allItems ?? []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            Add to Pantry
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <X color={colors.textPrimary} size={24} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {(['search', 'browse', 'scan'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.tab, { borderBottomColor: mode === m ? colors.primary : 'transparent' }]}
            >
              {m === 'search' && <Search size={16} color={mode === m ? colors.primary : colors.textSecondary} strokeWidth={2} />}
              {m === 'browse' && <Grid3x3 size={16} color={mode === m ? colors.primary : colors.textSecondary} strokeWidth={2} />}
              {m === 'scan' && <CameraIcon size={16} color={mode === m ? colors.primary : colors.textSecondary} strokeWidth={2} />}
              <Text style={{ color: mode === m ? colors.primary : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'search' && (
          <View style={{ flex: 1, padding: 16 }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
              placeholder="Search food bank items..."
              placeholderTextColor={colors.placeholder}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            <ScrollView style={{ marginTop: 12 }}>
              {(searchResults ?? []).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.resultRow, { borderColor: colors.border }]}
                  onPress={() => handleAdd(item.id)}
                >
                  <Text style={{ color: colors.textPrimary }}>{item.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {mode === 'browse' && (
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {groups.map((group) => (
              <View key={group.category} style={{ marginBottom: 16 }}>
                <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{group.category.toUpperCase()}</Text>
                {group.items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.resultRow, { borderColor: colors.border }]}
                    onPress={() => handleAdd(item.id)}
                  >
                    <Text style={{ color: colors.textPrimary }}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        )}

        {mode === 'scan' && (
          <View style={{ flex: 1, padding: 16 }}>
            {scanMatches.length === 0 ? (
              <>
                <Text style={{ color: colors.textSecondary, marginBottom: 16, lineHeight: 20 }}>
                  Take a photo of the food items you received, and we'll try to match them to the catalog.
                </Text>
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: colors.primary }]}
                  onPress={handleScan}
                  disabled={scanning}
                >
                  {scanning ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontFamily: typography.fontFamilies.sansSemiBold }}>Take Photo</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
                  Tap the items you'd like to add to your pantry:
                </Text>
                <ScrollView style={{ flex: 1 }}>
                  {scanMatches.map((item) => {
                    const active = confirmedIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.resultRow,
                          { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '15' : 'transparent' },
                        ]}
                        onPress={() => toggleScanMatch(item.id)}
                      >
                        <Text style={{ color: colors.textPrimary }}>{item.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: confirmedIds.length ? colors.primary : colors.border, marginTop: 12 }]}
                  onPress={addConfirmedScanItems}
                  disabled={!confirmedIds.length}
                >
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamilies.sansSemiBold }}>
                    Add {confirmedIds.length || ''} to Pantry
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={resetScan}>
                  <Text style={{ color: colors.primary }}>Scan again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  title: { fontSize: 24 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0001' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 12, borderBottomWidth: 2 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  resultRow: { paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  groupLabel: { fontSize: 11, letterSpacing: 1.2, marginBottom: 8 },
  scanButton: { paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
});
