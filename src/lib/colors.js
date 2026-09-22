export const COLORS = ['clay', 'moss', 'ochre', 'slate', 'plum', 'stone']
export const colorVar = (key) => `var(--col-${COLORS.includes(key) ? key : 'clay'})`
