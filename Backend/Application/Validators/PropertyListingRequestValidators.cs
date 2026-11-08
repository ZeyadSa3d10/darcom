using Application.DTOs;
using Domain.Enums;
using FluentValidation;

namespace Application.Validators;

public sealed class CreatePropertyListingRequestValidator : AbstractValidator<CreatePropertyListingRequest>
{
    public CreatePropertyListingRequestValidator()
    {
        RuleFor(x => x.VillageId)
            .GreaterThan(0)
            .WithMessage("Village is required.");

        RuleFor(x => x.ZoneId)
            .GreaterThan(0)
            .WithMessage("Zone is required.");

        RuleFor(x => x.BuildingNumber)
            .NotEmpty().WithMessage("Building number is required.")
            .MaximumLength(64).WithMessage("Building number cannot exceed 64 characters.");

        RuleFor(x => x.UnitNumber)
            .NotEmpty().WithMessage("Property / Unit number is required.")
            .MaximumLength(64).WithMessage("Property / Unit number cannot exceed 64 characters.");

        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Phone number is required.")
            .MaximumLength(32).WithMessage("Phone number cannot exceed 32 characters.")
            .Matches(@"^\+?[0-9\s\-()]{8,20}$").WithMessage("Please enter a valid phone number.");
    }
}

public sealed class UpdateListingRequestStatusValidator : AbstractValidator<UpdateListingRequestStatusRequest>
{
    public UpdateListingRequestStatusValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty().WithMessage("Status is required.")
            .Must(s => Enum.TryParse<ListingRequestStatus>(s, true, out _))
            .WithMessage("Status must be one of: Pending, Contacted, InspectionScheduled, Inspected, Completed, Rejected.");

        RuleFor(x => x.AdminNotes)
            .MaximumLength(2000).When(x => !string.IsNullOrEmpty(x.AdminNotes));
    }
}

