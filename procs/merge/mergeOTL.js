"use strict";

function mergeOTLTables(dst, src, priorizeSrc) {
	if (!dst || !src) return;
	for (const fid in src.features) {
		dst.features[fid] = src.features[fid];
	}
	for (const lid in src.lookups) {
		process.stderr.write(`    Merged lookup ${lid}\n`);
		dst.lookups[lid] = src.lookups[lid];
	}
	for (const lid in src.languages) {
		if (dst.languages[lid]) {
			dst.languages[lid].features = dst.languages[lid].features.concat(
				src.languages[lid].features
			);
		} else {
			dst.languages[lid] = src.languages[lid];
		}
	}
	if (priorizeSrc) {
		dst.lookupOrder = [src.lookupOrder || [], dst.lookupOrder || []];
	} else {
		dst.lookupOrder = [dst.lookupOrder || [], src.lookupOrder || []];
	}
}
exports.mergeOTLTables = mergeOTLTables;

exports.mergeGDEF = function(first, second) {
	return {
		markAttachClassDef: Object.assign({}, first.markAttachClassDef, second.markAttachClassDef),
		glyphClassDef: Object.assign({}, first.glyphClassDef, second.glyphClassDef),
		ligCarets: Object.assign({}, first.ligCarets, second.ligCarets)
	};
};
