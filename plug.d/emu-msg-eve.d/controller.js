/*global $, jQuery, angular, $scope, $http, console */
/*jslint browser: true*/


// function ($scope, $routeParams, $http) {
$scope.content = $scope.groupGid = $scope.sender = '';
$scope.isGroup = false;

$scope.sendmsg = function () {
	var sender = parseInt($scope.sender.trim());
	if (!sender)
		// Not valid sender.
		return ;
	
	$http.post('/plug.api?a=jx-emu-sendMsg', {
		uin: $scope.sender,
		gid: $scope.groupGid,
		cmd: $scope.content,
		isGroup: $scope.isGroup ? 1 : ''
	});
	
	$('#sendMsg').select().focus();
};

// }