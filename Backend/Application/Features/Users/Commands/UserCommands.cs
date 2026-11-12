using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using FluentValidation;
using MediatR;

namespace Application.Features.Users.Commands;

public sealed record UpdateProfileCommand(int UserId, UpdateProfileRequest Request)
    : ICommand<UserDto>;

public sealed class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new UpdateProfileValidator());
    }
}

public sealed class UpdateProfileCommandHandler
    : IRequestHandler<UpdateProfileCommand, ServiceResult<UserDto>>
{
    private readonly IUserService _users;

    public UpdateProfileCommandHandler(IUserService users) => _users = users;

    public Task<ServiceResult<UserDto>> Handle(UpdateProfileCommand cmd, CancellationToken ct)
        => _users.UpdateProfileAsync(cmd.UserId, cmd.Request, ct);
}

public sealed record ChangePasswordCommand(int UserId, ChangePasswordRequest Request)
    : ICommand<object?>;

public sealed class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        this.ForwardTo(x => x.Request, new ChangePasswordValidator());
    }
}

public sealed class ChangePasswordCommandHandler
    : IRequestHandler<ChangePasswordCommand, ServiceResult<object?>>
{
    private readonly IUserService _users;

    public ChangePasswordCommandHandler(IUserService users) => _users = users;

    public Task<ServiceResult<object?>> Handle(ChangePasswordCommand cmd, CancellationToken ct)
        => _users.ChangePasswordAsync(cmd.UserId, cmd.Request, ct);
}

