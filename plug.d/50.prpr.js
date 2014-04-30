/*jslint node: true*/

var sprintf = require('util').format;
var pluginPrpr = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
};

pluginPrpr.prototype = {
	name  : '舔一舔',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '回应指令 prpr',
	load: function () {
		// 安裝 Hook
		var bodyPart = ['手掌', '双脚', '熊脸', '脸蛋', '鼻子', '小嘴', '咪咪', '大雕',
						'蛋蛋', '大× [不忍直视]', '双眼', '脖子', '胸口', '大腿', '脚踝', '那里 >////<', '腋下', '耳朵', '小腿', '袜子', '臭脚'];
		this.regEvent ('msg-cmd-prpr', function (reply, msg, args, who, where) {
			if (!who)
				who = '自己';
			
			return reply(
				sprintf('%s 舔了舔 %s 的 %s... 我好兴奋啊!',
					msg.user.nick, who.replace(/\s+/g, ' '),
					where ? where : bodyPart[Math.floor(Math.random() * bodyPart.length)]
			));
		});
	},
	unload: function () {
		// 沒有需要 owo
	}
};

module.exports = pluginPrpr;