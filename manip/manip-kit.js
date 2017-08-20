"use strict";

function Saving(vm, ctx, oldGNs, g) {
	return {
		glyph: g,
		saveMap: async function(mapgns, gn, u) {
			let gn1 = await ctx.save.to(gn, u, g);
			if (vm.addMap) vm.addMap(mapgns, gn1);
			return gn1;
		},
		saveInsitu: async function() {
			return this.saveMap(oldGNs, oldGNs[0], null);
		},
		save: async function(...args) {
			return this.saveMap(oldGNs, ...args);
		},
		saveU: async function(u) {
			return await this.save(null, u);
		}
	};
}
function EmptySaving() {
	return {
		saveMap: async function() {},
		save: async function() {},
		saveU: async function() {},
		saveInsitu: async function() {}
	};
}

exports.run = function(kit, proc, arity, ..._args) {
	const glyphNames = _args.slice(0, arity);
	const procArgs = _args.slice(arity);
	const glyphs = [];
	for (let gn of glyphNames) {
		let g = kit.ctx.find.glyph$(gn);
		if (!g) {
			return EmptySaving();
		}
		glyphs.push(g);
	}
	const g1 = proc.apply(kit.ctx, [...glyphs, ...procArgs]);
	return Saving(kit, kit.ctx, glyphNames, g1);
};
