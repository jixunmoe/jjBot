/*jslint node: true*/

var pluginHello = function () { };

pluginHello.prototype = {
	name  : 'Ping!',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '回应指令 Ping, 演示用插件',
	load: function () {
		// 安裝 Hook
		this.regEvent ('msg-cmd-ping', function (next, reply) {
			reply ('Pong!');
		});
	},
	unload: function () {
		// 沒有需要 owo
	}
};

module.exports = pluginHello;