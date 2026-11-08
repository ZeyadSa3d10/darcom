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

    // Rental Period (Confirmed reservations - Requirement 9)
    Task<bool> HasOverlappingRentalPeriodAsync(int propertyId, DateTime startDate, DateTime endDate, int? excludeId = null, CancellationToken ct = default);
    Task AddRentalPeriodAsync(RentalPeriod period, CancellationToken ct = default);

    // Broker Property Requests (Requirement 8)
    Task AddBrokerRequestAsync(BrokerPropertyRequest request, CancellationToken ct = default);
    Task<BrokerPropertyRequest?> GetBrokerRequestAsync(int id, CancellationToken ct = default);
    Task<BrokerPropertyRequestDto?> GetBrokerRequestDtoAsync(int id, CancellationToken ct = default);
    Task<PagedResult<BrokerPropertyRequestDto>> GetBrokerRequestsAsync(int brokerId, int page, int pageSize, CancellationToken ct = default);
    Task<int> GetBrokerClientRequestsCountAsync(int brokerId, CancellationToken ct = default);
    Task<PagedResult<BrokerPropertyRequestDto>> GetAllBrokerRequestsAsync(string? status, int page, int pageSize, CancellationToken ct = default);

    // Broker Property Submissions (Workflow 1)
    Task AddBrokerSubmissionAsync(BrokerPropertySubmission submission, CancellationToken ct = default);
    Task<BrokerPropertySubmission?> GetBrokerSubmissionAsync(int id, CancellationToken ct = default);
    Task<BrokerPropertySubmissionDto?> GetBrokerSubmissionDtoAsync(int id, CancellationToken ct = default);
    Task<PagedResult<BrokerPropertySubmissionDto>> GetBrokerSubmissionsAsync(int brokerId, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<BrokerPropertySubmissionDto>> GetAllBrokerSubmissionsAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<int> GetBrokerSubmissionsCountAsync(int brokerId, string? status = null, CancellationToken ct = default);
    Task<int> GetBrokerRequirementsCountAsync(int brokerId, CancellationToken ct = default);

    // Broker Profiles (Requirement 7)
    Task<BrokerProfile?> GetBrokerProfileByUserIdAsync(int userId, CancellationToken ct = default);
    Task<BrokerProfile?> GetBrokerProfileAsync(int id, CancellationToken ct = default);
    Task<BrokerProfileDto?> GetBrokerProfileDtoAsync(int id, CancellationToken ct = default);
    Task<PagedResult<BrokerProfileDto>> GetAllBrokersAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task AddBrokerProfileAsync(BrokerProfile profile, CancellationToken ct = default);

    // Property Requirements (Requirement 10)
    Task AddPropertyRequirementAsync(PropertyRequirement requirement, CancellationToken ct = default);
    Task<PropertyRequirement?> GetPropertyRequirementAsync(int id, CancellationToken ct = default);
    Task<PropertyRequirementDto?> GetPropertyRequirementDtoAsync(int id, CancellationToken ct = default);
    Task<PagedResult<PropertyRequirementDto>> GetMyRequirementsAsync(int userId, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<PropertyRequirementDto>> GetAllRequirementsAsync(string? status, int page, int pageSize, CancellationToken ct = default);

    // User Property Listing Requests ("اعرض عقارك")
    Task AddListingRequestAsync(PropertyListingRequest request, CancellationToken ct = default);
    Task<PropertyListingRequest?> GetListingRequestAsync(int id, CancellationToken ct = default);
    Task<PropertyListingRequestDto?> GetListingRequestDtoAsync(int id, CancellationToken ct = default);
    Task<PagedResult<PropertyListingRequestDto>> GetMyListingRequestsAsync(int userId, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<PropertyListingRequestDto>> GetAllListingRequestsAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<bool> HasActiveListingRequestAsync(int villageId, string buildingNumber, string unitNumber, CancellationToken ct = default);
    Task<bool> VillageExistsAsync(int villageId, CancellationToken ct = default);
    Task<bool> ZoneBelongsToVillageAsync(int zoneId, int villageId, CancellationToken ct = default);

    // Shared
    Task<Property?> GetPropertyAsync(int id, CancellationToken ct = default);
    Task<List<int>> GetAdminUserIdsAsync(CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default);
}
