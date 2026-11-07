using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;
using Domain.Enums;
using Domain.Rules;

namespace Application.Services;

public interface IRequestService
{
    // Purchase
    Task<ServiceResult<PurchaseRequestDto>> CreatePurchaseAsync(int buyerId, CreatePurchaseRequest request, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PurchaseRequestDto>>> MyPurchasesAsync(int buyerId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PurchaseRequestDto>>> AllPurchasesAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PurchaseRequestDto>> SetPurchaseStatusAsync(int adminId, int id, UpdateRequestStatusRequest request, string? ipAddress, CancellationToken ct = default);

    // Booking (Rentals - Requirement 9)
    Task<ServiceResult<BookingRequestDto>> CreateBookingAsync(int renterId, CreateBookingRequest request, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<BookingRequestDto>>> MyBookingsAsync(int renterId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<BookingRequestDto>>> AllBookingsAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<BookingRequestDto>> SetBookingStatusAsync(int adminId, int id, UpdateRequestStatusRequest request, string? ipAddress, CancellationToken ct = default);

    // Broker Workflows (Requirements 7 & 8)
    Task<ServiceResult<BrokerDashboardDto>> GetBrokerDashboardAsync(int brokerUserId, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PropertyListDto>>> GetBrokerPropertiesAsync(int brokerUserId, string? status, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PropertyDetailsDto>> SubmitBrokerPropertyAsync(int brokerUserId, BrokerPropertySubmissionRequest request, CancellationToken ct = default);
    Task<ServiceResult<BrokerProfileDto>> RegisterBrokerAsync(int userId, RegisterBrokerRequest request, CancellationToken ct = default);
    Task<ServiceResult<BrokerProfileDto>> GetMyBrokerProfileAsync(int userId, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<BrokerProfileDto>>> AllBrokersAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<BrokerProfileDto>> SetBrokerStatusAsync(int adminId, int brokerProfileId, SetBrokerStatusRequest request, CancellationToken ct = default);
    Task<ServiceResult<BrokerPropertyRequestDto>> CreateBrokerRequestAsync(int brokerUserId, CreateBrokerPropertyRequest request, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<BrokerPropertyRequestDto>>> MyBrokerRequestsAsync(int brokerUserId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<BrokerPropertyRequestDto>>> AllBrokerRequestsAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<BrokerPropertyRequestDto>> SetBrokerRequestStatusAsync(int adminId, int id, UpdateRequestStatusRequest request, CancellationToken ct = default);

    // Customer Property Requirements (Requirement 10)
    Task<ServiceResult<PropertyRequirementDto>> CreateRequirementAsync(int? userId, CreatePropertyRequirementRequest request, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PropertyRequirementDto>>> MyRequirementsAsync(int userId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PropertyRequirementDto>>> AllRequirementsAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PropertyRequirementDto>> SetRequirementStatusAsync(int adminId, int id, UpdateRequirementStatusRequest request, CancellationToken ct = default);
}

public sealed class RequestService : IRequestService
{
    private readonly IRequestStore _store;
    private readonly IPropertyStore _properties;
    private readonly IEngagementStore _engagement;
    private readonly IAuditWriter _audit;

    public RequestService(IRequestStore store, IPropertyStore properties, IEngagementStore engagement, IAuditWriter audit)
    {
        _store = store;
        _properties = properties;
        _engagement = engagement;
        _audit = audit;
    }

    // -------------------------------------------------------------
    // Purchase Requests
    // -------------------------------------------------------------

    public async Task<ServiceResult<PurchaseRequestDto>> CreatePurchaseAsync(int buyerId, CreatePurchaseRequest request, CancellationToken ct = default)
    {
        PurchaseRequest entity = null!;
        await _store.ExecuteInTransactionAsync(async () =>
        {
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

    public async Task<ServiceResult<PagedResult<PurchaseRequestDto>>> AllPurchasesAsync(string? status, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<PurchaseRequestDto>>.Ok(
            await _store.GetAllPurchasesAsync(status, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

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

    // -------------------------------------------------------------
    // Booking (Rental) Requests - Requirement 9
    // -------------------------------------------------------------

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

            // Date validation & conflict check (Requirement 9)
            if (request.StartDate.HasValue && request.EndDate.HasValue)
            {
                if (request.EndDate.Value <= request.StartDate.Value)
                    throw new RequestFailure(422, "End date must be after start date.",
                        new() { new("End date must be after start date.", "endDate") });

                if (await _store.HasOverlappingRentalPeriodAsync(request.PropertyId, request.StartDate.Value, request.EndDate.Value, null, ct))
                    throw new RequestFailure(409, "Property already has a confirmed rental reservation for the requested dates.",
                        new() { new("Overlapping confirmed reservation.", "dates") });
            }

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
                EndDate = request.EndDate,
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
                "booking-request", ct);
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

    public async Task<ServiceResult<PagedResult<BookingRequestDto>>> AllBookingsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<BookingRequestDto>>.Ok(
            await _store.GetAllBookingsAsync(status, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

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

        // Confirming a booking reservation creates a confirmed RentalPeriod (Requirement 9)
        if (next == RequestStatus.Approved && entity.StartDate.HasValue && entity.EndDate.HasValue)
        {
            // Proper date-overlap check: Existing.StartDate < Requested.EndDate && Existing.EndDate > Requested.StartDate
            if (await _store.HasOverlappingRentalPeriodAsync(entity.PropertyId, entity.StartDate.Value, entity.EndDate.Value, null, ct))
            {
                return ServiceResult<BookingRequestDto>.Fail(
                    "Cannot approve: this property has an overlapping confirmed rental reservation.", 409,
                    new() { new("Property has an overlapping confirmed reservation for these dates.", "status") });
            }

            var confirmedReservation = new RentalPeriod
            {
                PropertyId = entity.PropertyId,
                BookingRequestId = entity.Id,
                StartDate = entity.StartDate.Value,
                EndDate = entity.EndDate.Value,
                RenterName = entity.FullName,
                RenterPhone = entity.Phone,
                Notes = $"Confirmed from {entity.RequestNumber}"
            };
            await _store.AddRentalPeriodAsync(confirmedReservation, ct);
        }

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

    // -------------------------------------------------------------
    // Broker Workflows (Requirements 7 & 8)
    // -------------------------------------------------------------

    public async Task<ServiceResult<BrokerDashboardDto>> GetBrokerDashboardAsync(int brokerUserId, CancellationToken ct = default)
    {
        var profile = await _store.GetBrokerProfileByUserIdAsync(brokerUserId, ct);
        var profileDto = profile is null ? null : await _store.GetBrokerProfileDtoAsync(profile.Id, ct);
        var (total, pending, approved, rejected) = await _properties.GetBrokerPropertyCountsAsync(brokerUserId, ct);
        var clientRequests = await _store.GetBrokerClientRequestsCountAsync(brokerUserId, ct);

        return ServiceResult<BrokerDashboardDto>.Ok(new BrokerDashboardDto(
            profileDto, total, pending, approved, rejected, clientRequests));
    }

    public async Task<ServiceResult<PagedResult<PropertyListDto>>> GetBrokerPropertiesAsync(int brokerUserId, string? status, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var result = await _properties.GetBrokerPropertiesAsync(brokerUserId, status, page, pageSize, ct);
        return ServiceResult<PagedResult<PropertyListDto>>.Ok(result);
    }

    public async Task<ServiceResult<PropertyDetailsDto>> SubmitBrokerPropertyAsync(int brokerUserId, BrokerPropertySubmissionRequest request, CancellationToken ct = default)
    {
        var profile = await _store.GetBrokerProfileByUserIdAsync(brokerUserId, ct);
        if (profile is null || profile.Status != BrokerStatus.Approved)
            return ServiceResult<PropertyDetailsDto>.Fail("Only approved brokers can submit properties for review.", 403);

        if (!await _properties.PropertyTypeExistsAsync(request.PropertyTypeId, ct))
            return ServiceResult<PropertyDetailsDto>.Fail("Property type not found.", 422,
                new() { new("Property type not found.", "propertyTypeId") });

        if (request.VillageId > 0)
        {
            if (!await _properties.VillageExistsAsync(request.VillageId, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("Village not found.", 422,
                    new() { new("Village not found.", "villageId") });

            if (request.ZoneId.HasValue && !await _properties.ZoneBelongsToVillageAsync(request.ZoneId.Value, request.VillageId, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("The selected zone does not belong to the selected village.", 422,
                    new() { new("The selected zone does not belong to the selected village.", "zoneId") });
        }

        var slug = SlugHelper.UniqueSlug(SlugHelper.GenerateSlug(request.Title),
            s => _properties.SlugExistsAsync(s).GetAwaiter().GetResult());

        string reference;
        var rnd = new Random();
        do { reference = $"DAR-{rnd.Next(100000, 999999)}"; }
        while (await _properties.ReferenceExistsAsync(reference, ct));

        var property = new Property
        {
            Title = request.Title.Trim(),
            Slug = slug,
            ReferenceNumber = reference,
            Description = request.Description?.Trim(),
            PropertyTypeId = request.PropertyTypeId,
            Status = PropertyStatus.PendingReview, // Submissions by broker start in PendingReview for admin review!
            Purpose = Enum.Parse<PropertyPurpose>(request.Purpose, true),
            Price = request.Price,
            Currency = "EGP",
            Area = request.Area,
            Bedrooms = request.Bedrooms,
            Bathrooms = request.Bathrooms,
            Floor = request.Floor,
            TotalFloors = request.TotalFloors,
            BuiltYear = request.BuiltYear,
            FurnishedStatus = request.FurnishedStatus,
            FinishingStatus = request.FinishingStatus,
            Parking = request.Parking,
            Garden = request.Garden,
            Pool = request.Pool,
            SeaView = request.SeaView,
            BeachAccess = request.BeachAccess,
            VillageId = request.VillageId > 0 ? request.VillageId : 1,
            ZoneId = request.ZoneId,
            BuildingNumber = request.BuildingNumber,
            LocationId = request.LocationId,
            Address = request.Address,
            Developer = request.Developer,
            CreatedByUserId = brokerUserId, // Tracks the broker who submitted it
            OwnerId = request.OwnerId // Optional per user requirement!
        };

        await _properties.AddAsync(property, ct);
        await _properties.SaveChangesAsync(ct);

        if (request.Images != null)
        {
            foreach (var img in request.Images)
            {
                if (!string.IsNullOrWhiteSpace(img.Url))
                    await _properties.AttachImageAsync(property.Id, img.Url.Trim(), img.AltText, ct);
            }
        }

        if (request.Videos != null)
        {
            foreach (var vid in request.Videos)
            {
                if (!string.IsNullOrWhiteSpace(vid.Url))
                    await _properties.AttachVideoAsync(property.Id, vid.Url.Trim(), vid.Type, ct);
            }
        }

        if (request.Features != null && request.Features.Count > 0)
        {
            await _properties.SetFeaturesAsync(property.Id,
                request.Features.Where(f => !string.IsNullOrWhiteSpace(f.Title))
                    .Select(f => (f.Title.Trim(), f.Value)).ToList(), ct);
        }

        if (request.AmenityIds != null && request.AmenityIds.Count > 0)
        {
            await _properties.SetAmenitiesAsync(property.Id, request.AmenityIds.Distinct().ToList(), ct);
        }

        await _properties.SaveChangesAsync(ct);

        foreach (var adminId in await _store.GetAdminUserIdsAsync(ct))
        {
            await _engagement.AddNotificationAsync(adminId, "Broker chalet pending review",
                $"{property.Title} ({property.ReferenceNumber}) was submitted by broker {profile.AgencyName} for review.", "property-approved", ct);
        }
        await _engagement.SaveChangesAsync(ct);

        await _audit.LogAsync(brokerUserId, "broker.property.submitted", "Property",
            property.Id.ToString(), null, "PendingReview", null, ct);

        var details = await _properties.GetDetailsAsync(property.Id, true, ct);
        return ServiceResult<PropertyDetailsDto>.Created(details!, "Property submitted for company review.");
    }

    public async Task<ServiceResult<BrokerProfileDto>> RegisterBrokerAsync(int userId, RegisterBrokerRequest request, CancellationToken ct = default)
    {
        var existing = await _store.GetBrokerProfileByUserIdAsync(userId, ct);
        if (existing is not null)
            return ServiceResult<BrokerProfileDto>.Fail("A broker profile already exists for this account.", 409);

        var profile = new BrokerProfile
        {
            UserId = userId,
            AgencyName = request.AgencyName.Trim(),
            LicenseNumber = request.LicenseNumber.Trim(),
            NationalId = request.NationalId?.Trim(),
            DocumentUrl = request.DocumentUrl?.Trim(),
            Status = BrokerStatus.Pending // Broker remains pending until approved by admin (Req 7)
        };

        await _store.AddBrokerProfileAsync(profile, ct);
        await _store.SaveChangesAsync(ct);

        var dto = await _store.GetBrokerProfileDtoAsync(profile.Id, ct);
        return ServiceResult<BrokerProfileDto>.Created(dto!, "Broker registration submitted. Access is pending admin approval.");
    }

    public async Task<ServiceResult<BrokerProfileDto>> GetMyBrokerProfileAsync(int userId, CancellationToken ct = default)
    {
        var profile = await _store.GetBrokerProfileByUserIdAsync(userId, ct);
        if (profile is null)
            return ServiceResult<BrokerProfileDto>.NotFound("No broker profile found for this account.");

        var dto = await _store.GetBrokerProfileDtoAsync(profile.Id, ct);
        return ServiceResult<BrokerProfileDto>.Ok(dto!);
    }

    public async Task<ServiceResult<PagedResult<BrokerProfileDto>>> AllBrokersAsync(string? status, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<BrokerProfileDto>>.Ok(
            await _store.GetAllBrokersAsync(status, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

    public async Task<ServiceResult<BrokerProfileDto>> SetBrokerStatusAsync(int adminId, int brokerProfileId, SetBrokerStatusRequest request, CancellationToken ct = default)
    {
        var profile = await _store.GetBrokerProfileAsync(brokerProfileId, ct);
        if (profile is null)
            return ServiceResult<BrokerProfileDto>.NotFound("Broker profile not found.");

        if (!Enum.TryParse<BrokerStatus>(request.Status.Replace(" ", ""), true, out var nextStatus))
            return ServiceResult<BrokerProfileDto>.Fail("Invalid broker status.", 422);

        profile.Status = nextStatus;
        profile.AdminNotes = request.AdminNotes;
        if (nextStatus == BrokerStatus.Approved)
            profile.ApprovedAt = DateTime.UtcNow;
        profile.UpdatedAt = DateTime.UtcNow;

        await _store.SaveChangesAsync(ct);
        await _engagement.AddNotificationAsync(profile.UserId, "Broker Profile Status",
            $"Your broker profile status is now: {nextStatus}.", "broker-status", ct);
        await _engagement.SaveChangesAsync(ct);

        var dto = await _store.GetBrokerProfileDtoAsync(profile.Id, ct);
        return ServiceResult<BrokerProfileDto>.Ok(dto!, $"Broker status updated to {nextStatus}.");
    }

    public async Task<ServiceResult<BrokerPropertyRequestDto>> CreateBrokerRequestAsync(int brokerUserId, CreateBrokerPropertyRequest request, CancellationToken ct = default)
    {
        var profile = await _store.GetBrokerProfileByUserIdAsync(brokerUserId, ct);
        if (profile is null || profile.Status != BrokerStatus.Approved)
            return ServiceResult<BrokerPropertyRequestDto>.Fail("Only approved brokers can submit client requests.", 403);

        var property = await _store.GetPropertyAsync(request.PropertyId, ct);
        if (property is null)
            return ServiceResult<BrokerPropertyRequestDto>.NotFound("Property not found.");

        var purpose = Enum.Parse<PropertyPurpose>(request.Purpose, true);

        // Date validation for rental requests
        if (purpose == PropertyPurpose.Rent && request.StartDate.HasValue && request.EndDate.HasValue)
        {
            if (request.EndDate.Value <= request.StartDate.Value)
                return ServiceResult<BrokerPropertyRequestDto>.Fail("End date must be after start date.", 422);

            if (await _store.HasOverlappingRentalPeriodAsync(request.PropertyId, request.StartDate.Value, request.EndDate.Value, null, ct))
                return ServiceResult<BrokerPropertyRequestDto>.Fail("Property already has a confirmed rental reservation for these dates.", 409);
        }

        var brokerRequest = new BrokerPropertyRequest
        {
            BrokerId = brokerUserId,
            PropertyId = request.PropertyId,
            ClientName = request.ClientName.Trim(),
            ClientPhone = request.ClientPhone.Trim(),
            Purpose = purpose,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = RequestStatus.Pending,
            Notes = request.Notes?.Trim()
        };

        await _store.AddBrokerRequestAsync(brokerRequest, ct);
        await _store.SaveChangesAsync(ct);

        var dto = await _store.GetBrokerRequestDtoAsync(brokerRequest.Id, ct);
        return ServiceResult<BrokerPropertyRequestDto>.Created(dto!, "Broker request submitted successfully.");
    }

    public async Task<ServiceResult<PagedResult<BrokerPropertyRequestDto>>> MyBrokerRequestsAsync(int brokerUserId, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<BrokerPropertyRequestDto>>.Ok(
            await _store.GetBrokerRequestsAsync(brokerUserId, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

    public async Task<ServiceResult<PagedResult<BrokerPropertyRequestDto>>> AllBrokerRequestsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<BrokerPropertyRequestDto>>.Ok(
            await _store.GetAllBrokerRequestsAsync(status, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

    public async Task<ServiceResult<BrokerPropertyRequestDto>> SetBrokerRequestStatusAsync(int adminId, int id, UpdateRequestStatusRequest request, CancellationToken ct = default)
    {
        var entity = await _store.GetBrokerRequestAsync(id, ct);
        if (entity is null)
            return ServiceResult<BrokerPropertyRequestDto>.NotFound("Broker request not found.");

        var next = Enum.Parse<RequestStatus>(request.Status.Replace(" ", ""), true);
        if (!RequestRules.CanTransition(entity.Status, next))
            return ServiceResult<BrokerPropertyRequestDto>.Fail(
                $"Cannot move request from {entity.Status} to {next}.", 422);

        entity.Status = next;
        entity.UpdatedAt = DateTime.UtcNow;
        await _store.SaveChangesAsync(ct);

        var dto = await _store.GetBrokerRequestDtoAsync(entity.Id, ct);
        return ServiceResult<BrokerPropertyRequestDto>.Ok(dto!, $"Broker request status updated to {next}.");
    }

    // -------------------------------------------------------------
    // Customer Property Requirements (Requirement 10)
    // -------------------------------------------------------------

    public async Task<ServiceResult<PropertyRequirementDto>> CreateRequirementAsync(int? userId, CreatePropertyRequirementRequest request, CancellationToken ct = default)
    {
        var purpose = Enum.Parse<PropertyPurpose>(request.Purpose, true);

        if (purpose == PropertyPurpose.Rent && request.StartDate.HasValue && request.EndDate.HasValue)
        {
            if (request.EndDate.Value <= request.StartDate.Value)
                return ServiceResult<PropertyRequirementDto>.Fail("End date must be after start date.", 422);
        }

        var req = new PropertyRequirement
        {
            UserId = userId,
            CustomerName = request.CustomerName.Trim(),
            CustomerEmail = request.CustomerEmail.Trim().ToLowerInvariant(),
            CustomerPhone = request.CustomerPhone.Trim(),
            Purpose = purpose,
            PropertyTypeId = request.PropertyTypeId,
            VillageId = request.VillageId,
            ZoneId = request.ZoneId,
            MinPrice = request.MinPrice,
            MaxPrice = request.MaxPrice,
            Bedrooms = request.Bedrooms,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            DesiredAmenities = request.DesiredAmenities?.Trim(),
            Notes = request.Notes?.Trim(),
            Status = RequestStatus.Pending
        };

        await _store.AddPropertyRequirementAsync(req, ct);
        await _store.SaveChangesAsync(ct);

        foreach (var adminId in await _store.GetAdminUserIdsAsync(ct))
            await _engagement.AddNotificationAsync(adminId, "New Property Requirement Lead",
                $"{request.CustomerName} submitted requirement for {purpose} in North Coast.",
                "property-requirement", ct);
        await _engagement.SaveChangesAsync(ct);

        var dto = await _store.GetPropertyRequirementDtoAsync(req.Id, ct);
        return ServiceResult<PropertyRequirementDto>.Created(dto!, "Thank you. Our North Coast team will contact you with matching properties.");
    }

    public async Task<ServiceResult<PagedResult<PropertyRequirementDto>>> MyRequirementsAsync(int userId, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<PropertyRequirementDto>>.Ok(
            await _store.GetMyRequirementsAsync(userId, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

    public async Task<ServiceResult<PagedResult<PropertyRequirementDto>>> AllRequirementsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<PropertyRequirementDto>>.Ok(
            await _store.GetAllRequirementsAsync(status, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

    public async Task<ServiceResult<PropertyRequirementDto>> SetRequirementStatusAsync(int adminId, int id, UpdateRequirementStatusRequest request, CancellationToken ct = default)
    {
        var req = await _store.GetPropertyRequirementAsync(id, ct);
        if (req is null)
            return ServiceResult<PropertyRequirementDto>.NotFound("Requirement not found.");

        if (!Enum.TryParse<RequestStatus>(request.Status.Replace(" ", ""), true, out var nextStatus))
            return ServiceResult<PropertyRequirementDto>.Fail("Invalid requirement status.", 422);

        req.Status = nextStatus;
        if (request.AssignedStaffId.HasValue)
            req.AssignedStaffId = request.AssignedStaffId.Value;
        req.UpdatedAt = DateTime.UtcNow;

        await _store.SaveChangesAsync(ct);

        var dto = await _store.GetPropertyRequirementDtoAsync(req.Id, ct);
        return ServiceResult<PropertyRequirementDto>.Ok(dto!, $"Requirement status updated to {nextStatus}.");
    }
}

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
