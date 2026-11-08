using Application.DTOs;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Security;
using Infrastructure.Storage;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Tests;

public sealed class BrokerRedesignTests
{
    [Fact]
    public async Task OtpService_Generates_And_Verifies_Six_Digit_Code()
    {
        var cache = new MemoryCache(new MemoryCacheOptions());
        var logger = NullLogger<OtpService>.Instance;
        var otpService = new OtpService(cache, logger);

        var phone = "01012345678";
        var code = await otpService.SendOtpAsync(phone);

        Assert.NotNull(code);
        Assert.Equal(6, code.Length);
        Assert.All(code, c => Assert.True(char.IsDigit(c)));

        // Wrong code fails
        var wrongResult = await otpService.VerifyOtpAsync(phone, "000000");
        Assert.False(wrongResult);

        // Correct code succeeds
        var correctResult = await otpService.VerifyOtpAsync(phone, code);
        Assert.True(correctResult);

        // Replay of same code fails (one-time use)
        var replayResult = await otpService.VerifyOtpAsync(phone, code);
        Assert.False(replayResult);
    }

    [Theory]
    [InlineData("٠١٠١٢٣٤٥٦٧٨", "01012345678")]
    [InlineData("+20 10 1234 5678", "01012345678")]
    [InlineData("00201012345678", "01012345678")]
    [InlineData("010-1234-5678", "01012345678")]
    [InlineData("۰۱۱۱۲۳۴۵۶۷۸", "01112345678")]
    public void PhoneNormalizer_Normalizes_Various_Formats(string input, string expected)
    {
        var result = Application.Common.PhoneNormalizer.Normalize(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task OtpService_Supports_Arabic_Indic_Numerals_In_Code_And_Phone()
    {
        var cache = new MemoryCache(new MemoryCacheOptions());
        var logger = NullLogger<OtpService>.Instance;
        var otpService = new OtpService(cache, logger);

        var phone = "٠١٠١٢٣٤٥٦٧٨";
        var code = await otpService.SendOtpAsync(phone);

        // Convert standard code to Arabic-Indic digits: '1' -> '١'
        var arabicIndicDigits = new string(code.Select(c => (char)('٠' + (c - '0'))).ToArray());

        // Verifying with Arabic digits must succeed transparently
        var result = await otpService.VerifyOtpAsync("01012345678", arabicIndicDigits);
        Assert.True(result);
    }

    [Fact]
    public async Task PrivateDocumentStorage_Saves_And_Retrieves_Securely()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "darcom_tests_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        try
        {
            var storage = new PrivateDocumentStorage(tempDir);
            var content = "SAMPLE_ID_CARD_CONTENT"u8.ToArray();
            using var ms = new MemoryStream(content);

            var relativePath = await storage.SavePrivateDocumentAsync(ms, "front_id.jpg", "image/jpeg", "broker-ids");
            Assert.NotNull(relativePath);
            Assert.StartsWith("broker-ids/", relativePath);

            var retrieved = await storage.GetPrivateDocumentAsync(relativePath);
            Assert.NotNull(retrieved);
            Assert.Equal("image/jpeg", retrieved.Value.ContentType);

            using (var stream = retrieved.Value.Stream)
            {
                using var retrievedMs = new MemoryStream();
                await stream.CopyToAsync(retrievedMs);
                Assert.Equal(content, retrievedMs.ToArray());
            }

            // Path traversal attempt returns null
            var malicious = await storage.GetPrivateDocumentAsync("../../../Windows/System32/drivers/etc/hosts");
            Assert.Null(malicious);
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                Directory.Delete(tempDir, true);
            }
        }
    }

    [Fact]
    public void BrokerPropertySubmission_Initializes_With_Core_Four_Fields()
    {
        var submission = new BrokerPropertySubmission
        {
            BrokerId = 5,
            VillageId = 1,
            ZoneId = 2,
            Area = 120.5m,
            UnitNumber = "CH-104",
            Status = RequestStatus.Pending
        };

        Assert.Equal(5, submission.BrokerId);
        Assert.Equal(1, submission.VillageId);
        Assert.Equal(2, submission.ZoneId);
        Assert.Equal(120.5m, submission.Area);
        Assert.Equal("CH-104", submission.UnitNumber);
        Assert.Equal(RequestStatus.Pending, submission.Status);
    }

    [Fact]
    public void BrokerDashboardDto_Exposes_KPI_Counts()
    {
        var profile = new BrokerProfileDto(
            1, 5, "Ahmed Broker", "ahmed@darcom.eg", "01012345678",
            "Darcom Coast", "LIC-9988", "29501011234567",
            null, "broker-ids/front.jpg", "broker-ids/back.jpg",
            true, "Approved", null, DateTime.UtcNow, DateTime.UtcNow);

        var dto = new BrokerDashboardDto(
            profile,
            TotalProperties: 10,
            PendingProperties: 2,
            ApprovedProperties: 8,
            RejectedProperties: 0,
            ClientRequestsCount: 15,
            PendingSubmissions: 3,
            PropertyRequirementsCount: 4);

        Assert.NotNull(dto.Profile);
        Assert.Equal(10, dto.TotalProperties);
        Assert.Equal(15, dto.ClientRequestsCount);
        Assert.Equal(3, dto.PendingSubmissions);
        Assert.Equal(4, dto.PropertyRequirementsCount);
    }
}
