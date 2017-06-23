"use strict";

class WorkFlow {
	constructor(config) {
		this.config = config;
		this.items = {};
	}
	introduce(item, value) {
		this.items[item] = value;
		return this;
	}
	remove(item) {
		this.items[item] = null;
		return this;
	}
	async exec(G, ...args) {
		return await G.call(this, this, ...args);
	}
	async run(f, ...args) {
		return await f.call(this, this, ...args);
	}
}

module.exports = WorkFlow;
