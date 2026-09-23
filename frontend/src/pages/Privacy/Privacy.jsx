import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import './Privacy.css';

export default function Privacy() {
  const { t, isRtl } = useSettings();

  useSeo({
    title: `${isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'سياسة الخصوصية وحماية بيانات العملاء والمستثمرين في منصة داركم العقارية وفقاً للقانون المصري رقم 151 لسنة 2020.'
      : 'Privacy Policy and client data protection at Darcom Real Estate compliant with Egyptian Data Protection Law No. 151/2020.',
  });

  const breadcrumbItems = [
    { label: t('nav.home', isRtl ? 'الرئيسية' : 'Home'), to: '/' },
    { label: isRtl ? 'سياسة الخصوصية' : 'Privacy Policy' },
  ];

  const sections = [
    {
      id: 'collection',
      number: '01',
      title: isRtl ? 'جمع المعلومات والبيانات الشخصية' : 'Personal Data We Collect',
      content: isRtl
        ? 'نقوم بجمع البيانات الضرورية لتقديم خدمات الوساطة والاستشارات العقارية الفاخرة بأعلى معايير الدقة، وتشمل: الاسم الثلاثي، معلومات الاتصال (رقم الهاتف والبريد الإلكتروني)، تفضيلات البحث والاستثمار العقاري، بالإضافة إلى بيانات الملكية عند عرض عقار للبيع عبر دائرتنا الخاصة. نلتزم بعدم جمع أي بيانات دون موافقتك الصريحة والمستنيرة.'
        : 'We collect information strictly necessary to provide premier real estate brokerage and advisory services. This includes: full name, contact details (phone number, email address), property preferences and investment criteria, as well as ownership documentation when listing a residence through our Private Circle. We never collect personal data without your explicit, informed consent.',
    },
    {
      id: 'purpose',
      number: '02',
      title: isRtl ? 'أغراض استخدام ومعالجة البيانات' : 'Purposes of Data Processing',
      content: isRtl
        ? 'تُستخدم بياناتك للأغراض التالية فقط: تخصيص عروض العقارات المناسبة لاحتياجاتك، تنسيق مواعيد المعاينات الخاصة مع مسؤولي المشاريع والمطورين المعتمدين، إتمام إجراءات الحجز المبدئي وسندات التخصيص، والتواصل الدوري معك بخصوص المستجدات الاستثمارية التي وافقت على تلقيها.'
        : 'Your information is utilized solely for legitimate business purposes: tailoring residence selections to your investment profile, scheduling private VIP viewings with accredited developer concierges, facilitating reservation deposits and allocation agreements, and dispatching approved updates regarding portfolio releases.',
    },
    {
      id: 'security',
      number: '03',
      title: isRtl ? 'السرية التامة والأمان التقني' : 'Confidentiality & Technical Security',
      content: isRtl
        ? 'تطبق داركم بروتوكولات تشفير مصرفية متقدمة (AES-256 و SSL/TLS) لحماية بيانات الملاك والمستثمرين من أي وصول غير مصرح به أو تسريب. كافة السجلات المالية والاستثمارية مشفرة ومحفوظة في خوادم سحابية آمنة تخضع لرقابة دورية وفحص أمني مستقل.'
        : 'Darcom applies banking-grade encryption protocols (AES-256 and SSL/TLS) to safeguard owner and investor intelligence from unauthorized access, interception, or disclosure. All financial credentials and transactional registries reside on hardened cloud environments subject to recurring independent security audits.',
    },
    {
      id: 'disclosure',
      number: '04',
      title: isRtl ? 'مشاركة البيانات مع الجهات المصرح لها' : 'Authorized Third-Party Sharing',
      content: isRtl
        ? 'نحن لا نبيع ولا نؤجر بياناتك لأي أطراف تجارية أو إعلانية خارجية إطلاقاً. تتم مشاركة بياناتك الأساسية فقط مع: المطورين العقاريين المعتمدين عند تأكيد طلبك لحجز وحدة، والجهات القانونية أو التنظيمية الرسمية في جمهورية مصر العربية عند وجود إلزام قانوني صريح بذلك.'
        : 'We do not sell, license, or monetize your personal data to advertising networks or third-party marketers under any circumstances. Limited disclosures occur exclusively with: verified master developers upon your confirmed request to reserve a property, and statutory regulatory bodies within the Arab Republic of Egypt where legally mandated.',
    },
    {
      id: 'rights',
      number: '05',
      title: isRtl ? 'حقوق العميل والتحكم في البيانات' : 'Your Statutory Rights',
      content: isRtl
        ? 'وفقاً لأحكام قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020، يحق لك في أي وقت: طلب نسخة كاملة من بياناتك المحفوظة لدينا، تصحيح أو تحديث أي بيانات غير دقيقة، طلب حذف حسابك وبياناتك نهائياً من سجلاتنا، أو سحب موافقتك على تلقي المراسلات الاستشارية.'
        : 'In accordance with Egyptian Personal Data Protection Law No. 151 of 2020, you retain full rights to: access a copy of your stored records, rectify or update incomplete information, request permanent deletion of your profile and data footprint, or revoke consent to receiving advisory communications at any moment.',
    },
    {
      id: 'cookies',
      number: '06',
      title: isRtl ? 'ملفات تعريف الارتباط وتفضيلات التصفح' : 'Cookies & Device Analytics',
      content: isRtl
        ? 'تستخدم منصة داركم ملفات تعريف ارتباط وظيفية خفيفة لحفظ تفضيلات اللغة (العربية/الإنجليزية) وحفظ العقارات المفضلة في جلستك. لا نستخدم ملفات تتبع تجسسية خارجية تتبع نشاطك خارج منصتنا.'
        : 'The Darcom platform employs essential functional cookies to remember your language selection (Arabic/English) and persist your curated residence shortlists across sessions. We do not deploy intrusive third-party cross-site trackers.',
    },
    {
      id: 'contact-dpo',
      number: '07',
      title: isRtl ? 'مسؤول حماية البيانات والاتصال القانوني' : 'Data Protection Officer Contact',
      content: isRtl
        ? 'إذا كان لديك أي سؤال أو استفسار بخصوص سياسة الخصوصية، أو رغبت في ممارسة أي من حقوقك القانونية، يسعد فريق الامتثال القانوني وحماية البيانات بداركم استقبال طلبك عبر البريد الرسمي المخصص: legal@darcom.eg أو بزيارة مقرنا بالتجمع الخامس، القاهرة الجديدة.'
        : 'For inquiries concerning this Privacy Policy, or to exercise your statutory rights regarding data privacy, our legal compliance and Data Protection Officer is reachable directly at legal@darcom.eg or at our corporate office in the Fifth Settlement, New Cairo.',
    },
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="darcom-legal-page">
      <div className="container">
        {/* Breadcrumbs */}
        <div className="legal-breadcrumb-wrap">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* Hero Header */}
        <header className="legal-header">
          <div className="legal-badge">
            <i className="bi bi-shield-lock-fill text-gold"></i>
            <span>{isRtl ? 'الوثائق القانونية الرسمية · حماية البيانات' : 'Official Legal Documentation · Privacy'}</span>
          </div>
          <h1 className="legal-title">
            {isRtl ? 'سياسة الخصوصية وحماية بيانات العملاء' : 'Client Privacy & Data Protection Policy'}
          </h1>
          <p className="legal-subtitle">
            {isRtl
              ? 'تلتزم منصة داركم العقارية بحماية سرية وأمن البيانات الشخصية لعملائنا ومستثمرينا وفقاً لأعلى المعايير التنظيمية والقانونية المصرية والدولية.'
              : 'Darcom Real Estate is committed to upholding the utmost confidentiality and security of our private clients and investors in accordance with statutory Egyptian and international frameworks.'}
          </p>

          <div className="legal-meta-strip">
            <div className="meta-pill">
              <i className="bi bi-calendar3"></i>
              <span>{isRtl ? 'آخر تحديث: سبتمبر 2026' : 'Last Updated: September 2026'}</span>
            </div>
            <div className="meta-pill">
              <i className="bi bi-patch-check-fill text-gold"></i>
              <span>{isRtl ? 'مطابق للقانون المصري رقم 151 لسنة 2020' : 'Compliant with Egyptian Law No. 151/2020'}</span>
            </div>
            <div className="meta-pill">
              <i className="bi bi-lock-fill"></i>
              <span>{isRtl ? 'تشفير مصرفي AES-256 معتمد' : 'Verified AES-256 Encryption'}</span>
            </div>
          </div>
        </header>

        {/* Main Grid Layout: Quick Navigation + Legal Content */}
        <div className="legal-grid-layout">
          {/* Aside Quick-Nav */}
          <aside className="legal-aside-nav">
            <div className="aside-nav-card">
              <h3 className="aside-nav-title">
                <i className="bi bi-list-nested me-2"></i>
                {isRtl ? 'فهرس البنود' : 'Table of Contents'}
              </h3>
              <nav className="aside-nav-list" aria-label="Privacy sections">
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className="aside-nav-item"
                  >
                    <span className="aside-nav-num">{sec.number}</span>
                    <span className="aside-nav-label">{sec.title}</span>
                  </button>
                ))}
              </nav>

              <div className="aside-help-box">
                <i className="bi bi-headset help-icon"></i>
                <div>
                  <h4 className="help-title">{isRtl ? 'مكتب الامتثال القانوني' : 'Legal Compliance Desk'}</h4>
                  <p className="help-desc">{isRtl ? 'جاهزون للرد على استفساراتكم' : 'Direct channel for data inquiries'}</p>
                  <a href="mailto:legal@darcom.eg" className="help-link">legal@darcom.eg</a>
                </div>
              </div>
            </div>
          </aside>

          {/* Core Content Body */}
          <main className="legal-body-panel">
            {sections.map((sec) => (
              <section key={sec.id} id={sec.id} className="legal-clause-block">
                <div className="clause-header">
                  <span className="clause-number-badge">{sec.number}</span>
                  <h2 className="clause-title">{sec.title}</h2>
                </div>
                <div className="clause-content">
                  <p>{sec.content}</p>
                </div>
              </section>
            ))}

            {/* Bottom Official Disclaimer Box */}
            <div className="legal-notice-box">
              <div className="notice-icon-circle">
                <i className="bi bi-info-circle-fill"></i>
              </div>
              <div className="notice-text">
                <strong>{isRtl ? 'إشعار التعديلات والتحديثات:' : 'Policy Revisions Notice:'}</strong>
                <p>
                  {isRtl
                    ? 'تحتفظ داركم بالحق في تحديث سياسة الخصوصية بما يتماشى مع التطورات التنظيمية والتشريعية في مصر. يتم إشعار العملاء المسجلين بأي تعديلات جوهرية عبر البريد الإلكتروني.'
                    : 'Darcom reserves the right to amend this Privacy Policy to reflect regulatory evolutions within Egypt. Registered clients will be notified of material changes via their registered email address.'}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
