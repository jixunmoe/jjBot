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
function loopArray (that, arr, fooLoop, fooLast) {
	var arrLen   = arr.length,
		curIndex = 0;

	for (var i = 4, extraArgs = []; i < arguments.length; i++)
		extraArgs.push (arguments[i]);

	var fooNext = function () {
		var args = extraArgs.slice();
		args.splice(0, 0, fooNext);
		for (var i=0; i<arguments.length; i++)
			args.push (arguments[i]);

		if (curIndex >= arrLen) {
			fooLast.apply(that, args);
		} else {
			args.splice(1, 0, arr[curIndex]);
			if (fooLoop) fooLoop.apply(that, args);
		}

		curIndex++;
	};

	process.nextTick (fooNext);
}

function delayFunction (that, foo, delay) {
	for (var i = 3, extraArgs = []; i<arguments.length; i++)
		extraArgs.push (arguments[i]);

	return function () {
		for (var i= 0, args = extraArgs.slice(); i<arguments.length; i++)
			args.push (arguments[i]);

		setTimeout(function () {
			foo.apply(that, args);
		}, delay || safeDelay());
	};
}

function safeDelay () {
	return 400 + 500 * Math.random();
}

var CoreBot = function (conf, mod, mConf) {
	var that = this;

	mod.web.initBot (that);

	that.conf = conf;
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
	var HashKeyStruct = function (s, e) {
		this.s = s || 0;
		this.e = e || 0;
	};
	
	var uinByte = [
		uin >> 24 & 255,
		uin >> 16 & 255,
		uin >> 8 & 255,
		uin & 255
	];

	var pwWebChar = ptwebqq.split ('').map (function (c) {
		return c.charCodeAt(0);
	});

	var unknownArray = [new HashKeyStruct(0, pwWebChar.length - 1)];
	
	for (;unknownArray.length;) {
		var lastItem = unknownArray.pop();
		
		if (!(lastItem.s >= lastItem.e || lastItem.s < 0 || lastItem.e >= pwWebChar.length)){
			if (lastItem.s + 1 == lastItem.e) {
				// Swap
				if (pwWebChar[lastItem.s] > pwWebChar[lastItem.e]) {
					var tmp = pwWebChar[lastItem.s];
					pwWebChar[lastItem.s] = pwWebChar[lastItem.e];
					pwWebChar[lastItem.e] = tmp;
				}
			} else {
				var sBit = lastItem.s,
					eBit = lastItem.e,
					f = pwWebChar[lastItem.s];
				
				for (; lastItem.s < lastItem.e;) {
					for (; lastItem.s < lastItem.e && pwWebChar[lastItem.e] >= f; lastItem.e--) {
						uinByte[0] = uinByte[0] + 3 & 255;
					}
					
					if (lastItem.s < lastItem.e) {
						pwWebChar[lastItem.s] = pwWebChar[lastItem.e];
						lastItem.s++;
						uinByte[1] = uinByte[1] * 13 + 43 & 255;
					}
					
					for (; lastItem.s < lastItem.e && pwWebChar[lastItem.s] <= f; lastItem.s++) {
						uinByte[2] = uinByte[2] - 3 & 255;
					}
					
					if (lastItem.s < lastItem.e) {
						pwWebChar[lastItem.e] = pwWebChar[lastItem.s];
						lastItem.e--;
						uinByte[3] = (uinByte[0] ^ uinByte[1] ^ uinByte[2] ^ uinByte[3] + 1) & 255;
					}
				}
				pwWebChar[lastItem.s] = f;
				unknownArray.push(new HashKeyStruct(sBit, lastItem.s - 1));
				unknownArray.push(new HashKeyStruct(lastItem.s + 1, eBit));
			}
		}
	}
	var hexTable = '0123456789ABCDEF'.split('');
	var retKey = "";
	for (var i = 0; i < uinByte.length; i++) {
		retKey += hexTable[uinByte[i] >> 4 & 15] + hexTable[uinByte[i] & 15];
	}
	return retKey;
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
			that.parsePoll (data);
			clearTimeout (that.pollTimeThd);
			that.pollTimeThd = setTimeout(function () { that.doPollLoop.apply (that); }, 400);
		}, 'd.web2.qq.com').on('socket', function (s) {
			// 2mins timeout
			s.setTimeout(120000, function () {
				that.mod.log.warn ('[POLL] Socket timeout');
				// Timeout
				clearTimeout (that.pollTimeThd);
				
				// Create new thread.
				that.pollTimeThd = setTimeout(function () { that.doPollLoop.apply (that); }, 400);
			});
		});
	},
	saveAuth: function () {
		this.mod.cache.save ('authLogin', this.auth);
	},
	
	cacheUsable: function (cacheName, namespace) {
		if (__FLAG__.noChatCache) {
			this[namespace || cacheName] = {};
			return false;
		}
		
		var tmpCache = this[namespace || cacheName] = this.mod.cache.load (cacheName);
		return tmpCache.vfAuth == this.auth.vfwebqq;
	},
	
	loginDone: function (bDontSaveConf) {
		this.mod.log.info ('loginDone, Begin poll.');
		
		if (__FLAG__.offline) {
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
		
		// 简写
		this.auth = this.Auth.conf;
		this.doPollLoop ();

		if (this.cacheUsable ('friendInfo', 'friends')) {
			this.log.info ('Using cache for friends list.');
			
			if (!this.cacheUsable ('friendHashTable')) {
				this.getFriendsTable ();
			}
		} else {
			// Friends cache not avlible...
			this.getFriends ();
		}
		
		if (this.cacheUsable ('groupList')) {
			this.log.info ('Using cache for group list.');
			
			if (this.cacheUsable('groupInfo', 'groups')) {
				this.log.info ('Using cache for group info.');
				
				if (this.cacheUsable('groupHashTable')) {
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
			this.groups = {
				vfAuth: this.auth.vfwebqq
			};
			
			// This will fetch the group list. 
			// After that, it will call this.getAllGroupInfo;
			this.getGroupList ();
		}
		
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
	uinToNum: function (uin, isGroup, cb, numTry) {
		var that = this;
		// Fix argument
		uin = uin.toString();
		numTry = numTry || 0;
		
		if (debug.CORE)
			that.mod.log.info ('uinToNum:', uin);
		
		var gp = isGroup ? 'group' : 'friend';
		var queueName = 'uinToNum-' + uin + '-' + gp;
		
		var cache = that.mod.cache.load('uinMap');
		
		// If cache exists, just return the cache.
		if (!cache[gp]) {
			cache[gp] = {};
		} else if (cache[gp][uin]) {
			process.nextTick (that.createCallback(that, cb, cache[gp][uin]));
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
	
	getFriendsTable: function (cb) {
		var that = this;
		
		var queueName = 'qGetRealFriendNum';
		if (that.mod.queue.reg (queueName, cb)) return;

		that.friendHashTable = {
			vfAuth: that.auth.vfwebqq,
			table: {}
		};
		
		that.log.info ('Fetch real QQ Num...');
		loopArray (that, that.friends.info, function (next, friend) {
			// 抓取真实号码
			that.uinToNum (friend.uin, false, function (realNum) {
				that.log.info ('QQ', realNum.toString(), '->', friend.nick);
				that.friendHashTable.table[friend.uin.toString()] = realNum;
				
				delayFunction(this, next)();
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
				hash: hash_func (that.auth.uin, that.auth.ptwebqq),
				vfwebqq: that.auth.vfwebqq
			})
		}, function (ret) {
			if (ret.retcode == 50) {
				that.log.error ('Fetch friend list(50): ptWebQQ expired, reboot jjBot without --shareLogin.');
				// process.exit (11);
			} else if (ret.retcode) {
				that.log.error ('Fetch friend list error:', ret);
				
				that.mod.queue.unlock (queueName);
				if (numTry < that.conf.maxRetry)
					that.getFriends (cb, numTry + 1);
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
	getGroupList: function (cb, numTry) {
		var that = this;
		numTry = numTry || 0;
		var queueName = 'groupList';
		if (that.mod.queue.reg (queueName, cb))
			return;

		if (debug.CORE)
			that.mod.log.info ('getGroupList');
		
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
				that.groupList.vfAuth = that.auth.vfwebqq;
				that.mod.cache.save('groupList', that.groupList);
				that.getAllGroupInfo ();
				that.mod.queue.done (queueName, that.groupList);
			}
		});
	},
	
	getAllGroupHashTable: function (cb, bForceUpd) {
		var queueName = 'qGetAllGroupHashTable';
		if (this.mod.queue.reg (queueName, cb)) return;
		var that = this;
		
		if (!bForceUpd && this.cacheUsable('groupHashTable')) {
			this.log.warn ('groupHashTable: Not expired yet, refuse reload hash table.');
			return ;
		}
		
		that.groupHashTable = {
			vfAuth: that.auth.vfwebqq,
			table: {}
		};
		
		// 抓取群号
		loopArray (this, this.groupList.gnamelist, function (next, group) {
			var groupId = group.code.toString();
			this.uinToNum (groupId, true, function (realNum) {
				that.log.info ('Fetch group num ->', realNum);
				that.groupHashTable.table[groupId] = realNum;
				
				delayFunction(this, next)();
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
		
		this.log.info ('Fetch all group info...');
		
		// 抓取群组数据
		loopArray (this, this.groupList.gnamelist, function (next, group) {
			this.getGroupInfo (group.code.toString(), false, delayFunction(this, next));
		}, function () {
			this.getAllGroupHashTable ();
			this.mod.queue.done(queueName);
		});
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

		if (debug.CORE)
			that.mod.log.info ('getGroupInfo:', gcode);
		
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

		if (!targetId) {
			that.mod.log.msg ('[CONSOLE] Send:', content);
			return ;
		}
		
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

		if (debug.CORE)
			that.mod.log.info ('getUser:', uin);
		
		cb (arrFilter(that.friends.info, function (u) { return uin === u.uin; }, {}));
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
		var newUserData = arrFilter (that.groups[gid].minfo, function (minfo) { return minfo.uin == uin; });

		if (!newUserData) {
			// 新用户入群, 还没有数据; 请求重载
			if (debug.group) that.mod.log.warn ('GID:', gid, ' User info not found, fooReloadGroup');
			
			// 重试次数过多
			if (numTry > that.conf.maxRetry) {
				that.log.error ('Max Retry for get user;', args);
				return;
			}
			
			// 抓取群组 gCode
			var gCode = arrFilter(that.groupList.gnamelist, function (l) {
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
		var userCardInfo = arrFilter (that.groups[gid].cards, function (cards) { return cards.muin == uin; }, {});
		newUserData.profileName = newUserData.nick;
		newUserData.nick = userCardInfo.card || newUserData.nick;
		
		process.nextTick (function () {
			cb (newUserData);
		});
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

		msg.user = userData;
		
		this.Plugin.on('msg', msg.strMsg, msg, this.createCallback(
			this, this.sendMsg, msg.isGroup, msg.from_gid || msg.from_uin)
		);
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