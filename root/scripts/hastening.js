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
        data.units.push(item);
    }
    $.post("/hastening/submit", data, function(result) {
        alert("Successfully submitted!");
    });
}

window.on("load", function() {
    $("#submitButton").on("click", submitClicked);
});