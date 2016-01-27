
ko.extenders.copyTo = function(source, options) {
    /// <summary>
    /// This extension copies the value from one of the observables to another and does that on every change
    /// Usage: this.first.extend({ copyTo: { 
    ///         target: this.second, 
    ///         mapToFunc: function (value) { ... }
    /// }});
    /// </summary>
    /// <param name="source">The observable set by knockout</param>
    /// <param name="options">A JSON providing two parameters. "target" as the second observable, "mapToFunc" as an optional mapping function</param>
    var target = options.target;
    var defaultMapper = function(value) { return value; };
    var mapToFunc = options.mapToFunc || defaultMapper;

    var getMappedValue = function(value, mappingFunc) {
        return Array.isArray(value) ?
            ko.utils.arrayMap(value, function(item) { return mappingFunc.call(source, item); }) :
            mappingFunc.call(source, value);
    }

    var protoProperty = "__ko_proto__";
    var subscriptionRef;

    if (source[protoProperty] === ko.observable &&
        target[protoProperty] === ko.observable) {
        target(getMappedValue(source(), mapToFunc));
        subscriptionRef = source.subscribe(function(newValue) { target(getMappedValue(newValue, mapToFunc)); });
    }

    source.disconnect = function() {
        if (subscriptionRef) {
            subscriptionRef.dispose();
            subscriptionRef = null;
        }
    };

    return source;
};

// TODO: Handle values/items or situations when the mapping functions produce irreversible, non-compatible outcomes. First idea: ignoring such values/items.
ko.extenders.syncWith = function (target, options) {
    /// <summary>
    /// This extension binds to observable together, so their values are synced all the time. 
    /// When one of them changes the other one also gets updated. It does work with observable arrays too.
    /// Usage: this.first.extend({ syncWith: { 
    ///         source: this.second, 
    ///         mapToFunc: function (value) { ... }, 
    ///         mapFromFunc: function (value) { ... }
    /// }});
    /// Note: It requires "equals" extension for arrays
    /// </summary>
    /// <param name="target">The observable set by knockout</param>
    /// <param name="options">A JSON providing three parameters. "source" as the second observable, 
    /// "mapToFunc" as an optional mapping function from the first observable to the second, 
    /// and "mapFromFunc" which is an optional mapping function for opposite direction.</param>
    /// <returns type="observable">Returns the original observable just for chaining</returns>

    var source = options.source;
    var defaultMapper = function (value) { return value; };
    var mapToFunc = options.mapToFunc || defaultMapper;
    var mapFromFunc = options.mapFromFunc || defaultMapper;

    var getMappedValue = function (value, mappingFunc) {
        return Array.isArray(value) ?
            ko.utils.arrayMap(value, function (item) { return mappingFunc.call(target, item); }) :
            mappingFunc.call(target, value);
    }

    var setValue = function (observable, newValue) {
        var oldValue = observable();
        var isArray = Array.isArray(newValue);

        if ((isArray && !newValue.equals(oldValue)) ||
            (!isArray && oldValue != newValue)) {
            observable(newValue);
        }
    };

    var protoProperty = "__ko_proto__";
    var targetSubscriptionRef, sourceSubscriptionRef;

    if (target.disconnect) { target.disconnect(); }
    if (source.disconnect) { source.disconnect(); }

    if (target[protoProperty] === ko.observable &&
        source[protoProperty] === ko.observable) {

        var targetSubscription = function (newValue) {
            sourceSubscriptionRef.dispose();
            var mappedValue = getMappedValue(newValue, mapToFunc);
            setValue(source, mappedValue);
            sourceSubscriptionRef = source.subscribe(sourceSubscription);
        };
        var sourceSubscription = function (newValue) {
            targetSubscriptionRef.dispose();
            var mappedValue = getMappedValue(newValue, mapFromFunc);
            setValue(target, mappedValue);
            targetSubscriptionRef = target.subscribe(targetSubscription);
        };

        setValue(target, getMappedValue(source(), mapFromFunc));

        targetSubscriptionRef = target.subscribe(targetSubscription);
        sourceSubscriptionRef = source.subscribe(sourceSubscription);
    }

    var disconnect = function () {
        if (targetSubscriptionRef) {
            targetSubscriptionRef.dispose();
            targetSubscriptionRef = null;
        }
        if (sourceSubscriptionRef) {
            sourceSubscriptionRef.dispose();
            sourceSubscriptionRef = null;
        }
    }

    target.disconnect = disconnect;
    source.disconnect = disconnect;

    return target;
}
