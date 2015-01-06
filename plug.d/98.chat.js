/*jslint node: true*/
var sprintf = require('util').format;

var pluginChat = function (Bot, regEvent) {
	this.bot = Bot;
	this.mod = Bot.mod;
	this.regEvent = regEvent;
	this.ext = Bot.mod.db;
	this.db = this.ext.db;
	this.disabled=false;
	this.count=0;
	Bot.mod.log.info ('Init. database ...');
	this.db.query (this.ext._(this.ext.__(function () {/*
	create table if not exists `jB_chat` (
		`ask` TEXT NOT NULL,
		`answer` TEXT NOT NULL
	)ENGINE = %s DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
	*/}), this.ext.conf.engine));
};

/* 本模组的config，请添加到config.yaml

# 聊天插件设置
chat:
# 我的称呼
    name: 'jjBot'
# 群组中的回复率
    answerRate: 0.8
# 是否接收禁用 / 启用命令
    recieveDisable: false
# 禁用 / 启用命令
    disableCmd: '闭嘴'
    enableCmd: '张嘴'
# 禁用 / 启用命令是否需要jj/前缀
    usePrefixToDisable: false
# 禁用/启用所需次数
    disableCount: 3
# 管理员QQ号列表：可以无视上面的次数【TODO】
    directDisable:
        - 10000
# 是否允许教学
    allowTeach: true
# 教学指令 (需要jj前缀)
    teachCommand: 'ask'
# 教学指令中问与答的分隔符
    teachSeparator: 'answer'
# 回复中可以使用的特殊指令，每行一条
    replyArgs:
        - name: 'msg.user.nick'
        - myname: 'that.conf.name'
        - cqname: 'that.conf.name' # 与某常见机器人保持词库兼容
        - qqnum: 'msg.ucdata.qNum'
        - nick: 'msg.ucdata.userNick || msg.user.nick'
*/

function SelectBestAnswer(data) {
	var key=[];
	var answer=[];
	for(var i in data) { //关键词和回复的初始权重
		if(!key[data[i].ask]) key[data[i].ask]=data[i].ask.length*2; //关键词的初始权重为字数*2
		else key[data[i].ask]++; //被教过一次+1
		if(!answer[data[i].answer]) answer[data[i].answer]=0; 
		answer[data[i].answer]+=data[i].ask.length*2; //把关键词的初始权重赋给回复作为初始值
	}
	for(var ans in answer) {
		for(var ask in key) { //检测回复中出现的所有关键词（包括重复的）
			eval("var cnt=ans.match(/"+ask+"/g)");
			if(cnt!=null)
				answer[ans]+=(cnt.length*key[ask]); //回复的权重加上(关键词权重*出现次数)
		}
	}
	answer.sort(function(a,b) {if (x > y) return -1; else  return 1;});
	var ret=[];
	var lastWeight=0;
	for(var ans in answer) { //返回5条权重最高的，相同的都返回
		if(ret.length>5 && lastWeight>answer[ans]) break;
		ret.push(ans);
		lastWeight=answer[ans];
	}
	return ret;
}


pluginChat.prototype = {
	name  : '聊天',
	ver   : '0.3',
	author: 'lyh',
	desc  : '根据收到的聊天信息给出回复。依赖 db 模组。',
	disable: function(next,reply) {
		if(!this.disabled) {
			this.count++;
			if(this.count==this.conf.disableCount) {
				reply(this.conf.name+'已停用，发送 '+(this.conf.usePrefixToDisable?(this.bot.conf.cmdPrefix+'/'):'')+this.conf.enableCmd+' 来启用我');
				this.disabled=true;
				this.count=0;
			}else reply('已有'+this.count+'人请求停用'+this.conf.name+'，还需要 '+(this.conf.disableCount-this.count)+' 人请求才会执行~');
		}
	},
	enable: function(next,reply) {
		if(this.disabled) {
			this.count++;
			if(this.count==this.conf.disableCount) {
				reply(this.conf.name+'已启用，发送 '+(this.conf.usePrefixToDisable?(this.bot.conf.cmdPrefix+'/'):'')+this.conf.disableCmd+' 来停用我');
				this.disabled=false;
				this.count=0;
			}else reply('已有'+this.count+'人请求启用'+this.conf.name+'，还需要 '+(this.conf.disableCount-this.count)+' 人请求才会执行~');
		}
	},
	load: function () {
		if(typeof(this.bot.conf.chat)!='undefined')
			this.conf=this.bot.conf.chat;
		else {
			this.conf=new Object();
			//载入缺省配置
			this.conf.name= 'jjBot';
			this.conf.answerRate= 0.8;
			this.conf.recieveDisable= false; //太容易触发禁言
			this.conf.disableCmd= '闭嘴';
			this.conf.enableCmd= '张嘴';
			this.conf.usePrefixToDisable= false;
			this.conf.disableCount= 3;
			this.conf.directDisable={};
			this.conf.allowTeach= true;
			this.conf.teachCommand= 'ask';
			this.conf.teachSeparator= 'answer';
			this.conf.replyArgs={name: 'msg.user.nick',myname: 'that.conf.name',cqname: 'that.conf.name',qqnum: 'msg.ucdata.qNum',nick: 'msg.ucdata.userNick || msg.user.nick'}
		}
		
		var that = this;
		if(that.conf.recieveDisable) {
			if(that.conf.usePrefixToDisable) {
				// 设置命令说明文本
				that.regEvent ('help-init', function () {
					that.bot.Plugin.on('help-set-cmd-desc',that.conf.disableCmd,'让我闭嘴');
					that.bot.Plugin.on('help-set-cmd-desc',that.conf.enableCmd,'让我继续聊天');
				});
				// 安装 Hook
				that.regEvent ('msg-cmd-'+that.conf.disableCmd, that.disable(next,reply));
				that.regEvent ('msg-cmd-'+that.conf.enableCmd, that.enable(next,reply));
			} else {
				that.regEvent ('msg', function (next,content, msg, reply) {
					if(content.replace(/(^\s*)|(\s*$)/g,"")==that.conf.disableCmd) {
						that.disable(next,reply);
					}
					if(content.replace(/(^\s*)|(\s*$)/g,"")==that.conf.enableCmd)
						that.enable(next,reply);
				});
			}
		}
		
		if(!that.disabled) {
			if(that.conf.allowTeach) {
				that.regEvent ('help-init', function () {
					that.bot.Plugin.on('help-set-cmd-desc',that.conf.teachCommand,'关键词 '+that.conf.teachSeparator+' 回答','教我说话');
				});
				that.regEvent('msg-cmd-'+that.conf.teachCommand, function (next,reply, msg, args) {
					var str=args.join(' ');
					str=str.split(' answer ');
					if(!str[1] || str[2]) {
						reply('请按照 '+that.bot.conf.cmdPrefix+'/'+that.conf.teachCommand+' 收到的内容 '+that.conf.teachSeparator+' 回答的内容 的格式来教我说话哦');
						return;
					}
					var check=str[1].match(/\[[^\]]*\]/g);
					if(check!=null) {
						for(var k in check) {
							if(typeof(that.conf.replyArgs[check[k].substr(1,check[k].length-2)])=='undefined') {
								reply('啊咧咧？ '+check[k]+' 这个变量找不到诶……');
								return;
							}
						}
					}
					that.db.query ('INSERT INTO `jB_chat` VALUES (?,?);', [str[0],str[1]], function () {
						if(check!=null) {
							var to_print=str[1].replace(/\[([^\]]*)\]/g,'%s');
							var to_do='sprintf(to_print';
							for(var k in check) {
							to_do+=',"'+eval(that.conf.replyArgs[check[k].substr(1,check[k].length-2)])+'"';
							}
							to_do+=')';
							str[1]=eval(to_do);
						}
						reply(str[1]);
					});
				});
			}
		}
		that.regEvent('msg',function (next,str,msg,reply) {
			if(!that.disabled) {
				if(!msg.isGroup || Math.random()<=that.conf.answerRate) {
					that.db.query ('select * from `jB_chat` where ? like concat(\'%\',ask,\'%\')', str, function (err, data) {
						if (data.length) {
							data=SelectBestAnswer(data);
							data.sort(function() {return 0.5-Math.random(); });
							var real_data=data[0];
							var check=real_data.match(/\[[^\]]*\]/g);
							if(check!=null) {
								var to_print=data[0].replace(/\[([^\]]*)\]/g,'%s');
								var to_do='sprintf(to_print';
								for(var k in check) {
									to_do+=',"'+eval(that.conf.replyArgs[check[k].substr(1,check[k].length-2)])+'"';
								}
								to_do+=')';
								real_data=eval(to_do);
							}
							reply(real_data);
						}
					});
				}
			}
		});
	},
	unload: function () {
		this.disabled=false;
		this.count=0;
		this.conf={};
	}
};

module.exports = pluginChat;