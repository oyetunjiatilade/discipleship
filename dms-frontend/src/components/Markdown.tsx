function escapeHtml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(t: string): string {
  return escapeHtml(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(
      /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" class="text-brand-500 underline">$1</a>'
    );
}

/** Minimal, XSS-safe markdown → HTML (escapes first, then whitelists our own tags). */
function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  let html = '';
  let inList = false;
  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,3}\s/.test(line)) {
      closeList();
      const level = (line.match(/^#+/) as RegExpMatchArray)[0].length;
      const size = level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm';
      html += `<h${level} class="mt-3 font-semibold text-gray-900 ${size}">${inline(line.replace(/^#+\s/, ''))}</h${level}>`;
    } else if (/^[-*]\s/.test(line)) {
      if (!inList) {
        html += '<ul class="mt-2 list-disc space-y-1 pl-5">';
        inList = true;
      }
      html += `<li>${inline(line.replace(/^[-*]\s/, ''))}</li>`;
    } else if (line === '') {
      closeList();
    } else {
      closeList();
      html += `<p class="mt-2 leading-relaxed">${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

export function Markdown({ source }: { source: string }) {
  return (
    <div
      className="text-sm text-gray-700"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
