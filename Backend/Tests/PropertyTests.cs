using Application.Common;
using Application.DTOs;
using Application.Validators;
using Domain.Enums;
using Domain.Rules;

namespace Tests;

/// <summary>PHASE-03 tests: visibility rules, purchase/rental guards, slugs, query validation.</summary>
public sealed class PropertyTests
{
    [Theory]
    [InlineData(PropertyStatus.Published, true)]
    [InlineData(PropertyStatus.Featured, true)]
    [InlineData(PropertyStatus.Reserved, true)]
    [InlineData(PropertyStatus.Draft, false)]
    [InlineData(PropertyStatus.PendingReview, false)]
    [InlineData(PropertyStatus.Sold, false)]
    [InlineData(PropertyStatus.Rented, false)]
    [InlineData(PropertyStatus.Archived, false)]
    [InlineData(PropertyStatus.Rejected, false)]
    public void PublicList_Visibility(PropertyStatus status, bool expected)
        => Assert.Equal(expected, PropertyRules.IsVisibleInPublicList(status));

    [Theory]
    [InlineData(PropertyStatus.Sold, true)]
    [InlineData(PropertyStatus.Rented, true)]
    [InlineData(PropertyStatus.Draft, false)]
    [InlineData(PropertyStatus.Rejected, false)]
    [InlineData(PropertyStatus.Archived, false)]
    public void PublicDetails_Visibility(PropertyStatus status, bool expected)
        => Assert.Equal(expected, PropertyRules.IsVisibleInPublicDetails(status));

    [Theory]
    [InlineData(PropertyStatus.Published, true)]
    [InlineData(PropertyStatus.Featured, true)]
    [InlineData(PropertyStatus.Reserved, true)]
    [InlineData(PropertyStatus.Sold, false)]
    [InlineData(PropertyStatus.Rented, false)]
    [InlineData(PropertyStatus.Draft, false)]
    public void Purchase_Guard_Blocks_Sold_And_Rented(PropertyStatus status, bool expected)
        => Assert.Equal(expected, PropertyRules.CanAcceptPurchaseRequest(status));

    [Theory]
    [InlineData(PropertyStatus.Published, true)]
    [InlineData(PropertyStatus.Rented, false)]
    [InlineData(PropertyStatus.Rejected, false)]
    public void Rental_Guard(PropertyStatus status, bool expected)
        => Assert.Equal(expected, PropertyRules.CanAcceptRentalRequest(status));

    [Theory]
    [InlineData(PropertyStatus.Draft, true)]
    [InlineData(PropertyStatus.PendingReview, true)]
    [InlineData(PropertyStatus.Published, false)]
    [InlineData(PropertyStatus.Sold, false)]
    public void Writers_Can_Only_Set_Draft_Or_Pending(PropertyStatus status, bool expected)
        => Assert.Equal(expected, PropertyRules.CanWriterSetStatus(status));

    [Fact]
    public void Slug_Generation_Is_Seo_Friendly()
        => Assert.Equal("sea-view-chalet-ain-sokhna",
            SlugHelper.GenerateSlug("Sea-View Chalet @ Ain Sokhna!!"));

    [Fact]
    public void Slug_Uniqueness_Appends_Counter()
    {
        var taken = new HashSet<string> { "villa", "villa-2" };
        Assert.Equal("villa-3", SlugHelper.UniqueSlug("villa", taken.Contains));
    }

    [Fact]
    public async Task QueryValidator_Rejects_Inverted_Price_Range()
    {
        var v = new PropertyQueryValidator();
        var result = await v.ValidateAsync(new PropertyQuery { MinPrice = 10, MaxPrice = 5 });
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task QueryValidator_Rejects_Bad_Sort_And_Page()
    {
        var v = new PropertyQueryValidator();
        var badSort = await v.ValidateAsync(new PropertyQuery { Sort = "random" });
        var badPage = await v.ValidateAsync(new PropertyQuery { Page = 0 });
        var badSize = await v.ValidateAsync(new PropertyQuery { PageSize = 500 });
        Assert.False(badSort.IsValid);
        Assert.False(badPage.IsValid);
        Assert.False(badSize.IsValid);
    }

    [Fact]
    public async Task CreateValidator_Rejects_Negative_Price_And_Bad_Purpose()
    {
        var v = new CreatePropertyValidator();
        var result = await v.ValidateAsync(new CreatePropertyRequest
        {
            Title = "T",
            PropertyTypeId = 1,
            Purpose = "Lease",
            Price = -5,
            LocationId = 1
        });
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "Price");
        Assert.Contains(result.Errors, e => e.PropertyName == "Purpose");
    }
}
