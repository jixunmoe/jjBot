/*jslint node:true*/
/*global console, __FLAG__, debug*/
var http = require ('http'),
	qs   = require ('querystring');

// 默认: s.web2.qq.com
var apiHost = 's.web2.qq.com',
	apiProxy= 'http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3';

function onDataCallback (cb, preSetup) {
	var body = '';
	return function (r) {
		if (preSetup)
			preSetup (r);

		r.on ('data', function (chunk) {
			body += chunk;
		});
		r.on ('end', function () {
			var obj = {};
			body = body.toString().trim();
			try {
				obj = JSON.parse(body);
			} catch (e) {
				console.error (e, body);
			}
			cb (obj, body, r);
		});
	};
}

var BotAPI = function (Bot) {
	this.bot = Bot;
};

BotAPI.prototype = {
	get: function (path, query, cb) {
		if (debug.api)
			this.bot.log.info ('GET :', path);
			if (debug.api_data)
				this.bot.log.info (query);

		if (__FLAG__.offline) return cb ({ retcode: 998, msg: 'offline mode', result: {account: '123456'} });

		var that = this;
		if ('function' == typeof query) {
			cb = query;
			query = '';
		} else if ('string' != typeof query) {
			query = qs.stringify (query);
		}

		if (query) path += '?' + query;

		http.get ({
			host: apiHost,
			path: path,
			mathod: 'GET',
			headers: {
				Cookie: that.bot.cookie,
				Referer: apiProxy,
				'User-Agent': this.bot.conf.userAgent
			}
		}, onDataCallback(cb)).on('error', function (e) {
			that.bot.log.error (e);
		});
	},
	post: function (path, data, cb, host) {
		if (debug.api)
			this.bot.log.info ('POST:', path);
			if (debug.api_data)
				this.bot.log.info (data);
		
		if (__FLAG__.offline) return cb ({ retcode: 998, msg: 'offline mode', result: {account: '123456'} });
		var postData = qs.stringify (data);
		var that = this;

		
		var req = http.request ({
			host: host || apiHost,
			path: path,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Content-Length': Buffer.byteLength(postData),
				Cookie: that.bot.cookie,
				Referer: apiProxy,
				'User-Agent': this.bot.conf.userAgent
			}
		}, onDataCallback(cb));
		req.on('error', function (e) {
			that.bot.log.error (e);
		});
		req.write (postData);
		req.end ();
	}
};

module.exports = BotAPI;