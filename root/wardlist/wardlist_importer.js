var settings = {
    title: "Ward List",
    ourSuburbs: [
        /*
        "ascot",
        "hamilton",
        "clayfield",
        "hendra",
        "wooloowin",
        "windsor",
        "albion",
        "lutwyche"
        */
    ]
};
//ascot,hamilton,clayfield,hendra,wooloowin,albion,lutwyche,windsor

var months = {
    "Jan": 0,
    "Feb": 1,
    "Mar": 2,
    "Apr": 3,
    "May": 4,
    "Jun": 5,
    "Jul": 6,
    "Aug": 7,
    "Sep": 8,
    "Oct": 9,
    "Nov": 10,
    "Dec": 11
};
function convert() {
    if(!fileContents) return;
    var lines = fileContents;
    function getName(name, familyName) {
        if(!name) return null;
        var pos = name.indexOf(',');
        if(pos < 0 || name.substring(0, pos) != familyName) return name;
        return name.substring(pos + 2);
    }
    //Convert the data to HTML
    var headings = lines[0];
    var headingLength = headings.length;
    var householdIds = {};
    var positions = {
        "Head of Household": "head",
        "Spouse": "spouse",
        "Other": "other"
    };
    var suburbRegex = new RegExp(settings.ourSuburbs.join("|"), "i");
    for(var a = 1, length = lines.length; a < length; a++) {
        //Get data
        var line = lines[a], data = {};
        for(var b = 0; b < headingLength; b++) data[headings[b]] = line[b];
        //Add individual's data to household
        var household = householdIds[data["HofH ID"]] || { people: [] };
        var position = positions[data["HH Position"]] || "other";
        //Set household information if individual is head of household
        if(position == "head") {
            var name = data["Full Name"];
            household.familyName = name.substr(0, name.indexOf(","));
            household.address1 = data["Street 1"] || "";
            household.address2 = data["Street 2"] || "";
            household.city = data["City"] || "";
            household.postcode = data["Postal"] || "";
            household.state = data["State/Prov"] || "";
            household.country = data["Country"] || "";
            household.phone = data["Household Phone"] || "";
            household.inArea = !!suburbRegex.exec(household.city);
            household.status = (data["STATUS"] || "").toLowerCase();
            household.notes = data["NOTES"];
        }
        //Get age
        var birthDate = data["Birth"], age;
        if(birthDate) {
            var parts = birthDate.split("-");
            var day = parseInt(parts[0]);
            var month = months[parts[1]];
            var year = parseInt(20 + parts[2]);
            var today = new Date();
            var age = today.getFullYear() - year;
            if(age < 0) {
                age += 100;
                year -= 100;
            }
            var birth = new Date();
            birth.setYear(year);
            birth.setMonth(month);
            birth.setDate(day);
            var m = today.getMonth() - month;
            if(m < 0 || (!m && today.getDate() < day)) age--;
        }
        //Add household member
        var id = data["Indiv ID"];
        people[id] = {
            position: position,
            gender: { Male: "m", Female: "f" }[data["Sex"]],
            name: getName(data["Full Name"], household.familyName),
            fullName: data["Full Name"],
            birthDate: birthDate,
            age: age,
            phone: data["Individual Phone"] || "",
            baptised: data["Baptized"] || "",
            confirmed: data["Confirmed"] || "",
            endowed: data["Endowed"] || "",
            recommend: data["Rec Exp"] || "",
            priesthood: data["Priesthood"] || "",
            rm: data["Mission"] == "Yes",
            married: data["Married"] == "Married",
            spouseMember: { "Yes": 2, "No": 1 }[data["Spouse Member"]] || 0,
            sealedSpouse: { "Yes": 2, "No": 1 }[data["Sealed to Spouse"]] || 0,
            sealedPrior: data["Sealed to Prior"] == "Yes",
            status: (data["STATUS"] || "").toLowerCase()
        };
        household.people.push(id);
        householdIds[data["HofH ID"]] = household;
    }
    //Sort the households alphabetically
    households = [];
    for(var id in householdIds) households.push(householdIds[id]);
    households.sort(function(a, b) {
        if(a.familyName > b.familyName) return 1;
        if(a.familyName < b.familyName) return -1;
        return 0;
    });
    return render();
}

function checkArea() {
    for(var i = 0; i < households.length; i++) {
        household.inArea = document.getElementById("household" + i).checked;
    }
}

function render() {
    var html = [ [
        '<html>',
            '<head>',
                '<title>' + escapeHtml(settings.title) + '</title>',
                '<script>',
                    'var people = ' + JSON.stringify(people) + ';',
                    'var households = ' + JSON.stringify(households) + ';',
                    'var suburbs = new RegExp("' + settings.ourSuburbs.join("|") + '", "i");',
                    'var loadingBox = null;',
                    //Displays all households with a particular status
                    'var currentStatus = null;',
                    'function openStatus(status) {',
                        'if(loadingBox || status == currentStatus) return;',
                        'loadingBox = document.createElement("DIV");',
                        'loadingBox.textContent = "Loading...";',
                        'loadingBox.className = "loading";',
                        'document.body.appendChild(loadingBox);',
                        'if(status == "Unknown") currentStatus = "";',
                        'else currentStatus = status || "Area";',
                        'setTimeout(startOpening, 0);',
                    '}',
                    'function startOpening() {',
                        'var html = "";',
                        'for(var a = 0, length = households.length; a < length; a++) {',
                            'var household = households[a];',
                            'if(currentStatus == "All" || ',
                                'currentStatus == "Area" && household.inArea || ',
                                'household.status == currentStatus) html += householdHTML(household);',
                        '}',
                        'document.getElementById("list").innerHTML = html;',
                        'if(loadingBox) {',
                            'document.body.removeChild(loadingBox);',
                            'loadingBox = null;',
                        '}',
                    '}',
                    //Toggles between households in the area and all unit households
                    'function toggleHouseholds() {',
                        'openStatus(currentStatus == "Area" ? "All" : "Area");',
                    '}',
                    'window.addEventListener("load", toggleHouseholds, false);',
                    'window.addEventListener("keydown", toggleHouseholds, false);',
                    //Ouputs the HTML for a household
                    'var statusClasses = {',
                        '"a": "active",',
                        '"la": "inactive",',
                        '"ni": "ni",',
                        '"moved": "moved",',
                        '"rc": "convert",',
                        '"dnv": "dnv",',
                    '};',
                    'function householdHTML(household) {',
                        'var statusClass = statusClasses[household.status] || "unknown";',
                        'var html = \'',
                            '<div class="household \' + statusClass + \'">',
                                '<div class="info">',
                                    '<div class="family">\' + escapeHtml(household.familyName) + \'</div>',
                                        '<div class="address">\' + escapeHtml(household.address1) + \'</div>',
                                        '<div class="address">\' + escapeHtml(household.address2) + \'</div>',
                                        '<div class="address city">\' + escapeHtml(household.city) + \'</div>',
                                        '<div class="phone">\' + escapeHtml(household.phone) + \'</div>',
                                    '</div>',
                                    '<div class="names">\';',
                        'var householdMembers = household.people;',
                        'for(var b = 0, count = householdMembers.length; b < count; b++) {',
                            'var id = householdMembers[b];',
                            'var person = people[id];',
                            'var genderClass = { m: "male", f: "female" }[person.gender] || "uni";',
                            'var childClass = person.position == "other" ? " child" : "";',
                            'var statusClass = statusClasses[person.status] || "unknown";',
                            'html += \'',
                                '<div class="name \' + statusClass + \'">',
                                    '<a href="#CMIS Data" onclick="cmis(\' + id + \');return false" ',
                                    'class="\' + genderClass + childClass + \'">\' + escapeHtml(person.name) + \'</a>\';',
                            'if(person.age) html += \' (<span class="age">\' + escapeHtml(person.age) + \'</span>)\';',
                            'if(person.phone) html += \' (<span class="phone">\' + escapeHtml(person.phone) + \'</span>)\';',
                            'html += \'</div>\';',
                        '}',
                        'html += \'',
                                    '</div>',
                                    '\' + (household.notes ? \'',
                                        '<div class="notes">\' + household.notes + \'</div>',
                                    '\': \'\') + \'',
                                '</div>',
                            '</div>\';',
                        'return html;',
                    '}',
                    //Opens the CMIS information for a person
                    'var scrollBeforeCMIS = 0;',
                    'function cmis(id) {',
                        'scrollBeforeCMIS = document.body.scrollTop;',
                        'var person = people[id];',
                        'var html = ',
                            '"<h2>" + person.fullName + "</h2>',
                            '<table>',
                                '<tr><td>Gender</td><td>" + (person.gender == "m" ? "Male" : "Female") + "</td>',
                                '<tr><td>Age</td><td>" + person.age + "</td>',
                                '<tr><td>Birth Date</td><td>" + person.birthDate + "</td>',
                                '<tr><td>Phone Number</td><td>" + person.phone + "</td>',
                                '<tr><td>Baptized</td><td>" + person.baptised + "</td>',
                                '<tr><td>Confirmed</td><td>" + person.confirmed + "</td>',
                                '<tr><td>Endowed</td><td>" + person.endowed + "</td>',
                                '<tr><td>Recommend Expiry</td><td>" + person.recommend + "</td>',
                                '<tr><td>Priesthood</td><td>" + person.priesthood + "</td>',
                                '<tr><td>Return Missionary</td><td>" + (person.rm ? "Yes" : "No") + "</td>',
                                '<tr><td>Married</td><td>" + (person.married ? "Married" : "Single") + "</td>',
                                '<tr><td>Spouse Member</td><td>" + ({ 2: "Yes", 1: "No" }[person.spouseMember] || "N/A") + "</td>',
                                '<tr><td>Sealed to Spouse</td><td>" + ({ 2: "Yes", 1: "No" }[person.sealedSpouse] || "N/A") + "</td>',
                                '<tr><td>Sealed to Prior Spouse</td><td>" + (person.sealedPrior ? "Yes" : "No") + "</td>',
                            '</table>";',
                        'var div = document.createElement("DIV");',
                        'div.id = "cmis";',
                        'div.innerHTML = html;',
                        'document.getElementById("list").style.display = "none";',
                        'document.body.appendChild(div);',
                        'div.addEventListener("click", closeCmis, false);',
                        'document.body.scrollTop = 0;',
                    '}',
                    'function closeCmis() {',
                        'document.getElementById("list").style.display = "";',
                        'document.body.removeChild(document.getElementById("cmis"));',
                        'document.body.scrollTop = scrollBeforeCMIS;',
                    '}',
                    //Finds a last name beginning with a certain value
                    'function find(text) {',
                        'var households = document.getElementById("list").children;',
                        'for(var a = 0, length = households.length; a < length; a++) {',
                            'var household = households[a];',
                            'var familyName = household.firstChild.firstChild.textContent;',
                            'if(!familyName.indexOf(text)) {',
                                'var searchBar = document.getElementById("search");',
                                'var scroll = household.offsetTop - searchBar.offsetHeight;',
                                'window.scroll(0, scroll);',
                                'break;',
                            '}',
                        '}',
                    '}',
                    //Escapes HTML characters
                    'function escapeHtml(text) {',
                        'return String(text).replace(/[&<>"\'\\/]/g, function(s) {',
                            'return {',
                                '"&": "&amp;",',
                                '"<": "&lt;",',
                                '">": "&gt;",',
                                '\'"\': "&quot;",',
                                '"\'": "&#39;",',
                                '"/": "&#x2F;"',
                            '}[s];',
                        '});',
                    '}',
                '</script>',
                '<style>',
                    'html, body { margin: 0; padding: 0; }',
                    'body { font-family: sans-serif; }',
                    'h1 {',
                        'padding: 0;',
                        'margin: 13px 0 0 0;',
                    '}',
                    '.loading {',
                        'z-index: 4;',
                        'position: fixed;',
                        'top: 0;',
                        'left: 0;',
                        'right: 0;',
                        'bottom: 0;',
                        'background-color: #ccc;',
                        'text-align: center;',
                        'padding-top: 120px;',
                        'font-size: 24px;',
                        'font-weight: bold;',
                    '}',
                    '#search {',
                        'position: fixed;',
                        'top: 0;',
                        'left: 0;',
                        'right: 0;',
                        'background-color: #666;',
                        'z-index: 1;',
                        'font-size: 13px;',
                    '}',
                    '#search a { color: #FFF; }',
                    
                    '#search:hover * { display: inline-block; }',
                    '#lists {',
                        'display: none;',
                    '}',
                    '#lists a {',
                        'margin: 0 8px;',
                        'color: #006;',
                        'font-weight: bold;',
                    '}',
                    
                    '.active { background-color: #cfc; }',
                    '.inactive { background-color: #ffc; }',
                    '.ni { background-color: #fcf; }',
                    '.convert { background-color: #ccf; }',
                    '.dnv { background-color: #fcc; }',
                    '.moved { background-color: #ccc; }',
                    '.unknown { background-color: #fff; }',
                    '.household {',
                        'font-size: 10px;',
                        'width: 100%;',
                        'border-top: 1px solid black;',
                        'overflow: auto;',
                    '}',
                    '.info { width: 40%; float: left; }',
                    '.family { font-weight: bold; }',
                    '.address { padding-left: 1px; }',
                    '.names {',
                        'float: right;',
                        'width: 60%;',
                        'position: relative;',
                    '}',
                    '.name {',
                        'border-left: 1px solid black;',
                        'border-bottom: 1px solid black;',
                    '}',
                    '.name a { text-decoration: none; }',
                    '.male { color: #06F; }',
                    '.female { color: #F0F; }',
                    '.uni { color: #000; }',
                    '.child { margin-left: 8px; }',
                    '.notes {',
                        'margin: 4px;',
                        'font-weight: bold;',
                    '}',
                    '#cmis {',
                        'background-color: #eee;',
                    '}',
                    '#cmis table td {',
                        'font-size: 10px;',
                    '}',
                    '#cmis h2 {',
                        'font-size: 12px;',
                        'padding: 0;',
                        'margin: 0;',
                    '}',
                '</style>',
            '</head>',
            '<body>',
                '<div id="search">'
    ].join('') ];
    for(var a = "A".charCodeAt(0), end = "Z".charCodeAt(0); a <= end; a++) {
        var letter = String.fromCharCode(a);
        html.push('<a href="#" onclick="find(\'' + letter + '\');return false">' + letter + '</a>');
    }
    html.push([
                    '<div id="lists">',
                        '<a href="#All" onclick="openStatus(\'All\');return false">All</a>',
                        '<a href="#Area" onclick="openStatus(\'Area\');return false">Area</a>',
                        '<a href="#Active" onclick="openStatus(\'A\');return false">Active</a>',
                        '<a href="#LA" onclick="openStatus(\'LA\');return false">LA</a>',
                        '<a href="#DNV" onclick="openStatus(\'DNV\');return false">DNV</a>',
                        '<a href="#Moved" onclick="openStatus(\'Moved\');return false">Moved</a>',
                        '<a href="#RC" onclick="openStatus(\'RC\');return false">RC</a>',
                        '<a href="#NI" onclick="openStatus(\'NI\');return false">NI</a>',
                        '<a href="#Unknown" onclick="openStatus(\'Unknown\');return false">Unknown</a>',
                    '</div>',
                '</div>',
                '<h1>' + escapeHtml(settings.title) + '</h1>',
                '<div id="list"></div>',
            '</body>',
        '</html>'
    ].join(""));
    //Open the emulator
    appHTML = html.join("");
    var emulator = document.getElementById("output");
    document.getElementById("save").style.display = "";
    emulator.contentDocument.body.innerHTML = "";
    emulator.contentDocument.write(appHTML);
    emulator.contentWindow.toggleHouseholds();
    return true;
}

var fileContents = null;

var appHTML = '', households = [], people = {};
window.addEventListener("load", function(e) {
    document.getElementById('wl').addEventListener("change", function(e) {
        var reader = new FileReader();
        reader.onload = function(e) {
            households = [];
            removed = [];
            fileContents = CSV.csvToArray(e.target.result);
            if(!fileContents) {
                error("Not a valid CSV ward list file!", 4);
                return;
            }
            success("Complete", 4);
            convert();
            renderHouseholdsList();
        };
        reader.readAsText(e.target.files[0]);
    }, false);
    //Add unit name
    document.getElementById("unitName").addEventListener("change", function(e) {
        settings.title = (this.value.length ? this.value : "Ward") + " List";
        render();
    }, false);
    //Add area suburbs
    document.getElementById("suburbs").addEventListener("change", function(e) {
        var suburbs = this.value.split(",");
        settings.ourSuburbs = [];
        for(var i = 0; i < suburbs.length; i++) {
            var value = suburbs[i].trim();
            if(value.length) settings.ourSuburbs.push(value);
        }
        convert();
        renderHouseholdsList();
    }, false);
    //Save for phone
    document.getElementById('save').addEventListener("click", function(e) {
        saveAs(new Blob([ appHTML ]), settings.title + ".html");
    }, false);
    render();
}, false);

//Make the list of households used to decide if in area or not
function renderHouseholdsList() {
    var list = document.getElementById("householdList");
    list.innerHTML = "";
    for(var i = 0; i < households.length; i++) {
        var household = households[i];
        var container = document.createElement("DIV");
        container.household = household;
        container.className = "row" + (i % 2 ? " band" : "");
        container.addEventListener("click", rowClicked, false);
        var checkbox = document.createElement("INPUT");
        container.checkbox = checkbox;
        checkbox.type = "checkbox";
        checkbox.checked = household.inArea;
        checkbox.id = "household" + i;
        checkbox.household = household;
        checkbox.addEventListener("click", checkboxClicked, false);
        container.appendChild(checkbox);
        var householdCell = document.createElement("TD");
        var householdName = document.createElement("SPAN");
        householdName.className = "listHousehold";
        householdName.textContent = household.familyName;
        container.appendChild(householdName);
        var addressCell = document.createElement("TD");
        var address = document.createElement("SPAN");
        address.className = "listAddress";
        var parts = [];
        if(household.address1) parts.push(household.address1);
        if(household.address2) parts.push(household.address2);
        if(household.city) parts.push(household.city);
        address.textContent = parts.join(", ");
        container.appendChild(address);
        list.appendChild(container);
    }
}
function checkboxClicked(e) {
    e.stopPropagation();
    this.household.inArea = this.checked;
    render();
}
function rowClicked(e) {
    this.checkbox.checked = !this.checkbox.checked;
    this.household.inArea = this.checkbox.checked;
    render();
}

//Updates status messages
function status(message, className, step) {
    var status = document.getElementById("status" + (step || ""));
    status.textContent = message;
    status.className = "success";
}
function success(message, step) { status(message, "success", step); }
function error(message, step) { status(message, "error", step); }

function escapeHtml(text) {
    return String(text).replace(/[&<>"'\/]/g, function(character) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
            "/": "&#x2F;"
        }[character];
    });
}