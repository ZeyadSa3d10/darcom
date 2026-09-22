using Application.Common;
using Application.DTOs;
using Domain.Entities;

namespace Application.Stores;

public interface IRequestStore
{
    // Purchase
    Task<PurchaseRequest?> GetPurchaseAsync(int id, CancellationToken ct = default);
    Task<PurchaseRequestDto?> GetPurchaseDtoAsync(int id, CancellationToken ct = default);
    Task<PagedResult<PurchaseRequestDto>> GetMyPurchasesAsync(int buyerId, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<PurchaseRequestDto>> GetAllPurchasesAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<bool> HasActivePurchaseAsync(int propertyId, int buyerId, CancellationToken ct = default);
    Task AddPurchaseAsync(PurchaseRequest request, CancellationToken ct = default);

    // Booking
    Task<BookingRequest?> GetBookingAsync(int id, CancellationToken ct = default);
    Task<BookingRequestDto?> GetBookingDtoAsync(int id, CancellationToken ct = default);
    Task<PagedResult<BookingRequestDto>> GetMyBookingsAsync(int renterId, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<BookingRequestDto>> GetAllBookingsAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<bool> HasActiveBookingAsync(int propertyId, int renterId, CancellationToken ct = default);
    Task AddBookingAsync(BookingRequest request, CancellationToken ct = default);

    // Shared
    Task<Property?> GetPropertyAsync(int id, CancellationToken ct = default);
    Task<List<int>> GetAdminUserIdsAsync(CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default);
}
