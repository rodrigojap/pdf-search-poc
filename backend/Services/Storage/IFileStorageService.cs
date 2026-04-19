namespace PdfSearch.Api.Services.Storage;

public interface IFileStorageService
{
    Task<string> SaveAsync(IFormFile file);
    Task<Stream> GetAsync(string path);
    Task DeleteAsync(string path);
}
