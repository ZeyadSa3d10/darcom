using Application.Security;

namespace Infrastructure.Security;

/// <summary>Application-facing adapter over the PBKDF2-SHA256 hasher.</summary>
public sealed class PasswordHasherService : IPasswordHasher
{
    public string Hash(string password) => PasswordHasher.Hash(password);
    public bool Verify(string password, string storedHash) => PasswordHasher.Verify(password, storedHash);
}
