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
            .Include(r => r.Property).ThenInclude(p => p!.Village)
            .Include(r => r.Property).ThenInclude(p => p!.Location)
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
            .Include(r => r.Property).ThenInclude(p => p!.Village)
            .Include(r => r.Property).ThenInclude(p => p!.Location)
            .Where(r => r.BuyerId == buyerId)
            .OrderByDescending(r => r.CreatedAt);
        return await PageAsync(query, page, pageSize, ToPurchaseDto, ct);
    }

    public async Task<PagedResult<PurchaseRequestDto>> GetAllPurchasesAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.PurchaseRequests.AsNoTracking()
            .Include(r => r.Property).ThenInclude(p => p!.Village)
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
            .Include(r => r.Property).ThenInclude(p => p!.Village)
            .Include(r => r.Property).ThenInclude(p => p!.Location)
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
            .Include(r => r.Property).ThenInclude(p => p!.Village)
            .Include(r => r.Property).ThenInclude(p => p!.Location)
            .Where(r => r.RenterId == renterId)
            .OrderByDescending(r => r.CreatedAt);
        return await PageAsync(query, page, pageSize, ToBookingDto, ct);
    }

    public async Task<PagedResult<BookingRequestDto>> GetAllBookingsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.BookingRequests.AsNoTracking()
            .Include(r => r.Property).ThenInclude(p => p!.Village)
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

    // Rental Period (Confirmed reservations - Requirement 9)
    public Task<bool> HasOverlappingRentalPeriodAsync(int propertyId, DateTime startDate, DateTime endDate, int? excludeId = null, CancellationToken ct = default)
        => _db.RentalPeriods.AnyAsync(rp => rp.PropertyId == propertyId
            && (!excludeId.HasValue || rp.Id != excludeId.Value)
            && rp.StartDate < endDate && rp.EndDate > startDate, ct);

    public async Task AddRentalPeriodAsync(RentalPeriod period, CancellationToken ct = default)
        => await _db.RentalPeriods.AddAsync(period, ct);

    // Broker Property Requests (Requirement 8)
    public async Task AddBrokerRequestAsync(BrokerPropertyRequest request, CancellationToken ct = default)
        => await _db.BrokerPropertyRequests.AddAsync(request, ct);

    public Task<BrokerPropertyRequest?> GetBrokerRequestAsync(int id, CancellationToken ct = default)
        => _db.BrokerPropertyRequests
            .Include(r => r.Property)
            .Include(r => r.Broker)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<BrokerPropertyRequestDto?> GetBrokerRequestDtoAsync(int id, CancellationToken ct = default)
    {
        var r = await GetBrokerRequestAsync(id, ct);
        return r is null ? null : ToBrokerRequestDto(r);
    }

    public async Task<PagedResult<BrokerPropertyRequestDto>> GetBrokerRequestsAsync(int brokerId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.BrokerPropertyRequests.AsNoTracking()
            .Include(r => r.Property)
            .Include(r => r.Broker)
            .Where(r => r.BrokerId == brokerId)
            .OrderByDescending(r => r.CreatedAt);
        return await PageAsync(query, page, pageSize, ToBrokerRequestDto, ct);
    }

    public Task<int> GetBrokerClientRequestsCountAsync(int brokerId, CancellationToken ct = default)
        => _db.BrokerPropertyRequests.AsNoTracking().CountAsync(r => r.BrokerId == brokerId, ct);

    public async Task<PagedResult<BrokerPropertyRequestDto>> GetAllBrokerRequestsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.BrokerPropertyRequests.AsNoTracking()
            .Include(r => r.Property)
            .Include(r => r.Broker)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<RequestStatus>(status.Replace(" ", ""), true, out var s))
            query = query.Where(r => r.Status == s);
        query = query.OrderByDescending(r => r.CreatedAt);
        return await PageAsync(query, page, pageSize, ToBrokerRequestDto, ct);
    }

    // Broker Property Submissions (Workflow 1)
    public async Task AddBrokerSubmissionAsync(BrokerPropertySubmission submission, CancellationToken ct = default)
        => await _db.BrokerPropertySubmissions.AddAsync(submission, ct);

    public Task<BrokerPropertySubmission?> GetBrokerSubmissionAsync(int id, CancellationToken ct = default)
        => _db.BrokerPropertySubmissions
            .Include(s => s.Broker)
            .Include(s => s.Village)
            .Include(s => s.Zone)
            .Include(s => s.CreatedProperty)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

    public async Task<BrokerPropertySubmissionDto?> GetBrokerSubmissionDtoAsync(int id, CancellationToken ct = default)
    {
        var s = await GetBrokerSubmissionAsync(id, ct);
        return s is null ? null : ToBrokerSubmissionDto(s);
    }

    public async Task<PagedResult<BrokerPropertySubmissionDto>> GetBrokerSubmissionsAsync(int brokerId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.BrokerPropertySubmissions.AsNoTracking()
            .Include(s => s.Broker)
            .Include(s => s.Village)
            .Include(s => s.Zone)
            .Include(s => s.CreatedProperty)
            .Where(s => s.BrokerId == brokerId)
            .OrderByDescending(s => s.CreatedAt);
        return await PageAsync(query, page, pageSize, ToBrokerSubmissionDto, ct);
    }

    public async Task<PagedResult<BrokerPropertySubmissionDto>> GetAllBrokerSubmissionsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.BrokerPropertySubmissions.AsNoTracking()
            .Include(s => s.Broker)
            .Include(s => s.Village)
            .Include(s => s.Zone)
            .Include(s => s.CreatedProperty)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<RequestStatus>(status.Replace(" ", ""), true, out var s))
            query = query.Where(r => r.Status == s);

        query = query.OrderByDescending(r => r.CreatedAt);
        return await PageAsync(query, page, pageSize, ToBrokerSubmissionDto, ct);
    }

    public Task<int> GetBrokerSubmissionsCountAsync(int brokerId, string? status = null, CancellationToken ct = default)
    {
        var query = _db.BrokerPropertySubmissions.AsNoTracking().Where(s => s.BrokerId == brokerId);
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<RequestStatus>(status.Replace(" ", ""), true, out var s))
            query = query.Where(r => r.Status == s);
        return query.CountAsync(ct);
    }

    public Task<int> GetBrokerRequirementsCountAsync(int brokerId, CancellationToken ct = default)
        => _db.PropertyRequirements.AsNoTracking().CountAsync(r => r.UserId == brokerId, ct);

    // Broker Profiles (Requirement 7)
    public Task<BrokerProfile?> GetBrokerProfileByUserIdAsync(int userId, CancellationToken ct = default)
        => _db.BrokerProfiles
            .Include(bp => bp.User)
            .FirstOrDefaultAsync(bp => bp.UserId == userId, ct);

    public Task<BrokerProfile?> GetBrokerProfileAsync(int id, CancellationToken ct = default)
        => _db.BrokerProfiles
            .Include(bp => bp.User)
            .FirstOrDefaultAsync(bp => bp.Id == id, ct);

    public async Task<BrokerProfileDto?> GetBrokerProfileDtoAsync(int id, CancellationToken ct = default)
    {
        var bp = await GetBrokerProfileAsync(id, ct);
        return bp is null ? null : ToBrokerProfileDto(bp);
    }

    public async Task<PagedResult<BrokerProfileDto>> GetAllBrokersAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.BrokerProfiles.AsNoTracking()
            .Include(bp => bp.User)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<BrokerStatus>(status.Replace(" ", ""), true, out var s))
            query = query.Where(bp => bp.Status == s);
        query = query.OrderByDescending(bp => bp.CreatedAt);
        return await PageAsync(query, page, pageSize, ToBrokerProfileDto, ct);
    }

    public async Task AddBrokerProfileAsync(BrokerProfile profile, CancellationToken ct = default)
        => await _db.BrokerProfiles.AddAsync(profile, ct);

    // Property Requirements (Requirement 10)
    public async Task AddPropertyRequirementAsync(PropertyRequirement requirement, CancellationToken ct = default)
        => await _db.PropertyRequirements.AddAsync(requirement, ct);

    public Task<PropertyRequirement?> GetPropertyRequirementAsync(int id, CancellationToken ct = default)
        => _db.PropertyRequirements
            .Include(pr => pr.PropertyType)
            .Include(pr => pr.Village)
            .Include(pr => pr.Zone)
            .Include(pr => pr.User)
            .Include(pr => pr.AssignedStaff)
            .FirstOrDefaultAsync(pr => pr.Id == id, ct);

    public async Task<PropertyRequirementDto?> GetPropertyRequirementDtoAsync(int id, CancellationToken ct = default)
    {
        var pr = await GetPropertyRequirementAsync(id, ct);
        return pr is null ? null : ToRequirementDto(pr);
    }

    public async Task<PagedResult<PropertyRequirementDto>> GetMyRequirementsAsync(int userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.PropertyRequirements.AsNoTracking()
            .Include(pr => pr.PropertyType)
            .Include(pr => pr.Village)
            .Include(pr => pr.Zone)
            .Include(pr => pr.AssignedStaff)
            .Where(pr => pr.UserId == userId)
            .OrderByDescending(pr => pr.CreatedAt);
        return await PageAsync(query, page, pageSize, ToRequirementDto, ct);
    }

    public async Task<PagedResult<PropertyRequirementDto>> GetAllRequirementsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.PropertyRequirements.AsNoTracking()
            .Include(pr => pr.PropertyType)
            .Include(pr => pr.Village)
            .Include(pr => pr.Zone)
            .Include(pr => pr.AssignedStaff)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<RequestStatus>(status.Replace(" ", ""), true, out var s))
            query = query.Where(pr => pr.Status == s);
        query = query.OrderByDescending(pr => pr.CreatedAt);
        return await PageAsync(query, page, pageSize, ToRequirementDto, ct);
    }

    // Shared
    public Task<Property?> GetPropertyAsync(int id, CancellationToken ct = default)
        => _db.Properties
            .Include(p => p.Village)
            .Include(p => p.Zone)
            .Include(p => p.Location)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<List<int>> GetAdminUserIdsAsync(CancellationToken ct = default)
        => (from ur in _db.UserRoles
            join r in _db.Roles on ur.RoleId equals r.Id
            join u in _db.Users on ur.UserId equals u.Id
            where r.Name == "Admin" && u.IsActive
            select u.Id).ToListAsync(ct);

    // User Property Listing Requests ("اعرض عقارك")
    public async Task AddListingRequestAsync(PropertyListingRequest request, CancellationToken ct = default)
        => await _db.PropertyListingRequests.AddAsync(request, ct);

    public async Task<PropertyListingRequest?> GetListingRequestAsync(int id, CancellationToken ct = default)
        => await _db.PropertyListingRequests
            .Include(r => r.User)
            .Include(r => r.Village)
            .Include(r => r.Zone)
            .Include(r => r.AssignedAdmin)
            .Include(r => r.CreatedProperty)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<PropertyListingRequestDto?> GetListingRequestDtoAsync(int id, CancellationToken ct = default)
    {
        var entity = await GetListingRequestAsync(id, ct);
        return entity == null ? null : ToListingRequestDto(entity);
    }

    public async Task<PagedResult<PropertyListingRequestDto>> GetMyListingRequestsAsync(int userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.PropertyListingRequests.AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.Village)
            .Include(r => r.Zone)
            .Include(r => r.AssignedAdmin)
            .Include(r => r.CreatedProperty)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt);

        return await PageAsync(query, page, pageSize, ToListingRequestDto, ct);
    }

    public async Task<PagedResult<PropertyListingRequestDto>> GetAllListingRequestsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.PropertyListingRequests.AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.Village)
            .Include(r => r.Zone)
            .Include(r => r.AssignedAdmin)
            .Include(r => r.CreatedProperty)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ListingRequestStatus>(status, true, out var parsed))
        {
            query = query.Where(r => r.Status == parsed);
        }

        query = query.OrderByDescending(r => r.CreatedAt);
        return await PageAsync(query, page, pageSize, ToListingRequestDto, ct);
    }

    public async Task<bool> HasActiveListingRequestAsync(int villageId, string buildingNumber, string unitNumber, CancellationToken ct = default)
    {
        var b = buildingNumber.Trim().ToLower();
        var u = unitNumber.Trim().ToLower();
        return await _db.PropertyListingRequests
            .AnyAsync(r => r.VillageId == villageId
                        && r.BuildingNumber.ToLower() == b
                        && r.UnitNumber.ToLower() == u
                        && r.Status != ListingRequestStatus.Completed
                        && r.Status != ListingRequestStatus.Rejected, ct);
    }

    public async Task<bool> VillageExistsAsync(int villageId, CancellationToken ct = default)
        => await _db.Villages.AnyAsync(v => v.Id == villageId, ct);

    public async Task<bool> ZoneBelongsToVillageAsync(int zoneId, int villageId, CancellationToken ct = default)
        => await _db.Zones.AnyAsync(z => z.Id == zoneId && z.VillageId == villageId, ct);

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
                r.Property?.Village?.Name ?? r.Property?.Location?.Name ?? string.Empty),
            r.FullName, r.Email, r.Phone, r.PaymentMethod, r.FinancingRequired, r.Timeline);

    internal static BookingRequestDto ToBookingDto(BookingRequest r)
        => new(r.Id, r.RequestNumber, r.Status.ToString(), r.CreatedAt,
            new(r.PropertyId, r.Property?.Title ?? $"Property #{r.PropertyId}",
                r.Property?.Slug ?? string.Empty, r.Property?.ReferenceNumber ?? string.Empty,
                r.Property?.Price ?? 0, r.Property?.Currency ?? "EGP",
                r.Property?.Village?.Name ?? r.Property?.Location?.Name ?? string.Empty),
            r.FullName, r.Email, r.Phone, r.StartDate, r.EndDate);

    internal static BrokerPropertyRequestDto ToBrokerRequestDto(BrokerPropertyRequest r)
        => new(r.Id, r.BrokerId, r.Broker?.FullName ?? $"Broker #{r.BrokerId}",
            r.PropertyId, r.Property?.Title ?? $"Property #{r.PropertyId}",
            r.ClientName, r.ClientPhone, r.Purpose.ToString(),
            r.StartDate, r.EndDate, r.Status.ToString(), r.Notes, r.CreatedAt);

    internal static BrokerProfileDto ToBrokerProfileDto(BrokerProfile bp)
        => new(bp.Id, bp.UserId, bp.User?.FullName ?? string.Empty,
            bp.User?.Email ?? string.Empty, bp.User?.PhoneNumber,
            bp.AgencyName, bp.LicenseNumber, bp.NationalId, bp.DocumentUrl,
            bp.IdCardFrontPath, bp.IdCardBackPath, bp.IsPhoneVerified,
            bp.Status.ToString(), bp.AdminNotes, bp.ApprovedAt, bp.CreatedAt);

    internal static BrokerPropertySubmissionDto ToBrokerSubmissionDto(BrokerPropertySubmission s)
        => new(s.Id, s.BrokerId, s.Broker?.FullName ?? $"Broker #{s.BrokerId}",
            s.Broker?.PhoneNumber,
            s.VillageId, s.Village?.Name ?? $"Village #{s.VillageId}",
            s.ZoneId, s.Zone?.Name,
            s.Area, s.UnitNumber, s.Status.ToString(), s.AdminNotes, s.CreatedProperty?.Id, s.CreatedAt);

    internal static PropertyRequirementDto ToRequirementDto(PropertyRequirement pr)
        => new(pr.Id, pr.UserId, pr.CustomerName, pr.CustomerEmail, pr.CustomerPhone,
            pr.Purpose.ToString(), pr.PropertyTypeId, pr.PropertyType?.Name,
            pr.VillageId, pr.Village?.Name, pr.ZoneId, pr.Zone?.Name,
            pr.MinPrice, pr.MaxPrice, pr.Bedrooms, pr.StartDate, pr.EndDate,
            pr.DesiredAmenities, pr.Notes, pr.Status.ToString(),
            pr.AssignedStaffId, pr.AssignedStaff?.FullName, pr.CreatedAt);

    internal static PropertyListingRequestDto ToListingRequestDto(PropertyListingRequest r)
        => new(
            r.Id,
            r.RequestNumber,
            r.UserId,
            r.User?.FullName ?? $"User #{r.UserId}",
            r.PhoneNumber,
            r.VillageId,
            r.Village?.Name ?? $"Village #{r.VillageId}",
            r.Village?.NameAr,
            r.ZoneId,
            r.Zone?.Name ?? $"Zone #{r.ZoneId}",
            r.Zone?.NameAr,
            r.BuildingNumber,
            r.UnitNumber,
            r.Status.ToString(),
            r.AdminNotes,
            r.InspectionDate,
            r.AssignedAdminId,
            r.AssignedAdmin?.FullName,
            r.PropertyId,
            r.CreatedProperty?.Title,
            r.CreatedProperty?.ReferenceNumber,
            r.CreatedAt,
            r.UpdatedAt);
}
