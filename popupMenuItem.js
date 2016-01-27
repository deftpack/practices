var common = common || {};
(function (ns) {

    ns.PopupMenuItem = function (params) {
        /// <summary>
        /// The basic class that represents a popup menu item in its purest form.
        /// </summary>
        /// <param name="params">displayName, data, children, parent, isDisabled, isSelected, callback (which is called on click)</param>

        var self = this;
        self.displayName = ko.observable(params.displayName);
        self.tooltip = ko.observable(params.displayName);
        self.data = ko.observable(params.data);
        self.children = ko.observableArray(params.children || []);
        self.parent = ko.observable(params.parent);
        self.isDisabled = ko.observable(params.isDisabled || false);
        self.isSelected = ko.observable(params.isSelected || false);
        self.isAddItem = ko.observable(params.isAddItem || false);

        self.onActivation = function (event) {
            if (params.callback) {
                params.callback.call(self, event);
            }
        };

        self.selectedChildren = ko.computed(function() {
            var children = self.children();
            if (children && children.length > 0) {
                var result = [];
                ko.utils.arrayForEach(children, function(child) {
                    if (child.isSelected()) { result.add(child); }
                    result.add(child.selectedChildren());
                });
                return result;
            }
            return [];
        });

        self.unselectedChildren = ko.computed(function () {
            var children = self.children();
            if (children && children.length > 0) {
                var result = [];
                ko.utils.arrayForEach(children, function (child) {
                    if (!child.isSelected()) { result.add(child); }
                    result.add(child.unselectedChildren());
                });
                return result;
            }
            return [];
        });
    };

    ns.PopupMenuItemTogglable = function (params) {
        /// <summary>
        /// Extends the popup menu item in a way that it becomes togglable. 
        /// It can also take care synchronizing the selection to two defined list (one for selected items, one for not selected ones).
        /// The selected state of the item is also relies on the provided state, so it auto updates if the selection list is an observable 
        /// </summary>
        /// <param name="params">Same as PopupMenuItem, plus selectionList, unselectionList</param>

        var self = this;
        ns.PopupMenuItem.apply(self, arguments);

        self.isSelected = ko.computed(function () {
            var list = ko.utils.unwrapObservable(params.selectionList);
            var data = ko.utils.unwrapObservable(self.data);
            return list && data ? (Array.isArray(data) ? list.includesAny(data) : list.includes(data)) : false;
        });

        self.onActivation = function (event) {
            if (!self.isDisabled()) {
                if (self.isSelected()) {
                    ko.utils.safeOperation(params.selectionList, function (obj) { obj.remove(self.data()); });
                    ko.utils.safeOperation(params.unselectionList, function (obj) { obj.add(self.data()); });
                } else {
                    ko.utils.safeOperation(params.selectionList, function (obj) { obj.add(self.data()); });
                    ko.utils.safeOperation(params.unselectionList, function (obj) { obj.remove(self.data()); });
                }
            }
        };
    };

    ns.GroupingPopupMenuItem = function (params) {
        /// <summary>
        /// Extends the popup menu item with a grouping ability. This item must have children.
        /// When you specify the minimum property, it will prevent you unselecting children when it is reached.
        /// When you specify the maximum property, it will prevent you selecting more children when it is reached.
        /// </summary>
        /// <param name="params">Same as PopupMenuItem, plus maximum, minimum</param>

        var self = this;
        ns.PopupMenuItem.apply(self, arguments);

        self.maximumSelectable = params.maximum || -1;
        self.miminumSelectable = params.minimum || -1;
        self.isMaximumReached = ko.computed(function () {
            return self.maximumSelectable === -1 ? false : self.maximumSelectable <= self.selectedChildren().length;
        });
        self.isMinimumReached = ko.computed(function () {
            return self.miminumSelectable === -1 ? false : self.miminumSelectable >= self.selectedChildren().length;
        });

        self.isMaximumReached.extend({ rateLimit: 200 });
        self.isMaximumReached.subscribe(function (newValue) {
            ko.utils.arrayForEach(self.unselectedChildren(), function (child) {
                child.tooltip(newValue === true ? "Maximum selection reached." : child.displayName());
                child.isDisabled(newValue === true);
            });
        });

        self.isMinimumReached.extend({ rateLimit: 200 });
        self.isMinimumReached.subscribe(function (newValue) {
            ko.utils.arrayForEach(self.selectedChildren(), function (child) {
                child.tooltip(newValue === true ? "Minimum selection reached." : child.displayName());
                child.isDisabled(newValue === true);
            });
        });
    };

    ns.SelectPopupMenuItem = function (params) {
        /// <summary>
        /// Extends the popup menu so it and its children becomes a single select item.
        /// When you select any of the children it will unselect the previously selected one.
        /// It will also change its displayName and data to the currently selected child's  
        /// </summary>
        /// <param name="params">Same as PopupMenuItem</param>

        if (!params || !params.children || params.children.length === 0) {
            throw "This class must have its children described. " +
                  "Please pass in an object to the constructor with an array of children. " +
                  "For instance: new pf.models.SelectPopupMenuItem({ children: [ obj1, obj2 ] });";
        }

        var self = this;
        ns.PopupMenuItem.apply(self, arguments);

        self.children(params.children.map(function (child) {
            return new ns.PopupMenuItem({
                displayName: child.displayName(), data: child.data(), parent: self, isAddItem: child.isAddItem(),
                callback: function () { self.data(this.data()); }
            });
        }));

        self.selectedChildren = ko.computed(function () {
            return [ko.utils.arrayFirst(self.children(), function (child) { return self.data() === child.data(); })];
        });

        self.selectedChildren.subscribe(function (newValue) {
            ko.utils.arrayForEach(self.children(), function (child) { child.isSelected(false); });
            if (newValue[0] instanceof ns.PopupMenuItem) {
                newValue[0].isSelected(true);
                self.displayName(newValue[0].displayName());
            }
        });

        self.data(params.selected);
    };

    // ____________________ FACTORY CLASSES ____________________

    ns.OptionsPopupMenuItemFactory = function () {
        this.create = function (groupName, stringArray, selectList, unselectList, maximum, minimum, nameFunc) {
            /// <summary>
            /// This factory creates a multi select popup menu item with its children. Each of the children will be togglable.
            /// </summary>
            /// <param name="groupName">The name which is displayed for the root</param>
            /// <param name="stringArray">Array of elements that can be selected</param>
            /// <param name="selectList">List where the selected items are populated (can be observable)</param>           
            /// <param name="unselectList">List where the unselected items are populated (can be observable)</param>
            /// <param name="maximum">Maximum number of items can be selected at the same time</param>
            /// <param name="minimum">Minimum number of item has to be selected</param>
            /// <param name="nameFunc">Function that is called for each object to determine its display name</param>

            /// <returns type="pf.models.GroupingPopupMenuItem">Root item containing all the nested children</returns>
            var nameGetter = nameFunc || function (str) { return str; };

            if (stringArray.length === 1) {
                return new ns.PopupMenuItem({ displayName: nameGetter(stringArray[0]), data: stringArray[0] });
            }

            var root = new ns.GroupingPopupMenuItem({ displayName: groupName, maximum: maximum, minimum: minimum });
            var children = stringArray.map(function (item) {
                return new ns.PopupMenuItemTogglable({
                    displayName: nameGetter(item),
                    data: item,
                    parent: root,
                    selectionList: selectList,
                    unselectionList: unselectList
                });
            });

            root.children(children);
            return root;
        };
    };

    ns.SelectPopupMenuItemFactory = function () {
        this.create = function (items, selected, defaultText, nameFunc, isAddItemFunc) {
            /// <summary>
            /// This factory creates a single select popup menu item with its children.
            /// </summary>
            /// <param name="items">Objects that needs to be turned into popup menu items</param>
            /// <param name="selected">The object which is selected when the root is initialized</param>
            /// <param name="defaultText">The name which is displayed for the root when there is no selection</param>
            /// <param name="nameFunc">Function that is called for each object to determine its display name</param>
            /// <returns type="pf.models.SelectPopupMenuItem OR pf.models.PopupMenuItem">Root item containing all the nested children if any (when it has only one children it returns itself)</returns>
            var nameGetter = nameFunc || function (str) { return str; };
            var isAddItem = isAddItemFunc || function(item) { return false; };

            if (items.length === 0) {
                return new ns.PopupMenuItem({ displayName: defaultText, data: selected });
            }

            var children = items.map(function (item) {
                var popupMenuItem = new ns.PopupMenuItem({ displayName: nameGetter(item), data: item });
                if (isAddItem(item)) {
                     popupMenuItem.isAddItem(true);
                }
                return popupMenuItem;
            });

            if (children.length === 1) {
                selected = children[0].data();
                return children[0];
            }

            return new ns.SelectPopupMenuItem({ children: children, selected: selected, displayName: defaultText });
        };
    };

    var optionsTreePopupMenuItemFactory = function () {
        var self = this;
        self.create = function(element, qualifier, level, maxDepth, selectList, unselectList) {
            var children = [];
            if (level < maxDepth) {
                var labels = element.data().map(qualifier(level)).unique();
                children = labels.map(function(label) {
                    var parentData = element.data(), childData = [];
                    if (parentData && Array.isArray(parentData) && parentData.length > 0) {
                        childData = ko.utils.arrayFilter(parentData, function(item) { return qualifier(level)(item) === label; });
                    }

                    return new ns.PopupMenuItem({ displayName: label, data: childData, parent: element });
                });
            }

            if (children && children.length > 0) {
                element.children(children.map(function(node) {
                    return self.create(node, qualifier, level + 1, maxDepth, selectList, unselectList);
                }));
                return element;
            } else {
                return new ns.PopupMenuItemTogglable({
                    displayName: element.displayName(),
                    data: element.data(),
                    parent: element.parent(),
                    selectionList: selectList,
                    unselectionList: unselectList
                });
            }
        };
    };

    ns.DeterministicOptionsTreePopupMenuItemFactory = function () {
        this.create = function (groupName, items, levelQualifierFuncs, selectList, unselectList, maximum, minimum) {
            /// <summary>
            /// This factory creates a tree of popup menu items where each leaf is a togglable item.
            /// It expects the number of levels to be predetermined, and also have separate qualifier for each level.
            /// A good example is when we want to arrange dates into a tree of years and months.
            /// The first level qualifier will return the year part of the date the second qualifier the month part of the date. 
            /// </summary>
            /// <param name="groupName">The name which is displayed for the root</param>
            /// <param name="items">Data items to be qualified and arranged</param>
            /// <param name="levelQualifierFuncs">Qualifier functions for each level (i.e.: [ function (date) { return date.getMonth(); }] )</param>
            /// <param name="selectList">List where the selected items are populated (can be observable)</param>
            /// <param name="unselectList">List where the unselected items are populated (can be observable)</param>
            /// <param name="maximum">Maximum number of children can be selected</param>
            /// <param name="minimum">Minimum number of children can be selected</param>
            /// <returns type="pf.models.PopupMenuItem">Root item containing all the nested children</returns>

            var qualifier = function (level) { return levelQualifierFuncs[level]; };
            var factory = new optionsTreePopupMenuItemFactory();
            return factory.create(new ns.GroupingPopupMenuItem({ displayName: groupName, data: items, maximum: maximum, minimum: minimum }),
                qualifier, 0, levelQualifierFuncs.length, selectList, unselectList);
        };
    };

    ns.RecursiveOptionsTreePopupMenuItemFactory = function () {
        this.create = function (groupName, items, qualifier, selectList, unselectList, maximum, minimum) {
            /// <summary>
            /// This factory creates a tree of popup menu items where each leaf is a togglable item.
            /// It does it recursively to maximum depth of 8. When it reaches that level, everything on this level becomes a leaf and therefore togglable.
            /// The qualifier has a parameter which tells the level we are visiting. It can be split the folder structure, namespace or similar concepts to a level specific qualification.   
            /// </summary>
            /// <param name="groupName">The name which is displayed for the root</param>
            /// <param name="items">Data items to be qualified and arranged</param>
            /// <param name="qualifier">The function that returns the qualification</param>
            /// <param name="selectList">List where the selected items are populated (can be observable)</param>
            /// <param name="unselectList">List where the unselected items are populated (can be observable)</param>
            /// <param name="maximum">Maximum number of children can be selected</param>
            /// <param name="minimum">Minimum number of children can be selected</param>
            /// <returns type="pf.models.PopupMenuItem">Root item containing all the nested children</returns>

            var factory = new optionsTreePopupMenuItemFactory();
            return factory.create(new ns.GroupingPopupMenuItem({ displayName: groupName, data: items, maximum: maximum, minimum: minimum }),
                qualifier, 0, 8, selectList, unselectList);
        };
    };

})(common);
