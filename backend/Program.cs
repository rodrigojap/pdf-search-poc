using Elastic.Clients.Elasticsearch;
using PdfSearch.Api.Services;
using PdfSearch.Api.Services.Storage;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PDF Search API", Version = "v1" });
});

// Elasticsearch
var esUri = builder.Configuration["Elasticsearch:Uri"]
    ?? throw new InvalidOperationException("Elasticsearch:Uri is required.");

var esSettings = new ElasticsearchClientSettings(new Uri(esUri))
    .EnableDebugMode()
    .PrettyJson();

builder.Services.AddSingleton(new ElasticsearchClient(esSettings));

// Application services
builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
// To switch storage: replace the line above with:
//   builder.Services.AddSingleton<IFileStorageService, S3FileStorageService>();
//   builder.Services.AddSingleton<IFileStorageService, AzureBlobStorageService>();

builder.Services.AddSingleton<PdfTextExtractorService>();
builder.Services.AddSingleton<ElasticsearchIndexService>();

var app = builder.Build();

// Ensure index exists on startup
using (var scope = app.Services.CreateScope())
{
    var indexService = scope.ServiceProvider.GetRequiredService<ElasticsearchIndexService>();
    await indexService.EnsureIndexExistsAsync();
}

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "PDF Search API v1"));

app.UseHttpsRedirection();
app.MapControllers();

app.Run();
