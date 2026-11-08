using System.Security.Claims;
using Application.Common;
using Application.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>Base controller: consistent envelope + manual FluentValidation (never frontend-only).</summary>
public abstract class ApiBaseController : ControllerBase
{
    protected async Task<ActionResult<ApiResponse<TOut>>> ValidateAndExecute<TIn, TOut>(
        IValidator<TIn> validator,
        TIn request,
        Func<Task<ServiceResult<TOut>>> action,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            var errors = validation.Errors
                .Select(e => new ApiError(e.ErrorMessage, ToCamel(e.PropertyName)))
                .ToList();
            return StatusCode(422, ApiResponse<TOut>.Fail("Validation failed.", errors));
        }

        try
        {
            var result = await action();
            return StatusCode(result.StatusCode, result.Succeeded
                ? ApiResponse<TOut>.Ok(result.Data!, result.Message)
                : ApiResponse<TOut>.Fail(result.Message, result.Errors));
        }
        catch (RequestFailure ex)
        {
            return StatusCode(ex.StatusCode, ApiResponse<TOut>.Fail(ex.Message, ex.Errors));
        }
    }

    /// <summary>Executes a transactional service call, mapping <see cref="RequestFailure"/> to HTTP.</summary>
    protected async Task<ActionResult<ApiResponse<T>>> ExecuteTransactional<T>(
        Func<Task<ServiceResult<T>>> action)
    {
        try
        {
            var result = await action();
            return StatusCode(result.StatusCode, result.Succeeded
                ? ApiResponse<T>.Ok(result.Data!, result.Message)
                : ApiResponse<T>.Fail(result.Message, result.Errors));
        }
        catch (RequestFailure ex)
        {
            return StatusCode(ex.StatusCode, ApiResponse<T>.Fail(ex.Message, ex.Errors));
        }
    }

    private static string ToCamel(string name)
        => string.IsNullOrEmpty(name) ? name : char.ToLowerInvariant(name[0]) + name[1..];

    protected int CurrentUserId()
        => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException());

    protected int? TryGetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(idStr, out var id) ? id : null;
    }

    protected string? CurrentRole()
        => User.FindFirstValue(ClaimTypes.Role);

    protected bool IsAdmin()
        => User.IsInRole("Admin");
}
