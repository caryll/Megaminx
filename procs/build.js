"use strict";

const child_process = require("child_process");
const stringifyToStream = require("../support/stringifyToStream");
const which = require("which");
const fs = require("fs-extra");
const path = require("path");

function cppm(cp) {
	return new Promise(function(resolve, reject) {
		cp.on("close", code => {
			if (code !== 0) {
				reject(code);
			} else {
				resolve(code);
			}
		});
	});
}

function sanityFeatures(table) {
	if (!table) return;
	const allfeats = {};
	for (let lid in table.languages) {
		const lang = table.languages[lid];
		if (lang.requiredFeature && table.features[lang.requiredFeature]) {
			allfeats[lang.requiredFeature + "#RF#" + lid] = table.features[lang.requiredFeature];
			lang.requiredFeature = lang.requiredFeature + "#RF#" + lid;
		}
		let tagmap = {};
		if (!lang.features) lang.features = [];
		for (let f of lang.features) {
			if (!table.features[f]) continue;
			const tag = f.slice(0, 4);
			if (!tagmap[tag]) tagmap[tag] = [];
			tagmap[tag] = [...tagmap[tag], ...table.features[f]];
		}
		lang.features = [];
		for (let tag in tagmap) {
			const fn = tag + "#FEAT#" + lid;
			allfeats[fn] = tagmap[tag];
			lang.features.push(fn);
		}
	}
	table.features = allfeats;
}

async function Build(ctx, demand, options) {
	const destination = options.to;
	let t = this;
	const font = t.items[demand];
	if (font.TSI_01) {
		font.cvt_ = null;
		font.prep = null;
		font.fpgm = null;
		font.TSI_01.glyphs = {};
	}
	sanityFeatures(font.GSUB);
	sanityFeatures(font.GPOS);
	if (destination === "|") {
		process.stdout.setEncoding("utf8");
		await stringifyToStream(font, process.stdout, true);
	} else {
		const ext = path.parse(destination).ext;
		if (ext === ".ttf" || ext === ".otf") {
			const cp = child_process.spawn(which.sync("otfccbuild"), [
				...["-o", destination],
				...(options.optimize ? ["-O3"] : []),
				...(options.sign ? ["-s"] : []),
				...(options.keepOrder ? ["-k"] : []),
				...(options.recalculateCharWidth ? [] : ["--keep-average-char-width"])
			]);
			cp.stderr.on("data", function(data) {
				if (options.verbose) process.stderr.write(data);
			});
			stringifyToStream(font, cp.stdin);
			await cppm(cp);
		} else {
			const out = fs.createWriteStream(destination);
			await stringifyToStream(font, out);
		}
	}
}

module.exports = Build;
