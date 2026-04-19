export interface UploadResponse {
  id: string;
  fileName: string;
  path: string;
  uploadedAt: string;
  extractedCharacters: number;
}

export interface SearchResult {
  fileName: string;
  path: string;
  content: string;
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export async function uploadPdf(file: File): Promise<UploadResponse> {
  const body = new FormData();
  body.append('file', file);

  const res = await fetch(`${BASE}/api/pdf/upload`, { method: 'POST', body });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Upload falhou (${res.status})`);
  }

  return res.json() as Promise<UploadResponse>;
}

export async function searchPdfs(term: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/api/pdf/search?term=${encodeURIComponent(term)}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Busca falhou (${res.status})`);
  }

  return res.json() as Promise<SearchResult[]>;
}
