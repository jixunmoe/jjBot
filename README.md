# Project jjBot ---- 项目 jB

## 关于该项目
这是基于 NodeJS 开发的一个开源项目，其源代码托管于 [GitHub](https://github.com/JixunMoe/jjBot)。

如果遇到问题，请先尝试翻阅 [Wiki](https://github.com/JixunMoe/jjBot/wiki/FAQ-常见问题)

该项目授权采用 MIT 授权协议: 您可以自由修改及分发, 但请务必保留作者版权。

项目成立于 2014 年 4 月, 因看到友人利用现有协议重写 [NekoBot](https://github.com/amphineko/nekobot)。~~一时脑热~~觉得挺好玩的于是毅然退出原本基于 [QQBot](https://github.com/xhan/qqbot) 开发的 [QBot](https://github.com/JixunMoe/qbot), 砍掉重写。

发现问题? 请务必提交 [Issue](https://github.com/JixunMoe/jjBot/issues/new), 感激不尽~~

## 感谢名单
* xhan 提供的 <abbr title="参考了部分写法 ^^">qqbot</abbr> 以及[分析好的协议](https://github.com/xhan/qqbot/blob/master/protocol.md)
* [饼干酱](https://github.com/amphineko) 带来的灵感
* 前台-核心: [Angular](//angularjs.org) 提供~~灵活~~的模板书写方式。
* 前台-核心: [jQuery](//jquery.com) 提供的网页操作 API
* 前台-界面: [Bootstrap](//getbootstrap.com) 提供的~~高大上~~美观的界面。
* 前台-图标: 取自 [Jonas Rask](//jonasraskdesign.com) 绘制的 [DRF 图标包](https://www.iconfinder.com/iconsets/drf)。
* 饼干交流群各位的帮助
* 使用这个机器人的你 :)

## 部署说明
* 下载 ZIP 包
* 进入解压后的目录, 输入 `npm install` 安装依赖项
* 将 `config-sample.yaml` 拷贝一份到 `config.yaml`, 按照注释填写即可。
* 配置完后就可以执行 `node Boot.js` 执行机器人了~
* **注意**: 如果您不需要用户管理系统 (MySQL 数据库)，可以删除 `mod.d/1.db.js` 以及 `plug.d/02.uc.js` 档案。MySQL 用户需要创建数据库、表格的权限，或已经配置完毕数据库。
* 新版使用 form-data 提交图片数据，但是 0.1.2 有问题! 请在项目目录执行
```bash
curl https://raw.githubusercontent.com/felixge/node-form-data/master/lib/form_data.js -o node_modules/form-data/lib/form_data.js
```
升级插件到最新版后执行机器人。

## 更新历史/说明
### 0.0.2 ~ 0.0.3
+ 新增图片上传 API; 虽然失败率高了点 QwQ
+ 颜文字卖萌插件 + 早晚的问候语 (70%)
+ 添加使用上次登录信息
+ 添加 MySQL 长时间连线掉线处理
+ jj/pay 方法
+ 权限管理 jj/perm, 需要手动进数据库设定管理员的权限
+ 机器人防偶尔掉线处理
* 若干乱七八糟小问题修正
* 对 QQ<>UIN、上传历史 进行缓存
* 修正腾讯更新好友列表请求算法
* 各种修正
### 0.0.x ~ 0.0.2
* ! 请执行 `npm install` 或手动安装模组: `mysql2`。
* ! 目前 UC 还不完善, 数据库可能随时更新其格式。
+ 新增 MySQL 数据库模组, 根据配置初始化. [`mod.d/1.db.js`]
+ 新增 用户中心插件, 依赖数据库模组. [`plug.d/07.uc.js`]
+ 新增 `bot.uinToNum` 方法; 将 uin 转换为唯一号码, 支持缓存 [未写完] [`mod.d/Bot.Core.js`]
* 前台 插件管理员; 触发全部区域选项, `plug.d/plug-manager.d/controller.man.js`
* 修正 `mod.queue.done` 方法; 完成后无法调用原回调 [`mod.d/1.queue.js`]
- 其他小更改, 请参考 git diff。

## 特别说明
因为尚处于开发阶段，所以难免可能有 Bug 什么的… 如果发现了的话请务必提交 Issue 吐槽, 谢谢 ^^
