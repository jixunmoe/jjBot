/*global __FLAG__*/
/*jslint node: true*/

var pluginParseCommand = function (Bot, regEvent) {
	var that = this;
	this.bot = Bot;
	this.regEvent = regEvent;

	this.parseCommand = function (inputCommand) {
		that.cmd = that.cmd ||
					(__FLAG__.cmdPrefix ? __FLAG__.cmdPrefix.join('') : Bot.conf.cmdPrefix)
						.toLowerCase() + '/';

		inputCommand = inputCommand.trim();
		if (inputCommand.indexOf(that.cmd)) {
			// Not a command.
			return false;
		}

		var addStr = false,
			cCode = 0,
			lastChr = 0,
			ret = [''],
			chr = 0,
			curId = 0,
			inQuote = false;

		// Ignore first character
		for (var i = that.cmd.length; i < inputCommand.length; i++) {
			if ((cCode = inputCommand.charCodeAt(i)) == 0x20) { // Space
				if (inQuote) {
					addStr = true;
				} else if (lastChr !== chr && ret[curId]) {
					// If the last character isn't space and last buff has content.
					ret.push('');
					curId++;
				}
			} else if (cCode === 34) { // Quote
				inQuote = !inQuote;
			} else {
				// Normal str
				addStr = true;
			}
			if (addStr)
				ret[curId] += String.fromCharCode(cCode);
			
			lastChr = cCode;
			addStr = false;
		}
		if (!ret[0]) return false;
		ret[0] = 'msg-cmd-' + ret[0].toLowerCase();
		return ret;
	};
};

pluginParseCommand.prototype = {
	name  : '指令解析器!',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '将 前缀/指令 xxx 解析为 指令 (xxx) 的调用。',
	load: function () {
		var self = this;
		this.regEvent ('msg', function (next, strMsg, msg, reply) {
			// 收到消息, 開始檢查 owo
			var cmdObj = self.parseCommand (strMsg);

			// 不是指令, 放弃
			if (!cmdObj) return ;

			cmdObj.splice(1, 0, reply, msg, cmdObj.slice(1));

			// Plugin(next, Command name, reply, msg, args, arg1, arg2, ...)
			self.bot.Plugin.on.apply(self.bot.Plugin, cmdObj);
			return self.bot.Plugin.EVENT.DESTORY;
		});
	},
	unload: function () {
		// 沒有需要 owo
	}
};

module.exports = pluginParseCommand;