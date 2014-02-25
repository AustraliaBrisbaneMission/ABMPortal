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
    //Create indicators table
    var resultBox = document.getElementById('result_box');
    resultBox.innerHTML = "";
    var table = $.create("TABLE", { parent: resultBox });
    //Add indicator names to table header
    var header = $.create("TR", { parent: table }, [
        $.create("TH", "Date"),
        $.create("TH", "Missionary")
    ]);
    var indicators = data.indicators;
    $.each(indicators, function(indicator) {
        $.create("TH", { parent: header }, indicator.name);
    });
    //Organise reports by date then missionary
    var reports = {};
    function organiseReports(type) {
        $.each(data[type], function(report) {
            var date = report.date, missionary = report.missionary;
            if(!reports[date]) reports[date] = { length: 0 };
            if(!reports[date][missionary]) reports[date][missionary] = {};
            reports[date][report.missionary][type] = report;
            reports[date].length++;
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
    var lastDate;
    $.eachSorted(reports, function(missionaryReport, date) {
        if(date != lastDate) {
            var row = $.create("TR", actualOptions, $.create("TD", { rowSpan: missionaryReport.length * 2, className: "date" }, date));
            lastDate = date;
        }
        $.eachSorted(missionaryReport, function(report, missionary) {
            if(missionary == "length") return;
            var actualRow = row || $.create("TR", actualOptions);
            row = null;
            $.create("TD", { parent: actualRow, rowSpan: 2, className: "missionary" }, missionary);
            var actuals = report.actuals || {};
            $.each(indicators, function(indicator) {
                $.create("TD", { parent: actualRow }, actuals[indicator.id]);
            });
            var goals = report.goals || {};
            var goalRow = $.create("TR", goalOptions);
            $.each(indicators, function(indicator) {
                $.create("TD", { parent: goalRow }, goals[indicator.id]);
            });
        });
    }, true);
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
        addIndicator(null, indicator.id, indicator.name, indicator.description);
    });
    $("#addLink").on("click", addIndicator);
}

function submitAdmin(e) {
    e.preventDefault();
    var modified = {}, inserted = [];
    var children = $("#adminIndicators").children;
    for(var i = 0; i < children.length; i++) {
        var container = children[i];
        var name = container.nameInput.value.trim();
        var description = container.descriptionInput.value.trim();
        if(!name.length || !description.length) continue;
        var record = { name: name, description: description };
        if(container._id) modified[container._id] = record;
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