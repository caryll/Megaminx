"use strict";

class Kit {
	constructor(ctx) {
		this.ctx = ctx;
		this.focusedGlyphs = null;
		this.focusedGlyphNames = null;
		this.broken = false;
		this.glyph = null;
	}

	for(...gns) {
		return this.for_(gns);
	}

	for_(glyphNames) {
		let o = Object.create(this);
		let glyphs = [];
		let broken = false;
		for (let gn of glyphNames) {
			let g = typeof gn === "string" ? this.ctx.find.glyph$(gn) : gn;
			if (!g) {
				broken = true;
			}
			glyphs.push(g);
		}
		o.focusedGlyphs = glyphs;
		o.focusedGlyphNames = glyphNames;
		o.broken = broken;
		return o;
	}

	run(manipulator, standardArity, argsPrefix, args) {
		if (this.broken) return this;
		if (this.focusedGlyphs) {
			const g = manipulator.apply(this.ctx, [
				...this.focusedGlyphs,
				...(argsPrefix || []),
				...args
			]);
			this.focusedGlyphs = [g];
			this.glyph = g;
			return this;
		} else {
			return this.for_(args.slice(0, standardArity)).run(
				manipulator,
				standardArity,
				argsPrefix,
				args.slice(standardArity)
			);
		}
	}

	// piping to another kit
	pipe(kit) {
		if (this.broken) return this;
		return kit.for_(this.focusedGlyphs);
	}

	// saving functions
	async saveMap(mapgns, gn, u) {
		if (this.broken) return null;
		let gn1 = await this.ctx.save.to(gn, u, this.glyph.clone());
		if (this.addMap) this.addMap(mapgns, gn1);
		return gn1;
	}
	async saveInsitu() {
		return this.saveMap(this.focusedGlyphNames, this.focusedGlyphNames[0], null);
	}
	async save(...args) {
		return this.saveMap(this.focusedGlyphNames, ...args);
	}
	async saveU(u) {
		return await this.save(null, u);
	}
}

exports.Kit = Kit;
