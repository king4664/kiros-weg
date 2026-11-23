/** أيقونات SVG أصلية بسيطة، بتاخد لون الكلام اللي حواليها. */
const wrap = (body: string, size = 24): string =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  /** شمس طالعة من ورا الأفق */
  today: wrap(
    '<path d="M3 17.5h18"/><path d="M7 17.5a5 5 0 0 1 10 0"/><path d="M12 7.5v2"/><path d="M5.6 10.6l1.4 1.4"/><path d="M18.4 10.6 17 12"/><path d="M6 21h12" opacity=".55"/>',
  ),
  /** حلقتين سلسلة */
  links: wrap(
    '<path d="M10.2 13.8a3.6 3.6 0 0 0 5.1 0l3-3a3.6 3.6 0 0 0-5.1-5.1l-1.1 1.1"/><path d="M13.8 10.2a3.6 3.6 0 0 0-5.1 0l-3 3a3.6 3.6 0 0 0 5.1 5.1l1.1-1.1"/>',
  ),
  /** طريق متعرّج آخره علم */
  plan: wrap(
    '<path d="M4 20c3-1 2.5-4.5 6-5s5-2.5 4-6"/><circle cx="4" cy="20" r="1.2" fill="currentColor" stroke="none"/><path d="M14 9V3.5"/><path d="M14 3.8h5l-1.3 1.8L19 7.4h-5"/>',
  ),
  /** كارتين فوق بعض */
  words: wrap(
    '<rect x="7" y="3.5" width="13" height="15" rx="2.5"/><path d="M4.5 7v11a2.5 2.5 0 0 0 2.5 2.5h9"/><path d="M11 13.5l2.5-6 2.5 6"/><path d="M11.9 11.5h3.2"/>',
  ),
  /** نبتة صغيرة */
  progress: wrap(
    '<path d="M12 21v-8.5"/><path d="M12 13.5c0-3.5-2.5-6-6.5-6 0 3.5 2.5 6 6.5 6z"/><path d="M12 11c0-3.3 2.2-5.8 6-6-.2 3.6-2.4 6-6 6z"/><path d="M8 21h8"/>',
  ),
  /** مفاتيح تظبيط */
  settings: wrap(
    '<path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/><path d="M4 12h5"/><path d="M13 12h7"/><circle cx="11" cy="12" r="2" opacity=".55"/>',
  ),
  /** شمس فوق موج */
  brand: wrap(
    '<circle cx="12" cy="9.5" r="3.6"/><path d="M3 15.5c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/><path d="M5 19.5c1.4 0 1.4-1 2.8-1s1.4 1 2.8 1 1.4-1 2.8-1 1.4 1 2.8 1 1.4-1 2.8-1" opacity=".6"/>',
    26,
  ),
  /** بحر */
  sea: wrap(
    '<path d="M3 13.5h18" opacity=".5"/><circle cx="15.5" cy="9" r="2.6"/><path d="M3 17c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/>',
    28,
  ),
  /** جبال */
  mountains: wrap(
    '<path d="M2.5 19 9 9.5l3.2 4.6"/><path d="M8.5 19l6.5-9.5L21.5 19"/><path d="M2.5 19h19"/><path d="M4 15.5h5M14 16.5h6" opacity=".5"/>',
    28,
  ),
  /** نجمة فاضية */
  star: wrap('<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>', 22),
  /** نجمة مليانة */
  starFilled: wrap(
    '<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" fill="currentColor"/>',
    22,
  ),
  /** عدسة */
  search: wrap('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>', 20),
  /** جواب */
  mail: wrap('<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4.5 7l7.5 6 7.5-6"/>', 20),
  /** سماعة تليفون */
  phone: wrap(
    '<path d="M6.5 3.8h2.6l1.4 4.3-2 1.4a12 12 0 0 0 6 6l1.4-2 4.3 1.4v2.6a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 6a2 2 0 0 1 2-2.2z"/>',
    20,
  ),
  /** شاشة فيها زرار تشغيل */
  video: wrap(
    '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M10.2 9.3v5.4l4.6-2.7z" fill="currentColor"/>',
    22,
  ),
  /** ورقة مطوية */
  pdf: wrap('<path d="M7 3.5h7l4.5 4.5v12.5H7z"/><path d="M14 3.5V8h4.5"/><path d="M9.5 13h6M9.5 16.5h4.5"/>', 22),
  /** كورة أرضية */
  site: wrap(
    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5z"/>',
    22,
  ),
  /** سماعات */
  audio: wrap(
    '<path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3"/><rect x="3.5" y="14" width="4" height="6" rx="1.6"/><rect x="16.5" y="14" width="4" height="6" rx="1.6"/>',
    22,
  ),
  /** سهم لتحت */
  chevron: wrap('<path d="M7 10l5 5 5-5"/>', 20),
} as const;
