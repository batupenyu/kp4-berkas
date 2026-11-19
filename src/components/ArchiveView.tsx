import React, { useMemo, useState } from 'react';
import { Copy, FileDown, FolderOpen, Plus, Search, Trash2 } from 'lucide-react';
import { countChildren, KP4DocumentRecord } from '../types/kp4';

interface ArchiveViewProps {
  documents: KP4DocumentRecord[];
  activeDocId: string | null;
  loading: boolean;
  onOpenDocument: (doc: KP4DocumentRecord) => void;
  onCreateNew: () => void;
  onDuplicateDocument: (doc: KP4DocumentRecord) => void;
  onDeleteDocument: (doc: KP4DocumentRecord) => void;
  onDownloadPdf: (doc: KP4DocumentRecord) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  documents,
  activeDocId,
  loading,
  onOpenDocument,
  onCreateNew,
  onDuplicateDocument,
  onDeleteDocument,
  onDownloadPdf,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [instansiFilter, setInstansiFilter] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const instansiOptions = useMemo(() => {
    const unique = new Set<string>();
    documents.forEach((d) => {
      if (d.data.instansi?.trim()) unique.add(d.data.instansi.trim());
    });
    return Array.from(unique);
  }, [documents]);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesInstansi =
        instansiFilter === 'all' || doc.data.instansi.trim() === instansiFilter;
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.data.nama.toLowerCase().includes(q) ||
        doc.data.nip.toLowerCase().includes(q) ||
        doc.data.instansi.toLowerCase().includes(q);
      return matchesInstansi && matchesSearch;
    });
  }, [documents, searchQuery, instansiFilter]);

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Arsip Dokumen KP4 Tersimpan
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Daftar formulir KP4 yang tersimpan pada akun Anda. Pilih dokumen untuk menyunting atau
            mengunduh ulang.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-900 hover:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat KP4 Baru</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pegawai, NIP, atau instansi..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </div>

        {instansiOptions.length > 0 && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setInstansiFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                instansiFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua Instansi
            </button>
            {instansiOptions.map((inst) => (
              <button
                key={inst}
                type="button"
                onClick={() => setInstansiFilter(inst)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  instansiFilter === inst
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {inst}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-11 rounded-md bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {documents.length === 0
                ? 'Belum ada dokumen KP4 tersimpan'
                : 'Tidak ada dokumen yang cocok dengan pencarian'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              {documents.length === 0
                ? 'Mulai dengan membuat dokumen KP4 baru untuk menyimpannya ke arsip.'
                : 'Coba ubah kata kunci pencarian atau reset filter instansi.'}
            </p>
            {documents.length === 0 && (
              <button
                type="button"
                onClick={onCreateNew}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-900 text-white text-xs font-medium hover:bg-emerald-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Dokumen Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Dokumen &amp; Pegawai</th>
                  <th className="py-3 px-4">NIP</th>
                  <th className="py-3 px-4">Instansi</th>
                  <th className="py-3 px-4 text-right">Tanggungan</th>
                  <th className="py-3 px-4">Diperbarui</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredDocs.map((doc) => {
                  const childTotal = countChildren(doc.data);
                  const isCurrent = doc.id === activeDocId;
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {doc.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {doc.data.nama || 'Tanpa Nama'} · {doc.data.gol || '-'}
                          {isCurrent ? ' · Sedang dibuka' : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {doc.data.nip || '-'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                        {doc.data.instansi || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {doc.data.sp.length} Psgn · {childTotal} Anak
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(doc.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {confirmDeleteId === doc.id ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteDocument(doc);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 whitespace-nowrap"
                            >
                              Konfirmasi Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 rounded text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenDocument(doc)}
                              className="px-2.5 py-1.5 rounded-md text-xs font-medium text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 inline-flex items-center gap-1 whitespace-nowrap"
                              title="Buka di Editor"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>Buka</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDuplicateDocument(doc)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Duplikat Dokumen"
                              aria-label="Duplikat Dokumen"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDownloadPdf(doc)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Unduh PDF"
                              aria-label="Unduh PDF"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(doc.id)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Hapus Dokumen"
                              aria-label="Hapus Dokumen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
