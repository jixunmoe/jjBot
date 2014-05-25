/*jslint node: true*/
/* global __ROOT__ */

var fs = require ('fs');

var pluginTestFoo = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
};

pluginTestFoo.prototype = {
	name  : '测试图片上传',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '测试用',
	load: function () {
		this.regEvent ('msg-cmd-imgtest', function (reply, msg, args, fileName) {
			var targetImg = fileName || '10313813_1594437097448864_6148191449117996619_n';
			
			if (!fs.existsSync (__ROOT__ + 'img.d/' + targetImg + '.jpg'))
				return ;
			
			this.bot.Chat.uploadFace (__ROOT__ + 'img.d/' + targetImg + '.jpg', function (fileHash) {
				// this.bot.log.info ('upload done, file hash:', fileHash);

				var advChat = new this.bot.Chat.Builder (true);
				advChat.addImg (fileHash);
				
				reply (advChat);
			}.bind(this));
		});
	},
	unload: function () {
		
	}
};

module.exports = pluginTestFoo;