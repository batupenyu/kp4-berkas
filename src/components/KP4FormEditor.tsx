import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  CHILD_NON_SALARY_FIELDS,
  CHILD_SALARY_FIELDS,
  ChildNonSalaryEntry,
  ChildSalaryEntry,
  EMPLOYEE_FIELDS,
  KP4Attachment,
  KP4Data,
  SIGNATURE_FIELDS,
  SPOUSE_FIELDS,
  SpouseEntry,
} from '../types/kp4';
import {
  combineTempatTanggalLahir,
  splitTempatTanggalLahir,
} from '../utils/dateUtils';
import { DatePickerInput } from './DatePickerInput';
import { SupportingFilesChecklist } from './SupportingFilesChecklist';

interface KP4FormEditorProps {
  data: KP4Data;
  docTitle: string;
  uid: string;
  docId: string;
  attachments: KP4Attachment[];
  onAttachmentsUpdated: (next: KP4Attachment[]) => Promise<void> | void;
  onNotify: (notice: { type: 'info' | 'error'; text: string }) => void;
  onTitleChange: (title: string) => void;
  onChange: (next: KP4Data) => void;
}

type SectionFilter = 'all' | 'pegawai' | 'pasangan' | 'anak' | 'ttd' | 'berkas';

export const KP4FormEditor: React.FC<KP4FormEditorProps> = ({
  data,
  docTitle,
  uid,
  docId,
  attachments,
  onAttachmentsUpdated,
  onNotify,
  onTitleChange,
  onChange,
}) => {
  const [activeSection, setActiveSection] = useState<SectionFilter>('all');

  const updateRootField = <K extends keyof KP4Data>(key: K, value: KP4Data[K]) => {
    onChange({ ...data, [key]: value });
  };

  const updateSpouse = (index: number, key: keyof SpouseEntry, value: string) => {
    const next = data.sp.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange({ ...data, sp: next });
  };

  const addSpouse = () => {
    onChange({
      ...data,
      sp: [...data.sp, { nama: '', lahir: '', kawin: '', kerja: '', hasil: '-', ket: '-' }],
    });
  };

  const removeSpouse = (index: number) => {
    onChange({
      ...data,
      sp: data.sp.filter((_, i) => i !== index),
    });
  };

  const updateChildSalary = (index: number, key: keyof ChildSalaryEntry, value: string) => {
    const next = data.a1.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange({ ...data, a1: next });
  };

  const addChildSalary = () => {
    onChange({
      ...data,
      a1: [
        ...data.a1,
        {
          nama: '',
          status: 'Ak',
          lahir: '',
          kawin: 'Belum',
          sekolah: '',
          beasiswa: 'Tidak',
          ayah: data.sp[0]?.nama || '',
          ibu: data.nama || '',
          cerai: '-',
          ket: '-',
        },
      ],
    });
  };

  const removeChildSalary = (index: number) => {
    onChange({
      ...data,
      a1: data.a1.filter((_, i) => i !== index),
    });
  };

  const updateChildNonSalary = (
    index: number,
    key: keyof ChildNonSalaryEntry,
    value: string
  ) => {
    const next = data.a2.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange({ ...data, a2: next });
  };

  const addChildNonSalary = () => {
    onChange({
      ...data,
      a2: [
        ...data.a2,
        {
          nama: '',
          status: 'Ak',
          lahir: '',
          kawin: 'Belum',
          sekolah: '',
          beasiswa: 'Tidak',
          bekerja: 'Tidak Bekerja',
          ket: '-',
        },
      ],
    });
  };

  const removeChildNonSalary = (index: number) => {
    onChange({
      ...data,
      a2: data.a2.filter((_, i) => i !== index),
    });
  };

  const sectionTabs: Array<{ id: SectionFilter; label: string }> = [
    { id: 'all', label: 'Semua' },
    { id: 'pegawai', label: 'Pegawai' },
    { id: 'pasangan', label: 'Pasangan' },
    { id: 'anak', label: 'Anak' },
    { id: 'ttd', label: 'Pengesahan' },
    { id: 'berkas', label: `Berkas (${attachments.length})` },
  ];

  const showSection = (sec: Exclude<SectionFilter, 'all'>) =>
    activeSection === 'all' || activeSection === sec;

  const inputCls =
    'mt-1 w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:focus:ring-emerald-500 transition-colors';

  const ttlParts = splitTempatTanggalLahir(data.ttl);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Label Arsip Dokumen
          <input
            type="text"
            value={docTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Contoh: KP4 Tahun 2026 — Maryani"
            className={inputCls}
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeSection === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {showSection('pegawai') && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-3">
            Data Pegawai
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EMPLOYEE_FIELDS.map((field) => {
              if (field.key === 'ttl') {
                return (
                  <div key="ttl" className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">
                      Tempat Lahir
                      <input
                        type="text"
                        value={ttlParts.tempat}
                        placeholder="Kota / Kabupaten"
                        onChange={(e) =>
                          updateRootField(
                            'ttl',
                            combineTempatTanggalLahir(e.target.value, ttlParts.tanggal)
                          )
                        }
                        className={inputCls}
                      />
                    </label>
                    <div className="block text-xs text-slate-600 dark:text-slate-400">
                      <span>Tanggal Lahir</span>
                      <DatePickerInput
                        value={ttlParts.tanggal}
                        onChange={(nextDate) =>
                          updateRootField(
                            'ttl',
                            combineTempatTanggalLahir(ttlParts.tempat, nextDate)
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>
                );
              }

              return (
                <label
                  key={field.key}
                  className={`block text-xs text-slate-600 dark:text-slate-400 ${
                    field.wide ? 'sm:col-span-2' : ''
                  }`}
                >
                  {field.label}
                  <input
                    type="text"
                    value={data[field.key]}
                    placeholder={field.placeholder}
                    onChange={(e) => updateRootField(field.key, e.target.value)}
                    className={`${inputCls} ${field.mono ? 'font-mono-tabular' : ''}`}
                  />
                </label>
              );
            })}
          </div>
        </section>
      )}

      {showSection('pasangan') && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Suami / Istri ({data.sp.length})
            </h2>
            <button
              type="button"
              onClick={addSpouse}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          {data.sp.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
              Belum ada data pasangan. Klik Tambah jika sudah menikah sah.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.sp.map((row, idx) => (
                <div key={idx} className={idx > 0 ? 'pt-4 mt-4' : ''}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Pasangan {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSpouse(idx)}
                      className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SPOUSE_FIELDS.map((f) =>
                      f.isDate ? (
                        <div
                          key={f.key}
                          className={`block text-xs text-slate-600 dark:text-slate-400 ${
                            f.wide ? 'sm:col-span-2' : ''
                          }`}
                        >
                          <span>{f.label}</span>
                          <DatePickerInput
                            value={row[f.key]}
                            onChange={(val) => updateSpouse(idx, f.key, val)}
                            className={inputCls}
                          />
                        </div>
                      ) : (
                        <label
                          key={f.key}
                          className={`block text-xs text-slate-600 dark:text-slate-400 ${
                            f.wide ? 'sm:col-span-2' : ''
                          }`}
                        >
                          {f.label}
                          <input
                            type="text"
                            value={row[f.key]}
                            onChange={(e) => updateSpouse(idx, f.key, e.target.value)}
                            className={inputCls}
                          />
                        </label>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {showSection('anak') && (
        <>
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Anak Masuk Daftar Gaji ({data.a1.length})
              </h2>
              <button
                type="button"
                onClick={addChildSalary}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </div>

            {data.a1.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                Belum ada anak tanggungan masuk daftar gaji.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.a1.map((row, idx) => (
                  <div key={idx} className={idx > 0 ? 'pt-4 mt-4' : ''}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Anak Daftar Gaji #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChildSalary(idx)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {CHILD_SALARY_FIELDS.map((f) =>
                        f.isDate ? (
                          <div
                            key={f.key}
                            className={`block text-xs text-slate-600 dark:text-slate-400 ${
                              f.wide ? 'sm:col-span-2' : ''
                            }`}
                          >
                            <span>{f.label}</span>
                            <DatePickerInput
                              value={row[f.key]}
                              allowDash={f.allowDash}
                              onChange={(val) => updateChildSalary(idx, f.key, val)}
                              className={inputCls}
                            />
                          </div>
                        ) : (
                          <label
                            key={f.key}
                            className={`block text-xs text-slate-600 dark:text-slate-400 ${
                              f.wide ? 'sm:col-span-2' : ''
                            }`}
                          >
                            {f.label}
                            <input
                              type="text"
                              value={row[f.key]}
                              onChange={(e) => updateChildSalary(idx, f.key, e.target.value)}
                              className={inputCls}
                            />
                          </label>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Anak Tidak Masuk Daftar Gaji ({data.a2.length})
              </h2>
              <button
                type="button"
                onClick={addChildNonSalary}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </div>

            {data.a2.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                Belum ada anak tanggungan di luar daftar gaji.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.a2.map((row, idx) => (
                  <div key={idx} className={idx > 0 ? 'pt-4 mt-4' : ''}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Anak Non-Gaji #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChildNonSalary(idx)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {CHILD_NON_SALARY_FIELDS.map((f) =>
                        f.isDate ? (
                          <div
                            key={f.key}
                            className={`block text-xs text-slate-600 dark:text-slate-400 ${
                              f.wide ? 'sm:col-span-2' : ''
                            }`}
                          >
                            <span>{f.label}</span>
                            <DatePickerInput
                              value={row[f.key]}
                              onChange={(val) => updateChildNonSalary(idx, f.key, val)}
                              className={inputCls}
                            />
                          </div>
                        ) : (
                          <label
                            key={f.key}
                            className={`block text-xs text-slate-600 dark:text-slate-400 ${
                              f.wide ? 'sm:col-span-2' : ''
                            }`}
                          >
                            {f.label}
                            <input
                              type="text"
                              value={row[f.key]}
                              onChange={(e) => updateChildNonSalary(idx, f.key, e.target.value)}
                              className={inputCls}
                            />
                          </label>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showSection('ttd') && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-3">
            Pejabat &amp; Tanda Tangan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SIGNATURE_FIELDS.map((field) =>
              field.isDate ? (
                <div
                  key={field.key}
                  className={`block text-xs text-slate-600 dark:text-slate-400 ${
                    field.wide ? 'sm:col-span-2' : ''
                  }`}
                >
                  <span>{field.label}</span>
                  <DatePickerInput
                    value={data[field.key]}
                    onChange={(val) => updateRootField(field.key, val)}
                    className={inputCls}
                  />
                </div>
              ) : (
                <label
                  key={field.key}
                  className={`block text-xs text-slate-600 dark:text-slate-400 ${
                    field.wide ? 'sm:col-span-2' : ''
                  }`}
                >
                  {field.label}
                  <input
                    type="text"
                    value={data[field.key]}
                    onChange={(e) => updateRootField(field.key, e.target.value)}
                    className={`${inputCls} ${field.mono ? 'font-mono-tabular' : ''}`}
                  />
                </label>
              )
            )}
          </div>
        </section>
      )}

      {showSection('berkas') && (
        <SupportingFilesChecklist
          compact
          data={data}
          uid={uid}
          docId={docId}
          attachments={attachments}
          onAttachmentsUpdated={onAttachmentsUpdated}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};
