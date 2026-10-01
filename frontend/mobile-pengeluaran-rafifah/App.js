import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { api } from "./src/api";
import { rupiah, tanggalLokal, validate } from "./src/helpers";

export default function App() {
  return (
    <SafeAreaProvider>
      <Utama />
    </SafeAreaProvider>
  );
}

function Utama() {
  const [screen, setScreen] = useState("list");
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [judul, setJudul] = useState("");
  const [nominal, setNominal] = useState("");
  const [catatan, setCatatan] = useState("");
  const [categoryId, setCategoryId] = useState(null);

  // UI State Tambahan
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const lock = useRef(false);

  async function load() {
    if (lock.current) return;
    lock.current = true;
    setLoading(true);
    setError("");
    try {
      const rows = await api.list();
      if (!Array.isArray(rows)) throw new Error("Daftar harus berupa array");
      setItems(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function back() {
    if (lock.current) return;
    setError("");
    setScreen(screen === "edit" ? "detail" : "list");
  }

  async function openDetail(id) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setSelected(await api.detail(id));
      setScreen("detail");
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function openCreate() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const rows = await api.categories();
      if (!Array.isArray(rows)) throw new Error("Kategori harus berupa array");
      setCategories(rows);
      setJudul("");
      setNominal("");
      setCatatan("");
      setCategoryId(null);
      setScreen("create");
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function openEdit() {
    setJudul(selected.judul);
    setNominal(String(selected.nominal));
    setCatatan(selected.catatan || "");
    setError("");
    setScreen("edit");
  }

  async function save() {
    if (lock.current) return;
    const pesan = validate(judul, nominal);
    if (pesan) {
      setError(pesan);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    let saved = false;
    try {
      const body = {
        judul: judul.trim(),
        nominal: Number(nominal),
        catatan: catatan.trim(),
      };
      if (screen === "create") {
        await api.create({ ...body, id_kategori: categoryId });
      } else {
        await api.update(selected.id, body);
      }
      saved = true;
      setItems([]);
      setScreen("list");
      setSelected(null);
      const rows = await api.list();
      if (!Array.isArray(rows)) throw new Error("Daftar harus berupa array");
      setItems(rows);
    } catch (e) {
      setError(
        saved
          ? `Data tersimpan. Muat ulang daftar: ${e.message}`
          : `${e.message}. Jika koneksi putus, cek daftar sebelum mengulang.`
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setShowDeleteModal(false);
    let deleted = false;
    try {
      await api.remove(selected.id);
      deleted = true;
      setItems([]);
      setSelected(null);
      setScreen("list");
      const rows = await api.list();
      if (!Array.isArray(rows)) throw new Error("Daftar harus berupa array");
      setItems(rows);
    } catch (e) {
      setError(
        deleted ? `Data terhapus. Muat ulang daftar: ${e.message}` : e.message
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const disabled = loading || busy;
  const selectedCategoryName =
    categories.find((c) => c.id === categoryId)?.nama || "Pilih Kategori";

  return (
    <SafeAreaView style={s.page}>
      {/* HEADER TAMPILAN */}
      <View style={s.header}>
        {screen !== "list" && (
          <Pressable onPress={back} disabled={disabled} style={s.backButton}>
            <Text style={s.backIcon}>←</Text>
          </Pressable>
        )}
        <Text style={s.headerTitle}>
          {screen === "list" && "Daftar Pengeluaran"}
          {screen === "create" && "Tambah Pengeluaran"}
          {screen === "detail" && "Detail Pengeluaran"}
          {screen === "edit" && "Ubah Pengeluaran"}
        </Text>
        {screen === "list" && (
          <Pressable
            onPress={load}
            disabled={disabled}
            style={s.refreshHeaderBtn}
          >
            <Text style={s.refreshIcon}>↻</Text>
          </Pressable>
        )}
      </View>

      {/* INDIKATOR MEMUAT DATA */}
      {disabled && (
        <ActivityIndicator
          size="large"
          color="#0F766E"
          style={{ marginVertical: 10 }}
        />
      )}

      {/* 1. SKRIN DAFTAR PENGELUARAN */}
      {screen === "list" && (
        <View style={s.flex1}>
          {!!error ? (
            <View style={s.emptyStateContainer}>
              <View style={[s.iconCircle, { backgroundColor: "#FEE2E2" }]}>
                <Text style={{ fontSize: 28, color: "#B91C1C" }}>!</Text>
              </View>
              <Text style={s.emptyTitle}>Gagal memuat data</Text>
              <Text style={s.emptySubtitle}>{error}</Text>
              <Pressable
                style={s.primaryButtonSmall}
                onPress={load}
                disabled={disabled}
              >
                <Text style={s.primaryButtonText}>Coba Lagi</Text>
              </Pressable>
            </View>
          ) : items.length === 0 && !loading ? (
            <View style={s.emptyStateContainer}>
              <View style={[s.iconCircle, { backgroundColor: "#CCFBF1" }]}>
                <Text style={{ fontSize: 28, color: "#0F766E" }}>📝</Text>
              </View>
              <Text style={s.emptyTitle}>Belum ada pencatatan pengeluaran</Text>
              <Text style={s.emptySubtitle}>
                Catat pengeluaran pertama agar keuanganmu lebih terarah.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 12 }}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={load} />
              }
            >
              {items.map((item) => (
                <Pressable
                  key={String(item.id)}
                  style={s.card}
                  onPress={() => openDetail(item.id)}
                  disabled={disabled}
                >
                  <View style={s.cardLeft}>
                    <Text style={s.cardTitle}>{item.judul}</Text>
                    <View style={s.cardMetaRow}>
                      <View style={s.badge}>
                        <Text style={s.badgeText}>
                          {item.kategori || "Tanpa Kategori"}
                        </Text>
                      </View>
                      <Text style={s.cardDate}>
                        {tanggalLokal(item.tanggal)}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.cardAmount}>{rupiah(item.nominal)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={s.bottomBar}>
            <Pressable
              style={s.primaryButton}
              onPress={openCreate}
              disabled={disabled}
            >
              <Text style={s.primaryButtonText}>Tambah Pengeluaran</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 2. SKRIN DETAIL PENGELUARAN */}
      {screen === "detail" && (
        <View style={s.flex1}>
          {!selected ? (
            <View style={s.emptyStateContainer}>
              <View style={[s.iconCircle, { backgroundColor: "#FEE2E2" }]}>
                <Text style={{ fontSize: 28, color: "#B91C1C" }}>🗑</Text>
              </View>
              <Text style={s.emptyTitle}>Data tidak ditemukan</Text>
              <Text style={s.emptySubtitle}>
                Pengeluaran ini mungkin sudah dihapus atau tidak tersedia.
              </Text>
              <Pressable style={s.primaryButtonSmall} onPress={back}>
                <Text style={s.primaryButtonText}>Kembali ke Utama</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={s.detailCard}>
                <Text style={s.detailTitle}>{selected.judul}</Text>

                <View style={s.detailGroup}>
                  <Text style={s.detailLabel}>Nominal</Text>
                  <Text style={s.detailValueAmount}>
                    {rupiah(selected.nominal)}
                  </Text>
                </View>

                <View style={s.detailGroup}>
                  <Text style={s.detailLabel}>Tanggal</Text>
                  <Text style={s.detailValue}>
                    {tanggalLokal(selected.tanggal)}
                  </Text>
                </View>

                <View style={s.detailGroup}>
                  <Text style={s.detailLabel}>Catatan</Text>
                  <Text style={s.detailValue}>
                    {selected.catatan || "Belum ada catatan"}
                  </Text>
                </View>

                <View style={s.detailGroup}>
                  <Text style={s.detailLabel}>Kategori</Text>
                  <Text style={s.detailValue}>
                    {selected.kategori ||
                      selected.nama_kategori ||
                      items.find((i) => i.id === selected.id)?.kategori ||
                      "Tanpa Kategori"}
                  </Text>
                </View>

                <View style={{ gap: 8, marginTop: 12 }}>
                  <Pressable
                    style={s.primaryButton}
                    onPress={openEdit}
                    disabled={disabled}
                  >
                    <Text style={s.primaryButtonText}>Ubah</Text>
                  </Pressable>
                  <Pressable
                    style={s.dangerButton}
                    onPress={() => setShowDeleteModal(true)}
                    disabled={disabled}
                  >
                    <Text style={s.dangerButtonText}>Hapus</Text>
                  </Pressable>
                  <Pressable
                    style={s.outlineButton}
                    onPress={back}
                    disabled={disabled}
                  >
                    <Text style={s.outlineButtonText}>Kembali</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* 3. SKRIN FORM (TAMBAH & UBAH) */}
      {(screen === "create" || screen === "edit") && (
        <View style={s.flex1}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>Judul</Text>
              <TextInput
                style={[
                  s.formInput,
                  !!error && error.includes("Judul") && s.formInputError,
                ]}
                value={judul}
                onChangeText={setJudul}
                placeholder="Masukkan judul"
                placeholderTextColor="#64748B"
                editable={!busy}
                maxLength={100}
              />
              {!!error && error.includes("Judul") && (
                <Text style={s.errorText}>{error}</Text>
              )}
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Nominal</Text>
              <TextInput
                style={[
                  s.formInput,
                  !!error && error.includes("Nominal") && s.formInputError,
                ]}
                value={nominal}
                onChangeText={setNominal}
                keyboardType="number-pad"
                placeholder="Rp 0"
                placeholderTextColor="#64748B"
                editable={!busy}
              />
              {!!error && error.includes("Nominal") && (
                <Text style={s.errorText}>{error}</Text>
              )}
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>Catatan (Opsional)</Text>
              <TextInput
                style={[
                  s.formInput,
                  { height: 80, textAlignVertical: "top", paddingTop: 12 },
                ]}
                value={catatan}
                onChangeText={setCatatan}
                placeholder="Contoh: Beli mie ayam porsi dobel"
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
                editable={!busy}
              />
            </View>
            {screen === "create" ? (
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Kategori</Text>
                <Pressable
                  style={s.formSelect}
                  onPress={() => setShowCategorySheet(true)}
                  disabled={busy}
                >
                  <Text
                    style={{
                      color: categoryId ? "#0F172A" : "#64748B",
                      fontSize: 16,
                    }}
                  >
                    {selectedCategoryName}
                  </Text>
                  <Text style={{ color: "#64748B" }}>▼</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Kategori</Text>
                <View style={[s.formSelect, { backgroundColor: "#F1F5F9" }]}>
                  <Text style={{ color: "#64748B", fontSize: 16 }}>
                    {selected.kategori || "Tanpa Kategori"}
                  </Text>
                </View>
                <Text style={{ color: "#64748B", fontSize: 12 }}>
                  API ubah hanya menerima judul dan nominal.
                </Text>
              </View>
            )}

            {!!error &&
              !error.includes("Judul") &&
              !error.includes("Nominal") && (
                <Text style={s.errorText}>{error}</Text>
              )}
          </ScrollView>

          <View style={s.bottomBar}>
            <Pressable
              style={[s.primaryButton, busy && s.disabledButton]}
              onPress={save}
              disabled={disabled}
            >
              <Text style={s.primaryButtonText}>
                {busy ? "Menyimpan..." : "Simpan"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* MODAL BOTTOM SHEET KATEGORI */}
      <Modal visible={showCategorySheet} transparent animationType="slide">
        <Pressable
          style={s.modalOverlay}
          onPress={() => setShowCategorySheet(false)}
        >
          <View style={s.bottomSheetContainer}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Pilih Kategori</Text>

            {[{ id: null, nama: "Tanpa Kategori" }, ...categories].map((k) => (
              <Pressable
                key={String(k.id)}
                style={s.categoryOption}
                onPress={() => {
                  setCategoryId(k.id);
                  setShowCategorySheet(false);
                }}
              >
                <Text style={s.categoryOptionText}>{k.nama}</Text>
                <View
                  style={[
                    s.radioOuter,
                    categoryId === k.id && s.radioOuterSelected,
                  ]}
                >
                  {categoryId === k.id && <View style={s.radioInner} />}
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* MODAL DIALOG CONFIRM DELETE */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={s.modalOverlayCenter}>
          <View style={s.deleteDialogContainer}>
            <View
              style={[
                s.iconCircle,
                { backgroundColor: "#FEE2E2", width: 48, height: 48 },
              ]}
            >
              <Text style={{ color: "#B91C1C", fontSize: 20 }}>🗑</Text>
            </View>
            <Text style={s.deleteDialogTitle}>Hapus pengeluaran?</Text>
            <Text style={s.deleteDialogSubtitle}>
              {selected?.judul} akan dihapus permanen. Tindakan ini tidak dapat
              dibatalkan.
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Pressable
                style={[s.outlineButton, { flex: 1 }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={s.outlineButtonText}>Batal</Text>
              </Pressable>
              <Pressable style={[s.dangerButton, { flex: 1 }]} onPress={remove}>
                <Text style={s.dangerButtonText}>Hapus</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  page: { flex: 1, backgroundColor: "#F8FAFC" },

  /* Header (Ikon diperbesar) */
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "700",
  },
  backButton: {
    padding: 6,
    marginRight: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 28, // Diperbesar
    fontWeight: "bold",
    color: "#0F172A",
  },
  refreshHeaderBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshIcon: {
    fontSize: 24, // Diperbesar
    fontWeight: "bold",
    color: "#0F766E",
  },

  /* Card Pengeluaran */
  card: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardLeft: { flex: 1, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#0F172A" },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#CCFBF1",
    borderRadius: 16,
  },
  badgeText: { color: "#115E59", fontSize: 12, fontWeight: "600" },
  cardDate: { color: "#64748B", fontSize: 14 },
  cardAmount: { color: "#0F766E", fontSize: 18, fontWeight: "700" },

  /* Bottom Bar */
  bottomBar: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  primaryButton: {
    height: 48,
    backgroundColor: "#0F766E",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  disabledButton: { opacity: 0.5 },

  primaryButtonSmall: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: "#0F766E",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  dangerButton: {
    height: 48,
    backgroundColor: "#B91C1C",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  outlineButton: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: { color: "#0F172A", fontSize: 16, fontWeight: "700" },

  /* Empty & Error State */
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },

  /* Detail Screen */
  detailCard: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 16,
  },
  detailTitle: { fontSize: 22, fontWeight: "700", color: "#0F172A" },
  detailGroup: { gap: 4 },
  detailLabel: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  detailValue: { fontSize: 16, color: "#0F172A" },
  detailValueAmount: { fontSize: 16, color: "#0F766E", fontWeight: "600" },

  /* Form Elements */
  formGroup: { gap: 8 },
  formLabel: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  formInput: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    fontSize: 16,
    color: "#0F172A",
  },
  formInputError: { borderColor: "#B91C1C", borderWidth: 2 },
  formSelect: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: { color: "#B91C1C", fontSize: 14 },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.50)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  categoryOption: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryOptionText: { fontSize: 16, color: "#0F172A" },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: { borderColor: "#0F766E" },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0F766E",
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.50)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deleteDialogContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  deleteDialogTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  deleteDialogSubtitle: { fontSize: 14, color: "#64748B", lineHeight: 20 },
});
