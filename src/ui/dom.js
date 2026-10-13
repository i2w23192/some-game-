// Minimal DOM helpers for the menu layer.

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

// Focusable button. `data-f` marks it for keyboard / gamepad navigation.
export function btn(label, onClick, cls = '', extra = {}) {
  return h('button', { class: 'btn ' + cls, 'data-f': true, onclick: onClick, ...extra }, label);
}

export function icon(url, cls = 'ico') {
  return h('img', { class: cls, src: url, alt: '', draggable: 'false' });
}
