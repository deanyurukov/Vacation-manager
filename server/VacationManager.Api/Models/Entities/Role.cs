using System.ComponentModel.DataAnnotations;

namespace VacationManager.Api.Models.Entities;

public sealed class Role : BaseEntity
{
    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string NormalizedName { get; set; } = string.Empty;
}
