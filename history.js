/**
 * Created by jiehua.yang on 2014/9/4.
 */

define(function(require, exports, module) {

	/**
	 * 往历史中增加一个uri
	 * @param uri
	 */
	exports.push = function(uri, data) {
		history.pushState(data || null, null, uri);
	};

	/**
	 * 监听历史事件
	 * @param event
	 */
	window.onpopstate = function(event) {
		var onpopstate = exports.onpopstate;
		if (typeof onpopstate != "function") return;

		onpopstate(event);
	};
});