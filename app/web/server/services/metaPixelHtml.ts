const META_PIXEL_HEAD_START = "<!-- PartnerHub Meta Pixel: head:start -->";
const META_PIXEL_HEAD_END = "<!-- PartnerHub Meta Pixel: head:end -->";
const META_PIXEL_BODY_START = "<!-- PartnerHub Meta Pixel: body:start -->";
const META_PIXEL_BODY_END = "<!-- PartnerHub Meta Pixel: body:end -->";

const managedHeadBlockPattern = new RegExp(
  `${META_PIXEL_HEAD_START}[\\s\\S]*?${META_PIXEL_HEAD_END}\\s*`,
  "g"
);
const managedBodyBlockPattern = new RegExp(
  `${META_PIXEL_BODY_START}[\\s\\S]*?${META_PIXEL_BODY_END}\\s*`,
  "g"
);

export const metaPixelIdPattern = /^\d{5,32}$/;

function removeManagedMetaPixel(html: string) {
  return html.replace(managedHeadBlockPattern, "").replace(managedBodyBlockPattern, "");
}

function buildHeadBlock(pixelId: string) {
  return `${META_PIXEL_HEAD_START}
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
${META_PIXEL_HEAD_END}`;
}

function buildBodyBlock(pixelId: string) {
  return `${META_PIXEL_BODY_START}
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
alt=""
/></noscript>
${META_PIXEL_BODY_END}`;
}

export function applyMetaPixelToHtml(html: string, pixelId?: string) {
  const cleanHtml = removeManagedMetaPixel(html);
  if (!pixelId) return cleanHtml;

  if (!metaPixelIdPattern.test(pixelId)) {
    throw new Error("Meta Pixel ID must contain between 5 and 32 digits.");
  }

  if (!/<\/head>/i.test(cleanHtml) || !/<body(?:\s[^>]*)?>/i.test(cleanHtml)) {
    throw new Error("Generated template must contain closing head and opening body tags.");
  }

  return cleanHtml
    .replace(/<\/head>/i, `${buildHeadBlock(pixelId)}\n</head>`)
    .replace(/<body(?:\s[^>]*)?>/i, (openingBody) => `${openingBody}\n${buildBodyBlock(pixelId)}`);
}
