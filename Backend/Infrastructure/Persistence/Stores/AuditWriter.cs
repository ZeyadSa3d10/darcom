using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Stores;

public sealed class AuditWriter : IAuditWriter
{
    private readonly DarcomDbContext _db;

    public AuditWriter(DarcomDbContext db)
    {
        _db = db;
    }

    public async Task LogAsync(int? userId, string action, string entity, string entityId,
        string? oldValue = null, string? newValue = null, string? ipAddress = null,
        CancellationToken ct = default)
    {
        await _db.AuditLogs.AddAsync(new AuditLog
        {
            UserId = userId,
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Timestamp = DateTime.UtcNow,
            IpAddress = ipAddress,
            OldValue = oldValue,
            NewValue = newValue
        }, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<PagedResult<AuditLogDto>> GetLogsAsync(string? entity, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(entity))
            query = query.Where(a => a.Entity == entity);
        query = query.OrderByDescending(a => a.Timestamp);
        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto(a.Id, a.UserId, a.Action, a.Entity, a.EntityId,
                a.Timestamp, a.IpAddress, a.OldValue, a.NewValue))
            .ToListAsync(ct);
        return new PagedResult<AuditLogDto>(items, page, pageSize, total, totalPages);
    }
}
