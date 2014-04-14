/*jslint node: true*/

var pluginHello = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
};

pluginHello.prototype = {
	name  : 'Hello World!',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '回应指令 Hello, 演示用插件',
	load: function () {
		// 安裝 Hook
		this.regEvent ('msg-cmd-hello', function (reply) {
			reply ('Hello from Jixun~');
		});
	},
	unload: function () {
		// 沒有需要 owo
	}
};

module.exports = pluginHello;