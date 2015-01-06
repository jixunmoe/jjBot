var sprintf = require('util').format;

function _init (self) {
	self.regEvent ('msg-cmd-pem', function (next, reply, msg, args, action, qnum) {
		if (!action) return ;
		
		// Pem list.
		var pemList = args.slice(1);
		
		self.getUser (msg.from_uin, function (user) {
			if (!self.can(user, 'pem', false)) return ;
			if (!self.can(user, 'pem-*', false) && !self.can(user, 'pem-'+action, false)) return ;
			
			if (qnum && /^\d+$/.test(qnum)) {
				pemList.shift ();
				self.getUserByNum (qnum, function (c) {
					self.pemBridge (reply, action, pemList, c);
				});
			} else {
				self.pemBridge (reply, action, pemList, user);
			}
		});
	});
	
}

module.exports = {
	onSubModuleLoad: function () {
		_init(this);
	},

	can: function (user, node, def) {
		// Not a valid user object.
		if (!user || !user.pems) return def;
		
		// First, check if is banned to use the command.
		return  user.pems.no && user.pems.no.indexOf (node) != -1 ? false
			// Then check if is in the allowed list.
			: user.pems.can && user.pems.can.indexOf (node) != -1 ? true
				// If not found, then return default permission.
				: def;
	},

	setPem: function (qnum, newPem) {
		self.db.query (
			'update `jB_user` SET `pems`=? WHERE `qNum` = ?;',
			[JSON.stringify (newPem), qnum]
		);
	},

	pemBridge: function (reply, action, pemList, target) {
		var pem = target.pems;
		
		if (action == 'list') {
			reply (sprintf('[%s] 拥有的权限有: %s\n黑名单权限为: %s', target.userNick, pem.can.join('、'), pem.no.join('、')));
			return;
		}
		
		if (!pemList.length || !pem)
			return;
		
		switch (action) {
			case 'add':
				pem.can = _.union(pem.can, pemList);
				self.setPem (target.qNum, pem);
				reply (sprintf('%s 的权限添加成功!', target.userNick));
				break;
				
			case 'rm':
				pem.can = _.difference (pem.can, pemList);
				self.setPem (target.qNum, pem);
				reply (sprintf('%s 的权限移除完毕成功!', target.userNick));
				break;
				
			case 'ban':
				pem.no = _.union (pem.no, pemList);
				self.setPem (target.qNum, pem);
				reply (sprintf('%s 的权限封禁成功!', target.userNick));
				break;
				
			case 'unban':
				pem.no = _.difference (pem.no, pemList);
				self.setPem (target.qNum, pem);
				reply (sprintf('%s 的权限解除成功!', target.userNick));
				break;
		}
	}
};