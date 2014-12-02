/**
 * Created by jiehua.yang on 2014/11/8.
 */

define(function(require, exports, module) {

	var querystring = require("./util/querystring");

	function Context(boxID) {
		// 设置基本信息
		this.id = boxID;
		Context.parse(boxID, this);

		// 可能会被用到的事件处理方法
		this.onunload;	// context销毁事件
		this.onparamschange;  // box参数变更事件
	}

	/**
	 * 从一个boxID中解析信息
	 * @param boxID
	 * @returns {{}}
	 */
	Context.parse = function(boxID, obj) {
		obj = obj || {};

		var ids = boxID.split("?");
		obj.pathname = ids.shift();
		obj.params = querystring.parse(ids.join("?"));

		return obj;
	};

	module.exports = Context;

});