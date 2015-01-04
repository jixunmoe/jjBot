/*jslint node: true*/
/*global __ROOT__*/

var  fs  = require ('fs'),
	path = require('path');

var pluginReloadAll = function () {
	this.plugDir = __dirname + '/plug-manager.d/';
};

pluginReloadAll.prototype = {
	name  : '插件管理员',
	author: 'Jixun',
	ver   : '1.0',
	desc  : '提供网页前端的插件管理界面。禁用後無法繼續操作了哦。',
	load: function () {
		var self = this;
		// 安裝 Hook
		self.regEvent ('web-plug-list-sync', function () {
			return [{
				// 首先弄一個分隔符
				type: 1
			}, {
				route: 'jx-man-plug',
				name : '管理当前插件'
			}, {
				route: 'jx-reload-all',
				name : '重載所有插件'
			}];
		});

		self.regEvent('web-plug-res-jx-man-plug',   function (next, data) {
			data.data = self.getFile('plug.man.html');
		});
		self.regEvent('web-plug-res-jx-man-plug-c', function (next, data) {
			data.data = self.getFile('controller.man.js');
		});

		self.regEvent('web-plug-res-jx-reload-all',   function (next, data) {
			data.data = self.getFile('confirm.html');
		});
		self.regEvent('web-plug-res-jx-reload-all-c', function (next, data) {
			data.data = self.getFile('controller.js');
		});

		self.regEvent('web-plug-api-jx-reload-all', function () {
			// Reload all the plugins.
			self.bot.Plugin.init (true);
		});
		self.regEvent('web-plug-api-jx-mem-usage', function (next, data) {
			data.data = process.memoryUsage();
		});
		self.regEvent('web-plug-api-jx-man-plug', function (next, data, $_GET, $_POST) {
			var cb = $_POST.rm ? function (file) {
				self.bot.Plugin.unloadPlugin (file);
			} : function (file) {
				self.bot.Plugin.loadPlugin (file, true);
			};

			for (var x in $_POST.files)
				cb ($_POST.files[x]);
			
			data.data = { err: 0 };
		});
		self.regEvent('web-plug-api-jx-plug-list', function (next, data) {
			// console.log (self.bot.Plugin.plugins);
			var ret = [];
			var plugNames = [];
			var plugs = self.bot.Plugin.plugins, plug;
			for (var x in plugs) {
				plugNames.push (x);
				plug = plugs[x];
				
				ret.push ({
					name: plug.name,
					author: plug.author,
					ver: plug.ver,
					desc: plug.desc,
					file: x
				});
			}
			var realPath = path.resolve(__ROOT__, self.bot.conf.plugPath) + '/';
			var allPlugs = fs.readdirSync(self.bot.conf.plugPath);
			var unLoadedPlugs = [];
			for(var i=0; i<allPlugs.length; i++) {
				if (plugNames.indexOf(allPlugs[i]) == -1 && !fs.lstatSync(realPath + allPlugs[i]).isDirectory()) {
					unLoadedPlugs.push({
						name: allPlugs[i],
						blacklist: self.bot.Plugin.isBlacklist(allPlugs[i])
					});
				}
			}
			
			data.data = {
				active: ret,
				disabled: unLoadedPlugs
			};
		});
	},
	unload: function () {
		
	}
};


module.exports = pluginReloadAll;