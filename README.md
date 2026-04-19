# PDF Search POC

Busca textual em PDFs com **.NET 8 + Elasticsearch 8 + Kibana + RabbitMQ + SignalR + React (Vite) + Docker Compose**.

O fluxo de upload é **assíncrono**: a API grava o arquivo, publica uma mensagem na fila e responde **202 Accepted** com um `jobId`. Um worker consome a fila, extrai o texto (PdfPig), indexa no Elasticsearch e notifica o frontend via **SignalR** quando o processamento termina.

## Estrutura

```
pdf-search-poc/
├── docker-compose.yml
├── storage/
│   └── pdfs/                    ← PDFs persistidos no host (montado em /app/storage na API)
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

## Pré-requisitos

- Docker + Docker Compose
- (Opcional) .NET 8 SDK e Node.js 20+ para desenvolvimento local da API e do frontend

---

## Como executar

### 1. Subir tudo via Docker Compose

```bash
cd pdf-search-poc
docker compose up --build
```

Aguarde os serviços dependentes de healthcheck ficarem prontos (primeira execução pode levar 1–2 minutos).

| Serviço | URL / porta |
|--------|-------------|
| **Frontend (UI)** | http://localhost:3000 |
| **API (Swagger)** | http://localhost:5000/swagger |
| **Elasticsearch** | http://localhost:9200 |
| **Kibana** | http://localhost:5601 |
| **RabbitMQ (AMQP)** | `localhost:5672` |
| **RabbitMQ Management UI** | http://localhost:15672 (usuário/senha: `guest` / `guest`) |

A API escuta **8080** dentro do container; o host mapeia **5000 → 8080**.

### 2. Parar

```bash
docker compose down
```

Para apagar também o volume de dados do Elasticsearch:

```bash
docker compose down -v
```

---

## Testar a API (Postman ou curl)

### Upload de PDF

```
POST http://localhost:5000/api/pdf/upload
Body: form-data
  Key: file  (tipo File)
  Value: <selecione um .pdf>
```

Resposta **202 Accepted** (processamento em fila):

```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "fileName": "contrato.pdf",
  "status": "processing"
}
```

O texto só aparece no Elasticsearch depois que o **PdfProcessingWorker** processar a mensagem. O frontend usa **SignalR** (`/hubs/pdf`, evento `PdfProcessed`) para atualizar o status quando a indexação concluir ou falhar.

### Busca textual

```
GET http://localhost:5000/api/pdf/search?term=cláusula
```

Resposta esperada:

```json
[
  {
    "fileName": "contrato.pdf",
    "path": "/app/storage/..._contrato.pdf",
    "content": "...a <em>cláusula</em>..."
  }
]
```

---

## Validar no Kibana

1. Acesse http://localhost:5601  
2. **Management → Stack Management → Index Management** — índice `pdfs`  
3. **Analytics → Discover** — crie um Data View para `pdfs`  
4. Em **Dev Tools**, exemplo:

```
GET pdfs/_search
{
  "query": {
    "match": {
      "content": "seu termo aqui"
    }
  }
}
```

---

## Trocar o storage (local → cloud)

O contrato `IFileStorageService` isola a implementação de armazenamento.

1. Implemente `S3FileStorageService : IFileStorageService` (ou Azure Blob, MinIO, etc.).  
2. Em `Program.cs`, troque o registro:

```csharp
builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
// →
builder.Services.AddSingleton<IFileStorageService, S3FileStorageService>();
```

---

## Desenvolvimento local (sem empacotar tudo em Docker)

1. Suba a infraestrutura (Elasticsearch, Kibana e RabbitMQ). O `appsettings.Development.json` usa `RabbitMq:Host` = `localhost` para falar com o broker exposto pelo Compose:

```bash
docker compose up elasticsearch kibana rabbitmq
```

2. API (na pasta `backend`):

```bash
cd backend
dotnet run
```

Por padrão a API usa `http://localhost:5000` (perfil Development). Variáveis no formato `Elasticsearch__Uri`, `RabbitMq__Host`, etc., sobrescrevem o `appsettings`.

3. Frontend (na pasta `frontend`):

```bash
cd frontend
npm install
npm run dev
```

O Vite usa a porta **3000** e faz proxy de `/api` e `/hubs` para `http://localhost:5000` (ver `vite.config.ts`), alinhado ao CORS da API (`http://localhost:3000`).

---

Documentação em inglês: [README.en.md](README.en.md).
