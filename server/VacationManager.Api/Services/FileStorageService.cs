using Microsoft.Extensions.Options;
using VacationManager.Api.Infrastructure;

namespace VacationManager.Api.Services;

public sealed class FileStorageService
{
    private readonly string _sickNotesPath;

    public FileStorageService(IWebHostEnvironment environment, IOptions<FileStorageOptions> options)
    {
        var relativePath = options.Value.SickNotesPath;
        _sickNotesPath = Path.Combine(environment.ContentRootPath, relativePath);
        Directory.CreateDirectory(_sickNotesPath);
    }

    public async Task<(string StoredFileName, string OriginalFileName, string ContentType)> SaveAsync(IFormFile file, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(file.FileName);
        var storedName = $"{Guid.NewGuid():N}{extension}";
        var path = Path.Combine(_sickNotesPath, storedName);

        await using var stream = File.Create(path);
        await file.CopyToAsync(stream, cancellationToken);

        return (storedName, file.FileName, file.ContentType);
    }

    public async Task<(byte[] Content, string ContentType, string FileName)?> ReadAsync(string storedFileName, string originalFileName, string? contentType, CancellationToken cancellationToken)
    {
        var path = Path.Combine(_sickNotesPath, storedFileName);
        if (!File.Exists(path))
        {
            return null;
        }

        var bytes = await File.ReadAllBytesAsync(path, cancellationToken);
        return (bytes, contentType ?? "application/octet-stream", originalFileName);
    }

    public Task DeleteAsync(string storedFileName)
    {
        var path = Path.Combine(_sickNotesPath, storedFileName);
        if (File.Exists(path))
        {
            File.Delete(path);
        }

        return Task.CompletedTask;
    }
}
