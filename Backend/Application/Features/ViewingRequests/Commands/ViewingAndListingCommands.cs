using Application.BackgroundJobs;
using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using FluentValidation;
using MediatR;

namespace Application.Features.ViewingRequests.Commands;

// ---------- Property Listing Requests ----------

public sealed record CreatePropertyListingRequestCommand(int UserId, CreatePropertyListingRequest Request)
    : ICommand<PropertyListingRequestDto>;

public sealed class CreatePropertyListingRequestCommandValidator
    : AbstractValidator<CreatePropertyListingRequestCommand>
{
    public CreatePropertyListingRequestCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new CreatePropertyListingRequestValidator());
    }
}

public sealed class CreatePropertyListingRequestCommandHandler
    : IRequestHandler<CreatePropertyListingRequestCommand, ServiceResult<PropertyListingRequestDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public CreatePropertyListingRequestCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PropertyListingRequestDto>> Handle(
        CreatePropertyListingRequestCommand cmd, CancellationToken ct)
    {
        var result = await _requests.CreateListingRequestAsync(cmd.UserId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "property.listing-request.created",
                "New Property Listing Request",
                $"Owner listing request {result.Data.RequestNumber} submitted in {result.Data.VillageName}.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "PropertyListingRequest",
                eventKey: $"listing-request:created:{result.Data.Id}",
                ct: ct);
        }
        return result;
    }
}

public sealed record UpdateListingRequestStatusCommand(
    int AdminId, int RequestId, UpdateListingRequestStatusRequest Request)
    : ICommand<PropertyListingRequestDto>;

public sealed class UpdateListingRequestStatusCommandValidator
    : AbstractValidator<UpdateListingRequestStatusCommand>
{
    public UpdateListingRequestStatusCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.RequestId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new UpdateListingRequestStatusValidator());
    }
}

public sealed class UpdateListingRequestStatusCommandHandler
    : IRequestHandler<UpdateListingRequestStatusCommand, ServiceResult<PropertyListingRequestDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;
    private readonly IEmailJobService? _emailJobs;
    private readonly IReminderJobService? _reminders;

    public UpdateListingRequestStatusCommandHandler(
        IRequestService requests,
        IAdminRealtimeNotifier notifier,
        IEmailJobService? emailJobs = null,
        IReminderJobService? reminders = null)
    {
        _requests = requests;
        _notifier = notifier;
        _emailJobs = emailJobs;
        _reminders = reminders;
    }

    public async Task<ServiceResult<PropertyListingRequestDto>> Handle(
        UpdateListingRequestStatusCommand cmd, CancellationToken ct)
    {
        var result = await _requests.SetListingRequestStatusAsync(cmd.AdminId, cmd.RequestId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "property.listing-request.updated",
                "Listing Request Updated",
                $"Listing request {result.Data.RequestNumber} moved to {result.Data.Status}.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "PropertyListingRequest",
                eventKey: $"listing-request:status:{result.Data.Id}:{result.Data.Status.ToLowerInvariant()}",
                ct: ct);

            if (_emailJobs is not null)
            {
                try { await _emailJobs.EnqueueListingRequestStatusEmailAsync(result.Data.Id, result.Data.Status, ct); }
                catch { /* Never fail status update on email queue failure */ }
            }

            if (_reminders is not null)
            {
                try
                {
                    var normalized = result.Data.Status.ToLowerInvariant();
                    if (normalized == "inspectionscheduled")
                        await _reminders.ScheduleViewingRemindersAsync(result.Data.Id, ct);
                    else if (normalized is "rejected" or "completed" or "inspected")
                        await _reminders.CancelEntityRemindersAsync("PropertyListingRequest", result.Data.Id, ct);
                }
                catch { /* Never roll back status update on reminder scheduling failure */ }
            }
        }
        return result;
    }
}

// ---------- Property Requirements (Viewing / Custom Search Requests) ----------

public sealed record CreateRequirementCommand(int? UserId, CreatePropertyRequirementRequest Request)
    : ICommand<PropertyRequirementDto>;

public sealed class CreateRequirementCommandValidator : AbstractValidator<CreateRequirementCommand>
{
    public CreateRequirementCommandValidator()
    {
        this.ForwardTo(x => x.Request, new CreatePropertyRequirementValidator());
    }
}

public sealed class CreateRequirementCommandHandler
    : IRequestHandler<CreateRequirementCommand, ServiceResult<PropertyRequirementDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;
    private readonly IEmailJobService? _emailJobs;

    public CreateRequirementCommandHandler(
        IRequestService requests,
        IAdminRealtimeNotifier notifier,
        IEmailJobService? emailJobs = null)
    {
        _requests = requests;
        _notifier = notifier;
        _emailJobs = emailJobs;
    }

    public async Task<ServiceResult<PropertyRequirementDto>> Handle(
        CreateRequirementCommand cmd, CancellationToken ct)
    {
        var result = await _requests.CreateRequirementAsync(cmd.UserId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "viewing.request.created",
                "New Property Requirement Lead",
                $"New {result.Data.Purpose} requirement lead (#{result.Data.Id}) submitted.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "PropertyRequirement",
                eventKey: $"requirement:created:{result.Data.Id}",
                ct: ct);

            if (_emailJobs is not null)
            {
                try { await _emailJobs.EnqueueRequirementConfirmationEmailAsync(result.Data.Id, ct); }
                catch { /* Never fail requirement creation on email queue failure */ }
            }
        }
        return result;
    }
}

public sealed record UpdateRequirementStatusCommand(
    int AdminId, int RequirementId, UpdateRequirementStatusRequest Request)
    : ICommand<PropertyRequirementDto>;

public sealed class UpdateRequirementStatusCommandValidator
    : AbstractValidator<UpdateRequirementStatusCommand>
{
    public UpdateRequirementStatusCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.RequirementId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new UpdateRequirementStatusValidator());
    }
}

public sealed class UpdateRequirementStatusCommandHandler
    : IRequestHandler<UpdateRequirementStatusCommand, ServiceResult<PropertyRequirementDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public UpdateRequirementStatusCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PropertyRequirementDto>> Handle(
        UpdateRequirementStatusCommand cmd, CancellationToken ct)
    {
        var result = await _requests.SetRequirementStatusAsync(cmd.AdminId, cmd.RequirementId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "viewing.request.updated",
                "Requirement Status Updated",
                $"Requirement #{result.Data.Id} status changed to {result.Data.Status}.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "PropertyRequirement",
                eventKey: $"requirement:status:{result.Data.Id}:{result.Data.Status.ToLowerInvariant()}",
                ct: ct);
        }
        return result;
    }
}
