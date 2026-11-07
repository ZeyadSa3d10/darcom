using Application.DTOs;
using Application.Validators;
using Domain.Entities;
using Domain.Rules;
using Xunit;

namespace Tests;

/// <summary>
/// Unit tests for North Coast business rules:
/// - Village/Zone validation
/// - Rental date-overlap logic (Requirement 9)
/// - Broker registration & property request validation (Requirements 7 & 8)
/// - Property requirement leads validation (Requirement 10)
/// </summary>
public sealed class NorthCoastWorkflowTests
{
    [Fact]
    public void Rental_Date_Overlap_Exact_Detection()
    {
        var existingStart = new DateTime(2026, 7, 1);
        var existingEnd = new DateTime(2026, 7, 10);

        // Overlapping: completely inside
        Assert.True(RequestRules.HasDateOverlap(
            existingStart, existingEnd,
            new DateTime(2026, 7, 3), new DateTime(2026, 7, 7)));

        // Overlapping: starts before, ends during
        Assert.True(RequestRules.HasDateOverlap(
            existingStart, existingEnd,
            new DateTime(2026, 6, 25), new DateTime(2026, 7, 5)));

        // Overlapping: starts during, ends after
        Assert.True(RequestRules.HasDateOverlap(
            existingStart, existingEnd,
            new DateTime(2026, 7, 5), new DateTime(2026, 7, 15)));

        // Overlapping: completely wraps existing
        Assert.True(RequestRules.HasDateOverlap(
            existingStart, existingEnd,
            new DateTime(2026, 6, 20), new DateTime(2026, 7, 20)));

        // Disjoint: entirely before
        Assert.False(RequestRules.HasDateOverlap(
            existingStart, existingEnd,
            new DateTime(2026, 6, 1), new DateTime(2026, 6, 25)));

        // Disjoint: entirely after
        Assert.False(RequestRules.HasDateOverlap(
            existingStart, existingEnd,
            new DateTime(2026, 7, 15), new DateTime(2026, 7, 25)));

        // Adjacent: checkout on existing start (end == start) -> no overlap
        Assert.False(RequestRules.HasDateOverlap(
            existingStart, existingEnd,
            new DateTime(2026, 6, 20), new DateTime(2026, 7, 1)));

        // Adjacent: checkin on existing end (start == end) -> no overlap
        Assert.False(RequestRules.HasDateOverlap(
            existingStart, existingEnd,
            new DateTime(2026, 7, 10), new DateTime(2026, 7, 20)));
    }

    [Fact]
    public async Task BookingValidator_Rejects_Inverted_Dates()
    {
        var validator = new CreateBookingValidator();
        var request = new CreateBookingRequest(
            PropertyId: 1,
            FullName: "Ahmed Renter",
            Email: "renter@example.com",
            Phone: "+201012345678",
            StartDate: new DateTime(2026, 8, 15),
            EndDate: new DateTime(2026, 8, 10), // Inverted!
            Duration: null,
            Notes: null);

        var result = await validator.ValidateAsync(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("End date must be after start date"));
    }

    [Fact]
    public async Task BookingValidator_Accepts_Valid_Dates()
    {
        var validator = new CreateBookingValidator();
        var request = new CreateBookingRequest(
            PropertyId: 1,
            FullName: "Ahmed Renter",
            Email: "renter@example.com",
            Phone: "+201012345678",
            StartDate: new DateTime(2026, 8, 1),
            EndDate: new DateTime(2026, 8, 10),
            Duration: null,
            Notes: "Family summer stay");

        var result = await validator.ValidateAsync(request);
        Assert.True(result.IsValid);
    }

    [Fact]
    public async Task Broker_Registration_Validator_Checks()
    {
        var validator = new RegisterBrokerValidator();

        var invalidReq = new RegisterBrokerRequest("", "", null, null);
        var invalidResult = await validator.ValidateAsync(invalidReq);
        Assert.False(invalidResult.IsValid);

        var validReq = new RegisterBrokerRequest(
            AgencyName: "Sahel Homes",
            LicenseNumber: "LIC-1234",
            NationalId: "29001011234567",
            DocumentUrl: "https://example.com/docs/license.pdf");
        var validResult = await validator.ValidateAsync(validReq);
        Assert.True(validResult.IsValid);
    }

    [Fact]
    public async Task Broker_Property_Request_Validator_Checks()
    {
        var validator = new CreateBrokerPropertyRequestValidator();

        var invalidReq = new CreateBrokerPropertyRequest(
            PropertyId: 0,
            ClientName: "",
            ClientPhone: "",
            Purpose: "InvalidPurpose",
            StartDate: new DateTime(2026, 8, 10),
            EndDate: new DateTime(2026, 8, 5),
            Notes: null);
        var invalidResult = await validator.ValidateAsync(invalidReq);
        Assert.False(invalidResult.IsValid);

        var validReq = new CreateBrokerPropertyRequest(
            PropertyId: 5,
            ClientName: "Tarek Client",
            ClientPhone: "+201099887766",
            Purpose: "Rent",
            StartDate: new DateTime(2026, 8, 1),
            EndDate: new DateTime(2026, 8, 15),
            Notes: "Client wants sea view chalet");
        var validResult = await validator.ValidateAsync(validReq);
        Assert.True(validResult.IsValid);
    }

    [Fact]
    public async Task Property_Requirement_Validator_Checks()
    {
        var validator = new CreatePropertyRequirementValidator();

        var invertedPricesReq = new CreatePropertyRequirementRequest(
            CustomerName: "Hany Client",
            CustomerEmail: "hany@example.com",
            CustomerPhone: "+201011223344",
            Purpose: "Sale",
            PropertyTypeId: 1,
            VillageId: 1,
            ZoneId: null,
            MinPrice: 10000000,
            MaxPrice: 5000000, // Inverted!
            Bedrooms: 3,
            StartDate: null,
            EndDate: null,
            DesiredAmenities: null,
            Notes: null);
        var invalidResult = await validator.ValidateAsync(invertedPricesReq);
        Assert.False(invalidResult.IsValid);
        Assert.Contains(invalidResult.Errors, e => e.ErrorMessage.Contains("MinPrice cannot exceed MaxPrice"));

        var validReq = new CreatePropertyRequirementRequest(
            CustomerName: "Hany Client",
            CustomerEmail: "hany@example.com",
            CustomerPhone: "+201011223344",
            Purpose: "Rent",
            PropertyTypeId: 1,
            VillageId: 1,
            ZoneId: 2,
            MinPrice: 20000,
            MaxPrice: 50000,
            Bedrooms: 2,
            StartDate: new DateTime(2026, 7, 1),
            EndDate: new DateTime(2026, 7, 15),
            DesiredAmenities: "Pool, Beach Access",
            Notes: "Prefer Marassi Marina");
        var validResult = await validator.ValidateAsync(validReq);
        Assert.True(validResult.IsValid);
    }

    [Fact]
    public async Task CreatePropertyValidator_Requires_Village()
    {
        var validator = new CreatePropertyValidator();
        var req = new CreatePropertyRequest
        {
            Title = "Chalet in Sahel",
            PropertyTypeId = 1,
            Purpose = "Sale",
            Price = 8000000,
            VillageId = 0 // Missing village
        };

        var result = await validator.ValidateAsync(req);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "VillageId");
    }

    [Fact]
    public async Task Village_And_Zone_Validators_Check_Length()
    {
        var vValidator = new CreateVillageValidator();
        var zValidator = new CreateZoneValidator();

        Assert.False((await vValidator.ValidateAsync(new CreateVillageRequest("", null))).IsValid);
        Assert.True((await vValidator.ValidateAsync(new CreateVillageRequest("Marassi", "marassi"))).IsValid);

        Assert.False((await zValidator.ValidateAsync(new CreateZoneRequest("", null))).IsValid);
        Assert.True((await zValidator.ValidateAsync(new CreateZoneRequest("Blanca", "blanca"))).IsValid);
    }

    [Fact]
    public async Task BrokerPropertySubmissionValidator_Allows_Null_OwnerId_And_Requires_Village()
    {
        var validator = new BrokerPropertySubmissionValidator();

        // Valid: OwnerId is null, village is valid
        var validReq = new BrokerPropertySubmissionRequest(
            Title: "Luxury Marassi Chalet",
            Description: "Direct pool view",
            PropertyTypeId: 1,
            Purpose: "Rent",
            Price: 15000,
            Area: 120,
            Bedrooms: 2,
            Bathrooms: 2,
            Floor: 1,
            TotalFloors: 3,
            BuiltYear: 2022,
            FurnishedStatus: "Furnished",
            FinishingStatus: "Super Lux",
            Parking: true,
            Garden: false,
            Pool: true,
            SeaView: true,
            BeachAccess: true,
            VillageId: 1,
            ZoneId: 2,
            BuildingNumber: "Chalet 14",
            OwnerId: null // Explicitly null - broker doesn't need to specify ownerId!
        );

        var validResult = await validator.ValidateAsync(validReq);
        Assert.True(validResult.IsValid);

        // Invalid: Missing VillageId (<= 0)
        var invalidReq = validReq with { VillageId = 0 };
        var invalidResult = await validator.ValidateAsync(invalidReq);
        Assert.False(invalidResult.IsValid);
        Assert.Contains(invalidResult.Errors, e => e.PropertyName == "VillageId");
    }
}

