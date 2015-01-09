/*jslint node: true*/

var pluginRepeator = function () {
	this.repeatCache = {};
};

pluginRepeator.prototype = {
	name  : '復讀姬',
	ver   : '1.0.1',
	author: 'Jixun',
	desc  : '复读 10s 内出现 3 次的内容 [几率为 60%]。',
	load: function () {
		var self = this;
		
		// 安裝 Hook
		this.regEvent ('msg', function (next, strMsg, msg, reply) {
			if (!strMsg) return ;
			
			var repCount = self.repeatCache[strMsg];
			if (repCount) {
				++self.repeatCache[strMsg];
				
				if (repCount == 3 && Math.random () > 0.4)
					reply (strMsg + ' [复读]');
			} else {
				self.repeatCache[strMsg] = 1;

				setTimeout (function () {
					if (self.repeatCache && self.repeatCache[strMsg])
						delete self.repeatCache[strMsg];
				}, 10000);
			}
		});
	},
	unload: function () {
		this.repeatCache = null;
	}
};

module.exports = pluginRepeator;