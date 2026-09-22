using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;
using Domain.Enums;
using Domain.Rules;

namespace Application.Services;

public interface IRequestService
{
    Task<ServiceResult<PurchaseRequestDto>> CreatePurchaseAsync(int buyerId, CreatePurchaseRequest request, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PurchaseRequestDto>>> MyPurchasesAsync(int buyerId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<BookingRequestDto>> CreateBookingAsync(int renterId, CreateBookingRequest request, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<BookingRequestDto>>> MyBookingsAsync(int renterId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PurchaseRequestDto>>> AllPurchasesAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<BookingRequestDto>>> AllBookingsAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PurchaseRequestDto>> SetPurchaseStatusAsync(int adminId, int id, UpdateRequestStatusRequest request, string? ipAddress, CancellationToken ct = default);
    Task<ServiceResult<BookingRequestDto>> SetBookingStatusAsync(int adminId, int id, UpdateRequestStatusRequest request, string? ipAddress, CancellationToken ct = default);
}

public sealed class RequestService : IRequestService
{
    private readonly IRequestStore _store;
    private readonly IEngagementStore _engagement;
    private readonly IAuditWriter _audit;

    public RequestService(IRequestStore store, IEngagementStore engagement, IAuditWriter audit)
    {
        _store = store;
        _engagement = engagement;
        _audit = audit;
    }

    public async Task<ServiceResult<PurchaseRequestDto>> CreatePurchaseAsync(int buyerId, CreatePurchaseRequest request, CancellationToken ct = default)
    {
        PurchaseRequest entity = null!;
        await _store.ExecuteInTransactionAsync(async () =>
        {
            // Server re-checks availability inside the transaction — never trusts frontend state.
            var property = await _store.GetPropertyAsync(request.PropertyId, ct);
            if (property is null)
                throw new RequestFailure(404, "Property not found.");
            if (property.Purpose == PropertyPurpose.Rent)
                throw new RequestFailure(422, "This property is for rent. Use a rental request instead.",
                    new() { new("This property is for rent.", "propertyId") });
            if (!PropertyRules.CanAcceptPurchaseRequest(property.Status))
                throw new RequestFailure(422, $"This property is {property.Status} and is no longer available.",
                    new() { new("Property is no longer available.", "propertyId") });
            if (await _store.HasActivePurchaseAsync(request.PropertyId, buyerId, ct))
                throw new RequestFailure(409, "You already have an active request for this property.",
                    new() { new("Duplicate request.", "propertyId") });

            entity = new PurchaseRequest
            {
                PropertyId = request.PropertyId,
                BuyerId = buyerId,
                Status = RequestStatus.Pending,
                RequestNumber = "PENDING",
                FullName = request.FullName.Trim(),
                Email = request.Email.Trim().ToLowerInvariant(),
                Phone = request.Phone.Trim(),
                Country = request.Country,
                City = request.City,
                NationalId = request.NationalId,
                PreferredContact = request.PreferredContact,
                Address = request.Address,
                Notes = request.Notes,
                PaymentMethod = request.PaymentMethod,
                FinancingRequired = request.FinancingRequired,
                PreferredAppointment = request.PreferredAppointment,
                Timeline = request.Timeline
            };
            await _store.AddPurchaseAsync(entity, ct);
            await _store.SaveChangesAsync(ct);
            entity.RequestNumber = $"PR-{DateTime.UtcNow:yyyy}-{entity.Id:D6}";
            await _store.SaveChangesAsync(ct);
        }, ct);

        foreach (var adminId in await _store.GetAdminUserIdsAsync(ct))
            await _engagement.AddNotificationAsync(adminId, "New purchase request",
                $"{request.FullName} requested {entity.Property?.Title ?? $"property #{entity.PropertyId}"} ({entity.RequestNumber}).",
                "purchase-request", ct);
        await _engagement.SaveChangesAsync(ct);
        await _audit.LogAsync(buyerId, "purchase-request.created", "PurchaseRequest",
            entity.Id.ToString(), null, entity.RequestNumber, null, ct);

        var dto = await _store.GetPurchaseDtoAsync(entity.Id, ct);
        return ServiceResult<PurchaseRequestDto>.Created(dto!,
            "Your request has been submitted. Our team will contact you shortly — this is not a completed purchase.");
    }

    public async Task<ServiceResult<PagedResult<PurchaseRequestDto>>> MyPurchasesAsync(int buyerId, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<PurchaseRequestDto>>.Ok(
            await _store.GetMyPurchasesAsync(buyerId, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

    public async Task<ServiceResult<BookingRequestDto>> CreateBookingAsync(int renterId, CreateBookingRequest request, CancellationToken ct = default)
    {
        BookingRequest entity = null!;
        await _store.ExecuteInTransactionAsync(async () =>
        {
            var property = await _store.GetPropertyAsync(request.PropertyId, ct);
            if (property is null)
                throw new RequestFailure(404, "Property not found.");
            if (property.Purpose != PropertyPurpose.Rent)
                throw new RequestFailure(422, "This property is not listed for rent.",
                    new() { new("Property is not for rent.", "propertyId") });
            if (!PropertyRules.CanAcceptRentalRequest(property.Status))
                throw new RequestFailure(422, $"This property is {property.Status} and is no longer available.",
                    new() { new("Property is no longer available.", "propertyId") });
            if (await _store.HasActiveBookingAsync(request.PropertyId, renterId, ct))
                throw new RequestFailure(409, "You already have an active rental request for this property.",
                    new() { new("Duplicate request.", "propertyId") });

            entity = new BookingRequest
            {
                PropertyId = request.PropertyId,
                RenterId = renterId,
                Status = RequestStatus.Pending,
                RequestNumber = "PENDING",
                FullName = request.FullName.Trim(),
                Email = request.Email.Trim().ToLowerInvariant(),
                Phone = request.Phone.Trim(),
                StartDate = request.StartDate,
                Duration = request.Duration,
                Notes = request.Notes
            };
            await _store.AddBookingAsync(entity, ct);
            await _store.SaveChangesAsync(ct);
            entity.RequestNumber = $"BR-{DateTime.UtcNow:yyyy}-{entity.Id:D6}";
            await _store.SaveChangesAsync(ct);
        }, ct);

        foreach (var adminId in await _store.GetAdminUserIdsAsync(ct))
            await _engagement.AddNotificationAsync(adminId, "New rental request",
                $"{request.FullName} requested rental of {entity.Property?.Title ?? $"property #{entity.PropertyId}"} ({entity.RequestNumber}).",
                "purchase-request", ct);
        await _engagement.SaveChangesAsync(ct);
        await _audit.LogAsync(renterId, "booking-request.created", "BookingRequest",
            entity.Id.ToString(), null, entity.RequestNumber, null, ct);

        var dto = await _store.GetBookingDtoAsync(entity.Id, ct);
        return ServiceResult<BookingRequestDto>.Created(dto!,
            "Your rental request has been submitted. Our team will contact you shortly.");
    }

    public async Task<ServiceResult<PagedResult<BookingRequestDto>>> MyBookingsAsync(int renterId, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<BookingRequestDto>>.Ok(
            await _store.GetMyBookingsAsync(renterId, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

    public async Task<ServiceResult<PagedResult<PurchaseRequestDto>>> AllPurchasesAsync(string? status, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<PurchaseRequestDto>>.Ok(
            await _store.GetAllPurchasesAsync(status, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

    public async Task<ServiceResult<PagedResult<BookingRequestDto>>> AllBookingsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<BookingRequestDto>>.Ok(
            await _store.GetAllBookingsAsync(status, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

    public async Task<ServiceResult<PurchaseRequestDto>> SetPurchaseStatusAsync(int adminId, int id, UpdateRequestStatusRequest request, string? ipAddress, CancellationToken ct = default)
    {
        var entity = await _store.GetPurchaseAsync(id, ct);
        if (entity is null)
            return ServiceResult<PurchaseRequestDto>.NotFound("Request not found.");

        var next = Enum.Parse<RequestStatus>(request.Status.Replace(" ", ""), true);
        if (!RequestRules.CanTransition(entity.Status, next))
            return ServiceResult<PurchaseRequestDto>.Fail(
                $"Cannot move request from {entity.Status} to {next}.", 422,
                new() { new("Illegal status transition.", "status") });

        var old = entity.Status;
        entity.Status = next;
        entity.AdminNotes = request.AdminNotes;
        entity.UpdatedAt = DateTime.UtcNow;
        await _store.SaveChangesAsync(ct);

        await _engagement.AddNotificationAsync(entity.BuyerId, $"Request {entity.RequestNumber}: {next}",
            $"Your request for {entity.Property?.Title ?? "the property"} is now {next}.", "request-status", ct);
        await _engagement.SaveChangesAsync(ct);
        await _audit.LogAsync(adminId, "purchase-request.status", "PurchaseRequest",
            entity.Id.ToString(), old.ToString(), next.ToString(), ipAddress, ct);

        var dto = await _store.GetPurchaseDtoAsync(entity.Id, ct);
        return ServiceResult<PurchaseRequestDto>.Ok(dto!, $"Request {next.ToString().ToLowerInvariant()}.");
    }

    public async Task<ServiceResult<BookingRequestDto>> SetBookingStatusAsync(int adminId, int id, UpdateRequestStatusRequest request, string? ipAddress, CancellationToken ct = default)
    {
        var entity = await _store.GetBookingAsync(id, ct);
        if (entity is null)
            return ServiceResult<BookingRequestDto>.NotFound("Request not found.");

        var next = Enum.Parse<RequestStatus>(request.Status.Replace(" ", ""), true);
        if (!RequestRules.CanTransition(entity.Status, next))
            return ServiceResult<BookingRequestDto>.Fail(
                $"Cannot move request from {entity.Status} to {next}.", 422,
                new() { new("Illegal status transition.", "status") });

        var old = entity.Status;
        entity.Status = next;
        entity.UpdatedAt = DateTime.UtcNow;
        await _store.SaveChangesAsync(ct);

        await _engagement.AddNotificationAsync(entity.RenterId, $"Request {entity.RequestNumber}: {next}",
            $"Your rental request for {entity.Property?.Title ?? "the property"} is now {next}.", "request-status", ct);
        await _engagement.SaveChangesAsync(ct);
        await _audit.LogAsync(adminId, "booking-request.status", "BookingRequest",
            entity.Id.ToString(), old.ToString(), next.ToString(), ipAddress, ct);

        var dto = await _store.GetBookingDtoAsync(entity.Id, ct);
        return ServiceResult<BookingRequestDto>.Ok(dto!, $"Request {next.ToString().ToLowerInvariant()}.");
    }
}

/// <summary>Typed control-flow for transactional failures (mapped to status codes by controllers).</summary>
public sealed class RequestFailure : Exception
{
    public int StatusCode { get; }
    public List<ApiError> Errors { get; }

    public RequestFailure(int statusCode, string message, List<ApiError>? errors = null)
        : base(message)
    {
        StatusCode = statusCode;
        Errors = errors ?? new();
    }
}
