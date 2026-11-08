import { useSettings } from '../../context/SettingsContext.jsx';
import './WhatsAppButton.css';

export default function WhatsAppButton() {
  const { isRtl } = useSettings();

  const phone = '201001234500';
  const message = isRtl
    ? 'مرحباً داركم، محتاج مساعدة أو استفسار عن شاليهات ووحدات الساحل الشمالي.'
    : 'Hello Darcom, I need assistance regarding North Coast chalets and properties.';

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <aside className="darcom-floating-whatsapp-wrap" aria-label="WhatsApp Support">
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="darcom-floating-whatsapp-btn"
        title={isRtl ? 'تحدث معنا مباشرة عبر واتساب' : 'Chat with us on WhatsApp'}
      >
        <span className="wa-pulse-ring" aria-hidden="true"></span>
        <i className="bi bi-whatsapp wa-icon" aria-hidden="true"></i>
        <span className="wa-label">
          {isRtl ? 'محتاج مساعدة؟ تواصل واتساب' : 'Need help? Chat with us'}
        </span>
      </a>
    </aside>
  );
}

