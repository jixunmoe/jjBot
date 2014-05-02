/*jslint node: true*/

var pluginUserCenter = function (Bot, regEvent) {
	this.bot = Bot;
	this.mod = Bot.mod;
	this.regEvent = regEvent;
	this.ext = Bot.mod.db;
	this.db = this.ext.db;
	
	Bot.mod.log.info ('Init. database ...');
	this.db.query (this.ext._(this.ext.__(function () {/*
	create table if not exists `jB_user` (
		`qNum` VARCHAR(20) NOT NULL,
		`userNick` VARCHAR(20) NULL,
		`tLastSign` TIMESTAMP NULL,
		`dMoneyLeft` FLOAT NULL,
		`pems` text NULL,
		UNIQUE INDEX `qNum_UNIQUE` (`qNum` ASC)
	)ENGINE = %s DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
	*/}), this.ext.conf.engine));
};

function joinObj (def) {
	for (var i=0; i<arguments.length; i++)
		for (var x in arguments[i])
			def[x] = arguments[i][x];
	return def;
}

function can (user, node, def) {
	// Not a valid user object.
	if (!user || !user.pems) return def;
	
	// First, check if is banned to use the command.
	return  user.pems.no && user.pems.no.indexOf (node) != -1 ? false
		// Then check if is in the allowed list.
		: user.pems.can && user.pems.can.indexOf (node) != -1 ? true
			// If not found, then return default permission.
			: def;
}

pluginUserCenter.prototype = {
	name  : '用户中心!',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '用户签到以及其他功能，依赖 db 模组。',
	newUser: function (qqNum, cb) {
		var that = this;
		
		that.db.query('insert ignore into `jB_user` (`qNum`, `dMoneyLeft`) values (?, ?)', 
							[qqNum, that.bot.conf.user.default.dMoneyLeft]);
		
		cb (joinObj({
			qNum: qqNum,
			newUser: true,
			pems: {can: [], no: []}
		}, this.bot.conf.user.default));
	},
	getUser: function (uin, cb) {
		if (!cb) return null; // Invalid request.
		
		var that = this;
		that.bot.uinToNum(uin, false, function (userNum) { that.getUserByNum (userNum, cb); });
	},
	getUserByNum: function (userNum, cb) {
		if (!cb) return null; // Invalid request.
		
		var that = this;
		
		var queueName = 'uc-get-user-' + userNum;
		
		// Register queue.
		if (that.mod.queue.reg (queueName, cb)) return;
		
		that.db.query ('select * from `jB_user` where `qNum`=? limit 1', userNum, function (err, data) {
			// There's an error!
			if (err) {
				that.bot.mod.queue.unlock (queueName);
				return;
			}

			// User not exist, create an account.
			if (!data.length) {
				that.newUser (userNum, function (r) {
					that.bot.mod.queue.done (queueName, r);
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
			that.bot.mod.queue.done (queueName, ret);
		});
	},
	load: function () {
		var that = this;
		
		// Extenal functions.
		that.regEvent ('uc-get-user', that.getUser);
		that.regEvent ('uc-get-userByNum', that.getUserByNum);
		
		that.regEvent ('msg-cmd-sign', function (reply, msg, cmdObj, action) {
			that.getUser (msg.from_uin, function (user) {
				if (!can(user, 'talk', true)) return ;
				if (!can(user, 'sign', true)) return ;
				
				var signStr = '[' + (user.userNick || msg.user.nick) + '] ';
				
				if (action && action == 'info') {
					// Check if the user is new or never signed before (Timestamp 0)
					
					if (user.newUser || 
						!+new Date(user.tLastSign)) { // jshint ignore:line
					
						signStr += '您尚未签到。';
					} else {
						signStr += '上次签到日期: ' + user.tLastSign;
					}
				} else if (user.newUser || (function (timeNow, timeLastSign) {
					// 86400000 = 24 * 60 * 60 * 1000
					// If user already sign in within 24 hours, 
					// ... and date is same
					return timeNow - timeLastSign > 86400000 || timeLastSign.getDate() != timeNow.getDate();
				})(new Date(), new Date(user.tLastSign))) {
					var signMoney = Math.floor(that.bot.conf.user.signRange.min + Math.random() * 
						(that.bot.conf.user.signRange.max - that.bot.conf.user.signRange.min));
					
					user.tLastSign = new Date();
					that.db.query ('update `jB_user` SET `tLastSign`=now(), dMoneyLeft=dMoneyLeft+? WHERE `qNum` = ?;',
									[signMoney, user.qNum]);
					
					signStr += that.ext._ ('签到成功! 获得 %s %s', signMoney, that.bot.conf.user.currency);
				} else {
					var tmpMoney = Math.ceil(Math.random() * 5); // 0~5
				
					that.db.query ('update `jB_user` SET `tLastSign`=now(), dMoneyLeft=dMoneyLeft-? WHERE `qNum` = ?;',
									[tmpMoney, user.qNum]);
					
					signStr += that.ext._ ('签到失败: 您已经在 %s 签到过了。作为惩罚，扣除 %s %s。', user.tLastSign, tmpMoney, that.bot.conf.user.currency);
				}
				
				reply (signStr);
			});
		});
		that.regEvent ('msg-cmd-money', function (reply, msg, cmdObj) {
			that.getUser (msg.from_uin, function (user) {
				if (!can(user, 'talk', true)) return ;
				if (!can(user, 'money', true)) return ;
				reply ('[' + (user.userNick || msg.user.nick) + '] 的余额为: ' + user.dMoneyLeft + that.bot.conf.user.currency);
			});
		});
		that.regEvent ('msg-cmd-nick', function (reply, msg, args) {
			that.getUser (msg.from_uin, function (user) {
				if (!can(user, 'talk', true)) return ;
				
				if (args.length && can(user, 'set-nick', true)) {
					var nickName = args.join(' ').replace(/\s+/g, ' ');
					
					if (!can(user, 'set-nick-op', false) && /官方|管理|admin|权限/i.test(nickName)) {
						reply ('[' + msg.user.nick + '] 昵称更新失败: 请勿做死。');
						return ;
					}

					that.db.query ('update `jB_user` SET userNick=? WHERE `qNum` = ?;', [nickName, user.qNum], function () {
						reply ('[' + nickName + '] 昵称更新成功!');
					});
				} else {
					reply (that.ext._('%s 的内部昵称为: %s', msg.user.nick, user.userNick || '<无>'));
				}
			});
		});
		that.regEvent ('msg-cmd-top', function (reply, msg, nicks) {
			that.getUser (msg.from_uin, function (user) {
				if (!can(user, 'talk', true)) return ;
				if (!can(user, 'money-top', true)) return ;
				
				that.db.query ('select `dMoneyLeft`,`userNick` from `jB_user` order by dMoneyLeft desc limit 5', function (err, data) {
					for (var i=0, rankNum = 1, rd = [that.bot.conf.user.currency + '排行如下:'], lastMoney = 0; i<data.length; i++) {
						if (data[i].dMoneyLeft != lastMoney)
							rankNum = i + 1;

						lastMoney = data[i].dMoneyLeft;
						rd.push(
							that.ext._ ('第 %s 位, %s %s: %s', 
								rankNum, data[i].dMoneyLeft, that.bot.conf.user.currency,
								data[i].userNick || '<未知>'
							)
						);
					}
					reply (rd.join('\n'));
				});
			});
		});
		
		var _unique = function (arr) {
			var n = [];
			
			for (var i=0; i<arr.length; i++)
				if (n.indexOf(arr[i]) == -1)
					n.push (arr[i]);
			
			return n;
		};
		
		var _union = function (arr) {
			var n = arr.slice();
			for (var i=1; i<arguments.length; i++) {
				n = n.concat (arguments[i]);
			}
			
			return _unique (n);
		};
		
		var _arrRm = function (arr, arrRm) {
			var n = [];
			for (var i=0; i<arr.length; i++)
				if (arrRm.indexOf(arr[i]) == -1)
					n.push (arr[i]);
			
			return _unique (n);
		};
		
		var _setPem = function (qnum, newPem) {
			that.db.query ('update `jB_user` SET `pems`=? WHERE `qNum` = ?;', [JSON.stringify (newPem), qnum]);
		};
		
		var _pem = function (reply, action, pemList, target) {
			var pem = target.pems;
			
			if (action == 'list') {
				reply (that.ext._('[%s] 拥有的权限有: %s\n明令禁止的权限为: %s', target.userNick, pem.can.join('、'), pem.no.join('、')));
				return;
			}
			
			if (!pemList.length || !pem) return;
			
			switch (action) {
				case 'add':
					pem.can = _union(pem.can, pemList);
					_setPem (target.qNum, pem);
					reply (that.ext._('%s 的权限添加成功!', target.userNick));
					break;
					
				case 'rm':
					pem.can = _arrRm (pem.can, pemList);
					_setPem (target.qNum, pem);
					reply (that.ext._('%s 的权限移除完毕成功!', target.userNick));
					break;
					
				case 'ban':
					pem.no = _union (pem.no, pemList);
					_setPem (target.qNum, pem);
					reply (that.ext._('%s 的权限封禁成功!', target.userNick));
					break;
					
				case 'unban':
					pem.no = _arrRm (pem.no, pemList);
					_setPem (target.qNum, pem);
					reply (that.ext._('%s 的权限解除成功!', target.userNick));
					break;
			}
		};
		
		that.regEvent ('msg-cmd-pem', function (reply, msg, args, action, qnum) {
			if (!action) return ;
			
			// Pem list.
			var pemList = args.slice(1);
			
			that.getUser (msg.from_uin, function (user) {
				if (!can(user, 'talk', true)) return ;
				if (!can(user, 'pem', false)) return ;
				if (!can(user, 'pem-*', false) && !can(user, 'pem-'+action, false)) return ;
				
				if (qnum && /^\d+$/.test(qnum)) {
					pemList.shift ();
					that.getUserByNum (qnum, function (c) {
						_pem (reply, action, pemList, c);
					});
				} else {
					_pem (reply, action, pemList, user);
				}
			});
		});
		/*
		that.regEvent ('msg-cmd-', function (reply, msg, cmdObj) {
			that.getUser (msg.from_uin, function (user) {
				// TODO: Code here
			});
		});
		*/
	},
	unload: function () {
		// 沒有需要 owo
	}
};

module.exports = pluginUserCenter;