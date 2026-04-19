namespace PdfSearch.Api.Models;

public class SearchResult
{
    public string FileName { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class UploadResponse
{
    public string Id { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public int ExtractedCharacters { get; set; }
}
