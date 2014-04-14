/*jslint node: true*/
/*global __ROOT__*/

var  fs  = require ('fs'),
	path = require('path');

var pluginReloadAll = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
};

pluginReloadAll.prototype = {
	name  : '插件管理员',
	author: 'Jixun',
	ver   : '1.0',
	desc  : '提供网页前端的插件管理界面。禁用後無法繼續操作了哦。',
	load: function () {
		var that = this;
		// 安裝 Hook
		that.regEvent ('web-plug-list', function () {
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

		that.regEvent('web-plug-res-jx-man-plug',   function () {
			return that.resManPlugPage || (that.resManPlugPage = fs.readFileSync (__dirname + '/plug-manager.d/plug.man.html' ));
		});
		that.regEvent('web-plug-res-jx-man-plug-c', function () {
			return that.resManPlugCont || (that.resManPlugCont = fs.readFileSync (__dirname + '/plug-manager.d/controller.man.js'));
		});

		that.regEvent('web-plug-res-jx-reload-all',   function () {
			return that.resReloadPage || (that.resReloadPage = fs.readFileSync (__dirname + '/plug-manager.d/confirm.html' ));
		});
		that.regEvent('web-plug-res-jx-reload-all-c', function () {
			return that.resReloadCont || (that.resReloadCont = fs.readFileSync (__dirname + '/plug-manager.d/controller.js'));
		});

		that.regEvent('web-plug-api-jx-reload-all', function () {
			// Reload all the plugins.
			that.bot.Plugin.init (true);
		});
		that.regEvent('web-plug-api-jx-mem-usage', function () {
			return process.memoryUsage();
		});
		that.regEvent('web-plug-api-jx-man-plug', function ($_GET, $_POST) {
			var cb = $_POST.rm ? function (file) {
				that.bot.Plugin.unloadPlugin (file);
			} : function (file) {
				that.bot.Plugin.loadPlugin (file, true);
			};
			
			for (var x in $_POST.files)
				cb ($_POST.files[x]);
			
			return { err: 0 };
		});
		that.regEvent('web-plug-api-jx-plug-list', function () {
			// console.log (that.bot.Plugin.plugins);
			var ret = [];
			var plugNames = [];
			var plugs = that.bot.Plugin.plugins, plug;
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
			var realPath = path.resolve(__ROOT__, this.bot.conf.plugPath) + '/';
			var allPlugs = fs.readdirSync(this.bot.conf.plugPath);
			var unLoadedPlugs = [];
			for(var i=0; i<allPlugs.length; i++) {
				if (plugNames.indexOf(allPlugs[i]) == -1 && !fs.lstatSync(realPath + allPlugs[i]).isDirectory())
					unLoadedPlugs.push(allPlugs[i]);
			}
			
			return {
				active: ret,
				disabled: unLoadedPlugs
			};
		});
	},
	unload: function () {
		// 清理內存
		this.resReloadPage = this.resReloadCont = null;
	}
};


module.exports = pluginReloadAll;