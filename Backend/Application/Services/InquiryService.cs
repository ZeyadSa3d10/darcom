using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;

namespace Application.Services;

public interface IInquiryService
{
    Task<ServiceResult<object?>> SubmitAsync(int propertyId, CreateInquiryRequest request, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<InquiryDto>>> AdminListAsync(int? propertyId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<object?>> SubmitContactAsync(ContactRequest request, CancellationToken ct = default);
}

public sealed class InquiryService : IInquiryService
{
    private readonly IEngagementStore _store;
    private readonly IRequestStore _requests;
    private readonly IAuditWriter _audit;

    public InquiryService(IEngagementStore store, IRequestStore requests, IAuditWriter audit)
    {
        _store = store;
        _requests = requests;
        _audit = audit;
    }

    public async Task<ServiceResult<object?>> SubmitAsync(int propertyId, CreateInquiryRequest request, CancellationToken ct = default)
    {
        var property = await _requests.GetPropertyAsync(propertyId, ct);
        if (property is null)
            return ServiceResult<object?>.NotFound("Property not found.");

        await _store.AddInquiryAsync(new PropertyInquiry
        {
            PropertyId = propertyId,
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Phone = request.Phone?.Trim(),
            Message = request.Message.Trim(),
            IsRead = false
        }, ct);
        await _store.SaveChangesAsync(ct);

        foreach (var adminId in await _requests.GetAdminUserIdsAsync(ct))
            await _store.AddNotificationAsync(adminId, "New property inquiry",
                $"{request.Name} asked about {property.Title}.", "inquiry", ct);
        await _store.SaveChangesAsync(ct);
        await _audit.LogAsync(null, "inquiry.created", "PropertyInquiry",
            propertyId.ToString(), null, request.Email, null, ct);

        return ServiceResult<object?>.Created(null, "Inquiry sent. The agent will contact you shortly.");
    }

    public async Task<ServiceResult<PagedResult<InquiryDto>>> AdminListAsync(int? propertyId, int page, int pageSize, CancellationToken ct = default)
    {
        var result = await _store.GetInquiriesAsync(propertyId, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct);
        var dtos = result.Data.Select(i => new InquiryDto(i.Id, i.PropertyId, i.Property?.Title,
            i.Name, i.Email, i.Phone, i.Message, i.IsRead, i.CreatedAt)).ToList();
        return ServiceResult<PagedResult<InquiryDto>>.Ok(
            new PagedResult<InquiryDto>(dtos, result.Page, result.PageSize, result.TotalCount, result.TotalPages));
    }

    public async Task<ServiceResult<object?>> SubmitContactAsync(ContactRequest request, CancellationToken ct = default)
    {
        await _store.AddContactMessageAsync(new ContactMessage
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Phone = request.Phone?.Trim(),
            Subject = request.Subject?.Trim(),
            Message = request.Message.Trim(),
            IsRead = false
        }, ct);
        await _store.SaveChangesAsync(ct);

        foreach (var adminId in await _requests.GetAdminUserIdsAsync(ct))
            await _store.AddNotificationAsync(adminId, "New contact message",
                $"{request.Name}: {request.Subject ?? "General inquiry"}.", "inquiry", ct);
        await _store.SaveChangesAsync(ct);

        return ServiceResult<object?>.Created(null, "Message received. We reply within one business day.");
    }
}
