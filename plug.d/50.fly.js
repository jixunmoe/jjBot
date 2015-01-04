/*jslint node: true*/

var pluginHello = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
};

pluginHello.prototype = {
	name  : 'jjFly!',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '没什么, 弄着玩的',
	load: function () {
		// 安裝 Hook
		this.regEvent ('msg-cmd-fly', function (next, reply) {
			reply ('jj fly~');
		});
	},
	unload: function () {
		// 沒有需要 owo
	}
};

module.exports = pluginHello;