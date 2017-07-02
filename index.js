module.exports = {
	adjust: require("./adjust"),
	alias: require("./alias"),
	build: require("./build"),
	gc: require("./gc"),
	introduce: require("./introduce"),
	quadify: require("./quadify"),
	rebase: require("./rebase"),
	setEncodings: require("./set-encodings"),
	subset: require("./subset"),
	Workflow: require("./workflow"),
	merge: {
		above: require("./merge/above"),
		below: require("./merge/below")
	},
	geometry: {
		Point: require("./geometry/point"),
		GlyphPoint: require("./geometry/glyph-point"),
		Transform: require("./geometry/transform")
	},
	contourHash: require("./support/contourhash")
};
