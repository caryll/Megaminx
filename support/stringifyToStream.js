"use strict";

const BUFFER_LIMIT = 1e6;
const Readable = require("stream").Readable;

module.exports = function(obj, writer, dontend) {
	let buffer = "";
	function push(str) {
		buffer += str;
		if (buffer.length > BUFFER_LIMIT) {
			writer.write(new Buffer(buffer));
			buffer = "";
		}
	}
	function traverse(obj, level) {
		switch (typeof obj) {
			case "string":

			case "number":

			case "boolean":
				push(JSON.stringify(obj));
				return;

			default: {
				if (!obj) {
					push("null");
				} else if (obj instanceof Array) {
					let needComma = false;
					push("[");
					for (let j = 0; j < obj.length; j++) {
						if (needComma) push(",");
						traverse(obj[j], level + 1);
						needComma = true;
					}
					push("]");
				} else {
					let keys = Object.keys(obj);
					let needComma = false;
					push("{");
					for (let key of keys) {
						if (needComma) push(",");
						push(JSON.stringify(key));
						push(":");
						traverse(obj[key], level + 1);
						needComma = true;
					}
					push("}\n");
				}
			}
		}
	}
	return new Promise(function(resolve) {
		traverse(obj, 0);
		if (buffer) writer.write(new Buffer(buffer));
		if (!dontend) writer.end();
		resolve(null);
	});
};
