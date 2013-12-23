var Graph = function(canvas) {
    var me = this;
    var data = null;
    var yMax, yStep;
    var context = me.context = canvas.getContext('2d');
    var canvasWidth, canvasHeight, canvasRatio, canvasSize;
    
    //Canvas properties
    me.top = 0;
    me.left = 0;
    
    //Scales coordinates to canvas size
    function scaleHeight(a) { return a / 100 * canvasHeight; }
    function scaleWidth(a) { return a / 100 * canvasWidth; }
    function scaleSize(a) { return a * canvasSize * canvasWidth / 1000; }
    
    //Draws a line
    function line(x1, y1, x2, y2, size, colour) {
        context.beginPath();
        context.lineWidth = scaleSize(size || DEFAULT_LINESIZE);
        context.lineCap = "round";
        context.strokeStyle = colour || DEFAULT_LINECOLOUR;
        context.moveTo(scaleWidth(x1), scaleHeight(y1));
        context.lineTo(scaleWidth(x2), scaleHeight(y2));
        context.stroke();
    }
    
    //Draws a rectangle
    function rectangle(x, y, width, height, colour, lineSize, lineColour) {
        context.beginPath();
        var line = scaleSize(lineSize || 0);
        var scaledWidth = scaleWidth(width);
        var scaledHeight = scaleHeight(height);
        if(scaledWidth < line || scaledHeight < line) {
            line = 0;
            colour = lineColour || DEFAULT_LINECOLOUR;
        }
        context.rect(
            scaleWidth(x) + line / 2,
            scaleHeight(y) + line / 2,
            scaledWidth - line,
            scaledHeight - line
        );
        if(colour !== false) {
            context.fillStyle = colour || DEFAULT_BARCOLOUR;
            context.fill();
        }
        if(line) {
            context.lineWidth = line;
            context.strokeStyle = lineColour || DEFAULT_LINECOLOUR;
            context.stroke();
        }
    }
    
    //Draws text
    function text(x, y, text, align, size, style, font, colour, maxWidth, rotation) {
        context.textAlign = align || "center";
        font = font || DEFAULT_FONT;
        size = scaleSize(size || 30) + "px";
        style = style || "";
        context.font = style + " " + size + " " + font;
        context.fillStyle = colour || DEFAULT_TEXTCOLOUR;
        context.textBaseline = "middle";
        if(maxWidth) {
            maxWidth = scaleWidth(maxWidth);
            context.fillText(text, scaleWidth(x), scaleHeight(y), maxWidth);
        }
        else context.fillText(text, scaleWidth(x), scaleHeight(y));
    }
    
    //Graph styles
    var styles = {
        bars: function(graph) {
            var value, width, height, colour, x, y;
            var factor = (POS_RIGHT - POS_LEFT) / data.x.labels.length;
            var barSize = factor - BAR_PAD * factor * 2;
            for(var a = 0; a < data.x.labels.length; a++) {
                value = graph.data[a] || 0;
                width = barSize / value.length;
                for(var b = 0; b < value.length; b++) {
                    x = POS_LEFT + a * factor + BAR_PAD * factor + b * width;
                    y = POS_BOTTOM - value[b] / yMax * (POS_BOTTOM - POS_TOP);
                    height = POS_BOTTOM - y;
                    colour = graph.colours[b] ? graph.colours[b] : DEFAULT_COLOURS[b];
                    rectangle(x, y, width, height, colour, BAR_LINESIZE);
                }
            }
        },
        stackedBars: function(graph) {
            var value, height, colour, x, y;
            var factor = (POS_RIGHT - POS_LEFT) / data.x.labels.length;
            var width = factor - BAR_PAD * factor * 2;
            for(var a = 0; a < data.x.labels.length; a++) {
                value = graph.data[a] || 0;
                x = POS_LEFT + a * factor + BAR_PAD * factor;
                y = POS_BOTTOM;
                for(var b = 0; b < value.length; b++) {
                    height = y;
                    y -= value[b] / yMax * (POS_BOTTOM - POS_TOP);
                    height -= y;
                    colour = graph.colours[b] ? graph.colours[b] : DEFAULT_COLOURS[b];
                    rectangle(x, y, width, height, colour, BAR_LINESIZE);
                }
            }
        },
        lines: function(graph) {
            var factor = (POS_RIGHT - POS_LEFT) / data.x.labels.length;
            var x1, y1, x2, y2, value, colour, lines = 0;
            for(var a = 0; a < data.x.labels.length; a++) {
                if(graph.data[a].length > lines) lines = graph.data[a].length;
            }
            for(var a = 0; a < lines; a++) {
                colour = graph.colours[a] ? graph.colours[a] : DEFAULT_COLOURS[a];
                for(var b = 0; b < data.x.labels.length; b++) {
                    value = graph.data[b][a] || 0;
                    x1 = POS_LEFT + (b + 0.5) * factor;
                    y1 = POS_BOTTOM - value / yMax * (POS_BOTTOM - POS_TOP);
                    if(b + 1 >= data.x.labels.length) break;
                    value = graph.data[b + 1][a] || 0;
                    x2 = x1 + factor;
                    y2 = POS_BOTTOM - value / yMax * (POS_BOTTOM - POS_TOP);
                    line(x1, y1, x2, y2, LINE_LINESIZE, colour);
                }
            }
        }
    };
    
    //Settings
    var DEFAULT_STYLE = "bars";
    var DEFAULT_LINESIZE = 2;
    var DEFAULT_LINECOLOUR = "#000";
    var DEFAULT_BARCOLOUR = "#999";
    var DEFAULT_TEXTCOLOUR = "#333";
    var DEFAULT_COLOURS = [
        "#33C", "#3C3", "#C33", "#3CC", "#C3C", "#CC3",
        "#99F", "#9F9", "#F99", "#9FF", "#F9F", "#FF9"
    ];
    var DEFAULT_FONT = "Calibri";
    var DEFAULT_FULLSCREEN = true;
    
    var POS_LEFT = 20;
    var POS_RIGHT = 90;
    var POS_TOP = 15;
    var POS_BOTTOM = 92;
    var AXIS_LINESIZE = 5;
    var XAXIS_STEPLENGTH = 5;
    var XAXIS_TEXTPAD = XAXIS_STEPLENGTH / 2;
    var YAXIS_STEPLENGTH = 2;
    var YAXIS_TEXTPAD = 1;
    var BAR_PAD = 0.1;
    var BAR_LINESIZE = 1;
    var LINE_LINESIZE = 5;
    var LEGEND_LEFT = 1;
    var LEGEND_RIGHT = 14;
    var LEGEND_SPACING = 2;
    var LEGEND_PADDING = 1;
    var LEGEND_SAMPLESIZE = 1.5;
    
    var render = me.render = function() {
        canvasWidth = canvas.clientWidth;
        canvasHeight = canvas.clientHeight;
        canvasRatio = canvasWidth / canvasHeight;
        canvasSize = canvasWidth < canvasHeight ? canvasWidth / canvasHeight : canvasHeight / canvasWidth;
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        var x, y, textPos;
        //Y axis gridlines
        var factor = (POS_BOTTOM - POS_TOP) / yMax;
        for(var i = yStep; i < yMax; i += yStep) {
            y = POS_BOTTOM - factor * i;
            line(POS_LEFT, y, POS_RIGHT, y, AXIS_LINESIZE, "#CCC");
        }
        //Graphs
        var graph, xMax = data.x.labels.length;
        for(var i = 0; i < data.graphs.length; i++) {
            graph = data.graphs[i];
            if(!graph.style) graph.style = DEFAULT_STYLE;
            styles[graph.style](graph);
        }
        //Border
        line(POS_LEFT, POS_TOP, POS_RIGHT, POS_TOP, AXIS_LINESIZE);
        line(POS_RIGHT, POS_TOP, POS_RIGHT, POS_BOTTOM, AXIS_LINESIZE);
        //X axis
        factor = (POS_RIGHT - POS_LEFT) / xMax;
        line(POS_LEFT, POS_BOTTOM, POS_RIGHT, POS_BOTTOM, AXIS_LINESIZE);
        line(POS_LEFT, POS_BOTTOM, POS_LEFT, POS_BOTTOM + XAXIS_STEPLENGTH, AXIS_LINESIZE);
        for(var i = 0; i < xMax; i++) {
            x = factor * (i + 1) + POS_LEFT;
            line(x, POS_BOTTOM, x, POS_BOTTOM + XAXIS_STEPLENGTH, AXIS_LINESIZE);
            textPos = POS_BOTTOM + XAXIS_TEXTPAD;
            text(x - factor / 2, textPos, data.x.labels[i], null, 9);
        }
        //Y axis
        factor = (POS_BOTTOM - POS_TOP) / yMax;
        line(POS_LEFT, POS_TOP, POS_LEFT, POS_BOTTOM, AXIS_LINESIZE);
        for(var i = 0; i <= yMax; i += yStep) {
            y = POS_BOTTOM - factor * i;
            line(POS_LEFT, y, POS_LEFT - YAXIS_STEPLENGTH, y, AXIS_LINESIZE);
            textPos = POS_LEFT - YAXIS_STEPLENGTH - YAXIS_TEXTPAD;
            text(textPos, y, i, 'right', null, null, null, null, textPos - LEGEND_RIGHT);
        }
        //Legend
        for(var i = 0; i < data.graphs.length; i++) {
            var graph = data.graphs[i];
            if(graph.legend) {
                var colour, textX, maxWidth;
                x = LEGEND_LEFT;
                height = graph.legend.length * (LEGEND_SAMPLESIZE + LEGEND_SPACING) - LEGEND_SPACING + LEGEND_PADDING * 2;
                y = 50 - height / 2;
                width = LEGEND_RIGHT - LEGEND_LEFT;
                rectangle(x, y, width, height, "#FFF", DEFAULT_LINESIZE);
                x = LEGEND_LEFT + LEGEND_PADDING;
                textX = x + LEGEND_SAMPLESIZE + LEGEND_PADDING;
                maxWidth = LEGEND_RIGHT - textX - LEGEND_PADDING;
                y += LEGEND_PADDING;
                for(var i = 0; i < graph.legend.length; i++) {
                    colour = graph.colours[i] || DEFAULT_COLOURS[i];
                    rectangle(x, y, LEGEND_SAMPLESIZE, LEGEND_SAMPLESIZE, colour, DEFAULT_LINESIZE);
                    text(textX, y + LEGEND_SAMPLESIZE / 2, graph.legend[i], 'left', null, null, null, null, maxWidth);
                    y += LEGEND_SAMPLESIZE + LEGEND_SPACING;
                }
            }
        }
    };
    
    me.setData = function(newData) {
        data = newData;
        
        //Calculate Y axis labels
        var count = 0, max = 0.005, graphMax = 0;
        for(var i = 0; i < data.graphs.length; i++) {
            graphMax = Math.max(data.graphs[i].max, graphMax);
        }
        while(max < graphMax) max *= ++count % 3 ? 2 : 2.5;
        yMax = max;
        yStep = max / (count + 1 % 3 ? 10 : 8);
        
        render();
    };
    
    var testData = {
        x: {
            labels: [
                "Jan", "Feb", "Mar", "Apr", "Multi", "May",
                "Jun", "Jun", "Jun", "Jun", "Jun"
            ]
        },
        y: null,
        graphs: [
            {
                name: "Test Graph",
                data: [
                    [ 4 ],
                    [ 0 ],
                    [ 0.1 ],
                    [ 4 ],
                    [ 5, 4, 3, 2, 7 ],
                    [ 3, 5 ],
                    [ 19 ],
                    [ 16 ],
                    [ 19 ],
                    [ 19 ],
                    [ 19 ]
                ],
                style: "lines",
                max: 0,
                legend: null,
                colours: []
            }
        ]
    };
    var testGraph = testData.graphs[0];
    for(var a = 0; a < testGraph.data.length; a++) {
        var values = testGraph.data[a];
        for(var b = 0; b < values.length; b++) {
            if(values[b] > testGraph.max) testGraph.max = values[b];
            if(!testGraph.colours[b]) testGraph.colours[b] = DEFAULT_COLOURS[b];
        }
    }
    me.setData(testData);
};

var master = {
    indicators: [],
    wards: []
};

var reports = [];
var Report = function(name, options, load) {
    var me = this;
    me.name = name;
    me.options = options;
    me.load = function() {
        //Prepare option forms
        for(var name in options) {
            var select = $('<select></select>')
                .on("change", (function(name) {
                        return function(e) {
                            options[name].value = this.value;
                            load(me);
                        }
                    })(name)
                );
            $.each(options[name].values, function(i, value) {
                var option = $('<option></option>').attr("value", value).text(value);
                if(value == options[name].value) option.attr("selected", true);
                select.append(option);
            });
            allowedClick.push(select[0]);
            $('#report_options').append(select);
        }
        load(me);
    };
    reports.push(me);
};

new Report(
    "Stake Effectiveness Report",
    {
        zone: {
            name: "Zone",
            value: "(All)",
            values: [
                "(All)",
                "Brisbane",
                "Brisbane North",
                "Sunshine Coast",
                "Cleveland",
                "Ipswich",
                "Centenary",
                "Logan",
                "Eight Mile Plains",
                "Coomera",
                "Gold Coast",
                "Northern"
            ]
        },
        indicator: {
            name: "Indicator",
            value: "Baptised",
            values: [
                "Baptised",
                "Confirmed",
                "Baptismal Dates",
                "Investigators at Sacrament",
                "Member Present Lessons",
                "Other Lessons",
                "Progressing Investigators",
                "Referrals Received",
                "Referrals Contacted",
                "New Investigators",
                "Recent Convert/Less-Active Lessons"
            ]
        }
    },
    function(report) {
        var indicators = {
            baptised: "Baptised",
            confirmed: "Confirmed",
            baptismalDate: "Baptismal Dates",
            sacrament: "Investigators at Sacrament",
            memberPresent: "Member Present Lessons",
            otherLesson: "Other Lessons",
            progressing: "Progressing Investigators",
            received: "Referrals Received",
            contacted: "Referrals Contacted",
            newInvestigators: "New Investigators",
            rcla: "Recent Convert/Less-Active Lessons"
        };
        var zone = report.options.zone.value, indicator;
        for(var key in indicators) {
            if(indicators[key] == report.options.indicator.value) {
                indicator = key;
                break;
            }
        }
        var wards = {};
        var data = {};
        $.each(master.indicators, function(i, report) {
            if(report.zone != zone && zone != "(All)") return;
            var ward = zone == "(All)" ? report.zone : report.ward;
            if(!wards[ward]) wards[ward] = true;
            //Get weekly indicator data for the area
            var date = new Date(report.date);
            var month = date.getMonth() + 1;
            var index = date.getFullYear() + "-" + (month < 10 ? "0" + month : month);
            if(!data[index]) data[index] = {};
            var item;
            if(!data[index][ward]) {
                item = data[index][ward] = {};
                for(var name in indicators) item[name] = 0;
            }
            else item = data[index][ward];
            for(var name in indicators) {
                item[name] += report[name] ? parseInt(report[name]) : 0;
            }
        });
        //Sort the data by date
        var graphData = {
            name: "Stake Effectiveness Report",
            x: { labels: [] },
            y: null,
            graphs: [
                {
                    data: [],
                    style: "lines",
                    max: 0,
                    colours: [],
                    legend: []
                }, {
                    data: [],
                    style: "stackedBars",
                    max: 0,
                    colours: [],
                    legend: []
                }
            ]
        };
        var lineGraph = graphData.graphs[0];
        var wardsGraph = graphData.graphs[1];
        for(var ward in wards) wardsGraph.legend.push(ward);
        var keys = [];
        for(var key in data) keys.push(key);
        keys.sort();
        var runningTotal = 0;
        $.each(keys, function(i, key) {
            var values = [], reports = data[key], value, total = 0;
            for(var ward in wards) {
                value = reports[ward] ? reports[ward][indicator] : 0;
                values.push(value);
                total += value;
            }
            if(total > wardsGraph.max) wardsGraph.max = total;
            runningTotal += total;
            lineGraph.data.push([ runningTotal ]);
            wardsGraph.data.push(values);
            graphData.x.labels.push(key);
        });
        lineGraph.max = runningTotal;
        graph.setData(graphData);
    }
);

new Report(
    "Baptisms by Zone per Year",
    {
        zone: {
            name: "Zone",
            value: "(All)",
            values: [
                "(All)",
                "Brisbane",
                "Brisbane North",
                "Sunshine Coast",
                "Cleveland",
                "Ipswich",
                "Centenary",
                "Logan",
                "Eight Mile Plains",
                "Coomera",
                "Gold Coast",
                "Northern"
            ]
        },
        indicator: {
            name: "Indicator",
            value: "Baptised",
            values: [
                "Baptised",
                "Confirmed",
                "Baptismal Dates",
                "Investigators at Sacrament",
                "Member Present Lessons",
                "Other Lessons",
                "Progressing Investigators",
                "Referrals Received",
                "Referrals Contacted",
                "New Investigators",
                "Recent Convert/Less-Active Lessons"
            ]
        },
        graphType: {
            name: "Graph Type",
            value: "Bars",
            values: [
                "Line",
                "Bars",
                "Stacked Bars"
            ]
        }
    },
    function(report) {
        var indicators = {
            baptised: "Baptised",
            confirmed: "Confirmed",
            baptismalDate: "Baptismal Dates",
            sacrament: "Investigators at Sacrament",
            memberPresent: "Member Present Lessons",
            otherLesson: "Other Lessons",
            progressing: "Progressing Investigators",
            received: "Referrals Received",
            contacted: "Referrals Contacted",
            newInvestigators: "New Investigators",
            rcla: "Recent Convert/Less-Active Lessons"
        };
        var graphTypes = {
            "Line": "lines",
            "Bars": "bars",
            "Stacked Bars": "stackedBars"
        };
        var zone = report.options.zone.value, indicator;
        for(var key in indicators) {
            if(indicators[key] == report.options.indicator.value) {
                indicator = key;
                break;
            }
        }
        var data = {};
        $.each(master.indicators, function(i, report) {
            var reportZone = report.zone;
            if(reportZone == "Eight Mile PLains") reportZone = "Eight Mile Plains";
            if(reportZone != zone && zone != "(All)") return;
            //Get weekly indicator data for the area
            var index = (new Date(report.date)).getFullYear();
            if(!data[index]) data[index] = {};
            var item;
            if(!data[index][reportZone]) {
                item = data[index][reportZone] = {};
                for(var name in indicators) item[name] = 0;
            }
            else item = data[index][reportZone];
            for(var name in indicators) {
                item[name] += report[name] ? parseInt(report[name]) : 0;
            }
        });
        //Sort the data by year
        var graphType = report.options.graphType.value;
        var gr = {
            data: [],
            style: graphTypes[graphType],
            max: 0,
            colours: [],
            legend: []
        };
        var graphData = {
            name: "Baptisms by Zone per Year",
            x: { labels: [] },
            y: null,
            graphs: [ gr ]
        };
        var keys = [];
        for(var key in data) keys.push(key);
        keys.sort();
        var runningTotal = 0;
        var zones;
        if(zone == "(All)") {
            zones = [
                "Brisbane",
                "Brisbane North",
                "Sunshine Coast",
                "Cleveland",
                "Ipswich",
                "Centenary",
                "Logan",
                "Eight Mile Plains",
                "Coomera",
                "Gold Coast",
                "Northern"
            ];
        }
        else zones = [ zone ];
        for(var i in zones) gr.legend.push(zones[i]);
        for(var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var values = [], reports = data[key], value, total = 0;
            for(var a in zones) {
                var zone = zones[a];
                value = reports[zone] ? reports[zone][indicator] : 0;
                values.push(value);
                if(graphType != "Stacked Bars" && value > gr.max) gr.max = value;
                else total += value;
            }
            if(graphType == "Stacked Bars" && total > gr.max) gr.max = total;
            gr.data.push(values);
            graphData.x.labels.push(key);
        }
        graph.setData(graphData);
        //Data Table
        var html = '<div><h2>' + graphData.name + '</h2><table><tr><th></th>';
        for(var year in data) html += '<th>' + year + '</th>';
        html += '</tr>';
        for(var i = 0; i < zones.length; i++) {
            var zone = zones[i];
            html += '<tr><td><b>' + zone + '</b></td>';
            for(var year in data) {
                html += '<td>';
                if(data[year][zone]) html += data[year][zone][indicator];
                html += '</td>';
            }
        }
        html += '</div></table>';
        var tableGraph = document.createElement('DIV');
        tableGraph.className = "graph grab";
        tableGraph.innerHTML = html;
        allowedClick.push(tableGraph.firstChild);
        tableGraph.addEventListener("mousedown", graphDown, false);
        document.body.appendChild(tableGraph);
    }
);

var canvas, graph;
var allowedClick = [];
window.addEventListener("load", function(e) {
    canvas = document.getElementsByClassName('graph')[0];
    canvas.style.left = canvas.style.top = 0;
    canvas.className = "graph grab";
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    graph = new Graph(canvas);
    window.addEventListener("mousedown", stopClick, false);
    window.addEventListener("contextmenu", stopEvent, false);
    canvas.addEventListener("mousedown", graphDown, false);
    canvas.addEventListener("mousewheel", graphWheel, false);
    //Get data
    var data = { action: "get" };
    $.post("/historical_data/db", data, function(result) {
        master.indicators = result;
        $('#status').text("");
        //Create options form
        var select = $('#reports')
            .append($('<option></option>')
                .attr("value", "null")
                .attr("selected", true)
                .text("Select a report...")
            )
            .on("change", function(e) {
                $('#report_options').empty();
                if(this.value !== "null")
                    reports[this.value].load();
            });
        $.each(reports, function(i, report) {
            select.append($('<option></option>').attr("value", i).text(report.name));
        });
        allowedClick.push(select[0]);
    });
    $('#status').text("Loading...");
}, false);
function stopClick(e) {
    for(var i = 0; i < allowedClick.length; i++) {
        var element = e.target;
        while(element != document.body) {
            if(element == allowedClick[i]) return;
            element = element.parentNode;
        }
    }
    stopEvent(e);
}
function stopEvent(e) { e.preventDefault(); }

var mouse = { x: 0, y: 0 }, moving = { element: null, x: 0, y: 0 };
function graphDown(e) {
    if(e.button) return;
    window.addEventListener("mousemove", graphMove, false);
    window.addEventListener("mouseup", graphUp, false);
    mouse.x = e.x;
    mouse.y = e.y;
    moving.element = e.target;
    moving.x = e.target.offsetLeft;
    moving.y = e.target.offsetTop;
    canvas.className = "graph";
    document.body.className = "grabbing";
}
function graphMove(e) {
    graph.left = e.x - mouse.x + moving.x;
    graph.top = e.y - mouse.y + moving.y;
    moving.element.style.left = graph.left + "px";
    moving.element.style.top = graph.top + "px";
}
function graphUp(e) {
    graph.left = e.x - mouse.x + moving.x;
    graph.top = e.y - mouse.y + moving.y;
    moving.element.style.left = graph.left + "px";
    moving.element.style.top = graph.top + "px";
    window.removeEventListener("mousemove", graphMove, false);
    window.removeEventListener("mouseup", graphUp, false);
    document.body.className = "";
    canvas.className = "graph grab";
}
function graphWheel(e) {
    var zoomSpeed = 0.1;
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
    var width = e.target.width * (1 + delta * zoomSpeed);
    var height = e.target.height * (1 + delta * zoomSpeed);
    graph.left -= (e.target.width * delta * zoomSpeed) / 2;
    graph.top -= (e.target.height * delta * zoomSpeed) / 2;
    e.target.width = width;
    e.target.height = height;
    e.target.style.width = width + "px";
    e.target.style.height = height + "px";
    e.target.style.left = graph.left + "px";
    e.target.style.top = graph.top + "px";
    graph.render();
}

function fullscreen(full) {
    //Work around vendor prefixes
    function on() {
        var element = document.body;
        (
            element.requestFullScreen ||
            element.webkitRequestFullScreen ||
            element.mozRequestFullScreen
        ).call(element);
    }
    function off() {
        (
            document.exitFullscreen ||
            document.webkitExitFullscreen ||
            document.mozCancelFullScreen
        ).call(document);
    }
    function check() {
        return document.fullscreenElement ||
               document.webkitFullscreenElement ||
               document.mozFullScreenElement;
    }
    
    if(full) on();
    else if(full === false) off();
    else if(check()) off();
    else on();
}