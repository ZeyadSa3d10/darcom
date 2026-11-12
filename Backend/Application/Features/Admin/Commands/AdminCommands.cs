using Application.BackgroundJobs;
using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using FluentValidation;
using MediatR;

namespace Application.Features.Admin.Commands;

// ---------- User Role ----------

public sealed record SetUserRoleCommand(
    int AdminId, int TargetUserId, SetUserRoleRequest Request, string? IpAddress)
    : ICommand<AdminUserDto>;

public sealed class SetUserRoleCommandValidator : AbstractValidator<SetUserRoleCommand>
{
    public SetUserRoleCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.TargetUserId).GreaterThan(0);
        RuleFor(x => x.Request).NotNull();
        RuleFor(x => x.Request.Role).NotEmpty().MaximumLength(32).When(x => x.Request is not null);
    }
}

public sealed class SetUserRoleCommandHandler
    : IRequestHandler<SetUserRoleCommand, ServiceResult<AdminUserDto>>
{
    private readonly IAdminService _admin;
    private readonly IAdminRealtimeNotifier _notifier;

    public SetUserRoleCommandHandler(IAdminService admin, IAdminRealtimeNotifier notifier)
    {
        _admin = admin;
        _notifier = notifier;
    }

    public async Task<ServiceResult<AdminUserDto>> Handle(
        SetUserRoleCommand cmd, CancellationToken ct)
    {
        var result = await _admin.SetUserRoleAsync(cmd.AdminId, cmd.TargetUserId, cmd.Request.Role, cmd.IpAddress, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "user.role.changed",
                "User Role Updated",
                $"User '{result.Data.FullName}' role changed to {result.Data.Role}.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "User",
                ct: ct);
        }
        return result;
    }
}

// ---------- Broker Approval / Rejection ----------

public sealed record SetBrokerStatusCommand(int AdminId, int BrokerProfileId, SetBrokerStatusRequest Request)
    : ICommand<BrokerProfileDto>;

public sealed class SetBrokerStatusCommandValidator : AbstractValidator<SetBrokerStatusCommand>
{
    public SetBrokerStatusCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.BrokerProfileId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new SetBrokerStatusValidator());
    }
}

public sealed class SetBrokerStatusCommandHandler
    : IRequestHandler<SetBrokerStatusCommand, ServiceResult<BrokerProfileDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;
    private readonly IEmailJobService? _emailJobs;

    public SetBrokerStatusCommandHandler(
        IRequestService requests,
        IAdminRealtimeNotifier notifier,
        IEmailJobService? emailJobs = null)
    {
        _requests = requests;
        _notifier = notifier;
        _emailJobs = emailJobs;
    }

    public async Task<ServiceResult<BrokerProfileDto>> Handle(
        SetBrokerStatusCommand cmd, CancellationToken ct)
    {
        var result = await _requests.SetBrokerStatusAsync(cmd.AdminId, cmd.BrokerProfileId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "broker.status.changed",
                $"Broker {result.Data.Status}",
                $"Broker '{result.Data.FullName}' status changed to {result.Data.Status}.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "BrokerProfile",
                eventKey: $"broker:status:{result.Data.Id}:{result.Data.Status.ToLowerInvariant()}",
                ct: ct);

            if (_emailJobs is not null)
            {
                try { await _emailJobs.EnqueueBrokerStatusEmailAsync(result.Data.Id, result.Data.Status, ct); }
                catch { /* Never fail broker approval on email queue failure */ }
            }
        }
        return result;
    }
}

// ---------- Broker Submission Status ----------

public sealed record SetBrokerSubmissionStatusCommand(
    int AdminId, int SubmissionId, UpdateBrokerSubmissionStatusRequest Request)
    : ICommand<BrokerPropertySubmissionDto>;

public sealed class SetBrokerSubmissionStatusCommandValidator
    : AbstractValidator<SetBrokerSubmissionStatusCommand>
{
    public SetBrokerSubmissionStatusCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.SubmissionId).GreaterThan(0);
        RuleFor(x => x.Request).NotNull();
        RuleFor(x => x.Request.Status).NotEmpty().MaximumLength(32).When(x => x.Request is not null);
    }
}

public sealed class SetBrokerSubmissionStatusCommandHandler
    : IRequestHandler<SetBrokerSubmissionStatusCommand, ServiceResult<BrokerPropertySubmissionDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public SetBrokerSubmissionStatusCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<BrokerPropertySubmissionDto>> Handle(
        SetBrokerSubmissionStatusCommand cmd, CancellationToken ct)
    {
        var result = await _requests.SetBrokerSubmissionStatusAsync(cmd.AdminId, cmd.SubmissionId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "broker.submission.updated",
                "Broker Submission Updated",
                $"Broker submission #{result.Data.Id} status changed to {result.Data.Status}.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "BrokerPropertySubmission",
                ct: ct);
        }
        return result;
    }
}

// ---------- Broker Property Request Status ----------

public sealed record SetBrokerRequestStatusCommand(
    int AdminId, int RequestId, UpdateRequestStatusRequest Request)
    : ICommand<BrokerPropertyRequestDto>;

public sealed class SetBrokerRequestStatusCommandValidator
    : AbstractValidator<SetBrokerRequestStatusCommand>
{
    public SetBrokerRequestStatusCommandValidator()
    {
        RuleFor(x => x.AdminId).GreaterThan(0);
        RuleFor(x => x.RequestId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new UpdateRequestStatusValidator());
    }
}

public sealed class SetBrokerRequestStatusCommandHandler
    : IRequestHandler<SetBrokerRequestStatusCommand, ServiceResult<BrokerPropertyRequestDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public SetBrokerRequestStatusCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<BrokerPropertyRequestDto>> Handle(
        SetBrokerRequestStatusCommand cmd, CancellationToken ct)
    {
        var result = await _requests.SetBrokerRequestStatusAsync(cmd.AdminId, cmd.RequestId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "broker.request.updated",
                "Broker Client Request Updated",
                $"Broker request #{result.Data.Id} status changed to {result.Data.Status}.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "BrokerPropertyRequest",
                ct: ct);
        }
        return result;
    }
}

// ---------- Review Moderation ----------

public sealed record SetReviewApprovalCommand(int AdminId, int ReviewId, bool Approved, string? IpAddress)
    : ICommand<object?>;

public sealed class SetReviewApprovalCommandHandler
    : IRequestHandler<SetReviewApprovalCommand, ServiceResult<object?>>
{
    private readonly IAdminService _admin;

    public SetReviewApprovalCommandHandler(IAdminService admin) => _admin = admin;

    public Task<ServiceResult<object?>> Handle(SetReviewApprovalCommand cmd, CancellationToken ct)
        => _admin.SetReviewApprovalAsync(cmd.AdminId, cmd.ReviewId, cmd.Approved, cmd.IpAddress, ct);
}

public sealed record DeleteReviewCommand(int AdminId, int ReviewId, string? IpAddress)
    : ICommand<object?>;

public sealed class DeleteReviewCommandHandler
    : IRequestHandler<DeleteReviewCommand, ServiceResult<object?>>
{
    private readonly IAdminService _admin;

    public DeleteReviewCommandHandler(IAdminService admin) => _admin = admin;

    public Task<ServiceResult<object?>> Handle(DeleteReviewCommand cmd, CancellationToken ct)
        => _admin.DeleteReviewAsync(cmd.AdminId, cmd.ReviewId, cmd.IpAddress, ct);
}
