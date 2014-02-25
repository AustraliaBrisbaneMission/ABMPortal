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
        $("#unit" + (currentUnit + 1) + "_" + name).textContent = unit[name];
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
        $("#unit" + (currentUnit + 1) + "_name2").textContent = unit.name;
        $("#unit" + (currentUnit + 1)).style.display = "";
        $("#unit" + (currentUnit + 1) + "_baptisms").style.display = "";
    }
    for(currentUnit++; currentUnit < 20; currentUnit++) {
        $("#unit" + currentUnit).style.display = "none";
        $("#unit" + currentUnit + "_baptisms").style.display = "none";
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