using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

/// <summary>Public reference data for filters and forms (types, cities, locations, amenities).</summary>
[ApiController]
[Route("api/[controller]")]
public sealed class LookupsController : ControllerBase
{
    private readonly DarcomDbContext _db;

    public LookupsController(DarcomDbContext db)
    {
        _db = db;
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
