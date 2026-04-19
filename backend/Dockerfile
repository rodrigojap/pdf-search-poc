# ── Build stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["PdfSearch.Api.csproj", "."]
RUN dotnet restore "PdfSearch.Api.csproj"

COPY . .
RUN dotnet publish "PdfSearch.Api.csproj" -c Release -o /app/publish --no-restore

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

RUN mkdir -p /app/storage

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "PdfSearch.Api.dll"]
