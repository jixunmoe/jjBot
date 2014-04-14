var loginAuth = '',
	$_POST = {},
	userLogins = {};

if ($_POST['logun'] && userLogins[$_POST['logun']] == $_POST['logpw']) {
	// 是管理员 owo
	loginAuth = '';
	for (var i=0; i<2; i++) loginAuth += Math.random().toString().replace(/\./g, '');
	setCookie ('auth', loginAuth);
	echo ('登陆成功! <a href="/">[ 点我返回 ]</a>');
} else {
	echo ('登陆失败 :/');
}
