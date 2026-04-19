namespace PdfSearch.Api.Models;

public class SearchResult
{
    public string FileName { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class UploadAcceptedResponse
{
    public string JobId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Status { get; set; } = "processing";
}
