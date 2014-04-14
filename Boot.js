GLOBAL.__FLAG__ = {};
for (var i=2, curFlag; i<process.argv.length; i++) {
	if (!process.argv[i].indexOf ('--')) {
		// Begin with --
		// Which sets the current flag value.
		curFlag = process.argv[i].slice(2);
		__FLAG__[curFlag] = __FLAG__[curFlag] || [];
	} else if (curFlag && __FLAG__[curFlag]) {
		__FLAG__[curFlag].push (process.argv[i]);
	}
}

/// REQUIRE
var fs   = require ('fs'),
	path = require ('path');
/// 

if (__FLAG__.help) {
	console.log (fs.readFileSync ('./help').toString());
	return;
}

/// Setup
var mCon = new (require('./conf'))(__FLAG__.config ? __FLAG__.config.join(' ') : './config.yaml'),
	conf = mCon.getConf(),
	mod  = {};

/// Get absolute path to current directory.
GLOBAL.__ROOT__ = path.resolve ('.');

function safeName (input) {
	return input.replace(/\.[^.]+?$/, '').replace(/^\d+\./, '').replace(/\./g, '_');
}


console.log ('Loading modules...');
var modules = fs.readdirSync('./mod.d/');
modules.forEach (function (e) {
	var modName = safeName(e);
	if (mod.log)
		mod.log.info ('Loading module:', modName);
	else
		console.log ('Loading module: %s', modName);

	mod[modName] = require('./mod.d/' + e)(conf, mod);

});
mod.log.info ('Project jjBot Boot ::', new Date ());

// 初始化准备…
var initScripts = fs.readdirSync('./init.d/');
initScripts.forEach (function (e) {
	require('./init.d/' + e)(mod);
});

// 开始启动机器人
try {
	require('./core.d/Bot.Core')(conf, mod, mCon);
} catch (e) {
	mod.log.error ('jjBot Bombed.', e.stack, e.message);
	process.exit (9);
}