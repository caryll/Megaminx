"use strict";

function scaleGlyph(glyph, scale, ori, target) {
	glyph.advanceWidth *= scale;
	glyph.advanceHeight *= scale;
	glyph.verticalOrigin *= scale;
	delete glyph.stemH;
	delete glyph.stemV;
	delete glyph.hintMasks;
	delete glyph.contourMasks;
	if (glyph.contours) {
		for (var j = 0; j < glyph.contours.length; j++) {
			let contour = glyph.contours[j];
			for (var k = 0; k < contour.length; k++) {
				(contour[k].x *= scale), (contour[k].y *= scale);
			}
		}
	}
	if (glyph.references) {
		for (let ref of glyph.references) {
			(ref.x *= scale), (ref.y *= scale);
		}
	}
}

function scaleMarkToBase(subtable, scale) {
	for (let gid in subtable.marks) {
		subtable.marks[gid].x *= scale;
		subtable.marks[gid].y *= scale;
	}
	for (let gid in subtable.bases) {
		for (let kid in subtable.bases[gid]) {
			subtable.bases[gid][kid].x *= scale;
			subtable.bases[gid][kid].y *= scale;
		}
	}
}
function scaleMarkToLig(subtable, scale) {
	for (let gid in subtable.marks) {
		subtable.marks[gid].x *= scale;
		subtable.marks[gid].y *= scale;
	}
	for (let gid in subtable.bases) {
		for (let component of subtable.bases[gid]) {
			for (let kid in component) {
				component[kid].x *= scale;
				component[kid].y *= scale;
			}
		}
	}
}

function scaleGposValue(entry, scale) {
	if (entry.dx) entry.dx *= scale;
	if (entry.dy) entry.dy *= scale;
	if (entry.dWidth) entry.dWidth *= scale;
	if (entry.dHeight) entry.dHeight *= scale;
	return Object.assign({}, entry);
}

function scaleGposSingle(subtable, scale) {
	for (let gid in subtable) {
		scaleGposValue(subtable[gid]);
	}
}

function scaleGposPair(subtable, scale) {
	for (let r of subtable.matrix) {
		for (let j = 0; j < r.length; j++) {
			if (typeof r[j] === "number") r[j] *= scale;
			else {
				if (r[j].first) r[j].first = scaleGposValue(r[j].first);
				if (r[j].second) r[j].second = scaleGposValue(r[j].second);
			}
		}
	}
}

const GPOS_SCALER = {
	gpos_mark_to_base: scaleMarkToBase,
	gpos_mark_to_mark: scaleMarkToBase,
	gpos_mark_to_ligature: scaleMarkToLig,
	gpos_single: scaleGposSingle,
	gpos_pair: scaleGposPair
};

async function RebaseFont(ctx, demand, options) {
	const font = this.items[demand];
	const { scale } = options;
	if (scale === 1) return;
	for (const gid in font.glyf) {
		// We ensure that ideographic sources are all CFF
		// therefore, no references.
		scaleGlyph(font.glyf[gid], scale);
	}
	// Scale metrics
	font.head.unitsPerEm *= scale;
	if (font.hhea) {
		font.hhea.ascender *= scale;
		font.hhea.descender *= scale;
		font.hhea.lineGap *= scale;
	}
	if (font.OS_2) {
		font.OS_2.xAvgCharWidth *= scale;
		font.OS_2.usWinAscent *= scale;
		font.OS_2.usWinDescent *= scale;
		font.OS_2.sTypoAscender *= scale;
		font.OS_2.sTypoDescender *= scale;
		font.OS_2.sTypoLineGap *= scale;
		font.OS_2.sxHeight *= scale;
		font.OS_2.sCapHeight *= scale;
		font.OS_2.ySubscriptXSize *= scale;
		font.OS_2.ySubscriptYSize *= scale;
		font.OS_2.ySubscriptXOffset *= scale;
		font.OS_2.ySubscriptYOffset *= scale;
		font.OS_2.ySupscriptXSize *= scale;
		font.OS_2.ySupscriptYSize *= scale;
		font.OS_2.ySupscriptXOffset *= scale;
		font.OS_2.ySupscriptYOffset *= scale;
		font.OS_2.yStrikeoutSize *= scale;
		font.OS_2.yStrikeoutPosition *= scale;
	}
	if (font.post) {
		font.post.underlinePosition *= scale;
		font.post.underlineThickness *= scale;
	}
	if (font.vhea) {
		font.vhea.ascender *= scale;
		font.vhea.descender *= scale;
		font.vhea.lineGap *= scale;
	}
	if (font.GPOS) {
		for (let lid in font.GPOS.lookups) {
			let lookup = font.GPOS.lookups[lid];
			if (GPOS_SCALER[lookup.type]) {
				let scaler = GPOS_SCALER[lookup.type];
				for (let subtable of lookup.subtables) scaler(subtable, scale);
			}
		}
	}
}

module.exports = RebaseFont;
