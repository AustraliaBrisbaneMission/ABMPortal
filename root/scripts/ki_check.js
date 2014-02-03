function getIndicators(indicators) {
    function clickerClicked(e) {
        e.preventDefault();
        this.expand.visible = !this.expand.visible;
        this.expand.style.display = this.expand.visible ? "" : "none";
    }
    function clicker(linkText, expandHTML) {
        var container = $.create("DIV");
        var link = $.create("A", { parent: container, href: "#" }, linkText);
        var expand = $.create("DIV", { parent: container });
        expand.html(expandHTML);
        expand.style.display = "none";
        link.expand = expand;
        link.on("click", clickerClicked);
        return container;
    }
    function yearClicked(e) {
        e.preventDefault();
        this.year.visible = !this.year.visible;
        this.year.div.style.display = this.year.visible ? "" : "none";
    }
    function weekClicked(e) {
        e.preventDefault();
        this.week.visible = !this.week.visible;
        this.week.table.style.display = this.week.visible ? "" : "none";
    }
    //Sort indicators by date
    indicators.sort(function(a, b) {
        if(a.date > b.date) return 1;
        if(a.date < b.date) return -1;
        return 0;
    });
    //Group indicators by year
    var years = {};
    for(var i = 0, count = indicators.length; i < count; i++) {
        var indicator = indicators[i];
        var date = indicator.date;
        var year = date ? date.substr(0, 4) : "Unknown";
        date = date || "Unknown";
        if(!years[year]) years[year] = { weeks: {} };
        if(!years[year].weeks[date]) years[year].weeks[date] = { indicators: [] };
        years[year].weeks[date].indicators.push(indicator);
    }
    //Make tables for each week
    var headings = [
        { displayName: "Zone", name: "zone" },
        { displayName: "Ward", name: "ward" },
        { displayName: "Area", name: "area" },
        { displayName: "Bap", name: "baptised" },
        { displayName: "Conf", name: "confirmed" },
        { displayName: "Date", name: "baptismalDate" },
        { displayName: "Sac", name: "sacrament" },
        { displayName: "MP", name: "memberPresent" },
        { displayName: "OL", name: "otherLesson" },
        { displayName: "Prog", name: "progressing" },
        { displayName: "R", name: "received" },
        { displayName: "C", name: "contacted" },
        { displayName: "New", name: "newInvestigators" },
        { displayName: "RCLA", name: "rcla" },
        { displayName: "HRs", name: "finding" },
        { displayName: "Ps", name: "Potentials" }
    ];
    var kiParent = { parent: $("#ki"), className: "yearDiv" };
    for(var year in years) {
        var yearLink = $.create("A", { parent: $("#ki"), href: "#" + year }, year);
        yearLink.year = years[year];
        yearLink.on("click", yearClicked);
        var yearDiv = years[year].div = $.create("DIV", kiParent);
        yearDiv.style.display = "none";
        var weeks = years[year].weeks;
        var weekItem = { missionaries: {} };
        for(var week in weeks) {
            var previous = weekItem;
            weekItem = weeks[week];
            weekItem.missionaries = {};
            var reports = weeks[week].indicators;
            //Indicators
            var fields = [ $.create("TH", "Missionaries") ];
            for(var i = 0; i < headings.length; i++) fields.push($.create("TH", headings[i].displayName));
            var table = weeks[week].table = $.create("TABLE", $.create("TR", fields));
            table.style.display = "none";
            var parent = { parent: table };
            for(var i = 0; i < reports.length; i++) {
                var report = reports[i];
                var fields = [ $.create("TD", report.missionaries.join(" / ")) ];
                for(var b = 0; b < headings.length; b++) {
                    var value = report[headings[b].name];
                    fields.push($.create("TD", value === undefined ? "" : value + ""));
                }
                $.create("TR", parent, fields);
                for(var b = 0; b < report.missionaries.length; b++) {
                    weekItem.missionaries[report.missionaries[b]] = report.area;
                }
            }
            //Statistics
            var missionaries = [], unusualComps = [];
            for(var i = 0; i < reports.length; i++) {
                var report = reports[i];
                for(var b = 0; b < report.missionaries.length; b++) {
                    missionaries.push(report.missionaries[b] + " (" + report.area + ")");
                }
                if(report.missionaries.length < 2 || report.missionaries.length > 3) {
                    unusualComps.push(report.area + " (" + report.missionaries.length + "): " + report.missionaries.join(" - "));
                }
            }
            var gone = [];
            for(var missionary in previous.missionaries) {
                if(!weekItem.missionaries[missionary]) gone.push(missionary + " (" + previous.missionaries[missionary] + ")");
            }
            var added = [];
            for(var missionary in weekItem.missionaries) {
                if(!previous.missionaries[missionary]) added.push(missionary + " (" + weekItem.missionaries[missionary] + ")");
            }
            var weekLink = $.create("A", { href: "#" + week }, week);
            weekLink.week = weeks[week];
            weekLink.on("click", weekClicked);
            var weekDiv = $.create("DIV", { parent: yearDiv }, [
                weekLink,
                $.create("DIV", "Companionships: " + reports.length)
            ]);
            weekDiv.append(clicker("Missionaries: " + missionaries.length, missionaries.join("<br />")));
            weekDiv.append(clicker("Missionaries Gone: " + gone.length, gone.join("<br />")));
            weekDiv.append(clicker("Missionaries Added: " + added.length, added.join("<br />")));
            weekDiv.append(clicker("Unusual Companionships: " + unusualComps.length, unusualComps.join("<br />")));
            yearDiv.append(table);
        }
    }
}
$.get("/ki_check/get", getIndicators);