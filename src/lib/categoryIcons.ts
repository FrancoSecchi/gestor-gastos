import { getSetting, setSetting } from './db';

const KEY = 'category_icons';

export const DEFAULT_ICONS: Record<string, string> = {
  'Vivienda': '🏠',
  'Comida': '🍔',
  'Transporte': '🚌',
  'Salud': '💊',
  'Entretenimiento': '🎮',
  'Ropa': '👕',
  'Salidas': '🍻',
  'Ahorro': '🐷',
  'Inversión': '📈',
  'Otros gastos': '📦',
  'Salario': '💼',
  'Freelance': '💻',
  'Inversiones': '📊',
  'Otros ingresos': '💵',
};

export const FALLBACK_ICON = '💳';

export const ICON_CATALOG: { group: string; icons: string[] }[] = [
  {
    group: 'Hogar',
    icons: ['🏠', '🏡', '🏢', '🔑', '🛋️', '🪴', '💡', '🚿', '🧹', '🧺', '🪟', '🛏️', '🏗️', '🔒'],
  },
  {
    group: 'Comida',
    icons: ['🍔', '🍕', '🥗', '🍣', '🥘', '🍳', '🛒', '🥦', '🥩', '🍱', '🥐', '☕', '🍜', '🥙', '🍷'],
  },
  {
    group: 'Transporte',
    icons: ['🚌', '🚗', '🚕', '✈️', '🚲', '🛵', '⛽', '🚇', '🚉', '🛺', '🚁', '🚢', '🛣️', '🅿️'],
  },
  {
    group: 'Salud',
    icons: ['💊', '🏥', '🩺', '🦷', '💉', '🧬', '👓', '🩹', '🧘', '🏃', '🧪', '🩻', '🫀', '🧠'],
  },
  {
    group: 'Entretenimiento',
    icons: ['🎮', '🎬', '🎵', '📺', '🎭', '🎯', '📚', '🎲', '🎸', '🎤', '🎨', '🏋️', '🎳', '🎪'],
  },
  {
    group: 'Ropa / Moda',
    icons: ['👕', '👗', '👠', '👟', '🧥', '👒', '👜', '💍', '🧣', '👔', '🧤', '👛', '🕶️', '⌚'],
  },
  {
    group: 'Salidas / Social',
    icons: ['🍻', '🍷', '🎉', '🥂', '🍸', '🪩', '🎊', '🍽️', '🥃', '🍾', '🎆', '🎇', '🎭', '🎟️'],
  },
  {
    group: 'Pagos / Finanzas',
    icons: ['💳', '💰', '🏦', '📊', '📈', '💵', '🏧', '📱', '🪙', '💶', '💷', '💸', '🧾', '📉'],
  },
  {
    group: 'Trabajo / Ingresos',
    icons: ['💼', '💻', '🖥️', '🖊️', '📋', '📎', '🗂️', '⚙️', '🔧', '📐', '🏭', '📦', '📬', '🤝'],
  },
  {
    group: 'Ahorro / Inversión',
    icons: ['🐷', '💰', '📦', '🎯', '💎', '🏆', '⭐', '🌟', '🔐', '🏅', '📈', '🏦', '🥇', '🎁'],
  },
  {
    group: 'Servicios',
    icons: ['💡', '📡', '🌐', '📺', '🔧', '🛠️', '🔌', '📶', '🖨️', '📠', '📲', '🔋', '💈', '🗑️'],
  },
  {
    group: 'Animales',
    icons: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐊', '🐸', '🐲', '🐉', '🦕', '🐳', '🐋', '🐬', '🦈', '🐟', '🐠', '🐡', '🦐', '🦞', '🦀', '🐙', '🦑', '🐚', '🦓', '🦍', '🐘', '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
  },
  {
    group: 'Otros',
    icons: ['📦', '❓', '🎁', '🔮', '🌈', '🐾', '🌿', '🔔', '📌', '🧩', '🦄', '🌸', '🍀', '⚡'],
  },
];

export async function loadCategoryIcons(): Promise<Record<string, string>> {
  try {
    const raw = await getSetting(KEY);
    if (!raw) return { ...DEFAULT_ICONS };
    const stored = JSON.parse(raw) as Record<string, string>;
    return { ...DEFAULT_ICONS, ...stored };
  } catch {
    return { ...DEFAULT_ICONS };
  }
}

export async function saveCategoryIcons(icons: Record<string, string>): Promise<void> {
  // Only persist overrides (entries that differ from defaults)
  const overrides: Record<string, string> = {};
  for (const [k, v] of Object.entries(icons)) {
    if (DEFAULT_ICONS[k] !== v) overrides[k] = v;
  }
  await setSetting(KEY, JSON.stringify(overrides));
}

export function getCategoryIcon(name: string, icons: Record<string, string>): string {
  return icons[name] ?? FALLBACK_ICON;
}
