using Application.BackgroundJobs;
using Application.Storage;
using Domain.Entities;
using Hangfire;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SkiaSharp;

namespace Infrastructure.BackgroundJobs;

public sealed class HangfirePropertyImageJobService : IPropertyImageJobService
{
    private readonly IBackgroundJobService _jobs;

    public HangfirePropertyImageJobService(IBackgroundJobService jobs) => _jobs = jobs;

    public Task EnqueueImageOptimizationAsync(int propertyImageId, CancellationToken ct = default)
    {
        _jobs.Enqueue<PropertyImageProcessingJob>(
            j => j.ProcessAsync(propertyImageId, CancellationToken.None),
            queue: "default");
        return Task.CompletedTask;
    }
}

/// <summary>
/// Compresses &amp; generates WebP thumbnail + web-sized variant alongside the preserved original
/// for locally stored property images, with strict idempotency and limited retries.
/// </summary>
public sealed class PropertyImageProcessingJob
{
    private readonly DarcomDbContext _db;
    private readonly StorageOptions _storageOptions;
    private readonly HangfireOptions _hangfireOptions;
    private readonly ILogger<PropertyImageProcessingJob> _logger;

    public PropertyImageProcessingJob(
        DarcomDbContext db,
        IOptions<StorageOptions> storageOptions,
        IOptions<HangfireOptions> hangfireOptions,
        ILogger<PropertyImageProcessingJob> logger)
    {
        _db = db;
        _storageOptions = storageOptions.Value;
        _hangfireOptions = hangfireOptions.Value;
        _logger = logger;
    }

    [Queue("default")]
    [AutomaticRetry(Attempts = 2, DelaysInSeconds = [30, 120], OnAttemptsExceeded = AttemptsExceededAction.Fail)]
    public async Task ProcessAsync(int propertyImageId, CancellationToken ct = default)
    {
        var cfg = _hangfireOptions.ImageProcessing;
        if (!cfg.Enabled)
            return;

        var dispatchKey = $"image:optimize:{propertyImageId}";
        var existingLog = await _db.JobDispatchLogs.FirstOrDefaultAsync(l => l.DispatchKey == dispatchKey, ct);
        if (existingLog is not null && existingLog.Status == "Sent")
            return;

        var img = await _db.PropertyImages.AsNoTracking().FirstOrDefaultAsync(i => i.Id == propertyImageId, ct);
        if (img is null)
            return;

        if (!img.Url.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            await UpsertLogAsync(existingLog, dispatchKey, "Skipped", "External/cloud storage URL left unchanged.", ct);
            return;
        }

        var relative = img.Url["/uploads/".Length..].Replace('/', Path.DirectorySeparatorChar);
        var rootFull = Path.GetFullPath(_storageOptions.LocalPath);
        var sourceFull = Path.GetFullPath(Path.Combine(rootFull, relative));
        if (!sourceFull.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase) || !File.Exists(sourceFull))
        {
            await UpsertLogAsync(existingLog, dispatchKey, "Skipped", "Source file not found on local storage.", ct);
            return;
        }

        if (existingLog is null)
        {
            existingLog = new JobDispatchLog { DispatchKey = dispatchKey, Category = "Image", Status = "Pending" };
            _db.JobDispatchLogs.Add(existingLog);
        }
        existingLog.AttemptCount += 1;
        existingLog.UpdatedAt = DateTime.UtcNow;

        try
        {
            var dir = Path.GetDirectoryName(sourceFull)!;
            var baseName = Path.GetFileNameWithoutExtension(sourceFull);
            var webPath = Path.Combine(dir, $"{baseName}_web.webp");
            var thumbPath = Path.Combine(dir, $"{baseName}_thumb.webp");

            var quality = Math.Clamp(cfg.Quality, 50, 95);
            var maxWidth = Math.Clamp(cfg.MaxWidth, 800, 3840);
            var thumbWidth = Math.Clamp(cfg.ThumbnailWidth, 200, 800);

            await using (var input = File.OpenRead(sourceFull))
            using (var original = SKBitmap.Decode(input))
            {
                if (original is null)
                    throw new InvalidOperationException("Failed to decode image binary.");

                SaveResizedWebp(original, maxWidth, quality, webPath);
                SaveResizedWebp(original, thumbWidth, quality, thumbPath);
            }

            existingLog.Status = "Sent";
            existingLog.CompletedAt = DateTime.UtcNow;
            existingLog.LastError = null;
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation("Generated web and thumbnail variants for PropertyImage #{ImageId}.", propertyImageId);
        }
        catch (Exception ex)
        {
            existingLog.Status = "Failed";
            existingLog.LastError = ex.Message.Length > 1900 ? ex.Message[..1900] : ex.Message;
            await _db.SaveChangesAsync(ct);
            _logger.LogError(ex, "Failed to optimize PropertyImage #{ImageId}; original file preserved.", propertyImageId);
            throw;
        }
    }

    private static void SaveResizedWebp(SKBitmap source, int targetMaxWidth, int quality, string destinationPath)
    {
        SKBitmap? resized = null;
        try
        {
            var working = source;
            if (source.Width > targetMaxWidth)
            {
                var ratio = (double)targetMaxWidth / source.Width;
                var targetHeight = Math.Max(1, (int)Math.Round(source.Height * ratio));
                resized = source.Resize(new SKImageInfo(targetMaxWidth, targetHeight), SKSamplingOptions.Default);
                if (resized is not null)
                    working = resized;
            }

            using var image = SKImage.FromBitmap(working);
            using var data = image.Encode(SKEncodedImageFormat.Webp, quality);
            var tempPath = $"{destinationPath}.{Guid.NewGuid():N}.tmp";
            using (var fs = File.Create(tempPath))
            {
                data.SaveTo(fs);
            }
            File.Move(tempPath, destinationPath, overwrite: true);
        }
        finally
        {
            resized?.Dispose();
        }
    }

    private async Task UpsertLogAsync(JobDispatchLog? log, string dispatchKey, string status, string reason, CancellationToken ct)
    {
        if (log is null)
        {
            _db.JobDispatchLogs.Add(new JobDispatchLog
            {
                DispatchKey = dispatchKey,
                Category = "Image",
                Status = status,
                AttemptCount = 1,
                LastError = reason,
                CompletedAt = DateTime.UtcNow
            });
        }
        else
        {
            log.Status = status;
            log.LastError = reason;
            log.CompletedAt = DateTime.UtcNow;
            log.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync(ct);
    }
}

