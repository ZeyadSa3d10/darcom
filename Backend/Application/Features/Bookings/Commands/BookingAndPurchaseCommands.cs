using Application.BackgroundJobs;
using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using FluentValidation;
using MediatR;

namespace Application.Features.Bookings.Commands;

// ---------- Create Booking Request ----------

public sealed record CreateBookingRequestCommand(int UserId, CreateBookingRequest Request)
    : ICommand<BookingRequestDto>;

public sealed class CreateBookingRequestCommandValidator : AbstractValidator<CreateBookingRequestCommand>
{
    public CreateBookingRequestCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new CreateBookingValidator());
    }
}

public sealed class CreateBookingRequestCommandHandler
    : IRequestHandler<CreateBookingRequestCommand, ServiceResult<BookingRequestDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;
    private readonly IEmailJobService? _emailJobs;

    public CreateBookingRequestCommandHandler(
        IRequestService requests,
        IAdminRealtimeNotifier notifier,
        IEmailJobService? emailJobs = null)
    {
        _requests = requests;
        _notifier = notifier;
        _emailJobs = emailJobs;
    }

    public async Task<ServiceResult<BookingRequestDto>> Handle(
        CreateBookingRequestCommand cmd, CancellationToken ct)
    {
        var result = await _requests.CreateBookingAsync(cmd.UserId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "booking.created",
                "New Rental Booking Request",
                $"Booking {result.Data.RequestNumber} submitted for property '{result.Data.Property.Title}'.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "BookingRequest",
                eventKey: $"booking:created:{result.Data.Id}",
                ct: ct);

            if (_emailJobs is not null)
            {
                try { await _emailJobs.EnqueueBookingCreatedEmailAsync(result.Data.Id, ct); }
                catch { /* Never fail or roll back booking when email queue fails */ }
            }
        }
        return result;
    }
}

// ---------- Update Booking Status (Approve / Confirm / Reject / Cancel) ----------

public sealed record UpdateBookingStatusCommand(
    int AdminId, int BookingId, UpdateRequestStatusRequest Request, string? IpAddress)
    : ICommand<BookingRequestDto>;

public sealed class UpdateBookingStatusCommandValidator : AbstractValidator<UpdateBookingStatusCommand>
{
    public UpdateBookingStatusCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.BookingId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new UpdateRequestStatusValidator());
    }
}

public sealed class UpdateBookingStatusCommandHandler
    : IRequestHandler<UpdateBookingStatusCommand, ServiceResult<BookingRequestDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;
    private readonly IEmailJobService? _emailJobs;
    private readonly IReminderJobService? _reminders;

    public UpdateBookingStatusCommandHandler(
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

    public async Task<ServiceResult<BookingRequestDto>> Handle(
        UpdateBookingStatusCommand cmd, CancellationToken ct)
    {
        var result = await _requests.SetBookingStatusAsync(cmd.AdminId, cmd.BookingId, cmd.Request, cmd.IpAddress, ct);
        if (result.Succeeded && result.Data is not null)
        {
            var normalized = result.Data.Status.ToLowerInvariant();
            var eventType = normalized switch
            {
                "approved" => "booking.confirmed",
                "completed" => "booking.confirmed",
                "cancelled" => "booking.cancelled",
                "rejected" => "booking.rejected",
                _ => "booking.status.changed"
            };

            await _notifier.NotifyAdminsAsync(
                eventType,
                $"Booking {result.Data.Status}",
                $"Booking {result.Data.RequestNumber} ({result.Data.Property.Title}) is now {result.Data.Status}.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "BookingRequest",
                eventKey: $"booking:status:{result.Data.Id}:{normalized}",
                ct: ct);

            if (_emailJobs is not null)
            {
                try { await _emailJobs.EnqueueBookingStatusEmailAsync(result.Data.Id, result.Data.Status, ct); }
                catch { /* Never fail status update on email queue failure */ }
            }

            if (_reminders is not null)
            {
                try
                {
                    if (normalized == "approved")
                        await _reminders.ScheduleBookingRemindersAsync(result.Data.Id, ct);
                    else if (normalized is "cancelled" or "rejected" or "completed")
                        await _reminders.CancelEntityRemindersAsync("BookingRequest", result.Data.Id, ct);
                }
                catch { /* Never roll back status update on reminder scheduling failure */ }
            }
        }
        return result;
    }
}

// ---------- Create Purchase Request ----------

public sealed record CreatePurchaseRequestCommand(int UserId, CreatePurchaseRequest Request)
    : ICommand<PurchaseRequestDto>;

public sealed class CreatePurchaseRequestCommandValidator : AbstractValidator<CreatePurchaseRequestCommand>
{
    public CreatePurchaseRequestCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new CreatePurchaseValidator());
    }
}

public sealed class CreatePurchaseRequestCommandHandler
    : IRequestHandler<CreatePurchaseRequestCommand, ServiceResult<PurchaseRequestDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public CreatePurchaseRequestCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PurchaseRequestDto>> Handle(
        CreatePurchaseRequestCommand cmd, CancellationToken ct)
    {
        var result = await _requests.CreatePurchaseAsync(cmd.UserId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "purchase.created",
                "New Purchase Request",
                $"Purchase request {result.Data.RequestNumber} submitted for '{result.Data.Property.Title}'.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "PurchaseRequest",
                eventKey: $"purchase:created:{result.Data.Id}",
                ct: ct);
        }
        return result;
    }
}

// ---------- Update Purchase Status ----------

public sealed record UpdatePurchaseStatusCommand(
    int AdminId, int PurchaseId, UpdateRequestStatusRequest Request, string? IpAddress)
    : ICommand<PurchaseRequestDto>;

public sealed class UpdatePurchaseStatusCommandValidator : AbstractValidator<UpdatePurchaseStatusCommand>
{
    public UpdatePurchaseStatusCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.PurchaseId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new UpdateRequestStatusValidator());
    }
}

public sealed class UpdatePurchaseStatusCommandHandler
    : IRequestHandler<UpdatePurchaseStatusCommand, ServiceResult<PurchaseRequestDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public UpdatePurchaseStatusCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PurchaseRequestDto>> Handle(
        UpdatePurchaseStatusCommand cmd, CancellationToken ct)
    {
        var result = await _requests.SetPurchaseStatusAsync(cmd.AdminId, cmd.PurchaseId, cmd.Request, cmd.IpAddress, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "purchase.status.changed",
                $"Purchase Request {result.Data.Status}",
                $"Purchase {result.Data.RequestNumber} ({result.Data.Property.Title}) is now {result.Data.Status}.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "PurchaseRequest",
                eventKey: $"purchase:status:{result.Data.Id}:{result.Data.Status.ToLowerInvariant()}",
                ct: ct);
        }
        return result;
    }
}

