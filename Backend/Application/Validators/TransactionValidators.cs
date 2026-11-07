using Application.DTOs;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;

namespace Application.Validators;

public sealed class CreatePurchaseValidator : AbstractValidator<CreatePurchaseRequest>
{
    public CreatePurchaseValidator()
    {
        RuleFor(x => x.PropertyId).GreaterThan(0);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(160);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(32);
        RuleFor(x => x.Country).MaximumLength(80).When(x => x.Country is not null);
        RuleFor(x => x.City).MaximumLength(120).When(x => x.City is not null);
        RuleFor(x => x.NationalId).MaximumLength(64).When(x => x.NationalId is not null);
        RuleFor(x => x.PreferredContact).MaximumLength(32).When(x => x.PreferredContact is not null);
        RuleFor(x => x.Address).MaximumLength(300).When(x => x.Address is not null);
        RuleFor(x => x.Notes).MaximumLength(5000).When(x => x.Notes is not null);
        RuleFor(x => x.PaymentMethod).MaximumLength(64).When(x => x.PaymentMethod is not null);
        RuleFor(x => x.Timeline).MaximumLength(120).When(x => x.Timeline is not null);
        RuleFor(x => x.PreferredAppointment).GreaterThan(DateTime.UtcNow.AddMinutes(-5))
            .When(x => x.PreferredAppointment.HasValue)
            .WithMessage("Preferred appointment must be in the future.");
    }
}

public sealed class CreateBookingValidator : AbstractValidator<CreateBookingRequest>
{
    public CreateBookingValidator()
    {
        RuleFor(x => x.PropertyId).GreaterThan(0);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(160);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(32);
        RuleFor(x => x.StartDate).NotEmpty().WithMessage("Start date is required.");
        RuleFor(x => x.EndDate).NotEmpty().WithMessage("End date is required.");
        RuleFor(x => x)
            .Must(b => !b.StartDate.HasValue || !b.EndDate.HasValue || b.EndDate.Value > b.StartDate.Value)
            .WithMessage("End date must be after start date.");
        RuleFor(x => x.Duration).MaximumLength(64).When(x => x.Duration is not null);
        RuleFor(x => x.Notes).MaximumLength(5000).When(x => x.Notes is not null);
    }
}

public sealed class UpdateRequestStatusValidator : AbstractValidator<UpdateRequestStatusRequest>
{
    public UpdateRequestStatusValidator()
    {
        RuleFor(x => x.Status)
            .Must(s => Enum.TryParse<RequestStatus>(s.Replace(" ", ""), true, out _))
            .WithMessage("Status value is invalid.");
        RuleFor(x => x.AdminNotes).MaximumLength(5000).When(x => x.AdminNotes is not null);
    }
}

public sealed class SellerSubmissionValidator : AbstractValidator<SellerSubmissionRequest>
{
    public SellerSubmissionValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(20000).When(x => x.Description is not null);
        RuleFor(x => x.PropertyTypeId).GreaterThan(0);
        RuleFor(x => x.Purpose)
            .Must(p => Enum.TryParse<PropertyPurpose>(p, true, out _))
            .WithMessage("Purpose must be Sale, Rent or Investment.");
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.LocationId).GreaterThan(0);
        RuleFor(x => x.BuildingNumber).MaximumLength(50).When(x => x.BuildingNumber is not null);
        RuleFor(x => x.Area).GreaterThan(0).When(x => x.Area.HasValue);
        RuleFor(x => x.ContactPhone).MaximumLength(32).When(x => x.ContactPhone is not null);
        RuleFor(x => x.AmenityIds.Count).LessThanOrEqualTo(40);
        RuleFor(x => x.Features.Count).LessThanOrEqualTo(40);
        RuleFor(x => x.Images.Count).LessThanOrEqualTo(30);
        RuleFor(x => x.Videos.Count).LessThanOrEqualTo(10);
        RuleForEach(x => x.Images).ChildRules(img =>
        {
            img.RuleFor(i => i.Url).NotEmpty().MaximumLength(1000).Must(BeHttpUrl).WithMessage("Image URL must be http(s).");
            img.RuleFor(i => i.AltText).MaximumLength(250).When(i => i.AltText is not null);
        });
        RuleForEach(x => x.Videos).ChildRules(v =>
        {
            v.RuleFor(i => i.Url).NotEmpty().MaximumLength(1000).Must(BeHttpUrl).WithMessage("Video URL must be http(s).");
            v.RuleFor(i => i.Type).MaximumLength(64).When(i => i.Type is not null);
        });
    }

    private static bool BeHttpUrl(string url)
        => Uri.TryCreate(url, UriKind.Absolute, out var u)
            && (u.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps);
}

public sealed class RegisterBrokerValidator : AbstractValidator<RegisterBrokerRequest>
{
    public RegisterBrokerValidator()
    {
        RuleFor(x => x.AgencyName).NotEmpty().MaximumLength(160);
        RuleFor(x => x.LicenseNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NationalId).MaximumLength(64).When(x => x.NationalId is not null);
        RuleFor(x => x.DocumentUrl).MaximumLength(1000).When(x => x.DocumentUrl is not null);
    }
}

public sealed class CreateBrokerPropertyRequestValidator : AbstractValidator<CreateBrokerPropertyRequest>
{
    public CreateBrokerPropertyRequestValidator()
    {
        RuleFor(x => x.PropertyId).GreaterThan(0);
        RuleFor(x => x.ClientName).NotEmpty().MaximumLength(160);
        RuleFor(x => x.ClientPhone).NotEmpty().MaximumLength(32);
        RuleFor(x => x.Purpose)
            .Must(p => Enum.TryParse<PropertyPurpose>(p, true, out _))
            .WithMessage("Purpose must be Sale, Rent or Investment.");
        RuleFor(x => x)
            .Must(b => !b.StartDate.HasValue || !b.EndDate.HasValue || b.EndDate.Value > b.StartDate.Value)
            .WithMessage("End date must be after start date.");
        RuleFor(x => x.Notes).MaximumLength(2000).When(x => x.Notes is not null);
    }
}

public sealed class BrokerPropertySubmissionValidator : AbstractValidator<BrokerPropertySubmissionRequest>
{
    public BrokerPropertySubmissionValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(20000).When(x => x.Description is not null);
        RuleFor(x => x.PropertyTypeId).GreaterThan(0);
        RuleFor(x => x.VillageId).GreaterThan(0).WithMessage("Village is required for North Coast properties.");
        RuleFor(x => x.Purpose)
            .Must(p => Enum.TryParse<PropertyPurpose>(p, true, out _))
            .WithMessage("Purpose must be Sale or Rent.");
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.BuildingNumber).MaximumLength(64).When(x => x.BuildingNumber is not null);
        RuleFor(x => x.Area).GreaterThan(0).When(x => x.Area.HasValue);
        RuleFor(x => x.ContactPhone).MaximumLength(32).When(x => x.ContactPhone is not null);
    }
}

public sealed class CreatePropertyRequirementValidator : AbstractValidator<CreatePropertyRequirementRequest>
{
    public CreatePropertyRequirementValidator()
    {
        RuleFor(x => x.CustomerName).NotEmpty().MaximumLength(160);
        RuleFor(x => x.CustomerEmail).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.CustomerPhone).NotEmpty().MaximumLength(32);
        RuleFor(x => x.Purpose)
            .Must(p => Enum.TryParse<PropertyPurpose>(p, true, out _))
            .WithMessage("Purpose must be Sale, Rent or Investment.");
        RuleFor(x => x.VillageId).GreaterThan(0).When(x => x.VillageId.HasValue);
        RuleFor(x => x.ZoneId).GreaterThan(0).When(x => x.ZoneId.HasValue);
        RuleFor(x => x.PropertyTypeId).GreaterThan(0).When(x => x.PropertyTypeId.HasValue);
        RuleFor(x => x.MinPrice).GreaterThanOrEqualTo(0).When(x => x.MinPrice.HasValue);
        RuleFor(x => x.MaxPrice).GreaterThanOrEqualTo(0).When(x => x.MaxPrice.HasValue);
        RuleFor(x => x)
            .Must(r => !r.MinPrice.HasValue || !r.MaxPrice.HasValue || r.MinPrice.Value <= r.MaxPrice.Value)
            .WithMessage("MinPrice cannot exceed MaxPrice.");
        RuleFor(x => x)
            .Must(r => !r.StartDate.HasValue || !r.EndDate.HasValue || r.EndDate.Value > r.StartDate.Value)
            .WithMessage("End date must be after start date.");
        RuleFor(x => x.DesiredAmenities).MaximumLength(1000).When(x => x.DesiredAmenities is not null);
        RuleFor(x => x.Notes).MaximumLength(3000).When(x => x.Notes is not null);
    }
}

public sealed class UpdateRequirementStatusValidator : AbstractValidator<UpdateRequirementStatusRequest>
{
    public UpdateRequirementStatusValidator()
    {
        RuleFor(x => x.Status)
            .Must(s => Enum.TryParse<RequestStatus>(s.Replace(" ", ""), true, out _))
            .WithMessage("Status value is invalid.");
        RuleFor(x => x.AssignedStaffId).GreaterThan(0).When(x => x.AssignedStaffId.HasValue);
    }
}

public sealed class CreateInquiryValidator : AbstractValidator<CreateInquiryRequest>
{
    public CreateInquiryValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(160);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Phone).MaximumLength(32).When(x => x.Phone is not null);
        RuleFor(x => x.Message).NotEmpty().MaximumLength(5000);
    }
}

public sealed class ContactValidator : AbstractValidator<ContactRequest>
{
    public ContactValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(160);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Phone).MaximumLength(32).When(x => x.Phone is not null);
        RuleFor(x => x.Subject).MaximumLength(200).When(x => x.Subject is not null);
        RuleFor(x => x.Message).NotEmpty().MaximumLength(5000);
    }
}

public sealed class AddFavoriteValidator : AbstractValidator<AddFavoriteRequest>
{
    public AddFavoriteValidator()
    {
        RuleFor(x => x.PropertyId).GreaterThan(0);
    }
}

public sealed class RejectPropertyValidator : AbstractValidator<RejectPropertyRequest>
{
    public RejectPropertyValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(2000);
    }
}

public sealed class SetBrokerStatusValidator : AbstractValidator<SetBrokerStatusRequest>
{
    public SetBrokerStatusValidator()
    {
        RuleFor(x => x.Status)
            .Must(s => Enum.TryParse<BrokerStatus>(s, true, out _))
            .WithMessage("Status must be Pending, Approved, Rejected or Suspended.");
        RuleFor(x => x.AdminNotes).MaximumLength(1000).When(x => x.AdminNotes is not null);
    }
}
