var mQueue = function (conf, mod) {
	this.mod = mod;
	this.queueList = {};
	this.locks = {};
};

mQueue.prototype = {
	reg: function (name, cb) {
		var isLocked = this.isLock(name);
		if (debug.queue) this.mod.log.info ('Added to queue ->', name);

		this.locks[name] = true;
		if ('function' == typeof cb) {
			if (!this.queueList[name])
				this.queueList[name] = [];
			
			this.queueList[name].push (cb);
		}
		return isLocked;
	},
	lock: function (name) {
		if (debug.queue) this.mod.log.info ('Lock queue ->', name);
		this.locks[name] = true;
	},
	unlock: function (name) {
		if (debug.queue) this.mod.log.info ('Unlock queue ->', name);
		this.locks[name] = false;
	},
	done: function (name) {
		if (debug.queue) this.mod.log.info ('Finished queue ->', name);
		for (var i=0; i<this.queueList.length; i++)
			this.queueList[i] ();

		this.rm (name);
	},
	rm: function (name) {
		if (debug.queue) this.mod.log.info ('Remove queue ->', name);
		this.queueList[name] = null;
		this.locks[name]     = false;
	},
	isLock: function (name) {
		if (debug.queue) this.mod.log.info ('Check isLock ->', name);
		return this.locks[name];
	}
};

module.exports = function (conf, mod) {
	return new mQueue (conf, mod);
};
