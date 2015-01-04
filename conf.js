/*jslint node:true*/

/// REQUIRE
var yaml = require ('js-yaml'),
	_    = require ('underscore'),
	fs   = require ( 'fs' );
///

var conf = function (confFile) {
	var confData = {};

	this.configFile = confFile;

	if (this.configFile && fs.existsSync(this.configFile))
		this.reload();

	return this;
};

_.extend(conf.prototype, {
	/**
	 * Reload config
	 * @return {object} The config reloaded
	 */
	reload: function () {
		this.config = yaml.load(fs.readFileSync(this.configFile, 'utf8'));
		return this.config;
	},

	/**
	 * Save new config to config file.
	 * @param  {Object} newConf The config to save
	 * @return {none}
	 */
	save: function () {
		fs.writeFileSync(this.configFile, yaml.safeDump(this.config = newConf, {
			skipInvalid: true
		}));
	},

	/**
	 * Get Config stored in memory.
	 * @return {Object} The config.
	 */
	getConfig: function () {
		return this.config || {};
	}
});

module.exports = conf;