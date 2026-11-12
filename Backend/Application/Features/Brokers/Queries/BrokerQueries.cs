using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using MediatR;

namespace Application.Features.Brokers.Queries;

public sealed record GetBrokerDashboardQuery(int BrokerUserId) : IQuery<BrokerDashboardDto>;

public sealed class GetBrokerDashboardQueryHandler
    : IRequestHandler<GetBrokerDashboardQuery, ServiceResult<BrokerDashboardDto>>
{
    private readonly IRequestService _requests;

    public GetBrokerDashboardQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<BrokerDashboardDto>> Handle(GetBrokerDashboardQuery request, CancellationToken ct)
        => _requests.GetBrokerDashboardAsync(request.BrokerUserId, ct);
}

public sealed record GetBrokerPropertiesQuery(int BrokerUserId, string? Status, int Page, int PageSize)
    : IQuery<PagedResult<PropertyListDto>>;

public sealed class GetBrokerPropertiesQueryHandler
    : IRequestHandler<GetBrokerPropertiesQuery, ServiceResult<PagedResult<PropertyListDto>>>
{
    private readonly IRequestService _requests;

    public GetBrokerPropertiesQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<PropertyListDto>>> Handle(GetBrokerPropertiesQuery request, CancellationToken ct)
        => _requests.GetBrokerPropertiesAsync(request.BrokerUserId, request.Status, request.Page, request.PageSize, ct);
}

public sealed record GetMyBrokerSubmissionsQuery(int BrokerUserId, int Page, int PageSize)
    : IQuery<PagedResult<BrokerPropertySubmissionDto>>;

public sealed class GetMyBrokerSubmissionsQueryHandler
    : IRequestHandler<GetMyBrokerSubmissionsQuery, ServiceResult<PagedResult<BrokerPropertySubmissionDto>>>
{
    private readonly IRequestService _requests;

    public GetMyBrokerSubmissionsQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<BrokerPropertySubmissionDto>>> Handle(
        GetMyBrokerSubmissionsQuery request, CancellationToken ct)
        => _requests.MyBrokerSubmissionsAsync(request.BrokerUserId, request.Page, request.PageSize, ct);
}

public sealed record GetMyBrokerRequestsQuery(int BrokerUserId, int Page, int PageSize)
    : IQuery<PagedResult<BrokerPropertyRequestDto>>;

public sealed class GetMyBrokerRequestsQueryHandler
    : IRequestHandler<GetMyBrokerRequestsQuery, ServiceResult<PagedResult<BrokerPropertyRequestDto>>>
{
    private readonly IRequestService _requests;

    public GetMyBrokerRequestsQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<BrokerPropertyRequestDto>>> Handle(
        GetMyBrokerRequestsQuery request, CancellationToken ct)
        => _requests.MyBrokerRequestsAsync(request.BrokerUserId, request.Page, request.PageSize, ct);
}

public sealed record GetMyBrokerProfileQuery(int UserId) : IQuery<BrokerProfileDto>;

public sealed class GetMyBrokerProfileQueryHandler
    : IRequestHandler<GetMyBrokerProfileQuery, ServiceResult<BrokerProfileDto>>
{
    private readonly IRequestService _requests;

    public GetMyBrokerProfileQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<BrokerProfileDto>> Handle(GetMyBrokerProfileQuery request, CancellationToken ct)
        => _requests.GetMyBrokerProfileAsync(request.UserId, ct);
}

