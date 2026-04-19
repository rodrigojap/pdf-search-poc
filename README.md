# PDF Search POC

Busca textual em PDFs com **.NET 8 + Elasticsearch 8 + Kibana + Docker Compose**.

## Estrutura

```
pdf-search-poc/
├── docker-compose.yml
├── storage/
│   └── pdfs/                          ← PDFs persistidos no host
└── src/
    └── PdfSearch.Api/
        ├── Dockerfile
        ├── PdfSearch.Api.csproj
        ├── Program.cs
        ├── appsettings.json
        ├── Controllers/
        │   └── PdfController.cs
        ├── Models/
        │   ├── PdfDocument.cs
        │   └── SearchResult.cs
        └── Services/
            ├── Storage/
            │   ├── IFileStorageService.cs     ← contrato de storage
            │   └── LocalFileStorageService.cs ← impl. local
            ├── PdfTextExtractorService.cs     ← PdfPig
            └── ElasticsearchIndexService.cs   ← indexação e busca
```

---

## Pré-requisitos

- Docker + Docker Compose
- (Opcional para dev local) .NET 8 SDK

---

## Como executar

### 1. Subir tudo via Docker Compose

```bash
cd pdf-search-poc
docker compose up --build
```

Aguarde os 3 serviços ficarem saudáveis (≈ 30–60s na primeira vez).

| Serviço       | URL                          |
|---------------|------------------------------|
| API (Swagger) | http://localhost:5000/swagger |
| Elasticsearch | http://localhost:9200         |
| Kibana        | http://localhost:5601         |

### 2. Parar

```bash
docker compose down
```

Para apagar também os dados do Elasticsearch:

```bash
docker compose down -v
```

---

## Testar via Postman

### Upload de PDF

```
POST http://localhost:5000/api/pdf/upload
Body: form-data
  Key: file  (tipo File)
  Value: <selecione um .pdf>
```

Resposta esperada:
```json
{
  "id": "abc123",
  "fileName": "contrato.pdf",
  "path": "/app/storage/abc123_contrato.pdf",
  "uploadedAt": "2024-01-15T10:30:00Z",
  "extractedCharacters": 4521
}
```

### Busca textual

```
GET http://localhost:5000/api/pdf/search?term=cláusula
```

Resposta esperada:
```json
[
  {
    "fileName": "contrato.pdf",
    "path": "/app/storage/abc123_contrato.pdf",
    "content": "...a <em>cláusula</em> 5ª estabelece que..."
  }
]
```

---

## Validar no Kibana

1. Acesse http://localhost:5601
2. Vá em **Management → Stack Management → Index Management**
   - Você verá o índice `pdfs`
3. Vá em **Analytics → Discover**
   - Crie um Data View apontando para `pdfs`
   - Explore os documentos indexados
4. Para query manual, vá em **Dev Tools** e execute:

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

## Trocar o Storage (local → cloud)

O contrato `IFileStorageService` isola completamente a implementação de storage.

Para migrar para S3, basta:

1. Criar `S3FileStorageService : IFileStorageService`
2. Em `Program.cs`, substituir:
   ```csharp
   // antes
   builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
   // depois
   builder.Services.AddSingleton<IFileStorageService, S3FileStorageService>();
   ```

O mesmo vale para Azure Blob ou MinIO.

---

## Desenvolvimento local (sem Docker)

```bash
# 1. Suba apenas o Elasticsearch e Kibana
docker compose up elasticsearch kibana

# 2. Rode a API localmente
cd src/PdfSearch.Api
dotnet run
```

A API estará em http://localhost:5000.
