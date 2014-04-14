/*jslint node:true*/

/// REQUIRE
var yaml = require ('js-yaml'),
	fs   = require ( 'fs' );
///

var conf = function (confFile) {
	var confData = {};

	/**
	 * Reload config
	 * @return {object} The config reloaded
	 */
	this.reload = function () {
		confData = yaml.load(fs.readFileSync(confFile, 'utf8'));
		return confData;
	};
	/**
	 * Save new config to config file.
	 * @param  {Object} newConf The config to save
	 * @return {none}
	 */
	this.save = function (newConf) {
		fs.writeFileSync(confFile, yaml.safeDump(confData = newConf, {
			skipInvalid: true
		}));
	};
	/**
	 * Get Config stored in memory.
	 * @return {Object} The config.
	 */
	this.getConf = function () {
		return confData;
	};
	this.reload();
	return this;
};

module.exports = conf;