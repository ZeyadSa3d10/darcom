using FluentValidation;

namespace Application.Common;

public static class ValidationExtensions
{
    /// <summary>
    /// Reuses an existing DTO validator inside a CQRS Command or Query validator
    /// while preserving exact original property names (without outer wrapper prefixes).
    /// </summary>
    public static void ForwardTo<TCommand, TDto>(
        this AbstractValidator<TCommand> parent,
        Func<TCommand, TDto?> selector,
        IValidator<TDto> inner)
    {
        parent.RuleFor(x => x).Custom((cmd, ctx) =>
        {
            var dto = selector(cmd);
            if (dto is null)
            {
                ctx.AddFailure("Request", "Request payload is required.");
                return;
            }

            var result = inner.Validate(dto);
            foreach (var error in result.Errors)
            {
                ctx.AddFailure(error);
            }
        });
    }
}

