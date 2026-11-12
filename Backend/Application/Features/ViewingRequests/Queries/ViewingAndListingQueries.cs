using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using MediatR;

namespace Application.Features.ViewingRequests.Queries;

public sealed record GetMyListingRequestsQuery(int UserId, int Page, int PageSize)
    : IQuery<PagedResult<PropertyListingRequestDto>>;

public sealed class GetMyListingRequestsQueryHandler
    : IRequestHandler<GetMyListingRequestsQuery, ServiceResult<PagedResult<PropertyListingRequestDto>>>
{
    private readonly IRequestService _requests;

    public GetMyListingRequestsQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<PropertyListingRequestDto>>> Handle(
        GetMyListingRequestsQuery request, CancellationToken ct)
        => _requests.MyListingRequestsAsync(request.UserId, request.Page, request.PageSize, ct);
}

public sealed record GetAllListingRequestsQuery(string? Status, int Page, int PageSize)
    : IQuery<PagedResult<PropertyListingRequestDto>>;

public sealed class GetAllListingRequestsQueryHandler
    : IRequestHandler<GetAllListingRequestsQuery, ServiceResult<PagedResult<PropertyListingRequestDto>>>
{
    private readonly IRequestService _requests;

    public GetAllListingRequestsQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<PropertyListingRequestDto>>> Handle(
        GetAllListingRequestsQuery request, CancellationToken ct)
        => _requests.AllListingRequestsAsync(request.Status, request.Page, request.PageSize, ct);
}

public sealed record GetListingRequestByIdQuery(int RequestId, int? CurrentUserId, bool IsAdmin)
    : IQuery<PropertyListingRequestDto>;

public sealed class GetListingRequestByIdQueryHandler
    : IRequestHandler<GetListingRequestByIdQuery, ServiceResult<PropertyListingRequestDto>>
{
    private readonly IRequestService _requests;

    public GetListingRequestByIdQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PropertyListingRequestDto>> Handle(
        GetListingRequestByIdQuery request, CancellationToken ct)
        => _requests.GetListingRequestByIdAsync(request.RequestId, request.CurrentUserId, request.IsAdmin, ct);
}

public sealed record GetMyRequirementsQuery(int UserId, int Page, int PageSize)
    : IQuery<PagedResult<PropertyRequirementDto>>;

public sealed class GetMyRequirementsQueryHandler
    : IRequestHandler<GetMyRequirementsQuery, ServiceResult<PagedResult<PropertyRequirementDto>>>
{
    private readonly IRequestService _requests;

    public GetMyRequirementsQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<PropertyRequirementDto>>> Handle(
        GetMyRequirementsQuery request, CancellationToken ct)
        => _requests.MyRequirementsAsync(request.UserId, request.Page, request.PageSize, ct);
}

public sealed record GetAllRequirementsQuery(string? Status, int Page, int PageSize)
    : IQuery<PagedResult<PropertyRequirementDto>>;

public sealed class GetAllRequirementsQueryHandler
    : IRequestHandler<GetAllRequirementsQuery, ServiceResult<PagedResult<PropertyRequirementDto>>>
{
    private readonly IRequestService _requests;

    public GetAllRequirementsQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<PropertyRequirementDto>>> Handle(
        GetAllRequirementsQuery request, CancellationToken ct)
        => _requests.AllRequirementsAsync(request.Status, request.Page, request.PageSize, ct);
}
