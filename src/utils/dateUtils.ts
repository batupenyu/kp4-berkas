const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const MONTH_INDEX_MAP: Record<string, number> = {
  januari: 1,
  jan: 1,
  februari: 2,
  feb: 2,
  pebruari: 2,
  maret: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  agustus: 8,
  agt: 8,
  aug: 8,
  september: 9,
  sep: 9,
  oktober: 10,
  okt: 10,
  oct: 10,
  november: 11,
  nov: 11,
  nopember: 11,
  desember: 12,
  des: 12,
  dec: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatIsoToIndonesianDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const monthName = INDONESIAN_MONTHS[month - 1];
  if (!monthName || day < 1 || day > 31) return iso;
  return `${day} ${monthName} ${year}`;
}

export function parseIndonesianDateToIso(input: string): string {
  const raw = (input || '').trim();
  if (!raw || raw === '-') return '';

  // Already ISO YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (isoMatch) {
    return `${isoMatch[1]}-${pad2(Number(isoMatch[2]))}-${pad2(Number(isoMatch[3]))}`;
  }

  // Numeric DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(raw);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  // Indonesian "7 Mei 1976" or "18 November 2026"
  const textMatch = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(raw);
  if (textMatch) {
    const day = Number(textMatch[1]);
    const monthKey = textMatch[2].toLowerCase();
    const month = MONTH_INDEX_MAP[monthKey];
    const year = Number(textMatch[3]);
    if (month && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  return '';
}

export function splitTempatTanggalLahir(ttl: string): { tempat: string; tanggal: string } {
  const raw = ttl || '';
  const slashIdx = raw.indexOf('/');
  if (slashIdx >= 0) {
    return {
      tempat: raw.slice(0, slashIdx).trim(),
      tanggal: raw.slice(slashIdx + 1).trim(),
    };
  }
  if (parseIndonesianDateToIso(raw)) {
    return { tempat: '', tanggal: raw.trim() };
  }
  return { tempat: raw.trim(), tanggal: '' };
}

export function combineTempatTanggalLahir(tempat: string, tanggal: string): string {
  const t = tempat.trim();
  const d = tanggal.trim();
  if (t && d) return `${t} / ${d}`;
  if (t) return t;
  if (d) return d;
  return '';
}
