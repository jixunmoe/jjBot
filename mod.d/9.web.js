/*jslint node: true*/
/*global __FLAG__, debug*/

var http = require ('http'),
	fs = require ('fs'),
	qs = require('querystring');

function setCookie_ (res, name, value, exdays, domain, path) {
	var cookies = res.getHeader('Set-Cookie');
	if (typeof cookies !== 'object')
		cookies = [];
	
	var exdate = new Date();
	exdate.setDate(exdate.getDate() + exdays);
	var cookieText = name + '=' + value + ';expires=' + exdate.toUTCString() + ';';
	
	if (domain)
		cookieText += 'domain=' + domain + ';';
	
	if (path)
		cookieText += 'path=' + path + ';';
	
	cookies.push(cookieText);
	res.setHeader('Set-Cookie', cookies);
}


function parseCookies (request) {
	var list = {},
		rc = request.headers.cookie;

	if (rc)
		rc.split(';').forEach(function( cookie ) {
			var parts = cookie.split('=');
			// Now use decodeURIComponent instead of unescape.
			// https://github.com/jshint/jshint/issues/125
			list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
		});

	return list;
}

function parseWrite (ret) {
	// Is already Buffer?
	if (ret instanceof Buffer)
		return ret;
	// Is it undefined?
	if (ret === null || ret === undefined)
		return '';

	if (ret instanceof Array)
		ret = { data: ret };
	if (ret instanceof Object)
		ret = JSON.stringify (ret);
	if (ret.stringify)
		ret = ret.stringify ();
	if (ret.toString)
		ret = ret.toString ();
	return ret;
}

function modWeb (conf, mod) {
	var varifyCodeImgBin, loginAuth = '', that = this,
		Bot = {}, fileCache = {};
	
	var handleUrl = function (req, res, $_POST) {
		var $_COOKIE = parseCookies(req),
			urlPart = req.url.replace(/\.\.\//g, '').match(/(\/[^?]*)\??(.*)/),
			url = urlPart[1],
			$_GET = {},
			urlExt = (url.match(/.+\.(.+)$/)||[,])[1],
			oldUrl = url;

		// 禁止直接访问 tpl 模板文件
		if (urlExt == 'tpl') return res.end ();

		urlPart[2].split('&').forEach (function (a) {
			$_GET [a.substr(0,a.indexOf('='))] = decodeURIComponent(a.substr(a.indexOf('=')+1));
		});
		
		function setCookie (name, value, exdays, domain, path) {
			setCookie_ (res, name, value, exdays, domain, path);
		}

		// if (url == '/') url = '/index.html';
		
		var echo = function (a) {
			res.write (a.toString());
		};
		
		var isExec = url.slice(-8) == '.node.js';
		
		switch (urlExt) {
			case 'js': case 'css': case 'ico':
				if (isExec) break;
				
				// Cache for a year.
				console.log ('Cacheble file:', url);
				res.setHeader('Cache-Control', 'public, max-age=31556926');
				res.setHeader('Expires', 'Thu, 01 Jan 2099 00:00:00 GMT');
				if (fs.existsSync(conf.webPath + url) && !fs.lstatSync(conf.webPath + url).isDirectory()) {
					// Cache the file.
					res.write (fileCache[url] || (fileCache[url] = fs.readFileSync(conf.webPath + url)));
					res.end ();
					return;
				}
				break;
		}
		
		if (__FLAG__.noWebLogin || $_COOKIE.auth && loginAuth && loginAuth == $_COOKIE.auth) {
			var ret;
			if (url == '/code.img') {
				res.setHeader('Content-Type', 'image/png');
				res.end (varifyCodeImgBin, 'binary');
				return;
			} else if (url == '/plug.res') {
				// API request, for plugin
				
				if (debug.web)
					mod.log.web ('Request plug.res:', $_GET.p);

				// Not valid request, deny.
				if (!$_GET.p)
					return res.end ();

				res.write (parseWrite(Bot.Plugin.onSync ('web-plug-res-' + $_GET.p, 1, $_GET, $_POST, $_COOKIE, setCookie)));
				
				// API
				return res.end ();
			} else if (url == '/plug.api') {
				// API request, for plugin
				
				// Not valid request, deny.
				if (!$_GET.a)
					return res.end ();

				if (debug.web)
					mod.log.web ('Request plug.api:', $_GET.a);

				res.write (parseWrite(Bot.Plugin.onSync ('web-plug-api-' + $_GET.a, 1, $_GET, $_POST, $_COOKIE, setCookie)));

				// API
				return res.end ();
			}
		} else if (url.indexOf ('/auth/')) {
			// If url start with /auth/, indexOf will return 0 (false)
			url = '/auth/' + url;
		}

		if (!fs.existsSync(conf.webPath + url)) {
			if (!fs.existsSync(conf.webPath + url + '.html')) {
				res.statusCode = 404;
				mod.log.error ('File not found:', url);
				url = '/404.html';
			} else {
				url += '.html';
			}
		} else if (fs.lstatSync(conf.webPath + url).isDirectory ()) {
			if (fs.existsSync(conf.webPath + url + '/index.html')) {
				url += '/index.html';
			} else {
				url = '/404.html';
			}
		}
		mod.log.web ('Request ' + url);
		function loadTemplate (url) {
			var fc = fs.readFileSync (conf.webPath + url).toString(),
				$_G = {};
			res.write (fc.replace(/([\s\S]*?)<#([\s\S]+?)#>/g, function (a, html, tempCode) {
				if (html) echo (html);
				/* jshint ignore:start */
				eval (tempCode);
				/* jshint ignore:end */
				return '';
			}));
		}
		
		// We're Node :)
		if (isExec) {
			try {
				/* jshint ignore:start */
				eval(fs.readFileSync (conf.webPath + url).toString());
				/* jshint ignore:end */
			} catch (e) {
				mod.log.error ('Exec script failed:', e.message, e.stack);
			}
		} else {
			loadTemplate(url);
		}
		
		res.end();
	};

	var webPort = parseInt(__FLAG__.port || conf.port);
	
	mod.log.web ('Web Server launched at port:', webPort);
	var imgServer = http.createServer (function (req, res) {
		if (req.method == 'POST') {
			var postData = '';
			req.on('data', function(chunk) {
				postData += chunk.toString();
			});
			req.on('end', function() {
				var newPostData;
				try {
					// Angularjs' json post data orz
					newPostData = 
						req.headers['content-type'].indexOf('application/json') != -1 ?
							JSON.parse(postData) : qs.parse(postData);
				} catch (e) {
					// Not valid post data :<
					newPostData = {};
				}
				handleUrl (req, res, newPostData);
			});
		} else {
			handleUrl (req, res, {});
		}
	}).listen(webPort);

	/**
	 * Update the image in memory with the new one.
	 * @param  {Buffer} newCode The binary of the new image.
	 * @return {none}
	 */
	that.updateVarifyCode = function (newCode) {
		varifyCodeImgBin = newCode || fs.readFileSync(conf.webPath + '/code.png');
	};
	that.updateVarifyCode();

	/**
	 * Store the bot object as private variable.
	 * @param  {clsBot} newBot The bot Object
	 * @return {none}
	 */
	that.initBot = function (newBot) {
		Bot = newBot;
	};
}

module.exports = function (conf, mod) {
	if (__FLAG__.noWebLogin)
		mod.log.security ('--noWebLogin flag specified, any one can visit the front-end for jjBot.');

	return new modWeb (conf, mod);
};