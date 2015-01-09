/*jslint node: true*/

var pluginEmoji = function () {  };

pluginEmoji.prototype = {
	name  : '颜文字表情包',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '回复用语句待完善; 颜文字回应几率为 60%',
	load: function () {
		// 安裝 Hook
		this.regEvent ('msg', function (next, strMsg, msg, reply) {
			if (Math.random() > 0.3) {
				var pMsg = strMsg.trim();
				
				if (/\bQ\wQ\b/i.test(pMsg)) {
					// 表情嗷 oAo
					reply ('骚年不哭, 咱们站起来lu~');
				} else if (/\b[o0]\w[0o]\b/i.test(pMsg)) {
					reply ('嗷呜好可怕 oAo');
				} else if (/♂\w/i.test(pMsg)) {
					reply ('G♂O !!');
				} else if (strMsg.indexOf('ω') != -1 || /(\W|^)>[\w\/\\ω ]*?<(\W|$)/.test(pMsg)) {
					reply ('一本满足喵 >ω<');
				} else if (/\b[o0][rt]z<\b/i.test(pMsg)) {
					reply ('你的膝盖就由我收下了嗯 (自豪');
				} else if (strMsg.indexOf('д') != -1) {
					reply ('怎么了怎么了 (；ﾟДﾟ)');
				} else if (/([\b\s]|^)(各位|大家)?早安?[~|～]{0,3}($|[\b\s])/.test(pMsg)) {
					reply ('早上好嗷 oWo');
				} else if (/([\b\s]|^)((各位|大家)?晚安?|(碎|睡)觉)[~|～]{0,3}($|[\b\s])/.test(pMsg)) {
					reply ('晚安 [' + msg.user.nick + ']~ 祝好梦 ~~');
				}
			}
		});
	},
	unload: function () {
		// 沒有需要 owo
	}
};

module.exports = pluginEmoji;