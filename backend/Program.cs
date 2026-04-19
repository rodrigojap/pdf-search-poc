using Elastic.Clients.Elasticsearch;
using PdfSearch.Api.Hubs;
using PdfSearch.Api.Services;
using PdfSearch.Api.Services.Messaging;
using PdfSearch.Api.Services.Storage;
using PdfSearch.Api.Workers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PDF Search API", Version = "v1" });
});

builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy
            .WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
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
builder.Services.AddSingleton<PdfTextExtractorService>();
builder.Services.AddSingleton<ElasticsearchIndexService>();

// Messaging
builder.Services.AddSingleton<IRabbitMqPublisher, RabbitMqPublisher>();
builder.Services.AddHostedService<PdfProcessingWorker>();

var app = builder.Build();

// Ensure Elasticsearch index exists on startup
using (var scope = app.Services.CreateScope())
{
    var indexService = scope.ServiceProvider.GetRequiredService<ElasticsearchIndexService>();
    await indexService.EnsureIndexExistsAsync();
}

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "PDF Search API v1"));

app.UseCors();
app.MapControllers();
app.MapHub<PdfHub>("/hubs/pdf");

app.Run();
