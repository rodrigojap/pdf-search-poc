import { useState, useCallback } from 'react';
import { FileSearch, Upload, Search, Zap } from 'lucide-react';
import UploadZone from './components/UploadZone';
import UploadedList from './components/UploadedList';
import SearchPanel from './components/SearchPanel';
import Toast, { type ToastItem } from './components/Toast';
import type { UploadAcceptedResponse, PdfFile } from './api/pdf';
import { usePdfHub, type PdfProcessedEvent } from './hooks/usePdfHub';

type Tab = 'upload' | 'search';

export default function App() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  const addToast = useCallback((message: string, type: ToastItem['type']) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleUploadSuccess = useCallback((res: UploadAcceptedResponse) => {
    const newFile: PdfFile = {
      jobId: res.jobId,
      fileName: res.fileName,
      status: 'processing',
      uploadedAt: new Date().toISOString(),
    };
    setFiles((prev) => [newFile, ...prev]);
    addToast(`"${res.fileName}" enviado — aguardando processamento…`, 'info');
  }, [addToast]);

  const handlePdfProcessed = useCallback((event: PdfProcessedEvent) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.jobId !== event.jobId ? f : {
          ...f,
          status: event.status,
          extractedCharacters: event.extractedCharacters,
          error: event.error,
        }
      )
    );

    if (event.status === 'completed') {
      addToast(
        `"${event.fileName}" indexado — ${event.extractedCharacters.toLocaleString()} chars extraídos`,
        'success'
      );
    } else {
      addToast(`Falha ao processar "${event.fileName}"`, 'error');
    }
  }, [addToast]);

  usePdfHub(handlePdfProcessed);

  const handleError = useCallback((msg: string) => {
    addToast(msg, 'error');
  }, [addToast]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-60 -right-60 w-[500px] h-[500px] rounded-full bg-violet-700/10 blur-[120px]" />
        <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] rounded-full bg-indigo-700/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-purple-800/5 blur-[80px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-2xl bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-900/40">
              <FileSearch size={18} className="text-white" />
            </div>
            <span className="font-semibold text-gradient text-lg tracking-tight">
              PDF Search
            </span>
            <span className="hidden sm:block text-xs text-white/20 font-normal ml-1">POC</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Elasticsearch</span>
            <Zap size={12} className="text-slate-600" />
            <span className="hidden sm:inline text-slate-600">RabbitMQ</span>
          </div>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="relative z-10 sm:hidden flex border-b border-white/[0.06] bg-white/[0.02]">
        {(['upload', 'search'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
                        ${activeTab === tab
                          ? 'text-violet-400 border-b-2 border-violet-500'
                          : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab === 'upload' ? <Upload size={14} /> : <Search size={14} />}
            {tab === 'upload' ? 'Upload' : 'Buscar'}
            {tab === 'upload' && files.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-violet-500/20 text-violet-400">
                {files.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-5 py-6 sm:py-8">
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5 h-full">
          <LeftColumn files={files} onSuccess={handleUploadSuccess} onError={handleError} />
          <div className="glass flex flex-col p-5 gap-5 min-h-[600px]">
            <SectionHeader icon={<Search size={15} />} title="Busca Textual" />
            <div className="flex-1 overflow-hidden">
              <SearchPanel onError={handleError} />
            </div>
          </div>
        </div>

        <div className="sm:hidden">
          {activeTab === 'upload' ? (
            <LeftColumn files={files} onSuccess={handleUploadSuccess} onError={handleError} />
          ) : (
            <div className="glass flex flex-col p-5 gap-5 min-h-[500px]">
              <SectionHeader icon={<Search size={15} />} title="Busca Textual" />
              <div className="flex-1">
                <SearchPanel onError={handleError} />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.04] py-4 text-center text-[11px] text-slate-700">
        .NET 8 · Elasticsearch 8 · RabbitMQ · SignalR · Docker
      </footer>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function LeftColumn({
  files,
  onSuccess,
  onError,
}: {
  files: PdfFile[];
  onSuccess: (r: UploadAcceptedResponse) => void;
  onError: (m: string) => void;
}) {
  return (
    <div className="glass flex flex-col p-5 gap-5">
      <SectionHeader
        icon={<Upload size={15} />}
        title="Upload de PDF"
        badge={files.length > 0 ? String(files.length) : undefined}
      />
      <UploadZone onSuccess={onSuccess} onError={onError} />
      <UploadedList files={files} />
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-violet-400">{icon}</span>
      <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      {badge && (
        <span className="ml-auto px-2 py-0.5 text-[11px] rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
          {badge}
        </span>
      )}
    </div>
  );
}
