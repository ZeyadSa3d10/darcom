using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;

namespace Application.Services;

public interface IInquiryService
{
    Task<ServiceResult<object?>> SubmitAsync(int propertyId, CreateInquiryRequest request, int? userId = null, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<InquiryDto>>> AdminListAsync(int? propertyId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<object?>> SubmitContactAsync(ContactRequest request, CancellationToken ct = default);
}

public sealed class InquiryService : IInquiryService
{
    private readonly IEngagementStore _store;
    private readonly IRequestStore _requests;
    private readonly IAuthStore _auth;
    private readonly IAuditWriter _audit;

    public InquiryService(IEngagementStore store, IRequestStore requests, IAuthStore auth, IAuditWriter audit)
    {
        _store = store;
        _requests = requests;
        _auth = auth;
        _audit = audit;
    }

    public async Task<ServiceResult<object?>> SubmitAsync(int propertyId, CreateInquiryRequest request, int? userId = null, CancellationToken ct = default)
    {
        var property = await _requests.GetPropertyAsync(propertyId, ct);
        if (property is null)
            return ServiceResult<object?>.NotFound("Property not found.");

        string name = request.Name?.Trim() ?? string.Empty;
        string email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        string? phone = request.Phone?.Trim();

        // If authenticated, associate verified user identity and fallback to user profile details if blank
        int? validUserId = null;
        if (userId.HasValue && userId.Value > 0)
        {
            var user = await _auth.FindUserByIdAsync(userId.Value, ct);
            if (user is not null)
            {
                validUserId = user.Id;
                if (string.IsNullOrWhiteSpace(name))
                    name = user.FullName;
                if (string.IsNullOrWhiteSpace(email))
                    email = user.Email.ToLowerInvariant();
                if (string.IsNullOrWhiteSpace(phone))
                    phone = user.PhoneNumber;
            }
        }

        if (validUserId is null)
        {
            if (string.IsNullOrWhiteSpace(name))
                return ServiceResult<object?>.Fail("Name is required.", 422, new() { new("Name is required.", "name") });
            if (string.IsNullOrWhiteSpace(email))
                return ServiceResult<object?>.Fail("Email is required.", 422, new() { new("Email is required.", "email") });
        }

        await _store.AddInquiryAsync(new PropertyInquiry
        {
            PropertyId = propertyId,
            UserId = validUserId,
            Name = name,
            Email = email,
            Phone = phone,
            Message = request.Message.Trim(),
            IsRead = false
        }, ct);
        await _store.SaveChangesAsync(ct);

        foreach (var adminId in await _requests.GetAdminUserIdsAsync(ct))
            await _store.AddNotificationAsync(adminId, "New property inquiry",
                $"{name} asked about {property.Title}.", "inquiry", ct);
        await _store.SaveChangesAsync(ct);
        await _audit.LogAsync(validUserId, "inquiry.created", "PropertyInquiry",
            propertyId.ToString(), null, email, null, ct);

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
