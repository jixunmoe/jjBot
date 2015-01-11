/*jslint node: true*/

var sprintf = require('util').format;
var https = require('https');
var qs = require ('querystring');
var _ = require('underscore');


var pluginHitokoto = function () { };
pluginHitokoto.prototype = {
	name  : 'Hitikoto',
	ver   : '1.0',
	author: 'Jixun',
	desc  : '每隔一段回复进行自动回复',
	load: function () {
		var self = this;
		self.init (self);
		self.register (self);
	},
	unload: function () {
		delete this.counts;
		delete this.plugDir;
		delete this.template;
		delete this.config;
	},

	compact: function (srcObj) {
		_.each(srcObj, function (v, k) {
			if (!v) delete srcObj[k];
		});

		return srcObj;
	},

	handleRequest: function (cb, r) {
		var q = '';
		r.on ('data', function (chunk) {
			q += chunk;
		});

		r.on ('end', function () {
			cb (q);
		});
	},

	init: function (self) {
		self.counts = {};
		self.plugDir = 'hitokoto.d';

		self.loadPluginConfig({
			replyRate: 0.5,
			replyWait: 5,
			tpl: '{{ hitokoto }}\n  -- {{ author }}//{{ source }}',

			hitokoto: {
				cat: 'a',
				uid: 0,
				mix: 0,
				ucat: 0,
				length: 0
			}
		});

		self.compact (self.config.hitokoto);

		self.template = _.template(self.config.tpl);
		self.path  = '/rand?' + qs.stringify(self.config.hitokoto);
	},

	register: function (self) {
		self.regEvent ('msg', function (next, strMsg, msg, reply) {
			if (msg.isGroup && self.needReply (String(msg.from_gid))) {
				https.get ({
					mathod: 'GET',
					host: 'api.hitokoto.us',
					port: 214,
					path: self.path,

					headers: {
						'User-Agent': self.userAgent
					}
				}, self.handleRequest.bind(self, function (data) {
					reply (self.template(JSON.parse(data)));
				}));
			}
		});
	},

	needReply: function (gid) {
		if (!this.counts[gid]) {
			this.counts[gid] = 1;
		} else {
			this.counts[gid]++;
		}

		if (this.counts[gid] > this.config.replyWait) {
			this.counts[gid] = 0;
			return Math.random() < this.config.replyRate;
		}

		return false;
	}
};

module.exports = pluginHitokoto;