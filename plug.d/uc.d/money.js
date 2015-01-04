var sprintf = require('util').format;

function _init (self) {
	/// Command: money
	self.regEvent ('msg-cmd-money', function (reply, msg, cmdObj) {
		var user = msg.ucdata;

		if (!self.can(user, 'money', true)) return ;
		reply(sprintf('%s 有 %s%s 了呢! 请再接再厉~', user.nick, user.dMoneyLeft, self.bot.conf.user.currency));
	});

	/// Command: top
	self.regEvent ('msg-cmd-top', function (reply, msg, nicks) {
		var user = msg.ucdata;

		if (!self.can(user, 'money-top', false)) return ;
			
		self.db.query (
			'select `dMoneyLeft` from `jB_user` order by dMoneyLeft desc limit 5',

			function (err, data) {
				if (err) {
					reply ('爆炸: 获取财产总额失败，建议稍后再试~');
					return ;
				}

				var rd = [self.bot.conf.user.currency + '的最新排行如下~~', ''];

				for (var i=0, rankNum = 1, lastMoney = 0; i<data.length; i++) {
					if (data[i].dMoneyLeft != lastMoney)
						rankNum = i + 1;

					lastMoney = data[i].dMoneyLeft;
					rd.push(
						sprintf ('%s 位, 总资产 %s %s', 
							rankNum, data[i].dMoneyLeft, self.bot.conf.user.currency
						)
					);
				}

				reply (rd.join('\n'));
			}
		);

	});

	/// Command pay
	self.regEvent ('msg-cmd-pay', function (reply, msg, cmdObj, who, amount) {
		amount = parseFloat (amount);
		
		if (isNaN(amount))
			amount = 10;
		if (amount < 0)
			amount *=-1;
		
		if (!/^\d+$/.test(who))
			return ; // Invalid target

		var userSource = msg.ucdata;
		
		if (userSource.dMoneyLeft < amount) {
			reply (sprintf ('%s: 很抱歉, 您的余额不足以支付, 请检查后提交。', userSource.nick));
			return ;
		}
		
		self.db.query ('update `jB_user` SET dMoneyLeft=? WHERE `qNum` = ?;',
						[userSource.dMoneyLeft -= amount, userSource.qNum]);

		self.getUserByNum (who, function (userTarget) {
			self.db.query ('update `jB_user` SET dMoneyLeft=? WHERE `qNum` = ?;',
							[userTarget.dMoneyLeft += amount, userTarget.qNum]);
			
			reply (sprintf (
				'%s: 您已成功转账 %s 给 %s, 剩余 %s %s。', 
				userSource.userNick || msg.user.nick,
				amount,
				userTarget.userNick || '<未知>',
				userSource.dMoneyLeft,
				self.bot.conf.user.currency
			));
		});
	});

}

module.exports = {
	onSubModuleLoad: function () {
		_init(this);
	}
};