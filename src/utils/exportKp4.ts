import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildKP4Blocks, KP4Block, KP4Data } from '../types/kp4';

const escXml = (s: unknown): string =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    };
    return map[c] ?? c;
  });

export function getExportFilename(data: KP4Data, ext: 'pdf' | 'docx' | 'json'): string {
  const cleanName = (data.nama || 'Pegawai').trim().replace(/[^\w]+/g, '_');
  return `KP4_${cleanName}.${ext}`;
}

export function triggerBlobDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/* ---- Word (.docx) OOXML Generator ---- */
interface DocxParaOpts {
  b?: boolean;
  u?: boolean;
  sz?: number;
  tabs?: number[];
  before?: number;
  after?: number;
  left?: number;
  hang?: number;
  c?: boolean;
  j?: boolean;
}

const xmlRun = (t: string, o: DocxParaOpts = {}): string =>
  `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${
    o.b ? '<w:b/>' : ''
  }${o.u ? '<w:u w:val="single"/>' : ''}<w:sz w:val="${o.sz || 22}"/></w:rPr>${String(t)
    .split('\t')
    .map((x, i) => `${i ? '<w:tab/>' : ''}<w:t xml:space="preserve">${escXml(x)}</w:t>`)
    .join('')}</w:r>`;

const xmlPara = (t: string, o: DocxParaOpts = {}): string =>
  `<w:p><w:pPr>${
    o.tabs
      ? `<w:tabs>${o.tabs.map((p) => `<w:tab w:val="left" w:pos="${p}"/>`).join('')}</w:tabs>`
      : ''
  }<w:spacing w:before="${o.before || 0}" w:after="${o.after == null ? 80 : o.after}"/>${
    o.left != null ? `<w:ind w:left="${o.left}" w:hanging="${o.hang ?? 0}"/>` : ''
  }${o.c ? '<w:jc w:val="center"/>' : o.j ? '<w:jc w:val="both"/>' : ''}</w:pPr>${xmlRun(
    t,
    o
  )}</w:p>`;

function docxTable(b: Extract<KP4Block, { t: 'tbl' }>, total: number): string {
  const sm = b.w.reduce((a, c) => a + c, 0);
  const ws = b.w.map((x) => Math.round((total * x) / sm));
  const sz = b.sm ? 19 : 20;
  const row = (r: string[], hd: boolean) =>
    `<w:tr>${hd ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${r
      .map(
        (c, i) =>
          `<w:tc><w:tcPr><w:tcW w:w="${ws[i]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${xmlPara(
            c,
            { sz, b: hd, c: true, after: 0 }
          )}</w:tc>`
      )
      .join('')}</w:tr>`;

  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${[
      'top',
      'left',
      'bottom',
      'right',
      'insideH',
      'insideV',
    ]
      .map((k) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`)
      .join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ws
      .map((w) => `<w:gridCol w:w="${w}"/>`)
      .join('')}</w:tblGrid>${row(b.h, true)}${b.r.map((r) => row(r, false)).join('')}</w:tbl>` +
    xmlPara('', { after: 60 })
  );
}

function docxSign(b: Extract<KP4Block, { t: 'sign' }>, total: number): string {
  const h = Math.round(total / 2);
  const cell = (a: string[]) =>
    `<w:tc><w:tcPr><w:tcW w:w="${h}" w:type="dxa"/></w:tcPr>${a
      .map((x, i) => xmlPara(x, { c: true, after: 0, b: i === 5, u: i === 5 }))
      .join('')}</w:tc>`;

  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${h}"/><w:gridCol w:w="${h}"/></w:tblGrid><w:tr>${cell(
    b.l
  )}${cell(b.r)}</w:tr></w:tbl>`;
}

function docxBody(arr: KP4Block[], total: number): string {
  return arr
    .map((b) => {
      if (b.t === 'c') {
        return xmlPara(b.x, { c: true, b: true, sz: 28, after: b.x.startsWith('UNTUK') ? 240 : 0 });
      }
      if (b.t === 'kv') {
        return xmlPara(`${b.k}\t:\t${b.v}`, {
          tabs: [3800, 4100],
          left: 4100,
          hang: 4100,
          after: 40,
        });
      }
      if (b.t === 'li') {
        return xmlPara(
          `${b.n}\t${b.x}`,
          b.l
            ? { tabs: [1000], left: 1000, hang: 600, j: true, after: 40 }
            : { tabs: [400], left: 400, hang: 400, j: true, after: 40 }
        );
      }
      if (b.t === 'amt') {
        return xmlPara(`${b.n}\t${b.k}\t${b.v}`, {
          tabs: [400, 5600],
          left: 400,
          hang: 400,
          after: 40,
        });
      }
      if (b.t === 'p') {
        return xmlPara(b.x, { b: b.b, j: !b.b, before: b.b ? 120 : 0 });
      }
      if (b.t === 'tbl') {
        return docxTable(b, total);
      }
      if (b.t === 'sign') {
        return docxSign(b, total);
      }
      return '';
    })
    .join('');
}

export async function generateKP4Docx(data: KP4Data): Promise<Blob> {
  const B = buildKP4Blocks(data);
  const pgIdx = B.findIndex((b) => b.t === 'pg');
  const mar =
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>';
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${docxBody(
    B.slice(0, pgIdx),
    9638
  )}<w:p><w:pPr><w:sectPr><w:pgSz w:w="11906" w:h="16838"/>${mar}</w:sectPr></w:pPr></w:p>${docxBody(
    B.slice(pgIdx + 1),
    14570
  )}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>${mar}</w:sectPr></w:body></w:document>`;

  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  );
  zip.file('word/document.xml', xml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/* ---- PDF Generator ---- */
export async function generateKP4Pdf(data: KP4Data): Promise<Blob> {
  const B = buildKP4Blocks(data);
  const M = 15;
  const LH = 4.9;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let W = 210 - 2 * M;
  let H = 297;
  let y = M;
  let land = false;

  const cleanDash = (s: unknown): string => String(s == null ? '' : s).replace(/[\u2013\u2014]/g, '-');
  const setFnt = (st: 'normal' | 'bold', sz: number) => {
    doc.setFont('times', st);
    doc.setFontSize(sz);
  };
  const ensureSpace = (h: number) => {
    if (y + h > H - M) {
      doc.addPage('a4', land ? 'landscape' : 'portrait');
      y = M;
    }
  };
  const drawJustifiedLine = (ln: string, x: number, yy: number, w: number) => {
    const words = ln.split(' ');
    if (words.length < 2) {
      doc.text(ln, x, yy);
      return;
    }
    const textWidth = words.reduce((a, s) => a + doc.getTextWidth(s), 0);
    const gap = (w - textWidth) / (words.length - 1);
    let cx = x;
    words.forEach((word) => {
      doc.text(word, cx, yy);
      cx += doc.getTextWidth(word) + gap;
    });
  };
  const drawPara = (txt: string, x: number, w: number, just: boolean) => {
    const lines = doc.splitTextToSize(cleanDash(txt), w) as string[];
    lines.forEach((line, k) => {
      ensureSpace(LH);
      if (just && k < lines.length - 1) {
        drawJustifiedLine(line, x, y + 3.6, w);
      } else {
        doc.text(line, x, y + 3.6);
      }
      y += LH;
    });
  };

  setFnt('normal', 11);

  for (const b of B) {
    if (b.t === 'c') {
      setFnt('bold', 14);
      ensureSpace(8);
      doc.text(cleanDash(b.x), M + W / 2, y + 5, { align: 'center' });
      y += b.x.startsWith('UNTUK') ? 10 : 6.5;
      setFnt('normal', 11);
    } else if (b.t === 'kv') {
      setFnt('normal', 11);
      const lines = doc.splitTextToSize(cleanDash(b.v), W - 64) as string[];
      ensureSpace(LH * lines.length);
      doc.text(cleanDash(b.k), M, y + 3.6);
      doc.text(':', M + 60, y + 3.6);
      lines.forEach((line) => {
        doc.text(line, M + 64, y + 3.6);
        y += LH;
      });
    } else if (b.t === 'p') {
      if (b.b) {
        setFnt('bold', 11);
        y += 1.5;
        drawPara(b.x, M, W, false);
        setFnt('normal', 11);
      } else {
        y += 1;
        drawPara(b.x, M, W, true);
      }
    } else if (b.t === 'li') {
      const ind = b.l ? 8 : 0;
      const nx = M + ind;
      const tx = M + ind + (b.l ? 10 : 8);
      doc.text(b.n, nx, y + 3.6);
      drawPara(b.x, tx, W - (tx - M), true);
    } else if (b.t === 'amt') {
      ensureSpace(LH);
      doc.text(cleanDash(b.n), M, y + 3.6);
      doc.text(cleanDash(b.k), M + 8, y + 3.6);
      doc.text(cleanDash(b.v), M + 98, y + 3.6);
      y += LH;
    } else if (b.t === 'tbl') {
      const sm = b.w.reduce((a, c) => a + c, 0);
      const cs: Record<number, { cellWidth: number }> = {};
      b.w.forEach((w, k) => {
        cs[k] = { cellWidth: (W * w) / sm };
      });
      autoTable(doc, {
        startY: y + 1,
        head: [b.h.map(cleanDash)],
        body: b.r.map((r) => r.map(cleanDash)),
        theme: 'grid',
        margin: { left: M, right: M, top: M, bottom: M },
        tableWidth: W,
        columnStyles: cs,
        styles: {
          font: 'times',
          fontSize: b.sm ? 10.5 : 10,
          cellPadding: 1.6,
          halign: 'center',
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          textColor: 0,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: 0,
          fontStyle: 'bold',
        },
      });
      const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
      y = (lastTable?.finalY ?? y + 12) + 4;
      setFnt('normal', 11);
    } else if (b.t === 'sign') {
      ensureSpace(LH * 7 + 4);
      y += 4;
      const pairs: Array<[string[], number]> = [
        [b.l, M + W / 4],
        [b.r, M + (W * 3) / 4],
      ];
      pairs.forEach(([a, cx]) => {
        let yy = y;
        a.forEach((x, k) => {
          if (k === 5) {
            setFnt('bold', 11);
            doc.text(cleanDash(x), cx, yy + 3.6, { align: 'center' });
            const tw = doc.getTextWidth(cleanDash(x));
            doc.line(cx - tw / 2, yy + 4.4, cx + tw / 2, yy + 4.4);
            setFnt('normal', 11);
          } else {
            doc.text(cleanDash(x), cx, yy + 3.6, { align: 'center' });
          }
          yy += LH;
        });
      });
      y += LH * 7;
    } else if (b.t === 'pg') {
      land = true;
      W = 297 - 2 * M;
      H = 210;
      doc.addPage('a4', 'landscape');
      y = M;
    }
  }

  return doc.output('blob');
}
