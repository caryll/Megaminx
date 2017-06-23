"use strict";

const child_process = require("child-process-promise");
const Z = require("./geometry/glyph-point");

async function introduce(ctx, partname, sourcefile) {
	const cp = child_process.exec(
		`otfccdump ${sourcefile} --glyph-name-prefix ${partname}/ --ignore-hints --no-bom --decimal-cmap`,
		{ maxBuffer: 5000000000 }
	);
	let { stdout, stderr } = await cp;
	const font = JSON.parse(stdout);
	for (let k in font.glyf) {
		let glyph = font.glyf[k];
		if (!glyph.contours) continue;
		for (let contour of glyph.contours) {
			for (let j = 0; j < contour.length; j++) {
				contour[j] = new Z(contour[j].x, contour[j].y, contour[j].on);
			}
		}
	}
	this.introduce(partname, font);
	stdout = stderr = null;
}

module.exports = introduce;
