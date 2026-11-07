using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

/// <summary>Public reference data for filters and forms (types, villages, zones, amenities, locations).</summary>
[ApiController]
[Route("api/[controller]")]
public sealed class LookupsController : ControllerBase
{
    private readonly DarcomDbContext _db;

    public LookupsController(DarcomDbContext db)
    {
        _db = db;
    }

    [HttpGet("villages")]
    public async Task<IActionResult> Villages(CancellationToken ct)
        => Ok(new
        {
            success = true,
            message = "OK",
            data = await _db.Villages.AsNoTracking()
                .Where(v => v.IsActive)
                .OrderBy(v => v.Name)
                .Select(v => new
                {
                    v.Id,
                    v.Name,
                    v.Slug,
                    Zones = v.Zones.Where(z => z.IsActive).OrderBy(z => z.Name)
                        .Select(z => new { z.Id, z.Name, z.Slug })
                })
                .ToListAsync(ct)
        });

    [HttpGet("villages/{villageId:int}/zones")]
    public async Task<IActionResult> VillageZones(int villageId, CancellationToken ct)
    {
        var villageExists = await _db.Villages.AnyAsync(v => v.Id == villageId, ct);
        if (!villageExists)
            return NotFound(new { success = false, message = "Village not found." });

        var data = await _db.Zones.AsNoTracking()
            .Where(z => z.VillageId == villageId && z.IsActive)
            .OrderBy(z => z.Name)
            .Select(z => new { z.Id, z.VillageId, z.Name, z.Slug })
            .ToListAsync(ct);

        return Ok(new { success = true, message = "OK", data });
    }

    [HttpGet("property-types")]
    public async Task<IActionResult> PropertyTypes(CancellationToken ct)
        => Ok(new
        {
            success = true,
            message = "OK",
            data = await _db.PropertyTypes.AsNoTracking()
                .OrderBy(t => t.Id)
                .Select(t => new { t.Id, t.Name, t.Slug, t.Icon })
                .ToListAsync(ct)
        });

    [HttpGet("cities")]
    public async Task<IActionResult> Cities(CancellationToken ct)
        => Ok(new
        {
            success = true,
            message = "OK",
            data = await _db.Cities.AsNoTracking()
                .OrderBy(c => c.Id)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Slug,
                    Areas = c.Areas.OrderBy(a => a.Id)
                        .Select(a => new
                        {
                            a.Id,
                            a.Name,
                            a.Slug,
                            Locations = a.Locations.OrderBy(l => l.Id)
                                .Select(l => new { l.Id, l.Name })
                        })
                })
                .ToListAsync(ct)
        });

    [HttpGet("locations")]
    public async Task<IActionResult> Locations([FromQuery] int? cityId, CancellationToken ct)
    {
        var query = _db.Locations.AsNoTracking().AsQueryable();
        if (cityId.HasValue)
            query = query.Where(l => l.CityId == cityId.Value);
        var data = await query
            .OrderBy(l => l.CityId).ThenBy(l => l.Id)
            .Select(l => new
            {
                l.Id,
                l.Name,
                l.Address,
                CityId = l.CityId,
                City = l.City.Name,
                Area = l.Area != null ? l.Area.Name : null
            })
            .ToListAsync(ct);
        return Ok(new { success = true, message = "OK", data });
    }

    [HttpGet("amenities")]
    public async Task<IActionResult> Amenities(CancellationToken ct)
        => Ok(new
        {
            success = true,
            message = "OK",
            data = await _db.Amenities.AsNoTracking()
                .OrderBy(a => a.Id)
                .Select(a => new { a.Id, a.Name, a.Icon })
                .ToListAsync(ct)
        });
}
