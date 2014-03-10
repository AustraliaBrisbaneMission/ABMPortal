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
    title.on("mousedown", clicked);
}

function render(data) {
    var sortBy = {
        field1: { displayName: "Area", reportName: "area", descending: false },
        field2: { displayName: "Date", reportName: "date", descending: true }
    };
    //Create indicators table
    var resultBox = document.getElementById('result_box');
    resultBox.innerHTML = "";
    var table = $.create("TABLE", { parent: resultBox });
    //Add indicator names to table header
    var header = $.create("TR", { parent: table }, [
        $.create("TH", sortBy.field1.displayName),
        $.create("TH", sortBy.field2.displayName),
        $.create("TH", "Reported By")
    ]);
    var indicators = data.indicators;
    $.each(indicators, function(indicator) {
        $.create("TH", { parent: header, alt: indicator.description }, indicator.name);
    });
    //Organise reports by date then missionary
    var reports = {};
    function organiseReports(type) {
        $.each(data[type], function(report) {
            var field1 = report[sortBy.field1.reportName];
            var field2 = report[sortBy.field2.reportName];
            if(!reports[field1]) reports[field1] = { length: 0 };
            if(!reports[field1][field2]) {
                reports[field1][field2] = {};
                reports[field1].length++;
            }
            reports[field1][field2][type] = report;
        });
    }
    organiseReports("goals");
    organiseReports("actuals");
    //Add reports to table
    var goalOptions = {
        parent: table,
        className: "goalRow"
    };
    var actualOptions = {
        parent: table,
        className: "actualRow"
    };
    $.eachSorted(reports, function(weekReport, date) {
        var row = $.create("TR", actualOptions, $.create("TD", { rowSpan: weekReport.length * 2, className: "date" }, date));
        $.eachSorted(weekReport, function(report, area) {
            if(area == "length") return;
            var actualRow = row || $.create("TR", actualOptions);
            row = null;
            $.create("TD", { parent: actualRow, rowSpan: 2, className: "missionary" }, area);
            var reportedBy = (report.actuals || report.goals || { reportedBy: "" }).reportedBy;
            $.create("TD", { parent: actualRow, rowSpan: 2, className: "reportedBy" }, reportedBy);
            var actuals = report.actuals || {};
            $.each(indicators, function(indicator) {
                $.create("TD", { parent: actualRow }, actuals[indicator._id]);
            });
            var goals = report.goals || {};
            var goalRow = $.create("TR", goalOptions);
            $.each(indicators, function(indicator) {
                $.create("TD", { parent: goalRow }, goals[indicator._id]);
            });
        }, sortBy.field2.descending);
    }, sortBy.field1.descending);
}

var deletedStandards = [];
function loadAdmin(data) {
    var element = $("#adminIndicators");
    function addIndicator(e, id, name, description) {
        if(e) e.preventDefault();
        id = id || "";
        name = name || "";
        description = description || "";
        var nameInput = $.create("INPUT", {
            type: "text",
            value: name,
            placeholder: "Short Name",
            className: "nameInput"
        });
        var descriptionInput = $.create("INPUT", {
            type: "text",
            value: description,
            placeholder: "Indicator Description",
            className: "descriptionInput"
        });
        var removeLink = $.create("A", { href: "#Remove" }, "REMOVE");
        removeLink.on("click", removeIndicator);
        var container = $.create("DIV", { parent: element }, [
            nameInput,
            descriptionInput,
            removeLink
        ]);
        removeLink.container = container;
        container._id = removeLink._id = id;
        container.nameInput = nameInput;
        container.descriptionInput = descriptionInput;
    }
    function removeIndicator(e) {
        e.preventDefault();
        this.container.remove();
        if(this._id) deletedStandards.push(this._id);
    }
    
    $.each(data.indicators, function(indicator) {
        addIndicator(null, indicator._id, indicator.name, indicator.description);
    });
    $("#addLink").on("click", addIndicator);
}

function submitAdmin(e) {
    e.preventDefault();
    var modified = [], inserted = [];
    var children = $("#adminIndicators").children;
    for(var i = 0; i < children.length; i++) {
        var container = children[i];
        var name = container.nameInput.value.trim();
        var description = container.descriptionInput.value.trim();
        if(!name.length || !description.length) continue;
        var record = { id: container._id, name: name, description: description };
        if(container._id) modified.push(record);
        else inserted.push(record);
    }
    var data = {
        deleted: deletedStandards,
        modified: modified,
        inserted: inserted
    };
    $.post("/indicators/save", data, adminSaved);
}
function adminSaved() {
    alert("Saved!");
}

window.on("load", function() {
    $.get("/indicators/get", function(response) {
        render(response);
        loadAdmin(response);
    });
    $("#submitButton").on("click", submitAdmin);
});