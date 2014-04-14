/*global $, jQuery, angular, $scope, $http, console */
/*jslint browser: true, -W054 */

// app.js
angular.module('jixun-jjBot', [
	'ngRoute',
	'ui.bootstrap',
	'qC'
]).config(['$routeProvider',
	function($routeProvider) {
		var funcList = 'code,groupmsg,friend,logout'.split(',');

		funcList.forEach (function (e) {
			$routeProvider.when('/func/' + e, {
				templateUrl: 'res/' + e,
				controller: 'jjBot-func-' + e
			});
		});

		$routeProvider.when('/main', {
			templateUrl: 'res/main.html'
		}).when('/about', {
			templateUrl: 'res/about.html'
		}).when('/plug/:plug', {
			templateUrl: function ($routeParams) { return 'plug.res?p=' + $routeParams.plug; },
			controller:  ['$scope', '$routeParams', '$http', 
				function ($scope, $routeParams, $http) {

				// Get resource and run it.
				var args = arguments, that = this;

				$http.get ('/plug.res?p=' + $routeParams.plug + '-c')
				.success(function (cont) {
					console.log (
							'(function($scope,$routeParams,$http){\n' +
								cont +
							// Line break to prevent // comment break the function.
							'\n}).apply(this,arguments);');
					try {
						(new Function (
							'(function($scope,$routeParams,$http){\n' +
								cont +
							// Line break to prevent // comment break the function.
							'\n}).apply(this,arguments);'
						)).apply(that, args);
					} catch (e) {
						console.error ('Controller %s error: %s, at: ', $routeParams.plug, e.message, e.stack);
					}
				});

		}]}).otherwise({
			redirectTo: '/main'
		});
	}
]);

var jjBotController = angular.module('qC', []);

// 群发消息页
jjBotController.controller('jjBot-func-groupmsg', ['$scope', '$http',
	function($scope, $http) {
		$http.get ('/api.node.js?action=groupList')
		.success (function (r) {
			$scope.gList = r.data;

			$('#groupChoose').on('click', 'a', function (e) {
				$(e.target).toggleClass('active');
				e.preventDefault();
			});
		});
		$scope.keypress = function (e) {
			if (e.keyCode == 0x0D)
				$('#sendMsg').click();
		};

		$('#sendMsg').click(function () {
			var msgInput = $('#msgInput');
			if (!msgInput.val()) return;
			var groupList = [], that = $(this),
				msgList = $('<li>').text('发送 [')
					.append($('<span>').text(msgInput.val())).append('] …');

			$('#groupChoose>a.active').each(function(){
				groupList.push (parseInt($(this).attr('gid')));
			});
			$('#inputList').prepend(msgList);
			$.post('/api.node.js?action=groupmsg', {
				groupList: groupList,
				msg: msgInput.val()
			}, function (r) {
				var e = JSON.parse (r);
				if (e.error !== 0) {
					msgList.append ('传送消息失败: ' + e.error);
				} else {
					msgList.append ('成功!');
					msgInput.select().focus();
				}
			});
		});
	}
]);

// 好友请求页
jjBotController.controller('jjBot-func-friendreq', ['$scope', '$routeParams', '$http',
	function($scope, $routeParams, $http) {

	}
]);

// 系統登出頁
jjBotController.controller('jjBot-func-logout', ['$scope', '$routeParams', '$http',
	function($scope, $routeParams, $http) {
		$scope.doLogOut = function () {
			document.cookie = 'auth=Jixun';
			location.href = '?';
		};
		$scope.doGoHome = function () {
			location.href = '#';
		};
	}
]);

// 验证码输入页
jjBotController.controller('jjBot-func-code', ['$scope', '$routeParams', '$http',
	function($scope, $routeParams, $http) {
		$scope.submitting = false;
		$scope.submitSuccess = false;
		$scope.keypress = function (e) {
			if (e.keyCode == 0x0D)
				$scope.submit ();
		};

		$scope.submit = function () {
			if ($scope.submitting) return;
			$scope.submitting = true;
			$.post('/api.node.js?action=code', {
				code: $('#codeInp').val()
			}, function (r) {
				$scope.submitting = false;
				$scope.submitSuccess = !JSON.parse (r).error;
				$('#msg-code-submit').modal('show');
			});
		};
	}
]);
