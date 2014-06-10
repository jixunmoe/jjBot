/*jslint node: true*/

var pluginRepeator = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
	this.repeatCache = {};
};

pluginRepeator.prototype = {
	name  : '復讀姬',
	ver   : '1.0.1',
	author: 'Jixun',
	desc  : '复读 10s 内出现 3 次的内容 [几率为 60%]。',
	load: function () {
		var that = this;
		
		// 安裝 Hook
		this.regEvent ('msg', function (strMsg, msg, reply) {
			if (!strMsg) return ;
			
			var repCount = that.repeatCache[strMsg];
			if (repCount) {
				++that.repeatCache[strMsg];
				
				if (repCount == 3 && Math.random () > 0.4)
					reply (strMsg + '[跟风]');
			} else {
				that.repeatCache[strMsg] = 1;

				setTimeout (function () {
					if (that.repeatCache && that.repeatCache[strMsg])
						delete that.repeatCache[strMsg];
				}, 10000);
			}
		});
	},
	unload: function () {
		this.repeatCache = null;
	}
};

module.exports = pluginRepeator;