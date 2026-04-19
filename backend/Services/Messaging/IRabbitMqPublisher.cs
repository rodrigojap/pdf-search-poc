using PdfSearch.Api.Models;

namespace PdfSearch.Api.Services.Messaging;

public interface IRabbitMqPublisher
{
    Task PublishAsync(PdfUploadMessage message);
}
