export default function decorate(block) {
  const rows = [...block.children];
  const firstRow = rows[0];
  if (!firstRow) return;

  const cols = [...firstRow.children];
  block.classList.add(`columns-detail-${cols.length}-cols`);

  cols.forEach((col) => {
    // Detect the spec column: paragraphs shaped as "<strong>Label</strong>: value".
    const specParas = [...col.querySelectorAll(':scope > p')].filter(
      (p) => p.firstElementChild && p.firstElementChild.tagName === 'STRONG',
    );

    if (specParas.length >= 2) {
      col.classList.add('columns-detail-spec-col');
      specParas.forEach((p) => {
        const strong = p.querySelector('strong');
        const label = strong.textContent.trim();
        // Everything after the label (and its trailing colon) is the value.
        let value = p.textContent.slice(strong.textContent.length).trim();
        if (value.startsWith(':')) value = value.slice(1).trim();

        const item = document.createElement('div');
        item.className = 'columns-detail-spec';
        const labelEl = document.createElement('span');
        labelEl.className = 'columns-detail-spec-label';
        labelEl.textContent = label;
        const valueEl = document.createElement('span');
        valueEl.className = 'columns-detail-spec-value';
        valueEl.textContent = value;
        item.append(labelEl, valueEl);
        p.replaceWith(item);
      });
    } else {
      col.classList.add('columns-detail-content-col');
    }
  });
}
