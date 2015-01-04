var isFidHooked = false;
var fidHook = function (mod) {
	if (isFidHooked)
		return;

	var http = require ('http'),
		https= require ('https'),
		url  = require ('url'),
		net  = require ('net');

	var s = new net.Socket();
	s.on('error', function () {
		mod.log.warn ('Fiddler is not up, http.request not patched.');
	});

	s.connect (8888, '127.0.0.1', function () {
		isFidHooked = true;
		mod.log.info ('Fiddler is running, patching http.request..');
		var reqBak = http.request;
		http.request = function (reqObj) {
			var args = arguments;
			if ('string' == typeof reqObj)
				reqObj = url.parse (reqObj);
			
			var oldHost = reqObj.host || reqObj.hostname;
			reqObj.headers = reqObj.headers || {};
			reqObj.headers.host = oldHost;
			reqObj.host = reqObj.hostname = '127.0.0.1';
			reqObj.port = 8888;
			args[0] = reqObj;
			return reqBak.apply (this, args);
		};
		mod.log.info ('http.request patched.');

		s.destroy ();
	});

	s.setTimeout(500, function() { s.destroy(); });
/*
	var reqBak = http.request;
	http.request = function (reqObj) {
		console.info ('%s%s', reqObj.host, reqObj.path || reqObj.pathname);
		return reqBak.apply(this, arguments);
	};
*/
};

module.exports = function (mod) {
	mod.log.info ('>> Fiddler hook');
	fidHook (mod);
};