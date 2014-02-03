var filters = {};
var select = null;

function render(filter) {
    var data = filters[filter];
    function keySort(arr, keyName, callback, descending) {
        var items = {}, keys = [];
        for(var i = 0; i < arr.length; i++) {
            var item = arr[i];
            var key = item[keyName].trim().toLowerCase();
            if(!items[key]) {
                keys.push(key);
                items[key] = [];
            }
            items[key].push(item);
        }
        keys.sort();
        if(descending) keys.reverse();
        for(var i = 0; i < keys.length; i++) {
            callback(items[keys[i]][0][keyName], items[keys[i]]);
        }
    }
    var resultBox = document.getElementById('result_box');
    resultBox.innerHTML = "";
    function clicked(e) {
        e.preventDefault();
        var div = e.target.nextSibling;
        div.hidden = !div.hidden;
        div.style.display = div.hidden ? "none" : "";
    }
    function click(title, div) {
        title.className = "clickable";
        div.style.display = "none";
        div.hidden = true;
        title.addEventListener("mousedown", clicked, false);
    }
    keySort(data, "date", function(date, items) {
        var title = document.createElement('H2');
        var days = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
        ];
        var months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];
        date = $.parseDate(date);
        var day = days[date.getDay()];
        var month = months[date.getMonth()];
        var year = date.getFullYear();
        title.textContent = day + ", " + month + " " + date.getDate() + ", " + year;
        resultBox.appendChild(title);
        var dateDiv = document.createElement('DIV');
        dateDiv.className = "rDate";
        resultBox.appendChild(dateDiv);
        keySort(items, "zone", function(zone, items) {
            var title = document.createElement('H3');
            title.textContent = zone;
            dateDiv.appendChild(title);
            var zoneDiv = document.createElement('DIV');
            zoneDiv.className = "rZone";
            click(title, zoneDiv);
            dateDiv.appendChild(zoneDiv);
            keySort(items, "area", function(area, items) {
                var title = document.createElement('H3');
                title.textContent = area;
                zoneDiv.appendChild(title);
                var areaDiv = document.createElement('DIV');
                areaDiv.className = "rArea";
                click(title, areaDiv);
                zoneDiv.appendChild(areaDiv);
                keySort(items, "name", function(missionary, items) {
                    var title = document.createElement('H3');
                    title.textContent = missionary;
                    areaDiv.appendChild(title);
                    for(var i = 0; i < items.length; i++) {
                        var missionaryDiv = document.createElement('DIV');
                        missionaryDiv.className = "rMissionary";
                        areaDiv.appendChild(missionaryDiv);
                        
                        function addText(prefix, name) {
                            var div = document.createElement('DIV');
                            div.textContent = prefix + items[i][name];
                            missionaryDiv.appendChild(div);
                        }
                        addText("Number of Transfers In Area: ", "transfersInArea");
                        addText("Number of Transfers Left on Mission: ", "transfersLeft");
                        addText("Stay or Go: ", "stayOrGo");
                        addText("Leadership: ", "leadership");
                        addText("Comments: ", "comments");
                        addText("Reported By: ", "zoneLeader");
                    }
                });
            });
        });
    }, true);
}

window.on("load", function() {
    $.get("/admin/recommendations/get", function(response) {
        response.sort(function(a, b) {
            if(a.date > b.date) return 1;
            if(a.date < b.date) return -1;
            return 0;
        });
        filters["(All)"] = response;
        
        var select = document.createElement('SELECT');
        select.id = "filter";
        var label = document.createElement('LABEL');
        label.textContent = "Transfer:";
        label.setAttribute("for", "filter");
        var option = document.createElement('OPTION');
        option.value = option.textContent = "(All)";
        select.appendChild(option);
        var options = [];
        
        var firstDate = new Date("2013-11-18");
        var latestDate = firstDate;
        for(var i = 0; i < response.length; i++) {
            var date = $.parseDate(response[i].date);
            var filterName;
            while(latestDate < date) {
                filterName = latestDate.toLocaleDateString();
                latestDate.setDate(latestDate.getDate() + 7 * 6);
                filterName += " - " + latestDate.toLocaleDateString();
                filters[filterName] = [];
                var option = document.createElement('OPTION');
                option.value = option.textContent = filterName;
                options.push(option);
            }
            filters[filterName].push(response[i]);
        }
        var start = options.length - 1;
        for(var i = start; i >= 0; i--) {
            if(i == start) {
                options[i].selected = true;
                render(options[i].value);
            }
            select.appendChild(options[i]);
        }
        
        select.addEventListener("change", function(e) {
            render(e.target.value);
        }, false);
        var filterBox = document.getElementById('filter_box');
        filterBox.appendChild(label);
        filterBox.appendChild(select);
    });
});