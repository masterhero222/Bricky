import { useEffect } from "react";

function upsertMeta(name, content) {
  if (!content) return;

  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertCanonical(href) {
  if (!href) return;

  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

export default function useDocumentMeta({ title, description, canonicalPath }) {
  useEffect(() => {
    const previousTitle = document.title;
    const origin = window.location.origin;

    if (title) document.title = title;
    upsertMeta("description", description);
    upsertCanonical(canonicalPath ? `${origin}${canonicalPath}` : window.location.href);

    document.documentElement.lang = "bg";

    return () => {
      document.title = previousTitle;
    };
  }, [canonicalPath, description, title]);
}
