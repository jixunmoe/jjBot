/*jslint node:true*/

var _     = require('util').format,
	mysql = require('mysql2'),
	__    = function (foo) {
		// Extract string from function comment.
		// Check function youself before call to here.
		return foo.toString ().match(/\{\s*\/\*\s*([\s\S]*?)\s*\*\/\s*\}/)[1];
	};

var modDB = function (conf, mod) {
	this.conf = conf.mysql;
	this.mod  = mod;
	this._  =  _; // sprintf like.
	this.__ = __; // extract string comment (multiline) from function.
	
	var authData = conf.mysql.auth;
	authData.multipleStatements = true;
	this.db   = mysql.createConnection (authData);
	this.db.query (_('create database if not exists `%s`; use `%s`;', conf.mysql.database, conf.mysql.database));
};

module.exports = function (conf, mod) {
	return new modDB (conf, mod);
};