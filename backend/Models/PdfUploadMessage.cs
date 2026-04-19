namespace PdfSearch.Api.Models;

public record PdfUploadMessage(string JobId, string StoragePath, string FileName);
