/*jslint node: true*/

var pluginHelloWorld = function () {};

pluginHelloWorld.prototype = {
	// 插件名称
	name  : 'Hello World',
	// 插件版本
	ver   : '1.0',
	// 插件作者
	author: 'Jixun',
	// 插件简介
	desc  : '用户签到以及其他功能，依赖 db 模组。',
	
	// 插件调用，用于注册事件等。
	load: function () {
		this.regEvent ('msg', function (next, sMsg, msg, reply) {
			// 检查输入数据是否包含 hello 文字。
			if (sMsg.indexOf('hello') !== 0) {
				// 回应一句 Hello World! 给用户。
				reply('Hello world!');
				return true; // 表示这条信息已经由这个插件处理了，不需要其它插件接手处理。
			}
		});
		
		this.regEvent ('msg-cmd-hi', function (next, reply, msg, args, toWho) {
			// 如果用户未指定发送给谁, 则使用发送者的昵称
			if (!toWho) toWho = msg.user.nick;
			
			reply ('你好啊 ' + toWho);
		});
	},
	// 插件卸载，用于释放资源等。
	unload: function () {
	}
};

module.exports = pluginHelloWorld;