export interface SpouseEntry {
  nama: string;
  lahir: string;
  kawin: string;
  kerja: string;
  hasil: string;
  ket: string;
}

export interface ChildSalaryEntry {
  nama: string;
  status: string;
  lahir: string;
  kawin: string;
  sekolah: string;
  beasiswa: string;
  ayah: string;
  ibu: string;
  cerai: string;
  ket: string;
}

export interface ChildNonSalaryEntry {
  nama: string;
  status: string;
  lahir: string;
  kawin: string;
  sekolah: string;
  beasiswa: string;
  bekerja: string;
  ket: string;
}

export interface KP4Data {
  nama: string;
  nip: string;
  ttl: string;
  jk: string;
  agama: string;
  kebangsaan: string;
  gol: string;
  jabatan: string;
  instansi: string;
  masa: string;
  gaji: string;
  alamat: string;
  kerja: string;
  hasil: string;
  pensiun: string;
  jumlah: string;
  tempat: string;
  tanggal: string;
  jabK: string;
  kepsek: string;
  nipK: string;
  sp: SpouseEntry[];
  a1: ChildSalaryEntry[];
  a2: ChildNonSalaryEntry[];
}

export type AttachmentCategory =
  | 'kartu_keluarga'
  | 'buku_nikah'
  | 'akta_kelahiran'
  | 'surat_kuliah'
  | 'putusan_pengadilan';

export interface KP4Attachment {
  id: string;
  category: AttachmentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  storagePath?: string;
  storageUrl?: string;
}

export interface KP4DocumentRecord {
  id: string;
  title: string;
  data: KP4Data;
  attachments?: KP4Attachment[];
  createdAt: string;
  updatedAt: string;
  ownerUid: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  provider: 'firebase' | 'local';
}

export type KP4Block =
  | { t: 'c'; x: string }
  | { t: 'kv'; k: string; v: string }
  | { t: 'p'; x: string; b?: boolean }
  | { t: 'li'; n: string; x: string; l?: boolean }
  | { t: 'amt'; n: string; k: string; v: string }
  | { t: 'tbl'; sm?: boolean; h: string[]; w: number[]; r: string[][] }
  | { t: 'sign'; l: string[]; r: string[] }
  | { t: 'pg' };

export const DEFAULT_KP4_DATA: KP4Data = {
  nama: 'Maryani',
  nip: '197605072024212008',
  ttl: 'Terentang III / 7 Mei 1976',
  jk: 'Perempuan',
  agama: 'Islam',
  kebangsaan: 'Indonesia',
  gol: 'IX / PPPK',
  jabatan: 'Guru Pertama',
  instansi: 'SMKN 1 KOBA',
  masa: '2 Tahun 8 bulan',
  gaji: 'Perpres Nomor 11 Tahun 2024 (PPPK)',
  alamat: 'Jln. Masjid Dalam RT 6 Kelurahan Berok Kecamatan Koba Kabupaten Bangka Tengah',
  kerja: '-',
  hasil: '-',
  pensiun: '-',
  jumlah: '',
  tempat: 'Koba-Bangka Tengah',
  tanggal: '18 November 2026',
  jabK: 'Kepala Sekolah',
  kepsek: 'Syahryanto, ST.M.Pd',
  nipK: '197708262006041005',
  sp: [
    {
      nama: 'Muslim',
      lahir: '20 Agustus 1979',
      kawin: '12 Desember 2004',
      kerja: 'Petani',
      hasil: '3.000.000',
      ket: '-',
    },
  ],
  a1: [
    {
      nama: 'Humaira Yasmin',
      status: 'Ak',
      lahir: '7 November 2005',
      kawin: 'Belum',
      sekolah: 'Universitas Bangka Belitung',
      beasiswa: 'Tidak',
      ayah: 'Muslim',
      ibu: 'Maryani',
      cerai: '-',
      ket: '-',
    },
    {
      nama: 'Mahira Hasna Kamila',
      status: 'Ak',
      lahir: '8 Juli 2010',
      kawin: 'Belum',
      sekolah: 'SMA IT Sahabat Quran Bangka Tengah',
      beasiswa: 'Tidak',
      ayah: 'Muslim',
      ibu: 'Maryani',
      cerai: '-',
      ket: '-',
    },
  ],
  a2: [
    {
      nama: 'Hana Khairunnisa',
      status: 'Ak',
      lahir: '20 Desember 2013',
      kawin: 'Belum',
      sekolah: 'SMPN 1 Koba',
      beasiswa: 'Tidak',
      bekerja: 'Tidak Bekerja',
      ket: '-',
    },
  ],
};

export const EMPTY_KP4_DATA: KP4Data = {
  nama: '',
  nip: '',
  ttl: '',
  jk: '',
  agama: 'Islam',
  kebangsaan: 'Indonesia',
  gol: '',
  jabatan: '',
  instansi: '',
  masa: '',
  gaji: '',
  alamat: '',
  kerja: '-',
  hasil: '-',
  pensiun: '-',
  jumlah: '',
  tempat: '',
  tanggal: '',
  jabK: 'Kepala Sekolah',
  kepsek: '',
  nipK: '',
  sp: [
    {
      nama: '',
      lahir: '',
      kawin: '',
      kerja: '',
      hasil: '-',
      ket: '-',
    },
  ],
  a1: [],
  a2: [],
};

export type EmployeeFieldKey = keyof Pick<
  KP4Data,
  | 'nama'
  | 'nip'
  | 'ttl'
  | 'jk'
  | 'agama'
  | 'kebangsaan'
  | 'gol'
  | 'jabatan'
  | 'instansi'
  | 'masa'
  | 'gaji'
  | 'alamat'
  | 'kerja'
  | 'hasil'
  | 'pensiun'
  | 'jumlah'
>;

export type SignatureFieldKey = keyof Pick<
  KP4Data,
  'tempat' | 'tanggal' | 'jabK' | 'kepsek' | 'nipK'
>;

export const EMPLOYEE_FIELDS: ReadonlyArray<{
  key: EmployeeFieldKey;
  label: string;
  wide?: boolean;
  mono?: boolean;
  placeholder?: string;
}> = [
  { key: 'nama', label: 'Nama Lengkap', placeholder: 'Nama pegawai beserta gelar' },
  { key: 'nip', label: 'NIP', mono: true, placeholder: '18 digit NIP' },
  { key: 'ttl', label: 'Tempat / Tanggal Lahir', wide: true, placeholder: 'Kota / DD Bulan YYYY' },
  { key: 'jk', label: 'Jenis Kelamin', placeholder: 'Laki-laki / Perempuan' },
  { key: 'agama', label: 'Agama', placeholder: 'Islam / Kristen / Katolik / Hindu / Buddha' },
  { key: 'kebangsaan', label: 'Kebangsaan', placeholder: 'Indonesia' },
  { key: 'gol', label: 'Golongan / Status', placeholder: 'IX / PPPK atau III/a' },
  { key: 'jabatan', label: 'Jabatan', placeholder: 'Jabatan fungsional / struktural' },
  { key: 'instansi', label: 'Instansi', placeholder: 'Nama unit kerja / sekolah' },
  { key: 'masa', label: 'Masa Kerja Golongan', placeholder: 'Contoh: 2 Tahun 8 bulan' },
  { key: 'gaji', label: 'Digaji menurut', wide: true, placeholder: 'Dasar peraturan gaji' },
  { key: 'alamat', label: 'Alamat / Tempat Tinggal', wide: true, placeholder: 'Alamat domisili lengkap' },
  { key: 'kerja', label: 'Pekerjaan lain', placeholder: '- jika tidak ada' },
  { key: 'hasil', label: 'Penghasilan lain (Rp)', mono: true, placeholder: '- jika tidak ada' },
  { key: 'pensiun', label: 'Pensiun / Pensiun Janda (Rp)', wide: true, mono: true, placeholder: '- jika tidak ada' },
  { key: 'jumlah', label: 'Jumlah anak (kosong = otomatis)', wide: true, mono: true, placeholder: 'Kosongkan untuk hitung otomatis' },
];

export const SIGNATURE_FIELDS: ReadonlyArray<{
  key: SignatureFieldKey;
  label: string;
  wide?: boolean;
  mono?: boolean;
  isDate?: boolean;
}> = [
  { key: 'tempat', label: 'Tempat Penandatanganan' },
  { key: 'tanggal', label: 'Tanggal Surat', isDate: true },
  { key: 'jabK', label: 'Jabatan Atasan' },
  { key: 'kepsek', label: 'Nama Atasan' },
  { key: 'nipK', label: 'NIP Atasan', wide: true, mono: true },
];

export const SPOUSE_FIELDS: ReadonlyArray<{
  key: keyof SpouseEntry;
  label: string;
  wide?: boolean;
  isDate?: boolean;
}> = [
  { key: 'nama', label: 'Nama Istri / Suami', wide: true },
  { key: 'lahir', label: 'Tgl Lahir', isDate: true },
  { key: 'kawin', label: 'Tgl Perkawinan', isDate: true },
  { key: 'kerja', label: 'Pekerjaan' },
  { key: 'hasil', label: 'Penghasilan Sebulan (Rp)' },
  { key: 'ket', label: 'Keterangan' },
];

export const CHILD_SALARY_FIELDS: ReadonlyArray<{
  key: keyof ChildSalaryEntry;
  label: string;
  wide?: boolean;
  isDate?: boolean;
  allowDash?: boolean;
}> = [
  { key: 'nama', label: 'Nama Lengkap Anak', wide: true },
  { key: 'status', label: 'Status (Ak/At/Aa)' },
  { key: 'lahir', label: 'Tgl Lahir', isDate: true },
  { key: 'kawin', label: 'Belum pernah kawin' },
  { key: 'sekolah', label: 'Sekolah / Kuliah pada', wide: true },
  { key: 'beasiswa', label: 'Mendapat Beasiswa' },
  { key: 'ayah', label: 'Nama Ayah' },
  { key: 'ibu', label: 'Nama Ibu' },
  { key: 'cerai', label: 'Tgl Meninggal / Cerai', isDate: true, allowDash: true },
  { key: 'ket', label: 'Ket.' },
];

export const CHILD_NON_SALARY_FIELDS: ReadonlyArray<{
  key: keyof ChildNonSalaryEntry;
  label: string;
  wide?: boolean;
  isDate?: boolean;
}> = [
  { key: 'nama', label: 'Nama Lengkap Anak', wide: true },
  { key: 'status', label: 'Status (Ak/At/Aa)' },
  { key: 'lahir', label: 'Tgl Lahir', isDate: true },
  { key: 'kawin', label: 'Belum pernah kawin' },
  { key: 'sekolah', label: 'Sekolah / Kuliah pada', wide: true },
  { key: 'beasiswa', label: 'Mendapat Beasiswa' },
  { key: 'bekerja', label: 'Bekerja / Tidak Bekerja' },
  { key: 'ket', label: 'Ket.' },
];

export function dashIfEmpty(v: unknown): string {
  return v == null || String(v).trim() === '' ? '-' : String(v);
}

export function countChildren(data: KP4Data): number {
  return [...data.a1, ...data.a2].filter(
    (a) => a.nama && a.nama.trim() !== '' && a.nama.trim() !== '-'
  ).length;
}

export function buildKP4Blocks(s: KP4Data): KP4Block[] {
  const autoCount = countChildren(s);
  const blocks: KP4Block[] = [
    { t: 'c', x: 'SURAT KETERANGAN' },
    { t: 'c', x: 'UNTUK MENDAPATKAN PEMBAYARAN TUNJANGAN KELUARGA' },
    { t: 'kv', k: '1. Nama Lengkap', v: `${s.nama} NIP. ${s.nip}` },
    { t: 'kv', k: '2. Tempat / Tanggal Lahir', v: s.ttl },
    { t: 'kv', k: '3. Jenis Kelamin', v: s.jk },
    { t: 'kv', k: '4. Agama', v: s.agama },
    { t: 'kv', k: '5. Kebangsaan', v: s.kebangsaan },
    { t: 'kv', k: '6. Golongan / Status Kepegawaian', v: s.gol },
    { t: 'kv', k: '7. Jabatan Struktural/Fungsional', v: s.jabatan },
    { t: 'kv', k: '8. Pada Instansi, Dept. Lembaga', v: s.instansi },
    { t: 'kv', k: '9. Masa Kerja Golongan', v: s.masa },
    { t: 'kv', k: '10. Digaji menurut', v: s.gaji },
    { t: 'kv', k: 'Alamat / Tempat Tinggal', v: s.alamat },
    { t: 'p', x: 'Menerangkan dengan sesungguhnya bahwa saya :', b: true },
    {
      t: 'li',
      n: '1.',
      x: `Disamping Jabatan Utama tersebut, bekerja pula sebagai : ${dashIfEmpty(s.kerja)}`,
    },
    {
      t: 'amt',
      n: '',
      k: 'dengan mendapat penghasilan sebesar',
      v: `Rp ${dashIfEmpty(s.hasil)} sebulan`,
    },
    {
      t: 'amt',
      n: '2.',
      k: 'Mempunyai Pensiun / Pensiun Janda',
      v: `Rp ${dashIfEmpty(s.pensiun)} sebulan`,
    },
    { t: 'li', n: '3.', x: 'Kawin sah dengan :' },
    {
      t: 'tbl',
      h: [
        'No',
        'Nama Istri / Suami',
        'Tgl Lahir',
        'Tgl Perkawinan',
        'Pekerjaan',
        'Penghasilan Sebulan',
        'Keterangan',
      ],
      w: [1, 4, 3, 3, 3, 3, 2],
      r: s.sp.map((r, i) =>
        [String(i + 1), r.nama, r.lahir, r.kawin, r.kerja, r.hasil, r.ket].map(dashIfEmpty)
      ),
    },
    {
      t: 'li',
      n: '1.',
      x: 'Mempunyai anak – anak seperti dalam daftar sebelah ini, yaitu :',
    },
    {
      t: 'li',
      l: true,
      n: 'I.',
      x: 'Anak Kandung (Ak), Anak Tiri (At) yang masih menjadi tanggungan, belum mempunyai pekerjaan sendiri dan masuk dalam daftar gaji.',
    },
    {
      t: 'li',
      l: true,
      n: 'II.',
      x: 'Anak Kandung (Ak), Anak Tiri (At), Anak Angkat (Aa) yang masih menjadi tanggungan, tetapi tidak termasuk dalam daftar gaji.',
    },
    {
      t: 'li',
      n: '2.',
      x: `Jumlah anak seluruh ( ${s.jumlah.trim() ? s.jumlah : autoCount} Orang ) yang menjadi tanggungan termasuk yang tidak termasuk dalam daftar gaji.`,
    },
    {
      t: 'p',
      x: 'Keterangan ini saya buat dengan sesungguhnya dan apabila keterangan ini ternyata tidak benar / palsu, saya bersedia dituntut dimuka Pengadilan berdasarkan undang-undang yang berlaku, dan bersedia mengembalikan semua uang tunjangan anak yang telah saya terima yang seharusnya bukan menjadi hak saya.',
    },
    {
      t: 'sign',
      l: ['Mengetahui:', s.jabK, '', '', '', s.kepsek, `NIP. ${s.nipK}`],
      r: [`${s.tempat}, ${s.tanggal}`, 'Yang Menerangkan,', '', '', '', s.nama, `NIP. ${s.nip}`],
    },
    { t: 'pg' },
    {
      t: 'p',
      x: 'I. Anak Kandung (Ak), Anak Tiri (At) dan Anak Angkat (Aa) yang masih menjadi tanggungan, belum mempunyai penghasilan sendiri dan masuk daftar gaji',
      b: true,
    },
    {
      t: 'tbl',
      sm: true,
      h: [
        'No',
        'Nama',
        'Status (Ak/At/Aa)',
        'Tanggal Lahir',
        'Belum Pernah Kawin',
        'Bersekolah/ Kuliah pada',
        'Tidak mendapat Beasiswa',
        'Nama Ayah',
        'Nama Ibu',
        'Tgl Meninggal/ Diceraikan',
        'Ket.',
      ],
      w: [1, 4, 1.6, 2.6, 2, 4, 2, 2.6, 2.6, 2.6, 1.4],
      r: s.a1.map((r, i) =>
        [
          String(i + 1),
          r.nama,
          r.status,
          r.lahir,
          r.kawin,
          r.sekolah,
          r.beasiswa,
          r.ayah,
          r.ibu,
          r.cerai,
          r.ket,
        ].map(dashIfEmpty)
      ),
    },
    {
      t: 'p',
      x: 'II. Anak Kandung (Ak), Anak Tiri (At) dan Anak Angkat (Aa) yang masih tanggungan, tetapi tidak masuk dalam daftar gaji',
      b: true,
    },
    {
      t: 'tbl',
      sm: true,
      h: [
        'No',
        'Nama',
        'Status (Ak/At/Aa)',
        'Tanggal Lahir',
        'Belum Pernah Kawin',
        'Bersekolah/ Kuliah pada',
        'Tidak mendapat Beasiswa',
        'Bekerja / Tidak Bekerja',
        'Ket.',
      ],
      w: [1, 4, 1.6, 2.6, 2, 4, 2, 2.4, 1.4],
      r: s.a2.map((r, i) =>
        [
          String(i + 1),
          r.nama,
          r.status,
          r.lahir,
          r.kawin,
          r.sekolah,
          r.beasiswa,
          r.bekerja,
          r.ket,
        ].map(dashIfEmpty)
      ),
    },
    {
      t: 'p',
      x: 'A. Supaya dilampirkan salinan Surat Keputusan Pengadilan Negeri yang disahkan.',
    },
    {
      t: 'p',
      x: 'B. Supaya diisi jika anak dilahirkan dari istri/suami yang telah meninggal dunia atau diceraikan.',
    },
  ];
  return blocks;
}
