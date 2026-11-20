import type { Editor } from 'grapesjs';
import { canvasScript, exportScript, type RuntimeConfig } from './runtime';
import { ICON, TOGGLE_CONTENT, TOGGLE_CSS } from './styles';

export const TOGGLE_TYPE = 'theme-toggle';
export const TOGGLE_ATTR = 'data-gjs-theme-toggle';
export const TOGGLE_CLASS = 'gjs-theme-toggle';
export const SWITCH_CLASS = 'gjs-theme-toggle--switch';
export const BLOCK_ID = 'theme-toggle';

export type ToggleVariant = 'icon' | 'switch';

/**
 * The theme toggle: a `<button data-gjs-theme-toggle>` with a sun and a
 * moon. On the published page its export script starts the runtime
 * (with the site's settings as script props) and binds the button; in
 * the canvas the click goes to the preview.
 */
export function addToggleType(editor: Editor, config: () => RuntimeConfig, title: () => string): void {
  editor.Components.addType(TOGGLE_TYPE, {
    isComponent: (el: HTMLElement) => (el?.hasAttribute?.(TOGGLE_ATTR) ? { type: TOGGLE_TYPE } : false),
    model: {
      defaults: {
        name: 'Theme toggle',
        tagName: 'button',
        classes: [TOGGLE_CLASS],
        attributes: { type: 'button', [TOGGLE_ATTR]: '', 'aria-label': title(), title: title() },
        droppable: false,
        editable: false,
        content: TOGGLE_CONTENT,
        variant: 'icon',
        icon: ICON,
        script: canvasScript(),
        'script-export': exportScript(),
        'script-props': ['config'],
        styles: TOGGLE_CSS,
        traits: [
          {
            type: 'select',
            name: 'variant',
            label: 'Variant',
            changeProp: true,
            options: [
              { id: 'icon', name: 'Icon' },
              { id: 'switch', name: 'Switch' },
            ],
          },
          { type: 'text', name: 'aria-label', label: 'Label' },
          { type: 'text', name: 'title', label: 'Title' },
        ],
      },
      init(this: any) {
        this.on('change:variant', this.__syncVariant);
        const cls = this.getClasses?.() || [];
        if (cls.includes(SWITCH_CLASS) && this.get('variant') !== 'switch') this.set('variant', 'switch', { silent: true });
        this.__syncVariant();
      },
      __syncVariant(this: any) {
        const sw = this.get('variant') === 'switch';
        const has = (this.getClasses?.() || []).includes(SWITCH_CLASS);
        if (sw && !has) this.addClass(SWITCH_CLASS);
        if (!sw && has) this.removeClass(SWITCH_CLASS);
      },
      /** Script props are the site's current settings, not stored on the component. */
      __getScriptProps() {
        return { config: config() };
      },
    } as any,
  });
}

export function addToggleBlock(editor: Editor, category: string, label: string): void {
  const bm: any = editor.BlockManager;
  if (bm.get(BLOCK_ID)) return;
  bm.add(BLOCK_ID, {
    label,
    category,
    media: ICON.replace('width="18" height="18"', 'width="40" height="40"').replace(' style="vertical-align:middle"', ''),
    content: { type: TOGGLE_TYPE },
    select: true,
  });
}
