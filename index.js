"use strict";

const TypoGeom = require("typo-geom");

module.exports = {
	// Support
	Workflow: require("./workflow"),
	geometry: {
		Point: TypoGeom.Point,
		GlyphPoint: TypoGeom.OnOffGlyphPoint,
		Transform: require("./geometry/transform"),
		c2q: require("./procs/quadify/ctq")
	},
	contourHash: require("./support/contourhash"),
	kvfns: require("./support/kvfns"),

	// Procedures
	adjust: require("./procs/adjust"),
	alias: require("./procs/alias"),
	build: require("./procs/build"),
	mark: require("./procs/mark"),
	gc: require("./procs/gc"),
	introduce: require("./procs/introduce"),
	quadify: require("./procs/quadify"),
	rebase: require("./procs/rebase"),
	setEncodings: require("./procs/set-encodings"),
	subset: require("./procs/subset"),
	merge: {
		above: require("./procs/merge/above"),
		below: require("./procs/merge/below")
	},

	// Detailed manipulation
	manip: {
		glyph: require("./manip/glyph-manip-context"),
		glyphKit: require("./manip/manip-kit")
	}
};
