import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import './Sitemap.css';

export default function Sitemap() {
  const { t, isRtl } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');

  useSeo({
    title: `${isRtl ? 'خريطة الموقع' : 'Sitemap'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'دليل التصفح المعماري الشامل لمنصة داركم العقارية: أبرز الوجهات الساحلية، الطرز المعمارية، وخدمات المستثمرين والملاك.'
      : 'Comprehensive architectural sitemap of Darcom Real Estate: prime coastal destinations, property typologies, and client services.',
  });

  const breadcrumbItems = [
    { label: t('nav.home', isRtl ? 'الرئيسية' : 'Home'), to: '/' },
    { label: isRtl ? 'خريطة الموقع' : 'Sitemap' },
  ];

  const sitemapCategories = useMemo(() => [
    {
      id: 'destinations',
      title: isRtl ? 'قرى ووجهات الساحل الشمالي' : 'North Coast Villages & Destinations',
      icon: 'bi-geo-alt-fill',
      description: isRtl
        ? 'تصفح أرقى القرى والمنتجعات الساحلية على امتداد الساحل الشمالي المصري'
        : 'Explore premier villages and coastal communities across Egypt’s North Coast',
      links: [
        { label: isRtl ? 'مراسي · سيدي عبد الرحمن' : 'Marassi · Sidi Abdel Rahman', to: '/properties?villageId=1', meta: isRtl ? 'مارينا وشواطئ' : 'Marina & Shore' },
        { label: isRtl ? 'هاسيندا باي · الساحل الشمالي' : 'Hacienda Bay · North Coast', to: '/properties?villageId=2', meta: isRtl ? 'جولف ولاجون' : 'Golf & Lagoon' },
        { label: isRtl ? 'تلال الساحل · سيدي عبد الرحمن' : 'Telal · Sidi Abdel Rahman', to: '/properties?villageId=3', meta: isRtl ? 'إطلالة بحرية' : 'Sea View' },
        { label: isRtl ? 'أمواج · سيدي عبد الرحمن' : 'Amwaj · Sidi Abdel Rahman', to: '/properties?villageId=4', meta: isRtl ? 'حياة شاطئية' : 'Beach Living' },
        { label: isRtl ? 'ماونتن فيو رأس الحكمة' : 'Mountain View · Ras El Hekma', to: '/properties?villageId=5', meta: isRtl ? 'خليج رأس الحكمة' : 'Turquoise Bay' },
        { label: isRtl ? 'سيلفرساندز · الساحل الشمالي' : 'Silversands · North Coast', to: '/properties?villageId=6', meta: isRtl ? 'فخامة شاطئية' : 'Ultra-luxury' },
      ],
    },
    {
      id: 'typologies',
      title: isRtl ? 'أنواع العقارات والطرز المعمارية' : 'Property Styles & Typologies',
      icon: 'bi-building',
      description: isRtl
        ? 'وحدات معمارية فاخرة مصنفة حسب المساحة ونمط الحياة والاستثمار'
        : 'Curated residences classified by architecture, lifestyle layout, and investment yield',
      links: [
        { label: isRtl ? 'فلل مستقلة وقصور شاطئية فاخرة' : 'Standalone Luxury Villas & Seaside Estates', to: '/properties?type=villa', meta: isRtl ? 'مساحات واسعة' : 'Private Estate' },
        { label: isRtl ? 'شاليهات شاطئية ولاجون مباشر' : 'Direct Beachfront & Lagoon Chalets', to: '/properties?type=chalet', meta: isRtl ? 'إطلالة بحر' : 'Waterfront' },
        { label: isRtl ? 'بنتهاوس بانورامي بروف خاص' : 'Panoramic Sky Penthouses with Private Roof', to: '/properties?type=penthouse', meta: isRtl ? 'إطلالة 360°' : 'Panoramic' },
        { label: isRtl ? 'تاون هاوس وتوين فيلا بحدائق خاصة' : 'Townhouses & Twin Villas with Private Gardens', to: '/properties?type=townhouse', meta: isRtl ? 'عائلي' : 'Family Living' },
        { label: isRtl ? 'شقق فندقية مخدومة واستثمارية' : 'Serviced Hotel Apartments & High-Yield Units', to: '/properties?type=apartment', meta: isRtl ? 'عائد إيجاري' : 'High ROI' },
        { label: isRtl ? 'دوبلكس بحدائق وتراسات واسعة' : 'Garden Duplexes & Expansive Terraces', to: '/properties?type=duplex', meta: isRtl ? 'طراز حديث' : 'Modern Living' },
      ],
    },
    {
      id: 'services',
      title: isRtl ? 'خدمات الملاك والمستثمرين' : 'Client Portals & Investment Advisory',
      icon: 'bi-briefcase-fill',
      description: isRtl
        ? 'بوابات مخصصة لخدمات البيع والشراء والاستشارات العقارية الموثقة'
        : 'Dedicated access points for property acquisitions, sales, and portfolio structuring',
      links: [
        { label: isRtl ? 'دليل كبار المطورين العقاريين في مصر' : 'Directory of Premier Egyptian Developers', to: '/developers', meta: isRtl ? 'شركاء التطوير' : 'Developers' },
        { label: isRtl ? 'مقارنة العقارات المختارة جنباً إلى جنب' : 'Side-by-Side Property Comparison Matrix', to: '/compare', meta: isRtl ? 'أداة مقارنة' : 'Compare' },
        { label: isRtl ? 'بيع عقارك · انضم للدائرة العقارية الخاصة' : 'Sell with Us · Private Circle Listing', to: '/sell', meta: isRtl ? 'للملاك' : 'For Owners' },
        { label: isRtl ? 'استشارات الاستثمار العقاري ودراسات الجدوى' : 'Investment Portfolio Advisory & Market Insights', to: '/contact', meta: isRtl ? 'استشارات' : 'Consulting' },
        { label: isRtl ? 'تصفح كافة العقارات والمشاريع المتاحة' : 'Browse All Available Properties', to: '/properties', meta: isRtl ? 'تصفح كامل' : 'All Listings' },
        { label: isRtl ? 'العقارات المحفوظة والمفضلة' : 'Saved Residences & Shortlist', to: '/favorites', meta: isRtl ? 'حساب خاص' : 'Private' },
        { label: isRtl ? 'الملف الشخصي وإدارة الطلبات' : 'Private Account & Inquiry Portal', to: '/profile', meta: isRtl ? 'لوحة التحكم' : 'Dashboard' },
        { label: isRtl ? 'طلب معاينة خاصة وحجز استشارة' : 'Schedule Private Viewing & Concierge Call', to: '/contact', meta: isRtl ? 'حجز مباشر' : 'Concierge' },
      ],
    },
    {
      id: 'corporate',
      title: isRtl ? 'الصفحات المؤسسية والقانونية' : 'Corporate & Legal Documents',
      icon: 'bi-shield-check',
      description: isRtl
        ? 'بيانات الترخيص، سياسات الخصوصية، شروط التعاقد، ووسائل الاتصال المباشرة'
        : 'Licensing credentials, data compliance policies, terms of service, and corporate channels',
      links: [
        { label: isRtl ? 'الصفحة الرئيسية لمنصة داركم' : 'Darcom Real Estate Homepage', to: '/', meta: isRtl ? 'الرئيسية' : 'Home' },
        { label: isRtl ? 'تواصل معنا ومكاتب كبار العملاء' : 'Contact Us & VIP Concierge Bureau', to: '/contact', meta: isRtl ? 'خدمة العملاء' : 'Support' },
        { label: isRtl ? 'سياسة الخصوصية وحماية بيانات العملاء' : 'Client Privacy & Data Protection Policy', to: '/privacy', meta: isRtl ? 'قانوني' : 'Legal' },
        { label: isRtl ? 'شروط وأحكام استخدام المنصة' : 'Terms of Service & Brokerage Agreement', to: '/terms', meta: isRtl ? 'قانوني' : 'Legal' },
        { label: isRtl ? 'تسجيل الدخول للحساب الخاص' : 'Sign In to Private Account', to: '/login', meta: isRtl ? 'تسجيل دخول' : 'Auth' },
        { label: isRtl ? 'إنشاء حساب عميل جديد' : 'Create New Client Account', to: '/register', meta: isRtl ? 'تسجيل جديد' : 'Register' },
      ],
    },
  ], [isRtl]);

  // Filter links when user types in search
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return sitemapCategories;
    const query = searchTerm.toLowerCase();

    return sitemapCategories
      .map((cat) => ({
        ...cat,
        links: cat.links.filter(
          (l) => l.label.toLowerCase().includes(query) || (l.meta && l.meta.toLowerCase().includes(query))
        ),
      }))
      .filter((cat) => cat.links.length > 0);
  }, [sitemapCategories, searchTerm]);

  return (
    <div className="darcom-sitemap-page">
      <div className="container">
        {/* Breadcrumbs */}
        <div className="sitemap-breadcrumb-wrap">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* Header Block */}
        <header className="sitemap-header">
          <div className="sitemap-badge">
            <i className="bi bi-diagram-3-fill text-gold"></i>
            <span>{isRtl ? 'دليل التصفح المعماري الشامل' : 'Comprehensive Architecture Directory'}</span>
          </div>
          <h1 className="sitemap-title">
            {isRtl ? 'خريطة موقع داركم العقاري' : 'Darcom Real Estate Sitemap'}
          </h1>
          <p className="sitemap-subtitle">
            {isRtl
              ? 'دليل منظم لجميع أقسام المنصة، الوجهات الساحلية، الطرز المعمارية، وخدمات الملاك والمستثمرين لتسهيل الوصول المباشر.'
              : 'An organized index of all platform portals, coastal locations, residence styles, and client advisory channels.'}
          </p>

          {/* Quick Search Filter Inside Sitemap */}
          <div className="sitemap-search-wrap">
            <div className="sitemap-search-box">
              <i className="bi bi-search search-icon"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isRtl
                    ? 'ابحث عن وجهة، نوع عقار، أو صفحة معينة في الخريطة...'
                    : 'Search for a destination, property style, or page...'
                }
                className="sitemap-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="sitemap-search-clear"
                  aria-label="Clear search"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
            {searchTerm && (
              <span className="search-results-count">
                {isRtl
                  ? `نتائج البحث عن: "${searchTerm}"`
                  : `Search results for: "${searchTerm}"`}
              </span>
            )}
          </div>
        </header>

        {/* Categories Grid */}
        <div className="sitemap-categories-grid">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <section key={category.id} className="sitemap-cat-card">
                <div className="sitemap-cat-header">
                  <div className="sitemap-cat-icon">
                    <i className={`bi ${category.icon}`}></i>
                  </div>
                  <div>
                    <h2 className="sitemap-cat-title">{category.title}</h2>
                    <p className="sitemap-cat-desc">{category.description}</p>
                  </div>
                  <span className="sitemap-cat-count">{category.links.length}</span>
                </div>

                <ul className="sitemap-links-list">
                  {category.links.map((item, idx) => (
                    <li key={idx} className="sitemap-link-li">
                      <Link to={item.to} className="sitemap-link-anchor">
                        <span className="sitemap-link-bullet"></span>
                        <span className="sitemap-link-text">{item.label}</span>
                        {item.meta && (
                          <span className="sitemap-link-meta">{item.meta}</span>
                        )}
                        <i className={`bi ${isRtl ? 'bi-arrow-left-short' : 'bi-arrow-right-short'} sitemap-link-arrow`}></i>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <div className="sitemap-no-results">
              <i className="bi bi-search sitemap-empty-icon"></i>
              <h3>{isRtl ? 'لا توجد نتائج مطابقة' : 'No Matching Pages Found'}</h3>
              <p>
                {isRtl
                  ? `لم نجد أي روابط تطابق "${searchTerm}". جرب البحث بكلمات أخرى.`
                  : `We could not find any links matching "${searchTerm}". Try another keyword.`}
              </p>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="btn btn-brand"
              >
                {isRtl ? 'إعادة عرض كافة الروابط' : 'Show All Links'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
