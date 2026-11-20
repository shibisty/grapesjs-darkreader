/** Half moon / sun icon of the tab and the button (editor UI). */
export const ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" style="vertical-align:middle"><path fill="currentColor" fill-rule="evenodd" d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 5a7 7 0 1 1 0 14a7 7 0 1 1 0-14zM12 5a7 7 0 0 1 0 14z"/></svg>';

/** Icons inside the toggle (published HTML). */
const SUN =
  '<svg class="gjs-tt-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
const MOON =
  '<svg class="gjs-tt-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>';
export const TOGGLE_CONTENT = SUN + MOON;

/**
 * CSS of the toggle (component `styles`: goes into the project CSS once).
 * `html[data-gjs-theme]` is set by the runtime on the site and by the
 * preview in the canvas.
 */
export const TOGGLE_CSS = `
.gjs-theme-toggle{display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;width:40px;height:40px;padding:0;margin:0;border:1px solid rgba(128,128,128,.4);border-radius:999px;background:transparent;color:inherit;font:inherit;line-height:0;cursor:pointer;vertical-align:middle;position:relative;transition:background-color .2s,border-color .2s}
.gjs-theme-toggle:hover{background-color:rgba(128,128,128,.12)}
.gjs-theme-toggle:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.gjs-theme-toggle svg{width:20px;height:20px;display:block;flex:none;pointer-events:none}
.gjs-theme-toggle .gjs-tt-moon{display:none}
html[data-gjs-theme=dark] .gjs-theme-toggle .gjs-tt-sun{display:none}
html[data-gjs-theme=dark] .gjs-theme-toggle .gjs-tt-moon{display:block}
.gjs-theme-toggle--switch{width:62px;height:32px;justify-content:space-between;padding:0 8px}
.gjs-theme-toggle--switch svg{width:15px;height:15px;position:relative;z-index:1}
.gjs-theme-toggle--switch .gjs-tt-moon{display:block}
.gjs-theme-toggle--switch:before{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:rgba(128,128,128,.35);transition:transform .2s}
html[data-gjs-theme=dark] .gjs-theme-toggle--switch .gjs-tt-sun{display:block}
html[data-gjs-theme=dark] .gjs-theme-toggle--switch:before{transform:translateX(30px)}
`.trim();

/** The "Theme" tab. */
export const PANEL_CSS = `
.gjs-dr{width:100%;overflow-x:hidden;font:12px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--gjs-font-color,#ddd);padding:10px 10px 24px;box-sizing:border-box;text-align:left}
.gjs-dr *{box-sizing:border-box}
.gjs-dr-sec{margin:0 0 14px}
.gjs-dr-h{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;opacity:.7;margin:0 0 6px}
.gjs-dr-row{display:flex;align-items:center;gap:8px;margin:0 0 7px}
.gjs-dr-row>label,.gjs-dr-row>.gjs-dr-l{flex:0 0 38%;opacity:.85}
.gjs-dr-row>select,.gjs-dr-row>input[type=text],.gjs-dr-row>.gjs-dr-grow{flex:1;min-width:0}
.gjs-dr-row--stack{flex-direction:column;align-items:stretch;gap:3px}
.gjs-dr-row--stack>*{flex:none !important}
.gjs-dr select,.gjs-dr input[type=text],.gjs-dr textarea{width:100%;background:rgba(0,0,0,.2);color:inherit;border:1px solid rgba(128,128,128,.35);border-radius:3px;padding:4px 6px;font:inherit}
.gjs-dr select option{color:#222}
.gjs-dr textarea{min-height:54px;resize:vertical;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px}
.gjs-dr-check{display:flex;align-items:flex-start;gap:6px;margin:0 0 7px;cursor:pointer}
.gjs-dr-check input{margin:2px 0 0}
.gjs-dr-hint{font-size:11px;opacity:.6;margin:-3px 0 8px}
.gjs-dr-seg{display:flex;min-width:0;border:1px solid rgba(128,128,128,.4);border-radius:4px;overflow:hidden;flex:1}
.gjs-dr-seg button{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:transparent;color:inherit;border:0;padding:5px 4px;font:inherit;cursor:pointer}
.gjs-dr-seg button+button{border-left:1px solid rgba(128,128,128,.4)}
.gjs-dr-seg button.is-on{background:var(--gjs-color-active,rgba(128,128,255,.35));color:#fff}
.gjs-dr-range{display:flex;align-items:center;gap:6px;flex:1;min-width:0}
.gjs-dr-range input{flex:1;min-width:0}
.gjs-dr-range output{flex:none;width:36px;text-align:right;font-variant-numeric:tabular-nums}
.gjs-dr-color{display:flex;align-items:center;gap:5px;flex:1;min-width:0}
.gjs-dr-color input[type=color]{width:28px;height:24px;padding:0;border:1px solid rgba(128,128,128,.4);border-radius:3px;background:none;flex:none;cursor:pointer}
.gjs-dr-color input[type=text]{flex:1;min-width:0}
.gjs-dr-color select{flex:1 1 auto;width:auto;min-width:0}
.gjs-dr-lh{display:flex;align-items:center;justify-content:space-between;margin:0 0 3px;opacity:.85}
.gjs-dr-link{background:none;border:0;color:inherit;opacity:.75;cursor:pointer;font:inherit;padding:0;text-decoration:underline}
.gjs-dr-link:hover{opacity:1}
.gjs-dr-btns{display:flex;flex-wrap:wrap;gap:6px}
.gjs-dr-btn{background:rgba(128,128,128,.18);color:inherit;border:1px solid rgba(128,128,128,.4);border-radius:3px;padding:5px 9px;font:inherit;cursor:pointer}
.gjs-dr-btn:hover{background:rgba(128,128,128,.3)}
.gjs-dr-btn--main{background:var(--gjs-color-active,#3b97e3);border-color:transparent;color:#fff}
.gjs-dr-err{color:#ff8a80;font-size:11px;margin:0 0 8px;word-break:break-word}
.gjs-dr-off .gjs-dr-site{opacity:.45;pointer-events:none}
.gjs-dr details>summary{cursor:pointer;margin:0 0 7px;list-style-position:inside}
`.trim();

export function injectStyles(doc: Document): void {
  if (doc.getElementById('gjs-darkreader-styles')) return;
  const s = doc.createElement('style');
  s.id = 'gjs-darkreader-styles';
  s.textContent = PANEL_CSS;
  doc.head.appendChild(s);
}
