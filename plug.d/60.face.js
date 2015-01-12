/*jslint node: true*/

var pluginFace = function () { };

pluginFace.prototype = {
	name  : '表情测试',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '回应指令 face',
	load: function () {
		var self = this;
		this.regEvent ('msg-cmd-face', function (next, reply, msg, args) {
			var rplMsg = new self.bot.Chat.Builder();
			var n = 3;
			while (n --> 0)
				rplMsg.addFace (Math.floor(Math.random() * 150));

			rplMsg.addStr ('\n\n这位客官, 你要的东西到了~');

			reply (rplMsg);
		});
	},
	unload: function () {
		// 沒有需要 owo
	}
};

module.exports = pluginFace;