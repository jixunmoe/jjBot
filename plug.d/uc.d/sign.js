var sprintf = require('util').format;
function _init (self) {
	self.regEvent ('msg-cmd-sign', function (next, reply, msg, cmdObj, action) {
		var user = msg.ucdata;

		if (!self.can(user, 'sign', true)) return ;
		
		var signStr = user.nick;
		
		if (action && action == 'info') {
			// Check if the user is new or never signed before (Timestamp 0)
			
			if (user.isNew || 
				!+new Date(user.tLastSign)) // jshint ignore:line
			{
			
				signStr += '您尚未签到。';
			} else {
				signStr += '上次签到日期: ' + user.tLastSign;
			}
		} else if (user.isNew || self._isSignValid(new Date(), new Date(user.tLastSign))) {
			var signMoney = Math.floor(self.bot.conf.user.signRange.min + Math.random() * 
				(self.bot.conf.user.signRange.max - self.bot.conf.user.signRange.min));
			
			user.tLastSign = new Date();
			self.db.query (
				'update `jB_user` SET `tLastSign`=now(), dMoneyLeft=dMoneyLeft+? WHERE `qNum` = ?;',
				[signMoney, user.qNum]
			);
			
			signStr += sprintf ('签到成功! 获得 %s %s', signMoney, self.bot.conf.user.currency);
		} else {
			var tmpMoney = Math.ceil(Math.random() * 5); // 0~5
		
			self.db.query (
				'update `jB_user` SET dMoneyLeft=dMoneyLeft-? WHERE `qNum` = ?;',
				[tmpMoney, user.qNum]
			);
			
			signStr += sprintf (
				'签到失败: 您已经在 %s 签到过了。作为惩罚，扣除 %s %s。',
				user.tLastSign, tmpMoney, self.bot.conf.user.currency
			);
		}
		
		reply (signStr);
	});
}

module.exports = {
	onSubModuleLoad: function () {
		_init(this);
	}
};