import type { Editor } from 'grapesjs';
import type { DarkReaderLabels } from './options';

export const I18N_NS = 'darkreader';

export const locales: Record<string, DarkReaderLabels> = {
  en: {
    tab: 'Theme',
    preview: 'Canvas',
    previewOriginal: 'Original',
    previewGenerated: 'Generated',
    previewHint: 'In the preview mode the theme toggle on the page switches it too.',
    enabled: 'Theme on the published site',
    enabledHint: 'Visitors get the generated theme (by their system setting or the toggle).',
    scheme: 'Site design',
    schemeLight: 'Light — generate a dark theme',
    schemeDark: 'Dark — generate a light theme',
    engine: 'Engine',
    engineAuto: 'Auto (dynamic for a light design, filter for a dark one)',
    engineDynamic: 'Dynamic — recolour every style',
    engineFilter: 'Filter — invert the page, keep media',
    initial: 'First visit',
    initialSystem: 'As in the visitor’s system',
    initialOriginal: 'Original design',
    initialGenerated: 'Generated theme',
    remember: 'Remember the visitor’s choice',
    filters: 'Filters',
    brightness: 'Brightness',
    contrast: 'Contrast',
    sepia: 'Sepia',
    grayscale: 'Grayscale',
    colors: 'Colours of the generated theme',
    background: 'Background',
    text: 'Text',
    selection: 'Selection',
    scrollbar: 'Scrollbar',
    auto: 'Auto',
    browserDefault: 'Browser default',
    fixes: 'Fixes',
    invert: 'Invert as is',
    invertHint: 'CSS selectors, one per line: logos, maps, pictures of text.',
    ignoreInline: 'Keep inline styles of',
    ignoreImages: 'Do not analyse images',
    css: 'Extra CSS of the generated theme',
    cssHint: 'Applied only when the generated theme is on.',
    addToggle: 'Add a theme toggle',
    copyCss: 'Copy generated CSS',
    copied: 'Copied',
    reset: 'Reset',
    resetConfirm: 'Reset the theme settings of the site?',
    engineError: 'Dark Reader could not be loaded: ',
    blockLabel: 'Theme toggle',
    toggleTitle: 'Dark / light theme',
    pickSelected: '+ selected',
  },
  ru: {
    tab: 'Тема',
    preview: 'Холст',
    previewOriginal: 'Исходная',
    previewGenerated: 'Сгенерированная',
    previewHint: 'В режиме просмотра её переключает и кнопка темы на странице.',
    enabled: 'Тема на опубликованном сайте',
    enabledHint: 'Посетители получают сгенерированную тему (по настройке системы или кнопкой).',
    scheme: 'Дизайн сайта',
    schemeLight: 'Светлый — создать тёмную тему',
    schemeDark: 'Тёмный — создать светлую тему',
    engine: 'Движок',
    engineAuto: 'Авто (динамический для светлого дизайна, фильтр для тёмного)',
    engineDynamic: 'Динамический — перекрасить все стили',
    engineFilter: 'Фильтр — инвертировать страницу, медиа как есть',
    initial: 'Первый визит',
    initialSystem: 'Как в системе посетителя',
    initialOriginal: 'Исходный дизайн',
    initialGenerated: 'Сгенерированная тема',
    remember: 'Запоминать выбор посетителя',
    filters: 'Фильтры',
    brightness: 'Яркость',
    contrast: 'Контраст',
    sepia: 'Сепия',
    grayscale: 'Оттенки серого',
    colors: 'Цвета сгенерированной темы',
    background: 'Фон',
    text: 'Текст',
    selection: 'Выделение',
    scrollbar: 'Полоса прокрутки',
    auto: 'Авто',
    browserDefault: 'Как в браузере',
    fixes: 'Исправления',
    invert: 'Инвертировать как есть',
    invertHint: 'CSS-селекторы, по одному в строке: логотипы, карты, картинки с текстом.',
    ignoreInline: 'Не менять inline-стили у',
    ignoreImages: 'Не анализировать изображения',
    css: 'Дополнительный CSS сгенерированной темы',
    cssHint: 'Применяется только при включённой сгенерированной теме.',
    addToggle: 'Добавить кнопку темы',
    copyCss: 'Копировать CSS темы',
    copied: 'Скопировано',
    reset: 'Сбросить',
    resetConfirm: 'Сбросить настройки темы сайта?',
    engineError: 'Не удалось загрузить Dark Reader: ',
    blockLabel: 'Кнопка темы',
    toggleTitle: 'Тёмная / светлая тема',
    pickSelected: '+ выделенный',
  },
  uk: {
    tab: 'Тема',
    preview: 'Полотно',
    previewOriginal: 'Початкова',
    previewGenerated: 'Згенерована',
    previewHint: 'У режимі перегляду її перемикає й кнопка теми на сторінці.',
    enabled: 'Тема на опублікованому сайті',
    enabledHint: 'Відвідувачі отримують згенеровану тему (за налаштуванням системи або кнопкою).',
    scheme: 'Дизайн сайту',
    schemeLight: 'Світлий — створити темну тему',
    schemeDark: 'Темний — створити світлу тему',
    engine: 'Рушій',
    engineAuto: 'Авто (динамічний для світлого дизайну, фільтр для темного)',
    engineDynamic: 'Динамічний — перефарбувати всі стилі',
    engineFilter: 'Фільтр — інвертувати сторінку, медіа як є',
    initial: 'Перший візит',
    initialSystem: 'Як у системі відвідувача',
    initialOriginal: 'Початковий дизайн',
    initialGenerated: 'Згенерована тема',
    remember: 'Запам’ятовувати вибір відвідувача',
    filters: 'Фільтри',
    brightness: 'Яскравість',
    contrast: 'Контраст',
    sepia: 'Сепія',
    grayscale: 'Відтінки сірого',
    colors: 'Кольори згенерованої теми',
    background: 'Тло',
    text: 'Текст',
    selection: 'Виділення',
    scrollbar: 'Смуга прокрутки',
    auto: 'Авто',
    browserDefault: 'Як у браузері',
    fixes: 'Виправлення',
    invert: 'Інвертувати як є',
    invertHint: 'CSS-селектори, по одному в рядку: логотипи, мапи, картинки з текстом.',
    ignoreInline: 'Не змінювати inline-стилі у',
    ignoreImages: 'Не аналізувати зображення',
    css: 'Додатковий CSS згенерованої теми',
    cssHint: 'Застосовується лише з увімкненою згенерованою темою.',
    addToggle: 'Додати кнопку теми',
    copyCss: 'Копіювати CSS теми',
    copied: 'Скопійовано',
    reset: 'Скинути',
    resetConfirm: 'Скинути налаштування теми сайту?',
    engineError: 'Не вдалося завантажити Dark Reader: ',
    blockLabel: 'Кнопка теми',
    toggleTitle: 'Темна / світла тема',
    pickSelected: '+ виділений',
  },
};

export function registerMessages(editor: Editor): void {
  const i18n = (editor as any).I18n;
  if (!i18n?.addMessages) return;
  const msgs: Record<string, any> = {};
  Object.keys(locales).forEach((lang) => (msgs[lang] = { [I18N_NS]: locales[lang] }));
  try {
    i18n.addMessages(msgs);
  } catch {
    // ignore
  }
}

/** Current labels: overrides, then editor.I18n, then English. */
export function getLabels(editor: Editor, overrides: Partial<DarkReaderLabels>): DarkReaderLabels {
  const out = { ...locales.en };
  const i18n = (editor as any).I18n;
  (Object.keys(out) as (keyof DarkReaderLabels)[]).forEach((k) => {
    if (overrides[k]) {
      out[k] = overrides[k]!;
      return;
    }
    try {
      const t = i18n?.t?.(`${I18N_NS}.${k}`);
      if (typeof t === 'string' && t) out[k] = t;
    } catch {
      // ignore
    }
  });
  return out;
}
