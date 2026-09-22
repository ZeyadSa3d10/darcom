using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Stores;

public sealed class RequestStore : IRequestStore
{
    private readonly DarcomDbContext _db;

    public RequestStore(DarcomDbContext db)
    {
        _db = db;
    }

    public Task<PurchaseRequest?> GetPurchaseAsync(int id, CancellationToken ct = default)
        => _db.PurchaseRequests
            .Include(r => r.Property)
            .Include(r => r.Buyer)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<PurchaseRequestDto?> GetPurchaseDtoAsync(int id, CancellationToken ct = default)
    {
        var entity = await GetPurchaseAsync(id, ct);
        return entity is null ? null : ToPurchaseDto(entity);
    }

    public async Task<PagedResult<PurchaseRequestDto>> GetMyPurchasesAsync(int buyerId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.PurchaseRequests.AsNoTracking()
            .Include(r => r.Property).ThenInclude(p => p!.Location)
            .Where(r => r.BuyerId == buyerId)
            .OrderByDescending(r => r.CreatedAt);
        return await PageAsync(query, page, pageSize, ToPurchaseDto, ct);
    }

    public async Task<PagedResult<PurchaseRequestDto>> GetAllPurchasesAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.PurchaseRequests.AsNoTracking()
            .Include(r => r.Property).ThenInclude(p => p!.Location)
            .Include(r => r.Buyer)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<RequestStatus>(status.Replace(" ", ""), true, out var s))
            query = query.Where(r => r.Status == s);
        query = query.OrderByDescending(r => r.CreatedAt);
        return await PageAsync(query, page, pageSize, ToPurchaseDto, ct);
    }

    public Task<bool> HasActivePurchaseAsync(int propertyId, int buyerId, CancellationToken ct = default)
        => _db.PurchaseRequests.AnyAsync(r => r.PropertyId == propertyId && r.BuyerId == buyerId
            && (r.Status == RequestStatus.Pending || r.Status == RequestStatus.UnderReview
                || r.Status == RequestStatus.Contacted || r.Status == RequestStatus.Negotiation), ct);

    public async Task AddPurchaseAsync(PurchaseRequest request, CancellationToken ct = default)
        => await _db.PurchaseRequests.AddAsync(request, ct);

    public Task<BookingRequest?> GetBookingAsync(int id, CancellationToken ct = default)
        => _db.BookingRequests
            .Include(r => r.Property)
            .Include(r => r.Renter)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<BookingRequestDto?> GetBookingDtoAsync(int id, CancellationToken ct = default)
    {
        var entity = await GetBookingAsync(id, ct);
        return entity is null ? null : ToBookingDto(entity);
    }

    public async Task<PagedResult<BookingRequestDto>> GetMyBookingsAsync(int renterId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.BookingRequests.AsNoTracking()
            .Include(r => r.Property).ThenInclude(p => p!.Location)
            .Where(r => r.RenterId == renterId)
            .OrderByDescending(r => r.CreatedAt);
        return await PageAsync(query, page, pageSize, ToBookingDto, ct);
    }

    public async Task<PagedResult<BookingRequestDto>> GetAllBookingsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.BookingRequests.AsNoTracking()
            .Include(r => r.Property).ThenInclude(p => p!.Location)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<RequestStatus>(status.Replace(" ", ""), true, out var s))
            query = query.Where(r => r.Status == s);
        query = query.OrderByDescending(r => r.CreatedAt);
        return await PageAsync(query, page, pageSize, ToBookingDto, ct);
    }

    public Task<bool> HasActiveBookingAsync(int propertyId, int renterId, CancellationToken ct = default)
        => _db.BookingRequests.AnyAsync(r => r.PropertyId == propertyId && r.RenterId == renterId
            && (r.Status == RequestStatus.Pending || r.Status == RequestStatus.UnderReview
                || r.Status == RequestStatus.Contacted || r.Status == RequestStatus.Negotiation), ct);

    public async Task AddBookingAsync(BookingRequest request, CancellationToken ct = default)
        => await _db.BookingRequests.AddAsync(request, ct);

    public Task<Property?> GetPropertyAsync(int id, CancellationToken ct = default)
        => _db.Properties.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<List<int>> GetAdminUserIdsAsync(CancellationToken ct = default)
        => _db.Users.Where(u => u.Role.Name == "Admin" && u.IsActive).Select(u => u.Id).ToListAsync(ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);

    public async Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            await action();
            await tx.CommitAsync(ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    private static async Task<PagedResult<TDto>> PageAsync<TEntity, TDto>(
        IQueryable<TEntity> query, int page, int pageSize, Func<TEntity, TDto> map, CancellationToken ct)
    {
        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var entities = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PagedResult<TDto>(entities.Select(map).ToList(), page, pageSize, total, totalPages);
    }

    internal static PurchaseRequestDto ToPurchaseDto(PurchaseRequest r)
        => new(r.Id, r.RequestNumber, r.Status.ToString(), r.CreatedAt,
            new(r.PropertyId, r.Property?.Title ?? $"Property #{r.PropertyId}",
                r.Property?.Slug ?? string.Empty, r.Property?.ReferenceNumber ?? string.Empty,
                r.Property?.Price ?? 0, r.Property?.Currency ?? "EGP",
                r.Property?.Location?.Name ?? string.Empty),
            r.FullName, r.Email, r.Phone, r.PaymentMethod, r.FinancingRequired, r.Timeline);

    internal static BookingRequestDto ToBookingDto(BookingRequest r)
        => new(r.Id, r.RequestNumber, r.Status.ToString(), r.CreatedAt,
            new(r.PropertyId, r.Property?.Title ?? $"Property #{r.PropertyId}",
                r.Property?.Slug ?? string.Empty, r.Property?.ReferenceNumber ?? string.Empty,
                r.Property?.Price ?? 0, r.Property?.Currency ?? "EGP",
                r.Property?.Location?.Name ?? string.Empty),
            r.FullName, r.Email, r.Phone);
}
