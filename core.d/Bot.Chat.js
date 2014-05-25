/*jslint node: true*/
/*global __FLAG__, debug*/

var fs = require('fs'),
	crypto = require('crypto');

function int (flag) {
	return flag ? 1 : 0;
}

function joinObj (def) {
	if (!def instanceof Object) def = {};
	for (var i=0; i<arguments.length; i++)
		for (var x in arguments[i])
			def[x] = arguments[i][x];
	return def;
}

var BotChat = function (Bot) {
	this.bot = Bot;
};

BotChat.prototype = {
	init: function () {
		var Bot = this.bot;
		this.uploadHistory = Bot.mod.cache.load ('uploadHistory');
		if (!this.uploadHistory[Bot.auth.qqnum])
			this.uploadHistory[Bot.auth.qqnum] = [];

		this.history = this.uploadHistory[Bot.auth.qqnum];

		this.saveHistory = function () {
			Bot.mod.cache.save ('uploadHistory', this.uploadHistory);
		};

		// Advanced Message Builder
		this.Builder = function (isGroup, defMsg, font) {
			this.isGroup = !!isGroup;

			this.msg  = defMsg || [];
			this.font = joinObj ({
				// Bold, Italic, Underline
				// 1: True, 0: False
				style: [0, 0, 0],
				color: '000000',
				size:  11,
				name:  '微软雅黑'
			}, font);
		};

		this.Builder.prototype = {
			append: function () {
				for (var i=0; i<arguments.length; i++)
					this.addStr (arguments[i]);
			},

			addStr: function (str) {
				this.msg.push (str);
			},

			addImg: function (imgHash) {
				var msgArr = ['cface', imgHash + '.JPG'];
				if (this.isGroup) msgArr.splice (1, 0, 'group');

				this.msg.push (msgArr);
				this.msg.push ('');
				
				// 因为加了图片，所以需要修正签名
				this.fixSign = true;
			},

			setFontFace: function (fontFace) {
				this.font.name = fontFace;
			},
			setFontStyle: function () {
				for (var i=0; i<Math.min(3, arguments.length); i++) {
					this.font.style[i] = int(arguments[i]);
				}
			},

			getMsg: function () {
				return this.msg.concat([['font', this.font]]);
			}
		};
	},
	
	uploadFace: function (filePath, cb) {
		// http://up.web2.qq.com/cgi-bin/cface_upload
		// * 全 Cookie
		
		var fileCheckHash = fs.createReadStream(filePath);
		var hash = crypto.createHash('md5');
		hash.setEncoding('hex');
		
		fileCheckHash.on('end', function() {
			hash.end();
			var fileHash = hash.read().toUpperCase ();
			fileCheckHash.destroy ();
			
			this.bot.log.info ('Upload cface with hash:', fileHash);
			if (-1 !== this.history.indexOf (fileHash)) {
				// 已经有了，直接把 Hash 传回去。
				this.bot.log.info ('cface in history, just use it.');
				process.nextTick (cb.bind({}, fileHash));
				return ;
			}
			
			// 加到队列避免重复上传同一图片
			var queueName = 'uploadFace-' + fileHash;
			if (this.bot.mod.queue.reg (queueName, cb))
				return;
			
			/*
				custom_face: 图片文件
				f: 回调函数，用原来的也不错w「EQQ.View.ChatBox.uploadCustomFaceCallback」
				vfwebqq: 登陆时获取的 vfwebqq
			*/
			this.bot.API.upload ('/cgi-bin/cface_upload', [
				['custom_face', fs.createReadStream(filePath), {
					filename: +new Date() + Math.random() + '.jpg'
				}],
				['f', 'EQQ.View.ChatBox.uploadCustomFaceCallback'],
				['vfwebqq', this.bot.auth.vfwebqq]
			], function (data) {
				this.history.push (fileHash);
				this.saveHistory ();
				
				this.bot.mod.queue.done (queueName, fileHash);
			}.bind(this));
		}.bind(this));
		
		fileCheckHash.pipe(hash);
	}
};

module.exports = BotChat;