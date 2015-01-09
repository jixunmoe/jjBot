/*jslint node: true*/
/*global __FLAG__*/

var fs = require ('fs');

var pluginReloadAll = function () {
	this.plugDir = 'emu-msg-eve.d';
};

pluginReloadAll.prototype = {
	name  : '模擬訊息事件',
	author: 'Jixun',
	ver   : '1.0',
	desc  : '通过传送 msg 事件模拟指令',

	load: function () {
		var self = this;
		// 安裝 Hook
		self.regEvent ('web-plug-list-sync', function (next) {
			return [{
				route: 'jx-emu-msg-eve',
				name : '模擬訊息事件'
			}];
		});

		self.regEvent('web-plug-res-jx-emu-msg-eve', function (next, data) {
			data.data = self.getFile('index.html');
		});

		self.regEvent('web-plug-res-jx-emu-msg-eve-c', function (next, data) {
			data.data = self.getFile('controller.js');
		});

		self.regEvent('web-plug-api-jx-emu-sendMsg', function (next, data, $_GET, $_POST) {
			self.cmd = self.cmd ||
				(__FLAG__.cmdPrefix ? __FLAG__.cmdPrefix.join('') : self.bot.conf.cmdPrefix)
					.toLowerCase() + '/';
			
			self.bot.Plugin.on('msg', self.cmd + $_POST.cmd, {
				isGroup: $_POST.isGroup,
				from_uin: $_POST.uin,
				from_gid: $_POST.gid,
				user: {
					nick: 'CONSOLE'
				}
			}, function (content) {
				console.log (content);
				self.bot.sendMsg ($_POST.isGroup, $_POST.isGroup ? $_POST.gid : $_POST.uin, content);
			});
		});
	},
	unload: function () {
		// 清理內存
		this.resIndexPage = this.resSendMsgCont = null;
	}
};


module.exports = pluginReloadAll;