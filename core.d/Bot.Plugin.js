/*jslint node: true*/
/*global __FLAG__, debug, __ROOT__ */

var  fs  = require ('fs'),
	path = require ('path');

/**
 * Bot Core Module - BotPlugin
 * @description      Handles the plugin.
 */
var BotPlugin = function (Bot) {
	this.bot = Bot;
	this.log = Bot.mod.log;
	this.plugins = {};
	this.listener = {};
};

function joinObj (def) {
	for (var i=0; i<arguments.length; i++)
		for (var x in arguments[i])
			def[x] = arguments[i][x];
	return def;
}

BotPlugin.prototype = {
	/**
	 * Init the BotPlugin System.
	 * @param  {Boolean} bForceReload Optional, if set to true is reload every plugin.
	 * @return {None   }
	 */
	init: function (bForceReload) {
		var plugins = fs.readdirSync(this.bot.conf.plugPath);

		for (var i = 0; i < plugins.length; i++)
			this.loadPlugin (plugins[i], bForceReload);
	},
	/**
	 * Loads specific plugin by its name.
	 * @param  {String } sPlugFile    The filename of the plugin
	 * @param  {Boolean} bForceReload Optional, if set to true is going to force reload it.
	 * @return {None   }
	 */
	loadPlugin: function (sPlugFile, bForceReload) {
		var plugPath = path.resolve(__ROOT__, this.bot.conf.plugPath + sPlugFile);
		if (fs.lstatSync(plugPath).isDirectory())
			// Is a directory, not a valid plugin.
			return;

		this.log.info ('Loading plugin ', sPlugFile, '...');

		var that = this;

		if (bForceReload)
			this.unloadPlugin (sPlugFile, plugPath);

		var plugInfo = {
			module: sPlugFile,
			events: {}
		};
		this.plugins[sPlugFile] = plugInfo;

		var newPlugin = require (plugPath);
		var thisPlug = new newPlugin (this.bot, function (eventName, cb) {
			// regEvent from sPlugFile.
			var eveIndex = that.reg (eventName, cb);

			if (eveIndex === null)
				return null;

			if (!that.plugins[sPlugFile].events[eventName])
				that.plugins[sPlugFile].events[eventName] = [];

			that.plugins[sPlugFile].events[eventName].push (eveIndex);
		});

		joinObj (plugInfo, {
			name:   thisPlug.name  .toString(),
			ver :   thisPlug.ver   .toString(),
			author: thisPlug.author.toString(),
			desc  : thisPlug.desc  .toString(),
			method: thisPlug
		});

		if (thisPlug.load) {
			thisPlug.load ();
		}

		this.log.info ('Plugin ', sPlugFile, ':', thisPlug.name, thisPlug.ver);
	},
	/**
	 * Unloads specific plugin by given name.
	 * @param  {String } sPlugFile The filename of the plugin
	 * @param  {Boolean} plugPath  The full path of the plugin, should be only used by BotPlugin.loadPlugin function.
	 * @return {None   }
	 */
	unloadPlugin: function (sPlugFile, plugPath) {
		// plugPath = plugPath || path.resolve(__ROOT__, this.bot.conf.plugPath + sPlugFile);

		if (this.plugins[sPlugFile]) {
			this.log.info ('Unload plugin: ', sPlugFile, plugPath || '');

			// Remove all auto callbacks.
			for (var e in this.plugins[sPlugFile].events)
				this.plugins[sPlugFile].events[e].forEach (this.bot.createCallback (this, this.rm, e));
			
			if (debug.event)
				this.log.info (this.plugins[sPlugFile], require.cache[plugPath]);

			var plugMethods = this.plugins[sPlugFile].method;
			// Check if it has unload function
			if (plugMethods.unload) {
				if (debug.event)
					this.log.info ('Call to unload.');

				// If exists, call it.
				plugMethods.unload ();
			}

			// Clear cache, so it can be required again fresh.
			if (debug.event)
				this.log.info ('Delete from require cache.');
			delete require.cache[plugPath];

			// If plugin is in the list, then
			if (this.plugins[sPlugFile]) {
				if (debug.event)
					this.log.info ('Delete from this.plugins cache.');
				// Remove it.
				delete this.plugins[sPlugFile];
			}
		}
	},
	/**
	 * Register an event
	 * @param  {String}   type The event name to be registered.
	 * @param  {Function} cb   The Callback function when event is called
	 * @return {Integer}       Index of the function, or null if cb isn't a function.
	 */
	reg: function (type, cb) {
		// If cb is not callback, then ignore it.
		if ('function' != typeof cb) return null;

		if (debug.event)
			this.log.info ('Register event ->', type, cb.toString());

		// Check if the listener is ready to push.
		if (!this.listener[type])
			this.listener[type] = [];

		// arr.push return the new array length, -1 to get the index.
		return this.listener[type].push (cb) - 1;
	},
	/**
	 * Remove an event listener.
	 * @param  {String} type       The event name to be used
	 * @param  {Integer/Function} indexOrRef The index or the function to be removed.
	 * @return {None}            
	 */
	rm: function (type, indexOrRef) {
		if (debug.event)
			this.log.info ('Remove event ->', type, indexOrRef.toString());

		if (!this.listener[type])
			return;

		if ('number' == typeof indexOrRef) {
			delete this.listener[type][indexOrRef];
		} else if ('function' == typeof indexOrRef) {
			var funcIndex = this.listener.indexOf (indexOrRef);
			if (funcIndex != -1) {
				delete this.listener[type][funcIndex];
			}
		}
	},
	/**
	 * Boardcast an event, async.
	 * @param  {String} type The event name
	 * @param  { .... } args Extra arguments to be passed to the event.
	 * @return { None }
	 */
	on: function (type) {
		var that = this;
		for (var z=1, args=[]; z<arguments.length; z++)
			args.push (arguments[z]);

		setTimeout (function () {
			if (debug.event)
				that.log.info ('Call event ->', type, '\nWith arguments:', args);
			
			if (that.listener[type]) {
				for (var i=that.listener[type].length; i--; ) {
					if (!that.listener[type][i])
						continue;

					if (that.listener[type][i].apply(that, args)) {
						return;
					}
				}
			}
		}, 1);
	},
	/**
	 * Boardcast an event with return value.
	 * @param  {String}  type    The event name
	 * @param  {Boolean} bSingle Set to true if you only want the first value fetched.
	 * @param  { .... }  args    Extra arguments to be passed to the event.
	 * @return { Any  }          The value returned by its event handler.
	 */
	onSync: function (type, bSingle) {
		for (var z=2, args=[]; z<arguments.length; z++)
			args.push (arguments[z]);

		var ret = bSingle ? null : [], retData;
		if (this.listener[type]) {
			for (var i=0; i<this.listener[type].length; i++) {
				if (!this.listener[type][i])
					continue;
				if (bSingle)
					return this.listener[type][i].apply(this, args);

				// If is not singal, just stack the returns.
				ret.push(this.listener[type][i].apply(this, args));
			}
		}
		return ret;
	}
};

module.exports = BotPlugin;