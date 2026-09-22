import { useSettings } from '../../context/SettingsContext.jsx';
import './AgentCard.css';

const CURATED_AGENT_PORTRAITS = [
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&h=240&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&h=240&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=240&h=240&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&h=240&q=80',
];

function toWhatsAppUrl(phone, title, ref) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('01')) digits = `2${digits}`;
  if (digits.startsWith('0020')) digits = digits.slice(2);
  const text = encodeURIComponent(`Hello, I am inquiring about "${title || 'Property'}" (Ref: ${ref || ''}) on Darcom.`);
  return `https://wa.me/${digits}?text=${text}`;
}

export default function AgentCard({ agent, onInquire, propertyTitle = '', propertyRef = '' }) {
  const { t } = useSettings();
  if (!agent) return null;
  const wa = toWhatsAppUrl(agent.phone, propertyTitle, propertyRef);

  // Use curated portrait if photoUrl is null or picsum
  const hasPicsum = !agent.photoUrl || agent.photoUrl.includes('picsum.photos');
  const fallbackIndex = Math.abs((agent.id || 1) % CURATED_AGENT_PORTRAITS.length);
  const displayPhoto = hasPicsum ? CURATED_AGENT_PORTRAITS[fallbackIndex] : agent.photoUrl;

  return (
    <section className="agent-card-luxury" aria-label="Listing agent">
      <div className="agent-header-row">
        <div className="agent-avatar-wrap">
          <img
            src={displayPhoto}
            alt={agent.name}
            loading="lazy"
            className="agent-portrait"
            onError={(e) => {
              e.target.src = CURATED_AGENT_PORTRAITS[0];
            }}
          />
          <span className="agent-online-beacon" title="Advisor is Online"></span>
        </div>

        <div className="agent-info-meta">
          <span className="agent-role-tag">{t('detailsPage.advisorTitle', 'Senior Property Advisor')}</span>
          <strong className="agent-fullname">{agent.name}</strong>
          <span className="agent-sub-title">{agent.title || t('detailsPage.advisorRole', 'Luxury Coastal Specialist')}</span>
          {agent.isVerified && (
            <span className="agent-verified-pill">
              <i className="bi bi-shield-fill-check me-1"></i>
              <span>{t('detailsPage.verifiedAgent', 'Darcom Verified Partner')}</span>
            </span>
          )}
        </div>
      </div>

      <div className="agent-action-buttons">
        {wa && (
          <a
            className="btn-agent-action whatsapp"
            href={wa}
            target="_blank"
            rel="noreferrer"
            title="Chat directly with advisor on WhatsApp"
          >
            <i className="bi bi-whatsapp me-1"></i>
            <span>WhatsApp</span>
          </a>
        )}

        {agent.phone && (
          <a
            className="btn-agent-action call"
            href={`tel:${agent.phone}`}
            title="Call advisor directly"
          >
            <i className="bi bi-telephone-fill me-1"></i>
            <span>{t('detailsPage.call', 'Call')}</span>
          </a>
        )}

        <button
          type="button"
          className="btn-agent-action inquire"
          onClick={onInquire}
          title="Send a written inquiry"
        >
          <i className="bi bi-envelope me-1"></i>
          <span>{t('detailsPage.inquire', 'Inquire')}</span>
        </button>
      </div>
    </section>
  );
}
