/*global $, jQuery, angular, $scope, $http, console */
/*jslint browser: true*/

// function ($scope, $routeParams, $http) {

$scope.clickRow = function (e) {
	var cb = $(e.target).parent('tr').find('input:checkbox');
	cb.prop ('checked', !cb[0].checked);
};

// ----------------------
$scope.rmPlug = function (plugFile) {
	$http.post('/plug.api?a=jx-man-plug', {
		rm: true,
		files: arguments
	}).success($scope.reloadPlugList);
};
$scope.rmPlugs = function () {
	var plugs = [];
	$('input.plugList:checked').each(function () { plugs.push($(this).attr('plug')); });
	$scope.rmPlug.apply(this, plugs);
};

// ----------------------
$scope.rlPlug = function (plugFile) {
	$http.post('/plug.api?a=jx-man-plug', {
		files: arguments
	}).success($scope.reloadPlugList);
};
$scope.rlPlugs = function () {
	var plugs = [];
	$('input.plugList:checked').each(function () { plugs.push($(this).attr('plug')); });
	$scope.rlPlug.apply(this, plugs);
};

// ----------------------
$scope.enPlugs = function () {
	var plugs = [];
	$('input.plug-enable:checked').each(function () { plugs.push($(this).attr('plug')); });
	$scope.rlPlug.apply(this, plugs);
};

// ----------------------
$scope.toggleAll = function (classSelector) {
	$(classSelector).each(function () {
		this.checked = !this.checked;
	});
};

$scope.reloadPlugList = function () {
	console.log ('Reload Plugin list');
	$http.get ('/plug.api?a=jx-plug-list').success(function(plugs){
		$scope.plugs = plugs;
	});
};
$scope.reloadPlugList ();


// }