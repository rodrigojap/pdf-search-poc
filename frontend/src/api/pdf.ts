export interface UploadAcceptedResponse {
  jobId: string;
  fileName: string;
  status: 'processing';
}

export interface PdfFile {
  jobId: string;
  fileName: string;
  status: 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  extractedCharacters?: number;
  error?: string;
}

export interface SearchResult {
  fileName: string;
  path: string;
  content: string;
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export async function uploadPdf(file: File): Promise<UploadAcceptedResponse> {
  const body = new FormData();
  body.append('file', file);

  const res = await fetch(`${BASE}/api/pdf/upload`, { method: 'POST', body });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Upload falhou (${res.status})`);
  }

  return res.json() as Promise<UploadAcceptedResponse>;
}

export async function searchPdfs(term: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/api/pdf/search?term=${encodeURIComponent(term)}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Busca falhou (${res.status})`);
  }

  return res.json() as Promise<SearchResult[]>;
}
