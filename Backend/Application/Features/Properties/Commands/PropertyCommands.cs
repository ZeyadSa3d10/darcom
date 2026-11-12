using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using FluentValidation;
using MediatR;

namespace Application.Features.Properties.Commands;

// ---------- Create Property ----------

public sealed record CreatePropertyCommand(int UserId, string Role, CreatePropertyRequest Request)
    : ICommand<PropertyDetailsDto>;

public sealed class CreatePropertyCommandValidator : AbstractValidator<CreatePropertyCommand>
{
    public CreatePropertyCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new CreatePropertyValidator());
    }
}

public sealed class CreatePropertyCommandHandler
    : IRequestHandler<CreatePropertyCommand, ServiceResult<PropertyDetailsDto>>
{
    private readonly IPropertyService _properties;
    private readonly IAdminRealtimeNotifier _notifier;

    public CreatePropertyCommandHandler(IPropertyService properties, IAdminRealtimeNotifier notifier)
    {
        _properties = properties;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PropertyDetailsDto>> Handle(
        CreatePropertyCommand cmd, CancellationToken ct)
    {
        var result = await _properties.CreateAsync(cmd.UserId, cmd.Role, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "property.created",
                "New Property Created",
                $"Property '{result.Data.Title}' ({result.Data.ReferenceNumber}) was created.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "Property",
                eventKey: $"property:created:{result.Data.Id}",
                ct: ct);
        }
        return result;
    }
}

// ---------- Update Property ----------

public sealed record UpdatePropertyCommand(int UserId, bool IsAdmin, int PropertyId, UpdatePropertyRequest Request)
    : ICommand<PropertyDetailsDto>;

public sealed class UpdatePropertyCommandValidator : AbstractValidator<UpdatePropertyCommand>
{
    public UpdatePropertyCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.PropertyId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new UpdatePropertyValidator());
    }
}

public sealed class UpdatePropertyCommandHandler
    : IRequestHandler<UpdatePropertyCommand, ServiceResult<PropertyDetailsDto>>
{
    private readonly IPropertyService _properties;
    private readonly IAdminRealtimeNotifier _notifier;

    public UpdatePropertyCommandHandler(IPropertyService properties, IAdminRealtimeNotifier notifier)
    {
        _properties = properties;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PropertyDetailsDto>> Handle(
        UpdatePropertyCommand cmd, CancellationToken ct)
    {
        var result = await _properties.UpdateAsync(cmd.UserId, cmd.IsAdmin, cmd.PropertyId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            var eventType = !string.IsNullOrWhiteSpace(cmd.Request.Status)
                ? "property.status.changed"
                : "property.updated";
            var title = eventType == "property.status.changed"
                ? "Property Status Updated"
                : "Property Updated";

            await _notifier.NotifyAdminsAsync(
                eventType,
                title,
                $"Property '{result.Data.Title}' ({result.Data.ReferenceNumber}) updated (status: {result.Data.Status}).",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "Property",
                ct: ct);
        }
        return result;
    }
}

// ---------- Delete Property ----------

public sealed record DeletePropertyCommand(int UserId, bool IsAdmin, int PropertyId)
    : ICommand<object?>;

public sealed class DeletePropertyCommandValidator : AbstractValidator<DeletePropertyCommand>
{
    public DeletePropertyCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.PropertyId).GreaterThan(0);
    }
}

public sealed class DeletePropertyCommandHandler
    : IRequestHandler<DeletePropertyCommand, ServiceResult<object?>>
{
    private readonly IPropertyService _properties;
    private readonly IAdminRealtimeNotifier _notifier;

    public DeletePropertyCommandHandler(IPropertyService properties, IAdminRealtimeNotifier notifier)
    {
        _properties = properties;
        _notifier = notifier;
    }

    public async Task<ServiceResult<object?>> Handle(DeletePropertyCommand cmd, CancellationToken ct)
    {
        var result = await _properties.DeleteAsync(cmd.UserId, cmd.IsAdmin, cmd.PropertyId, ct);
        if (result.Succeeded)
        {
            await _notifier.NotifyAdminsAsync(
                "property.status.changed",
                "Property Deleted",
                $"Property #{cmd.PropertyId} was deleted.",
                relatedEntityId: cmd.PropertyId,
                relatedEntityType: "Property",
                eventKey: $"property:deleted:{cmd.PropertyId}",
                ct: ct);
        }
        return result;
    }
}

// ---------- Approve / Reject Seller Property ----------

public sealed record ApprovePropertyCommand(int AdminId, int PropertyId, string? IpAddress)
    : ICommand<PropertyDetailsDto>;

public sealed class ApprovePropertyCommandValidator : AbstractValidator<ApprovePropertyCommand>
{
    public ApprovePropertyCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.PropertyId).GreaterThan(0);
    }
}

public sealed class ApprovePropertyCommandHandler
    : IRequestHandler<ApprovePropertyCommand, ServiceResult<PropertyDetailsDto>>
{
    private readonly ISellerService _seller;
    private readonly IAdminRealtimeNotifier _notifier;

    public ApprovePropertyCommandHandler(ISellerService seller, IAdminRealtimeNotifier notifier)
    {
        _seller = seller;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PropertyDetailsDto>> Handle(
        ApprovePropertyCommand cmd, CancellationToken ct)
    {
        var result = await _seller.ApproveAsync(cmd.AdminId, cmd.PropertyId, cmd.IpAddress, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "property.status.changed",
                "Property Approved",
                $"Property '{result.Data.Title}' ({result.Data.ReferenceNumber}) was published.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "Property",
                eventKey: $"property:approved:{result.Data.Id}:{result.Data.Status}",
                ct: ct);
        }
        return result;
    }
}

public sealed record RejectPropertyCommand(int AdminId, int PropertyId, string Reason, string? IpAddress)
    : ICommand<PropertyDetailsDto>;

public sealed class RejectPropertyCommandValidator : AbstractValidator<RejectPropertyCommand>
{
    public RejectPropertyCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.PropertyId).GreaterThan(0);
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
    }
}

public sealed class RejectPropertyCommandHandler
    : IRequestHandler<RejectPropertyCommand, ServiceResult<PropertyDetailsDto>>
{
    private readonly ISellerService _seller;
    private readonly IAdminRealtimeNotifier _notifier;

    public RejectPropertyCommandHandler(ISellerService seller, IAdminRealtimeNotifier notifier)
    {
        _seller = seller;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PropertyDetailsDto>> Handle(
        RejectPropertyCommand cmd, CancellationToken ct)
    {
        var result = await _seller.RejectAsync(cmd.AdminId, cmd.PropertyId, cmd.Reason, cmd.IpAddress, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "property.status.changed",
                "Property Rejected",
                $"Property '{result.Data.Title}' ({result.Data.ReferenceNumber}) was rejected.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "Property",
                ct: ct);
        }
        return result;
    }
}

// ---------- Admin Rental Periods ----------

public sealed record AddRentalPeriodCommand(int AdminId, int PropertyId, CreateRentalPeriodRequest Request)
    : ICommand<RentalPeriodDto>;

public sealed class AddRentalPeriodCommandValidator : AbstractValidator<AddRentalPeriodCommand>
{
    public AddRentalPeriodCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.PropertyId).GreaterThan(0);
        RuleFor(x => x.Request).NotNull();
        RuleFor(x => x.Request.RenterName).NotEmpty().MaximumLength(160).When(x => x.Request is not null);
        RuleFor(x => x.Request.EndDate).GreaterThan(x => x.Request.StartDate)
            .WithMessage("End date must be after start date.")
            .When(x => x.Request is not null);
    }
}

public sealed class AddRentalPeriodCommandHandler
    : IRequestHandler<AddRentalPeriodCommand, ServiceResult<RentalPeriodDto>>
{
    private readonly IPropertyService _properties;
    private readonly IAdminRealtimeNotifier _notifier;

    public AddRentalPeriodCommandHandler(IPropertyService properties, IAdminRealtimeNotifier notifier)
    {
        _properties = properties;
        _notifier = notifier;
    }

    public async Task<ServiceResult<RentalPeriodDto>> Handle(
        AddRentalPeriodCommand cmd, CancellationToken ct)
    {
        var result = await _properties.AddAdminRentalPeriodAsync(cmd.AdminId, cmd.PropertyId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "property.updated",
                "Rental Period Blocked",
                $"Rental period blocked on property #{cmd.PropertyId} ({result.Data.StartDate:yyyy-MM-dd} to {result.Data.EndDate:yyyy-MM-dd}).",
                relatedEntityId: cmd.PropertyId,
                relatedEntityType: "Property",
                ct: ct);
        }
        return result;
    }
}

public sealed record DeleteRentalPeriodCommand(int AdminId, int PropertyId, int PeriodId)
    : ICommand<object?>;

public sealed class DeleteRentalPeriodCommandHandler
    : IRequestHandler<DeleteRentalPeriodCommand, ServiceResult<object?>>
{
    private readonly IPropertyService _properties;

    public DeleteRentalPeriodCommandHandler(IPropertyService properties)
    {
        _properties = properties;
    }

    public Task<ServiceResult<object?>> Handle(DeleteRentalPeriodCommand cmd, CancellationToken ct)
        => _properties.DeleteAdminRentalPeriodAsync(cmd.AdminId, cmd.PropertyId, cmd.PeriodId, ct);
}

// ---------- Seller Submissions ----------

public sealed record SubmitSellerPropertyCommand(int UserId, string Role, SellerSubmissionRequest Request)
    : ICommand<PropertyDetailsDto>;

public sealed class SubmitSellerPropertyCommandValidator : AbstractValidator<SubmitSellerPropertyCommand>
{
    public SubmitSellerPropertyCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new SellerSubmissionValidator());
    }
}

public sealed class SubmitSellerPropertyCommandHandler
    : IRequestHandler<SubmitSellerPropertyCommand, ServiceResult<PropertyDetailsDto>>
{
    private readonly ISellerService _seller;
    private readonly IAdminRealtimeNotifier _notifier;

    public SubmitSellerPropertyCommandHandler(ISellerService seller, IAdminRealtimeNotifier notifier)
    {
        _seller = seller;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PropertyDetailsDto>> Handle(
        SubmitSellerPropertyCommand cmd, CancellationToken ct)
    {
        var result = await _seller.SubmitAsync(cmd.UserId, cmd.Role, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "property.created",
                "New Seller Property Draft",
                $"Property '{result.Data.Title}' ({result.Data.ReferenceNumber}) was submitted as draft.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "Property",
                eventKey: $"property:created:{result.Data.Id}",
                ct: ct);
        }
        return result;
    }
}

public sealed record SubmitPropertyForReviewCommand(int UserId, int PropertyId)
    : ICommand<object?>;

public sealed class SubmitPropertyForReviewCommandValidator : AbstractValidator<SubmitPropertyForReviewCommand>
{
    public SubmitPropertyForReviewCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.PropertyId).GreaterThan(0);
    }
}

public sealed class SubmitPropertyForReviewCommandHandler
    : IRequestHandler<SubmitPropertyForReviewCommand, ServiceResult<object?>>
{
    private readonly ISellerService _seller;

    public SubmitPropertyForReviewCommandHandler(ISellerService seller) => _seller = seller;

    public Task<ServiceResult<object?>> Handle(SubmitPropertyForReviewCommand cmd, CancellationToken ct)
        => _seller.SubmitForReviewAsync(cmd.UserId, cmd.PropertyId, ct);
}
