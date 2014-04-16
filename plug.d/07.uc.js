/*jslint node: true*/

var pluginSign = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
	this.ext = Bot.mod.db;
	this.db = this.ext.db;
	
	Bot.mod.log.info ('Init. database ...');
	this.db.query (this.ext._(this.ext.__(function () {/*
	create table if not exists `jB_user` (
		`qNum` VARCHAR(20) NOT NULL,
		`userNick` VARCHAR(20) NOT NULL,
		`tLastSign` TIMESTAMP NULL,
		`dMoneyLeft` FLOAT NULL,
		UNIQUE INDEX `qNum_UNIQUE` (`qNum` ASC)
	)ENGINE = %s;
	*/}), this.ext.conf.engine));
};

function joinObj (def) {
	for (var i=0; i<arguments.length; i++)
		for (var x in arguments[i])
			def[x] = arguments[i][x];
	return def;
}

pluginSign.prototype = {
	name  : '用户中心!',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '用户签到以及其他功能。',
	newUser: function (qqNum, cb) {
		var that = this;
		
		that.db.query('insert ignore into `jB_user` (`qNum`, `dMoneyLeft`) values (?, ?)', 
							[qqNum, that.bot.conf.user.default.dMoneyLeft]);
		
		cb (joinObj({
			qNum: qqNum,
			newUser: true
		}, this.bot.conf.user.default));
	},
	getUser: function (uin, cb) {
		if (!cb) return null; // Invalid request.
		
		var that = this;
		that.bot.uinToNum(uin, false, function (userNum) { that.getUserByNum (userNum, cb); });
	},
	getUserByNum: function (userNum, cb) {
		var that = this;
		
		that.db.query ('select * from `jB_user` where `qNum`=? limit 1', userNum, function (err, data) {
			// There's an error!
			if (err) return;

			// User not exist, create an account.
			if (!data.length) {
				that.newUser (userNum, cb);
				return;
			}

			// User exists, callback to it.
			cb (data[0]);
		});
	},
	load: function () {
		var that = this;
		that.regEvent ('msg-cmd-sign', function (reply, msg, cmdObj) {
			that.getUser (msg.from_uin, function (user) {
				var signStr = '[' + msg.user.nick + '] ';
				if (user.newUser || (function (timeNow, timeLastSign) {
					// 86400000 = 24 * 60 * 60 * 1000
					// If user already sign in within 24 hours, 
					// ... and date is same
					return timeNow - timeLastSign > 86400000 || timeLastSign.getDate() != timeNow.getDate();
				})(new Date(), new Date(user.tLastSign))) {
					var signMoney = Math.floor(that.bot.conf.user.signRange.min + Math.random() * 
						(that.bot.conf.user.signRange.max - that.bot.conf.user.signRange.min));
					
					that.db.query ('update `jB_user` SET `tLastSign`=now(), dMoneyLeft=dMoneyLeft+? WHERE `qNum` = ?;',
									[signMoney, user.qNum]);
					
					signStr += that.ext._ ('签到成功! 获得 %s %s', signMoney, that.bot.conf.user.currency);
				} else {
					// TODO: Signed in within a day.
					signStr += that.ext._ ('签到失败: 您已经在 %s 签到过了', user.tLastSign);
				}
				
				reply (signStr);
			});
		});
	},
	unload: function () {
		// 沒有需要 owo
	}
};

module.exports = pluginSign;