/* jslint node:true */
/* global __FLAG__ */
var http  = require ('http'),
	https = require ('https'),
	crypt = require ('crypto'),
	url   = require ('url'),
	qs    = require ('querystring'),
	seq   = require ('sequence').Sequence;

function makeCallback (callback) {
	for (var that=this, args=[], i=1; i<arguments.length; i++)
		args.push (arguments[i]);
	return function () {
		return callback.apply (that, args);
	};
}

function onDataCallback (cb, preSetup) {
	var body = '';
	return function (r) {
		if (preSetup)
			preSetup (r);

		r.on ('data', function (chunk) {
			body += chunk;
		});
		r.on ('end', function () {
			cb (body, r);
		});
	};
}

function parseCallback (input) {
	var ret = [];
	input.toString().replace (/\'(.*?)\'/g, function (z, a) { ret.push (a); });
	return ret;
}

var BotAuth = function (Bot) {
	var that = this,
		log = Bot.mod.log;
	that.bot = Bot;
	that.log = log;

	if (__FLAG__.shareLogin) {
		var prevLogin = Bot.mod.cache.load ('authLogin', false);
		if (prevLogin.isLogin) {
			that.log.info ('Using shared login for :', prevLogin.uin);

			that.conf = prevLogin;
			process.nextTick (function () {
				that.bot.loginDone (false);
			});
			return ;
		}
	}
	
	this.conf = {
		qqnum:  __FLAG__.qnum ? __FLAG__.qnum[0] : Bot.conf.qqnum.toString(),
		passwd: __FLAG__.passwd ? __FLAG__.passwd[0] : Bot.conf.passwd,
		isLogin: false,
		cookie: [],
		vfCode: '',
		bitSalt: '',
		login_sig: '',
		psessionid: '',
		uin: '',
		vfwebqq: '',
		gface_key: '',
		gface_sig: '',
		clientid: Math.floor (97500000 + Math.random() * 99999) + ''
	};

	if (__FLAG__.offline) {
		log.warn ('Running offline mode, bot may crash.');
		that.doLogin ();
		return;
	}

	log.info ('Check vfcode...');
	https.get ({
		host: 'ssl.ptlogin2.qq.com',
		path: ('/check?uin=' + this.conf.qqnum + '&appid=1003903&js_ver=10062&js_type=0&r=') + Math.random(),
		headers: { Cookie: 'chkuin=' + this.conf.qqnum }
	}, onDataCallback (function (body, r) {
		that.conf.cookie = r.headers['set-cookie'];

		var json = parseCallback (body);
		if (3 != json.length) throw new Error ('Unable to fetch VFCODE status: ' + body);
		log.info ('vf-status:', json);
		that.checkVFCode (parseInt (json[0]), json[1], json[2]);
	}, function (r) {
		that.conf.cookie = that.conf.cookie.concat (r.headers['set-cookie']);
	})).on ('error', function (e) {
		log.error ('[LOGIN-VFCODE-CHECK]', e);
		process.exit (1);
	});
};

BotAuth.prototype = {
	// Helper function
	md5: function (str, bLower) {
		var ret = crypt.createHash('md5').update(str.toString()).digest('hex');
		if (!bLower) ret = ret.toUpperCase();
		// this.log.info ('[md5]', str, ret);
		return ret;
	},
	hex2ascii: function (hexstr) { 
		var ret = hexstr.replace(/\\x/g, '').match(/\w{2}/g).map(function (byte_str) {
			return String.fromCharCode(parseInt(byte_str, 16));
		}).join('');
		// this.log.info ('[hex2ascii]', hexstr, ret);
		return ret;
	},

	// Core methods
	getCaptcha: function () {
		if (__FLAG__.offline)
			return;

		this.conf.isLogin = false;
		var that = this;
		http.get ({
			host: 'captcha.qq.com',
			path: 'getimage?aid=1003903&r=' + Math.random() + '&uin=' + this.conf.qqnum
		}, onDataCallback (function (body, r) {
			that.bot.log.info ('vfCode downloaded, open your browser and type it.');
			that.bot.mod.web.updateVarifyCode (body);
		}, function (r) {
			that.conf.cookie = that.conf.cookie.concat (r.headers['set-cookie']);
			r.setEncoding ('binary');
		}));
	},
	ranActionCode: function () {
		// return '3-15-72115';
		return Math.floor (Math.random() * 7 + 1) + '-' +
				Math.floor (Math.random() * 20 + 1) + '-' +
				Math.floor (Math.random() * 20000 + 10000);
	},
	getLoginSig: function (cb) {
		if (__FLAG__.offline)
			return cb ('offline');
		// return cb ('qBpuWCs9dlR9awKKmzdRhV8TZ8MfupdXF6zyHmnGUaEzun0bobwOhMh6m7FQjvWA');
		var that = this;
		this.log.info ('Request login_sig ...');
		https.get ({
			host: 'ui.ptlogin2.qq.com',
			path: '/cgi-bin/login?daid=164&target=self&style=5&mibao_css=m_webqq&appid=1003903&enable_qlogin=0&no_verifyimg=1&s_url=http%3A%2F%2Fweb2.qq.com%2Floginproxy.html&f_url=loginerroralert&strong_login=1&login_state=10&t=20130903001'
		}, onDataCallback(function (data) {
			var newSig = data.match (/g_login_sig.*?"(.+?)"/)[1];
			that.log.info ('New login_sig loaded:', newSig);
			that.conf.login_sig = newSig;
			if (cb) cb(newSig);
		}));
	},
	checkVFCode: function (bNeedCode, vfCode, bitSalt) {
		if (__FLAG__.offline)
			return this.doLogin ();

		this.conf.vfCode = vfCode;
		this.conf.bitSalt = bitSalt;

		if (bNeedCode) {
			// Need type code.
			this.bot.log.info ('Need varify code, downloading image...');
			this.getCaptcha ();
			// 多线程抓取数据 owo
			this.getLoginSig ();
		} else {
			this.doLogin ();
		}
	},
	doLogin: function () {
		if (__FLAG__.offline)
			return this.ptuiCB (0, 0, 'http://127.0.0.1:2333/', 0, '離線模式!', 'jjBot');

		var that = this;
		if (this.conf.isLogin)
			return this.bot.log.error ('Already logged in but recv. captcha request.');
		this.conf.isLogin = true;

		seq .create ()
			.then (function (next) {
				// 如果已经有了就不需要再抓取了 owo
				if (that.conf.login_sig) {
					next(that.conf.login_sig);
				} else {
					that.getLoginSig (next);
				}
			})
			.then (function (next, newSig) {
				var firstPass  = that.hex2ascii (that.md5 (that.conf.passwd, true)) + that.hex2ascii (that.conf.bitSalt),
					finalPasswd = that.md5(that.md5(firstPass) + that.conf.vfCode.toUpperCase());
				that.log.info ('Check passwd:', finalPasswd);

				https.get ({
					host: 'ssl.ptlogin2.qq.com',
					path: '/login?u=' + that.conf.qqnum + '&p=' + finalPasswd +
							'&verifycode=' + that.conf.vfCode + 
							'&webqq_type=10&remember_uin=1&login2qq=1&aid=1003903&u1=http%3A%2F%2Fweb2.qq.com%2Floginproxy.html%3Flogin2qq%3D1%26webqq_type%3D10&h=1&ptredirect=0&ptlang=2052&daid=164&from_ui=1&pttype=1&dumy=&fp=loginerroralert&action=' + 
							that.ranActionCode () +
							'&mibao_css=m_webqq&t=1&g=1&js_type=0&js_ver=10062&login_sig=' + newSig,
					headers: { Cookie: that.conf.cookie }
				}, onDataCallback(function (data, r) {
					var ptuiCB = parseCallback(data);
					[0,1,3].forEach(function (e) { ptuiCB[e] = parseInt (ptuiCB[e]); });
					that.ptuiCB.apply (that, ptuiCB);
				}, function (r) {
					that.conf.cookie = that.conf.cookie.concat (r.headers['set-cookie']);
				}));
			});
	}, 
	ptuiCB: function (errorCode, errorCode2, nextUrl, errorCode3, sInfo, nickName) {
		// ptuiCB('0','0','random-link','0','登录成功！', 'Jixun');
		var that = this;
		that.log.info ('Login:', sInfo);
		if (errorCode || errorCode2 || errorCode3) {
			that.log.error ('Login failed! Debug: ', arguments);
			process.exit (3);
			return;
		}

		if (__FLAG__.offline)
			return that.bot.loginDone ();

		var nextUrlObj = url.parse (nextUrl);
		http.get ({
			host: nextUrlObj.host,
			path: nextUrlObj.path,
			headers: { Cookie: that.conf.cookie }
		}, onDataCallback(function (data, r) {
			that.conf.ptwebqq =
				that.conf.cookie.filter (function (e) { return e.indexOf ('ptwebqq') != -1; })
					.pop().replace(/ptwebqq\=(.*?);.*/, '$1');

			var postData = qs.stringify ({
				clientid: that.conf.clientid,
				psessionid: null,
				r: JSON.stringify({
					status: "online",
					ptwebqq: that.conf.ptwebqq,
					passwd_sig: "",
					clientid: that.conf.clientid,
					psessionid: null
				})
			});
			http.request ({
				host: 'd.web2.qq.com',
				path: '/channel/login2',
				method: 'POST',
				headers: {
					'User-Agent': that.bot.conf.userAgent,
					Referer: 'http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=2',
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'Content-Length': Buffer.byteLength(postData),
					Cookie: that.conf.cookie
				}
			}, onDataCallback(function (data, r) {
				var loginInfo = JSON.parse (data);
				if (loginInfo.retcode) {
					that.bot.error ('Failed to recv. bot info:', loginInfo);
					process.exit (4);
					return;
				}

				that.conf.uin        = loginInfo.result.uin;
				that.conf.vfwebqq    = loginInfo.result.vfwebqq;
				that.conf.psessionid = loginInfo.result.psessionid;
				
				// Get face key: Not required, so we're just going to do it async.
				that.getGroupFaceSign ();
				
				process.nextTick(that.bot.loginDone.bind(that.bot));
			})).end (postData);
		}, function (r) {
			// Join Cookies.
			that.conf.cookie = that.conf.cookie.concat (r.headers['set-cookie']);
		}));
	},
	getGroupFaceSign: function () {
		var that = this;
		
		this.bot.log.info ('Fetch Group Face Sig..');
		
		http.get ({
			host: 'd.web2.qq.com',
			path: '/channel/get_gface_sig2?clientid=' + that.conf.clientid + '&psessionid=' + that.conf.psessionid + '&t=' + (+new Date ()),
			headers: {
				'User-Agent': that.bot.conf.userAgent,
				Referer: 'http://d.web2.qq.com/',
				Cookie: that.conf.cookie
			}
		}, onDataCallback(function (data, r) {
			var gSign = JSON.parse (data);
			
			if (gSign.retcode) {
				that.bot.log.error ('Get group face sign failed:', gSign);
				process.exit (14);
			}
			
			that.conf.gface_key = gSign.result.gface_key;
			that.conf.gface_sig = gSign.result.gface_sig;
			
			that.bot.saveAuth ();
			
			that.bot.log.info ('Fetch Group Face Sig finish!');
		})).on ('error', function (e) {
			that.bot.log.error ('[LOGIN-GET-FACE-SIGN]', e);
			process.exit (15);
		});
	}
};

module.exports = BotAuth;
