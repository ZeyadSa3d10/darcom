import { useState, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import './InstallmentCalculator.css';

export default function InstallmentCalculator({ propertyPrice = 0, propertyTitle = '', propertyRef = '', developer = '' }) {
  const { t, isRtl } = useSettings();

  const price = Number(propertyPrice) || 0;

  // Sliders State
  const [downPaymentPercent, setDownPaymentPercent] = useState(10);
  const [years, setYears] = useState(7);
  const [hasDeliveryPayment, setHasDeliveryPayment] = useState(true);
  const [deliveryPercent, setDeliveryPercent] = useState(10);

  // Financial Computations
  const calculations = useMemo(() => {
    if (price <= 0) {
      return {
        downPaymentAmount: 0,
        deliveryAmount: 0,
        remainingBalance: 0,
        monthlyPayment: 0,
        quarterlyPayment: 0,
        yearlyPayment: 0,
        totalQuarters: 28,
        totalMonths: 84,
      };
    }

    const downPaymentAmount = Math.round((price * downPaymentPercent) / 100);
    const deliveryAmount = hasDeliveryPayment ? Math.round((price * deliveryPercent) / 100) : 0;
    const remainingBalance = Math.max(0, price - downPaymentAmount - deliveryAmount);

    const totalMonths = Math.max(1, years * 12);
    const totalQuarters = Math.max(1, years * 4);

    const monthlyPayment = Math.round(remainingBalance / totalMonths);
    const quarterlyPayment = Math.round(remainingBalance / totalQuarters);
    const yearlyPayment = Math.round(remainingBalance / years);

    return {
      downPaymentAmount,
      deliveryAmount,
      remainingBalance,
      monthlyPayment,
      quarterlyPayment,
      yearlyPayment,
      totalQuarters,
      totalMonths,
    };
  }, [price, downPaymentPercent, years, hasDeliveryPayment, deliveryPercent]);

  // Construct WhatsApp inquiry link with specific customized payment plan
  const generateWhatsAppMessage = () => {
    const planText = isRtl
      ? `مرحباً، أود الاستفسار عن خطة سداد العقار: "${propertyTitle}" (كود: ${propertyRef || 'N/A'})\n` +
        `• السعر الإجمالي: ${price.toLocaleString()} ج.م\n` +
        `• المقدم: ${calculations.downPaymentAmount.toLocaleString()} ج.م (${downPaymentPercent}%)\n` +
        (hasDeliveryPayment ? `• دفعة الاستلام: ${calculations.deliveryAmount.toLocaleString()} ج.م (${deliveryPercent}%)\n` : '') +
        `• القسط الربع سنوي: ${calculations.quarterlyPayment.toLocaleString()} ج.م\n` +
        `• مدة التقسيط: ${years} سنوات (${calculations.totalQuarters} قسط)`
      : `Hello, I'm inquiring about the customized payment plan for "${propertyTitle}" (Ref: ${propertyRef || 'N/A'}):\n` +
        `• Total Price: ${price.toLocaleString()} EGP\n` +
        `• Down Payment: ${calculations.downPaymentAmount.toLocaleString()} EGP (${downPaymentPercent}%)\n` +
        (hasDeliveryPayment ? `• Handover Payment: ${calculations.deliveryAmount.toLocaleString()} EGP (${deliveryPercent}%)\n` : '') +
        `• Quarterly Installment: ${calculations.quarterlyPayment.toLocaleString()} EGP\n` +
        `• Duration: ${years} Years (${calculations.totalQuarters} installments)`;

    return `https://wa.me/201000000000?text=${encodeURIComponent(planText)}`;
  };

  if (price <= 0) return null;

  return (
    <div className="darcom-calc-card" id="installment-calculator">
      {/* Header */}
      <div className="calc-header">
        <div className="calc-header-badge">
          <i className="bi bi-calculator text-gold"></i>
          <span>{isRtl ? 'حاسبة الأقساط والتمويل' : 'Payment Plan & Mortgage Estimator'}</span>
        </div>
        <h3 className="calc-title">
          {isRtl ? 'حاسبة خطة السداد المرنة' : 'Tailored Payment Plan Calculator'}
        </h3>
        <p className="calc-subtitle">
          {isRtl
            ? 'احسب قيمة المقدم والأقساط ربع السنوية والشهرية وفق أنظمة السداد المعتمدة في السوق المصري.'
            : 'Customize your down payment percentage and tenure to calculate official quarterly and monthly obligations.'}
        </p>
      </div>

      <div className="calc-body-grid">
        {/* Controls Column */}
        <div className="calc-controls-col">
          {/* Slider 1: Down Payment */}
          <div className="calc-field-group">
            <div className="calc-field-header">
              <label htmlFor="down-payment-slider" className="calc-label">
                {isRtl ? 'نسبة المقدم' : 'Down Payment'}
              </label>
              <span className="calc-value-pill">
                {downPaymentPercent}% — <strong>{calculations.downPaymentAmount.toLocaleString()} EGP</strong>
              </span>
            </div>
            <input
              id="down-payment-slider"
              type="range"
              min="5"
              max="50"
              step="5"
              value={downPaymentPercent}
              onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
              className="calc-range-slider"
            />
            <div className="calc-slider-scale">
              <span>5%</span>
              <span>10%</span>
              <span>20%</span>
              <span>30%</span>
              <span>50%</span>
            </div>
          </div>

          {/* Slider 2: Duration in Years */}
          <div className="calc-field-group">
            <div className="calc-field-header">
              <label htmlFor="years-slider" className="calc-label">
                {isRtl ? 'فترة السداد' : 'Tenure Period'}
              </label>
              <span className="calc-value-pill">
                {years} {isRtl ? 'سنوات' : 'Years'} ({calculations.totalQuarters} {isRtl ? 'أقساط' : 'quarters'})
              </span>
            </div>
            <input
              id="years-slider"
              type="range"
              min="1"
              max="10"
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="calc-range-slider"
            />
            <div className="calc-slider-scale">
              <span>1 {isRtl ? 'سنة' : 'yr'}</span>
              <span>3 {isRtl ? 'سنوات' : 'yrs'}</span>
              <span>5 {isRtl ? 'سنوات' : 'yrs'}</span>
              <span>7 {isRtl ? 'سنوات' : 'yrs'}</span>
              <span>10 {isRtl ? 'سنوات' : 'yrs'}</span>
            </div>
          </div>

          {/* Handover / Delivery Payment Toggle */}
          <div className="calc-delivery-toggle">
            <label className="delivery-checkbox-label">
              <input
                type="checkbox"
                checked={hasDeliveryPayment}
                onChange={(e) => setHasDeliveryPayment(e.target.checked)}
                className="calc-checkbox"
              />
              <span>{isRtl ? 'تضمين دفعة استلام (Handover Payment)' : 'Include Handover / Delivery Payment'}</span>
            </label>

            {hasDeliveryPayment && (
              <div className="delivery-select-wrap">
                <select
                  value={deliveryPercent}
                  onChange={(e) => setDeliveryPercent(Number(e.target.value))}
                  className="delivery-select"
                  aria-label="Handover Payment Percentage"
                >
                  <option value={5}>5% ({((price * 5) / 100).toLocaleString()} EGP)</option>
                  <option value={10}>10% ({((price * 10) / 100).toLocaleString()} EGP)</option>
                  <option value={15}>15% ({((price * 15) / 100).toLocaleString()} EGP)</option>
                  <option value={20}>20% ({((price * 20) / 100).toLocaleString()} EGP)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Output Summary Column */}
        <div className="calc-summary-col">
          <div className="calc-summary-panel">
            <div className="summary-main-stat">
              <span className="summary-stat-label">
                {isRtl ? 'القسط ربع السنوي (المعيار المصري)' : 'Quarterly Installment (Egyptian Standard)'}
              </span>
              <strong className="summary-stat-amount">
                {calculations.quarterlyPayment.toLocaleString()}
                <span className="summary-currency"> EGP</span>
              </strong>
              <span className="summary-sub-monthly">
                {isRtl ? 'أو ما يعادل شهرياً:' : 'Equivalent monthly:'}{' '}
                <strong>{calculations.monthlyPayment.toLocaleString()} EGP / {isRtl ? 'شهر' : 'mo'}</strong>
              </span>
            </div>

            <div className="summary-breakdown-list">
              <div className="summary-row">
                <span className="s-label">{isRtl ? 'سعر الوحدة الإجمالي' : 'Total Unit Price'}</span>
                <span className="s-val">{price.toLocaleString()} EGP</span>
              </div>
              <div className="summary-row">
                <span className="s-label">{isRtl ? 'المقدم المطلوب' : 'Required Down Payment'}</span>
                <span className="s-val text-gold font-bold">
                  {calculations.downPaymentAmount.toLocaleString()} EGP ({downPaymentPercent}%)
                </span>
              </div>
              {hasDeliveryPayment && (
                <div className="summary-row">
                  <span className="s-label">{isRtl ? 'دفعة الاستلام' : 'Handover Delivery'}</span>
                  <span className="s-val">
                    {calculations.deliveryAmount.toLocaleString()} EGP ({deliveryPercent}%)
                  </span>
                </div>
              )}
              <div className="summary-row">
                <span className="s-label">{isRtl ? 'المبلغ المتبقي للتقسيط' : 'Financed Balance'}</span>
                <span className="s-val">{calculations.remainingBalance.toLocaleString()} EGP</span>
              </div>
              <div className="summary-row">
                <span className="s-label">{isRtl ? 'عدد الأقساط ربع السنوية' : 'Total Quarters'}</span>
                <span className="s-val">{calculations.totalQuarters} {isRtl ? 'أقساط' : 'Installments'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="calc-actions">
              <a
                href={generateWhatsAppMessage()}
                target="_blank"
                rel="noreferrer"
                className="btn-calc-whatsapp"
              >
                <i className="bi bi-whatsapp"></i>
                <span>{isRtl ? 'احجز واستفسر عن هذه الخطة عبر واتساب' : 'Apply for this Plan via WhatsApp'}</span>
              </a>
              <div className="calc-disclaimer">
                <i className="bi bi-shield-check"></i>
                <span>
                  {isRtl
                    ? 'الأرقام استرشادية وتخضع لشروط المطور العقاري وتوافر العروض الترويجية الحصرية بدون فوائد.'
                    : 'Estimates are indicative and subject to official developer terms and 0% interest promotional schemes.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
