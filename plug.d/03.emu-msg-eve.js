/*jslint node: true*/
/*global __FLAG__*/

var fs = require ('fs');

var pluginReloadAll = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
};

pluginReloadAll.prototype = {
	name  : '模擬訊息事件',
	author: 'Jixun',
	ver   : '1.0',
	desc  : '通过传送 msg 事件模拟指令',
	load: function () {
		var that = this;
		// 安裝 Hook
		that.regEvent ('web-plug-list', function () {
			return [{
				route: 'jx-emu-msg-eve',
				name : '模擬訊息事件'
			}];
		});

		that.regEvent('web-plug-res-jx-emu-msg-eve',   function () { return that.resIndexPage   || 
			(that.resIndexPage   = fs.readFileSync (__dirname + '/emu-msg-eve.d/index.html'  ));
		});
		that.regEvent('web-plug-res-jx-emu-msg-eve-c', function () { return that.resSendMsgCont ||
			(that.resSendMsgCont = fs.readFileSync (__dirname + '/emu-msg-eve.d/controller.js'));
		});

		that.regEvent('web-plug-api-jx-emu-sendMsg', function ($_GET, $_POST) {
			that.cmd = that.cmd ||
				(__FLAG__.cmdPrefix ? __FLAG__.cmdPrefix.join('') : that.bot.conf.cmdPrefix)
					.toLowerCase() + '/';
			
			that.bot.Plugin.on('msg', that.cmd + $_POST.cmd, {
				isGroup: $_POST.isGroup,
				from_uin: $_POST.uin,
				from_gid: $_POST.gid,
				user: {
					nick: 'CONSOLE'
				}
			}, function (content) {
				console.log (content);
				that.bot.sendMsg ($_POST.isGroup, $_POST.isGroup ? $_POST.gid : $_POST.uin, content);
			});
		});
	},
	unload: function () {
		// 清理內存
		this.resIndexPage = this.resSendMsgCont = null;
	}
};


module.exports = pluginReloadAll;