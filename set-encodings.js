"use strict";

async function SetEncodings(ctx, demand, config) {
	const font = this.items[demand];
	for (let k in config) {
		font.OS_2.ulCodePageRange1[k] = config[k];
	}
}

module.exports = SetEncodings;
