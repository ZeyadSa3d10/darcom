using Application.DTOs;
using Application.Validators;
using Domain.Enums;
using Domain.Rules;

namespace Tests;

/// <summary>PHASE-04 tests: request state machine, duplicate-request rule, validators.</summary>
public sealed class TransactionTests
{
    [Theory]
    [InlineData(RequestStatus.Pending, RequestStatus.UnderReview, true)]
    [InlineData(RequestStatus.Pending, RequestStatus.Approved, false)]
    [InlineData(RequestStatus.UnderReview, RequestStatus.Negotiation, true)]
    [InlineData(RequestStatus.Contacted, RequestStatus.Approved, true)]
    [InlineData(RequestStatus.Negotiation, RequestStatus.Rejected, true)]
    [InlineData(RequestStatus.Approved, RequestStatus.Completed, true)]
    [InlineData(RequestStatus.Approved, RequestStatus.Pending, false)]
    [InlineData(RequestStatus.Rejected, RequestStatus.UnderReview, false)]
    [InlineData(RequestStatus.Completed, RequestStatus.Cancelled, false)]
    [InlineData(RequestStatus.Cancelled, RequestStatus.Pending, false)]
    public void Status_Transitions(RequestStatus from, RequestStatus to, bool expected)
        => Assert.Equal(expected, RequestRules.CanTransition(from, to));

    [Theory]
    [InlineData(RequestStatus.Pending, true)]
    [InlineData(RequestStatus.UnderReview, true)]
    [InlineData(RequestStatus.Contacted, true)]
    [InlineData(RequestStatus.Negotiation, true)]
    [InlineData(RequestStatus.Approved, false)]
    [InlineData(RequestStatus.Rejected, false)]
    [InlineData(RequestStatus.Completed, false)]
    [InlineData(RequestStatus.Cancelled, false)]
    public void Active_Request_Blocks_Duplicates(RequestStatus status, bool expected)
        => Assert.Equal(expected, RequestRules.IsActive(status));

    [Fact]
    public async Task PurchaseValidator_Rejects_Past_Appointment()
    {
        var v = new CreatePurchaseValidator();
        var result = await v.ValidateAsync(new CreatePurchaseRequest(
            1, "Sara Ahmed", "sara@example.com", "+201001234567",
            null, null, null, null, null, null, null, false,
            DateTime.UtcNow.AddDays(-1), null));
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task SellerSubmissionValidator_Accepts_Full_Request()
    {
        var v = new SellerSubmissionValidator();
        var result = await v.ValidateAsync(new SellerSubmissionRequest(
            "Test Villa", "Desc", 3, "Sale", 15000000, 400, 4, 4, null, null, 2022,
            "Fully Furnished", "Super Lux", true, true, true, true, true, 5, null, null, null,
            new() { 1, 3 }, new() { new("View", "Sea") },
            new() { new("https://example.com/a.jpg", "Front") },
            new() { new("https://example.com/t.mp4", "tour") }));
        Assert.True(result.IsValid);
    }

    [Fact]
    public async Task SellerSubmissionValidator_Rejects_Bad_Urls_And_Purpose()
    {
        var v = new SellerSubmissionValidator();
        var result = await v.ValidateAsync(new SellerSubmissionRequest(
            "T", null, 0, "Lease", -5, null, null, null, null, null, null,
            null, null, false, false, false, false, false, 0, null, null, null,
            new(), new(),
            new() { new("not-a-url", null) }, new()));
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName.StartsWith("Images"));
    }

    [Fact]
    public async Task StatusValidator_Rejects_Unknown_Status()
    {
        var v = new UpdateRequestStatusValidator();
        var result = await v.ValidateAsync(new UpdateRequestStatusRequest("Shipped", null));
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task InquiryValidator_Requires_Message()
    {
        var v = new CreateInquiryValidator();
        var result = await v.ValidateAsync(new CreateInquiryRequest("Sara", "sara@example.com", null, ""));
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task ContactValidator_Accepts_Valid_Request()
    {
        var v = new ContactValidator();
        var result = await v.ValidateAsync(new ContactRequest("Sara", "sara@example.com", null, "Viewing", "Hello, I want a viewing."));
        Assert.True(result.IsValid);
    }
}
