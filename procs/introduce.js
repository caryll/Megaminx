"use strict";

const child_process = require("child_process");
const JSONStream = require("JSONStream");
const which = require("which");
const path = require("path");
const fs = require("fs-extra");
const stripBomStream = require("strip-bom-stream");

const Font = require("../types/font");

function getStream(sourcefile, options) {
	if (sourcefile === "|") {
		process.stdin.resume();
		process.stdin.setEncoding("utf8");
		return process.stdin;
	}
	const ext = path.parse(sourcefile).ext;
	if (ext === ".ttf" || ext === ".otf") {
		const cp = child_process.spawn(which.sync(`otfccdump`), [
			sourcefile,
			...(options.prefix ? ["--glyph-name-prefix", options.prefix + "/"] : []),
			...(options.ignoreHints ? ["--ignore-hints"] : []),
			...(options.nameByHash ? ["--name-by-hash"] : []),
			"--no-bom",
			"--decimal-cmap",
			"--quiet"
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
		let font = new Font({});
		getStream(sourcefile, options)
			.pipe(stripBomStream())
			.pipe(JSONStream.parse("$*"))
			.on("data", function(data) {
				font[data.key] = data.value;
			})
			.on("close", function() {
				for (let k in font.glyf) {
					font.glyf[k] = font.createGlyph(k, font.glyf[k], options.prefix);
				}
				t.introduce(partname, font);
				return resolve(font);
			});
	});
}

module.exports = introduce;
