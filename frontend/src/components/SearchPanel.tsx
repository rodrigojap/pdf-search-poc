import { useState, useRef } from 'react';
import { Search, Loader2, FileText, SearchX, ArrowRight } from 'lucide-react';
import { searchPdfs, type SearchResult } from '../api/pdf';

interface SearchPanelProps {
  onError: (msg: string) => void;
}

export default function SearchPanel({ onError }: SearchPanelProps) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = async () => {
    const q = term.trim();
    if (!q) return;

    setLoading(true);
    setSearched(false);

    try {
      const data = await searchPdfs(q);
      setResults(data);
      setSearched(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro na busca');
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch();
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar termo nos PDFs…"
            className="input-field pl-10 pr-4"
            autoFocus
          />
        </div>
        <button
          onClick={doSearch}
          disabled={loading || !term.trim()}
          className="btn-primary shrink-0"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin-slow" />
          ) : (
            <ArrowRight size={15} />
          )}
          <span className="hidden sm:inline">Buscar</span>
        </button>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <Search size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">
              Digite um termo e pressione Enter
            </p>
            <p className="text-slate-600 text-xs max-w-[200px]">
              A busca suporta termos parciais e fuzzy matching
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <Loader2 size={28} className="text-violet-400 animate-spin-slow" />
            <p className="text-slate-500 text-sm">Pesquisando…</p>
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center animate-fade-in">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <SearchX size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm font-medium">
              Nenhum resultado para "{term}"
            </p>
            <p className="text-slate-600 text-xs">
              Tente outro termo ou faça upload de mais PDFs
            </p>
          </div>
        )}

        {searched && !loading && results.length > 0 && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
              {results.length} resultado{results.length !== 1 ? 's' : ''} para "{term}"
            </p>

            {results.map((r, i) => (
              <ResultCard key={i} result={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const fileName = result.path.split('/').pop() ?? result.fileName;

  return (
    <div className="glass-sm p-4 group animate-slide-up hover:border-white/[0.12] transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 shrink-0 group-hover:bg-violet-500/15 transition-colors">
          <FileText size={15} className="text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">
            {result.fileName || fileName}
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5 truncate">
            {result.path}
          </p>
        </div>
      </div>

      {result.content && (
        <div
          className="mt-3 pl-4 border-l-2 border-violet-500/20 text-xs text-slate-400 leading-relaxed line-clamp-4"
          dangerouslySetInnerHTML={{ __html: result.content }}
        />
      )}
    </div>
  );
}
