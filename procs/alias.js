"use strict";

function aliasGlyphs(font, mapping) {
	for (let [_from, _to] of mapping) {
		const from = parseInt(_from, 16);
		const to = parseInt(_to, 16);
		if (font.cmap[from] || !font.cmap[to]) continue;
		font.cmap[from] = font.cmap[to];
	}
}

module.exports = async function(ctx, target, dataset) {
	const major = this.items[target];
	aliasGlyphs(major, dataset);
};
