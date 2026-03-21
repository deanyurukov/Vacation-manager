using System.ComponentModel.DataAnnotations;

namespace VacationManager.Api.Models.Entities;

public sealed class Project : BaseEntity
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    public List<string> TeamIds { get; set; } = new();
}
