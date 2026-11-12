using Application.DTOs;
using FluentValidation;

namespace Application.Validators;

public sealed class RegisterValidator : AbstractValidator<RegisterRequest>
{
    public RegisterValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(160);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Password)
            .NotEmpty().MinimumLength(8).MaximumLength(100)
            .Matches("[A-Z]").WithMessage("Password must contain an uppercase letter.")
            .Matches("[a-z]").WithMessage("Password must contain a lowercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain a digit.");
        RuleFor(x => x.PhoneNumber).MaximumLength(32)
            .Matches(@"^\+?[0-9\s\-()]*$").When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber))
            .WithMessage("Phone number format is invalid.");
    }
}

public sealed class LoginValidator : AbstractValidator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Password).NotEmpty();
    }
}

public sealed class SendEmailOtpValidator : AbstractValidator<SendEmailOtpRequest>
{
    public SendEmailOtpValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
    }
}

public sealed class VerifyEmailOtpValidator : AbstractValidator<VerifyEmailOtpRequest>
{
    public VerifyEmailOtpValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(12);
        RuleFor(x => x.FullName).MaximumLength(160).When(x => !string.IsNullOrWhiteSpace(x.FullName));
    }
}

public sealed class GoogleLoginValidator : AbstractValidator<GoogleLoginRequest>
{
    public GoogleLoginValidator()
    {
        RuleFor(x => x.IdToken).NotEmpty().MaximumLength(8192);
    }
}

public sealed class RefreshValidator : AbstractValidator<RefreshRequest>
{
    public RefreshValidator()
    {
        RuleFor(x => x.RefreshToken).MaximumLength(512).When(x => x.RefreshToken is not null);
    }
}

public sealed class ForgotPasswordValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
    }
}

public sealed class ResetPasswordValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword)
            .NotEmpty().MinimumLength(8).MaximumLength(100)
            .Matches("[A-Z]").WithMessage("Password must contain an uppercase letter.")
            .Matches("[a-z]").WithMessage("Password must contain a lowercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain a digit.");
    }
}
