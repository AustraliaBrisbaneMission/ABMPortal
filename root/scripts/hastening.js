function submitClicked(e) {
    e.preventDefault();
    var i = 0, unitElement, item, data = {
        stake: User.zone,
        president: $("#president").value,
        goal: $("#goal").value,
        zoneLeaders: $("#zoneLeaders").value,
        units: []
    };
    function getValue(name, type) {
        var element = document.getElementsByName("unit" + i + "_" + name)[0];
        if(type == "checkbox") item[name] = element.checked;
        else if(type == "text") item[name] = element.value;
        else if(type == "optional") {
            var value = parseFloat(element.value);
            item[name] = isNaN(value) ? "" : value;
        }
        else item[name] = parseFloat(element.value) || 0;
    }
    while((unitElement = $("#unit" + ++i))) {
        item = { name: unitElement.textContent };
        getValue("wardMissionaries");
        getValue("fullTimeMissionaries");
        getValue("hasWardMissionPlan", "checkbox");
        getValue("hasBeenReferenced", "checkbox");
        getValue("memberPresents");
        getValue("investigatorsAtChurch");
        getValue("missionaryHomeTeaching");
        getValue("numberNames");
        getValue("numberInvited");
        getValue("numberBeingTaught");
        getValue("rescueVisits");
        getValue("needsAndConcerns", "text");
        getValue("dateReviewed", "text");
        for(var month = 1; month <= 12; month++) getValue("month" + month, "optional");
        getValue("goal");
        data.units.push(item);
    }
    $.post("/hastening/submit", data, function(result) {
        alert("Successfully submitted!");
    });
}

function getUnitTotal(unitNumber) {
    var unit = "unit" + unitNumber, totalBaptisms = 0, empty = true;
    for(var month = 1; month <= 12; month++) {
        var element = document.getElementsByName(unit + "_month" + month)[0];
        if(element.value.length) {
            empty = false;
            totalBaptisms += parseInt(element.value) || 0;
        }
    }
    var element = document.getElementsByName(unit + "_goal")[0];
    var goal = 0;
    if(element.value.length) {
        empty = false;
        goal = parseInt(element.value) || 0;
    }
    $("#" + unit + "_ytd").textContent = empty ? "" : totalBaptisms;
    $("#" + unit + "_remaining").textContent = empty ? "" : goal - totalBaptisms;
}

function getMonthTotal(name) {
    //Calculate month/goal totals
    var empty = true, unit = 0, total = 0, element;
    //Total month/goals column
    while((element = document.getElementsByName("unit" + (++unit) + name)[0])) {
        if(element.value.length) {
            empty = false;
            total += parseInt(element.value) || 0;
        }
    }
    $("#total" + name).textContent = empty ? "" : total;
    //Total year to date and remaining columns
    function getTotals(name) {
        var unit = 0, total = 0, empty = true;
        while((element = $("#unit" + (++unit) + "_" + name))) {
            if(element.textContent.length) {
                empty = false;
                total += parseInt(element.textContent) || 0;
            }
        }
        $("#total_" + name).textContent = empty ? "" : total;
    }
    getTotals("ytd");
    getTotals("remaining");
}

function calculateBaptisms(e) {
    getUnitTotal(this.unit);
    getMonthTotal(this.name.substr(this.name.indexOf("_")));
}

window.on("load", function() {
    //Submit button
    $("#submitButton").on("click", submitClicked);
    //Automatically add baptism totals
    var i = 0, unitElement;
    while((unitElement = $("#unit" + (++i)))) {
        for(var month = 1; month <= 12; month++) {
            var element = document.getElementsByName("unit" + i + "_month" + month)[0];
            element.hasteningType = "month";
            element.unit = i;
            element.on("change", calculateBaptisms);
        }
        var goal = document.getElementsByName("unit" + i + "_goal")[0];
        goal.unit = i;
        goal.hasteningType = "goal";
        goal.on("change", calculateBaptisms);
    }
    //Calculate baptisms
    var unitCount = i;
    for(var i = 1; i < unitCount; i++) getUnitTotal(i);
    for(var i = 1; i <= 12; i++) getMonthTotal("_month" + i);
    getMonthTotal("_goal");
});