using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using MediatR;

namespace Application.Features.Inquiries.Queries;

public sealed record GetAllInquiriesQuery(int? PropertyId, int Page, int PageSize)
    : IQuery<PagedResult<InquiryDto>>;

public sealed class GetAllInquiriesQueryHandler
    : IRequestHandler<GetAllInquiriesQuery, ServiceResult<PagedResult<InquiryDto>>>
{
    private readonly IInquiryService _inquiries;

    public GetAllInquiriesQueryHandler(IInquiryService inquiries) => _inquiries = inquiries;

    public Task<ServiceResult<PagedResult<InquiryDto>>> Handle(
        GetAllInquiriesQuery request, CancellationToken ct)
        => _inquiries.AdminListAsync(request.PropertyId, request.Page, request.PageSize, ct);
}
