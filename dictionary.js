var Common = Common || {}
Common.Dictionary = function() {

    var self = this;
    var dict = {};
    self.keys = [];

    self.keysContains = function(key) {
        return self.keys.indexOf(key) !== -1;
    };

    self.add = function (key, item) {
        if (!self.keysContains(key)) {
            dict[key] = item;
            self.keys.push(key);
        }
    };

    self.get = function (key) {
        return self.keysContains(key) ? dict[key] : undefined;
    };

    self.remove = function (key) {
        if (self.keysContains(key)) {
            self.keys.splice(self.keys.indexOf(key), 1);
            dict[key] = undefined;
            delete dict[key];
        }
    };

    self.toArray = function () {
        return self.keys.map(function(item) { return dict[item]; });
    };

    self.melt = function (keyFieldName) {
        var result = [];
        for (var i = 0; i < self.keys.length; i++) {
            var key = self.keys[i];
            var item = self.get(key);
            var flat = jQuery.extend({}, item);
            flat[keyFieldName] = key;
            result.push(flat);
        }
        return result;
    };
};
