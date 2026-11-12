namespace Application.Services;

public interface IEmailSender
{
    Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default);
}

