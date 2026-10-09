import { useEffect } from 'react';

function upsertMeta(name, content) {
  if (!content) return;

  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertProperty(property, content) {
  if (!content) return;

  let element = document.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertCanonical(href) {
  if (!href) return;

  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

export default function useDocumentMeta({
  title,
  description,
  canonicalPath,
  image,
  robots = 'index,follow',
  structuredData,
}) {
  const structuredDataJson = structuredData
    ? JSON.stringify(structuredData)
    : '';

  useEffect(() => {
    const previousTitle = document.title;
    const origin = window.location.origin;

    if (title) document.title = title;
    upsertMeta('description', description);
    upsertMeta('robots', robots);
    upsertProperty('og:type', 'website');
    upsertProperty('og:site_name', 'Bricky');
    upsertProperty('og:title', title);
    upsertProperty('og:description', description);
    upsertProperty(
      'og:url',
      canonicalPath ? `${origin}${canonicalPath}` : window.location.href,
    );
    upsertProperty(
      'og:image',
      image ? new URL(image, origin).href : `${origin}/bricky-mark.svg`,
    );
    upsertMeta('twitter:card', 'summary_large_image');
    upsertCanonical(
      canonicalPath ? `${origin}${canonicalPath}` : window.location.href,
    );

    let jsonLd = document.getElementById('bricky-structured-data');
    if (structuredDataJson) {
      if (!jsonLd) {
        jsonLd = document.createElement('script');
        jsonLd.id = 'bricky-structured-data';
        jsonLd.type = 'application/ld+json';
        document.head.appendChild(jsonLd);
      }
      jsonLd.textContent = structuredDataJson;
    } else {
      jsonLd?.remove();
    }

    document.documentElement.lang = 'bg';

    return () => {
      document.title = previousTitle;
    };
  }, [canonicalPath, description, image, robots, structuredDataJson, title]);
}
