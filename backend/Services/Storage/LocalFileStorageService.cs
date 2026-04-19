namespace PdfSearch.Api.Services.Storage;

// Swap this implementation for S3FileStorageService / AzureBlobStorageService when ready.
public class LocalFileStorageService : IFileStorageService
{
    private readonly string _basePath;
    private readonly ILogger<LocalFileStorageService> _logger;

    public LocalFileStorageService(IConfiguration configuration, ILogger<LocalFileStorageService> logger)
    {
        _basePath = configuration["Storage:BasePath"] ?? "/app/storage";
        _logger = logger;
        Directory.CreateDirectory(_basePath);
        _logger.LogInformation("LocalFileStorage initialized at: {BasePath}", _basePath);
    }

    public async Task<string> SaveAsync(IFormFile file)
    {
        var safeFileName = Path.GetFileName(file.FileName);
        var uniqueName = $"{Guid.NewGuid():N}_{safeFileName}";
        var fullPath = Path.Combine(_basePath, uniqueName);

        await using var stream = new FileStream(fullPath, FileMode.Create, FileAccess.Write);
        await file.CopyToAsync(stream);

        _logger.LogInformation("Saved file: {Path}", fullPath);
        return fullPath;
    }

    public Task<Stream> GetAsync(string path)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException($"File not found at: {path}");

        Stream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult(stream);
    }

    public Task DeleteAsync(string path)
    {
        if (File.Exists(path))
            File.Delete(path);

        return Task.CompletedTask;
    }
}
