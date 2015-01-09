/*jslint node: true*/
/* global __ROOT__ */

var fs = require ('fs');

var pluginTestFoo = function () { };

pluginTestFoo.prototype = {
	name  : '图片分享',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '<jj/img 图片名> 图片后缀必须为「.jpg」(Linux 请确保大小写正确)',
	load: function () {
		this.regEvent ('msg-cmd-img', function (reply, msg, args, fileName) {
			var targetImg = fileName || 'default';
			
			if (!fs.existsSync (__ROOT__ + 'img.d/' + targetImg + '.jpg'))
				return ;
			
			this.bot.Chat.uploadFace (__ROOT__ + 'img.d/' + targetImg + '.jpg', function (fileHash) {
				// this.bot.log.info ('upload done, file hash:', fileHash);

				var advChat = new this.bot.Chat.Builder (msg.isGroup);
				advChat.addImg (fileHash);
				// advChat.addStr ('xD > ' + targetImg);
				
				reply (advChat);
			}.bind(this));
		});
	},
	unload: function () {
		
	}
};

module.exports = pluginTestFoo;