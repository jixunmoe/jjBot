/*jslint node:true*/
/*global __FLAG__, debug*/
var http = require ('http'),
	qs   = require ('querystring'),
	Form = require ('form-data');

// 默认: s.web2.qq.com
var apiHost    = 's.web2.qq.com',
	uploadHost = 'up.web2.qq.com',
	apiProxy   = 'http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3';

function onJSONCallback (that, cb, preSetup) {
	return onDataCallback (that, function (body, r) {
		var obj = { };
		body = body.trim();
		try {
			obj = JSON.parse(body);
		} catch (e) {
			that.bot.log.error (e, body);
		}
		cb (obj, body, r);
	}, preSetup);
}

function onDataCallback (that, cb, preSetup) {
	var body = '';
	return function (r, rq) {
		if (typeof r == 'string')
			that.bot.log.error (r);
		
		if (r && !r.on && !rq) return ; // Invalid response object.
		if (rq && rq.on) r = rq;
		
		if (r.resume) r.resume ();
		
		if (preSetup) preSetup (r);

		r.on ('data', function (chunk) {
			body += chunk;
		});
		r.on ('end', function () {
			process.nextTick (cb.bind({}, body.toString(), r));
		});
	};
}

var BotAPI = function (Bot) {
	this.bot = Bot;
};

BotAPI.prototype = {
	get: function (path, query, cb, numTry) {
		var that = this;
		numTry = numTry || 0;
		
		if (debug.api) this.bot.log.info ('GET :', path);
		if (debug.api_data) this.bot.log.info (query);

		if (__FLAG__.offline) return cb ({ retcode: 998, msg: 'offline mode', result: {account: '123456'} });

		if ('function' == typeof query) {
			cb = query;
			query = '';
		} else if ('string' != typeof query) {
			query = qs.stringify (query);
		}

		if (query) path += '?' + query;

		return http.get ({
			host: apiHost,
			path: path,
			mathod: 'GET',
			headers: {
				Cookie: that.bot.auth.cookie,
				Referer: apiProxy,
				'User-Agent': this.bot.conf.userAgent
			}
		}, onJSONCallback(that, cb)).on('error', function (e) {
			that.bot.log.error (e);
			if (numTry < that.bot.conf.maxRetry) {
				that.bot.log.error ('GET Failed, retry ...', numTry);
				
				process.nextTick (function () {
					that.get (path, query, cb, numTry + 1);
				});
			}
		});
	},
	post: function (path, data, cb, host, numTry) {
		var that = this;
		numTry = numTry || 0;
		
		if (debug.api)
			this.bot.log.info ('POST:', path);
		if (debug.api_data)
			this.bot.log.info (data);
		
		if (__FLAG__.offline) return cb ({ retcode: 998, msg: 'offline mode', result: {account: '123456'} });
		var postData = qs.stringify (data);

		var req = http.request ({
			host: host || apiHost,
			path: path,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Content-Length': Buffer.byteLength(postData),
				Cookie: that.bot.auth.cookie,
				Referer: apiProxy,
				'User-Agent': this.bot.conf.userAgent
			}
		}, onJSONCallback(that, cb));
		req.on('error', function (e) {
			that.bot.log.error (e);
			
			if (numTry < that.bot.conf.maxRetry) {
				that.bot.log.error ('POST Failed, retry ...', numTry);
				
				process.nextTick (function () {
					that.post (path, data, cb, host, numTry + 1);
				});
			}
		});
		req.write (postData);
		req.end ();
		return req;
	},
	upload: function (path, data, cb, host, numTry) {
		if (debug.api) this.bot.log.info ('UPLOAD:', path);
		
		if (__FLAG__.offline) return cb ({ retcode: 998, msg: 'offline mode', result: {account: '123456'} });
		
		var form = new Form();
		for (var i=0; i<data.length; i++)
			form.append.apply (form, data[i]);
		
		return form.submit ({
			host: host || uploadHost,
			path: path,
			port: 80,
			headers: {
				Cookie: this.bot.auth.cookie,
				Referer: 'http://up.web2.qq.com/',
				'User-Agent': this.bot.conf.userAgent
			}
		}, onDataCallback(this, cb));
	}
};

module.exports = BotAPI;