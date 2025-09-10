export function sanitizeHtml(input: string): string {
  let html = String(input || '');
  try {
    // Normalize line endings and trim to avoid stray text nodes across SSR/CSR
    html = html.replace(/\r\n?/g, '\n');
    html = html.trim();
    // 1) Remove <script> tags entirely
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

    // 2) Remove dangerous tags entirely (object, embed, link, meta)
    html = html.replace(/<\/?(?:object|embed|link|meta)\b[^>]*>/gi, '');

    // 3) Sanitize iframes: only allow https src; drop srcdoc
    html = html.replace(/<iframe\b([^>]*)>/gi, (m, attrs) => {
      // remove srcdoc
      let a = attrs.replace(/\s+srcdoc=("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      // if src is not https, drop the entire tag opening
      const srcMatch = a.match(/\s+src=("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const srcVal = srcMatch ? (srcMatch[2] || srcMatch[3] || srcMatch[4] || '') : '';
      if (srcVal && !/^https:\/\//i.test(srcVal)) {
        return '<iframe>'; // will likely be invalid without src and can be ignored by browser
      }
      return `<iframe${a}>`;
    });

    // 4) Remove all on* event handler attributes
    html = html.replace(/\s+on[a-z]+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    // 5) Neutralize javascript: URLs in href/src
    html = html.replace(/\s+(href|src)=("[^"]*"|'[^']*'|[^\s>]+)/gi, (m, attr, val) => {
      const raw = String(val);
      const unq = raw.replace(/^['"]|['"]$/g, '');
      if (/^\s*javascript:/i.test(unq)) {
        return ` ${attr}="#"`;
      }
      return m;
    });

    // 6) Remove style attributes containing url()
    html = html.replace(/\s+style=("[^"]*"|'[^']*')/gi, (m, q) => {
      const content = q.slice(1, -1);
      if (/url\s*\(/i.test(content)) return '';
      return m;
    });

    // Final normalize/trim again after mutations
    html = html.replace(/\r\n?/g, '\n').trim();
    return html;
  } catch {
    return String(input || '');
  }
}
