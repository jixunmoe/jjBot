/**
 * Check if the module is debugged from commandline.
 * @param  {String}   module The module to check
 * @return {Boolean}         See function desc.
 */
GLOBAL.isDebug = function (module) { return __FLAG__.debug.indexOf (module) !== -1; };

module.exports = function (mod) {
	mod.log.info ('Fix debug info');

	// TypeError undefined fix.
	if (!__FLAG__.debug) __FLAG__.debug = [];

	GLOBAL.debug = {};
	__FLAG__.debug.forEach (function (e) { debug[e] = 1; });
};