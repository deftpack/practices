var Common = Common || {}
Common.CacheDefinition = function (provider) {
    var self = this;
    var args = Array.prototype.slice.call(arguments, 1);

    self.stack = [{ func: provider, params: args }];
    self.addFilter = function(filter) {
        var parameters = Array.prototype.slice.call(arguments, 1);
        self.stack.push({ func: filter, params: parameters });
        return self;
    };

    var isFunction = function(functionToCheck) {
        var getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
    }

    var getValues = function (parameters) {
        var result = [];
        for (var i = 0; i < parameters.length; i++) {
            result.push(isFunction(parameters[i]) ? parameters[i]() : parameters[i]);
        }
        return result;
    }

    var updateCacheForLevel = function (level) {
        var stackItem = self.stack[level];
        var paramValues = getValues(stackItem.params);
        stackItem.calledWith = JSON.stringify(paramValues);

        if (level === 0) {
            // First item is the data provider that doesn't require previously fetched data
            stackItem.cache = stackItem.func.apply(this, paramValues);
        } else {
            var sourceData = self.stack[level - 1].cache;
            paramValues.unshift(sourceData);
            stackItem.cache = stackItem.func.apply(this, paramValues);
        }
    }

    self.retrieve = function () {
        var invalid = false;

        for (var i = 0; i < self.stack.length; i++) {
            var stackItem = self.stack[i];
            if (stackItem.calledWith && !invalid) {
                if (JSON.stringify(getValues(stackItem.params)) !== stackItem.calledWith) {
                    updateCacheForLevel(i);
                    invalid = true;
                }
            } else {
                updateCacheForLevel(i);
            }
        }

        return self.stack[self.stack.length - 1].cache;
    };
};

/* USAGE
var filterByCategory = function (data, categories) {
    return data.filter(function (item) { return categories.indexOf(item.category !== -1); });
};

var filterByRange = function (data, min, max) {
    return data.filter(function (item) { return item.value <= max && item.someField >= min; });
};

var cacheDefinition = new Common.CacheDefinition(dataFunction)
    .addFilter(filterByCategory, self.categories)
    .addFilter(filterByRange, self.min, self.max);

cacheDefinition.retrieve();
*/

