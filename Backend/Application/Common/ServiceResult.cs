namespace Application.Common;

public interface IServiceResult
{
    bool Succeeded { get; }
    string Message { get; }
    int StatusCode { get; }
}

/// <summary>Service-layer outcome; controllers translate it to HTTP + <see cref="ApiResponse{T}"/>.</summary>
public sealed record ServiceResult<T>(
    bool Succeeded,
    T? Data,
    string Message,
    List<ApiError> Errors,
    int StatusCode) : IServiceResult
{
    public static ServiceResult<T> Ok(T data, string message = "OK", int statusCode = 200)
        => new(true, data, message, new(), statusCode);

    public static ServiceResult<T> Created(T data, string message = "Created")
        => new(true, data, message, new(), 201);

    public static ServiceResult<T> Fail(string message, int statusCode = 400, List<ApiError>? errors = null)
        => new(false, default, message, errors ?? new(), statusCode);

    public static ServiceResult<T> ValidationFailed(List<ApiError> errors)
        => new(false, default, "Validation failed.", errors, 422);

    public static ServiceResult<T> Unauthorized(string message = "Invalid credentials.")
        => new(false, default, message, new(), 401);

    public static ServiceResult<T> NotFound(string message = "Not found.")
        => new(false, default, message, new(), 404);

    public static ServiceResult<T> Conflict(string message, List<ApiError>? errors = null)
        => new(false, default, message, errors ?? new(), 409);
}
