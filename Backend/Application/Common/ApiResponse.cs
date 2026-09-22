using System.Text.Json.Serialization;

namespace Application.Common;

/// <summary>Single structured API error (field-level when applicable).</summary>
public sealed record ApiError(string Message, string? Field = null);

/// <summary>
/// Consistent envelope for every API response (website.md #31).
/// Success: { success:true, message, data }. Failure: { success:false, message, errors }.
/// </summary>
public class ApiResponse<T>
{
    [JsonPropertyName("success")]
    public bool Success { get; init; }

    [JsonPropertyName("message")]
    public string Message { get; init; } = string.Empty;

    // NOTE: no JsonIgnore here — value-type payloads (e.g. ApiResponse<int>)
    // throw with WhenWritingNull, and clients prefer an explicit data field.
    [JsonPropertyName("data")]
    public T? Data { get; init; }

    [JsonPropertyName("errors")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<ApiError>? Errors { get; init; }

    public static ApiResponse<T> Ok(T data, string message = "OK")
        => new() { Success = true, Message = message, Data = data };

    public static ApiResponse<T> Fail(string message, List<ApiError>? errors = null)
        => new() { Success = false, Message = message, Errors = errors ?? new() };
}

/// <summary>Non-generic shorthand for responses without data.</summary>
public sealed class ApiResponse : ApiResponse<object?>
{
    public static ApiResponse Ok(string message = "OK")
        => new() { Success = true, Message = message };

    public new static ApiResponse Fail(string message, List<ApiError>? errors = null)
        => new() { Success = false, Message = message, Errors = errors ?? new() };
}
