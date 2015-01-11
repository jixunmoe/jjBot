/*jslint node: true*/
/*global __FLAG__, debug*/

var fs = require('fs'),
	crypto = require('crypto'),
	_ = require('underscore');

var BotChat = function (Bot) {
	this.bot = Bot;
};

BotChat.prototype = {
	init: function () {
		var Bot = this.bot;
		this.uploadHistory = Bot.mod.cache.load ('uploadHistory');
		if (!this.uploadHistory[Bot.auth.qqnum])
			this.uploadHistory[Bot.auth.qqnum] = [];

		this.history = this.uploadHistory[Bot.auth.qqnum];

		this.saveHistory = function () {
			Bot.mod.cache.save ('uploadHistory', this.uploadHistory);
		};
	},
	
	uploadFace: function (filePath, cb) {
		throw new Error ('腾讯的服务器关了, 图片上传不了, 机器人爆炸');
	},

	Builder: function (isGroup, defMsg, font) {
		this.isGroup = !!isGroup;

		this.msg  = defMsg || [];
		this.font = _.extend ({
			// Bold, Italic, Underline
			// 1: True, 0: False
			style: [0, 0, 0],
			color: '000000',
			size:  11,
			name:  '微软雅黑'
		}, font);
	},

	// Source: http://pub.idqqimg.com/smartqq/js/mq.js
	face: {"smile":14,"grimace":1,"drool":2,"scowl":3,"coolguy":4,"sob":5,"shy":6,"silent":7,"sleep":8,"cry":9,"awkward":10,"angry":11,"tongue":12,"grin":13,"surprise":0,"frown":50,"ruthless":51,"blush":96,"scream":53,"puke":54,"chuckle":73,"joyful":74,"slight":75,"smug":76,"hungry":77,"drowsy":78,"panic":55,"sweat":56,"laugh":57,"commando":58,"determined":79,"scold":80,"shocked":81,"shhh":82,"dizzy":83,"tormented":84,"toasted":85,"skull":86,"hammer":87,"wave":88,"speechless":97,"nosepick":98,"clap":99,"shame":100,"trick":101,"bah! l":102,"bah! r":103,"yawn":104,"pooh-pooh":105,"shrunken":106,"tearingup":107,"sly":108,"kiss":109,"wrath":110,"whimper":111,"cleaver":112,"watermelon":32,"beer":113,"basketball":114,"pingpong":115,"coffee":63,"rice":64,"pig":59,"rose":33,"wilt":34,"lips":116,"heart":36,"brokenheart":37,"cake":38,"lightning":91,"bomb":92,"dagger":93,"soccer":29,"ladybug":117,"poop":72,"moon":45,"sun":42,"gift":39,"hug":62,"strong":46,"weak":47,"shake":71,"peace":95,"fight":118,"beckon":119,"fist":120,"pinky":121,"rockon":122,"no":123,"ok":124,"inlove":27,"blowkiss":21,"waddle":23,"tremble":25,"aaagh":26,"twirl":125,"kotow":126,"dramatic":127,"jumprope":128,"surrender":129,"exciting":130,"hiphot":131,"showlove":132,"tai chi l":133,"tai chi r":134,"congratulations":136,"firecracker":137,"lantern":138,"richer":139,"karaoke":140,"shopping":141,"email":142,"handsome":143,"cheers":144,"pray":145,"blowup":146,"lolly":147,"milk":148,"noodles":149,"banana":150,"plane":151,"car":152,"locomotive":153,"train":154,"train tail":155,"cloudy":156,"rain":157,"dollor":158,"panda":159,"bulb":160,"windmill":161,"clock":162,"umbrella":163,"balloon":164,"ring":165,"sofa":166,"toiletpaper":167,"pill":168,"pistol":169,"frog":170},

	face_cn: {"微笑":14,"撇嘴":1,"色":2,"发呆":3,"得意":4,"流泪":5,"害羞":6,"闭嘴":7,"睡":8,"大哭":9,"尴尬":10,"发怒":11,"调皮":12,"呲牙":13,"惊讶":0,"难过":50,"酷":51,"冷汗":96,"抓狂":53,"吐":54,"偷笑":73,"可爱":74,"白眼":75,"傲慢":76,"饥饿":77,"困":78,"惊恐":55,"流汗":56,"憨笑":57,"大兵":58,"奋斗":79,"咒骂":80,"疑问":81,"嘘":82,"晕":83,"折磨":84,"衰":85,"骷髅":86,"敲打":87,"再见":88,"擦汗":97,"抠鼻":98,"鼓掌":99,"糗大了":100,"坏笑":101,"左哼哼":102,"右哼哼":103,"哈欠":104,"鄙视":105,"委屈":106,"快哭了":107,"阴险":108,"亲亲":109,"吓":110,"可怜":111,"菜刀":112,"西瓜":32,"啤酒":113,"篮球":114,"乒乓":115,"咖啡":63,"饭":64,"猪头":59,"玫瑰":33,"凋谢":34,"示爱":116,"爱心":36,"心碎":37,"蛋糕":38,"闪电":91,"炸弹":92,"刀":93,"足球":29,"瓢虫":117,"便便":72,"月亮":45,"太阳":42,"礼物":39,"拥抱":62,"强":46,"弱":47,"握手":71,"胜利":95,"抱拳":118,"勾引":119,"拳头":120,"差劲":121,"爱你":122,"no":123,"ok":124,"爱情":27,"飞吻":21,"跳跳":23,"发抖":25,"怄火":26,"转圈":125,"磕头":126,"回头":127,"跳绳":128,"挥手":129,"激动":130,"街舞":131,"献吻":132,"左太极":133,"右太极":134,"双喜":136,"鞭炮":137,"灯笼":138,"发财":139,"k歌":140,"购物":141,"邮件":142,"帅":143,"喝彩":144,"祈祷":145,"爆筋":146,"棒棒糖":147,"喝奶":148,"下面":149,"香蕉":150,"飞机":151,"开车":152,"左车头":153,"车厢":154,"右车头":155,"多云":156,"下雨":157,"钞票":158,"熊猫":159,"灯泡":160,"风车":161,"闹钟":162,"打伞":163,"彩球":164,"钻戒":165,"沙发":166,"纸巾":167,"药":168,"手枪":169,"青蛙":170}
};

BotChat.prototype.Builder.prototype = {
	// 批量添加文字
	append: function () {
		for (var i=0; i<arguments.length; i++)
			this.addStr (arguments[i]);
	},

	// 添加文字
	addStr: function (str) {
		this.msg.push (str);
	},

	// 添加图片 (已经爆炸)
	addImg: function (imgHash) {
		throw new Error('图片服务器爆炸');
	},

	// 添加表情
	addFace: function (faceId) {
		this.msg.push (["face", parseInt(faceId, 10)]);
		this.addStr('');
	},

	// 设定字体名
	setFontFace: function (fontFace) {
		this.font.name = fontFace;
	},
	
	// 粗体、斜体、下划线
	setFontStyle: function (b, i, u) {
		var n = 3;
		while (n --> 0) {
			this.font.style[n] = arguments[n] ? 1 : 0;
		}
	},

	getMsg: function () {
		return this.msg.concat([['font', this.font]]);
	}
};

module.exports = BotChat;