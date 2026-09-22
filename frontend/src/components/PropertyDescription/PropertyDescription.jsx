import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import './PropertyDescription.css';

const PREVIEW = 600;

export default function PropertyDescription({ property }) {
  const { t } = useSettings();
  const [expanded, setExpanded] = useState(false);
  const text = property.description || '';
  if (!text) return null;

  const long = text.length > PREVIEW;
  const shown = !long || expanded ? text : `${text.slice(0, PREVIEW).trimEnd()}…`;

  return (
    <section className="prop-section" aria-label="Description">
      <h2>{t('detailsPage.overview', 'About this property')}</h2>
      <p className="prop-description">{shown}</p>
      {long && (
        <button type="button" className="read-more" onClick={() => setExpanded((e) => !e)}>
          {expanded ? t('detailsPage.showLess', 'Show less') : t('detailsPage.readMore', 'Read more')}
          <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'} ms-1`}></i>
        </button>
      )}
    </section>
  );
}
