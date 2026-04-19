using Microsoft.AspNetCore.Mvc;
using PdfSearch.Api.Models;
using PdfSearch.Api.Services;
using PdfSearch.Api.Services.Storage;

namespace PdfSearch.Api.Controllers;

[ApiController]
[Route("api/pdf")]
[Produces("application/json")]
public class PdfController : ControllerBase
{
    private readonly IFileStorageService _storage;
    private readonly PdfTextExtractorService _extractor;
    private readonly ElasticsearchIndexService _indexService;
    private readonly ILogger<PdfController> _logger;

    public PdfController(
        IFileStorageService storage,
        PdfTextExtractorService extractor,
        ElasticsearchIndexService indexService,
        ILogger<PdfController> logger)
    {
        _storage = storage;
        _extractor = extractor;
        _indexService = indexService;
        _logger = logger;
    }

    /// <summary>
    /// Upload a PDF, extract its text and index in Elasticsearch.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50 MB
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(UploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Only PDF files are supported." });

        try
        {
            var storagePath = await _storage.SaveAsync(file);

            string content;
            await using (var stream = await _storage.GetAsync(storagePath))
            {
                content = _extractor.Extract(stream);
            }

            var document = new PdfDocument
            {
                FileName = file.FileName,
                Path = storagePath,
                Content = content,
                UploadedAt = DateTime.UtcNow
            };

            await _indexService.IndexDocumentAsync(document);

            return Ok(new UploadResponse
            {
                Id = document.Id,
                FileName = document.FileName,
                Path = document.Path,
                UploadedAt = document.UploadedAt,
                ExtractedCharacters = content.Length
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing upload for file {FileName}", file.FileName);
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Error processing file." });
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
            _logger.LogError(ex, "Search error for term '{Term}'", term);
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Error performing search." });
        }
    }
}
