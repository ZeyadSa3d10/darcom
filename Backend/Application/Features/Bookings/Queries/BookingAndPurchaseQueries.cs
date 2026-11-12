using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using MediatR;

namespace Application.Features.Bookings.Queries;

public sealed record GetMyBookingsQuery(int UserId, int Page, int PageSize)
    : IQuery<PagedResult<BookingRequestDto>>;

public sealed class GetMyBookingsQueryHandler
    : IRequestHandler<GetMyBookingsQuery, ServiceResult<PagedResult<BookingRequestDto>>>
{
    private readonly IRequestService _requests;

    public GetMyBookingsQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<BookingRequestDto>>> Handle(
        GetMyBookingsQuery request, CancellationToken ct)
        => _requests.MyBookingsAsync(request.UserId, request.Page, request.PageSize, ct);
}

public sealed record GetAllBookingsQuery(string? Status, int Page, int PageSize)
    : IQuery<PagedResult<BookingRequestDto>>;

public sealed class GetAllBookingsQueryHandler
    : IRequestHandler<GetAllBookingsQuery, ServiceResult<PagedResult<BookingRequestDto>>>
{
    private readonly IRequestService _requests;

    public GetAllBookingsQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<BookingRequestDto>>> Handle(
        GetAllBookingsQuery request, CancellationToken ct)
        => _requests.AllBookingsAsync(request.Status, request.Page, request.PageSize, ct);
}

public sealed record GetMyPurchasesQuery(int UserId, int Page, int PageSize)
    : IQuery<PagedResult<PurchaseRequestDto>>;

public sealed class GetMyPurchasesQueryHandler
    : IRequestHandler<GetMyPurchasesQuery, ServiceResult<PagedResult<PurchaseRequestDto>>>
{
    private readonly IRequestService _requests;

    public GetMyPurchasesQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<PurchaseRequestDto>>> Handle(
        GetMyPurchasesQuery request, CancellationToken ct)
        => _requests.MyPurchasesAsync(request.UserId, request.Page, request.PageSize, ct);
}

public sealed record GetAllPurchasesQuery(string? Status, int Page, int PageSize)
    : IQuery<PagedResult<PurchaseRequestDto>>;

public sealed class GetAllPurchasesQueryHandler
    : IRequestHandler<GetAllPurchasesQuery, ServiceResult<PagedResult<PurchaseRequestDto>>>
{
    private readonly IRequestService _requests;

    public GetAllPurchasesQueryHandler(IRequestService requests) => _requests = requests;

    public Task<ServiceResult<PagedResult<PurchaseRequestDto>>> Handle(
        GetAllPurchasesQuery request, CancellationToken ct)
        => _requests.AllPurchasesAsync(request.Status, request.Page, request.PageSize, ct);
}

