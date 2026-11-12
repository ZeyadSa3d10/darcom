using Application.Common;
using Application.DTOs;
using Application.Validators;
using Domain.Entities;
using Infrastructure.Security;
using Microsoft.AspNetCore.Identity;

namespace Tests;

/// <summary>Identity password hasher, auth validators, and response envelope tests.</summary>
public sealed class AuthTests
{
    [Fact]
    public void IdentityPasswordHasher_RoundTrip()
    {
        var hasher = new LegacyCompatiblePasswordHasher();
        var user = new User { Email = "sara@example.com", UserName = "sara@example.com" };
        var hash = hasher.HashPassword(user, "StrongPass1");

        Assert.Equal(PasswordVerificationResult.Success, hasher.VerifyHashedPassword(user, hash, "StrongPass1"));
    }

    [Fact]
    public void IdentityPasswordHasher_Rejects_Wrong_Password()
    {
        var hasher = new LegacyCompatiblePasswordHasher();
        var user = new User { Email = "sara@example.com", UserName = "sara@example.com" };
        var hash = hasher.HashPassword(user, "StrongPass1");

        Assert.Equal(PasswordVerificationResult.Failed, hasher.VerifyHashedPassword(user, hash, "WrongPass1"));
    }

    [Fact]
    public void IdentityPasswordHasher_Rejects_Garbage_Hash()
    {
        var hasher = new LegacyCompatiblePasswordHasher();
        var user = new User { Email = "sara@example.com", UserName = "sara@example.com" };

        Assert.Equal(PasswordVerificationResult.Failed, hasher.VerifyHashedPassword(user, "not-a-hash", "anything"));
    }

    [Fact]
    public async Task RegisterValidator_Accepts_Valid_Request()
    {
        var v = new RegisterValidator();
        var result = await v.ValidateAsync(new RegisterRequest("Sara Ahmed", "sara@example.com", "StrongPass1", "+201001234567"));
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("", "sara@example.com", "StrongPass1")]
    [InlineData("Sara", "not-an-email", "StrongPass1")]
    [InlineData("Sara", "sara@example.com", "weak")]
    [InlineData("Sara", "sara@example.com", "alllowercase1")]
    public async Task RegisterValidator_Rejects_Invalid_Requests(string name, string email, string password)
    {
        var v = new RegisterValidator();
        var result = await v.ValidateAsync(new RegisterRequest(name, email, password, null));
        Assert.False(result.IsValid);
        Assert.NotEmpty(result.Errors);
    }

    [Fact]
    public async Task EmailOtpValidators_Validate_Email_And_Code()
    {
        var sendVal = new SendEmailOtpValidator();
        Assert.False((await sendVal.ValidateAsync(new SendEmailOtpRequest("not-an-email"))).IsValid);
        Assert.True((await sendVal.ValidateAsync(new SendEmailOtpRequest("user@gmail.com"))).IsValid);

        var verifyVal = new VerifyEmailOtpValidator();
        Assert.False((await verifyVal.ValidateAsync(new VerifyEmailOtpRequest("user@gmail.com", ""))).IsValid);
        Assert.True((await verifyVal.ValidateAsync(new VerifyEmailOtpRequest("user@gmail.com", "123456", "Sara"))).IsValid);
    }

    [Fact]
    public async Task GoogleLoginValidator_Rejects_Empty_Token()
    {
        var v = new GoogleLoginValidator();
        Assert.False((await v.ValidateAsync(new GoogleLoginRequest(""))).IsValid);
        Assert.True((await v.ValidateAsync(new GoogleLoginRequest("valid.id.token"))).IsValid);
    }

    [Fact]
    public async Task LoginValidator_Rejects_Empty_Password()
    {
        var v = new LoginValidator();
        var result = await v.ValidateAsync(new LoginRequest("sara@example.com", ""));
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task ChangePasswordValidator_Rejects_Weak_New_Password()
    {
        var v = new ChangePasswordValidator();
        var result = await v.ValidateAsync(new ChangePasswordRequest("OldPass1", "short"));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void ApiResponse_Failure_Shape_Has_Errors_Array()
    {
        var body = ApiResponse.Fail("Something went wrong.", new() { new("Bad field.", "email") });
        Assert.False(body.Success);
        Assert.Equal("Something went wrong.", body.Message);
        Assert.NotNull(body.Errors);
        Assert.Single(body.Errors!);
        Assert.Equal("email", body.Errors![0].Field);
    }

    [Fact]
    public void ApiResponse_Success_Omits_Errors()
    {
        var body = ApiResponse<object?>.Ok(new { id = 1 });
        Assert.True(body.Success);
        Assert.Null(body.Errors);
    }
}
