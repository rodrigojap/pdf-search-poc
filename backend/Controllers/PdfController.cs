using Microsoft.AspNetCore.Mvc;
using PdfSearch.Api.Models;
using PdfSearch.Api.Services;
using PdfSearch.Api.Services.Messaging;
using PdfSearch.Api.Services.Storage;

namespace PdfSearch.Api.Controllers;

[ApiController]
[Route("api/pdf")]
[Produces("application/json")]
public class PdfController : ControllerBase
{
    private readonly IFileStorageService _storage;
    private readonly IRabbitMqPublisher _publisher;
    private readonly ElasticsearchIndexService _indexService;
    private readonly ILogger<PdfController> _logger;

    public PdfController(
        IFileStorageService storage,
        IRabbitMqPublisher publisher,
        ElasticsearchIndexService indexService,
        ILogger<PdfController> logger)
    {
        _storage      = storage;
        _publisher    = publisher;
        _indexService = indexService;
        _logger       = logger;
    }

    /// <summary>
    /// Saves the PDF and enqueues it for async processing. Returns 202 immediately.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(UploadAcceptedResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Only PDF files are supported." });

        try
        {
            var jobId       = Guid.NewGuid().ToString();
            var storagePath = await _storage.SaveAsync(file);

            await _publisher.PublishAsync(new PdfUploadMessage(jobId, storagePath, file.FileName));

            return Accepted(new UploadAcceptedResponse
            {
                JobId    = jobId,
                FileName = file.FileName,
                Status   = "processing",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error queuing upload for {FileName}", file.FileName);
            return StatusCode(500, new { error = "Error queuing file." });
        }
    }

    /// <summary>
    /// Full-text search across all indexed PDFs.
    /// </summary>
    [HttpGet("search")]
    [ProducesResponseType(typeof(IReadOnlyList<SearchResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search([FromQuery] string term)
    {
        if (string.IsNullOrWhiteSpace(term))
            return BadRequest(new { error = "Search term is required." });

        try
        {
            var results = await _indexService.SearchAsync(term);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Search error for '{Term}'", term);
            return StatusCode(500, new { error = "Error performing search." });
        }
    }
}
