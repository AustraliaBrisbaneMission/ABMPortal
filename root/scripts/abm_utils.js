//Utility Functions
var $ = function(arg) {
    var type = arg.charAt(0), str = arg.substr(1);
    if(type == "#") return document.getElementById(str);
    else if(type == ".") return document.getElementsByClassName(str);
};
//AJAX
$.ajax = function(url, method, data, successHandler) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if(request.readyState == 4) {
            if (request.status == 200) {
                if(successHandler) {
                    var type = request.getResponseHeader("Content-Type");
                    if(type && type.substr(0, 16) == "application/json") {
                        successHandler(JSON.parse(request.responseText));
                    }
                    else successHandler(request.responseText);
                }
            }
            else console.log("AJAX Error: " + request.status);
        }
    };
    request.open(method || "GET", url, true);
    if(data instanceof Object) {
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify(data));
    }
    else if(data instanceof String) {
        var post = [], encodedKey, encodedData;
        for(var key in data) {
            encodedKey = encodeURIComponent(key);
            encodedData = encodeURIComponent(data[key]);
            post.push(encodedKey + "=" + encodedData);
        }
        request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        data = post.join('&');
        request.send(data);
    }
    else request.send(data);
};
$.post = function(url, data, successHandler) {
    $.ajax(url, "POST", data, successHandler);
};
$.get = function(url, successHandler) {
    $.ajax(url, "GET", null, successHandler);
};
//DOM
Element.prototype.append = Element.prototype.appendChild;
Element.prototype.text = function(text) { this.textContent = text; };
Element.prototype.html = function(html) { this.innerHTML = html; };
$.on = function(eventName, eventHandler) {
    this.addEventListener(eventName, eventHandler, false);
};
if(window.EventTarget) window.EventTarget.prototype.on = $.on;
else Element.prototype.on = $.on;
window.on = $.on;
//$.create(elementTagName)
//$.create(elementTagName, options)
//$.create(elementTagName, arrayOfChildrenOrChildOrText)
//$.create(elementTagName, options, arrayOfChildrenOrChildOrText)
$.create = function(elementTagName, options, children) {
    var element = document.createElement(elementTagName);
    if(options && options.toString() == "[object Object]") {
        for(var key in options) {
            if(key == "parent") options.parent.appendChild(element);
            else element[key] = options[key];
        }
    }
    //Maybe they passed children instead of options...
    else if(!children) children = options;
    
    if(typeof children == "string") element.textContent = children;
    else if(children instanceof Node) element.append(children);
    else if(children instanceof Object) {
        $.each(children, function(child) { element.append(child); });
    }
    return element;
};
//Miscellaneous
$.each = function(obj, iteratorFunction) {
    if(obj instanceof Array) {
        for(var i = 0, l = obj.length; i < l; i++) {
            if(iteratorFunction(obj[i], i) === false) return;
        }
    }
    else for(var key in obj) {
        if(iteratorFunction(obj[key], key) === false) return;
    }
};
$.eachSorted = function(obj, iteratorFunction, descending) {
    var items = $.keySort(obj, true, descending);
    for(var i = 0, l = items.length; i < l; i++) {
        var item = items[i];
        iteratorFunction(item.value, item.key);
    }
};
$.keySort = function(obj, byKey, descending) {
    var getValues = byKey ?
        function(a, b) { return { a: a.key, b: b.key }; } :
        function(a, b) { return { a: a.value, b: b.value }; };
    var items = [];
    for(var key in obj) items.push({ value: obj[key], key: key });
    items.sort(function(a, b) {
        var values = getValues(a, b);
        if(values.a > values.b) return descending ? -1 : 1;
        if(values.a < values.b) return descending ? 1 : -1;
        return 0;
    });
    return items;
};
$.parseDate = function(dateString) {
    var parts = /^\s*(\d{4})-(\d+)-(\d+)\s*$/.exec(dateString);
    if(!parts) return null;
    var month = parts[2] - 1, date = new Date();
    date.setFullYear(parts[1], month, parts[3]);
    if(month != date.getMonth()) return null;
    return date;
};