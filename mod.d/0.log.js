/*jslint node:true*/

/// Require
var fs   = require('fs'),
	util = require('util');
/// 

function getTimeStr () {
	var newTime = new Date ();
	return newTime.getHours () + ':' + newTime.getMinutes() + ':' + newTime.getSeconds ();
}

function argProc (arg, firstData) {
	for (var ret=[firstData], i=0; i<arg.length; i++)
		ret.push (arg[i]);
	return ret;
}

function joinArg (arg) {
	for (var ret=[], i = 0, data; i < arg.length; i++) {
		data = arg[i];
		if ('number' == typeof data && isNaN (data)) {
			ret.push ('NaN');
		} else if (data === null || data === undefined) {
			ret.push ('* undefined *');
		} else if ('string' == typeof data) {
			ret.push (data);
		} else if (data.stringify) {
			ret.push (data.stringify());
		} else if ('object' == typeof data) {
			ret.push (util.inspect(data, {
				depth: 5
			}));
		} else {
			ret.push (data.toString ());
		}
	}
	return ret.join(' ');
}

var log = function (conf) {
	// If already inited, just call it.
	if (this.info)
		return this.info.apply(this, arguments);
	
	var hFile = fs.openSync (conf.logPath, 'a');
	if (!hFile) throw new Error ('Failed to open log file.');

	/**
	 * RAW
	 * @param  {String} status The status of the log
	 * @param  {Any}     ...   The entries to be logged.
	 * @return {none}
	 */
	this._ = function (status) {
		var args = arguments;
		args[0] = '[' + getTimeStr() + '][' + status + ']:';
		var logStr = joinArg(args),
			toFile = new Buffer(logStr + '\n');
		console.log (logStr.replace(/\r/g, '\n'));
		fs.write (hFile, toFile, 0, toFile.length);
	};
	/**
	 * Display a warn message.
	 * @return {none}
	 */
	this.warn = function () {
		this._.apply (this, argProc(arguments, 'WARN'));
	};
	/**
	 * Display a message.
	 * @return {none}
	 */
	this.msg = function () {
		this._.apply (this, argProc(arguments, 'MSG '));
	};
	/**
	 * Display an event message.
	 * @return {none}
	 */
	this.event = function () {
		this._.apply (this, argProc(arguments, 'EVE '));
	};
	/**
	 * Display INFO
	 * @return {none} 
	 */
	this.info = this.log = function () {
		this._.apply (this, argProc(arguments, 'INFO'));
	};
	/**
	 * Display web route info
	 * @return {none} 
	 */
	this.web = function () {
		this._.apply (this, argProc(arguments, 'WEB '));
	};
	/**
	 * Display an error message
	 * @return {none}
	 */
	this.error = function () {
		this._.apply (this, argProc(arguments, 'ERR '));
	};
	/**
	 * Display an security log.
	 * @return {none}
	 */
	this.security = this.secu = function () {
		this._.apply (this, argProc(arguments, '!SE!'));
	};
};

module.exports = function (conf) {
	var modLog = new log (conf);
	// modLog.log ('New LOG instance:', (new Error).stack.replace('Error', ''));
	return modLog;
};