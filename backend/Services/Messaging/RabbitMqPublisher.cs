using System.Text;
using System.Text.Json;
using PdfSearch.Api.Models;
using RabbitMQ.Client;

namespace PdfSearch.Api.Services.Messaging;

public sealed class RabbitMqPublisher : IRabbitMqPublisher, IDisposable
{
    private readonly IConnection _connection;
    private readonly IModel _channel;
    private readonly string _queueName;

    public RabbitMqPublisher(IConfiguration config)
    {
        var factory = new ConnectionFactory
        {
            HostName = config["RabbitMq:Host"] ?? "rabbitmq",
            Port     = int.Parse(config["RabbitMq:Port"] ?? "5672"),
            UserName = config["RabbitMq:Username"] ?? "guest",
            Password = config["RabbitMq:Password"] ?? "guest",
        };

        _queueName  = config["RabbitMq:QueueName"] ?? "pdf-processing";
        _connection = factory.CreateConnection();
        _channel    = _connection.CreateModel();
        _channel.QueueDeclare(_queueName, durable: true, exclusive: false, autoDelete: false);
    }

    public Task PublishAsync(PdfUploadMessage message)
    {
        var body  = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));
        var props = _channel.CreateBasicProperties();
        props.Persistent = true;
        _channel.BasicPublish("", _queueName, props, body);
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
    }
}
