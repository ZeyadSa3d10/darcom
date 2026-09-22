using Application.Common;
using Application.DTOs;
using Application.Validators;
using Infrastructure.Security;

namespace Tests;

/// <summary>PHASE-02 backend tests: hashing, validators, response envelope.</summary>
public sealed class AuthTests
{
    [Fact]
    public void PasswordHasher_RoundTrip()
    {
        var hash = PasswordHasher.Hash("StrongPass1");
        Assert.True(PasswordHasher.Verify("StrongPass1", hash));
    }

    [Fact]
    public void PasswordHasher_Rejects_Wrong_Password()
    {
        var hash = PasswordHasher.Hash("StrongPass1");
        Assert.False(PasswordHasher.Verify("WrongPass1", hash));
    }

    [Fact]
    public void PasswordHasher_Rejects_Garbage_Hash()
    {
        Assert.False(PasswordHasher.Verify("anything", "not-a-hash"));
    }

    [Fact]
    public async Task RegisterValidator_Accepts_Valid_Request()
    {
        var v = new RegisterValidator();
        var result = await v.ValidateAsync(new RegisterRequest("Sara Ahmed", "sara@example.com", "StrongPass1", "+201001234567"));
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("", "sara@example.com", "StrongPass1")]   // missing name
    [InlineData("Sara", "not-an-email", "StrongPass1")]   // bad email
    [InlineData("Sara", "sara@example.com", "weak")]      // weak password
    [InlineData("Sara", "sara@example.com", "alllowercase1")] // no uppercase
    public async Task RegisterValidator_Rejects_Invalid_Requests(string name, string email, string password)
    {
        var v = new RegisterValidator();
        var result = await v.ValidateAsync(new RegisterRequest(name, email, password, null));
        Assert.False(result.IsValid);
        Assert.NotEmpty(result.Errors);
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
