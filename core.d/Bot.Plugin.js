/*jslint node: true*/
/*global __FLAG__, debug, __ROOT__ */

var  fs  = require ('fs'),
	path = require ('path');

var _ = require('underscore');
var yaml = require ('js-yaml');

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

var pluginProto = {
	_cache_files: {},
	_submods: [],

	getFile: function (fn) {
		var path = this.plugDir + fn;
		if (!fs.existsSync(path))
			return '';

		var mtimeNow = fs.statSync(path).mtime;
		if (!this._cache_files[fn] || mtimeNow > this._cache_files[fn].mtime) {
			this._cache_files[fn] = {
				content: fs.readFileSync(path),
				mtime: mtimeNow
			};
		}

		return this._cache_files[fn].content;
	},

	loadPluginConfig: function (defaults) {
		var config;
		try {
			config = yaml.load(this.getFile('config.yaml'));
		} finally {
			this.config = _.extend({}, defaults, config || {});
		}
	},

	loadPluginModules: function () {
		var self = this;

		fs.readdirSync(self.plugDir).map(function (fn) {
			if (fn.slice(-3).toLowerCase() != '.js')
				return ;

			var fullpath = path.resolve(self.plugDir, fn);

			delete self.onSubModuleLoad;
			_.extend(self, require(fullpath));
			if (self.onSubModuleLoad)
				self.onSubModuleLoad();

			self._submods.push(fullpath);
		});
	},

	removeSubModule: function () {
		_.each(this._submods, function (mod) {
			delete require.cache[mod];
		});
	}
};

BotPlugin.prototype = {
	EVENT: {
		ASYNC: false,
		DESTORY: true,
		PASS: 0
	},

	_regEvent: function (meta, plugin, /**/ eventName, cb) {
		var eveIndex = this.reg (eventName, cb.bind(plugin));

		if (eveIndex === null)
			return false;

		if (!meta.events[eventName])
			meta.events[eventName] = [];

		meta.events[eventName].push (eveIndex);
	},

	/**
	 * Init the BotPlugin System.
	 * @param  {Boolean} bForceReload Optional, if set to true is reload every plugin.
	 * @return {None   }
	 */
	init: function (bForceReload) {
		var plugins = fs.readdirSync(this.bot.conf.plugPath);

		for (var i = 0; i < plugins.length; i++)
			this.loadPlugin (plugins[i], bForceReload, true);
	},
	
	isBlacklist: function () {
		if (!this.bot.conf.blacklist)
			// There isn't any blacklist defined.
			return false;
		
		for (var i=0, plugName; i<arguments.length; i++)
			if (-1 !== this.bot.conf.blacklist.indexOf (arguments[i].replace(/^\d+\.|\.js$/g, '')))
				// One of the plugin is on the black list.
				return true;
		return false;
	},
	
	/**
	 * Loads specific plugin by its name.
	 * @param  {String } sPlugFile    The filename of the plugin
	 * @param  {Boolean} bForceReload Optional, if set to true is going to force reload it.
	 * @return {None   }
	 */
	loadPlugin: function (sPlugFile, bForceReload, bCheckBlacklist) {
		var plugPath = path.resolve(__ROOT__, this.bot.conf.plugPath + sPlugFile);
		if (fs.lstatSync(plugPath).isDirectory())
			// Is a directory, not a valid plugin.
			return;
		
		var self = this;
		
		if (this.isBlacklist(sPlugFile)) {
			return ;
		}
		
		self.log.info ('Load plugin ', sPlugFile, '...');

		if (bForceReload)
			self.unloadPlugin (sPlugFile, plugPath);

		var plugInfo = {
			module: sPlugFile,
			events: {}
		};
		self.plugins[sPlugFile] = plugInfo;

		var thePlugin = require (plugPath);
		_.extend (thePlugin.prototype, pluginProto);

		var _regEvent = self._regEvent.bind(self, self.plugins[sPlugFile], plugin);
		var plugin = new thePlugin (self.bot, _regEvent);
		plugin.bot = self.bot;
		plugin.regEvent = _regEvent;

		_.extend (plugInfo, {
			name:   plugin.name  .toString(),
			ver :   plugin.ver   .toString(),
			author: plugin.author.toString(),
			desc  : plugin.desc  .toString(),
			instance: plugin
		});

		if (plugin.load) {
			if (debug.event)
				self.log.info ('Call to plugin.load');
			plugin.load ();
		}

		self.log.info ('Plugin ', sPlugFile, ':', plugin.name, plugin.ver);
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
				this.plugins[sPlugFile].events[e].forEach (this.rm.bind (this, e));
			
			if (debug.event)
				this.log.info (this.plugins[sPlugFile], require.cache[plugPath]);

			var plugin = this.plugins[sPlugFile].instance;
			// Check if it has unload function
			if (plugin.unload) {
				if (debug.event)
					this.log.info ('Call to unload.');

				// If exists, call it.
				plugin.unload ();
			}

			plugin.removeSubModule();

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
			this.log.info ('Register event ->', type);

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

	on_cb: function (type, onComplete) {
		var args = [].slice.call(arguments, 2);
		args.splice(0,0,{ done: onComplete, type: type });
		return this.on.apply(this, args);
	},

	/**
	 * Boardcast an event, async.
	 * @param  {String} type The event name
	 * @param  { .... } args Extra arguments to be passed to the event.
	 * @return { None }
	 */
	on: function (type) {
		var self = this;
		var args = Array.prototype.slice.call(arguments);

		var done;
		if ('function' == typeof type.done) {
			done = type.done;
			type = type.type;
		}

		if (debug.event)
			self.log.info ('Call event ->', type, '\nWith arguments:', args.slice(1));

		if (!self.listener[type])
			return ;

		var evLoop = new self.bot.Looper(self.listener[type], null, 0);

		evLoop.setLooper(function (next, fooLooper) {
			args.splice(0, 1, next);

			/**
			 * evResult
			 * true:  Destory loop chain.
			 * false: Async event, wait for me
			 * other: event complete, next.
			 */
			var evResult = fooLooper.apply(self, args);

			if (evResult === true) {
				this.destory();
			} else if (evResult !== false) {
				next();
			}
		});

		evLoop.onComplete = done;
		evLoop.loop ();
	},

	onSync: function (type) {
		var self = this;

		type += '-sync';

		var args = Array.prototype.slice.call(arguments, 1);
		if (debug.event)
			self.log.info ('Call event ->', type, '\nWith arguments:', args.slice(1));

		if (!self.listener[type])
			return ;

		return self.listener[type]
			.map(function (fn) { return fn.apply(self, args); })
			.filter(function (data) { return data; });
	}
};

module.exports = BotPlugin;