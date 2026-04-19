using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using PdfSearch.Api.Hubs;
using PdfSearch.Api.Models;
using PdfSearch.Api.Services;
using PdfSearch.Api.Services.Storage;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace PdfSearch.Api.Workers;

public sealed class PdfProcessingWorker : BackgroundService
{
    private readonly IConfiguration _config;
    private readonly IServiceProvider _services;
    private readonly ILogger<PdfProcessingWorker> _logger;
    private IConnection? _connection;
    private IModel? _channel;

    public PdfProcessingWorker(
        IConfiguration config,
        IServiceProvider services,
        ILogger<PdfProcessingWorker> logger)
    {
        _config   = config;
        _services = services;
        _logger   = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await ConnectWithRetryAsync(stoppingToken);
        if (stoppingToken.IsCancellationRequested) return;

        var queueName = _config["RabbitMq:QueueName"] ?? "pdf-processing";
        _channel!.BasicQos(0, 1, false);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += async (_, ea) =>
        {
            var body    = Encoding.UTF8.GetString(ea.Body.ToArray());
            var message = JsonSerializer.Deserialize<PdfUploadMessage>(body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (message is not null)
                await ProcessMessageAsync(message);

            _channel.BasicAck(ea.DeliveryTag, false);
        };

        _channel.BasicConsume(queueName, autoAck: false, consumer: consumer);
        await Task.Delay(Timeout.Infinite, stoppingToken).ConfigureAwait(false);
    }

    private async Task ProcessMessageAsync(PdfUploadMessage message)
    {
        using var scope  = _services.CreateScope();
        var storage      = scope.ServiceProvider.GetRequiredService<IFileStorageService>();
        var extractor    = scope.ServiceProvider.GetRequiredService<PdfTextExtractorService>();
        var indexService = scope.ServiceProvider.GetRequiredService<ElasticsearchIndexService>();
        var hub          = scope.ServiceProvider.GetRequiredService<IHubContext<PdfHub>>();

        try
        {
            string content;
            await using (var stream = await storage.GetAsync(message.StoragePath))
                content = extractor.Extract(stream);

            var document = new PdfDocument
            {
                Id         = message.JobId,
                FileName   = message.FileName,
                Path       = message.StoragePath,
                Content    = content,
                UploadedAt = DateTime.UtcNow,
            };

            await indexService.IndexDocumentAsync(document);

            await hub.Clients.All.SendAsync("PdfProcessed",
                new PdfProcessedEvent(message.JobId, message.FileName, "completed", content.Length));

            _logger.LogInformation("Processed {FileName} (job {JobId})", message.FileName, message.JobId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process job {JobId}", message.JobId);
            await hub.Clients.All.SendAsync("PdfProcessed",
                new PdfProcessedEvent(message.JobId, message.FileName, "failed", Error: ex.Message));
        }
    }

    private async Task ConnectWithRetryAsync(CancellationToken ct)
    {
        var factory = new ConnectionFactory
        {
            HostName               = _config["RabbitMq:Host"] ?? "rabbitmq",
            Port                   = int.Parse(_config["RabbitMq:Port"] ?? "5672"),
            UserName               = _config["RabbitMq:Username"] ?? "guest",
            Password               = _config["RabbitMq:Password"] ?? "guest",
            DispatchConsumersAsync = true,
        };

        var queueName = _config["RabbitMq:QueueName"] ?? "pdf-processing";

        while (!ct.IsCancellationRequested)
        {
            try
            {
                _connection = factory.CreateConnection();
                _channel    = _connection.CreateModel();
                _channel.QueueDeclare(queueName, durable: true, exclusive: false, autoDelete: false);
                _logger.LogInformation("Connected to RabbitMQ");
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "RabbitMQ not available, retrying in 5s...");
                await Task.Delay(5000, ct);
            }
        }
    }

    public override void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
        base.Dispose();
    }
}
