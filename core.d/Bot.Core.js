/*jslint node: true*/
/*global __FLAG__, debug*/

var http  = require ('http'),
	https = require ('https'),
	qs    = require ('querystring'),
	_     = require ('underscore');

var BotAuth   = require ('./Bot.Auth'),
	BotWebAPI = require ('./Bot.WebAPI'),
	BotAPI    = require ('./Bot.API'),
	BotChat   = require ('./Bot.Chat'),
	BotPlugin = require ('./Bot.Plugin'),
	BotLooper = require ('./Bot.Looper');

var fixCookie = function (cookie) {
	var result = {},
		secPass = [];

	if (cookie.length == 1)
		return cookie;
	
	cookie.forEach (function (item) {
		var arrMatch = item.match(/^(.+?)=(.*?);/);
		// Just keep everything.
		if (!arrMatch || !arrMatch[2]) return ;
		result[arrMatch[1]] = arrMatch[2];
	});

	for (var x in result) {
		if (result[x]) {
			secPass.push (x + '=' + result[x]);
		}
	}

	return [secPass.join ('; ')];
};


function time () { return +new Date(); }
function loopArray (self, arr, fooLoop, fooLast) {
	var arrLen   = arr.length,
		curIndex = 0;

	var extraArgs = [].slice.call(arguments, 4);

	var fooNext = function () {
		var args = extraArgs.concat([].slice.call(arguments));
		args.splice(0, 0, fooNext);

		if (curIndex >= arrLen) {
			fooLast.apply(self, args);
		} else {
			args.splice(1, 0, arr[curIndex]);
			if (fooLoop) fooLoop.apply(self, args);
		}

		curIndex++;
	};

	process.nextTick (fooNext);
}

function safeDelay () {
	return 20 + 100 * Math.random();
}

var CoreBot = function (conf, mod, mConf) {
	this.auth = { };

	if (mod.web)
		mod.web.initBot (this);

	// Init. core modules.
	this.package = require(__ROOT__ + 'package.json');
	this.version = this.package.version;
	this.conf = conf;
	this.mod = mod;
	this.log = mod.log;
	this.bootWait = true;
	this.Looper = BotLooper;
	this.msgPipe = new BotLooper([], this._sendMsg.bind(this), conf.msgInterval);
	this.msgPipe.loop();
	this.API = new BotAPI (this);
	this.Chat = new BotChat (this);
	this.Auth = new BotAuth (this);
	this.WebAPI = new BotWebAPI (this);
	this.Plugin = new BotPlugin (this);
	this.Plugin.init ();
};

function arrFirstMatch (arr, cb, def) {
	arr = arr || [];
	for (var i = arr.length; i--; ) 
		if (cb(arr[i]))
			return arr[i];
	return def;
}

CoreBot.prototype = {
	createCallback: function (that, foo) {
		this.log.warn ('Don\'t use createCallback, use Function.bind instead!!');
		
		for (var i=2, args=[]; i<arguments.length; i++)
			args.push (arguments[i]);
		
		return function () {
			for (var newArgs = args, j = 0; j<arguments.length; j++)
				newArgs.push (arguments[j]);
			
			return foo.apply (that, newArgs);
		};
	},
	pollTimeThd: 0,
	doPollLoop: function () {
		if (__FLAG__.offline)
			return;

		var that = this;

		clearTimeout (that.pollTimeThd);
		
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
			if (data !== false)
				that.parsePoll (data);

			clearTimeout (that.pollTimeThd);
			that.pollTimeThd = setTimeout(function () { that.doPollLoop.apply (that); }, safeDelay());
		}, 'd.web2.qq.com').on('socket', function (s) {
			// 2mins timeout
			s.setTimeout(120000, function () {
				that.mod.log.warn ('[POLL] Socket timeout');
				// Timeout
				clearTimeout (that.pollTimeThd);
				
				// Create new thread.
				that.pollTimeThd = setTimeout(function () { that.doPollLoop.apply (that); }, safeDelay());
			});
		});
	},
	saveAuth: function () {
		this.log.info ('Begin Boot wait..');
		setTimeout(function (self) {
			self.bootWait = false;
			self.log.info ('Finish Boot wait!');
		}, this.conf.bootWait * 1000, this);
		this.mod.cache.save ('authLogin', this.auth);
	},
	
	cacheInit: function (cacheName, namespace) {
		if (!__FLAG__.noChatCache) {
			// Can use cache, check if cache is usable.
			var tmpCache = this[namespace || cacheName] = this.mod.cache.load (cacheName);
			if (tmpCache.vfAuth == this.auth.vfwebqq)
				return true;
		}
		
		this[namespace || cacheName] = {
			vfAuth: this.auth.vfwebqq,
			table:  {}
		};
		return false;
	},
	cacheSave: function (cacheName, namespace) {
		this.mod.cache.save (cacheName, this[namespace || cacheName]);
	},
	
	loginDone: function (bDontSaveConf) {
		if (__FLAG__.offline) {
			this.bootWait = false;
			this.mod.log.warn ('Offline mode, using data from CACHE!');
			this.friends = this.mod.cache.load ('friendInfo');
			this.groupList = this.mod.cache.load ('groupList');
			this.groups = this.mod.cache.load ('groupInfo');
			this.auth = {
				clientid: '',
				uin: '11111111111',
				ptwebqq: 'ffffffffffffffffffffffffffffffff',
				vfwebqq: 'ffffffffffffffffffffffffffffffff'
			};
			return;
		}
		this.Auth.getGroupFaceSign ();
		this.mod.log.info ('loginDone, Begin poll.');
		
		// 简写
		this.auth = this.Auth.conf;
		this.auth.cookie = fixCookie (this.auth.cookie);
		
		this.doPollLoop ();

		if (this.cacheInit ('friendInfo', 'friends')) {
			this.log.info ('Using cache for friends list.');
			
			if (!this.cacheInit ('friendHashTable')) {
				this.getFriendsTable ();
			}
		} else {
			// Friends cache not avlible...
			this.getFriends ();
		}
		
		if (this.cacheInit ('groupList')) {
			this.log.info ('Using cache for group list.');
			
			if (this.cacheInit('groupInfo', 'groups')) {
				this.log.info ('Using cache for group info.');
				
				if (this.cacheInit('groupHashTable')) {
					this.log.info ('Using cache for groupHashTable.');
				} else {
					this.getAllGroupHashTable ();
				}
			} else {
				// After this.getAllGroupInfo done it will call the function to 
				// fetch all the numbers and save to cache.
				this.getAllGroupInfo ();
			}
		} else {
			// Groups are used to store group info.
			this.cacheInit('groups');
			
			// This will fetch the group list. 
			// After that, it will call this.getAllGroupInfo;
			this.getGroupList ();
		}
		
		this.cacheInit ('uinCache');
		
		this.Chat.init ();
		
		if (!bDontSaveConf) this.saveAuth ();
	},
	
	getUin: function (num, isGroup) {
		var table = isGroup ?
				this.groupHashTable
				: this.friendHashTable;
		
		for (var uin in table)
			if (table[num] == num)
				return num;
		
		this.log.info ('Fetch uin failed: Num', num, 'not exist in', isGroup ? 'group' : 'friends', 'list.');
		return null;
	},
	
	/**
	 * UIN/GID to QQNum
	 */
	uinToNum: function (uin, isGroup, cb) {
		var that = this;
		// Fix argument
		uin = uin.toString();
		
		if (debug.CORE)
			that.mod.log.info ('uinToNum:', uin);
		
		var gp = isGroup ? 'group' : 'friend';
		
		// If cache exists, just return the cache.
		if (!this.uinCache.table[gp]) {
			this.uinCache.table[gp] = {};
		} else if (this.uinCache.table[gp][uin]) {
			process.nextTick (cb.bind (that, this.uinCache.table[gp][uin]));
			return;
		}
		
		// Now lock the queue.
		var queueName = 'uinToNum-' + uin + '-' + gp;
		if (that.mod.queue.reg (queueName, cb))
			return;
		
		that.API.get ('/api/get_friend_uin2', {
			tuin: uin,
			verifysession: '',
			// 群组是 4, 好友是 1
			type: isGroup ? 4 : 1,
			code: '',
			vfwebqq: that.auth.vfwebqq,
			t: time()
		}, function (data) {
			if (__FLAG__.offline || data && data.result) {
				that.mod.queue.done (queueName, that.uinCache.table[gp][uin] = data.result.account.toString());
				that.cacheSave ('uinCache');
			} else {
				that.log.error ('Fetch num error:', data, '(' + queueName + ')');
				that.mod.queue.unlock (queueName);
			}
		});
	},
	
	getFriendsTable: function (cb) {
		var that = this;
		
		var queueName = 'qGetRealFriendNum';
		if (that.mod.queue.reg (queueName, cb)) return;
		if (this.cacheInit ('friendHashTable')) {
			this.log.warn ('friendHashTable: Not expired yet, refuse reload hash table.');
			return ;
		}
		
		that.log.info ('Fetch real QQ Num...');
		loopArray (that, that.friends.info, function (next, friend) {
			// 抓取真实号码
			that.uinToNum (friend.uin, false, function (realNum) {
				that.log.info ('QQ', realNum.toString(), '->', friend.nick);
				that.friendHashTable.table[friend.uin.toString()] = realNum;
				
				next();
			});
		}, function () {
			// Done.
			this.log.info ('Fetch real QQ Num done.');
			that.mod.cache.save ('friendHashTable', that.friendHashTable);
			that.mod.queue.done (queueName, that.friendHashTable);
		});
	},
	
	getFriends: function (cb, numTry) {
		var that = this;
		numTry = numTry || 0;

		var queueName = 'qGetFriends';
		if (that.mod.queue.reg (queueName, cb))
			return;

		if (debug.CORE)
			that.mod.log.info ('qGetFriends');
		
		that.API.post ('/api/get_user_friends2', {
			r: JSON.stringify ({
				h: 'hello',
				hash: this.auth.hash,
				vfwebqq: that.auth.vfwebqq
			})
		}, function (ret) {
			if (ret && ret.retcode == 50) {
				that.log.error ('Fetch friend list(50): ptWebQQ expired or hash_func updated, try reboot jjBot without --shareLogin.');
				// process.exit (11);
			} else if (ret === false || ret.retcode) {
				that.log.error ('Fetch friend list error:', ret, '; give up.');
				that.mod.queue.unlock (queueName);
			} else {
				that.friends = ret.result;
				that.friends.vfAuth = that.auth.vfwebqq;
				
				that.mod.cache.save ('friendInfo', that.friends);
				that.mod.queue.done(queueName, that.friends);
				
				// 请求抓取好友号码
				that.getFriendsTable ();
			}
		});
	},
	getGroupList: function (cb) {
		var that = this;
		var queueName = 'groupList';
		if (that.mod.queue.reg (queueName, cb))
			return;

		if (debug.CORE)
			that.mod.log.info ('getGroupList');
		
		that.API.post ('/api/get_group_name_list_mask2', {
			r: JSON.stringify ({
				hash: this.auth.hash,
				vfwebqq: this.auth.vfwebqq
			})
		}, function (ret) {
			if (ret.retcode) {
				that.mod.queue.unlock (queueName);
				that.log.error ('Fetch group list error:', ret, '; Give up.');
			} else {
				that.groupList = ret.result;
				that.groupList.vfAuth = that.auth.vfwebqq;
				that.mod.cache.save('groupList', that.groupList);
				
				that.getAllGroupInfo ();
				that.mod.queue.done (queueName, that.groupList);
			}
		});
	},
	
	getAllGroupHashTable: function (cb) {
		var queueName = 'qGetAllGroupHashTable';
		if (this.mod.queue.reg (queueName, cb)) return;
		var that = this;
		
		if (this.cacheInit('groupHashTable')) {
			this.log.warn ('groupHashTable: Not expired yet, refuse reload hash table.');
			return ;
		}
		
		// 抓取群号
		loopArray (this, this.groupList.gnamelist, function (next, group) {
			var groupId = group.code.toString();
			this.uinToNum (groupId, true, function (realNum) {
				that.log.info ('Fetch group num ->', realNum);
				that.groupHashTable.table[groupId] = realNum;
				next();
			});
		}, function () {
			that.log.info ('Fetch group num finish.');
			that.mod.cache.save ('groupHashTable', that.groupHashTable);
			that.mod.queue.done(queueName, that.groupHashTable);
		});
	},
	
	getAllGroupInfo: function (cb) {
		var queueName = 'qGetAllGroupInfo';
		if (this.mod.queue.reg (queueName, cb)) return;
		
		this.log.info ('Fetch group list...');
		// 抓取群组数据
		loopArray (this, this.groupList.gnamelist, function (next, group) {
			this.getGroupInfo (group.code.toString(), false, next);
		}, function () {
			this.getAllGroupHashTable ();
			this.mod.queue.done(queueName);
			this.log.info ('Fetch group list done! Now searching for real id..');
		});
	},
	getGroupInfo: function (gcode, bIgnoreCache, cb) {
		var that = this;
		if (!bIgnoreCache) {
			var cache = that.mod.cache.load('groupInfo');
			var gCode = arrFirstMatch(that.groupList.gnamelist, function (g) { return g.code === gcode; }, null);
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

		if (debug.CORE)
			that.mod.log.info ('getGroupInfo:', gcode);
		
		that.API.get ('/api/get_group_info_ext2', {
			gcode: gcode,
			vfwebqq: that.auth.vfwebqq,
			t: time()
		}, function (ret, data) {
			if (ret === false || _.isEmpty(ret) || ret.retcode) {
				that.mod.queue.unlock (queueName);
				that.log.error ('Failed to get group:', gcode, '; Try refresh list.');
				
				// Group info expired?
				that.getGroupList ();
				return;
			}

			that.groups[ret.result.ginfo.gid.toString()] = ret.result;
			that.mod.cache.save ('groupInfo', that.groups);
			that.mod.queue.done(queueName, ret.result);
		});
	},

	_sendMsg: function (next, args) {
		// msg, targetId, content, extraArg
		var msg 		= args.shift(),
			targetId 	= args.shift(),
			content 	= args.shift(),
			extraArg 	= args.shift();

		var isGroup = msg.isGroup;

		if (!targetId) {
			this.mod.log.msg ('[CONSOLE] Send:', content);
			return ;
		}
		
		if (!content) {
			this.log.msg ('Content is empty.');
			return ;
		}
		
		var msgContent = [],
			fixSign = false;
		if (content.getMsg) {
			// Advanced message
			msgContent = content.getMsg ();
			fixSign = content.fixSign && isGroup;
		} else {
			var msgFont = this.conf.font;
			msgFont.style = msgFont.style || [0, 0, 0];

			if (content instanceof Array) {
				// If content is array, merge it.
				msgContent.concat (content);
			} else {
				// Otherwise, push it as an item.
				msgContent.push (content);
			}
			msgContent.push (['font', msgFont]);
		}
		
		var initMsgObj = {
			r: {
				msg_id: Math.floor (Math.random() * 100000 + 1000),
				clientid: this.auth.clientid.toString(),
				psessionid: this.auth.psessionid,
				content: JSON.stringify (msgContent)
			},
			clientid: this.auth.clientid,
			psessionid: this.auth.psessionid
		};
		
		if (fixSign) {
			if (!msg.group_code) {
				this.log.err ('fixSign requires `group_code` attribute.');
				return ;
			}
			_.extend(initMsgObj.r, {
				group_code: msg.group_code,
				key: this.auth.gface_key,
				sig: this.auth.gface_sig
			});
		}
		
		if (isGroup) {
			initMsgObj.r = JSON.stringify(_.extend(initMsgObj.r, {
				group_uin: targetId
			}));
		} else {
			initMsgObj.r = JSON.stringify(_.extend(initMsgObj.r, {
				to: targetId,
				face: 0
			}));
		}

		var apiMsg = isGroup ? '/channel/send_qun_msg2' : '/channel/send_buddy_msg2';
		
		this.API.post (apiMsg, initMsgObj, function (data) {
			this.mod.log.msg ('Send', isGroup ? 'G' : 'F', ':', targetId, '(uin)',
				msgContent, data === false ? 'Failed' : '');

			next ();
		}.bind(this), 'd.web2.qq.com');
	},
	
	sendMsg: function (msg, targetId, content, extraArg) {
		this.msgPipe.add([msg, targetId, content, extraArg]);
	},
	getUser: function (uin, cb) {
		var that = this;

		if (!that.friends.info)
			// Not ready yet.
			return;

		if (debug.CORE)
			that.mod.log.info ('getUser:', uin);
		
		cb (arrFirstMatch(that.friends.info, function (u) { return uin === u.uin; }, {}));
	},
	
	getUserFromGroup: function (uin, gid, bNoCardNick, cb, numTry) {
		var that = this, args = arguments;
		numTry = args[4] = numTry ? numTry + 1 : 1;

		// 检查是否存在列表
		if (!this.groupList.gnamelist)
			return;

		if (debug.CORE)
			that.mod.log.info ('getUserFromGroup:', uin);
		
		// 转换到文本
		gid = gid.toString ();
		
		// 检查群组列表是否存在该群组
		if (!that.groups[gid]) {
			if (debug.group)
				that.mod.log.warn ('GID:', gid, ' not exist, reload Group List.');
			
			that.getGroupList ();
			return ;
		}

		// 选择用户数据
		var newUserData = arrFirstMatch (that.groups[gid].minfo, function (minfo) { return minfo.uin == uin; });

		if (!newUserData) {
			// 新用户入群, 还没有数据; 请求重载
			if (debug.group) that.mod.log.warn ('GID:', gid, ' User info not found, fooReloadGroup');
			
			// 重试次数过多
			if (numTry > that.conf.maxRetry) {
				that.log.error ('Max Retry for get user;', args);
				return;
			}
			
			// 抓取群组 gCode
			var gCode = arrFirstMatch(that.groupList.gnamelist, function (l) {
				return l.gid.toString() === gid;
			});
			
			// 抓不到 gCode - 报错
			if (!gCode) {
				that.log.error ('getUserFromGroup: 请求更新群组数据但是找不到 gcode');
				return;
			}

			// 请求强制更新群组数据。
			that.getGroupInfo(gCode.code, true, function () {
				// 更新数据了, 重试
				that.getUserFromGroup.apply (that, args);
			});
			return;
		}

		// 如果不要求获取用户群名片，可以跳过获取名片过程。
		if (bNoCardNick) {
			process.nextTick (function () {
				cb (newUserData);
			});
			return ;
		}
		var userCardInfo = arrFirstMatch (that.groups[gid].cards, function (cards) { return cards.muin == uin; }, {});
		newUserData.profileName = newUserData.nick;
		newUserData.nick = userCardInfo.card || newUserData.nick;
		
		process.nextTick (function () {
			cb (newUserData);
		});
	},
	fooProcMsg: function (msg, userData) {
		msg.raw_content = msg.content.slice();

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

		msg.user = userData;
		this.Plugin.on('msg', msg.strMsg, msg, this.sendMsg.bind(this, msg, msg.from_gid || msg.from_uin));
	},
	
	lastErrorPoll: function (code) {
		this.lastError = {};
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
				this.mod.cache.save ('authLogin', this.auth);
				return;
			case 102:
			case 103:
				if (debug.poll)
					that.log.info ('Poll :: No Message [', poll.retcode, ']');
				
				return;
				
			case 121:
				// 死了, 重新登录
				that.log.error ('121 Death poll.');
				process.exit (13);
				return ;
				
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
					if (this.bootWait)
						break ;

					// that.log.msg (msg);
					if (!this.groupList.gnamelist)
						// Bot not ready.
						return;

					msg.isGroup = true;
					msg.from_gid = msg.from_uin;
					// msg.group_code = msg.group_code;
					msg.from_uin = msg.send_uin;
					msg.from_group = this.groups[msg.from_gid];

					this.getUserFromGroup (msg.from_uin, msg.from_gid, false, that.fooProcMsg.bind (this, msg));
					break;
					
				case 'message':
					if (this.bootWait)
						return ;

					// that.log.msg (msg);
					if (!this.friends.friends)
						// Bot not ready.
						return;

					that.getUser (msg.from_uin, that.fooProcMsg.bind (this, msg));
					break;
					
				case 'sys_g_msg':
					if (this.bootWait)
						return ;

					this.mod.log.event ('SYS ->', msg);
					this.Plugin.on('group-notify', msg);
					break;
					
				default:
					if (this.bootWait)
						return ;

					this.mod.log.event (ret[i].poll_type, '->', msg);
					this.Plugin.on('poll-other', msg);
					break;
			}
			if (bBreak) break;
		}
	}
};

module.exports = function () {
	new CoreBot (arguments[0], arguments[1], arguments[2]);
};