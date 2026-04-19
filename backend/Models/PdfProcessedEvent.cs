namespace PdfSearch.Api.Models;

public record PdfProcessedEvent(
    string JobId,
    string FileName,
    string Status,
    int ExtractedCharacters = 0,
    string? Error = null);
