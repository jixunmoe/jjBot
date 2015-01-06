/*jslint node: true*/

var sprintf = require('util').format;
var pluginHelp = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
	this.listener = Bot.Plugin.listener;
	this.plugins = Bot.Plugin.plugins;
	this.cmdDesc = {};
	this.cmdArgs = {};
	this.setCmdDesc=function(next,cmd,args,desc) {
		if(arguments.length!=3 && arguments.length!=4)
			return;
		if(arguments.length==3) {
			this.setCmdDesc.that.cmdDesc[cmd]=args;
		}
		else {
			this.setCmdDesc.that.cmdArgs[cmd]=args;
			this.setCmdDesc.that.cmdDesc[cmd]=desc;
		}
	}
	this.setCmdDesc.that=this;
};

pluginHelp.prototype = {
	name  : '指令列表',
	ver   : '1.0',
	author: 'lyh',
	desc  : '通过指令 help 显示指令列表，指令 plugins 显示插件列表',
	load: function () {
		var that=this;
		that.regEvent ('help-set-cmd-desc', that.setCmdDesc);
		this.bot.Plugin.on('help-init');
		// 设置命令说明文本
		this.regEvent ('help-init', function () {
			that.bot.Plugin.on('help-set-cmd-desc','help','显示本说明文本');
			that.bot.Plugin.on('help-set-cmd-desc','plugins','显示安装的插件列表');
			//jjBot内置插件
			that.bot.Plugin.on('help-set-cmd-desc','sign','签到，可以获得'+that.bot.conf.user.currency);
			that.bot.Plugin.on('help-set-cmd-desc','money','查看'+that.bot.conf.user.currency+'的数目');
			that.bot.Plugin.on('help-set-cmd-desc','nick','设置昵称');
			that.bot.Plugin.on('help-set-cmd-desc','top','查看'+that.bot.conf.user.currency+'余额排行榜');
			that.bot.Plugin.on('help-set-cmd-desc','pem',false); //在指令列表中隐藏这条指令
			that.bot.Plugin.on('help-set-cmd-desc','pay','用户QQ号 转账数目','转账');
			that.bot.Plugin.on('help-set-cmd-desc','uptime','查看机器人运行时间');
			that.bot.Plugin.on('help-set-cmd-desc','fly','jj fly~');
			that.bot.Plugin.on('help-set-cmd-desc','ping','演示用指令');
			that.bot.Plugin.on('help-set-cmd-desc','prpr','[谁] [什么部位]','舔一舔');
			that.bot.Plugin.on('help-set-cmd-desc','time','报时');
			that.bot.Plugin.on('help-set-cmd-desc','img',false);
		});
		// 安裝 Hook
		this.regEvent ('msg-cmd-help', function (next,reply, msg) {
			rp='当前支持的指令列表如下：\n';
			for(var type in that.listener) {
				if(type.substr(0,8)=='msg-cmd-') {
					var cmdName=type.substr(8);
					if(that.cmdDesc[cmdName]==false)
						continue;
					rp+=that.bot.conf.cmdPrefix+'/'+cmdName;
					if(typeof(that.cmdArgs[cmdName])!="undefined")
						rp+=' '+that.cmdArgs[cmdName];
					if(typeof(that.cmdDesc[cmdName])!="undefined")
						rp+='： '+that.cmdDesc[cmdName];
					rp+='\n';
				}
			}
			reply(rp);
		});
		this.regEvent ('msg-cmd-plugins', function (next,reply, msg) {
			rp='当前已安装的插件列表如下：\n';
			for(var key in that.plugins) {
				rp+=that.plugins[key].name+' '+that.plugins[key].ver+' 作者：'+that.plugins[key].author+' '+that.plugins[key].desc+'\n';
			}
			reply(rp);
		});
	},
	unload: function () {
		this.cmdDesc = {};
		this.cmdArgs = {};
	}
};

module.exports = pluginHelp;