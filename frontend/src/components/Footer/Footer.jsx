import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { cmsService } from '../../services/cmsService.js';
import './Footer.css';

export default function Footer() {
  const { t, isRtl } = useSettings();
  const [cmsSettings, setCmsSettings] = useState(null);
  const [footerContent, setFooterContent] = useState(null);

  useEffect(() => {
    cmsService.getBulk(['site.settings', 'footer.content']).then((res) => {
      if (res?.data && typeof res.data === 'object') {
        if (res.data['site.settings']) {
          try {
            setCmsSettings(JSON.parse(res.data['site.settings']));
          } catch (_) {}
        }
        if (res.data['footer.content']) {
          try {
            setFooterContent(JSON.parse(res.data['footer.content']));
          } catch (_) {}
        }
      }
    }).catch(() => {});
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const destinationLinks = [
    { label: isRtl ? 'مراسي · سيدي عبد الرحمن' : 'Marassi · Sidi Abdel Rahman', to: '/properties?villageId=1' },
    { label: isRtl ? 'هاسيندا باي · الساحل الشمالي' : 'Hacienda Bay · North Coast', to: '/properties?villageId=2' },
    { label: isRtl ? 'تلال الساحل · سيدي عبد الرحمن' : 'Telal · Sidi Abdel Rahman', to: '/properties?villageId=3' },
    { label: isRtl ? 'أمواج · سيدي عبد الرحمن' : 'Amwaj · North Coast', to: '/properties?villageId=4' },
    { label: isRtl ? 'ماونتن فيو رأس الحكمة' : 'Mountain View · Ras El Hekma', to: '/properties?villageId=5' },
    { label: isRtl ? 'سيلفرساندز · الساحل الشمالي' : 'Silversands · North Coast', to: '/properties?villageId=6' },
  ];

  const typologyLinks = [
    { label: isRtl ? 'شاليهات ولاجون ساحلي' : 'Coastal Beachfront Chalets', to: '/properties?type=chalet' },
    { label: isRtl ? 'فلل مستقلة وقصور شاطئية' : 'Standalone Villas & Estates', to: '/properties?type=villa' },
    { label: isRtl ? 'بنتهاوس بانورامي' : 'Panoramic Sky Penthouses', to: '/properties?type=penthouse' },
    { label: isRtl ? 'تاون هاوس وتوين فيلا' : 'Townhouses & Twin Villas', to: '/properties?type=townhouse' },
    { label: isRtl ? 'شقق فندقية واستثمارية' : 'Serviced Apartments', to: '/properties?type=apartment' },
  ];

  const advisoryLinks = [
    { label: isRtl ? 'دليل كبار المطورين' : 'Premier Developers Directory', to: '/developers' },
    { label: isRtl ? 'مقارنة العقارات الفورية' : 'Compare Residences', to: '/compare' },
    { label: t('footer.sellWithUs', 'Sell with Us (Private Circle)'), to: '/sell' },
    { label: isRtl ? 'استشارات الاستثمار العقاري' : 'Investment Portfolio Advisory', to: '/contact' },
    { label: isRtl ? 'طلب معاينة خاصة' : 'Schedule Private Viewing', to: '/contact' },
  ];

  const corporateLinks = [
    { label: t('footer.aboutUs', 'About Darcom'), to: '/contact' },
    { label: t('nav.contact', 'Contact & Concierge'), to: '/contact' },
    { label: t('nav.favorites', 'Saved Residences'), to: '/favorites' },
    { label: t('nav.myProfile', 'Private Account'), to: '/profile' },
    { label: t('footer.privacyPolicy', 'Privacy Policy'), to: '/privacy' },
    { label: t('footer.termsOfService', 'Terms of Service'), to: '/terms' },
  ];

  const phone = cmsSettings?.phone || '+20 100 000 0000';
  const email = cmsSettings?.email || 'concierge@darcom.eg';
  const address = cmsSettings ? (isRtl ? cmsSettings.address : (cmsSettings.addressEn || cmsSettings.address)) : t('footer.officeLocation', 'التجمع الخامس، القاهرة الجديدة');
  const socials = cmsSettings?.socials || cmsSettings || {};

  return (
    <footer className="darcom-luxury-footer">

      {/* 2. Main Navigation & Corporate Info */}
      <div className="footer-main-core">
        <div className="container">
          <div className="footer-columns-grid">
            {/* Column 1: Brand & Office Credentials */}
            <div className="footer-col-brand">
              <Link to="/" className="footer-brand-logo-link">
                <img src="/logo-white.png" alt="Darcom Real Estate" className="footer-brand-logo" />
              </Link>
              <p className="footer-brand-about">
                {footerContent
                  ? (isRtl ? footerContent.aboutAr : (footerContent.aboutEn || footerContent.aboutAr))
                  : t(
                      'footer.about',
                      'المنصة العقارية الرقمية الرائدة في مصر للمصايف والفلل المستقلة والبنتهاوس الفاخر على سواحل البحر الأحمر والمتوسط وكمبوندات القاهرة الجديدة.'
                    )}
              </p>

              <div className="footer-credentials-badge">
                <i className="bi bi-patch-check-fill text-gold"></i>
                <span>
                  {footerContent
                    ? (isRtl ? footerContent.verifiedBadgeAr : (footerContent.verifiedBadgeEn || footerContent.verifiedBadgeAr))
                    : t('footer.verifiedBroker', 'وساطة واستشارات عقارية مرخصة رسمياً')}
                </span>
              </div>

              <div className="footer-contact-items">
                <div className="footer-contact-row">
                  <i className="bi bi-geo-alt-fill"></i>
                  <span>{address}</span>
                </div>
                <div className="footer-contact-row">
                  <i className="bi bi-telephone-fill"></i>
                  <a href={`tel:${phone.replace(/\s+/g, '')}`} dir="ltr">{phone}</a>
                </div>
                <div className="footer-contact-row">
                  <i className="bi bi-envelope-fill"></i>
                  <a href={`mailto:${email}`}>{email}</a>
                </div>
              </div>

              {/* Social Presence */}
              <div className="footer-social-row">
                {socials.facebook && (
                  <a href={socials.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="social-circle-btn">
                    <i className="bi bi-facebook"></i>
                  </a>
                )}
                {socials.instagram && (
                  <a href={socials.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="social-circle-btn">
                    <i className="bi bi-instagram"></i>
                  </a>
                )}
                {socials.linkedin && (
                  <a href={socials.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="social-circle-btn">
                    <i className="bi bi-linkedin"></i>
                  </a>
                )}
                {socials.youtube && (
                  <a href={socials.youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="social-circle-btn">
                    <i className="bi bi-youtube"></i>
                  </a>
                )}
                {(socials.twitter || socials['twitter-x']) && (
                  <a href={socials.twitter || socials['twitter-x']} target="_blank" rel="noreferrer" aria-label="Twitter / X" className="social-circle-btn">
                    <i className="bi bi-twitter-x"></i>
                  </a>
                )}
              </div>
            </div>

            {/* Column 2: Destinations */}
            <nav className="footer-col-nav" aria-label={t('footer.allDestinations', 'أبرز الوجهات')}>
              <h6 className="footer-nav-title">{t('footer.allDestinations', 'أبرز الوجهات')}</h6>
              <ul className="footer-nav-links">
                {destinationLinks.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} className="footer-nav-link">
                      <span className="link-hover-bullet"></span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Column 3: Typologies */}
            <nav className="footer-col-nav" aria-label={t('footer.propertyStyles', 'الطرز المعمارية')}>
              <h6 className="footer-nav-title">{t('footer.propertyStyles', 'الطرز المعمارية')}</h6>
              <ul className="footer-nav-links">
                {typologyLinks.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} className="footer-nav-link">
                      <span className="link-hover-bullet"></span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Column 4: Client Services */}
            <nav className="footer-col-nav" aria-label={t('footer.clientServices', 'خدمات المستثمرين والملاك')}>
              <h6 className="footer-nav-title">{t('footer.clientServices', 'خدمات المستثمرين والملاك')}</h6>
              <ul className="footer-nav-links">
                {advisoryLinks.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} className="footer-nav-link">
                      <span className="link-hover-bullet"></span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Column 5: Darcom Corporate */}
            <nav className="footer-col-nav" aria-label={t('footer.corporate', 'داركم والدعم')}>
              <h6 className="footer-nav-title">{t('footer.corporate', 'داركم والدعم')}</h6>
              <ul className="footer-nav-links">
                {corporateLinks.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} className="footer-nav-link">
                      <span className="link-hover-bullet"></span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* 3. Regulatory Trust Pedestals Strip */}
      <div className="footer-trust-pedestals">
        <div className="container">
          <div className="trust-pedestals-inner">
            <div className="trust-pedestal-item">
              <i className="bi bi-shield-check trust-icon"></i>
              <span>{t('footer.trust1', 'فحص قانوني معتمد 100% لسندات الملكية')}</span>
            </div>
            <div className="trust-pedestal-item">
              <i className="bi bi-tag-fill trust-icon"></i>
              <span>{t('footer.trust2', 'صفر عمولة على الطروحات المباشرة')}</span>
            </div>
            <div className="trust-pedestal-item">
              <i className="bi bi-lock-fill trust-icon"></i>
              <span>{t('footer.trust3', 'سرية تامة لبيانات الملاك والمستثمرين')}</span>
            </div>
            <div className="trust-pedestal-item">
              <i className="bi bi-person-badge-fill trust-icon"></i>
              <span>{t('footer.trust4', 'مستشار عقاري شخصي مرخص من البداية للاستلام')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sub-Footer Legal & Back to Top */}
      <div className="footer-sub-legal">
        <div className="container footer-legal-flex">
          <div className="legal-copy">
            <span>© {new Date().getFullYear()} {t('common.darcom', 'Darcom')} Real Estate. {t('footer.rightsReserved', 'جميع الحقوق محفوظة.')}</span>
          </div>

          <div className="legal-nav-strip">
            <Link to="/privacy">{t('footer.privacyPolicy', 'Privacy Policy')}</Link>
            <span className="legal-separator">·</span>
            <Link to="/terms">{t('footer.termsOfService', 'Terms')}</Link>
            <span className="legal-separator">·</span>
            <Link to="/sitemap">{t('footer.sitemap', 'Sitemap')}</Link>
            <span className="legal-separator">·</span>
            <Link to="/contact">{t('nav.contact', 'Contact')}</Link>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="footer-back-to-top"
            aria-label={isRtl ? 'العودة للأعلى' : 'Back to top'}
            title={isRtl ? 'العودة للأعلى' : 'Back to top'}
          >
            <span>{isRtl ? 'الأعلى' : 'Top'}</span>
            <i className="bi bi-chevron-up ms-1"></i>
          </button>
        </div>
      </div>
    </footer>
  );
}
