var currentStake = User.zone || "";
function openReport(report) {
    currentStake = report.stake;
    $("#stake").textContent = report.stake + " Stake";
    $("#goal").textContent = report.goal;
    $("#president").textContent = "President " + report.president;
    $("#zoneLeaders").textContent = report.zoneLeaders;
    $("#date").textContent = report.date;
    //Display the values of each unit in the report
    var units = report.units, currentUnit, unit;
    function displayValue(name) {
        var value = unit[name] === undefined ? "" : unit[name];
        $("#unit" + (currentUnit + 1) + "_" + name).textContent = value;
    }
    for(currentUnit = 0; currentUnit < units.length; currentUnit++) {
        unit = units[currentUnit];
        displayValue("name");
        displayValue("wardMissionaries");
        displayValue("fullTimeMissionaries");
        $("#unit" + (currentUnit + 1) + "_hasWardMissionPlan").textContent =
            unit.hasWardMissionPlan ? "Yes" : "No";
        $("#unit" + (currentUnit + 1) + "_hasBeenReferenced").textContent =
            unit.hasBeenReferenced ? "Yes" : "No";
        displayValue("memberPresents");
        displayValue("investigatorsAtChurch");
        displayValue("missionaryHomeTeaching");
        displayValue("numberNames");
        displayValue("numberInvited");
        displayValue("numberBeingTaught");
        displayValue("rescueVisits");
        displayValue("needsAndConcerns");
        displayValue("dateReviewed");
        for(var month = 1; month <= 12; month++) displayValue("month" + month);
        displayValue("goal");
        $("#unit" + (currentUnit + 1) + "_name2").textContent = unit.name;
        $("#unit" + (currentUnit + 1)).style.display = "";
        $("#unit" + (currentUnit + 1) + "_baptisms").style.display = "";
    }
    for(currentUnit++; currentUnit < 20; currentUnit++) {
        $("#unit" + currentUnit).style.display = "none";
        $("#unit" + currentUnit + "_baptisms").style.display = "none";
    }
    calculateBaptisms();
}

function calculateBaptisms() {
    function getTotals(name) {
        var unit = 0, total = 0, empty = true, element;
        while((element = $("#unit" + (++unit) + "_" + name))) {
            if(element.textContent.length) {
                empty = false;
                total += parseInt(element.textContent) || 0;
            }
        }
        $("#total_" + name).textContent = empty ? "" : total;
    }
    for(var i = 1; i < 20; i++) {
        //Total the baptisms for each unit
        var unit = "unit" + i, totalBaptisms = 0, empty = true;
        for(var month = 1; month <= 12; month++) {
            var value = $("#" + unit + "_month" + month).textContent;
            if(value.length) {
                empty = false;
                totalBaptisms += parseInt(value) || 0;
            }
        }
        var value = $("#" + unit + "_goal").textContent;
        var goal = 0;
        if(value.length) {
            empty = false;
            goal = parseInt(value) || 0;
        }
        $("#" + unit + "_ytd").textContent = empty ? "" : totalBaptisms;
        $("#" + unit + "_remaining").textContent = empty ? "" : goal - totalBaptisms;
        //Total baptism columns
        for(var month = 1; month <= 12; month++) getTotals("month" + month);
        getTotals("ytd");
        getTotals("goal");
        getTotals("remaining");
    }
}

function loadReports() {
    function reportClicked(e) {
        e.preventDefault();
        openReport(this.report);
    }
    $.get("/hastening/get", function(reports) {
        var container = $("#reports");
        container.html("");
        for(var i = 0, length = reports.length; i < length; i++) {
            var report = reports[i];
            var div = $.create("DIV", { parent: container });
            var text = report.date + " - " + report.stake;
            var a = $.create("A", { href: "#", parent: div }, text);
            a.report = report;
            a.on("click", reportClicked);
        }
    });
}
window.on("load", loadReports);