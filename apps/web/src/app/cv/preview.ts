function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

export function markdownPreview(md: string): string {
  const out: string[] = [];
  let inList = false;
  const close = (): void => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  for (const raw of md.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { close(); continue; }
    const h1 = line.match(/^#\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    if (h1) { close(); out.push(`<h1>${escapeHtml(h1[1])}</h1>`); continue; }
    if (h2) { close(); out.push(`<h2>${escapeHtml(h2[1])}</h2>`); continue; }
    if (h3) { close(); out.push(`<h3>${escapeHtml(h3[1])}</h3>`); continue; }
    if (li) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(escapeHtml(li[1]))}</li>`);
      continue;
    }
    close();
    out.push(`<p>${inline(escapeHtml(line))}</p>`);
  }
  close();
  return out.join('\n');
}

function inline(s: string): string {
  let v = s;
  v = v.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  v = v.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return v;
}
