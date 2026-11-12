using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using FluentValidation;
using MediatR;

namespace Application.Features.Brokers.Commands;

public sealed record SubmitBrokerUnitCommand(int BrokerUserId, BrokerPropertySubmissionCreateDto Request)
    : ICommand<BrokerPropertySubmissionDto>;

public sealed class SubmitBrokerUnitCommandValidator : AbstractValidator<SubmitBrokerUnitCommand>
{
    public SubmitBrokerUnitCommandValidator()
    {
        RuleFor(x => x.BrokerUserId).GreaterThan(0);
        RuleFor(x => x.Request).NotNull();
        When(x => x.Request is not null, () =>
        {
            RuleFor(x => x.Request.VillageId).GreaterThan(0);
            RuleFor(x => x.Request.Area).GreaterThan(0);
            RuleFor(x => x.Request.UnitNumber).NotEmpty().MaximumLength(64);
        });
    }
}

public sealed class SubmitBrokerUnitCommandHandler
    : IRequestHandler<SubmitBrokerUnitCommand, ServiceResult<BrokerPropertySubmissionDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public SubmitBrokerUnitCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<BrokerPropertySubmissionDto>> Handle(
        SubmitBrokerUnitCommand cmd, CancellationToken ct)
    {
        var result = await _requests.SubmitBrokerUnitAsync(cmd.BrokerUserId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "broker.submission.created",
                "New Broker Unit Submission",
                $"Broker '{result.Data.BrokerName}' submitted unit {result.Data.UnitNumber} in {result.Data.VillageName}.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "BrokerPropertySubmission",
                eventKey: $"broker-submission:created:{result.Data.Id}",
                ct: ct);
        }
        return result;
    }
}

public sealed record CreateBrokerPropertyRequestCommand(int BrokerUserId, BrokerPropertyRequestCreateDto Request)
    : ICommand<BrokerPropertyRequestDto>;

public sealed class CreateBrokerPropertyRequestCommandHandler
    : IRequestHandler<CreateBrokerPropertyRequestCommand, ServiceResult<BrokerPropertyRequestDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public CreateBrokerPropertyRequestCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<BrokerPropertyRequestDto>> Handle(
        CreateBrokerPropertyRequestCommand cmd, CancellationToken ct)
    {
        var result = await _requests.CreateBrokerPropertyRequestAsync(cmd.BrokerUserId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "broker.request.created",
                "New Broker Client Request",
                $"Broker '{result.Data.BrokerName}' submitted a {result.Data.Purpose} request for '{result.Data.PropertyTitle}'.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "BrokerPropertyRequest",
                eventKey: $"broker-request:created:{result.Data.Id}",
                ct: ct);
        }
        return result;
    }
}

public sealed record CreateBrokerRequirementCommand(int BrokerUserId, BrokerRequirementCreateDto Request)
    : ICommand<PropertyRequirementDto>;

public sealed class CreateBrokerRequirementCommandHandler
    : IRequestHandler<CreateBrokerRequirementCommand, ServiceResult<PropertyRequirementDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public CreateBrokerRequirementCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PropertyRequirementDto>> Handle(
        CreateBrokerRequirementCommand cmd, CancellationToken ct)
    {
        var result = await _requests.CreateBrokerRequirementAsync(cmd.BrokerUserId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "viewing.request.created",
                "New Broker Requirement",
                $"Broker submitted custom {result.Data.Purpose} requirement (#{result.Data.Id}).",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "PropertyRequirement",
                eventKey: $"requirement:created:{result.Data.Id}",
                ct: ct);
        }
        return result;
    }
}

public sealed record SubmitBrokerPropertyCommand(int BrokerUserId, BrokerPropertySubmissionRequest Request)
    : ICommand<PropertyDetailsDto>;

public sealed class SubmitBrokerPropertyCommandValidator : AbstractValidator<SubmitBrokerPropertyCommand>
{
    public SubmitBrokerPropertyCommandValidator()
    {
        RuleFor(x => x.BrokerUserId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new BrokerPropertySubmissionValidator());
    }
}

public sealed class SubmitBrokerPropertyCommandHandler
    : IRequestHandler<SubmitBrokerPropertyCommand, ServiceResult<PropertyDetailsDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public SubmitBrokerPropertyCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PropertyDetailsDto>> Handle(
        SubmitBrokerPropertyCommand cmd, CancellationToken ct)
    {
        var result = await _requests.SubmitBrokerPropertyAsync(cmd.BrokerUserId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "property.created",
                "New Broker Property Submitted",
                $"Property '{result.Data.Title}' ({result.Data.ReferenceNumber}) submitted for review.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "Property",
                eventKey: $"property:created:{result.Data.Id}",
                ct: ct);
        }
        return result;
    }
}

public sealed record CreateBrokerLegacyRequestCommand(int BrokerUserId, CreateBrokerPropertyRequest Request)
    : ICommand<BrokerPropertyRequestDto>;

public sealed class CreateBrokerLegacyRequestCommandValidator
    : AbstractValidator<CreateBrokerLegacyRequestCommand>
{
    public CreateBrokerLegacyRequestCommandValidator()
    {
        RuleFor(x => x.BrokerUserId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new CreateBrokerPropertyRequestValidator());
    }
}

public sealed class CreateBrokerLegacyRequestCommandHandler
    : IRequestHandler<CreateBrokerLegacyRequestCommand, ServiceResult<BrokerPropertyRequestDto>>
{
    private readonly IRequestService _requests;
    private readonly IAdminRealtimeNotifier _notifier;

    public CreateBrokerLegacyRequestCommandHandler(IRequestService requests, IAdminRealtimeNotifier notifier)
    {
        _requests = requests;
        _notifier = notifier;
    }

    public async Task<ServiceResult<BrokerPropertyRequestDto>> Handle(
        CreateBrokerLegacyRequestCommand cmd, CancellationToken ct)
    {
        var result = await _requests.CreateBrokerRequestAsync(cmd.BrokerUserId, cmd.Request, ct);
        if (result.Succeeded && result.Data is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "broker.request.created",
                "New Broker Client Request",
                $"Broker '{result.Data.BrokerName}' submitted a client request for '{result.Data.PropertyTitle}'.",
                relatedEntityId: result.Data.Id,
                relatedEntityType: "BrokerPropertyRequest",
                eventKey: $"broker-request:created:{result.Data.Id}",
                ct: ct);
        }
        return result;
    }
}
