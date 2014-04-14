var WebAPI = function (Bot) {
	this.bot = Bot;
};

WebAPI.prototype = {
	codeSubmit: function ($_GET, $_POST, ret) {
		if (!$_POST.code || $_POST.code.length < 4 || $_POST.code.length > 6) {
			ret.error = 1;
		} else {
			this.bot.Auth.doLogin ($_POST.code);
		}
		return ret;
	},
	refershCode: function () {
		this.bot.Auth.getCaptcha();
	}
};

module.exports = WebAPI;