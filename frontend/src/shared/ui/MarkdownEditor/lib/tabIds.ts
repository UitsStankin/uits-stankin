/** Вкладка поля: исходник или то, что увидит посетитель. */
export type EditorTab = 'source' | 'preview';

/**
 * Идентификаторы вкладки и её панели. Связь `aria-controls`
 * и `aria-labelledby` держится на совпадении строк в двух компонентах,
 * и собирать их по месту значило бы однажды разойтись в одной букве.
 */
export const tabId = (fieldId: string, tab: EditorTab) => `${fieldId}-tab-${tab}`;

export const panelId = (fieldId: string, tab: EditorTab) => `${fieldId}-panel-${tab}`;
