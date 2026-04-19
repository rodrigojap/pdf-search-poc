import { FileCheck, Calendar, Hash } from 'lucide-react';
import type { UploadResponse } from '../api/pdf';

interface UploadedListProps {
  files: UploadResponse[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatChars(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function UploadedList({ files }: UploadedListProps) {
  if (files.length === 0) return null;

  return (
    <div className="mt-4 animate-fade-in">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-3">
        Indexados nesta sessão ({files.length})
      </p>
      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
        {files.map((f) => (
          <div
            key={f.id}
            className="glass-sm flex items-start gap-3 px-3.5 py-3 animate-slide-up"
          >
            <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <FileCheck size={14} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 font-medium truncate">{f.fileName}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Calendar size={10} />
                  {formatDate(f.uploadedAt)}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Hash size={10} />
                  {formatChars(f.extractedCharacters)} chars
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
