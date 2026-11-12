using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using MediatR;

namespace Application.Features.Admin.Queries;

public sealed record GetAdminDashboardQuery : IQuery<DashboardDto>;

public sealed class GetAdminDashboardQueryHandler
    : IRequestHandler<GetAdminDashboardQuery, ServiceResult<DashboardDto>>
{
    private readonly IAdminService _admin;

    public GetAdminDashboardQueryHandler(IAdminService admin) => _admin = admin;

    public Task<ServiceResult<DashboardDto>> Handle(GetAdminDashboardQuery request, CancellationToken ct)
        => _admin.GetDashboardAsync(ct);
}

public sealed record GetAdminUsersQuery(string? Search, int Page, int PageSize)
    : IQuery<PagedResult<AdminUserDto>>;

public sealed class GetAdminUsersQueryHandler
    : IRequestHandler<GetAdminUsersQuery, ServiceResult<PagedResult<AdminUserDto>>>
{
    private readonly IAdminService _admin;

    public GetAdminUsersQueryHandler(IAdminService admin) => _admin = admin;

    public Task<ServiceResult<PagedResult<AdminUserDto>>> Handle(GetAdminUsersQuery request, CancellationToken ct)
        => _admin.GetUsersAsync(request.Search, request.Page, request.PageSize, ct);
}

public sealed record GetAdminBrokersQuery(string? Status, int Page, int PageSize)
    : IQuery<PagedResult<BrokerProfileDto>>;

public sealed class GetAdminBrokersQueryHandler
    : IRequestHandler<GetAdminBrokersQuery, ServiceResult<PagedResult<BrokerProfileDto>>>
{
    private readonly IRequestService _requests;

    public GetAdminBrokersQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<BrokerProfileDto>>> Handle(GetAdminBrokersQuery request, CancellationToken ct)
        => _requests.AllBrokersAsync(request.Status, request.Page, request.PageSize, ct);
}

public sealed record GetAllBrokerSubmissionsQuery(string? Status, int Page, int PageSize)
    : IQuery<PagedResult<BrokerPropertySubmissionDto>>;

public sealed class GetAllBrokerSubmissionsQueryHandler
    : IRequestHandler<GetAllBrokerSubmissionsQuery, ServiceResult<PagedResult<BrokerPropertySubmissionDto>>>
{
    private readonly IRequestService _requests;

    public GetAllBrokerSubmissionsQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<BrokerPropertySubmissionDto>>> Handle(
        GetAllBrokerSubmissionsQuery request, CancellationToken ct)
        => _requests.AllBrokerSubmissionsAsync(request.Status, request.Page, request.PageSize, ct);
}

public sealed record GetAllBrokerRequestsQuery(string? Status, int Page, int PageSize)
    : IQuery<PagedResult<BrokerPropertyRequestDto>>;

public sealed class GetAllBrokerRequestsQueryHandler
    : IRequestHandler<GetAllBrokerRequestsQuery, ServiceResult<PagedResult<BrokerPropertyRequestDto>>>
{
    private readonly IRequestService _requests;

    public GetAllBrokerRequestsQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<BrokerPropertyRequestDto>>> Handle(
        GetAllBrokerRequestsQuery request, CancellationToken ct)
        => _requests.AllBrokerRequestsAsync(request.Status, request.Page, request.PageSize, ct);
}

public sealed record GetAdminAgentsQuery : IQuery<List<AdminAgentDto>>;

public sealed class GetAdminAgentsQueryHandler
    : IRequestHandler<GetAdminAgentsQuery, ServiceResult<List<AdminAgentDto>>>
{
    private readonly IAdminService _admin;

    public GetAdminAgentsQueryHandler(IAdminService admin) => _admin = admin;

    public Task<ServiceResult<List<AdminAgentDto>>> Handle(GetAdminAgentsQuery request, CancellationToken ct)
        => _admin.GetAgentsAsync(ct);
}

public sealed record GetAdminReviewsQuery(bool? Approved, int Page, int PageSize)
    : IQuery<PagedResult<AdminReviewDto>>;

public sealed class GetAdminReviewsQueryHandler
    : IRequestHandler<GetAdminReviewsQuery, ServiceResult<PagedResult<AdminReviewDto>>>
{
    private readonly IAdminService _admin;

    public GetAdminReviewsQueryHandler(IAdminService admin) => _admin = admin;

    public Task<ServiceResult<PagedResult<AdminReviewDto>>> Handle(GetAdminReviewsQuery request, CancellationToken ct)
        => _admin.GetReviewsAsync(request.Approved, request.Page, request.PageSize, ct);
}

