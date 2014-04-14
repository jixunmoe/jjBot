/*global $, jQuery, angular, $scope, $http */
/*jslint browser: true*/

// function ($scope, $routeParams, $http) {

$scope.doReloadAll = function () {
	$http.get ('/plug.api?a=jx-reload-all').success(function(){
		setTimeout (function () {
			// Force reload page
			window.location.href = '/#/plug/jx-man-plug';
		}, 500);
	});
};

$scope.memUsage = $scope.memTotal = '--';

$http.get ('/plug.api?a=jx-mem-usage').success(function(mem){
	$scope.heapUsage = (mem.heapUsed / 1024 / 1024).toFixed(2);
	$scope.heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(2);
	$scope.memUsage  = (mem.rss / 1024 / 1024).toFixed(2);
});

// }