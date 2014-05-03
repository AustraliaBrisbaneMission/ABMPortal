var ids = [], slideSpeed = 200;

var allAreas = [];
window.addEventListener("load", function(e) {
    $.get("/recommendations/get_missionaries", function(response) {
        var areas = response.areas;
        if(response.all) {
            areas.sort(function(a, b) {
                if(a[0] > b[0]) return 1;
                if(a[0] < b[0]) return -1;
                return 0;
            });
            allAreas = areas;
            var select = document.getElementById("newArea");
            select.addEventListener("change", openArea, false);
            for(var i = 0; i < areas.length; i++) {
                var option = document.createElement("OPTION");
                option.value = i;
                option.textContent = areas[i][0];
                select.appendChild(option);
            }
        }
        else for(var i = 0; i < areas.length; i++) {
            var area = areas[i];
            var index = ids.length;
            addArea(area[0], area[1]);
            for(var b = 2; b < area.length; b++) addMissionary(index, area[b]);
        }
    });
}, false);

function openArea(e) {
    var parts = allAreas[this.value];
    var index = ids.length;
    addArea(parts[0], parts[1]);
    for(var i = 2; i < parts.length; i++) addMissionary(index, parts[i]);
    this.value = "";
}

function addArea(name, zone) {
    name = name || "";
    zone = zone || "";
    var area = document.createElement("DIV");
    area.innerHTML = '<div class="area" id="areabox' + ids.length + '"><span>Area:</span><input type="text" value="' + name + '" id="area' + ids.length + '" />' +
        '<input type="button" value="Remove Area" onclick="removeArea(' + ids.length + ')" class="right" />' +
        '<input type="hidden" value="' + zone + '" id="zone' + ids.length + '" /><div id="missionaries' + ids.length + '"></div>' +
        '<div><input type="button" value="Add Missionary" onclick="addMissionary(' + ids.length + ')" /></div></div>';
    area.style.display = "none";
    area.id = "a" + ids.length;
    document.getElementById('areas').appendChild(area);
    $('#a' + ids.length).slideDown(slideSpeed);
    ids.push("area");
}

function addMissionary(index, name, zone) {
    name = name || "";
    var missionary = document.createElement("DIV");
    missionary.area = index;
    missionary.id = "missionary" + ids.length;
    missionary.className = "missionary";
    missionary.innerHTML = [
        '<div>',
            '<span>Missionary:</span><input type="text" value="' + name + '" name="rName' + ids.length + '" />',
            '<span>Number of transfers in area:</span><input type="text" name="rIn' + ids.length + '" class="number_input" />',
            '<span>Number of transfers left:</span><input type="text" name="rLeft' + ids.length + '" class="number_input" />',
            '<label for="stay' + ids.length + '">Stay</label>',
                '<input type="radio" name="rStay' + ids.length + '" id="stay' + ids.length + '" value="Stay" />',
            '<label for="go' + ids.length + '">Go</label>',
                '<input type="radio" name="rStay' + ids.length + '" id="go' + ids.length + '" value="Go" />',
        '</div>',
        '<div>',
            '<span>Leadership Recommendation (Select all applicable):',
            '<input type="checkbox" value="Senior Companion" id="rSenior' + ids.length + '" name="rLeadership' + ids.length + '" />',
                '<label for="rSenior' + ids.length + '">Senior Companion</label>',
            '<input type="checkbox" value="Trainer" id="rTrainer' + ids.length + '" name="rLeadership' + ids.length + '" />',
                '<label for="rTrainer' + ids.length + '">Trainer</label>',
            '<input type="checkbox" value="District Leader" id="rDL' + ids.length + '" name="rLeadership' + ids.length + '" />',
                '<label for="rDL' + ids.length + '">District Leader</label>',
            '<input type="checkbox" value="Zone Leader" id="rZL' + ids.length + '" name="rLeadership' + ids.length + '" />',
                '<label for="rZL' + ids.length + '">Zone Leader</label>',
        '</div>',
        '<div>',
            '<span>Comments:</span><input type="text" name="rComments' + ids.length + '" class="comments" />',
            '<input type="button" value="Remove Missionary" onclick="removeMissionary(' + ids.length + ')" class="right" />',
        '</div>'
    ].join("");
    missionary.style.display = "none";
    document.getElementById('missionaries' + index).appendChild(missionary);
    $('#missionary' + ids.length).slideDown(slideSpeed);
    ids.push("missionary");
}

function removeMissionary(index) {
    $('#missionary' + index).slideUp(slideSpeed, function() {
        var element = document.getElementById('missionary' + index);
        element.parentNode.removeChild(element);
        ids[index] = null;
    });
}

function removeArea(index) {
    for(var i = 0; i < ids.length; i++) {
        if(ids[i] == "missionary" && document.getElementById('missionary' + i).area == index)
            removeMissionary(i);
    }
    $('#areabox' + index).slideUp(slideSpeed, function() {
        var element = document.getElementById('areabox' + index);
        element.parentNode.removeChild(element);
        ids[index] = null;
    });
}

function submitRecommendation() {
    var recommendations = [], areas = [], area, leadership, elements, stay;
    var zone = document.getElementsByName('zone')[0].value,
        zoneLeader = document.getElementsByName('zone_leader')[0].value;
    for(var a = 0; a < ids.length; a++) {
        if(ids[a] == "area") {
            document.getElementById('area' + a).areaNumber = areas.length;
            areas.push(document.getElementById('area' + a).value);
        }
        else if(ids[a] == "missionary") {
            var areaNumber = document.getElementById('missionary' + a).area;
            area = document.getElementById('area' + areaNumber).areaNumber;
            var missionaryZone = document.getElementById('zone' + areaNumber).value;
            leadership = [];
            elements = document.getElementsByName('rLeadership' + a);
            for(var b = 0; b < elements.length; b++) {
                if(elements[b].checked) leadership.push(elements[b].value);
            }
            elements = document.getElementsByName('rStay' + a);
            if(elements[0].checked) stay = "Stay";
            else if(elements[1].checked) stay = "Go";
            else stay = "";
            recommendations.push({
                zone: missionaryZone || zone,
                zoneLeader: zoneLeader,
                area: areas[area],
                name: document.getElementsByName('rName' + a)[0].value,
                tIn: document.getElementsByName('rIn' + a)[0].value,
                tLeft: document.getElementsByName('rLeft' + a)[0].value,
                stay: stay,
                leadership: leadership.join(", "),
                comments: document.getElementsByName('rComments' + a)[0].value
            });
        }
    }
    document.getElementById('submit_button').value = "Submitting...";
    document.getElementById('submit_button').disabled = true;
    $.ajax("/recommendations/submit", {
        data : JSON.stringify(recommendations),
        contentType : "application/json",
        type : "POST",
        success: function(response) {
            if(response != "OK") {
                console.log("Response = " + response);
                document.getElementById('submit_button').value = "Submit Recommendations";
                document.getElementById('submit_button').disabled = false;
            }
            else window.location = "/recommendations/success";
        }
    });
}