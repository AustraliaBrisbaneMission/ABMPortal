// Author: Elder Jack Field

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
function checkboxClicked(e) {
    this.missionary.standards[this.id] = this.checked;
}

/***
 * SUMMARY:
 *  Renders the list of missionaries by zones & areas into little boxes.
 * NOTES:
 * TODOS:
 ***/

var missionaries = [], checkboxes = [];
function render(data) {
    var resultBox = document.getElementById('result_box');
    resultBox.innerHTML = "";
    $.eachSorted(data.zones, function(zone, zoneName) {
        var title = $.create("H3", zoneName);
        resultBox.appendChild(title);
        var zoneDiv = document.createElement('DIV');
        zoneDiv.className = "rZone";
        click(title, zoneDiv);
        resultBox.appendChild(zoneDiv);
        $.eachSorted(zone, function(district, districtName) {
            $.eachSorted(district, function(area, areaName) {
                var title = $.create("H3", areaName);
                zoneDiv.appendChild(title);
                var areaDiv = document.createElement('DIV');
                areaDiv.className = "rArea";
                click(title, areaDiv);
                zoneDiv.appendChild(areaDiv);
                $.each(area, function(missionary) {
                    missionaries.push(missionary);
                    var title = $.create("H3", missionary.name);
                    areaDiv.appendChild(title);
                    var missionaryDiv = document.createElement('DIV');
                    missionaryDiv.className = "rMissionary";
                    areaDiv.appendChild(missionaryDiv);
                    // Can't be bothered writing the same thing for Elders and Sisters.
                    var standardList = data.standards["elder"];
                    //var standardList = data.standards[missionary.elder ? "elder" : "sister"];
                    
                    $.each(standardList, function(standards, category) {
                        // Create a table for each category per missionary
                        $.create("H3", { parent: missionaryDiv }, category);
                        var table = $.create("TABLE", { className: "missionary", width: "70%" }, $.create("TR", [
                            $.create("TH", { width: "80%" }, "Standard"),
                            $.create("TH", { width: "20%" }, "Completed")
                        ]));
                        var parserHeading = null;
                        
                        $.each(standards, function(id, standard) {
                            var checkbox = $.create("INPUT", {
                                type: "checkbox",
                                checked: !!missionary.standards[id]
                            });
                            checkbox.id = id;
                            checkbox.missionary = missionary;
                            checkbox.on("click", checkboxClicked);
                            checkboxes.push(checkbox);
                            // Insert heading for each section of the standards.
                            var parsedStandard = standard;
                            var heading = standard.split(':')[0];
                            if(standard.indexOf(':') !== -1){
                                parsedStandard = standard.split(':')[1].trim();
                                if( heading != parserHeading ){
                                    parserHeading = heading;
                                    $.create("TR", { parent: table }, [
                                            $.create("TD", [
                                                $.create("H3", heading)
                                            ])
                                        ]);
                                }
                            }
                            $.create("TR", { parent: table }, [
                                $.create("TD", parsedStandard),
                                $.create("TD", checkbox)
                            ]);
                        });
                        missionaryDiv.appendChild(table);
                        
                        // Add photo here
                        var photoLink = '/stylesheets/images/standards/' + category + '.PNG';
                        $.create('IMG', { parent: missionaryDiv, src: photoLink });
                    });
                });
            });
        });
    });
    $("#standards").on("submit", function(e) { e.preventDefault(); submit(); });
}


/***
 * SUMMARY:
 *  Loads the standards of excellence for the admin.
 * NOTES:
 * TODOS:
 ***/
 
var deletedStandards = [];
function loadAdmin(data) {
    var element = $("#adminCategories");
    if(!element) return;
    function newStandard(parent, id, name) {
        var container = $.create("DIV", { parent: parent });
        var input = $.create("INPUT", {
            parent: container,
            type: "text",
            value: id ? name : "",
            placeholder: "Type standard name here..."
        });
        var removeLink = $.create("A", {
            parent: container,
            href: "#Remove"
        }, "REMOVE");
        removeLink._id = id;
        removeLink.container = container;
        removeLink.on("click", removeStandard);
        container._id = id;
        container.standard = input;
    }
    function addStandard(e) {
        e.preventDefault();
        this.remove();
        newStandard(this.container);
        this.container.append(this);
    }
    function newCategory(parent, name, standards) {
        //Input
        var container = $.create("DIV", { parent: parent });
        $.create("INPUT", {
            parent: container,
            type: "text",
            value: standards ? name : "",
            placeholder: "Type category name here...",
            className: "headingInput"
        });
        //Remove Link
        var removeLink = $.create("A", {
            parent: container,
            href: "#Remove"
        }, "REMOVE");
        removeLink.container = container;
        removeLink.on("click", removeCategory);
        //Standards DIV
        var standardDiv = removeLink.standards = $.create("DIV", {
            parent: parent,
            className: "blueLayer"
        });
        if(standards) {
            $.each(standards, function(id, standard) {
                newStandard(standardDiv, id, standard);
            });
        }
        var addLink = $.create("A", {
            parent: standardDiv,
            href: "#Add Standard"
        }, "Add new standard...");
        addLink.container = standardDiv;
        addLink.on("click", addStandard);
        return standardDiv;
    }
    function addCategory(e) {
        e.preventDefault();
        this.remove();
        newCategory(this.container);
        this.container.append(this);
    }
    function removeStandard(e) {
        e.preventDefault();
        this.container.remove();
        if(this._id) deletedStandards.push(this._id);
    }
    function removeCategory(e) {
        e.preventDefault();
        $.each(this.standards.children, function(container) {
            if(container._id) deletedStandards.push(container._id);
        });
        this.standards.remove();
        this.container.remove();
    }
    
    $.each(data.standards, function(categories, type) {
        var elder = type == "elder";
        $.create("H2", { parent: element }, elder ? "Elders" : "Sisters");
        var categoryDiv = $.create("DIV", {
            parent: element,
            className: "standardCategory"
        });
        categoryDiv.elder = elder;
        $.each(categories, function(standards, category) {
            newCategory(categoryDiv, category, standards);
        });
        var addLink = $.create("A", {
            parent: categoryDiv,
            href: "#Add Category"
        }, "Add new category...");
        addLink.elder = elder;
        addLink.container = categoryDiv;
        addLink.on("click", addCategory);
    });
    $("#adminForm").on("submit", function(e) { e.preventDefault(); submitAdmin(); });
}

function submitAdmin() {
    var modified = {}, inserted = [];
    $.each($("#adminCategories").children, function(child) {
        var elder = child.elder;
        if(elder === undefined) return;
        var children = child.children;
        for(var a = 0, categories = children.length - 1; a < categories; a++) {
            var categoryDiv = children[a];
            var category = categoryDiv.firstChild.value;
            var standards = children[++a].children;
            for(var b = 0, length = standards.length - 1; b < length; b++) {
                var container = standards[b];
                var standard = container.firstChild.value.trim();
                if(!standard.length) continue;
                var record = {
                    elder: elder,
                    category: category,
                    name: standard,
                };
                if(container._id) modified[container._id] = record;
                else inserted.push(record);
            }
        }
    });
    var data = {
        deleted: deletedStandards,
        modified: modified,
        inserted: inserted
    };
    $.post("/standards/admin", data, adminSaved);
}
function adminSaved() {
    alert("Saved!");
}

/***
 * SUMMARY:
 *  Loads everything as soon as the window is ready.
 * NOTES:
 * TODOS:
 ***/
window.on("load", function() {
    $.get("/standards/get", function(response) {
        render(response);
        $("#submitButton").style.display = "";
        loadAdmin(response);
    });
});

function submit() {
    $.post("/standards/save", missionaries, function(response) {
        $.each(checkboxes, function(checkbox) { checkbox.disabled = true; });
        $("#submitButton").style.display = "none";
        $("#message").text("Successfully updated!");
    });
}