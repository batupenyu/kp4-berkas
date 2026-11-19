import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  FirebaseStorage,
} from 'firebase/storage';
import {
  AttachmentCategory,
  AuthUser,
  DEFAULT_KP4_DATA,
  KP4Attachment,
  KP4Data,
  KP4DocumentRecord,
} from '../types/kp4';

function cleanEnvValue(val?: string): string | undefined {
  if (!val) return undefined;
  const cleaned = val.trim().replace(/^["']|["']$/g, '').trim();
  return cleaned || undefined;
}

const firebaseConfig = {
  apiKey: cleanEnvValue(import.meta.env.VITE_FIREBASE_API_KEY as string | undefined),
  authDomain: cleanEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined),
  projectId: cleanEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined),
  storageBucket: cleanEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined),
  messagingSenderId: cleanEnvValue(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined
  ),
  appId: cleanEnvValue(import.meta.env.VITE_FIREBASE_APP_ID as string | undefined),
};

function isRealConfigValue(val?: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith('MY_') ||
    trimmed.startsWith('your-') ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    return false;
  }
  return true;
}

function isValidFirebaseApiKey(key?: string): boolean {
  if (!isRealConfigValue(key)) return false;
  return /^AIza[0-9A-Za-z_-]{25,}$/.test(key!.trim());
}

export const isFirebaseConfigured =
  isValidFirebaseApiKey(firebaseConfig.apiKey) && isRealConfigValue(firebaseConfig.projectId);

const FORCE_LOCAL_KEY = 'kp4_force_local_mode';

function getLocalModeOverride(): boolean {
  try {
    return sessionStorage.getItem(FORCE_LOCAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function setLocalModeOverride(enabled: boolean): void {
  try {
    if (enabled) {
      sessionStorage.setItem(FORCE_LOCAL_KEY, '1');
    } else {
      sessionStorage.removeItem(FORCE_LOCAL_KEY);
    }
  } catch {
    // ignore
  }
}

let fbApp: FirebaseApp | null = null;
let fbAuth: Auth | null = null;
let fbDb: Firestore | null = null;
let fbStorage: FirebaseStorage | null = null;
let firebaseInitError: string | null = null;

if (isFirebaseConfigured) {
  try {
    const normalizedConfig = {
      ...firebaseConfig,
      authDomain:
        firebaseConfig.authDomain || `${firebaseConfig.projectId}.firebaseapp.com`,
    };
    fbApp = getApps().length ? getApps()[0] : initializeApp(normalizedConfig);
    fbAuth = getAuth(fbApp);
    fbDb = getFirestore(fbApp);
    fbStorage = getStorage(fbApp);
  } catch (err: unknown) {
    firebaseInitError =
      err instanceof Error ? err.message : 'Gagal menginisialisasi SDK Firebase.';
  }
}

export function isUsingFirebase(): boolean {
  return (
    isFirebaseConfigured &&
    !getLocalModeOverride() &&
    fbAuth !== null &&
    fbDb !== null &&
    !firebaseInitError
  );
}

function mapFirebaseAuthError(err: unknown, context: 'login' | 'register' | 'google'): string {
  const code = (err as { code?: string })?.code || '';
  const msg = (err as { message?: string })?.message || '';

  if (code.includes('api-key-not-valid') || code === 'auth/invalid-api-key') {
    return 'API Key Firebase (VITE_FIREBASE_API_KEY) tidak valid atau ditolak oleh Firebase. Periksa nilai konfigurasi proyek Firebase Anda, atau klik "Beralih ke Mode Lokal" untuk langsung menggunakan aplikasi.';
  }

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau kata sandi tidak sesuai. Jika belum memiliki akun di Firebase, silakan daftar terlebih dahulu di tab Daftar Akun.';
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid.';
    case 'auth/user-disabled':
      return 'Akun ini telah dinonaktifkan pada Firebase Authentication.';
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar. Silakan masuk melalui tab Masuk.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/operation-not-allowed':
      return 'Metode login ini belum diaktifkan di Firebase Console (Authentication → Sign-in method).';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication belum diaktifkan atau dikonfigurasi pada proyek Firebase Anda.';
    case 'auth/unauthorized-domain':
      return 'Domain aplikasi ini belum ditambahkan ke Authorized Domains di Firebase Console (Authentication → Settings).';
    case 'auth/network-request-failed':
      return 'Gagal terhubung ke server Firebase. Periksa koneksi internet Anda.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login. Silakan tunggu beberapa saat lalu coba lagi.';
    case 'auth/popup-closed-by-user':
      return 'Jendela login Google ditutup sebelum proses selesai.';
    case 'auth/popup-blocked':
      return 'Pop-up login diblokir oleh browser. Gunakan login Email & Kata Sandi atau izinkan pop-up.';
    default: {
      const base =
        context === 'register'
          ? 'Gagal mendaftarkan akun baru di Firebase'
          : context === 'google'
            ? 'Gagal masuk dengan Google di Firebase'
            : 'Gagal masuk ke Firebase Authentication';
      return code ? `${base} (${code}).` : msg ? `${base}: ${msg}` : `${base}.`;
    }
  }
}

/* ---- Local Secure Vault Fallback (for preview without Firebase credentials) ---- */
const USERS_KEY = 'kp4_vault_users_v1';
const SESSION_KEY = 'kp4_vault_session_v1';
const DOCS_KEY_PREFIX = 'kp4_vault_docs_v1_';

interface LocalUserRecord {
  uid: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Deterministic fallback hash for non-HTTPS contexts
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function readLocalUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as LocalUserRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: LocalUserRecord[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readLocalDocs(uid: string): KP4DocumentRecord[] {
  try {
    const raw = localStorage.getItem(`${DOCS_KEY_PREFIX}${uid}`);
    return raw ? (JSON.parse(raw) as KP4DocumentRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocalDocs(uid: string, docs: KP4DocumentRecord[]): void {
  localStorage.setItem(`${DOCS_KEY_PREFIX}${uid}`, JSON.stringify(docs));
}

async function ensureDemoAccountSeeded(): Promise<void> {
  const users = readLocalUsers();
  const demoEmail = 'maryani@smkn1koba.sch.id';
  const existing = users.find((u) => u.email.toLowerCase() === demoEmail);
  if (!existing) {
    const demoUid = 'uid_demo_maryani';
    const passwordHash = await sha256Hex(`kp4_salt:${demoEmail}:kp4demo123`);
    users.push({
      uid: demoUid,
      email: demoEmail,
      displayName: 'Maryani, S.Pd',
      passwordHash,
      createdAt: '2026-11-18T08:00:00.000Z',
    });
    writeLocalUsers(users);

    const docs = readLocalDocs(demoUid);
    if (docs.length === 0) {
      const sampleDocs: KP4DocumentRecord[] = [
        {
          id: 'kp4-maryani-2026',
          title: 'KP4 Tahun 2026 — Maryani',
          data: structuredClone(DEFAULT_KP4_DATA),
          createdAt: '2026-11-18T08:05:00.000Z',
          updatedAt: '2026-11-18T09:30:00.000Z',
          ownerUid: demoUid,
        },
      ];
      writeLocalDocs(demoUid, sampleDocs);
    }
  }
}

type AuthListener = (user: AuthUser | null) => void;
const localListeners = new Set<AuthListener>();

function notifyLocalListeners(user: AuthUser | null): void {
  localListeners.forEach((cb) => cb(user));
}

export function subscribeAuth(callback: AuthListener): () => void {
  if (isUsingFirebase() && fbAuth) {
    return onAuthStateChanged(fbAuth, (user) => {
      if (!user) {
        callback(null);
        return;
      }
      callback({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Pegawai',
        provider: 'firebase',
      });
    });
  }

  localListeners.add(callback);
  ensureDemoAccountSeeded().then(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        callback(JSON.parse(raw) as AuthUser);
      } else {
        callback(null);
      }
    } catch {
      callback(null);
    }
  });

  return () => {
    localListeners.delete(callback);
  };
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('Email dan kata sandi wajib diisi.');
  }

  if (isUsingFirebase() && fbAuth) {
    try {
      const cred = await signInWithEmailAndPassword(fbAuth, normalizedEmail, password);
      return {
        uid: cred.user.uid,
        email: cred.user.email || normalizedEmail,
        displayName: cred.user.displayName || normalizedEmail.split('@')[0],
        provider: 'firebase',
      };
    } catch (err: unknown) {
      throw new Error(mapFirebaseAuthError(err, 'login'));
    }
  }

  await ensureDemoAccountSeeded();
  const users = readLocalUsers();
  const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!found) {
    throw new Error('Akun tidak ditemukan. Silakan daftar terlebih dahulu.');
  }
  const hash = await sha256Hex(`kp4_salt:${normalizedEmail}:${password}`);
  if (hash !== found.passwordHash) {
    throw new Error('Kata sandi tidak sesuai.');
  }

  const sessionUser: AuthUser = {
    uid: found.uid,
    email: found.email,
    displayName: found.displayName,
    provider: 'local',
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  notifyLocalListeners(sessionUser);
  return sessionUser;
}

export async function loginWithGoogle(): Promise<AuthUser> {
  if (!isUsingFirebase() || !fbAuth) {
    throw new Error('Login Google hanya tersedia saat Firebase Authentication aktif.');
  }
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(fbAuth, provider);
    return {
      uid: cred.user.uid,
      email: cred.user.email || '',
      displayName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Pegawai',
      provider: 'firebase',
    };
  } catch (err: unknown) {
    throw new Error(mapFirebaseAuthError(err, 'google'));
  }
}

export async function registerWithEmail(
  displayName: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const cleanName = displayName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!cleanName) {
    throw new Error('Nama lengkap wajib diisi.');
  }
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Format email tidak valid.');
  }
  if (password.length < 6) {
    throw new Error('Kata sandi minimal 6 karakter.');
  }

  if (isUsingFirebase() && fbAuth) {
    try {
      const cred = await createUserWithEmailAndPassword(fbAuth, normalizedEmail, password);
      await updateProfile(cred.user, { displayName: cleanName });
      const newUser: AuthUser = {
        uid: cred.user.uid,
        email: normalizedEmail,
        displayName: cleanName,
        provider: 'firebase',
      };
      await saveKP4Document(newUser.uid, {
        id: `kp4-${Date.now()}`,
        title: `KP4 Awal — ${cleanName}`,
        data: { ...structuredClone(DEFAULT_KP4_DATA), nama: cleanName },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerUid: newUser.uid,
      });
      return newUser;
    } catch (err: unknown) {
      throw new Error(mapFirebaseAuthError(err, 'register'));
    }
  }

  await ensureDemoAccountSeeded();
  const users = readLocalUsers();
  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Email sudah terdaftar. Silakan masuk.');
  }

  const uid = `uid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await sha256Hex(`kp4_salt:${normalizedEmail}:${password}`);
  users.push({
    uid,
    email: normalizedEmail,
    displayName: cleanName,
    passwordHash,
    createdAt: new Date().toISOString(),
  });
  writeLocalUsers(users);

  // Seed starter KP4 document for the new user
  const starterDoc: KP4DocumentRecord = {
    id: `kp4-${Date.now()}`,
    title: `KP4 — ${cleanName}`,
    data: { ...structuredClone(DEFAULT_KP4_DATA), nama: cleanName },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerUid: uid,
  };
  writeLocalDocs(uid, [starterDoc]);

  const sessionUser: AuthUser = {
    uid,
    email: normalizedEmail,
    displayName: cleanName,
    provider: 'local',
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  notifyLocalListeners(sessionUser);
  return sessionUser;
}

export async function loginAsDemoUser(): Promise<AuthUser> {
  setLocalModeOverride(true);
  return loginWithEmail('maryani@smkn1koba.sch.id', 'kp4demo123');
}

export async function logoutUser(): Promise<void> {
  if (isUsingFirebase() && fbAuth) {
    await firebaseSignOut(fbAuth);
    return;
  }
  setLocalModeOverride(false);
  localStorage.removeItem(SESSION_KEY);
  notifyLocalListeners(null);
}

/* ---- Firestore / Persistent KP4 Document Operations ---- */
export async function listKP4Documents(uid: string): Promise<KP4DocumentRecord[]> {
  if (isUsingFirebase() && fbDb) {
    const colRef = collection(fbDb, 'users', uid, 'kp4_documents');
    const q = query(colRef, orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const payload = d.data() as Omit<KP4DocumentRecord, 'id'>;
      return {
        id: d.id,
        title: payload.title,
        data: payload.data,
        attachments: payload.attachments ?? [],
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        ownerUid: uid,
      };
    });
  }

  const docs = readLocalDocs(uid);
  return [...docs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveKP4Document(
  uid: string,
  record: KP4DocumentRecord
): Promise<KP4DocumentRecord> {
  const now = new Date().toISOString();
  const nextRecord: KP4DocumentRecord = {
    ...record,
    attachments: record.attachments ?? [],
    ownerUid: uid,
    createdAt: record.createdAt || now,
    updatedAt: now,
  };

  if (isUsingFirebase() && fbDb) {
    const docRef = doc(fbDb, 'users', uid, 'kp4_documents', nextRecord.id);
    await setDoc(docRef, {
      title: nextRecord.title,
      data: nextRecord.data,
      attachments: nextRecord.attachments,
      createdAt: nextRecord.createdAt,
      updatedAt: nextRecord.updatedAt,
      ownerUid: uid,
    });
    return nextRecord;
  }

  const docs = readLocalDocs(uid);
  const idx = docs.findIndex((d) => d.id === nextRecord.id);
  if (idx >= 0) {
    docs[idx] = nextRecord;
  } else {
    docs.unshift(nextRecord);
  }
  writeLocalDocs(uid, docs);
  return nextRecord;
}

export async function deleteKP4Document(uid: string, docId: string): Promise<void> {
  if (isUsingFirebase() && fbDb) {
    const docRef = doc(fbDb, 'users', uid, 'kp4_documents', docId);
    await deleteDoc(docRef);
    return;
  }

  const docs = readLocalDocs(uid);
  const target = docs.find((d) => d.id === docId);
  if (target?.attachments?.length) {
    await Promise.all(
      target.attachments.map((att) => deleteIdbBlob(attachmentStorageKey(uid, docId, att.id)))
    );
  }
  writeLocalDocs(
    uid,
    docs.filter((d) => d.id !== docId)
  );
}

export function createDocumentRecord(uid: string, title: string, data: KP4Data): KP4DocumentRecord {
  const now = new Date().toISOString();
  return {
    id: `kp4-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim() || `KP4 — ${data.nama || 'Pegawai Baru'}`,
    data: structuredClone(data),
    attachments: [],
    createdAt: now,
    updatedAt: now,
    ownerUid: uid,
  };
}

/* ---- Supporting Document Attachments (Firebase Storage + IndexedDB fallback) ---- */
const IDB_NAME = 'kp4_attachments_v1';
const IDB_STORE = 'files';
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function attachmentStorageKey(uid: string, docId: string, attId: string): string {
  return `${uid}:${docId}:${attId}`;
}

function openAttachmentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Gagal membuka penyimpanan lokal berkas.'));
  });
}

async function putIdbBlob(key: string, blob: Blob): Promise<void> {
  const db = await openAttachmentDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Gagal menyimpan berkas ke penyimpanan lokal.'));
    };
  });
}

async function getIdbBlob(key: string): Promise<Blob | null> {
  const db = await openAttachmentDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as Blob | undefined) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error || new Error('Gagal membaca berkas dari penyimpanan lokal.'));
    };
  });
}

async function deleteIdbBlob(key: string): Promise<void> {
  try {
    const db = await openAttachmentDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // ignore cleanup failure
  }
}

export async function uploadKP4Attachment(
  uid: string,
  docId: string,
  category: AttachmentCategory,
  file: File
): Promise<KP4Attachment> {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExt =
    lowerName.endsWith('.pdf') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp');

  if (!ALLOWED_MIME_TYPES.has(file.type) && !hasAllowedExt) {
    throw new Error(`Format "${file.name}" tidak didukung. Gunakan PDF, JPG, PNG, atau WEBP.`);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Ukuran "${file.name}" melebihi batas maksimal 10 MB.`);
  }

  const attId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const safeName = file.name.replace(/[^\w.\- ]+/g, '_');
  const mimeType =
    file.type || (lowerName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  if (isUsingFirebase() && fbStorage) {
    const storagePath = `users/${uid}/kp4_documents/${docId}/attachments/${attId}_${safeName}`;
    const fileRef = ref(fbStorage, storagePath);
    await uploadBytes(fileRef, file, { contentType: mimeType });
    const storageUrl = await getDownloadURL(fileRef);
    return {
      id: attId,
      category,
      fileName: file.name,
      mimeType,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      storagePath,
      storageUrl,
    };
  }

  await putIdbBlob(attachmentStorageKey(uid, docId, attId), file);
  return {
    id: attId,
    category,
    fileName: file.name,
    mimeType,
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
  };
}

export async function getKP4AttachmentBlob(
  uid: string,
  docId: string,
  attachment: KP4Attachment
): Promise<Blob> {
  if (attachment.storageUrl) {
    const res = await fetch(attachment.storageUrl);
    if (!res.ok) throw new Error('Gagal mengunduh berkas dari Firebase Storage.');
    return res.blob();
  }
  const blob = await getIdbBlob(attachmentStorageKey(uid, docId, attachment.id));
  if (!blob) {
    throw new Error('Berkas tidak ditemukan di penyimpanan lokal.');
  }
  return blob;
}

export async function getKP4AttachmentUrl(
  uid: string,
  docId: string,
  attachment: KP4Attachment
): Promise<{ url: string; revokeOnClose: boolean }> {
  if (attachment.storageUrl) {
    return { url: attachment.storageUrl, revokeOnClose: false };
  }
  const blob = await getKP4AttachmentBlob(uid, docId, attachment);
  return { url: URL.createObjectURL(blob), revokeOnClose: true };
}

export async function deleteKP4Attachment(
  uid: string,
  docId: string,
  attachment: KP4Attachment
): Promise<void> {
  if (isUsingFirebase() && fbStorage && attachment.storagePath) {
    try {
      await deleteObject(ref(fbStorage, attachment.storagePath));
    } catch {
      // ignore already-deleted object
    }
    return;
  }
  await deleteIdbBlob(attachmentStorageKey(uid, docId, attachment.id));
}
