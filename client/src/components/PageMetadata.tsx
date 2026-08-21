import { useEffect } from "react";

type PageMetadataProps = {
  title: string;
  description: string;
  noIndex?: boolean;
};

function setMeta(name: string, content: string, property = false) {
  const attribute = property ? "property" : "name";
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${name}"]`
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function PageMetadata({
  title,
  description,
  noIndex = false,
}: PageMetadataProps) {
  useEffect(() => {
    const fullTitle = `${title} | Virtus`;
    const canonical = `${window.location.origin}${window.location.pathname}`;
    document.title = fullTitle;
    setMeta("description", description);
    setMeta("robots", noIndex ? "noindex, nofollow" : "index, follow");
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:type", "website", true);
    setMeta("og:url", canonical, true);
    setMeta("twitter:card", "summary");

    let link = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
  }, [description, noIndex, title]);

  return null;
}
