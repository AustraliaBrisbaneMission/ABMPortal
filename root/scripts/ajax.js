function ajax(file, callback, data, type) {
    var request;
    if (window.XMLHttpRequest) request = new XMLHttpRequest();
    else request = new ActiveXObject("Microsoft.XMLHTTP");
    request.onreadystatechange = function () { 
        if(request.readyState == 4) { 
            if (request.status == 200) callback(request.responseText);
            else alert(request.responseText);
        }
    };
    if(data) {
        if(type == "application/json") {
            request.open("POST", file, true);
            request.setRequestHeader("Content-Type", type);
            request.send(data);
        }
        else {
            var post = [];
            for(var key in data) post.push(encodeURIComponent(key) + "=" + encodeURIComponent(data[key]));
            request.open("POST", file, true);
            request.setRequestHeader("application/x-www-form-urlencoded");
            request.send(post.join("&"));
        }
    }
    else {
        request.open("GET", file, true);
        request.send();
    }
}


function escapeHtml(string) {
    var entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };
    return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
    });
}