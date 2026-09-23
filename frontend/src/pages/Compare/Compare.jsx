import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import { useCompare } from '../../context/CompareContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import './Compare.css';

export default function Compare() {
  const { items, removeFromCompare, clearCompare, count } = useCompare();
  const { t, isRtl } = useSettings();

  useSeo({
    title: `${isRtl ? 'مقارنة العقارات' : 'Compare Residences'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'مقارنة تفصيلية بين أفخم العقارات والفلل والشاليهات في مصر: الأسعار، خطط السداد، المساحات، والمطورين.'
      : 'Detailed side-by-side comparison of prime properties in Egypt: prices, payment plans, areas, and developers.',
  });

  const breadcrumbItems = [
    { label: t('nav.home', isRtl ? 'الرئيسية' : 'Home'), to: '/' },
    { label: isRtl ? 'مقارنة العقارات' : 'Compare' },
  ];

  if (count === 0) {
    return (
      <div className="darcom-compare-page empty-page">
        <div className="container">
          <div className="compare-breadcrumb-wrap">
            <Breadcrumbs items={breadcrumbItems} />
          </div>

          <div className="compare-empty-card">
            <div className="empty-icon-circle">
              <i className="bi bi-arrow-left-right"></i>
            </div>
            <h1 className="empty-title">
              {isRtl ? 'قائمة المقارنة فارغة' : 'Your Comparison List is Empty'}
            </h1>
            <p className="empty-subtitle">
              {isRtl
                ? 'لم تقم بإضافة أي عقارات للمقارنة بعد. تصفح أفخم وحداتنا الساحلية والسكنية واضغط على أيقونة "قارن" للمقارنة الفورية.'
                : 'You have not added any properties to compare yet. Explore our premier residences and click "Compare" on any card.'}
            </p>
            <Link to="/properties" className="btn-explore-cta">
              <i className="bi bi-search"></i>
              <span>{isRtl ? 'استعراض العقارات المتاحة' : 'Explore Properties'}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="darcom-compare-page">
      <div className="container">
        {/* Breadcrumbs */}
        <div className="compare-breadcrumb-wrap">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* Page Header */}
        <header className="compare-header">
          <div>
            <div className="compare-badge">
              <i className="bi bi-sliders text-gold"></i>
              <span>{isRtl ? 'التحليل والمقارنة المعمارية' : 'Comparative Architectural Analysis'}</span>
            </div>
            <h1 className="compare-title">
              {isRtl ? 'مقارنة العقارات المختارة' : 'Side-by-Side Residence Comparison'}
            </h1>
            <p className="compare-subtitle">
              {isRtl
                ? `مقارنة متوازية لـ ${count} وحدات تشمل الخطط المالية، الأسعار، المساحات، وأبرز المواصفات الفنية.`
                : `Comprehensive breakdown of ${count} residences covering pricing schedules, typologies, and key amenities.`}
            </p>
          </div>

          <div className="compare-header-actions">
            <Link to="/properties" className="btn-add-more">
              <i className="bi bi-plus-lg"></i>
              <span>{isRtl ? 'إضافة عقار آخر' : 'Add Property'}</span>
            </Link>
            <button type="button" onClick={clearCompare} className="btn-clear-table">
              <i className="bi bi-trash3"></i>
              <span>{isRtl ? 'مسح المقارنة' : 'Clear All'}</span>
            </button>
          </div>
        </header>

        {/* Comparison Table / Matrix */}
        <div className="compare-table-wrapper">
          <table className="compare-matrix-table">
            <thead>
              {/* 1. Header Row: Photos & Title */}
              <tr>
                <th className="matrix-label-col">
                  <span className="matrix-section-title">{isRtl ? 'الوحدة والعقار' : 'Residence Profile'}</span>
                </th>
                {items.map((property) => (
                  <th key={property.id} className="matrix-property-col">
                    <div className="matrix-card-header">
                      <div className="matrix-img-wrap">
                        <img
                          src={property.primaryImageUrl || '/placeholder-property.svg'}
                          alt={property.title}
                          className="matrix-property-img"
                        />
                        <button
                          type="button"
                          className="matrix-remove-btn"
                          onClick={() => removeFromCompare(property.id)}
                          title={isRtl ? 'حذف من المقارنة' : 'Remove'}
                          aria-label="Remove"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>

                      <div className="matrix-title-wrap">
                        <Link to={`/properties/${property.slug}`} className="matrix-prop-title">
                          {property.title}
                        </Link>
                        <span className="matrix-ref-num">Ref: {property.referenceNumber || `#${property.id}`}</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* 2. Financial Metrics */}
              <tr className="matrix-section-row">
                <td colSpan={items.length + 1}>
                  <div className="matrix-section-divider">
                    <i className="bi bi-cash-stack text-gold"></i>
                    <span>{isRtl ? 'البيانات المالية وخطة السداد' : 'Financials & Payment Structure'}</span>
                  </div>
                </td>
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'السعر الإجمالي' : 'Total Price'}</td>
                {items.map((p) => (
                  <td key={p.id} className="matrix-val-cell highlight-val">
                    <strong>{Number(p.price).toLocaleString()} {p.currency || 'EGP'}</strong>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'سعر المتر المربع' : 'Price per m²'}</td>
                {items.map((p) => {
                  const ppm = p.area && p.area > 0 ? Math.round(Number(p.price) / Number(p.area)) : null;
                  return (
                    <td key={p.id} className="matrix-val-cell">
                      {ppm ? `${ppm.toLocaleString()} EGP / m²` : '—'}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'المقدم التقديري (10%)' : 'Est. 10% Down Payment'}</td>
                {items.map((p) => (
                  <td key={p.id} className="matrix-val-cell text-gold-val">
                    {(Number(p.price) * 0.1).toLocaleString()} EGP
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'قسط ربع سنوي (7 سنوات)' : 'Est. Quarterly (7 Yrs)'}</td>
                {items.map((p) => {
                  // 90% remaining over 28 quarterly installments
                  const qVal = Math.round((Number(p.price) * 0.9) / 28);
                  return (
                    <td key={p.id} className="matrix-val-cell">
                      {qVal.toLocaleString()} EGP
                    </td>
                  );
                })}
              </tr>

              {/* 3. Location & Developer */}
              <tr className="matrix-section-row">
                <td colSpan={items.length + 1}>
                  <div className="matrix-section-divider">
                    <i className="bi bi-geo-alt-fill text-gold"></i>
                    <span>{isRtl ? 'الموقع والمطور العقاري' : 'Location & Developer'}</span>
                  </div>
                </td>
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'المدينة والمنطقة' : 'City & Area'}</td>
                {items.map((p) => (
                  <td key={p.id} className="matrix-val-cell">
                    {p.city || p.location || '—'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'المطور العقاري' : 'Developer'}</td>
                {items.map((p) => (
                  <td key={p.id} className="matrix-val-cell">
                    <strong>{p.developer || (isRtl ? 'مطور معتمد' : 'Accredited Developer')}</strong>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'موعد التسليم' : 'Handover / Delivery'}</td>
                {items.map((p) => {
                  const dDate = p.deliveryDate ? new Date(p.deliveryDate).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short' }) : (isRtl ? 'استلام فوري' : 'Ready to Move');
                  return (
                    <td key={p.id} className="matrix-val-cell">
                      <span className="pill-delivery">{dDate}</span>
                    </td>
                  );
                })}
              </tr>

              {/* 4. Specifications & Layout */}
              <tr className="matrix-section-row">
                <td colSpan={items.length + 1}>
                  <div className="matrix-section-divider">
                    <i className="bi bi-aspect-ratio text-gold"></i>
                    <span>{isRtl ? 'المواصفات الفنية والمساحات' : 'Specifications & Layout'}</span>
                  </div>
                </td>
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'نوع العقار' : 'Property Type'}</td>
                {items.map((p) => (
                  <td key={p.id} className="matrix-val-cell">
                    {p.propertyType || p.propertyTypeSlug || '—'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'المساحة الإجمالية' : 'Total Area'}</td>
                {items.map((p) => (
                  <td key={p.id} className="matrix-val-cell">
                    {p.area ? `${p.area} m²` : '—'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'عدد الغرف' : 'Bedrooms'}</td>
                {items.map((p) => (
                  <td key={p.id} className="matrix-val-cell">
                    {p.bedrooms != null ? `${p.bedrooms} ${isRtl ? 'غرف' : 'Beds'}` : '—'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label-cell">{isRtl ? 'دورات المياه' : 'Bathrooms'}</td>
                {items.map((p) => (
                  <td key={p.id} className="matrix-val-cell">
                    {p.bathrooms != null ? `${p.bathrooms} ${isRtl ? 'حمامات' : 'Baths'}` : '—'}
                  </td>
                ))}
              </tr>

              {/* 5. Features Checklist */}
              <tr className="matrix-section-row">
                <td colSpan={items.length + 1}>
                  <div className="matrix-section-divider">
                    <i className="bi bi-stars text-gold"></i>
                    <span>{isRtl ? 'المزايا والإطلالة' : 'Key Amenities & View'}</span>
                  </div>
                </td>
              </tr>

              {[
                { k: 'seaView', l: isRtl ? 'إطلالة بحرية مباشرة' : 'Direct Sea View' },
                { k: 'beachAccess', l: isRtl ? 'شاطئ خاص ومباشر' : 'Private Beach Access' },
                { k: 'pool', l: isRtl ? 'حمام سباحة' : 'Swimming Pool' },
                { k: 'parking', l: isRtl ? 'موقف سيارات مغطى' : 'Dedicated Parking' },
              ].map((feat) => (
                <tr key={feat.k}>
                  <td className="matrix-label-cell">{feat.l}</td>
                  {items.map((p) => (
                    <td key={p.id} className="matrix-val-cell text-center">
                      {p[feat.k] ? (
                        <i className="bi bi-check-circle-fill text-success fs-5"></i>
                      ) : (
                        <i className="bi bi-dash text-muted fs-4"></i>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* 6. Direct Action CTAs */}
              <tr className="matrix-cta-row">
                <td className="matrix-label-cell">
                  <span className="text-muted small">{isRtl ? 'خيارات الحجز' : 'Action'}</span>
                </td>
                {items.map((p) => (
                  <td key={p.id} className="matrix-val-cell">
                    <div className="matrix-cta-flex">
                      <Link to={`/properties/${p.slug}`} className="btn-matrix-view">
                        <span>{isRtl ? 'التفاصيل الكاملة' : 'View Details'}</span>
                      </Link>
                      <Link to={`/checkout/${p.slug}`} className="btn-matrix-reserve">
                        <i className="bi bi-bag-check"></i>
                        <span>{isRtl ? 'حجز الوحدة' : 'Reserve'}</span>
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
