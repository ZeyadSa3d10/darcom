using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using FluentValidation;
using MediatR;

namespace Application.Features.Properties.Queries;

// ---------- Search Properties (Paginated) ----------

public sealed record GetPropertiesQuery(PropertyQuery Query, bool IsAdmin)
    : IQuery<PagedResult<PropertyListDto>>;

public sealed class GetPropertiesQueryValidator : AbstractValidator<GetPropertiesQuery>
{
    public GetPropertiesQueryValidator()
    {
        this.ForwardTo(x => x.Query, new PropertyQueryValidator());
    }
}

public sealed class GetPropertiesQueryHandler
    : IRequestHandler<GetPropertiesQuery, ServiceResult<PagedResult<PropertyListDto>>>
{
    private readonly IPropertyService _properties;

    public GetPropertiesQueryHandler(IPropertyService properties)
    {
        _properties = properties;
    }

    public Task<ServiceResult<PagedResult<PropertyListDto>>> Handle(
        GetPropertiesQuery request, CancellationToken ct)
        => _properties.SearchAsync(request.Query, request.IsAdmin, ct);
}

// ---------- Get Property By Id ----------

public sealed record GetPropertyByIdQuery(int Id, bool IsAdmin) : IQuery<PropertyDetailsDto>;

public sealed class GetPropertyByIdQueryHandler
    : IRequestHandler<GetPropertyByIdQuery, ServiceResult<PropertyDetailsDto>>
{
    private readonly IPropertyService _properties;

    public GetPropertyByIdQueryHandler(IPropertyService properties)
    {
        _properties = properties;
    }

    public Task<ServiceResult<PropertyDetailsDto>> Handle(
        GetPropertyByIdQuery request, CancellationToken ct)
        => _properties.GetByIdAsync(request.Id, request.IsAdmin, ct);
}

// ---------- Get Property By Slug ----------

public sealed record GetPropertyBySlugQuery(string Slug, bool IsAdmin) : IQuery<PropertyDetailsDto>;

public sealed class GetPropertyBySlugQueryHandler
    : IRequestHandler<GetPropertyBySlugQuery, ServiceResult<PropertyDetailsDto>>
{
    private readonly IPropertyService _properties;

    public GetPropertyBySlugQueryHandler(IPropertyService properties)
    {
        _properties = properties;
    }

    public Task<ServiceResult<PropertyDetailsDto>> Handle(
        GetPropertyBySlugQuery request, CancellationToken ct)
        => _properties.GetBySlugAsync(request.Slug, request.IsAdmin, ct);
}

// ---------- Featured ----------

public sealed record GetFeaturedPropertiesQuery(int Count, string? Purpose)
    : IQuery<List<PropertyListDto>>;

public sealed class GetFeaturedPropertiesQueryHandler
    : IRequestHandler<GetFeaturedPropertiesQuery, ServiceResult<List<PropertyListDto>>>
{
    private readonly IPropertyService _properties;

    public GetFeaturedPropertiesQueryHandler(IPropertyService properties)
    {
        _properties = properties;
    }

    public Task<ServiceResult<List<PropertyListDto>>> Handle(
        GetFeaturedPropertiesQuery request, CancellationToken ct)
        => _properties.GetFeaturedAsync(request.Count, request.Purpose, ct);
}

// ---------- Quick Search ----------

public sealed record QuickSearchPropertiesQuery(string Term, string? Purpose, int Page, int PageSize)
    : IQuery<PagedResult<PropertyListDto>>;

public sealed class QuickSearchPropertiesQueryHandler
    : IRequestHandler<QuickSearchPropertiesQuery, ServiceResult<PagedResult<PropertyListDto>>>
{
    private readonly IPropertyService _properties;

    public QuickSearchPropertiesQueryHandler(IPropertyService properties)
    {
        _properties = properties;
    }

    public Task<ServiceResult<PagedResult<PropertyListDto>>> Handle(
        QuickSearchPropertiesQuery request, CancellationToken ct)
        => _properties.QuickSearchAsync(request.Term, request.Purpose, request.Page, request.PageSize, ct);
}

// ---------- Related ----------

public sealed record GetRelatedPropertiesQuery(int PropertyId, int Count)
    : IQuery<List<PropertyListDto>>;

public sealed class GetRelatedPropertiesQueryHandler
    : IRequestHandler<GetRelatedPropertiesQuery, ServiceResult<List<PropertyListDto>>>
{
    private readonly IPropertyService _properties;

    public GetRelatedPropertiesQueryHandler(IPropertyService properties)
    {
        _properties = properties;
    }

    public Task<ServiceResult<List<PropertyListDto>>> Handle(
        GetRelatedPropertiesQuery request, CancellationToken ct)
        => _properties.GetRelatedAsync(request.PropertyId, request.Count, ct);
}

// ---------- My Properties ----------

public sealed record GetMyPropertiesQuery(int OwnerId, int Page, int PageSize)
    : IQuery<PagedResult<PropertyListDto>>;

public sealed class GetMyPropertiesQueryHandler
    : IRequestHandler<GetMyPropertiesQuery, ServiceResult<PagedResult<PropertyListDto>>>
{
    private readonly IPropertyService _properties;

    public GetMyPropertiesQueryHandler(IPropertyService properties)
    {
        _properties = properties;
    }

    public Task<ServiceResult<PagedResult<PropertyListDto>>> Handle(
        GetMyPropertiesQuery request, CancellationToken ct)
        => _properties.MyPropertiesAsync(request.OwnerId, request.Page, request.PageSize, ct);
}

// ---------- Availability / Rental Periods ----------

public sealed record GetPublicRentalPeriodsQuery(int PropertyId)
    : IQuery<List<PublicRentalPeriodDto>>;

public sealed class GetPublicRentalPeriodsQueryHandler
    : IRequestHandler<GetPublicRentalPeriodsQuery, ServiceResult<List<PublicRentalPeriodDto>>>
{
    private readonly IPropertyService _properties;

    public GetPublicRentalPeriodsQueryHandler(IPropertyService properties)
    {
        _properties = properties;
    }

    public Task<ServiceResult<List<PublicRentalPeriodDto>>> Handle(
        GetPublicRentalPeriodsQuery request, CancellationToken ct)
        => _properties.GetPublicRentalPeriodsAsync(request.PropertyId, ct);
}

public sealed record GetRentalPeriodsQuery(int UserId, bool IsAdmin, int? PropertyId)
    : IQuery<List<RentalPeriodDto>>;

public sealed class GetRentalPeriodsQueryHandler
    : IRequestHandler<GetRentalPeriodsQuery, ServiceResult<List<RentalPeriodDto>>>
{
    private readonly IPropertyService _properties;

    public GetRentalPeriodsQueryHandler(IPropertyService properties)
    {
        _properties = properties;
    }

    public Task<ServiceResult<List<RentalPeriodDto>>> Handle(
        GetRentalPeriodsQuery request, CancellationToken ct)
        => _properties.GetRentalPeriodsAsync(request.UserId, request.IsAdmin, request.PropertyId, ct);
}
