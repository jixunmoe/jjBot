/*jslint node:true*/
/*global $_GET:true, $_POST, Bot, echo*/
var ret = { error: 0 };

if (!$_GET) $_GET = {};

switch ($_GET.action) {
	case 'groupList':
		ret.data = Bot.groupList.gnamelist;
		break;
	
	case 'code':
		if ($_POST.code) {
			Bot.Auth.conf.vfCode = $_POST.code;
			Bot.Auth.doLogin ();
			ret.error = 0;
		}
		break;
	
	case 'groupmsg':
		if ($_POST.msg) {
			try {
				var groupList = $_POST['groupList[]'];
				if (!groupList)
					throw new Error ('没有发送的目标');
				
				if ('string' == typeof groupList)
					groupList = [groupList];
				
				groupList.forEach (function (gid) {
					// console.log (gid);
					Bot.sendMsg (true, gid, $_POST.msg);
				});
			} catch (e) {
				ret.error = e.toString() + '\n' + e.stack;
			}
		} else {
			ret.error = '信息不能为空!';
		}
		break;
	default:
		ret.error = -1;
		break;
}

echo (JSON.stringify(ret));