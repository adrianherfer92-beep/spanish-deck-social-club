// Imagen para compartir subida al CDN del proyecto (ver src/assets/og-timba.jpg.asset.json).
const OG_PATH = "/__l5e/assets-v1/0303ed36-7407-48f2-bc7a-e10a8707e2ba/og-timba.jpg";
/** Meta etiquetas de imagen para compartir (requieren URL absoluta https). */
export function ogImageMeta(origin: string | undefined) {
  if (!origin || !origin.startsWith("https://")) return [];
  const url = origin + OG_PATH;
  return [
    { property: "og:image", content: url },
    { name: "twitter:image", content: url },
  ];
}
