# grapesjs-darkreader

GrapesJS plugin: a **generated dark or light theme** for the site you build, made by the [Dark Reader](https://github.com/darkreader/darkreader) engine.

- **Theme toggle** component (block "Theme toggle"): a sun / moon button or a switch for the visitors.
- **"Theme" tab** (a view button — [grapesjs-sidebar-tools](https://www.npmjs.com/package/grapesjs-sidebar-tools) docks it as a tab): the site design (light → dark theme is generated, dark → light), engine, what a visitor sees first, colours, brightness / contrast / sepia / grayscale, fixes (selectors to invert, to leave alone, extra CSS), "Copy generated CSS".
- **Live preview in the canvas** (Original / Generated, also a button in the `options` panel). In the preview mode (eye) the toggle on the page switches it too.
- **Published pages**: a small runtime (`window.gjsTheme`) follows the visitor's system scheme (`prefers-color-scheme`) or the toggle, remembers the choice and loads Dark Reader from a CDN only when the generated theme is needed.

Settings are stored in the project data (`darkreader` key); with [grapesjs-site-pages](https://www.npmjs.com/package/grapesjs-site-pages) once per site.

## Install

```html
<script src="https://unpkg.com/grapesjs"></script>
<script src="https://cdn.jsdelivr.net/npm/grapesjs-darkreader/dist/grapesjs-darkreader.umd.js"></script>
<script>
  grapesjs.init({
    container: '#gjs',
    plugins: ['grapesjs-darkreader'],
    pluginsOpts: { 'grapesjs-darkreader': { /* options */ } },
  });
</script>
```

```js
import grapesjs from 'grapesjs';
import darkReader from 'grapesjs-darkreader';

grapesjs.init({ container: '#gjs', plugins: [darkReader], pluginsOpts: { [darkReader]: {} } });
```

## Engines

| Engine | How | Use for |
| --- | --- | --- |
| `dynamic` | Dark Reader's dynamic theme: every stylesheet and inline style is analysed and recoloured (`DarkReader.enable`). darkreader.js (~100 kB gzip) is loaded on demand. | a **light** design → dark theme |
| `filter` | CSS only: the page is inverted (`invert(100%) hue-rotate(180deg)` + the filters), images, video, backgrounds and the "invert" selectors are inverted back (after Dark Reader's filter mode). No script download. | a **dark** design → light theme (Dark Reader's dynamic light mode only dims a light page) |
| `auto` (default) | `dynamic` for a light design, `filter` for a dark one | |

## Options

| Option | Default | |
| --- | --- | --- |
| `src` | jsDelivr `darkreader@4.9.135/darkreader.min.js` | darkreader.js (UMD build of the `darkreader` npm package) for the canvas and the published pages. Put a copy on your server to avoid the CDN. |
| `defaults` | `{}` | Settings of a new project (see below). |
| `tab` | `{ panel: null, id: 'gjs-darkreader' }` | The "Theme" view button; `panel: null` — the panel of the view buttons (`open-sm`, `open-layers`…). `false` — none. |
| `button` | `{ panel: 'options', id: 'gjs-darkreader-preview' }` | Preview on/off button. `false` — none. |
| `block` | `{ category: 'Extra' }` | The toggle block (`label` optional). `false` — none. |
| `exportRuntime` | `true` | Add the runtime `<script>` to `editor.getHtml()` when the page has no toggle (toggles carry it themselves). |
| `antiFlash` | `true` | Published pages: hide the page until the generated theme is applied on load. |
| `choiceKey` | `'gjs-theme'` | localStorage key of the visitor's choice on the site. |
| `storageKey` | `'darkreader'` | Project data key. |
| `sharedWithPages` | `true` | grapesjs-site-pages: settings once per site. |
| `stateKey` | `'gjs-darkreader'` | localStorage key of the editor state (preview on/off); `false` — keep nothing. |
| `preview` | `false` | Preview on first start. |
| `labels` | `{}` | Text overrides (en / ru / uk built in, by the editor locale). |

### Settings (`editor.DarkReader.setSettings(...)`, the "Theme" tab)

| Key | Default | |
| --- | --- | --- |
| `enabled` | `true` | Theme on the published site. |
| `scheme` | `'light'` | The design made in the editor; the other scheme is generated. |
| `engine` | `'auto'` | `'auto' \| 'dynamic' \| 'filter'`. |
| `initial` | `'system'` | First visit: `'system'` (prefers-color-scheme), `'original'`, `'generated'`. |
| `remember` | `true` | Remember the visitor's choice. |
| `brightness`, `contrast` | `100` | 50–150 %. |
| `sepia`, `grayscale` | `0` | 0–100 %. |
| `darkBackground`, `darkText` | `#181a1b`, `#e8e6e3` | Generated dark theme. |
| `lightBackground`, `lightText` | `#dcdad7`, `#181a1b` | Generated light theme. |
| `selectionColor`, `scrollbarColor` | `'auto'`, `''` | `'auto'`, `''` (browser default) or a colour. |
| `invert` | `[]` | Selectors inverted as they are (logos, maps, pictures of text); with the filter engine — kept as they are. |
| `ignoreInlineStyle`, `ignoreImageAnalysis` | `[]` | Dark Reader fixes. |
| `css` | `''` | Extra CSS of the generated theme. |

## API

```js
const dr = editor.DarkReader;
dr.getSettings(); dr.setSettings({ scheme: 'dark' }); dr.resetSettings();
dr.setPreview(true); dr.togglePreview(); dr.isPreview();
dr.addToggle(component?);       // into the selection or the page
dr.getRuntimeScript();          // <script> for the <head> of a page (no flash at all)
dr.getRuntimeConfig();
await dr.exportCss();           // CSS of the generated theme of the canvas page (preview on)
```

Commands: `darkreader:open` (tab), `darkreader:preview` (stateful), `darkreader:toggle-preview`.
Events: `darkreader:change {settings}`, `darkreader:preview {on}`, `darkreader:error {error}`.

On the published page:

```js
gjsTheme.get();               // 'dark' | 'light'
gjsTheme.set('dark');         // 'dark' | 'light' | 'original' | 'generated' | 'system'
gjsTheme.toggle();
gjsTheme.on(({ scheme, generated }) => {});
```

`<html data-gjs-theme="dark|light">` is set on the site and in the canvas, so your own CSS can follow the theme.
Any element with `data-gjs-theme-toggle` works as a toggle.

## Notes

- The runtime added by `getHtml()` sits at the end of `<body>`: a visitor with the generated theme may see the original colours for a moment. Put `editor.DarkReader.getRuntimeScript()` into the `<head>` of your pages to avoid it.
- Dark Reader works on its own window's document. In the canvas the plugin loads it into the frame and teaches the frame's DOM classes to accept the editor window's nodes (GrapesJS builds the canvas DOM from the editor's `document`, so `instanceof` checks would fail otherwise).
- What Dark Reader writes into the DOM (`data-darkreader-*`, `--darkreader-*`) is kept out of the model (the RTE does not sync it back).

## Licence

MIT. Dark Reader (MIT, © Dark Reader Ltd.) is not bundled: it is loaded from `src`. The filter engine's selectors follow Dark Reader's inversion fixes.
