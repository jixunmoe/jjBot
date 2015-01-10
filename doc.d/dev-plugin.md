# 前言
该文档可能随时更新，请注意查阅。该文档及完整实现代码也将存在于 `doc.d` 目录下。  
该文档将带领你制作一个完整的 `Hello World` 插件，以及基本的公开接口简介。  
如果您需要 JavaScript 上的编写手册，推荐参考 [DevDocs.io](http://devdocs.io/javascript/)。

## 编写插件
### 创建插件文件
新建一个 `.js` 文件放入 `plug.d` 目录，然后填上 jslint 的识别码 (Node 环境) `/*jslint node: true*/` 即可。

### 插件的初始化
首先创建一个函数，一般为你的插件名。另外虽然可以但是不推荐将注册事件的代码写到此处。
```js
var pluginHelloWorld = function (Bot, regEvent) {
	this.bot = Bot;
	this.regEvent = regEvent;
};

module.exports = pluginHelloWorld; // 公开导出插件函数。
```

### 声明插件信息
对 `pluginHelloWorld` 函数进行扩容，让插件管理器能识别到。

```js
pluginHelloWorld.prototype = {
	// 插件名称
	name  : 'Hello World',
	// 插件版本
	ver   : '1.0',
	// 插件作者
	author: 'Jixun',
	// 插件简介
	desc  : '用户签到以及其他功能，依赖 db 模组。',
	
	// 插件调用，用于注册事件等。
	load: function () {
		var that = this;
	},
	// 插件卸载，用于释放资源等。
	unload: function () {
	}
};
```

### 绑定聊天数据
既然是机器人，一定得有方法获取聊天数据和发送消息的吧~
```js
// load 方法
that.regEvent ('msg', function (next, sMsg, msg, reply) {
	// 检查输入数据是否包含 hello 文字。
	if (sMsg.indexOf('hello') !== 0) {
		// 回应一句 Hello World! 给用户。
		reply('Hello world!');
		return true; // 表示这条信息已经由这个插件处理了，不需要其它插件接手处理。
	}
});
```
其中，
`sMsg`  为**纯文本**的消息，图片、表情将自动转换到 `[图片]`。
`msg`   为最初的消息对象，可以检查 `msg.isGroup` 判断是否为群组消息。
`reply` 消息回调 - 回应这条消息。


### 绑定聊天指令
如果你想要更规范化的插件指令，你也可以绑定指令事件：
```js
that.regEvent ('msg-cmd-hi', function (next, reply, msg, args, toWho) {
	// 如果用户未指定发送给谁, 则使用发送者的昵称
	if (!toWho) toWho = msg.user.nick;

	reply ('你好啊 ' + toWho);
});
```

上述代码将绑定用户的 `hi` 指令，如
```plain
输入指令				回应
jj/hi				> 你好啊 [昵称]
jj/hi 饼干酱			> 你好啊 饼干酱
jj/hi "The Guy A"	> 你好啊 The Guy A
```

`reply` 和 `msg` 参数请参考上段，
`args` 为所有的参数的数组。如果没有带上参数则为空数组 `[]`。
`toWho` 为指令的第一个参数，可以往后期无限添加。

### 完整实现代码
完整实现代码可参考档案 `doc.d/example/50.hello.world.js`。

## 绑定网页后台操作
**提示**: 该功能需要 [AngularJS](http://devdocs.io/angular/) 开发经验，没有也没大碍可参考 `99.plug-manager.js` 的实现方式。

暂时留空，等有需求再写…w