import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadPdf, type UploadResponse } from '../api/pdf';

interface UploadZoneProps {
  onSuccess: (res: UploadResponse) => void;
  onError: (msg: string) => void;
}

type State = 'idle' | 'drag' | 'uploading' | 'success' | 'error';

export default function UploadZone({ onSuccess, onError }: UploadZoneProps) {
  const [state, setState] = useState<State>('idle');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Apenas arquivos PDF são aceitos.');
      setState('error');
      onError('Apenas arquivos PDF são aceitos.');
      return;
    }

    setFileName(file.name);
    setState('uploading');
    setErrorMsg('');

    try {
      const res = await uploadPdf(file);
      setState('success');
      onSuccess(res);
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setErrorMsg(msg);
      setState('error');
      onError(msg);
      setTimeout(() => setState('idle'), 4000);
    }
  }, [onSuccess, onError]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState('idle');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const zoneBorder =
    state === 'drag'     ? 'border-violet-400 bg-violet-500/10 glow-violet' :
    state === 'uploading'? 'border-violet-500/60 animate-pulse-border' :
    state === 'success'  ? 'border-emerald-500/60 bg-emerald-500/5' :
    state === 'error'    ? 'border-red-500/50 bg-red-500/5' :
                           'border-white/10 hover:border-violet-500/40 hover:bg-white/[0.03]';

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-2xl border-2 border-dashed
                  cursor-pointer transition-all duration-300 min-h-[220px] select-none ${zoneBorder}`}
      onDragOver={(e) => { e.preventDefault(); setState('drag'); }}
      onDragLeave={() => setState('idle')}
      onDrop={onDrop}
      onClick={() => state === 'idle' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={onInputChange}
      />

      {state === 'idle' && (
        <>
          <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
            <Upload size={28} className="text-violet-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-200 font-medium text-sm">
              Arraste um PDF aqui
            </p>
            <p className="text-slate-500 text-xs mt-1">
              ou clique para selecionar
            </p>
          </div>
          <span className="text-xs text-slate-600 border border-white/5 px-3 py-1 rounded-full">
            Máximo 50 MB
          </span>
        </>
      )}

      {state === 'drag' && (
        <>
          <div className="p-4 rounded-2xl bg-violet-500/20 border border-violet-500/40">
            <Upload size={28} className="text-violet-300" />
          </div>
          <p className="text-violet-300 font-medium text-sm">Solte para fazer upload</p>
        </>
      )}

      {state === 'uploading' && (
        <>
          <Loader2 size={32} className="text-violet-400 animate-spin-slow" />
          <div className="text-center">
            <p className="text-slate-200 font-medium text-sm">Enviando e indexando…</p>
            <p className="text-slate-500 text-xs mt-1 max-w-[200px] truncate">{fileName}</p>
          </div>
          <div className="w-full max-w-[180px] h-1 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full animate-pulse w-3/4" />
          </div>
        </>
      )}

      {state === 'success' && (
        <>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-emerald-300 font-medium text-sm">Indexado com sucesso!</p>
            <p className="text-slate-500 text-xs mt-1 max-w-[200px] truncate">{fileName}</p>
          </div>
        </>
      )}

      {state === 'error' && (
        <>
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-red-300 font-medium text-sm">Falha no upload</p>
            <p className="text-slate-500 text-xs mt-1 max-w-[220px] text-center">{errorMsg}</p>
          </div>
        </>
      )}

      {state === 'idle' && (
        <div className="absolute bottom-3 right-3">
          <FileText size={14} className="text-white/10" />
        </div>
      )}
    </div>
  );
}
