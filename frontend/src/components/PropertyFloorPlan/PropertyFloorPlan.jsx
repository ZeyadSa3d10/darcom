import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import './PropertyFloorPlan.css';

export default function PropertyFloorPlan({ property }) {
  const { t, isRtl } = useSettings();
  const [activeTab, setActiveTab] = useState('main');

  if (!property) return null;

  const bedrooms = property.bedrooms ?? 3;
  const bathrooms = property.bathrooms ?? 2;
  const area = property.area ?? 220;

  const handlePrintBrochure = () => {
    window.print();
  };

  return (
    <section className="darcom-floorplan-section" id="floor-plan" aria-label="Floor plan and brochure">
      {/* Header */}
      <div className="floorplan-header">
        <div>
          <div className="floorplan-badge">
            <i className="bi bi-bounding-box-circles text-gold"></i>
            <span>{isRtl ? 'المخطط الهندسي والمعماري' : 'Architectural Floor Plan'}</span>
          </div>
          <h3 className="floorplan-title">
            {isRtl ? 'المسقط الأفقي والتوزيع الداخلي' : 'Spatial Layout & Blueprint Dimensions'}
          </h3>
          <p className="floorplan-subtitle">
            {isRtl
              ? 'توزيع هندسي دقيق للمساحات الداخلية، الأجنحة الفندقية، التراسات، ومداخل الخدمة.'
              : 'Precision architectural schematic showcasing room circulation, master suites, terraces, and service quarters.'}
          </p>
        </div>

        {/* Brochure CTA Button */}
        <button
          type="button"
          className="btn-download-brochure"
          onClick={handlePrintBrochure}
          title={isRtl ? 'طباعة / حفظ البروشور الفاخر' : 'Download Luxury Architectural Brochure'}
        >
          <i className="bi bi-file-earmark-pdf-fill text-gold"></i>
          <span>{isRtl ? 'تحميل البروشور المعماري (PDF)' : 'Download Luxury Brochure (PDF)'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="floorplan-tabs-bar">
        <button
          type="button"
          className={`floorplan-tab-btn ${activeTab === 'main' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('main')}
        >
          <i className="bi bi-layers"></i>
          <span>{isRtl ? 'المسقط الرئيسي للوحدة' : 'Primary Floor Layout'} ({area} m²)</span>
        </button>

        <button
          type="button"
          className={`floorplan-tab-btn ${activeTab === 'dimensions' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('dimensions')}
        >
          <i className="bi bi-rulers"></i>
          <span>{isRtl ? 'جدول المساحات التفصيلية' : 'Dimensional Schedule'}</span>
        </button>
      </div>

      {/* Blueprint Visual Screen */}
      {activeTab === 'main' && (
        <div className="blueprint-canvas-card">
          <div className="blueprint-top-bar">
            <div className="blueprint-tag">
              <span className="dot-live"></span>
              <span>DARCOM VERIFIED CAD BLUEPRINT • SCALE 1:100</span>
            </div>
            <div className="blueprint-compass">
              <i className="bi bi-compass"></i>
              <span>N</span>
            </div>
          </div>

          {/* Architectural Blueprint Vector Illustration */}
          <div className="blueprint-svg-wrapper">
            <svg
              viewBox="0 0 800 500"
              className="blueprint-svg"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Floor plan blueprint diagram"
            >
              <defs>
                <pattern id="cadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(201, 168, 106, 0.12)" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect width="800" height="500" fill="#081b22" />
              <rect width="800" height="500" fill="url(#cadGrid)" />

              {/* Exterior Walls Perimeter */}
              <rect x="50" y="50" width="700" height="400" rx="8" fill="rgba(14, 42, 51, 0.7)" stroke="#c9a86a" strokeWidth="4" />

              {/* Master Bedroom Suite */}
              <g className="bp-room">
                <rect x="60" y="60" width="310" height="200" fill="rgba(20, 66, 79, 0.45)" stroke="rgba(201, 168, 106, 0.5)" strokeWidth="2" strokeDasharray="4 4" />
                <text x="215" y="150" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="700">
                  {isRtl ? 'جناح النوم الرئيسي (Master Suite)' : 'MASTER BEDROOM SUITE'}
                </text>
                <text x="215" y="175" textAnchor="middle" fill="#c9a86a" fontSize="12" fontWeight="600">
                  6.40m × 4.80m (30.7 m²)
                </text>
              </g>

              {/* Master En-suite & Dressing */}
              <g className="bp-room">
                <rect x="60" y="270" width="180" height="170" fill="rgba(20, 66, 79, 0.35)" stroke="rgba(201, 168, 106, 0.4)" strokeWidth="2" />
                <text x="150" y="350" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">
                  {isRtl ? 'حمام رئيسي + دريسنج' : 'EN-SUITE BATH'}
                </text>
                <text x="150" y="372" textAnchor="middle" fill="#a0b8be" fontSize="11">
                  3.20m × 2.80m
                </text>
              </g>

              {/* Secondary Bedroom */}
              <g className="bp-room">
                <rect x="250" y="270" width="200" height="170" fill="rgba(20, 66, 79, 0.35)" stroke="rgba(201, 168, 106, 0.4)" strokeWidth="2" />
                <text x="350" y="350" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">
                  {isRtl ? 'غرفة نوم ثانية' : 'BEDROOM 02'}
                </text>
                <text x="350" y="372" textAnchor="middle" fill="#a0b8be" fontSize="11">
                  4.20m × 3.80m (16.0 m²)
                </text>
              </g>

              {/* Grand Reception & Dining */}
              <g className="bp-room">
                <rect x="380" y="60" width="360" height="230" fill="rgba(20, 66, 79, 0.55)" stroke="rgba(201, 168, 106, 0.6)" strokeWidth="2" />
                <text x="560" y="160" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="800">
                  {isRtl ? 'صالون الاستقبال والسفرة' : 'GRAND RECEPTION & SALON'}
                </text>
                <text x="560" y="188" textAnchor="middle" fill="#c9a86a" fontSize="13" fontWeight="600">
                  8.80m × 5.20m (45.7 m²)
                </text>
              </g>

              {/* Open Chef Kitchen & Bar */}
              <g className="bp-room">
                <rect x="460" y="300" width="170" height="140" fill="rgba(20, 66, 79, 0.35)" stroke="rgba(201, 168, 106, 0.4)" strokeWidth="2" />
                <text x="545" y="365" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">
                  {isRtl ? 'مطبخ مفتوح' : 'CHEF KITCHEN'}
                </text>
                <text x="545" y="388" textAnchor="middle" fill="#a0b8be" fontSize="11">
                  3.80m × 3.20m
                </text>
              </g>

              {/* Sea-View Panoramic Terrace */}
              <g className="bp-room">
                <rect x="640" y="300" width="100" height="140" fill="rgba(201, 168, 106, 0.15)" stroke="#c9a86a" strokeWidth="2" strokeDasharray="3 3" />
                <text x="690" y="365" textAnchor="middle" fill="#c9a86a" fontSize="12" fontWeight="700">
                  {isRtl ? 'تراس' : 'TERRACE'}
                </text>
                <text x="690" y="388" textAnchor="middle" fill="#ffffff" fontSize="10">
                  PANORAMIC
                </text>
              </g>

              {/* Dimension indicators */}
              <line x1="50" y1="30" x2="750" y2="30" stroke="#c9a86a" strokeWidth="1.5" />
              <text x="400" y="24" textAnchor="middle" fill="#c9a86a" fontSize="11" fontWeight="700">
                OVERALL FACADE WIDTH: 17.50 METERS
              </text>
            </svg>
          </div>

          <div className="blueprint-footer">
            <div className="bp-spec-pill">
              <i className="bi bi-door-closed"></i>
              <span>{bedrooms} {isRtl ? 'أجنحة وغرف نوم' : 'Suites & Bedrooms'}</span>
            </div>
            <div className="bp-spec-pill">
              <i className="bi bi-droplet"></i>
              <span>{bathrooms} {isRtl ? 'دورات مياه فندقية' : 'Luxury Bathrooms'}</span>
            </div>
            <div className="bp-spec-pill">
              <i className="bi bi-aspect-ratio"></i>
              <span>{area} {isRtl ? 'م² مساحة مباني' : 'm² Gross Built Area'}</span>
            </div>
            <div className="bp-spec-pill highlight">
              <i className="bi bi-patch-check-fill text-gold"></i>
              <span>{isRtl ? 'تصميم كود معماري معتمد' : 'Approved Structural Code'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Dimensional Schedule Table */}
      {activeTab === 'dimensions' && (
        <div className="dimensions-table-card">
          <table className="dimensions-table">
            <thead>
              <tr>
                <th>{isRtl ? 'المساحة / الفراغ' : 'Room / Space'}</th>
                <th>{isRtl ? 'الأبعاد (طول × عرض)' : 'Dimensions (L × W)'}</th>
                <th>{isRtl ? 'المساحة الصافية' : 'Net Area'}</th>
                <th>{isRtl ? 'نوع التشطيب' : 'Finishing Standard'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>{isRtl ? 'ريسبشن واستقبال رئيسي' : 'Grand Reception & Salon'}</strong></td>
                <td>8.80m × 5.20m</td>
                <td>45.7 m²</td>
                <td>{isRtl ? 'رخام إيطالي مستورد' : 'Imported Italian Marble'}</td>
              </tr>
              <tr>
                <td><strong>{isRtl ? 'جناح الماستر الرئيسي' : 'Master Suite + Dressing'}</strong></td>
                <td>6.40m × 4.80m</td>
                <td>30.7 m²</td>
                <td>{isRtl ? 'باركيه HDF فاخر' : 'Premium Hardwood Parquet'}</td>
              </tr>
              <tr>
                <td><strong>{isRtl ? 'غرفة نوم ثانية' : 'Secondary Bedroom'}</strong></td>
                <td>4.20m × 3.80m</td>
                <td>16.0 m²</td>
                <td>{isRtl ? 'باركيه HDF ألماني' : 'German HDF Flooring'}</td>
              </tr>
              <tr>
                <td><strong>{isRtl ? 'مطبخ مفتوح Chef Kitchen' : 'Chef Open Kitchen'}</strong></td>
                <td>3.80m × 3.20m</td>
                <td>12.2 m²</td>
                <td>{isRtl ? 'بورسلين إسباني فرز أول' : 'Spanish Porcelain'}</td>
              </tr>
              <tr>
                <td><strong>{isRtl ? 'تراس بإطلالة مفتوحة' : 'Panoramic Sea/Garden Terrace'}</strong></td>
                <td>5.00m × 2.00m</td>
                <td>10.0 m²</td>
                <td>{isRtl ? 'جرانيت مضاد للانزلاق' : 'Anti-Slip Outdoor Granite'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
