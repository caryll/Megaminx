"use strict";

function mergeOTLTables(dst, src, priorizeSrc) {
	if (!dst || !src) return;
	for (const fid in src.features) {
		dst.features[fid] = src.features[fid];
	}
	for (const lid in src.lookups) {
		console.log("    Merged lookup", lid);
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
module.exports = mergeOTLTables;
