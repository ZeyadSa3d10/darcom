using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using FluentValidation;
using MediatR;

namespace Application.Features.Inquiries.Commands;

public sealed record CreateInquiryCommand(int PropertyId, int? UserId, CreateInquiryRequest Request)
    : ICommand<object?>;

public sealed class CreateInquiryCommandValidator : AbstractValidator<CreateInquiryCommand>
{
    public CreateInquiryCommandValidator()
    {
        RuleFor(x => x.PropertyId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new CreateInquiryValidator());
    }
}

public sealed class CreateInquiryCommandHandler
    : IRequestHandler<CreateInquiryCommand, ServiceResult<object?>>
{
    private readonly IInquiryService _inquiries;
    private readonly IAdminRealtimeNotifier _notifier;

    public CreateInquiryCommandHandler(IInquiryService inquiries, IAdminRealtimeNotifier notifier)
    {
        _inquiries = inquiries;
        _notifier = notifier;
    }

    public async Task<ServiceResult<object?>> Handle(
        CreateInquiryCommand cmd, CancellationToken ct)
    {
        var result = await _inquiries.SubmitAsync(cmd.PropertyId, cmd.Request, cmd.UserId, ct);
        if (result.Succeeded)
        {
            await _notifier.NotifyAdminsAsync(
                "inquiry.created",
                "New Property Inquiry",
                $"New property inquiry received for property #{cmd.PropertyId}.",
                relatedEntityId: cmd.PropertyId,
                relatedEntityType: "PropertyInquiry",
                ct: ct);
        }
        return result;
    }
}

public sealed record SubmitContactCommand(ContactRequest Request) : ICommand<object?>;

public sealed class SubmitContactCommandValidator : AbstractValidator<SubmitContactCommand>
{
    public SubmitContactCommandValidator()
    {
        this.ForwardTo(x => x.Request, new ContactValidator());
    }
}

public sealed class SubmitContactCommandHandler
    : IRequestHandler<SubmitContactCommand, ServiceResult<object?>>
{
    private readonly IInquiryService _inquiries;
    private readonly IAdminRealtimeNotifier _notifier;

    public SubmitContactCommandHandler(IInquiryService inquiries, IAdminRealtimeNotifier notifier)
    {
        _inquiries = inquiries;
        _notifier = notifier;
    }

    public async Task<ServiceResult<object?>> Handle(
        SubmitContactCommand cmd, CancellationToken ct)
    {
        var result = await _inquiries.SubmitContactAsync(cmd.Request, ct);
        if (result.Succeeded)
        {
            await _notifier.NotifyAdminsAsync(
                "inquiry.created",
                "New Contact Message",
                $"Contact form message received from '{cmd.Request.Name}'.",
                relatedEntityType: "ContactMessage",
                ct: ct);
        }
        return result;
    }
}

public sealed record MarkInquiryReadCommand(int InquiryId) : ICommand<object?>;

public sealed class MarkInquiryReadCommandHandler
    : IRequestHandler<MarkInquiryReadCommand, ServiceResult<object?>>
{
    private readonly IAdminService _admin;

    public MarkInquiryReadCommandHandler(IAdminService admin) => _admin = admin;

    public Task<ServiceResult<object?>> Handle(MarkInquiryReadCommand cmd, CancellationToken ct)
        => _admin.MarkInquiryReadAsync(cmd.InquiryId, ct);
}
