/**
 * Created by jiehua.yang on 2014/9/3.
 */

define(function(require, exports, module) {

	var $ = require("jquery");
	var History = require("./history");
	var Cookie = require("./cookie");
	var Context = require("./context");

	var single;

	/**
	 * Bigbox类
	 * @param config
	 */
	var Bigbox = function(config) {
		this._config = config;

		// 读取当前页面的路径信息
		this.contexts = {};
		this._setBoxes(window.boxesID);

		// 记录当前使用的样式信息
		this._cssRes = {};

		// 服务器处理程序列表
		this._uses = false;

		// 监听a的点击
		$(document.body).delegate("a", "click", (function(event) {
			// 如果是a链接，并且跟当前同于
			var element = event.currentTarget;
			if (!this.needDeal(element)) return;

			// 获取链接信息，然后处理请求
			this.goto(element.pathname + element.search);

			// 停止当前对象的默认行为
			event.preventDefault();
		}).bind(this));

		// 增加对form提交的监听
		this.bindForms();

		History.onpopstate = this.onHistoryPopState.bind(this);
	};

	/**
	 * 重新读取context的信息
	 * @param oldBoxID
	 */
	Bigbox.prototype.reloadContext = function(oldBoxID) {
		var context = this.contexts[oldBoxID];
		var newBoxID = context.location.href;

		// 修改context信息
		delete this.contexts[oldBoxID];
		this.contexts[newBoxID] = context;

		// 更新数组中的信息
		var index = this._boxesID.indexOf(oldBoxID);
		this._boxesID.splice(index, 1, newBoxID);
	};

	/**
	 * 初始化contexts
	 * @param boxesID
	 * @private
	 */
	Bigbox.prototype._setBoxes = function(boxesID, changeIndex) {
		this._boxesID = boxesID;

		for (var i = (typeof changeIndex == "number" ? changeIndex : 0),
				 il = boxesID.length; i < il; i++
		) {
			var boxID = boxesID[i];
			this.contexts[boxID] = new Context(boxID, this);
		}
	};

	/**
	 * 增加对form提交的监听
	 */
	Bigbox.prototype.bindForms = function() {
		var forms = $('form[bigbox-bind!="binded"]');

		// 监听form的提交
		forms.attr("bigbox-bind", "binded").submit((function(event) {
			// 如果是a链接，并且跟当前同于
			var element = event.currentTarget;
			if (!this.needDeal(element)) return;

			// 获取链接信息，然后处理请求
			// FIXME 这里还应该考虑method=post的情况
			var a = document.createElement("a");
			a.href = element.action;
			var url = a.pathname +
				(a.pathname.indexOf("?") == -1 ? "?" : "&") +
				$(element).serialize();
			this.goto(url);

			// 停止当前对象的默认行为
			event.preventDefault();
			return false;
		}).bind(this));
	};

	/**
	 * 历史变更事件的回调方法
	 * @param event
	 */
	Bigbox.prototype.onHistoryPopState = function(event) {
		var uri = location.pathname + location.search;
		this.goto(uri, true);
	};

	/**
	 * 判断元素是否需要处理
	 * @param element
	 * @returns {boolean}
	 */
	Bigbox.prototype.needDeal = function(element) {
		var tagName = element.tagName.toLowerCase();

		// 如果不是同域的话，则不做处理
		var a = element;
		if (tagName == "form") {
			a = document.createElement("a");
			a.href = element.action;
		}
		if (location.protocol != a.protocol ||
			location.host != a.host ||
			location.port != a.port) return false;

		// 如果设置了target则不作处理
		if (element.target != "") return false;

		// 如果设置了忽略属性，那就不做处理
		if (element.hasAttribute("bigbox-ignore")) return false;

		return true;
	};

	/**
	 * 去到指定的页面
	 * @param path
	 * @param [notPush2History]
	 */
	Bigbox.prototype.goto = function(path, notPush2History) {
		// 设置浏览器加载状态
		document.body.style.cursor = "wait";

		// 拿到原来的boxes，构成新的url
		var boxesID =  [];
		this._boxesID.forEach(function(boxID) {
			boxesID.push(this.contexts[boxID].location.href);
		}, this);

		// 获取请求信息
		var originalUrl = this._config.api;
		var query = {
			uri: path,
			referBoxesID: JSON.stringify(boxesID)
		};

		// 设置获取到内容的处理方法
		var callback = (function(data) {
			this.onResponse(data.content, {
				uri: path,
				boxesID: data.boxesID
			}, {
				boxesID: boxesID
			}, notPush2History);
		}).bind(this);

		// 判断是否有拦截程序要进行预处理
		var uses = this._uses;
		if (uses) {
			for (var i = 0, il = uses.length; i < il; i++) {
				var use = uses[i];
				if (path.indexOf(use.path) == 0) {
					// 匹配相应的模式，调用之
					var req = {
						originalUrl: originalUrl,
						query: query,
						cookies: Cookie.all()
					};
					var res = {
						json: callback
					};
					setTimeout(function() {
						use.deal(req, res);
					}, 0);
					return;
				}
			}
		}

		// 如果之前没有拦截到，那就调用ajax请求服务器
		$.ajax({
			url: originalUrl,
			data: query,
			dataType: "json"
		}).done(callback);
	};

	/**
	 * 获得返回内容后的处理方法
	 * @param content
	 * @param now
	 * @param before
	 */
	Bigbox.prototype.onResponse = function(content, now, before, notPush2History) {
		// 取消浏览器加载状态
		document.body.style.cursor = "";

		if (!content) return;

		// 循环前后的boxes，找到变更项
		var nowBoxesID = now.boxesID;
		var beforeBoxesID = before.boxesID;
		var i = 0;
		var il = Math.min(nowBoxesID.length, beforeBoxesID.length) - 1;
		for (; i < il; i++) {
			if (nowBoxesID[i] != beforeBoxesID[i]) break;
		}

		// 更换路径信息
		this.setUriBoxes(now.uri, nowBoxesID, beforeBoxesID, i, notPush2History);

		// 需要更换内容
		this.setContent(content, nowBoxesID, beforeBoxesID, i);

		// 进行系统统一的处理
		this.bindForms();
	};

	/**
	 * 填写内容
	 * @param content
	 * @param nowBoxesID
	 * @param beforeBoxesID
	 * @param changeIndex
	 */
	Bigbox.prototype.setContent = function(content, nowBoxesID, beforeBoxesID, changeIndex) {
		// TODO 删除之前的样式

		// TODO 内容对应的资源释放

		// 设置标题
		document.title = content.head.title || "";

		// 增加头部的资源
		this.addResource(content.head.resources, nowBoxesID);

		// 更换内容
		$("#BigBoxCtr" + changeIndex).html(content.body.content);

		// 增加内容部分的资源
		this.addResource(content.body.resources, nowBoxesID);
	};

	/**
	 * 增加资源
	 * @param resources
	 */
	Bigbox.prototype.addResource = function(resources, boxesID) {
		resources.forEach((function(res) {
			if (res.type == 'js') {
				// 这是js内容
				if (res.src) {
					// FIXME 暂时未做处理
				} else {
					eval(res.text);
				}
			} else {
				// 这是css内容
				if (res.href) {
					// 这是外链样式

					// 如果之前没有加载过，那就加载之
					if (!this._cssRes[res.href]) {
						this._cssRes[res.href] = {
							element: $('<link rel="stylesheet" href="' + res.href + '" />').appendTo(document.body),
							boxIDs: boxesID
						};
					}

					// FIXME 如果之前加载过，那就增加boxID信息
				}
			}
		}).bind(this));
	};

	/**
	 * 填写uri和boxes
	 * @param content
	 * @param nowBoxesID
	 * @param beforeBoxesID
	 * @param changeIndex
	 */
	Bigbox.prototype.setUriBoxes = function(uri, nowBoxesID, beforeBoxesID, changeIndex, notPush2History) {
		// 先处理之前的、已经不再需要的box
		for (var i = beforeBoxesID.length - 1; i >= changeIndex; i--) {
			var id = beforeBoxesID[i];
			var context = this.contexts[id];
			if (typeof context != 'object' || context == null) continue;

			// 如果有销毁方法，那就调用之
			if (typeof context.onunload == 'function') {
				context.onunload();
			}

			delete this.contexts[id];
		}

		// 记录当前的boxid信息
		this._setBoxes(nowBoxesID, changeIndex);

		// 变更history
		!notPush2History && History.push(uri);
	};

	/**
	 * 预处理程序
	 * @param path
	 * @param deal
	 */
	Bigbox.prototype.use = function(path, deal) {
		if (!this._uses) this._uses = [];
		this._uses.push({
			path: path,
			deal: deal
		});
	};

	/**
	 * 启动代码
	 * @param config
	 * @returns {Bigbox}
	 */
	exports.start = function(config) {
		return single || (single = new Bigbox(config));
	};

	/**
	 * 获取指定boxID对应的容器
	 * @param boxID
	 * @returns {*}
	 * @constructor
	 */
	exports.Context = function(boxID) {
		return single.contexts[boxID];
	};

});