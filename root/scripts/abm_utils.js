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
                if(successHandler) successHandler(request.responseText);
            }
            else console.log("AJAX Error: " + request.status);
        }
    };
    request.open(method || "GET", url, true);
    if(data instanceof Object) {
        request.setRequestHeader("Content-Type", "application/json");
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
    }
    request.send(data);
};
$.post = function(url, data, successHandler) {
    $.ajax(url, "POST", data, successHandler);
};
$.get = function(url, data, successHandler) {
    $.ajax(url, "GET", data, successHandler);
};
//DOM
Element.prototype.append = function(element) {
    this.appendChild(element);
};
EventTarget.prototype.on = function(eventName, eventHandler) {
    this.addEventListener(eventName, eventHandler, false);
};
//$.create(elementTagName)
//$.create(elementTagName, options)
//$.create(elementTagName, arrayOfChildrenOrChildOrText)
//$.create(elementTagName, options, arrayOfChildrenOrChildOrText)
$.create = function(elementTagName, options, children) {
    var element = document.createElement(elementTagName);
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
        for(var i = 0, l = obj.length; i < l; i++) iteratorFunction(obj[i], i);
    }
    else for(var key in obj) iteratorFunction(obj[key], key);
};