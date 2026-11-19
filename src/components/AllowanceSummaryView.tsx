import React from 'react';
import { countChildren, KP4Attachment, KP4Data } from '../types/kp4';
import { SupportingFilesChecklist } from './SupportingFilesChecklist';

interface AllowanceSummaryViewProps {
  data: KP4Data;
  uid: string;
  docId: string;
  attachments: KP4Attachment[];
  onAttachmentsUpdated: (next: KP4Attachment[]) => Promise<void> | void;
  onNotify: (notice: { type: 'info' | 'error'; text: string }) => void;
  onBackToEditor: () => void;
}

export const AllowanceSummaryView: React.FC<AllowanceSummaryViewProps> = ({
  data,
  uid,
  docId,
  attachments,
  onAttachmentsUpdated,
  onNotify,
  onBackToEditor,
}) => {
  const totalChildren = countChildren(data);
  const effectiveChildren = data.jumlah.trim() ? data.jumlah : String(totalChildren);
  const activeSpouses = data.sp.filter((s) => s.nama.trim() !== '' && s.nama.trim() !== '-');
  const salaryChildren = data.a1.filter((a) => a.nama.trim() !== '' && a.nama.trim() !== '-');
  const nonSalaryChildren = data.a2.filter((a) => a.nama.trim() !== '' && a.nama.trim() !== '-');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Ringkasan Tunjangan Keluarga
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Ikhtisar data tanggungan dan pengunggahan berkas lampiran berdasarkan dokumen KP4 yang
            sedang aktif.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToEditor}
          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-800 dark:text-slate-100 transition-colors whitespace-nowrap shrink-0"
        >
          Kembali ke Editor
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Pegawai Pemohon</div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mt-1 truncate">
            {data.nama || '-'}
          </div>
          <div className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400 mt-1">
            NIP {data.nip || '-'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Pasangan Sah</div>
          <div className="text-2xl font-semibold font-mono-tabular text-slate-900 dark:text-white mt-1">
            {activeSpouses.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {activeSpouses[0]?.nama || 'Tidak ada data'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Anak Masuk Daftar Gaji</div>
          <div className="text-2xl font-semibold font-mono-tabular text-emerald-800 dark:text-emerald-400 mt-1">
            {salaryChildren.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Lampiran Bagian I KP4
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Anak Tanggungan</div>
          <div className="text-2xl font-semibold font-mono-tabular text-slate-900 dark:text-white mt-1">
            {effectiveChildren}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {nonSalaryChildren.length} non-daftar gaji (Bagian II)
          </div>
        </div>
      </div>

      <SupportingFilesChecklist
        data={data}
        uid={uid}
        docId={docId}
        attachments={attachments}
        onAttachmentsUpdated={onAttachmentsUpdated}
        onNotify={onNotify}
      />
    </div>
  );
};
