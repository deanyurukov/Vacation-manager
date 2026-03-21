namespace VacationManager.Api.Infrastructure;

public sealed class FileStorageOptions
{
    public const string SectionName = "FileStorage";

    public string SickNotesPath { get; set; } = "Uploads/sick-notes";
}
