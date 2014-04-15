/*jslint node: true*/
/*global __FLAG__, debug*/

var http  = require ('http'),
	https = require ('https'),
	qs    = require ('querystring');

var BotAuth   = require ('./Bot.Auth'),
	BotWebAPI = require ('./Bot.WebAPI'),
	BotAPI    = require ('./Bot.API'),
	BotPlugin = require ('./Bot.Plugin');

function objEmpty (obj) { return !Object.keys(obj).length; }
function t () { return +new Date(); }

var CoreBot = function (conf, mod, mConf) {
	var that = this;

	mod.web.initBot (that);

	that.conf = conf;
	that.cookie = [];
	that.mod = mod;
	that.log = mod.log;
	that.API = new BotAPI (that);
	that.auth = { };
	that.Auth = new BotAuth (that);
	that.WebAPI = new BotWebAPI (that);
	that.Plugin = new BotPlugin (that);
	that.Plugin.init ();
};

function hash_func (uin, ptwebqq) {
	var hash_digits = '0123456789ABCDEF'.split(''),
		table1 = [],
		table2 = [],
		ret = '',
		tmpTable = [
			uin >> 24 & 0xFF ^ 69,
			uin >> 16 & 0xFF ^ 67,
			uin >> 08 & 0xFF ^ 79,
			uin       & 0xFF ^ 75  ];

	// Generate a temp. table.
	for (var i=0; i < ptwebqq.length; i++)
		table1 [i % 4] ^= ptwebqq.charCodeAt(i);
	// Finding
	for (i=0; i < 8; i++) {
		table2 [i] = (i & 1 ? tmpTable[i >> 1] : table1 [i >> 1]);
		ret += hash_digits[table2 [i] >> 4 & 0x0F] + hash_digits[table2 [i] & 0x0F];
	}
	return ret;
}

function joinObj (def) {
	for (var i=0; i<arguments.length; i++)
		for (var x in arguments[i])
			def[x] = arguments[i][x];
	return def;
}

function arrFilter (arr, cb, def) {
	arr = arr || [];
	for (var i = arr.length; i--; ) 
		if (cb(arr[i]))
			return arr[i];
	return def;
}

CoreBot.prototype = {
	createCallback: function (that, foo) {
		for (var i=2, args=[]; i<arguments.length; i++)
			args.push (arguments[i]);

		return function () {
			for (var newArgs = args, j = 0; j<arguments.length; j++)
				newArgs.push (arguments[j]);
			foo.apply (that, newArgs);
		};
	},
	doPollLoop: function () {
		if (__FLAG__.offline)
			return;

		var that = this;

		that.API.post ('/channel/poll2', {
			clientid: that.auth.clientid,
			psessionid: that.auth.psessionid,
			r: JSON.stringify ({
				clientid: that.auth.clientid,
				psessionid: that.auth.psessionid,
				key: 0,
				ids: []
			})
		}, function (data) {
			that.parsePoll (data);
			setTimeout(function () { that.doPollLoop.apply (that); }, 400);
		}, 'd.web2.qq.com');
	},
	loginDone: function () {
		if (__FLAG__.offline) {
			this.mod.log.warn ('Offline mode, using data from CACHE!');
			this.friends = this.mod.cache.load ('friendInfo');
			this.groupList = this.mod.cache.load ('groupList');
			this.groups = this.mod.cache.load ('groupInfo');
			this.auth = {
				clientid: '',
				uin: 'abcd',
				ptwebqq: 'ffffffffffffffffffffffffffffffff',
				vfwebqq: 'ffffffffffffffffffffffffffffffff'
			};
			return;
		}
		
		// 简写
		this.auth = this.Auth.conf;
		this.doPollLoop ();

		this.friends = {};
		//if (objEmpty(this.friends = this.mod.cache.load ('friendInfo')))
			this.getFriends ();

		this.groups = {};
		this.groupList = {};
		//if (objEmpty(this.groupList = this.mod.cache.load ('groupList')))
			this.getGroupList ();
		//else
		//	this.getAllGroupInfo ();

	},
	/**
	 * UIN/GID to QQNum
	 */
	uinToNum: function (uin, isGroup, cb, numTry) {
		var that = this;
		// Fix argument
		uin = uin.toString();
		numTry = numTry || 0;
		
		var gp = isGroup ? 'group' : 'friend';
		var queueName = 'uinToNum-' + uin + '-' + gp;
		
		var cache = that.mod.cache.load('uinMap');
		
		// If cache exists, just return the cache.
		if (!cache[gp]) {
			cache[gp] = {};
		} else if (cache[gp][uin]) {
			cb(cache[gp][uin]);
			return;
		}
		
		// Now lock the queue.
		if (that.mod.queue.reg (queueName, cb))
			return;
		
		that.API.get ('/api/get_friend_uin2', {
			tuin: uin,
			verifysession: '',
			type: isGroup ? 4 : 1, // 可能记错
			code: '',
			vfwebqq: that.auth.vfwebqq,
			t: t()
		}, function (data) {
			if (__FLAG__.offline || data && data.result) {
				that.mod.queue.done (queueName, cache[gp][uin] = data.result.account.toString());
			} else {
				that.log.error ('Fetch num error:', data, '(' + queueName + ')');
				that.mod.queue.unlock (queueName);
				
				if (numTry < that.conf.maxRetry)
					that.uinToNum (uin, isGroup, cb, numTry + 1);
			}
		});
	},
	getFriends: function (cb, numTry) {
		var that = this;
		numTry = numTry || 0;

		var queueName = 'qGetFriends';
		if (that.mod.queue.reg (queueName, cb))
			return;

		that.API.post ('/api/get_user_friends2', {
			r: JSON.stringify ({
				h: 'hello',
				hash: hash_func (that.auth.uin, that.auth.ptwebqq),
				vfwebqq: that.auth.vfwebqq
			})
		}, function (ret) {
			if (ret.retcode) {
				that.log.error ('Fetch friend list error:', ret);
				that.mod.queue.unlock (queueName);
				if (numTry < that.conf.maxRetry)
					that.getFriends (cb, numTry + 1);
			} else {
				that.friends = ret.result;
				that.mod.cache.save ('friendInfo', that.friends);
				that.mod.queue.done(queueName, that.friends);
			}
		});
	},
	getGroupList: function (cb, numTry) {
		var that = this;
		numTry = numTry || 0;
		var queueName = 'groupList';
		if (that.mod.queue.reg (queueName, cb))
			return;

		that.API.post ('/api/get_group_name_list_mask2', {
			r: JSON.stringify ({
				vfwebqq: this.auth.vfwebqq
			})
		}, function (ret) {
			if (ret.retcode) {
				that.mod.queue.unlock (queueName);
				that.log.error ('Fetch group list error:', ret);
				if (numTry < that.conf.maxRetry)
					that.getGroupList (cb, numTry + 1);
			} else {
				that.groupList = ret.result;
				that.mod.cache.save('groupList', that.groupList);
				that.getAllGroupInfo ();
				that.mod.queue.done (queueName, that.groupList);
			}
		});
	},
	getAllGroupInfo: function () {
		for(var i = this.groupList.gnamelist.length; i--; )
			if (this.getGroupInfo(this.groupList.gnamelist[i].code.toString()))
				break;
	},
	getGroupInfo: function (gcode, bIgnoreCache, cb, numTry) {
		var that = this;
		numTry = numTry || 0;
		if (!bIgnoreCache) {
			var cache = that.mod.cache.load('groupInfo');
			var gCode = arrFilter(that.groupList.gnamelist, function (g) { return g.code === gcode; }, null);
			// If cache exist, just return the cache.
			if (gCode && cache[gCode.gid]) {
				cb(cache[gCode.gid]);
				return;
			}
			// Not in cache :<
		}
	
		var queueName = 'groupinfo-' + gcode;
		if (that.mod.queue.reg (queueName, cb))
			return;

		that.API.get ('/api/get_group_info_ext2', {
			gcode: gcode,
			vfwebqq: that.auth.vfwebqq,
			t: t()
		}, function (ret, data) {
			if (objEmpty(ret) || ret.retcode) {
				that.mod.queue.unlock (queueName);
				that.log.error ('Failed to get group:', gcode);
				// Only try twice
				if (numTry < 2) {
					that.getGroupInfo (gcode, true, null, numTry + 1);
				} else {
					// Group info expired?
					that.getGroupList ();
				}
				return;
			}

			that.groups[ret.result.ginfo.gid.toString()] = ret.result;
			that.mod.cache.save ('groupInfo', that.groups);
			that.mod.queue.done(queueName, ret.result);
		});
	},
	sendMsg: function (isGroup, targetId, content) {
		var that = this;

		var msgFont = that.conf.font;
		msgFont.style = msgFont.style || [0, 0, 0];

		var initMsgObj = {
			r: {
				msg_id: Math.floor (Math.random() * 100000 + 1000),
				clientid: that.auth.clientid.toString(),
				psessionid: that.auth.psessionid,
				content: JSON.stringify ([
					content, ['font', msgFont]
				])
			},
			clientid: that.auth.clientid,
			psessionid: that.auth.psessionid
		};

		if (isGroup) {
			initMsgObj.r = JSON.stringify(joinObj(initMsgObj.r, {
				group_uin: targetId
			}));
			that.API.post ('/channel/send_qun_msg2', initMsgObj, function (data) {
				that.mod.log.msg ('Send G:', targetId, '(uin)', content, data);
			}, 'd.web2.qq.com');
		} else {
			initMsgObj.r = JSON.stringify(joinObj(initMsgObj.r, {
				to: targetId,
				face: 0
			}));
			
			that.API.post ('/channel/send_buddy_msg2', initMsgObj, function (data) {
				that.mod.log.msg ('Send F:', targetId, '(uin)', content, data);
			}, 'd.web2.qq.com');
		}
	},
	getUser: function (uin, cb) {
		var that = this;

		if (!that.friends.info)
			// Not ready yet.
			return;

		cb (arrFilter(that.friends.info, function (u) { return uin === u.uin; }, {}));
	},
	getUserFromGroup: function (uin, gid, bNoCardNick, cb, numTry) {
		var that = this, args = arguments;
		args[4] = numTry ? numTry +1 : 1;

		if (!this.groupList.gnamelist)
			// Not ready yet.
			return;

		gid = gid.toString ();
		var fooReloadGroup = function () {
			if (numTry > that.conf.maxRetry) {
				that.log.error ('Max Retry for get user;', args);
				return;
			}

			var gCode = arrFilter(that.groupList.gnamelist, function (l) {
				return l.gid.toString() === gid;
			});

			if (!gCode) {
				that.log.error ('getUserFromGroup: 请求更新群组数据但是找不到 gcode');
				return;
			}

			that.getGroupInfo(gCode.code, false, function () {
				// 更新数据了, 重试
				that.getUserFromGroup.apply (that, args);
			});
		};

		if (!that.groups[gid]) {
			if (debug.group)
				that.mod.log.warn ('GID:', gid, ' not exist, reload Group List.');
			return that.getGroupList ();
		}

		var newUserData = arrFilter (that.groups[gid].minfo, function (minfo) { return minfo.uin == uin; });

		// 新用户入群, 还没有数据
		if (!newUserData) {
			if (debug.group) that.mod.log.warn ('GID:', gid, ' User info not found, fooReloadGroup');
			return fooReloadGroup ();
		}

		if (bNoCardNick) {
			return cb (newUserData);
		}
		var userCardInfo = arrFilter (that.groups[gid].cards, function (cards) { return cards.muin == uin; }, {});
		newUserData.profileName = newUserData.nick;
		newUserData.nick = userCardInfo.card || newUserData.nick;
		cb (newUserData);
	},
	fooProcMsg: function (msg, userData) {
		// On User get
		msg.content.shift();
		msg.strMsg = msg.content.map(function (e) {
			if ('string' == typeof e)
				return e;
			return '[图片]';
		}).join(' ');

		if (msg.isGroup){
			this.log.msg(msg.from_group.ginfo.name, '->', userData.nick, ': ->', msg.strMsg);
		} else {
			this.log.msg(userData.nick, ': ->', msg.strMsg);
		}

		this.Plugin.on('msg', msg.strMsg, msg, this.createCallback(
			this, this.sendMsg, msg.isGroup, msg.from_gid || msg.from_uin)
		);
	},
	parsePoll: function (poll) {
		var that = this;
		if (debug.poll)
			that.log.info ('Parse poll:', poll.retcode);

		switch (poll.retcode) {
			case 116:
				if (debug.poll)
					that.log.info ('Update ptwebqq to', poll.p);
				this.auth.ptwebqq = poll.p;
				return;
			case 102:
			case 103:
				if (debug.poll)
					that.log.info ('Poll :: No Message.');
				return;
			case 0:
				// 一切正常
				break;
			default:
				that.log.info ('Poll:', poll);
				break;
		}

		var ret = poll.result, bBreak, msg;
		if (!ret) ret = [];
		for (var i=0; i<ret.length; i++) {
			bBreak = false;
			msg = ret[i].value;
			switch (ret[i].poll_type) {
				case 'kick_message':
					that.log.error ('机器人被T下线; 如果您是开发者请启用 --offline 进入离线模式调试避免占线。');
					process.exit(10);
					break;
				case 'group_message':
					// that.log.msg (msg);
					if (!this.groupList.gnamelist)
						// Bot not ready.
						return;

					msg.isGroup = true;
					msg.from_gid = msg.from_uin;
					msg.group_code = msg.group_code;
					msg.from_uin = msg.send_uin;
					msg.from_group = this.groups[msg.from_gid];

					this.getUserFromGroup (msg.from_uin, msg.from_gid, false, 
						that.createCallback(that, that.fooProcMsg, msg)
					);
					break;
				case 'message':
					// that.log.msg (msg);
					if (!this.friends.friends)
						// Bot not ready.
						return;

					that.getUser (msg.from_uin, that.createCallback(that, that.fooProcMsg, msg));
					break;
				case 'sys_g_msg':
					this.mod.log.event ('SYS ->', msg);
					break;
				default:
					this.mod.log.event (ret[i].poll_type, '->', msg);
					
					break;
			}
			if (bBreak) break;
		}
	}
};

module.exports = function () {
	new CoreBot (arguments[0], arguments[1], arguments[2]);
};