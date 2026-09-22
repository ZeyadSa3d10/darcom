using Application.DTOs;
using Domain.Enums;
using FluentValidation;

namespace Application.Validators;

public sealed class PropertyQueryValidator : AbstractValidator<PropertyQuery>
{
    private static readonly string[] Sorts = { "newest", "price_asc", "price_desc", "area_desc" };
    private static readonly string[] Purposes = { "sale", "rent", "investment" };

    public PropertyQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50);
        RuleFor(x => x.Sort)
            .Must(s => string.IsNullOrWhiteSpace(s) || Sorts.Contains(s.Trim().ToLowerInvariant()))
            .WithMessage($"Sort must be one of: {string.Join(", ", Sorts)}.");
        RuleFor(x => x.Purpose)
            .Must(p => string.IsNullOrWhiteSpace(p) || Purposes.Contains(p.Trim().ToLowerInvariant()))
            .WithMessage("Purpose must be sale, rent or investment.");
        RuleFor(x => x)
            .Must(q => q.MinPrice is null || q.MaxPrice is null || q.MinPrice <= q.MaxPrice)
            .WithMessage("MinPrice must not exceed MaxPrice.");
        RuleFor(x => x.Bedrooms).GreaterThanOrEqualTo(0).When(x => x.Bedrooms.HasValue);
        RuleFor(x => x.Bathrooms).GreaterThanOrEqualTo(0).When(x => x.Bathrooms.HasValue);
    }
}

public sealed class CreatePropertyValidator : AbstractValidator<CreatePropertyRequest>
{
    public CreatePropertyValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(20000).When(x => x.Description is not null);
        RuleFor(x => x.PropertyTypeId).GreaterThan(0);
        RuleFor(x => x.Purpose)
            .Must(p => Enum.TryParse<PropertyPurpose>(p, true, out _))
            .WithMessage("Purpose must be Sale, Rent or Investment.");
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.Currency).MaximumLength(8).When(x => x.Currency is not null);
        RuleFor(x => x.Area).GreaterThan(0).When(x => x.Area.HasValue);
        RuleFor(x => x.Bedrooms).GreaterThanOrEqualTo(0).When(x => x.Bedrooms.HasValue);
        RuleFor(x => x.Bathrooms).GreaterThanOrEqualTo(0).When(x => x.Bathrooms.HasValue);
        RuleFor(x => x.LocationId).GreaterThan(0);
        RuleFor(x => x.Address).MaximumLength(300).When(x => x.Address is not null);
        RuleFor(x => x.Developer).MaximumLength(160).When(x => x.Developer is not null);
    }
}

public sealed class UpdatePropertyValidator : AbstractValidator<UpdatePropertyRequest>
{
    public UpdatePropertyValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200).When(x => x.Title is not null);
        RuleFor(x => x.Description).MaximumLength(20000).When(x => x.Description is not null);
        RuleFor(x => x.PropertyTypeId).GreaterThan(0).When(x => x.PropertyTypeId.HasValue);
        RuleFor(x => x.Purpose)
            .Must(p => Enum.TryParse<PropertyPurpose>(p!, true, out _))
            .When(x => x.Purpose is not null)
            .WithMessage("Purpose must be Sale, Rent or Investment.");
        RuleFor(x => x.Price).GreaterThan(0).When(x => x.Price.HasValue);
        RuleFor(x => x.Area).GreaterThan(0).When(x => x.Area.HasValue);
        RuleFor(x => x.LocationId).GreaterThan(0).When(x => x.LocationId.HasValue);
        RuleFor(x => x.Status)
            .Must(s => Enum.TryParse<PropertyStatus>(s!.Replace(" ", ""), true, out _))
            .When(x => x.Status is not null)
            .WithMessage("Status value is invalid.");
    }
}
