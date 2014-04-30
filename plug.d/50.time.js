/*jslint node: true*/

var pluginTime = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
};

pluginTime.prototype = {
	name  : '报时',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '回应指令 time',
	load: function () {
		this.regEvent ('msg-cmd-time', function (reply, msg, args) {
			return reply('当前服务器时间: ' + new Date());
		});
	},
	unload: function () {
		// 沒有需要 owo
	}
};

module.exports = pluginTime;