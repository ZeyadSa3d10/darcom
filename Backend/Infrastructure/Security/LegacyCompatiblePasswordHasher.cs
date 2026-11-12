using System.Security.Cryptography;
using Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Infrastructure.Security;

/// <summary>
/// ASP.NET Core Identity password hasher that also verifies legacy PBKDF2-SHA256 hashes (v1.*)
/// and signals Identity to rehash them automatically on successful password login.
/// </summary>
public sealed class LegacyCompatiblePasswordHasher : PasswordHasher<User>
{
    public override PasswordVerificationResult VerifyHashedPassword(
        User user,
        string hashedPassword,
        string providedPassword)
    {
        if (string.IsNullOrEmpty(hashedPassword))
            return PasswordVerificationResult.Failed;

        if (hashedPassword.StartsWith("v1.", StringComparison.Ordinal))
        {
            return VerifyLegacyPbkdf2(providedPassword, hashedPassword)
                ? PasswordVerificationResult.SuccessRehashNeeded
                : PasswordVerificationResult.Failed;
        }

        try
        {
            return base.VerifyHashedPassword(user, hashedPassword, providedPassword);
        }
        catch (FormatException)
        {
            return PasswordVerificationResult.Failed;
        }
    }

    private static bool VerifyLegacyPbkdf2(string password, string stored)
    {
        try
        {
            var parts = stored.Split('.');
            if (parts.Length != 4 || parts[0] != "v1") return false;
            var iterations = int.Parse(parts[1]);
            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch
        {
            return false;
        }
    }
}
