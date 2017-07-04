"use strict";

exports.kvfilter = function(i, f) {
	let o = {};
	for (let k in i) {
		if (f(k, i[k])) o[k] = i[k];
	}
	return o;
};

exports.kvmap = function(i, f) {
	let o = {};
	for (let k in i) {
		let [k1, v1] = f(k, i[k]);
		o[k1] = v1;
	}
	return o;
};

exports.vmap = function(i, f) {
	let o = {};
	for (let k in i) {
		o[k] = f(k, i[k]);
	}
	return o;
};
