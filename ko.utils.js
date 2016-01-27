(function (ko) {

    ko.utils.safeOperation = function (object, func) {
        /// <summary>
        /// This utility method invokes the given function on the specified object in a way that the caller doesn't have to know if the object is an observable or not
        /// When the object is an observable it will unwrap its value, invoke the function and then set the value of the observable to the result
        /// When the object is not an observable it does the same thing without the unwrapping + wrapping part. 
        /// </summary>
        /// <param name="object">The targeted object</param>
        /// <param name="func">The function to be executed</param>
        /// <returns type="object">Returns the targeted object in case the reference is lost</returns>

        var objectValue = ko.utils.unwrapObservable(object);
        if (objectValue === undefined || objectValue === null) return object;
        func(objectValue);
        if (ko.isObservable(object)) {
            object(objectValue);
        } else { object = objectValue; }
        return object;
    };

})(ko);
