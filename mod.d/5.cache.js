var fs = require ('fs');

var mCache = function (conf, mod) {
	this.cacheD = conf.cachePath;
	this.log = mod.log;
	this.cache = {};
};

mCache.prototype = {
	/**
	 * Save object to cache
	 * @param  {String} name
	 * @param  {Object} value
	 * @return {none}
	 */
	save: function (name, value) {
		if (debug.cache) this.log.info ('Save cache to:', name);
		this.cache [name] = value;
		
		try {
			fs.writeFileSync (this.cacheD + name, JSON.stringify(value));
		} catch (e) {
			this.log.error ('Error while saving cache', name, '-> ', e.message, e.stack);
		}
	},
	/**
	 * Load from cache
	 * @param  {String} name Name of the file
	 * @param  {Object} def  Default value
	 * @return {Object} Cached value
	 */
	load: function (name, def, bForceReload) {
		if (debug.cache) this.log.info ('Load cache from:', name);

		// Check if cache already exists
		if (!bForceReload && this.cache[name])
			return this.cache[name];


		var that = this;

		// Store cache in to memory
		this.cache[name] = (function () {
			if (fs.existsSync (that.cacheD + name)) {
				try {
					return JSON.parse (fs.readFileSync(that.cacheD + name));
				} catch (e) {
					that.log.error ('Error while loading cache', name, '-> ', e.message, e.stack);
					return def || {};
				}
			}
			return def || {};
		}) ();

		return this.cache[name];
	},
	/**
	 * Remove Cache from memory and filesystem
	 * @param  {String} name The name of the cache
	 * @return {none}
	 */
	del: function (name) {
		if (debug.cache) this.log.info ('Delete cache from:', name);
		delete this.cache[name];
		fs.unlinkSync (this.cacheD + name);
	}
};

module.exports = function (conf, mod) {
	return new mCache (conf, mod);
};
