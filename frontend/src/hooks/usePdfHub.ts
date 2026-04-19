import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

export interface PdfProcessedEvent {
  jobId: string;
  fileName: string;
  status: 'completed' | 'failed';
  extractedCharacters: number;
  error?: string;
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export function usePdfHub(onPdfProcessed: (event: PdfProcessedEvent) => void) {
  const handlerRef = useRef(onPdfProcessed);
  handlerRef.current = onPdfProcessed;

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE}/hubs/pdf`)
      .withAutomaticReconnect()
      .build();

    connection.on('PdfProcessed', (event: PdfProcessedEvent) => {
      handlerRef.current(event);
    });

    connection.start().catch(err => console.error('[SignalR]', err));

    return () => { connection.stop(); };
  }, []);
}
