import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import './Terms.css';

export default function Terms() {
  const { t, isRtl } = useSettings();

  useSeo({
    title: `${isRtl ? 'شروط وأحكام الخدمة' : 'Terms of Service'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'شروط وأحكام استخدام منصة داركم للوساطة والاستشارات العقارية في جمهورية مصر العربية.'
      : 'Terms and Conditions governing the use of Darcom Real Estate brokerage and digital platform in Egypt.',
  });

  const breadcrumbItems = [
    { label: t('nav.home', isRtl ? 'الرئيسية' : 'Home'), to: '/' },
    { label: isRtl ? 'شروط الخدمة' : 'Terms of Service' },
  ];

  const sections = [
    {
      id: 'scope',
      number: '01',
      title: isRtl ? 'نطاق الخدمات والصفة القانونية' : 'Scope of Services & Regulatory Status',
      content: isRtl
        ? 'منصة داركم هي منصة رقمية واستشارية عقارية مرخصة رسمياً لممارسة أعمال الوساطة والتسويق العقاري في جمهورية مصر العربية. تتيح المنصة للمشترين والمستثمرين استعراض أفخم الوحدات الساحلية والسكنية والاستثمارية، كما تتيح للملاك والمطورين المعتمدين عرض وحداتهم ضمن شبكة النخبة العقارية وفقاً للقوانين المصرية المنظمة.'
        : 'Darcom is a licensed digital real estate brokerage and advisory platform operating within the Arab Republic of Egypt. The platform connects discerning private buyers and investors with verified coastal, residential, and investment inventory, while enabling accredited owners and developers to market prime properties in compliance with Egyptian statutory real estate regulations.',
    },
    {
      id: 'eligibility',
      number: '02',
      title: isRtl ? 'شروط الأهلية واستخدام الحساب' : 'Eligibility & Account Obligations',
      content: isRtl
        ? 'يشترط لاستخدام المنصة وإنشاء حساب خاص أن يكون المستخدم قد بلغ السن القانوني للأهلية المدنية (21 عاماً)، ويمتلك الصفة القانونية لإبرام العقود والمعاملات العقارية. يلتزم المستخدم بالحفاظ على سرية بيانات حسابه وكلمة المرور، ويتحمل كامل المسؤولية عن كافة العمليات والطلبات التي تتم من خلال حسابه.'
        : 'Use of the platform and creation of a Private Account requires that users possess full legal contractual capacity under applicable laws (minimum age 21). Users are strictly responsible for maintaining credential confidentiality and assume comprehensive responsibility for transactions and inquiries initiated under their credentials.',
    },
    {
      id: 'listings',
      number: '03',
      title: isRtl ? 'دقة بيانات العقارات والأسعار' : 'Listing Integrity & Market Pricing',
      content: isRtl
        ? 'تبذل داركم أقصى درجات العناية والفحص المسبق للتحقق من صحة بيانات وسندات ملكية الوحدات المعروضة وأسعارها وخطط سدادها. ومع ذلك، فإن الأسعار ومدد التسليم وشروط التقسيط قد تخضع لتحديثات دورية معتمدة من المطورين العقاريين، ويتم تثبيت السعر النهائي وخطة الأقساط حصرياً في استمارة الحجز الرسمية وسند التخصيص التعاقدي.'
        : 'Darcom exercises rigorous due diligence to verify property specifications, documentation, and pricing schedules prior to presentation. Nonetheless, price schedules and installment structures remain subject to developer-authorized adjustments until formally locked and executed within official reservation orders and allocation contracts.',
    },
    {
      id: 'reservation',
      number: '04',
      title: isRtl ? 'إجراءات الحجز المبدئي وجدية التعاقد' : 'Reservation Deposits & Transaction Protocol',
      content: isRtl
        ? 'عند تقديم طلب حجز لوحدة عقارية عبر المنصة، يتم تحويل الدفعة المبدئية لحسابات وسيطة معتمدة أو مباشرة للمطور العقاري المعتمد بموجب إيصال استلام موثق. تحدد شروط الاسترداد أو الإلغاء بدقة في استمارة حجز كل مشروع وقوانين حماية المستهلك المعمول بها في مصر.'
        : 'Upon submitting a reservation for an estate or chalet, commitment fees are routed directly into audited escrow channels or direct developer accounts accompanied by certified receipts. Refund, modification, or cancellation parameters are explicitly stipulated within project-specific reservation documentation and Egyptian consumer protection laws.',
    },
    {
      id: 'sellers',
      number: '05',
      title: isRtl ? 'التزامات الملاك والمعلنين (بيع عقارك)' : 'Owner & Seller Covenants',
      content: isRtl
        ? 'عند طلب عرض عقار للبيع عبر خدمة "اعرض عقارك مع داركم"، يقر المالك بصحة كافة المستندات والتراخيص وسندات الملكية وخلو العقار من أي نزاعات قضائية أو موانع قانونية للتصرف. تحتفظ داركم بالحق الكامل في رفض أو إزالة أي إعلان لا يستوفي معايير الفحص والتوثيق القانوني الخاصة بنا.'
        : 'When listing a residence through "Sell with Us", the seller warrants full legal title, complete regulatory compliance, and absence of undisclosed encumbrances, liens, or ongoing litigation. Darcom reserves the unrestricted prerogative to decline or withdraw any submission failing our legal due diligence benchmarks.',
    },
    {
      id: 'ip',
      number: '06',
      title: isRtl ? 'حقوق الملكية الفكرية والعلامة التجارية' : 'Intellectual Property Rights',
      content: isRtl
        ? 'كافة العلامات التجارية، التصاميم المعمارية الرقمية، الصور الفوتوغرافية، الأكواد البرمجية، والمحتوى النصي والتحليلي المنشور على منصة داركم هو ملكية حصرية لشركة داركم العقارية أو مرخص لها، ويحظر استنساخها أو إعادة استخدامها تجارياً دون موافقة خطية مسبقة.'
        : 'All trade names, digital brand assets, architectural photography, proprietary software architecture, and analytical market reports hosted on the Darcom platform represent protected intellectual property of Darcom Real Estate. Reproduction or redistribution without explicit written authorization is strictly prohibited.',
    },
    {
      id: 'jurisdiction',
      number: '07',
      title: isRtl ? 'إخلاء المسؤولية والقانون الحاكم والاختصاص القضائي' : 'Disclaimers & Governing Law',
      content: isRtl
        ? 'تخضع هذه الشروط والأحكام وتفسر وفقاً للقوانين واللوائح السارية في جمهورية مصر العربية. وتختص المحاكم المصرية المختصة بالقاهرة حصرياً بنظر أي نزاع قد ينشأ عن أو يتعلق باستخدام هذه المنصة أو الخدمات المقدمة من خلالها.'
        : 'These Terms of Service are governed by and construed in accordance with the laws of the Arab Republic of Egypt. The competent courts of Cairo hold exclusive jurisdiction over any controversy, claim, or dispute arising from the use of the platform or its brokerage advisory engagements.',
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
            <i className="bi bi-file-earmark-text-fill text-gold"></i>
            <span>{isRtl ? 'الاتفاقية الرسمية المنظمة · شروط الاستخدام' : 'Official Operating Agreement · Terms of Use'}</span>
          </div>
          <h1 className="legal-title">
            {isRtl ? 'شروط وأحكام استخدام منصة داركم' : 'Darcom Terms of Service & Brokerage Agreement'}
          </h1>
          <p className="legal-subtitle">
            {isRtl
              ? 'تحدد هذه الاتفاقية الإطار القانوني والتنظيمي لاستخدام منصة داركم العقارية الرقمية وخدمات الوساطة والاستشارات لكبار العملاء والمستثمرين.'
              : 'This Agreement establishes the statutory and operational parameters governing the use of Darcom’s digital real estate marketplace and concierge advisory services.'}
          </p>

          <div className="legal-meta-strip">
            <div className="meta-pill">
              <i className="bi bi-calendar3"></i>
              <span>{isRtl ? 'تاريخ السريان: سبتمبر 2026' : 'Effective Date: September 2026'}</span>
            </div>
            <div className="meta-pill">
              <i className="bi bi-building-check text-gold"></i>
              <span>{isRtl ? 'وساطة واستشارات عقارية مرخصة' : 'Fully Licensed Real Estate Brokerage'}</span>
            </div>
            <div className="meta-pill">
              <i className="bi bi-geo-alt-fill"></i>
              <span>{isRtl ? 'الاختصاص القضائي: محاكم القاهرة، مصر' : 'Jurisdiction: Cairo Courts, Egypt'}</span>
            </div>
          </div>
        </header>

        {/* Main Grid Layout: Quick Navigation + Legal Content */}
        <div className="legal-grid-layout">
          {/* Aside Quick-Nav */}
          <aside className="legal-aside-nav">
            <div className="aside-nav-card">
              <h3 className="aside-nav-title">
                <i className="bi bi-list-check me-2"></i>
                {isRtl ? 'بنود الاتفاقية' : 'Agreement Clauses'}
              </h3>
              <nav className="aside-nav-list" aria-label="Terms sections">
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
                <i className="bi bi-shield-check help-icon"></i>
                <div>
                  <h4 className="help-title">{isRtl ? 'الدائرة القانونية' : 'Legal Advisory Bureau'}</h4>
                  <p className="help-desc">{isRtl ? 'استشارات العقود وتوثيق الملكية' : 'Contract & title deed due diligence'}</p>
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
                <i className="bi bi-exclamation-octagon-fill"></i>
              </div>
              <div className="notice-text">
                <strong>{isRtl ? 'إشعار المعاملات الرسمية:' : 'Official Transaction Advisory:'}</strong>
                <p>
                  {isRtl
                    ? 'تؤكد داركم أن كافة التعاقدات النهائية وعمليات نقل الملكية وسندات استلام الوحدات تتم وفقاً للإجراءات القانونية المعتمدة والتسجيل العقاري الرسمي المعمول به في جمهورية مصر العربية.'
                    : 'Darcom emphasizes that all final purchase conveyances, title deeds, and property handover covenants are executed under certified statutory procedures and official Egyptian real estate registry requirements.'}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
