using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Stores;

public sealed class AdminStore : IAdminStore
{
    private readonly DarcomDbContext _db;

    public AdminStore(DarcomDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardDto> GetDashboardAsync(CancellationToken ct = default)
    {
        var props = _db.Properties.AsNoTracking();
        var active = new[] { PropertyStatus.Published, PropertyStatus.Featured, PropertyStatus.Reserved };
        return new DashboardDto(
            TotalProperties: await props.CountAsync(ct),
            PublishedProperties: await props.CountAsync(p => active.Contains(p.Status), ct),
            PendingProperties: await props.CountAsync(p => p.Status == PropertyStatus.PendingReview, ct),
            SoldProperties: await props.CountAsync(p => p.Status == PropertyStatus.Sold || p.Status == PropertyStatus.Rented, ct),
            TotalUsers: await _db.Users.CountAsync(ct),
            PurchaseRequests: await _db.PurchaseRequests.CountAsync(ct),
            PendingPurchaseRequests: await _db.PurchaseRequests.CountAsync(r =>
                r.Status == RequestStatus.Pending || r.Status == RequestStatus.UnderReview
                || r.Status == RequestStatus.Contacted || r.Status == RequestStatus.Negotiation, ct),
            BookingRequests: await _db.BookingRequests.CountAsync(ct),
            PendingBookingRequests: await _db.BookingRequests.CountAsync(r =>
                r.Status == RequestStatus.Pending || r.Status == RequestStatus.UnderReview
                || r.Status == RequestStatus.Contacted || r.Status == RequestStatus.Negotiation, ct),
            PropertyViews: await _db.PropertyViews.LongCountAsync(ct),
            Inquiries: await _db.PropertyInquiries.CountAsync(ct),
            UnreadInquiries: await _db.PropertyInquiries.CountAsync(i => !i.IsRead, ct));
    }

    public async Task<PagedResult<AdminUserDto>> GetUsersAsync(string? search, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Users.AsNoTracking().Include(u => u.Role).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLowerInvariant();
            query = query.Where(u => u.FullName.ToLower().Contains(term) || u.Email.ToLower().Contains(term));
        }
        query = query.OrderByDescending(u => u.CreatedAt);
        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new AdminUserDto(u.Id, u.FullName, u.Email, u.PhoneNumber, u.Role.Name, u.IsActive, u.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<AdminUserDto>(items, page, pageSize, total, totalPages);
    }

    public async Task<AdminUserDto?> GetUserAsync(int userId, CancellationToken ct = default)
        => await _db.Users.AsNoTracking().Include(u => u.Role)
            .Where(u => u.Id == userId)
            .Select(u => new AdminUserDto(u.Id, u.FullName, u.Email, u.PhoneNumber, u.Role.Name, u.IsActive, u.CreatedAt))
            .FirstOrDefaultAsync(ct);

    public async Task<(int Id, string OldRole)?> SetUserRoleAsync(int userId, string roleName, CancellationToken ct = default)
    {
        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return null;
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName, ct);
        if (role is null) return null;
        var old = user.Role?.Name ?? string.Empty;
        user.RoleId = role.Id;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return (user.Id, old);
    }

    public Task<List<AdminAgentDto>> GetAgentsAsync(CancellationToken ct = default)
        => _db.Agents.AsNoTracking().OrderBy(a => a.Id)
            .Select(a => new AdminAgentDto(a.Id, a.Name, a.Title, a.Agency, a.Phone, a.Email, a.IsVerified))
            .ToListAsync(ct);

    public async Task<PagedResult<AdminReviewDto>> GetReviewsAsync(bool? approved, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Reviews.AsNoTracking()
            .Include(r => r.Property).Include(r => r.User).AsQueryable();
        if (approved.HasValue)
            query = query.Where(r => r.IsApproved == approved.Value);
        query = query.OrderByDescending(r => r.CreatedAt);
        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new AdminReviewDto(r.Id, r.PropertyId, r.Property.Title, r.UserId, r.User.FullName,
                r.Rating, r.Comment, r.IsApproved, r.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<AdminReviewDto>(items, page, pageSize, total, totalPages);
    }

    public async Task<bool> SetReviewApprovalAsync(int reviewId, bool approved, CancellationToken ct = default)
    {
        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.Id == reviewId, ct);
        if (review is null) return false;
        review.IsApproved = approved;
        review.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteReviewAsync(int reviewId, CancellationToken ct = default)
    {
        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.Id == reviewId, ct);
        if (review is null) return false;
        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> MarkInquiryReadAsync(int inquiryId, CancellationToken ct = default)
    {
        var inquiry = await _db.PropertyInquiries.FirstOrDefaultAsync(i => i.Id == inquiryId, ct);
        if (inquiry is null) return false;
        inquiry.IsRead = true;
        inquiry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
