/*jslint node: true*/
/* global $uc */

var _ = require('underscore');
var path = require('path');
var sprintf = require('util').format;

function joinObj (def) {
	for (var i=0; i<arguments.length; i++)
		for (var x in arguments[i])
			def[x] = arguments[i][x];
	return def;
}

var pluginUserCenter = function (Bot, regEvent) {
	global.$uc = this;

	this.bot = Bot;
	this.mod = Bot.mod;
	this.regEvent = regEvent;
	this.ext = Bot.mod.db;
	this.db = this.ext.db;
	
	Bot.mod.log.info ('Init uc database ...');
	this.db.query (sprintf(this.ext.__(function () {/*
	create table if not exists `jB_user` (
		`qNum` VARCHAR(20) NOT NULL,
		`userNick` VARCHAR(20) NULL,
		`tLastSign` TIMESTAMP NULL,
		`dMoneyLeft` FLOAT NULL,
		`pems` text NULL,
		UNIQUE INDEX `qNum` (`qNum` ASC)
	)ENGINE = %s DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
	*/}), this.ext.conf.engine));

	this.plugDir = __dirname + '/uc.d/';
	this.loadPluginConfig  ();
};

pluginUserCenter.prototype = {
	name  : '用户中心!',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '用户签到以及其他功能，依赖 db 模组。',

	load: function () {
		this.registerEvents ();
		this.loadPluginModules ();
	},

	// uc.d/sign.js for the complete version.
	can: function (u, n, def) {
		return def;
	},

	newUser: function (qqNum, cb) {
		var self = this;
		
		self.db.query('insert ignore into `jB_user` (`qNum`, `dMoneyLeft`) values (?, ?)', 
							[qqNum, self.bot.conf.user.default.dMoneyLeft]);
		
		cb (joinObj({
			qNum: qqNum,
			isNew: true,
			pems: {can: [], no: []}
		}, this.bot.conf.user.default));
	},
	getUser: function (uin, cb) {
		if (!cb) return null; // Invalid request.
		
		var self = this;
		var userNum = self.bot.friendHashTable.table[uin];
		if (userNum) {
			self.getUserByNum (userNum, cb);
			return ;
		}
		
		self.bot.log.warn ('User not found for uin:', uin);
		self.bot.uinToNum(uin, false, function (userNum) {
			self.getUserByNum (userNum, cb);
		});
	},
	getUserByNum: function (userNum, cb) {
		if (!cb) return null; // Invalid request.
		
		var self = this;
		
		var queueName = 'uc-get-user-' + userNum;
		
		// Register queue.
		if (self.mod.queue.reg (queueName, cb)) return;
		
		self.db.query ('select * from `jB_user` where `qNum`=? limit 1', userNum, function (err, data) {
			// There's an error!
			if (err) {
				self.bot.mod.queue.unlock (queueName);
				return;
			}

			// User not exist, create an account.
			if (!data.length) {
				self.newUser (userNum, function (r) {
					self.bot.mod.queue.done (queueName, r);
				});
				return;
			}

			var ret = data[0];
			
			// Parse permission config
			if (ret.pems) {
				ret.pems = JSON.parse(ret.pems);
				
				if (!ret.pems.can)
					ret.pems.can = [];
				
				if (!ret.pems.no)
					ret.pems.no = [];
			} else {
				ret.pems = {can: [], no: []};
			}
			
			// User exists, callback to it.
			self.bot.mod.queue.done (queueName, ret);
		});
	},
	_isSignValid: function (timeNow, timeLastSign) {
		// 86400000 = 24 * 60 * 60 * 1000
		// If user already sign in within 24 hours, 
		// ... and date is same
		
		return timeNow - timeLastSign > 86400000 || timeLastSign.getDate() != timeNow.getDate();
	},
	registerEvents: function () {
		var self = this;

		self.regEvent ('msg', function (next, strMsg, msg, reply) {
			self.getUser (msg.from_uin, function (user) {
				if (!self.can(user, 'talk', true)) {
					next (false);
					return ;
				}

				msg.ucdata = user;
				msg.ucdata.nick = msg.ucdata.userNick || msg.user.nick;
				next ();
			});

			return self.bot.Plugin.EVENT.ASYNC;
		});

		self.regEvent ('msg-cmd-nick', function (next, reply, msg, args) {
			var user = msg.ucdata;
			
			if (args.length && self.can(user, 'set-nick', true)) {
				var nickName = args.join(' ').replace(/\s+/g, ' ');
				
				if (!self.can(user, 'set-nick-op', false) && /官方|管理|admin|权限/i.test(nickName)) {
					reply ('[' + msg.user.nick + '] 昵称更新失败: 请勿做死。');
					return ;
				}

				self.db.query (
					'update `jB_user` SET userNick=? WHERE `qNum` = ?;',
					[nickName, user.qNum]
				);

				reply (sprintf('昵称更改为 %s 成功~~', nickName));
			} else {
				reply (sprintf('%s 的名字是: %s', msg.user.nick, user.userNick || '<无>'));
			}
		});
		
		/*
		self.regEvent ('msg-cmd-', function (next, reply, msg, cmdObj) {
			self.getUser (msg.from_uin, function (user) {
				// TODO: Code here
			});
		});
		*/
	},
	unload: function () {
		// 清理污染的命名空间
		delete global.$uc;
	}
};

module.exports = pluginUserCenter;