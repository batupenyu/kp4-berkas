import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, ArrowRight, FileText } from 'lucide-react';
import { AuthUser } from '../types/kp4';
import {
  isUsingFirebase,
  loginAsDemoUser,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  setLocalModeOverride,
} from '../services/firebaseService';

interface AuthScreenProps {
  onSuccess: (user: AuthUser) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  isDark,
  onToggleTheme,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user =
        mode === 'login'
          ? await loginWithEmail(email, password)
          : await registerWithEmail(displayName, email, password);
      onSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginAsDemoUser();
      onSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal masuk dengan akun demo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      onSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal masuk dengan Google.');
    } finally {
      setLoading(false);
    }
  };

  const [localFallbackActive, setLocalFallbackActive] = useState(false);
  const firebaseActive = isUsingFirebase() && !localFallbackActive;

  const handleSwitchToLocal = () => {
    setLocalModeOverride(true);
    setLocalFallbackActive(true);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between gap-8">
        <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
          Generator KP4
        </span>
        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            {isDark ? 'Mode Terang' : 'Mode Gelap'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <section className="lg:col-span-6 flex flex-col justify-between py-4 pr-0 lg:pr-6">
            <div>
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400 tracking-wide mb-3">
                Administrasi Kepegawaian · Surat Keterangan Tunjangan Keluarga
              </p>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance] mb-4">
                Penyusunan Formulir KP4 yang Terstruktur dan Tersimpan Aman
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                Kelola data kepegawaian, pasangan sah, dan daftar anak tanggungan dalam satu ruang
                kerja. Setiap akun memiliki arsip terisolasi dengan pratinjau cetak A4 resmi serta
                ekspor langsung ke PDF dan Word (.docx).
              </p>

              <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-800 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Isolasi Data per Akun
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Riwayat KP4 disimpan per UID pengguna sehingga NIP, penghasilan pasangan, dan
                      data keluarga terlindungi dengan aturan akses pemilik.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-emerald-800 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Format Resmi 2 Halaman (Potret &amp; Lanskap)
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Halaman 1 memuat biodata pegawai dan pernyataan tunjangan; Halaman 2 otomatis
                      disusun lanskap untuk tabel rincian anak daftar gaji dan non-gaji.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Mode Penyimpanan:{' '}
                {firebaseActive ? 'Firebase Authentication & Firestore' : 'Brankas Lokal Terenkripsi (Siap Firebase)'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Ekspor PDF &amp; DOCX Luring</span>
            </div>
          </section>

          <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Daftar Akun
              </button>
            </div>

            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {mode === 'login' ? 'Masuk ke Ruang Kerja KP4' : 'Buat Akun Pegawai Baru'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Masukkan email dan kata sandi untuk mengakses arsip KP4 Anda.'
                  : 'Daftarkan akun untuk menyimpan beberapa versi formulir KP4 dengan aman.'}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 px-3.5 py-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 space-y-2"
              >
                <div>{error}</div>
                {firebaseActive && (
                  <button
                    type="button"
                    onClick={handleSwitchToLocal}
                    className="inline-flex items-center gap-1 font-semibold underline hover:opacity-80"
                  >
                    Beralih ke Mode Lokal (Brankas Aman) sekarang
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Nama Lengkap Pegawai
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Maryani, S.Pd"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:focus:ring-emerald-500"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Alamat Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@instansi.go.id"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-3 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-900 hover:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Memproses...'
                    : mode === 'login'
                      ? 'Masuk ke Workspace'
                      : 'Daftar & Buka Workspace'}
                </span>
              </button>

              {firebaseActive && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>Masuk dengan Akun Google</span>
                </button>
              )}
            </form>

            {mode === 'login' && (
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {firebaseActive ? 'Mode Demo Lokal (Cadangan)' : 'Akses Cepat Akun Contoh'}
                    </div>
                    <div className="font-mono-tabular mt-0.5">
                      maryani@smkn1koba.sch.id · kp4demo123
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleDemoLogin}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-900 dark:text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <span>Masuk Demo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
