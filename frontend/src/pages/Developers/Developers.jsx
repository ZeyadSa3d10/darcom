import { useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import './Developers.css';

const DEVELOPERS_DATA = [
  {
    id: 'emaar-misr',
    name: 'Emaar Misr',
    nameAr: 'إعمار مصر',
    slug: 'emaar-misr',
    queryName: 'Emaar Misr',
    founded: 1997,
    unitsDelivered: '25,000+',
    rating: 4.9,
    tagline: 'World-renowned master communities and Mediterranean coastal excellence.',
    taglineAr: 'رواد المجتمعات العمرانية المتكاملة والأيقونات الساحلية العالمية.',
    description: 'Emaar Misr is the prestigious developer behind some of Egypt’s most iconic addresses including Marassi, Uptown Cairo, and Mivida. Renowned for highest international build standards and enduring investment appreciation.',
    descriptionAr: 'المطور الرائد وراء أبرز العناوين الفاخرة في مصر مثل مراسي الساحل الشمالي، وأب تاون كايرو، وميفيدا. تشتهر بأعلى معايير الجودة العالمية والقيمة الاستثمارية المتنامية.',
    flagships: ['Marassi (North Coast)', 'Uptown Cairo', 'Mivida (New Cairo)', 'Cairo Gate (Sheikh Zayed)'],
    flagshipsAr: ['مراسي (الساحل الشمالي)', 'أب تاون كايرو', 'ميفيدا (القاهرة الجديدة)', 'كايرو جيت (زايد)'],
    badge: 'Premier Tier 1',
    logoIcon: 'bi-gem',
    accentColor: '#c9a86a',
  },
  {
    id: 'palm-hills',
    name: 'Palm Hills Developments',
    nameAr: 'بالم هيلز للتعمير',
    slug: 'palm-hills',
    queryName: 'Palm Hills',
    founded: 1997,
    unitsDelivered: '30,000+',
    rating: 4.8,
    tagline: 'Signature architectural living and lush green landscapes.',
    taglineAr: 'حياة عصرية راقية وسط مساحات خضراء شاسعة ومجتمعات نابضة.',
    description: 'A benchmark in Egyptian real estate with over 35 iconic residential compounds and resorts across West Cairo, East Cairo, and Mediterranean coasts including Hacienda Bay and Badya.',
    descriptionAr: 'علامة فارقة في السوق العقاري المصري بأكثر من 35 مجتمعاً سكنياً وساحلياً في غرب وشرق القاهرة والساحل الشمالي مثل هاسيندا باي وباديا.',
    flagships: ['Hacienda Bay & Waters', 'Palm Hills October', 'Badya Creative City', 'Palm Parks'],
    flagshipsAr: ['هاسيندا باي ووودز', 'بالم هيلز أكتوبر', 'مدينة باديا الذكية', 'بالم باركس'],
    badge: 'Pioneer Master Planner',
    logoIcon: 'bi-tree',
    accentColor: '#14424f',
  },
  {
    id: 'mountain-view',
    name: 'Mountain View (DMG)',
    nameAr: 'ماونتن فيو للتطوير',
    slug: 'mountain-view',
    queryName: 'Mountain View',
    founded: 2005,
    unitsDelivered: '18,000+',
    rating: 4.8,
    tagline: 'Signature Greek architecture, lagoon living, and the Science of Happiness.',
    taglineAr: 'العمارة اليونانية البيضاء الخالدة وعلم السعادة والبحيرات الكريستالية.',
    description: 'Mountain View leads creative community building in Egypt with distinct white and blue coastal and suburban enclaves such as iCity New Cairo and Mountain View Ras El Hikma.',
    descriptionAr: 'ماونتن فيو تقود الابتكار في بناء المجتمعات السعيدة مع هويتها المعمارية المميزة باللونين الأبيض والأزرق في مشروعات آي سيتي ورأس الحكمة.',
    flagships: ['Mountain View Ras El Hikma', 'iCity New Cairo', 'Chillout Park 6th October', 'LVLS North Coast'],
    flagshipsAr: ['ماونتن فيو رأس الحكمة', 'آي سيتي القاهرة الجديدة', 'تشيل أوت بارك', 'ليفيلز الساحل'],
    badge: 'Happiness Communities',
    logoIcon: 'bi-heart-pulse',
    accentColor: '#14424f',
  },
  {
    id: 'sodic',
    name: 'SODIC',
    nameAr: 'سوديك للتطوير العقاري',
    slug: 'sodic',
    queryName: 'SODIC',
    founded: 1996,
    unitsDelivered: '20,000+',
    rating: 4.9,
    tagline: 'Contemporary human-centric master planning and upscale club communities.',
    taglineAr: 'تخطيط عمراني معاصر يضع الإنسان في قلب التجربة مع نوادٍ عالمية.',
    description: 'Backed by Aldar Properties, SODIC is renowned for timeless developments such as Allegria, Villette, and June Ras El Hikma, pairing architectural poise with walkable green districts.',
    descriptionAr: 'مدعومة باستثمارات الدار العقارية، وتشتهر سوديك بمشروعاتها الراقية مثل أليجريا وفيليت وجون رأس الحكمة التي تجمع بين الخصوصية والمساحات المفتوحة.',
    flagships: ['Allegria (Sheikh Zayed)', 'Villette (New Cairo)', 'June Ras El Hikma', 'The Estates'],
    flagshipsAr: ['أليجريا (الشيخ زايد)', 'فيليت (القاهرة الجديدة)', 'جون رأس الحكمة', 'ذا إستيتس'],
    badge: 'Institutional Excellence',
    logoIcon: 'bi-buildings',
    accentColor: '#0e2a33',
  },
  {
    id: 'tmg',
    name: 'Talaat Moustafa Group (TMG)',
    nameAr: 'مجموعة طلعت مصطفى',
    slug: 'tmg',
    queryName: 'TMG',
    founded: 1970,
    unitsDelivered: '140,000+',
    rating: 4.9,
    tagline: 'Egypt’s largest self-sustaining smart mega-cities and comprehensive living.',
    taglineAr: 'أكبر مطور للمدن الذكية المتكاملة ومجتمعات الحياة المستدامة في مصر.',
    description: 'The monumental developer of Madinaty, Al Rehab, and Noor City. TMG stands unmatched in delivering comprehensive social, educational, healthcare, and retail infrastructure.',
    descriptionAr: 'المطور التاريخي لمدينتي والرحاب ومدينة نور وسيليا. تتميز بتوفير بنية تحتية ومرافق تعليمية وصحية ورياضية متكاملة داخل كل مشروع.',
    flagships: ['Madinaty', 'Al Rehab City', 'Noor Smart City', 'Celia (New Capital)'],
    flagshipsAr: ['مدينتي', 'مدينة الرحاب', 'مدينة نور الذكية', 'سيليا العاصمة الإدارية'],
    badge: 'Mega-City Builder',
    logoIcon: 'bi-shield-check',
    accentColor: '#c9a86a',
  },
  {
    id: 'hassan-allam',
    name: 'Hassan Allam Properties',
    nameAr: 'حسن علام العقارية',
    slug: 'hassan-allam',
    queryName: 'Hassan Allam',
    founded: 1936,
    unitsDelivered: '15,000+',
    rating: 4.8,
    tagline: 'Centuries of engineering heritage and boutique prime luxury living.',
    taglineAr: 'إرث هندسي يمتد لعقود ومجتمعات سكنية بوتيك فائقة الرقي والخصوصية.',
    description: 'HAP crafts some of the most sought-after prime developments in Cairo and the coast, with SwanLake Residences and Little Venice standing as symbols of elite exclusivity.',
    descriptionAr: 'تقدم حسن علام مشروعات نخبوية مرموقة مثل سوان ليك القاهرة الجديدة وسوان ليك الساحل الشمالي وهاب تاون مستقبل سيتي.',
    flagships: ['SwanLake Residences (New Cairo)', 'SwanLake North Coast', 'HAPTown (Mostakbal City)', 'Little Venice (Sokhna)'],
    flagshipsAr: ['سوان ليك ريزيدنس', 'سوان ليك الساحل الشمالي', 'هاب تاون', 'ليتل فينيس السخنة'],
    badge: 'Engineering Legacy',
    logoIcon: 'bi-patch-check',
    accentColor: '#14424f',
  },
  {
    id: 'tatweer-misr',
    name: 'Tatweer Misr',
    nameAr: 'تطوير مصر',
    slug: 'tatweer-misr',
    queryName: 'Tatweer Misr',
    founded: 2014,
    unitsDelivered: '12,000+',
    rating: 4.7,
    tagline: 'Cliff-top mountain resorts, crystal lagoons, and vibrant leisure communities.',
    taglineAr: 'منتجعات جبلية ساحرة مع كريستال لاجونز ومجتمعات تعليمية متطورة.',
    description: 'Creators of the legendary Il Monte Galala in Ain Sokhna and Fouka Bay in North Coast, integrating resort hospitality with mountain topography.',
    descriptionAr: 'مطورو المونت جلالة في العين السخنة وفوكا باي ودي باي في الساحل الشمالي مع أروع الإطلالات الجبلية والبحرية.',
    flagships: ['Il Monte Galala (Ain Sokhna)', 'Fouka Bay (North Coast)', 'Bloomfields (Mostakbal City)', 'D-Bay'],
    flagshipsAr: ['المونت جلالة (السخنة)', 'فوكا باي (الساحل الشمالي)', 'بلوم فيلدز', 'دي باي'],
    badge: 'Coastal Innovator',
    logoIcon: 'bi-water',
    accentColor: '#14424f',
  },
  {
    id: 'ora-developers',
    name: 'Ora Developers',
    nameAr: 'أورا ديفلوبرز',
    slug: 'ora-developers',
    queryName: 'Ora Developers',
    founded: 2018,
    unitsDelivered: '8,000+',
    rating: 4.8,
    tagline: 'High-rise park residences and world-class luxury lifestyle destinations.',
    taglineAr: 'أبراج بارك فيو فاخرة وتجارب ضيافة وترفيه عالمية برؤية متفردة.',
    description: 'Chaired by Naguib Sawiris, Ora creates vibrant lifestyle destinations including ZED Towers overlooking Zayed Central Park, ZED East, and the beachfront Silversands.',
    descriptionAr: 'برئاسة المهندس نجيب ساويرس، تقدم أورا مجتمعات فاخرة مثل أبراج زد الشيخ زايد المطلة على الحديقة المركزية، وزد إيست، وسيلفرساندز.',
    flagships: ['ZED Towers (Sheikh Zayed)', 'ZED East (New Cairo)', 'Silversands (North Coast)', 'Solana New Zayed'],
    flagshipsAr: ['أبراج زد الشيخ زايد', 'زد إيست التجمع', 'سيلفرساندز الساحل', 'سولانا نيو زايد'],
    badge: 'Luxury Lifestyle',
    logoIcon: 'bi-stars',
    accentColor: '#c9a86a',
  },
];

export default function Developers() {
  const { t, isRtl } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');

  useSeo({
    title: `${isRtl ? 'دليل كبار المطورين العقاريين في مصر' : 'Premier Egyptian Real Estate Developers'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'دليل حصري لكبار المطورين العقاريين في مصر: إعمار مصر، بالم هيلز، ماونتن فيو، سوديك، طلعت مصطفى، وحسن علام، مع عروض الوحدات وأسعارها المباشرة.'
      : 'Explore premier Egyptian master developers: Emaar Misr, Palm Hills, Mountain View, SODIC, TMG, and Hassan Allam with direct unit inventory and 0% commission.',
  });

  const breadcrumbs = [
    { label: t('nav.home', isRtl ? 'الرئيسية' : 'Home'), to: '/' },
    { label: isRtl ? 'المطورون العقاريون' : 'Developers' },
  ];

  const filteredDevelopers = DEVELOPERS_DATA.filter((dev) => {
    const term = searchTerm.toLowerCase();
    return (
      dev.name.toLowerCase().includes(term) ||
      dev.nameAr.includes(term) ||
      dev.flagships.some((f) => f.toLowerCase().includes(term))
    );
  });

  return (
    <div className="darcom-developers-page">
      <div className="container">
        {/* Breadcrumb */}
        <div className="dev-breadcrumb-wrap">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        {/* Hero Section */}
        <header className="dev-header">
          <div className="dev-header-badge">
            <i className="bi bi-patch-check-fill text-gold"></i>
            <span>{isRtl ? 'شركاء التطوير المعتمدون' : 'Accredited Master Developers'}</span>
          </div>
          <h1 className="dev-title">
            {isRtl ? 'دليل كبرى شركات التطوير العقاري في مصر' : 'Directory of Premier Egyptian Developers'}
          </h1>
          <p className="dev-subtitle">
            {isRtl
              ? 'شراكات استراتيجية موثقة مع رواد التخطيط العمراني في مصر، تضمن لك أسعار المطور الرسمية، خطط السداد الحصرية بدون فوائد، وشفافية العقود القانونية.'
              : 'Direct verified partnerships with Egypt’s preeminent master planners, guaranteeing official developer pricing, 0% commission on primary sales, and complete contract escrow integrity.'}
          </p>

          {/* Stats Ribbon */}
          <div className="dev-stats-ribbon">
            <div className="dev-stat-box">
              <strong>8+</strong>
              <span>{isRtl ? 'كبار المطورين المعتمدين' : 'Tier-1 Master Developers'}</span>
            </div>
            <div className="dev-stat-box">
              <strong>250,000+</strong>
              <span>{isRtl ? 'وحدات سلمت بنجاح' : 'Delivered Luxury Units'}</span>
            </div>
            <div className="dev-stat-box">
              <strong>0%</strong>
              <span>{isRtl ? 'عمولة على الوحدات الأولية' : 'Buyer Commission'}</span>
            </div>
            <div className="dev-stat-box">
              <strong>100%</strong>
              <span>{isRtl ? 'فحص ومراجعة التراخيص' : 'Legal Title Audit'}</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="dev-search-bar">
            <i className="bi bi-search"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRtl ? 'ابحث باسم المطور أو المشروع (مثل: مراسي، سوديك، باديا)...' : 'Search developers or flagship projects (e.g. Marassi, SODIC, Badya)...'}
              aria-label="Search Developers"
            />
            {searchTerm && (
              <button
                type="button"
                className="dev-search-clear"
                onClick={() => setSearchTerm('')}
              >
                <i className="bi bi-x-circle"></i>
              </button>
            )}
          </div>
        </header>

        {/* Developer Cards Grid */}
        <div className="dev-cards-grid">
          {filteredDevelopers.map((dev) => (
            <article key={dev.id} className="developer-card">
              <div className="dev-card-header">
                <div className="dev-icon-badge">
                  <i className={`bi ${dev.logoIcon}`}></i>
                </div>
                <div>
                  <div className="dev-badge-tier">{dev.badge}</div>
                  <h2 className="dev-card-name">{isRtl ? dev.nameAr : dev.name}</h2>
                  <span className="dev-established">
                    {isRtl ? `تأسست عام ${dev.founded}` : `Est. ${dev.founded}`} • {dev.unitsDelivered} {isRtl ? 'وحدة' : 'units'}
                  </span>
                </div>
              </div>

              <p className="dev-card-desc">
                {isRtl ? dev.descriptionAr : dev.description}
              </p>

              {/* Flagships */}
              <div className="dev-flagships-block">
                <span className="flagships-label">
                  <i className="bi bi-star text-gold me-1"></i>
                  {isRtl ? 'أبرز المشروعات والكمبوندات:' : 'Iconic Flagship Developments:'}
                </span>
                <div className="flagships-chips">
                  {(isRtl ? dev.flagshipsAr : dev.flagships).map((f, idx) => (
                    <span key={idx} className="flagship-chip">{f}</span>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="dev-card-footer">
                <Link
                  to={`/properties?developer=${encodeURIComponent(dev.queryName)}`}
                  className="btn-dev-properties"
                >
                  <span>{isRtl ? `استعراض وحدات ${dev.nameAr}` : `Explore ${dev.name} Units`}</span>
                  <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'}`}></i>
                </Link>

                <a
                  href={`https://wa.me/201000000000?text=${encodeURIComponent(
                    isRtl
                      ? `مرحباً، أود استشارة عقارية بخصوص مشروعات المطور: ${dev.nameAr}`
                      : `Hello, I would like consultation regarding projects by ${dev.name}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-dev-consult"
                  title={isRtl ? 'استشارة فورية عبر واتساب' : 'VIP Consultation'}
                >
                  <i className="bi bi-whatsapp"></i>
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* Developer Listing Partnership Callout */}
        <section className="dev-partner-callout">
          <div className="partner-callout-inner">
            <div>
              <span className="partner-kicker">{isRtl ? 'شراكات المطورين' : 'Developer Partnerships'}</span>
              <h3 className="partner-title">
                {isRtl ? 'هل أنت مطور عقاري معتمد وترغب بإدراج مشروعاتك في داركم؟' : 'Are You a Certified Developer Seeking Direct Representation?'}
              </h3>
              <p className="partner-desc">
                {isRtl
                  ? 'انضم إلى شبكة داركم لخدمة المستثمرين والمشترين من مصر والخليج والعالم، مع ضمان أعلى معايير العرض المعماري الرقمي.'
                  : 'Join Darcom’s elite network serving domestic and international high-net-worth investors with state-of-the-art architectural presentations.'}
              </p>
            </div>
            <Link to="/contact" className="btn-partner-cta">
              <i className="bi bi-briefcase"></i>
              <span>{isRtl ? 'تواصل مع إدارة الشراكات' : 'Corporate Relations'}</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
