import { useEffect } from 'react';

// Per-page SEO: title + meta description + Open Graph + canonical + JSON-LD.
// Details pages pass property data for unique metadata and RealEstateListing schema.
export function useSeo({ title, description, image, canonical, jsonLd, type = 'website' }) {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (selector, attr, value) => {
      if (!value) return;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        const [k, v] = attr.includes(':') ? ['property', attr] : ['name', attr];
        el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('meta[name="description"]', 'description', description);
    setMeta('meta[property="og:title"]', 'og:title', title);
    setMeta('meta[property="og:description"]', 'og:description', description);
    setMeta('meta[property="og:image"]', 'og:image', image);
    setMeta('meta[property="og:type"]', 'og:type', type);

    let link = document.head.querySelector('link[rel="canonical"]');
    if (canonical) {
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    const SCRIPT_ID = 'darcom-jsonld';
    document.getElementById(SCRIPT_ID)?.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, image, canonical, jsonLd, type]);
}

export function propertyJsonLd(property, url) {
  if (!property) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: (property.description || '').slice(0, 300),
    url,
    image: (property.images || []).map((i) => i.url),
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address || undefined,
      addressLocality: property.location,
      addressRegion: property.city,
      addressCountry: 'EG',
    },
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: property.currency || 'EGP',
      availability: property.status === 'Sold' || property.status === 'Rented'
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
    },
  };
}
