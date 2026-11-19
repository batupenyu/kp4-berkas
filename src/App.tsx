import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Database,
  Download,
  FileText,
  LogOut,
  Menu,
  Moon,
  Plus,
  Printer,
  Save,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { KP4FormEditor } from './components/KP4FormEditor';
import { KP4PaperPreview } from './components/KP4PaperPreview';
import { ArchiveView } from './components/ArchiveView';
import { AllowanceSummaryView } from './components/AllowanceSummaryView';
import {
  createDocumentRecord,
  deleteKP4Document,
  listKP4Documents,
  logoutUser,
  saveKP4Document,
  subscribeAuth,
} from './services/firebaseService';
import {
  AuthUser,
  DEFAULT_KP4_DATA,
  EMPTY_KP4_DATA,
  KP4Attachment,
  KP4Data,
  KP4DocumentRecord,
} from './types/kp4';
import {
  generateKP4Docx,
  generateKP4Pdf,
  getExportFilename,
  triggerBlobDownload,
} from './utils/exportKp4';

type WorkspaceTab = 'editor' | 'archive' | 'summary';
type MobilePane = 'form' | 'preview';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kp4_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('editor');
  const [mobilePane, setMobilePane] = useState<MobilePane>('form');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [documents, setDocuments] = useState<KP4DocumentRecord[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');

  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState('KP4 Tahun 2026 — Maryani');
  const [formData, setFormData] = useState<KP4Data>(() => structuredClone(DEFAULT_KP4_DATA));
  const [attachments, setAttachments] = useState<KP4Attachment[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [exportingType, setExportingType] = useState<'pdf' | 'docx' | null>(null);
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('kp4_theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore storage failure
    }
  }, [isDark]);

  useEffect(() => {
    const unsub = subscribeAuth((authUser) => {
      setUser(authUser);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setDocuments([]);
      setActiveDocId(null);
      return;
    }

    let cancelled = false;
    setDocsLoading(true);
    listKP4Documents(user.uid)
      .then((list) => {
        if (cancelled) return;
        setDocuments(list);
        if (list.length > 0) {
          const first = list[0];
          setActiveDocId(first.id);
          setDocTitle(first.title);
          setFormData(structuredClone(first.data));
          setAttachments(first.attachments ?? []);
          setIsDirty(false);
        } else {
          const fresh = createDocumentRecord(
            user.uid,
            `KP4 — ${user.displayName || 'Pegawai'}`,
            { ...structuredClone(DEFAULT_KP4_DATA), nama: user.displayName || DEFAULT_KP4_DATA.nama }
          );
          setActiveDocId(fresh.id);
          setDocTitle(fresh.title);
          setFormData(fresh.data);
          setAttachments([]);
          setIsDirty(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotice({ type: 'error', text: 'Gagal memuat arsip dokumen dari database.' });
        }
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const filteredSidebarDocs = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.data.nama.toLowerCase().includes(q) ||
        d.data.nip.toLowerCase().includes(q)
    );
  }, [documents, sidebarSearch]);

  const handleSelectDocument = (doc: KP4DocumentRecord) => {
    setActiveDocId(doc.id);
    setDocTitle(doc.title);
    setFormData(structuredClone(doc.data));
    setAttachments(doc.attachments ?? []);
    setIsDirty(false);
    setActiveTab('editor');
    setSidebarOpen(false);
  };

  const handleCreateNewDocument = (withSampleData = false) => {
    if (!user) return;
    const baseData = withSampleData
      ? structuredClone(DEFAULT_KP4_DATA)
      : {
          ...structuredClone(EMPTY_KP4_DATA),
          nama: user.displayName || '',
        };
    const nextTitle = withSampleData
      ? `KP4 Contoh — ${baseData.nama}`
      : `KP4 Baru — ${new Date().getFullYear()}`;
    const newDoc = createDocumentRecord(user.uid, nextTitle, baseData);
    setActiveDocId(newDoc.id);
    setDocTitle(newDoc.title);
    setFormData(newDoc.data);
    setAttachments([]);
    setIsDirty(true);
    setActiveTab('editor');
    setSidebarOpen(false);
    setNotice({
      type: 'info',
      text: withSampleData
        ? 'Template contoh KP4 dimuat. Klik Simpan Dokumen untuk mengarsipkan.'
        : 'Formulir KP4 kosong siap diisi.',
    });
  };

  const handleSaveDocument = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const existing = documents.find((d) => d.id === activeDocId);
      const record: KP4DocumentRecord = {
        id: activeDocId || `kp4-${Date.now()}`,
        title: docTitle.trim() || `KP4 — ${formData.nama || 'Pegawai'}`,
        data: structuredClone(formData),
        attachments,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerUid: user.uid,
      };
      const saved = await saveKP4Document(user.uid, record);
      setActiveDocId(saved.id);
      setDocTitle(saved.title);
      setAttachments(saved.attachments ?? []);
      setDocuments((prev) => {
        const rest = prev.filter((d) => d.id !== saved.id);
        return [saved, ...rest];
      });
      setIsDirty(false);
      setNotice({
        type: 'info',
        text: `Tersimpan: ${saved.title}`,
      });
    } catch {
      setNotice({ type: 'error', text: 'Gagal menyimpan dokumen ke database.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAttachmentsUpdated = async (nextAttachments: KP4Attachment[]) => {
    setAttachments(nextAttachments);
    if (!user) return;
    const docId = activeDocId || `kp4-${Date.now()}`;
    const existing = documents.find((d) => d.id === docId);
    const record: KP4DocumentRecord = {
      id: docId,
      title: docTitle.trim() || `KP4 — ${formData.nama || 'Pegawai'}`,
      data: structuredClone(formData),
      attachments: nextAttachments,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerUid: user.uid,
    };
    const saved = await saveKP4Document(user.uid, record);
    setActiveDocId(saved.id);
    setDocuments((prev) => {
      const rest = prev.filter((d) => d.id !== saved.id);
      return [saved, ...rest];
    });
  };

  const handleDuplicateDocument = async (doc: KP4DocumentRecord) => {
    if (!user) return;
    try {
      const copy = createDocumentRecord(user.uid, `${doc.title} (Salinan)`, doc.data);
      const saved = await saveKP4Document(user.uid, copy);
      setDocuments((prev) => [saved, ...prev]);
      setNotice({ type: 'info', text: `Salinan dibuat: ${saved.title}` });
    } catch {
      setNotice({ type: 'error', text: 'Gagal menduplikasi dokumen.' });
    }
  };

  const handleDeleteDocument = async (doc: KP4DocumentRecord) => {
    if (!user) return;
    try {
      await deleteKP4Document(user.uid, doc.id);
      const remaining = documents.filter((d) => d.id !== doc.id);
      setDocuments(remaining);
      if (activeDocId === doc.id) {
        if (remaining.length > 0) {
          handleSelectDocument(remaining[0]);
        } else {
          handleCreateNewDocument(false);
        }
      }
      setNotice({ type: 'info', text: `Dokumen "${doc.title}" telah dihapus.` });
    } catch {
      setNotice({ type: 'error', text: 'Gagal menghapus dokumen.' });
    }
  };

  const handleExportPdf = async (targetData: KP4Data = formData) => {
    setExportingType('pdf');
    try {
      const blob = await generateKP4Pdf(targetData);
      const filename = getExportFilename(targetData, 'pdf');
      triggerBlobDownload(filename, blob);
      setNotice({ type: 'info', text: `Unduhan PDF dimulai: ${filename}` });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membuat file PDF.',
      });
    } finally {
      setExportingType(null);
    }
  };

  const handleExportDocx = async () => {
    setExportingType('docx');
    try {
      const blob = await generateKP4Docx(formData);
      const filename = getExportFilename(formData, 'docx');
      triggerBlobDownload(filename, blob);
      setNotice({ type: 'info', text: `Unduhan Word dimulai: ${filename}` });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membuat file Word.',
      });
    } finally {
      setExportingType(null);
    }
  };

  const handleExportJson = () => {
    const jsonBlob = new Blob([JSON.stringify({ title: docTitle, data: formData }, null, 2)], {
      type: 'application/json',
    });
    const filename = getExportFilename(formData, 'json');
    triggerBlobDownload(filename, jsonBlob);
    setNotice({ type: 'info', text: `Cadangan JSON diunduh: ${filename}` });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogout = async () => {
    await logoutUser();
    setNotice(null);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Memuat ruang kerja KP4...
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onSuccess={(u) => setUser(u)}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex print:block print:bg-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-30 lg:hidden noprint"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`noprint fixed lg:sticky top-0 left-0 z-40 h-screen w-[264px] shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-800 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Arsip Cloud KP4
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup panel samping"
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleCreateNewDocument(false)}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dokumen KP4 Baru</span>
          </button>
          <button
            type="button"
            onClick={() => handleCreateNewDocument(true)}
            className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
          >
            Muat Contoh Data (Maryani)
          </button>
        </div>

        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Cari arsip..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {docsLoading ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : filteredSidebarDocs.length === 0 ? (
            <p className="px-2 py-4 text-xs text-slate-500 dark:text-slate-400 text-center">
              Belum ada dokumen tersimpan.
            </p>
          ) : (
            filteredSidebarDocs.map((doc) => {
              const active = doc.id === activeDocId;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => handleSelectDocument(doc)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold truncate">{doc.title}</div>
                  <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {doc.data.nip || 'NIP belum diisi'}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="px-1">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {user.displayName}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {user.provider === 'firebase' ? 'Firestore Terhubung' : 'Penyimpanan Akun Lokal'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDark ? 'Terang' : 'Gelap'}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium text-red-700 dark:text-red-400 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col print:block">
        <header className="noprint sticky top-0 z-20 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka panel arsip"
              className="lg:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
              Generator KP4
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'editor'
                  ? 'border-emerald-800 dark:border-emerald-400 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Editor &amp; Pratinjau
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'archive'
                  ? 'border-emerald-800 dark:border-emerald-400 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Arsip Tersimpan ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'summary'
                  ? 'border-emerald-800 dark:border-emerald-400 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ringkasan Tunjangan
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleSaveDocument}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-emerald-900 hover:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Dokumen'}</span>
            </button>
          </div>
        </header>

        <div className="noprint md:hidden flex items-center gap-1 px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'editor'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'archive'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Arsip ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'summary'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Ringkasan
          </button>
        </div>

        {notice && (
          <div
            role="status"
            className={`noprint mx-4 sm:mx-6 mt-4 px-4 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-4 ${
              notice.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Tutup pemberitahuan"
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {activeTab === 'editor' && (
          <main className="flex-1 flex flex-col min-w-0 print:block">
            <div className="noprint px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate max-w-[240px] sm:max-w-xs font-medium text-slate-800 dark:text-slate-200">
                    {docTitle}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    {!isDirty && <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />}
                    {isDirty ? 'Perubahan belum disimpan' : 'Tersimpan'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="lg:hidden flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg mr-1">
                  <button
                    type="button"
                    onClick={() => setMobilePane('form')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                      mobilePane === 'form'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Formulir
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobilePane('preview')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                      mobilePane === 'preview'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Pratinjau
                  </button>
                </div>

                <div className="hidden xl:flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {[0.85, 1].map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setPreviewZoom(scale)}
                      className={`px-2 py-1 text-xs font-mono-tabular rounded-md whitespace-nowrap ${
                        previewZoom === scale
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {Math.round(scale * 100)}%
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportPdf()}
                  disabled={exportingType !== null}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exportingType === 'pdf' ? 'Menyiapkan...' : 'Unduh PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportDocx}
                  disabled={exportingType !== null}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{exportingType === 'docx' ? 'Menyiapkan...' : 'Unduh Word'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="hidden sm:inline-flex px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <span>JSON</span>
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(360px,450px)_1fr] gap-6 p-4 sm:p-6 items-start print:block print:p-0">
              <div
                className={`noprint ${
                  mobilePane === 'form' ? 'block' : 'hidden lg:block'
                }`}
              >
                <KP4FormEditor
                  data={formData}
                  docTitle={docTitle}
                  uid={user.uid}
                  docId={activeDocId || 'draft'}
                  attachments={attachments}
                  onAttachmentsUpdated={handleAttachmentsUpdated}
                  onNotify={setNotice}
                  onTitleChange={(t) => {
                    setDocTitle(t);
                    setIsDirty(true);
                  }}
                  onChange={(next) => {
                    setFormData(next);
                    setIsDirty(true);
                  }}
                />
              </div>

              <div
                className={`overflow-x-auto pb-8 print:overflow-visible print:pb-0 ${
                  mobilePane === 'preview' ? 'block' : 'hidden lg:block'
                }`}
              >
                <KP4PaperPreview data={formData} zoom={previewZoom} />
              </div>
            </div>
          </main>
        )}

        {activeTab === 'archive' && (
          <main className="flex-1 noprint">
            <ArchiveView
              documents={documents}
              activeDocId={activeDocId}
              loading={docsLoading}
              onOpenDocument={handleSelectDocument}
              onCreateNew={() => handleCreateNewDocument(false)}
              onDuplicateDocument={handleDuplicateDocument}
              onDeleteDocument={handleDeleteDocument}
              onDownloadPdf={(doc) => handleExportPdf(doc.data)}
            />
          </main>
        )}

        {activeTab === 'summary' && (
          <main className="flex-1 noprint">
            <AllowanceSummaryView
              data={formData}
              uid={user.uid}
              docId={activeDocId || 'draft'}
              attachments={attachments}
              onAttachmentsUpdated={handleAttachmentsUpdated}
              onNotify={setNotice}
              onBackToEditor={() => setActiveTab('editor')}
            />
          </main>
        )}
      </div>
    </div>
  );
}
