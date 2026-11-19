import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfCanvasViewerProps {
  blob: Blob;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({ blob }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.15);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedDoc: pdfjsLib.PDFDocumentProxy | null = null;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setNumPages(0);

    (async () => {
      try {
        const buffer = await blob.arrayBuffer();
        if (cancelled) return;
        loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const doc = await loadingTask.promise;
        if (cancelled) {
          await doc.cleanup().catch(() => {});
          await loadingTask.destroy().catch(() => {});
          return;
        }
        loadedDoc = doc;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Gagal memuat pratinjau PDF: ${err.message}`
              : 'Gagal memuat dokumen PDF.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (loadedDoc) {
        loadedDoc.cleanup().catch(() => {});
      }
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };
  }, [blob]);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;
    const activeTasks: pdfjsLib.RenderTask[] = [];
    container.innerHTML = '';
    setRendering(true);

    (async () => {
      try {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (cancelled) break;
          const page = await pdfDoc.getPage(pageNum);
          if (cancelled) break;

          const viewport = page.getViewport({ scale });

          const pageWrapper = document.createElement('div');
          pageWrapper.className =
            'bg-white shadow-sm border border-slate-200 dark:border-slate-700 rounded overflow-hidden mx-auto';
          pageWrapper.style.width = `${Math.floor(viewport.width)}px`;

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = 'block';

          const context = canvas.getContext('2d');
          if (!context) continue;

          pageWrapper.appendChild(canvas);

          const pageLabel = document.createElement('div');
          pageLabel.className =
            'text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 text-center mt-1.5 mb-4';
          pageLabel.textContent = `Halaman ${pageNum} dari ${pdfDoc.numPages}`;

          container.appendChild(pageWrapper);
          container.appendChild(pageLabel);

          const renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          });
          activeTasks.push(renderTask);
          await renderTask.promise;
        }
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name;
        if (!cancelled && name !== 'RenderingCancelledException') {
          setError('Gagal merender halaman PDF ke pratinjau.');
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const task of activeTasks) {
        try {
          task.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, scale]);

  const zoomPercent = Math.round(scale * 100);

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
          {loading
            ? 'Memuat PDF...'
            : error
              ? 'Pratinjau tidak tersedia'
              : `${numPages} halaman${rendering ? ' · merender...' : ''}`}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
            disabled={loading || !!error || scale <= 0.6}
            aria-label="Perkecil zoom"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono-tabular text-slate-700 dark:text-slate-200 w-12 text-center">
            {zoomPercent}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.2, Number((s + 0.15).toFixed(2))))}
            disabled={loading || !!error || scale >= 2.2}
            aria-label="Perbesar zoom"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setScale(1.15)}
            disabled={loading || !!error || scale === 1.15}
            title="Reset zoom"
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-40"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-[320px] max-h-[66vh] px-1">
        {loading && (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-800 dark:text-emerald-400" />
            <span className="text-xs">Membaca halaman dokumen PDF...</span>
          </div>
        )}

        {error && !loading && (
          <div className="h-64 flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Anda masih dapat mengunduh berkas ini menggunakan tombol Unduh di atas.
            </p>
          </div>
        )}

        <div ref={containerRef} className={loading || error ? 'hidden' : 'w-full'} />
      </div>
    </div>
  );
};
