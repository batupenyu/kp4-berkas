import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  CheckSquare,
  Download,
  Eye,
  FileArchive,
  FileCheck2,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  AttachmentCategory,
  KP4Attachment,
  KP4Data,
} from '../types/kp4';
import {
  deleteKP4Attachment,
  getKP4AttachmentBlob,
  uploadKP4Attachment,
} from '../services/firebaseService';
import { triggerBlobDownload } from '../utils/exportKp4';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface SupportingFilesChecklistProps {
  data: KP4Data;
  uid: string;
  docId: string;
  attachments: KP4Attachment[];
  onAttachmentsUpdated: (next: KP4Attachment[]) => Promise<void> | void;
  onNotify: (notice: { type: 'info' | 'error'; text: string }) => void;
  compact?: boolean;
}

interface ChecklistDefinition {
  category: AttachmentCategory;
  folderName: string;
  label: string;
  required: boolean;
  note: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export const SupportingFilesChecklist: React.FC<SupportingFilesChecklistProps> = ({
  data,
  uid,
  docId,
  attachments,
  onAttachmentsUpdated,
  onNotify,
  compact = false,
}) => {
  const activeSpouses = data.sp.filter((s) => s.nama.trim() !== '' && s.nama.trim() !== '-');
  const salaryChildren = data.a1.filter((a) => a.nama.trim() !== '' && a.nama.trim() !== '-');
  const nonSalaryChildren = data.a2.filter((a) => a.nama.trim() !== '' && a.nama.trim() !== '-');

  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory>('kartu_keluarga');
  const [uploadingCategory, setUploadingCategory] = useState<AttachmentCategory | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<AttachmentCategory | 'main' | null>(null);
  const [zipping, setZipping] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    attachment: KP4Attachment;
    blob: Blob;
    isPdf: boolean;
    imageDataUrl?: string;
  } | null>(null);

  const mainInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRefs = useRef<Partial<Record<AttachmentCategory, HTMLInputElement | null>>>({});

  const checklist: ChecklistDefinition[] = [
    {
      category: 'kartu_keluarga',
      folderName: '01_Kartu_Keluarga',
      label: 'Fotokopi Kartu Keluarga (KK) terbaru',
      required: true,
      note: 'Wajib dilampirkan sebagai bukti susunan keluarga',
    },
    {
      category: 'buku_nikah',
      folderName: '02_Buku_Nikah',
      label: 'Fotokopi Buku Nikah / Akta Perkawinan sah',
      required: activeSpouses.length > 0,
      note:
        activeSpouses.length > 0
          ? `Tercatat ${activeSpouses.length} pasangan`
          : 'Opsional jika belum menikah',
    },
    {
      category: 'akta_kelahiran',
      folderName: '03_Akta_Kelahiran',
      label: 'Fotokopi Akta Kelahiran Anak yang masuk daftar tanggungan',
      required: salaryChildren.length + nonSalaryChildren.length > 0,
      note: `${salaryChildren.length} masuk daftar gaji · ${nonSalaryChildren.length} non-gaji`,
    },
    {
      category: 'surat_kuliah',
      folderName: '04_Surat_Keterangan_Kuliah',
      label: 'Surat Keterangan Masih Kuliah / Sekolah (untuk anak berusia 21–25 tahun)',
      required: salaryChildren.some(
        (c) =>
          c.sekolah.toLowerCase().includes('universitas') ||
          c.sekolah.toLowerCase().includes('institut')
      ),
      note: 'Wajib dilampirkan jika anak berstatus mahasiswa',
    },
    {
      category: 'putusan_pengadilan',
      folderName: '05_Putusan_Pengadilan_Akta_Cerai',
      label: 'Salinan Putusan Pengadilan Negeri / Akta Cerai / Kematian (jika relevan)',
      required: salaryChildren.some((c) => c.cerai.trim() !== '' && c.cerai.trim() !== '-'),
      note: 'Sesuai catatan A & B pada lembar ke-2 KP4',
    },
  ];

  const handleFilesSelected = async (category: AttachmentCategory, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setUploadingCategory(category);
    try {
      const uploaded: KP4Attachment[] = [];
      for (const file of files) {
        const item = await uploadKP4Attachment(uid, docId, category, file);
        uploaded.push(item);
      }
      const next = [...attachments, ...uploaded];
      await onAttachmentsUpdated(next);
      onNotify({
        type: 'info',
        text: `${uploaded.length} berkas berhasil diunggah ke kategori terpilih.`,
      });
    } catch (err: unknown) {
      onNotify({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengunggah berkas pendukung.',
      });
    } finally {
      setUploadingCategory(null);
      const inputEl = fileInputRefs.current[category];
      if (inputEl) inputEl.value = '';
      if (mainInputRef.current) mainInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachment: KP4Attachment) => {
    try {
      await deleteKP4Attachment(uid, docId, attachment);
      const next = attachments.filter((a) => a.id !== attachment.id);
      await onAttachmentsUpdated(next);
      onNotify({
        type: 'info',
        text: `Berkas "${attachment.fileName}" dihapus.`,
      });
    } catch {
      onNotify({ type: 'error', text: 'Gagal menghapus berkas.' });
    }
  };

  const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Gagal membaca data gambar untuk pratinjau.'));
      reader.readAsDataURL(blob);
    });

  const handlePreviewAttachment = async (attachment: KP4Attachment) => {
    setPreviewLoadingId(attachment.id);
    try {
      const blob = await getKP4AttachmentBlob(uid, docId, attachment);
      const isPdf =
        attachment.mimeType === 'application/pdf' ||
        attachment.fileName.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        setPreviewFile({ attachment, blob, isPdf: true });
      } else {
        const imageDataUrl = await readBlobAsDataUrl(blob);
        setPreviewFile({ attachment, blob, isPdf: false, imageDataUrl });
      }
    } catch (err: unknown) {
      onNotify({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membuka pratinjau berkas.',
      });
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const handleDownloadSingle = async (attachment: KP4Attachment) => {
    try {
      const blob = await getKP4AttachmentBlob(uid, docId, attachment);
      triggerBlobDownload(attachment.fileName, blob);
    } catch (err: unknown) {
      onNotify({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengunduh berkas.',
      });
    }
  };

  const handleDownloadAllZip = async () => {
    if (attachments.length === 0) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const att of attachments) {
        const meta = checklist.find((c) => c.category === att.category);
        const folder = meta?.folderName || 'Lampiran';
        const blob = await getKP4AttachmentBlob(uid, docId, att);
        zip.file(`${folder}/${att.fileName}`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const cleanName = (data.nama || 'Pegawai').trim().replace(/[^\w]+/g, '_');
      triggerBlobDownload(`Berkas_Pendukung_KP4_${cleanName}.zip`, zipBlob);
      onNotify({ type: 'info', text: 'Arsip ZIP berkas pendukung mulai diunduh.' });
    } catch {
      onNotify({ type: 'error', text: 'Gagal mengompres berkas pendukung ke ZIP.' });
    } finally {
      setZipping(false);
    }
  };

  const categoriesWithFiles = new Set(attachments.map((a) => a.category)).size;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Daftar Periksa Berkas Pendukung KP4
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono-tabular">
            {categoriesWithFiles} / {checklist.length} kategori terlampir · {attachments.length}{' '}
            berkas · PDF, JPG, PNG, WEBP (maks. 10 MB)
          </p>
        </div>

        {attachments.length > 0 && (
          <button
            type="button"
            onClick={handleDownloadAllZip}
            disabled={zipping}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>{zipping ? 'Mengompres...' : 'Unduh Semua (.zip)'}</span>
          </button>
        )}
      </div>

      {/* Ruang Drop & Unggah Utama yang Jelas Terlihat */}
      <div className="mb-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label
            htmlFor={compact ? 'kp4-upload-cat-compact' : 'kp4-upload-cat-full'}
            className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
          >
            Kategori Berkas:
          </label>
          <select
            id={compact ? 'kp4-upload-cat-compact' : 'kp4-upload-cat-full'}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as AttachmentCategory)}
            className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
          >
            {checklist.map((item) => (
              <option key={item.category} value={item.category}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <input
          ref={mainInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
          onChange={(e) => handleFilesSelected(selectedCategory, e.target.files)}
          className="hidden"
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => mainInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              mainInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverCategory('main');
          }}
          onDragLeave={() => setDragOverCategory(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverCategory(null);
            handleFilesSelected(selectedCategory, e.dataTransfer.files);
          }}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
            dragOverCategory === 'main'
              ? 'border-emerald-700 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/50 hover:border-emerald-700 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
          }`}
        >
          <Upload className="w-5 h-5 mx-auto text-emerald-800 dark:text-emerald-400 mb-2" />
          <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100">
            {uploadingCategory === selectedCategory
              ? 'Sedang mengunggah berkas...'
              : 'Seret dan lepas file di sini, atau klik untuk memilih berkas'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Mendukung PDF, JPG, PNG, WEBP · Maksimal 10 MB per berkas
          </p>
        </div>
      </div>

      {/* Daftar Periksa per Kategori dengan Dropzone per Baris */}
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {checklist.map((item) => {
          const catFiles = attachments.filter((a) => a.category === item.category);
          const isUploading = uploadingCategory === item.category;
          const isDragOver = dragOverCategory === item.category;

          return (
            <div
              key={item.category}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCategory(item.category);
              }}
              onDragLeave={() => setDragOverCategory(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCategory(null);
                handleFilesSelected(item.category, e.dataTransfer.files);
              }}
              className={`py-3.5 px-2 -mx-2 rounded-lg transition-colors ${
                isDragOver ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  <CheckSquare
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      catFiles.length > 0 || item.required
                        ? 'text-emerald-800 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  />
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.note} ·{' '}
                      <span
                        className={
                          catFiles.length > 0
                            ? 'text-emerald-800 dark:text-emerald-400 font-medium'
                            : ''
                        }
                      >
                        {catFiles.length > 0
                          ? `${catFiles.length} berkas terunggah`
                          : item.required
                            ? 'Perlu Dilampirkan'
                            : 'Kondisional'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0">
                  <input
                    ref={(el) => {
                      fileInputRefs.current[item.category] = el;
                    }}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                    onChange={(e) => handleFilesSelected(item.category, e.target.files)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRefs.current[item.category]?.click()}
                    className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-emerald-700 dark:hover:border-emerald-500 text-xs font-medium text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" />
                    <span>{isUploading ? 'Mengunggah...' : 'Unggah / Drop'}</span>
                  </button>
                </div>
              </div>

              {catFiles.length > 0 && (
                <div className="mt-2.5 pl-6 space-y-1.5">
                  {catFiles.map((att) => (
                    <div
                      key={att.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                            {att.fileName}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                            {formatBytes(att.sizeBytes)} · Diunggah {formatUploadDate(att.uploadedAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePreviewAttachment(att)}
                          disabled={previewLoadingId === att.id}
                          className="px-2 py-1 rounded text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 inline-flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
                        >
                          {previewLoadingId === att.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          <span>Lihat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(att)}
                          className="px-2 py-1 rounded text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att)}
                          aria-label={`Hapus ${att.fileName}`}
                          className="p-1 rounded text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div
            className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {previewFile.attachment.fileName}
                </div>
                <div className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                  {formatBytes(previewFile.attachment.sizeBytes)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    triggerBlobDownload(previewFile.attachment.fileName, previewFile.blob)
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  aria-label="Tutup pratinjau"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-auto flex items-center justify-center p-4 min-h-[360px]">
              {previewFile.isPdf ? (
                <PdfCanvasViewer blob={previewFile.blob} />
              ) : (
                <img
                  src={previewFile.imageDataUrl}
                  alt={previewFile.attachment.fileName}
                  className="max-w-full max-h-[72vh] object-contain rounded shadow-sm bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
