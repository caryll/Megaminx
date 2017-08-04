"use strict";

const child_process = require("child_process");
const JSONStream = require("JSONStream");
const which = require("which");
const path = require("path");
const fs = require("fs-extra");

const Z = require("../geometry/glyph-point");

function getStream(sourcefile, options) {
	if (sourcefile === "|") {
		return process.stdin;
	}
	const ext = path.parse(sourcefile).ext;
	if (ext === ".ttf" || ext === ".otf") {
		const cp = child_process.spawn(which.sync(`otfccdump`), [
			sourcefile,
			...(options.prefix ? ["--glyph-name-prefix", options.prefix + "/"] : []),
			...(options.ignoreHints ? ["--ignore-hints"] : []),
			"--no-bom",
			"--decimal-cmap"
		]);
		cp.stdout.setEncoding("utf8");
		return cp.stdout;
	} else {
		return fs.createReadStream(sourcefile, { encoding: "utf8" });
	}
}

function introduce(ctx, partname, options) {
	const t = this;
	const sourcefile = options.from;
	return new Promise(function(resolve, reject) {
		let font = {};
		getStream(sourcefile, options)
			.pipe(JSONStream.parse("$*"))
			.on("data", function(data) {
				font[data.key] = data.value;
			})
			.on("close", function() {
				for (let k in font.glyf) {
					let glyph = font.glyf[k];
					if (!glyph.contours) continue;
					for (let contour of glyph.contours) {
						for (let j = 0; j < contour.length; j++) {
							contour[j] = new Z(contour[j].x, contour[j].y, contour[j].on);
						}
					}
				}
				t.introduce(partname, font);
				return resolve(font);
			});
	});
}

module.exports = introduce;
