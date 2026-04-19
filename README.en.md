# PDF Search POC

Full-text search over PDFs using **.NET 8 + Elasticsearch 8 + Kibana + RabbitMQ + SignalR + React (Vite) + Docker Compose**.

Uploads are **asynchronous**: the API saves the file, publishes a queue message, and returns **202 Accepted** with a `jobId`. A background worker consumes the queue, extracts text (PdfPig), indexes into Elasticsearch, and notifies the UI via **SignalR** when processing finishes.

## Repository layout

```
pdf-search-poc/
├── docker-compose.yml
├── storage/
│   └── pdfs/                    ← Host-mounted PDFs (mounted at /app/storage in the API)
├── backend/                     ← PdfSearch.Api (.NET 8)
│   ├── Dockerfile
│   ├── PdfSearch.Api.csproj
│   ├── Program.cs
│   ├── appsettings.json
│   ├── Controllers/
│   │   └── PdfController.cs
│   ├── Hubs/
│   │   └── PdfHub.cs
│   ├── Models/
│   ├── Services/
│   │   ├── Storage/             ← IFileStorageService / LocalFileStorageService
│   │   ├── Messaging/           ← RabbitMQ publisher
│   │   ├── PdfTextExtractorService.cs
│   │   └── ElasticsearchIndexService.cs
│   └── Workers/
│       └── PdfProcessingWorker.cs
└── frontend/                    ← React + Vite + TypeScript
    ├── Dockerfile
    └── src/
```

---

## Prerequisites

- Docker + Docker Compose
- (Optional) .NET 8 SDK and Node.js 20+ for local API and frontend development

---

## Run with Docker Compose

```bash
cd pdf-search-poc
docker compose up --build
```

Wait until healthchecks pass (first run may take 1–2 minutes).

| Service | URL / port |
|--------|------------|
| **Frontend** | http://localhost:3000 |
| **API (Swagger)** | http://localhost:5000/swagger |
| **Elasticsearch** | http://localhost:9200 |
| **Kibana** | http://localhost:5601 |
| **RabbitMQ (AMQP)** | `localhost:5672` |
| **RabbitMQ Management UI** | http://localhost:15672 (`guest` / `guest`) |

The API listens on **8080** inside the container; the host maps **5000 → 8080**.

### Stop

```bash
docker compose down
```

To remove Elasticsearch data as well:

```bash
docker compose down -v
```

---

## API examples (Postman or curl)

### Upload PDF

```
POST http://localhost:5000/api/pdf/upload
Body: form-data
  Key: file  (type File)
  Value: <select a .pdf>
```

**202 Accepted** response (queued processing):

```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "fileName": "contract.pdf",
  "status": "processing"
}
```

Text is indexed only after **PdfProcessingWorker** handles the message. The frontend subscribes to **SignalR** at `/hubs/pdf` (event `PdfProcessed`) for completion or failure.

### Search

```
GET http://localhost:5000/api/pdf/search?term=clause
```

Example response:

```json
[
  {
    "fileName": "contract.pdf",
    "path": "/app/storage/..._contract.pdf",
    "content": "...the <em>clause</em>..."
  }
]
```

---

## Kibana

1. Open http://localhost:5601  
2. **Management → Stack Management → Index Management** — index `pdfs`  
3. **Analytics → Discover** — create a Data View on `pdfs`  
4. **Dev Tools** sample:

```
GET pdfs/_search
{
  "query": {
    "match": {
      "content": "your term here"
    }
  }
}
```

---

## Swapping storage (local → cloud)

`IFileStorageService` isolates storage.

1. Implement something like `S3FileStorageService : IFileStorageService`.  
2. In `Program.cs`, switch registration:

```csharp
builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
// →
builder.Services.AddSingleton<IFileStorageService, S3FileStorageService>();
```

Same idea for Azure Blob or MinIO.

---

## Local development (without full Docker stack)

1. Start infrastructure only. `appsettings.Development.json` sets `RabbitMq:Host` to `localhost` so the API can reach the broker published by Compose:

```bash
docker compose up elasticsearch kibana rabbitmq
```

2. API (`backend` folder):

```bash
cd backend
dotnet run
```

Default URL: `http://localhost:5000` (Development). Use `Elasticsearch__Uri`, `RabbitMq__Host`, etc. to override settings.

3. Frontend (`frontend` folder):

```bash
cd frontend
npm install
npm run dev
```

Vite runs on port **3000** and proxies `/api` and `/hubs` to `http://localhost:5000` (`vite.config.ts`), matching API CORS for `http://localhost:3000`.

---

Portuguese documentation: [README.md](README.md).
