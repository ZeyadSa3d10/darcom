using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using MediatR;

namespace Application.Features.Users.Queries;

public sealed record GetCurrentUserQuery(int UserId) : IQuery<UserDto>;

public sealed class GetCurrentUserQueryHandler
    : IRequestHandler<GetCurrentUserQuery, ServiceResult<UserDto>>
{
    private readonly IUserService _users;

    public GetCurrentUserQueryHandler(IUserService users) => _users = users;

    public Task<ServiceResult<UserDto>> Handle(GetCurrentUserQuery request, CancellationToken ct)
        => _users.GetMeAsync(request.UserId, ct);
}

