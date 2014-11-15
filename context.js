/**
 * Created by jiehua.yang on 2014/11/8.
 */

define(function(require, exports, module) {

	function Context(boxID, bigbox) {
		this._bigbox = bigbox;
		this.setUrl(boxID);

		this.history = {
			pushState: this.pushState.bind(this)
		};
	}

	/**
	 * 跳转到指定的页面
	 */
	Context.prototype.goto = function (url) {
		this._bigbox.goto(url);
	};

	/**
	 * 设置当前的状态
	 */
	Context.prototype.pushState = function (state, title, url) {
		document.title = title || "";

		// 修改bigbox中的记录
		var originUrl = this.location.href;
		this.setUrl(url);
		this._bigbox.reloadContext(originUrl);

	};

	/**
	 * 设置当前的状态
	 */
	Context.prototype.setUrl = function (url) {
		var ids = url.split("?");
		this.location = {
			href: url,
			pathname: ids.shift(),
			query: ids.length == 0 ? "" : ids.join("?"),
			goto: this.goto.bind(this)
		};
	};

	module.exports = Context;

});