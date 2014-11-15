define(function(require, exports, module) {
    exports.all = function() {
        var cookies = {};
        document.cookie.split("; ").forEach(function(item) {
            item = item.split('=');
            cookies[item[0]] = item[1];
        });
        return cookies;
    };
});