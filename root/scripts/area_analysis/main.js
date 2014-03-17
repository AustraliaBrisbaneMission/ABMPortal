var areaBoundaries = [], areaPoly;
var iconBase = '/stylesheets/icons/';
var icons = {
    circle: {
        url: iconBase + "circle.png",
        size: [ 16, 16 ]
    },
    chapel: {
        url: iconBase + "chapel.png",
        size: [ 34, 41 ]
    },
    chapelHighlight: {
        url: iconBase + "chapel_highlight.png",
        size: [ 42, 51 ]
    },
    elderFlat: {
        url: iconBase + "elder_flat.png",
        size: [ 34, 41 ]
    },
    elderFlatHighlight: {
        url: iconBase + "elder_flat_highlight.png",
        size: [ 34, 41 ]
    },
    sisterFlat: {
        url: iconBase + "sister_flat.png",
        size: [ 34, 41 ]
    },
    sisterFlatHighlight: {
        url: iconBase + "sister_flat_highlight.png",
        size: [ 34, 41 ]
    },
    seniorFlat: {
        url: iconBase + "senior_flat.png",
        size: [ 34, 41 ]
    },
    seniorFlatHighlight: {
        url: iconBase + "senior_flat_highlight.png",
        size: [ 34, 41 ]
    },
    homeFlat: {
        url: iconBase + "home_flat.png",
        size: [ 34, 41 ]
    },
    homeFlatHighlight: {
        url: iconBase + "home_flat_highlight.png",
        size: [ 34, 41 ]
    },
    officeFlat: {
        url: iconBase + "office_flat.png",
        size: [ 34, 41 ]
    },
    officeFlatHighlight: {
        url: iconBase + "office_flat_highlight.png",
        size: [ 34, 41 ]
    },
    unknownFlat: {
        url: iconBase + "unknown_flat.png",
        size: [ 34, 41 ]
    },
    unknownFlatHighlight: {
        url: iconBase + "unknown_flat_highlight.png",
        size: [ 34, 41 ]
    }
};
var map;
var cluster;
var areaSettings = {
    fillColor: '#FF6666',
    fillOpacity: 0.1
};
zip.workerScriptsPath = "/scripts/";

//Forms
var Chapels, Flats, Areas, Units, Directions, AreaSplits, Missionaries, AddressSearch;

//Function to easily make linked lists in forms
function openListLink(e) {
    e.preventDefault();
    this.form.open(this.item);
}
function listifyLinks(form, items) {
    if(!items) return "";
    var links = [];
    for(var i = 0; i < items.length; i++) {
        var item = items[i];
        var link = $.create("A", { href: "#" + item }, item);
        link.form = form;
        link.item = item;
        link.on("click", openListLink);
        links.push($.create("DIV", link));
    }
    return $.create("DIV", links);
}
function renderLinks(formName) {
    return function(items) {
        if(!items) return;
        if(items instanceof Array) {
            var newItems = [];
            for(var i = 0; i < items.length; i++) {
                var item = items[i];
                newItems[i] = (typeof item == "string") ? item : item.name;
            }
            items = newItems;
        }
        else if(typeof items == "string") items = [ items ];
        else items = [ items.name ];
        return listifyLinks(window[formName], items);
    };
}

function getChapelPath(show, callback) {
    var distance = 0;
    for(var a = 0; a < Chapels.items; a++) {
        var chapel = Chapels.items[a];
        if(chapel.name == document.getElementById('area_ward').value) {
            for(var b = 0; b < Flats.items.length; b++) {
                var flat = Flats.items[b];
                if(flat.name == document.getElementById('area_flat').value) {
                    map.getDirections({
                        origin: flat.address,
                        destination: chapel.address,
                        callback: function(result) {
                            var path = result[0].path;
                            Areas.chapelPathPoly = new map.Polyline({
                                show: show,
                                path: path
                            });
                            for(var c = 1; c < path.length; c++) {
                                distance += getDistance(path[c - 1], path[c]);
                            }
                            Areas.currentItem.chapelPath = path;
                            Areas.currentItem.chapelDistance = distance;
                            if(callback) callback();
                        }
                    });
                    break;
                }
            }
            break;
        }
    }
}
function removeAreaPoly() {
    for(var i = 0; i < areaBoundaries.length; i++) areaBoundaries[i].hide();
    areaBoundaries = [];
    areaPoly.hide();
}

/*
//Inefficient
function snap(position) {
    //Get every VISIBLE point to snap to
    var points = [], closest = { point: null };
    $.each(Areas.items, function(key, area) {
        if(key != Areas.currentItem) points = points.concat(area.points);
    });
    var overlay = new google.maps.OverlayView(), distance, x, y, pointB;
    overlay.draw = function() {};
    overlay.setMap(map);
    var pointA = overlay.getProjection().fromLatLngToDivPixel(position);
    $.each(points, function(key, point) {
        pointB = overlay.getProjection().fromLatLngToDivPixel(point);
        x = pointB.x - pointA.x;
        y = pointB.y - pointA.y;
        distance = Math.sqrt(x * x + y * y);
        if(!closest.distance || distance < closest.distance) {
            closest = { point: point, distance: distance };
        }
    });
    return closest.distance < 20 ? closest.point : null;
}
function enableSnapping(marker) {
    google.maps.event.addDomListener(marker, 'dragend', function(e) {
        var position = snap(e.latLng);
        if(position) marker.setPosition(position);
    });
    google.maps.event.addDomListener(marker, 'drag', function(e) {
        var position = snap(e.latLng);
        if(position) marker.setPosition(position);
    });
}
*/

/*
//Snappers cannot reliably get mouseover event while dragging the marker
var snappers = [], dragging = null, snappedTo = null;
function enableSnapping(marker) {
    google.maps.event.addDomListener(marker, 'dragstart', dragStart);
    google.maps.event.addDomListener(marker, 'drag', drag);
    google.maps.event.addDomListener(marker, 'dragend', dragEnd);
}
function dragStart(e) {
    var snapper;
    $.each(Areas.items, function(key, area) {
        if(key != Areas.currentItem) {
            $.each(area.points, function(key, point) {
                snapper = new google.maps.Marker({
                    position: point,
                    map: map,
                    zIndex: 1,
                    icon: iconBase + 'circle.png'
                });
                google.maps.event.addDomListener(snapper, 'mouseover', snapperOver);
                google.maps.event.addDomListener(snapper, 'mouseout', snapperOut);
                
                snappers.push(snapper);
            });
        }
    });
    dragging = this;
}
function drag(e) {
    if(snappedTo) dragging.setPosition(snappedTo.getPosition());
}
function dragEnd(e) {
    drag(e);
    $.each(snappers, function(key, snapper) { snapper.setMap(null); });
    snappers = [];
    dragging = snappedTo = null;
}
function snapperOver(e) { snappedTo = this; drag(e); }
function snapperOut(e) { snappedTo = null; }
*/

function openInfoWindow(item, type, form) {
    if(PointPicker.picking) return;
    //Open info window
    map.info.content.innerHTML = "";
    var name = document.createElement('H3');
    name.textContent = item.name + " " + type;
    var link = document.createElement('A');
    link.className = "titleLink";
    link.href = "#Open " + item.name;
    link.addEventListener("click", function(e) {
		e.preventDefault();
		form.open(item);
    }, false);
    link.appendChild(name);
    map.info.content.appendChild(link);
    var address = document.createElement('DIV');
    address.textContent = item.address;
    map.info.content.appendChild(address);
    var directionsContainer = document.createElement('DIV');
    var a = document.createElement('A');
    a.textContent = "Get Directions";
    a.href = "#";
    a.addEventListener("click", function(e) {
        e.preventDefault();
        //window.open('http://maps.google.com/maps?saddr=&daddr=' + encodeURIComponent(flat.address), '_blank');
        Directions.open(0);
        Directions.points[0].value = item.address;
        Directions.addPoint();
        Directions.points[1].focus();
    }, false);
    directionsContainer.appendChild(a);
    map.info.content.appendChild(directionsContainer);
    map.info.open(item.marker);
}

var snapPoints = [], dragging, snapOverlay = null;
function snap(position) {
    //Get every VISIBLE point to snap to
    var closest = {}, distance, x, y;
    var markerPos = snapOverlay.getProjection().fromLatLngToDivPixel(position);
    $.each(snapPoints, function(point) {
        x = point.x - markerPos.x;
        y = point.y - markerPos.y;
        distance = Math.sqrt(x * x + y * y);
        if(!closest.distance || distance < closest.distance) {
            closest = {
                position: point.snapper.getPosition(),
                area: point.area,
                index: point.index,
                distance: distance
            };
        }
    });
    return closest.distance < 20 ? closest : null;
}
function enableSnapping(marker) {
    marker.on('dragstart', dragStart);
    marker.on('drag', drag);
    marker.on('dragend', dragEnd);
}
function dragStart(e) {
    var snapper, pos;
    $.each(Areas.items, function(area) {
        if(area != Areas.currentItem) {
            $.each(area.points, function(point, index) {
                pos = snapOverlay.getProjection().fromLatLngToDivPixel(point);
                snapper = new google.maps.Marker({
                    position: point,
                    map: map,
                    icon: icons.circle
                });
                snapPoints.push({
                    x: pos.x,
                    y: pos.y,
                    snapper: snapper,
                    area: area,
                    index: index
                });
            });
        }
    });
    dragging = this;
    drag(e);
}
function drag(e) {
    var position = snap(dragging.getPosition());
    if(position) dragging.setOptions({ position: position.position });
}
function dragEnd(e) {
    drag(e);
    $.each(snapPoints, function(point) { point.snapper.hide(); });
    snapPoints = [];
}

var mapContainer = null;
function initialise() {
    mapContainer = document.getElementById('map');
    map = new Map(mapContainer);
    areaPoly = new map.Polygon({
        paths: [],
        strokeColor: '#6666FF',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#6666FF',
        fillOpacity: 0.15,
        clickable: false
    });
    
    AddressSearch = new Form({
        name: "Search for Address...",
        noDisplay: true,
        onOpen: function() {
            if(AddressSearch.marker) AddressSearch.marker.hide();
            AddressSearch.resetColor();
            var address = document.getElementById("search").value;
            map.geocode(address + ", QLD", function(result) {
                AddressSearch.marker = new map.Marker({
                    show: true,
                    position: result.position,
                    pan: true
                });
                map.zoom(13);
                Form.currentForm.innerHTML = "";
                var div = document.createElement("DIV");
                AddressSearch.area = null;
                var areas = Areas.items;
                for(var i = 0, length = areas.length; i < length; i++) {
                    var poly = areas[i].poly;
                    if(poly && poly.pointIsInside(result.position)) {
                        AddressSearch.area = areas[i];
                        poly.setOptions({
                            fillColor: "#66f",
                            strokeColor: "#66f"
                        });
                        break;
                    }
                }
                if(!AddressSearch.area) div.textContent = "Area: [NONE]";
                else {
                    div.textContent = "Area: ";
                    var a = document.createElement("A");
                    a.href = "#Open Area";
                    a.textContent = AddressSearch.area.name;
                    a.addEventListener("click", function(e) {
                        e.preventDefault();
                        Areas.open(AddressSearch.area);
                    }, false);
                    div.appendChild(a);
                }
                Form.currentForm.appendChild(div);
                div = document.createElement("DIV");
                div.textContent = "Searched for '" + address + "'.";
                Form.currentForm.appendChild(div);
                div = document.createElement("DIV");
                div.textContent = "Found '" + result.address + "'...";
                Form.currentForm.appendChild(div);
            }, function() {
                Form.currentForm.textContent = "No results found for '" +
                    address + "'!";
            });
            Form.currentForm.textContent = "Searching for '" + address + "'...";
        },
        onClose: function() {
            AddressSearch.marker.hide();
            AddressSearch.resetColor();
        },
        variables: {
            marker: null,
            area: null,
            resetColor: function() {
                if(AddressSearch.area && AddressSearch.area.poly) {
                    AddressSearch.area.poly.setOptions({
                        fillColor: areaSettings.fillColor,
                        strokeColor: areaSettings.fillColor
                    });
                }
            }
        }
    });
    
    Directions = new Form({
        name: "Directions",
        noDb: true,
        onAllClose: map.hideDirections,
        onOpen: function() {
            Directions.points = [];
            var directionsForm = document.createElement('FORM');
            Directions.picker = new PointPicker(Directions.points, "address", null, true);
            Directions.directionsForm = directionsForm;
            directionsForm.id = "directionsForm";
            var directionsContainer = document.createElement('DIV');
            Directions.directionsContainer = directionsContainer;
            directionsContainer.id = "directionsForm";
            directionsForm.appendChild(directionsContainer);
            Directions.addPoint();
            var directionsSubmit = document.createElement('INPUT');
            directionsSubmit.id = "directionsSubmit";
            directionsSubmit.type = "submit";
            directionsSubmit.value = "GO";
            directionsForm.appendChild(directionsSubmit);
            directionsForm.submit = function(e) {
                if(e) e.preventDefault();
                var points = [];
                for(var i = 0, length = Directions.points.length; i < length; i++) {
                    var value = Directions.points[i].value;
                    if(!value.length) continue;
                    points.push(value);
                }
                var origin = points[0];
                var destination = points[points.length - 1];
                var waypoints = [];
                for(var i = 1; i < points.length - 1; i++) {
                    waypoints.push({ location: points[i] });
                }
                map.getDirections({
                    origin: points[0],
                    waypoints: waypoints,
                    destination: destination,
                    show: true,
                    element: Form.currentForm,
                    pan: true
                });
            };
            directionsForm.addEventListener('submit', directionsForm.submit, false);
            Form.currentForm.innerHTML = '';
            Form.currentForm.appendChild(directionsForm);
            Directions.points[0].focus();
        },
        onInitialise: function(items) {
            return [{ name: "Get Directions..." }];
        },
        mapElements: [{
            show: function() { map.showDirections(Form.currentForm); },
            hide: map.hideDirections
        }],
        variables: {
            points: [],
            checkPoints: function() {
                var points = Directions.points;
                var waypoints = [];
                for(var i = 0; i < points.length; i++) {
                    var point = Directions.points[i];
                    if(!point.value.length && i < points.length - 1) {
                        Directions.points.splice(i--, 1);
                        point.parentNode.removeChild(point);
                        continue;
                    }
                    var letter = String.fromCharCode(65 + i);
                    point.id = "directions" + letter;
                    point.placeholder = "Point " + letter;
                    if(point.value.length) waypoints.push({ location: point.value });
                }
                if(points[points.length - 1].value.length && points.length < 10) {
                    Directions.addPoint();
                }
                if(waypoints.length < 2) return;
                var origin = waypoints[0].location;
                waypoints.splice(0, 1);
                var destination = waypoints[waypoints.length - 1].location;
                waypoints.splice(waypoints.length - 1, 1);
                map.getDirections({
                    origin: origin,
                    waypoints: waypoints,
                    destination: destination,
                    show: true
                });
            },
            addPoint: function() {
                var point = document.createElement('INPUT');
                var letter = String.fromCharCode(65 + Directions.points.length);
                point.id = "directions" + letter;
                point.className = "directionsAddress";
                point.type = "text";
                point.placeholder = "Point " + letter;
                point.index = Directions.points.length;
                point.addEventListener('change', Directions.checkPoints, false);
                Directions.directionsContainer.appendChild(point);
                Directions.points.push(point);
                Directions.picker.addEvents(point);
            },
            directionsContainer: null,
            directionsForm: null,
            picker: null
        }
    });
    
    Units = new Form({
        name: "units",
        displayName: "Units",
        fields: {
            name: {
                displayName: "Name",
                render: function(name) { return name + (Units.currentItem.branch ? " Branch" : " Ward"); }
            },
            chapel: {
                displayName: "Chapel",
                render: function(chapel) { return listifyLinks(Chapels, [ chapel.name ]); }
            },
            phone: { displayName: "Phone Number" },
            boundaries: { noDisplay: true }
        },
        onOpen: function() {
            Units.currentItem.poly.pan();
        },
        onInitialise: function(items) {
            var defaultColours = [
                '#F99',
                '#9F9',
                '#99F',
                '#FF9',
                '#F9F',
                '#9FF',
                '#F33',
                '#3F3',
                '#33F',
                '#FF3',
                '#F3F',
                '#3FF',
                '#F00',
                '#0F0',
                '#00F',
                '#FF0',
                '#F0F',
                '#0FF'
            ];
            var colourCount = 0;
            var stakeColours = {
                "Brisbane": "#F99",
                "Cleveland": "#9F9",
                "Brisbane North": "#FF9",
                "Ipswich": "#99F",
                "Centenary": "#FF9",
                "Logan": "#9F9",
                "Eight Mile Plains": "#F9F",
                "Coomera": "#F99",
                "Gold Coast": "#FF9",
                "Australia Brisbane Mission": "#FF9",
                "Sunshine Coast": "#9F9",
                "Rockhampton": "#F99",
                "Townsville": "#99F",
                "Cairns": "#99F"
            };
            for(var i = 0; i < items.length; i++) {
                var ward = items[i];
                
                //Make sure it is openable
                function check(field, defaultValue) {
                    if(ward[field] === undefined) {
                        ward[field] = defaultValue;
                        console.log("Field undefined: " + field + " in " + ward.name);
                    }
                }
                check("name", "");
                check("chapel", "");
                check("boundaries", []);
                
                //Create ward boundary polygon
                var colour;
                if(User.auth < Auth.ADMIN) colour = defaultColours[colourCount++];
                else {
                    if(!stakeColours[ward.stake]) stakeColours[ward.stake] = defaultColours[colourCount++];
                    colour = stakeColours[ward.stake];
                }
                ward.poly = new map.Polygon({
                    show: Units.visible,
                    paths: ward.boundaries,
                    strokeColor: "#333",
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    fillColor: colour,
                    fillOpacity: 0.1,
                    zIndex: 1,
                    clickable: false
                });
                Units.mapElements.push(ward.poly);
                /*
                ward.label = new map.Label({
                    show: UnitLabels.visible, //Showing labels adds lag
                    title: ward.name,
                    size: 12,
                    position: calculateCentroid(ward.boundaries)
                });
                UnitLabels.mapElements.push(ward.label);
                */
            }
            Areas.findUnits();
            Units.findChapels();
        },
        variables: {
            boundaries: [],
            markers: [],
            poly: null,
            findChapels: function() {
                var chapels = Chapels.items, units = Units.items;
                if(!chapels.length || !units.length) return;
                for(var a = 0, length = units.length; a < length; a++) {
                    var unit = units[a];
                    unit.chapel = getItemBy(chapels, "name", unit.chapel);
                }
            },
            uploaded: function(files) {
                var unitsDone = {};
                var units = [];
                for(var a = 0; a < files.length; a++) {
                    var kml = X2J.parseXml(files[a])[0].kml[0].Document[0].Folder[0];
                    if(kml.name[0].jValue != "Ward_Boundaries") continue;
                    for(var b = 0; b < kml.Placemark.length; b++) {
                        var ward = kml.Placemark[b];
                        var name = ward.name[0].jValue;
                        var branch = false;
                        if(name.substr(-5) == " Ward") {
                            name = name.substr(0, name.length - 5);
                        }
                       else if(name.substr(-7) == " Branch") {
                            name = name.substr(0, name.length - 7);
                            branch = true;
                        }
                        else console.log("Unknown Ward: " + name);
                        if(unitsDone[name]) continue;
                        unitsDone[name] = true;
                        var stake = "", unitId = "";
                        var info = ward.ExtendedData[0].SchemaData[0].SimpleData;
                        for(var c = 0; c < info.length; c++) {
                            var data = info[c];
                            if(data.jAttr.name == "Unit_Number") unitId = data.jValue;
                            else if(data.jAttr.name == "Parent_Organization") {
                                stake = data.jValue;
                            }
                        }
                        var boundaries = [];
                        var coordinates = ward.MultiGeometry[0];
                        if(!coordinates.Polygon) coordinates = coordinates.MultiGeometry[0];
                        coordinates = coordinates.Polygon[0].outerBoundaryIs[0].LinearRing[0].coordinates[0].jValue;
                        coordinates = coordinates.split(' ');
                        for(var c = 0, length = coordinates.length; c < length; c++) {
                            var point = coordinates[c].split(',');
                            if(point[0] && point[1]) {
                                boundaries.push([
                                    parseFloat(point[1]),
                                    parseFloat(point[0])
                                ]);
                            }
                        }
                        units.push({
                            name: name,
                            branch: branch,
                            chapel: null,
                            phone: null,
                            stake: stake,
                            unitId: unitId,
                            boundaries: boundaries
                        });
                    }
                }
                //Upload in chunks to avoid size limit
                var status = document.getElementById("unitsStatus");
                var index = -1;
                function nextUnit() {
                    if(++index >= units.length) {
                        status.textContent = units.length + " units successfully uploaded!";
                        $.get("/force_chapel_update");
                        document.getElementById("unitsInput").disabled = false;
                        return;
                    }
                    status.textContent = "Uploading unit " + (index + 1) + " of " + units.length + "...";
                    var unit = units[index];
                    var data = { action: "insert", collection: "units", data: unit };
                    $.post("/maps/db", data, nextUnit);
                }
                var data = { action: "removeall", collection: "units" };
                $.post("/maps/db", data, nextUnit);
            }
        }
    });
    
    Flats = new Form({
        name: "flat",
        displayName: "Flats",
        fields: {
            name: { displayName: "Name" },
            address: { displayName: "Address" },
            areas: {
                displayName: "Areas",
                render: renderLinks("Areas")
            },
            id: { displayName: "IMOS Housing ID" },
            position: {
                noDisplay: true,
                getValueToSave: function() {
                    var address = document.getElementById('flat_address').value;
                    map.geocode(address, function(results) {
                        Flats.setValueToSave("position", results.position);
                    });
                }
            }
        },
        //labels: true,
        onOpen: function(itemIndex) {
            if(!Flats.currentItem.marker) return;
            Flats.highlight(Flats.currentItem, true);
            map.pan(Flats.currentItem.marker.getPosition());
        },
        onClose: function() {
            if(Flats.currentItem && Flats.currentItem.marker) {
                Flats.highlight(Flats.currentItem, false);
            }
        },
        onInitialise: function(items) {
            Areas.findFlats();
            return items;
        },
        onItemInitialise: function(flat) {
            function createMarker(result) {
                var name = flat.name.toLowerCase();
                if(name.indexOf("office") >= 0) {
                    flat.icon = icons.officeFlat;
                    flat.iconHighlight = icons.officeFlatHighlight;
                }
                else if(name.indexOf("home") >= 0) {
                    flat.icon = icons.homeFlat;
                    flat.iconHighlight = icons.homeFlatHighlight;
                }
                else {
                    flat.icon = icons.unknownFlat;
                    flat.iconHighlight = icons.unknownFlatHighlight;
                }
                flat.marker = new map.Marker({
                    show: true,
                    position: result ? result.position : flat.position,
                    icon: flat.icon
                    //label: flat.name + " Flat"
                });
                Flats.mapElements.push(flat.marker);
                PointPicker.addClick(flat.marker, flat.address);
                flat.marker.on('click', function(e) {
                    openInfoWindow(flat, "Flat", Flats);
                });
                if(result) {
                    flat.position = result.position;
                    $.post("/maps/db", {
                        action: "update",
                        collection: "flat",
                        id: flat._id,
                        data: { position: flat.position }
                    });
                    console.log(flat.name + " flat geocoded!");
                }
            }
            if(flat.position) createMarker();
            else {
                console.log("No position for " + flat.name + " flat. Geocoding...");
                map.geocode(flat.address, createMarker);
            }
            return flat;
        },
        variables: {
            highlight: function(flat, highlighted) {
                var icon = highlighted ? flat.iconHighlight : flat.icon;
                if(flat.marker) flat.marker.setOptions({ icon: icon });
            },
            uploaded: function(data) {
                function getCell(cellName) {
                    var cells = {
                        NAME: 0,
                        ID: 1,
                        ADDRESS: 2,
                        CITY: 3,
                        AREAS: 4,
                        TYPE: 5,
                        STATUS: 6
                    };
                    var data = line[cells[cellName]];
                    if(cellName == "AREAS" && data) {
                        var areas = data.split(",");
                        for(var i = 0; i < areas.length; i++) areas[i] = areas[i].trim();
                        return areas;
                    }
                    return data ? data.trim() : data;
                }
                function getRecord() {
                    return {
                        name: getCell("NAME"),
                        address: getCell("ADDRESS") + ", " + getCell("CITY"),
                        position: null,
                        id: getCell("ID"),
                        areas: getCell("AREAS")
                    };
                }
                var line;
                var dbData = [];
                var previousLineData = {};
                var dataLength = data.length;
                if(dataLength) {
                    line = data[0];
                    previousLineData = getRecord();
                    for(var i = 1; i < dataLength; i++) {
                        line = data[i];
                        if(getCell("ID")) {
                            dbData.push(previousLineData);
                            previousLineData = getRecord();
                        }
                        else if(getCell("AREAS")) {
                            previousLineData.areas = previousLineData.areas.concat(getCell("AREAS"));
                        }
                    }
                    dbData.push(previousLineData);
                }
                $.post("/maps/db", { action: "removeall", collection: "flat" }, function() {
                    var data = {
                        action: "insert",
                        collection: "flat",
                        data: dbData
                    };
                    $.post("/maps/db", data, function(result) {
                        Flats.items = [];
                        Flats.initialise();
                        document.getElementById("flatsStatus").textContent = "Flats uploaded successfully!";
                        input.disabled = false;
                    });
                });
            }
        }
    });
    
    Chapels = new Form({
        name: "chapel",
        displayName: "Chapels",
        fields: {
            name: { displayName: "Name" },
            address: { displayName: "Address" },
            units: {
                displayName: "Units",
                render: function(units) { return listifyLinks(Units, units); }
            },
            position: { noDisplay: true }
        },
        onOpen: function(itemIndex) {
            Chapels.currentItem.marker.setOptions({ icon: icons.chapelHighlight });
            map.pan(Chapels.currentItem.marker.getPosition());
        },
        onClose: function() {
            if(Chapels.currentItem) {
                Chapels.currentItem.marker.setOptions({ icon: icons.chapel });
            }
            Chapels.marker.show(false);
        },
        variables: {
            marker: new map.Marker({ icon: icons.chapelHighlight })
        },
        onItemInitialise: function(chapel) {
            function createMarker(result) {
                chapel.marker = new map.Marker({
                    show: true,
                    position: result ? result.position : chapel.position,
                    icon: icons.chapel
                });
                Chapels.mapElements.push(chapel.marker);
                PointPicker.addClick(chapel.marker, chapel.address);
                chapel.marker.on('click', function(e) {
                    openInfoWindow(chapel, "Chapel", Chapels);
                });
                if(result) {
                    chapel.position = result.position;
                    $.post("/maps/db", {
                        action: "update",
                        collection: "chapel",
                        id: chapel._id,
                        data: { position: chapel.position }
                    });
                    console.log(chapel.name + " chapel geocoded!");
                }
            }
            if(chapel.position) createMarker();
            else {
                console.log("No position for " + chapel.name + " chapel. Geocoding...");
                map.geocode(chapel.address, createMarker);
            }
            return chapel;
        },
        onInitialise: Units.findChapels
    });
    
    Areas = new Form({
        name: "area",
        displayName: "Areas",
        fields: {
            changeBoundaries: {
                noDisplay: User.auth < Auth.ADMIN,
                displayName: "Change Area Boundaries",
                render: function() {
                    var a = document.createElement("A");
                    a.href = "#Change Area Boundaires";
                    a.textContent = "Click to add boundaries...";
                    a.addEventListener("click", Areas.changeBoundaries, false);
                    return a;
                }
            },
            name: { displayName: "Name" },
            district: { displayName: "District" },
            zone: { displayName: "Zone" },
            unit: {
                displayName: "Unit",
                render: function(unit) { return unit ? unit.name : "(Unknown)"; }
            },
            missionaries: {
                displayName: "Missionaries",
                render: renderLinks("Missionaries")
            },
            flat: {
                displayName: "Flat",
                render: renderLinks("Flats")
            },
            chapel: {
                displayName: "Chapel",
                render: function() {
                    var unit = Areas.currentItem.unit;
                    if(!unit) return;
                    return listifyLinks(Chapels, [ unit.chapel.name ]);
                }
            },
            boundaries: { noDisplay: true },
            size: {
                displayName: "Size",
                render: function(size) {
                    return parseFloat(size).toFixed(1) + "km2";
                }
            },
            centroid: { noDisplay: true },
            centroidDistance: {
                displayName: "Distance from Center",
                render: function(distance) {
                    return parseFloat(distance).toFixed(2) + "km";
                }
            },
            chapelPath: { noDisplay: true },
            chapelDistance: {
                displayName: "Distance from Chapel",
                render: function(distance) {
                    return parseFloat(distance).toFixed(2) + "km";
                }
            }
        },
        onOpen: function(itemIndex) {
            if(!Areas.currentItem) return;
            if(Areas.currentItem.chapelPath.length) {
                Areas.chapelPathPoly.setPath(Areas.currentItem.chapelPath);
                Areas.chapelPathPoly.show();
            }
            if(Areas.currentItem.poly) {
                Areas.currentItem.poly.setOptions({
                    strokeColor: '#6666FF',
                    fillColor: '#6666FF',
                    fillOpacity: 0.15,
                    zIndex: 1
                });
                Areas.currentItem.poly.pan();
            }
            //Highlight the area's flat and chapel
            if(Areas.currentItem.flat && Areas.currentItem.flat.marker) {
                Flats.highlight(Areas.currentItem.flat, true);
            }
            Areas.currentItem.unit.chapel.marker.setOptions({ icon: icons.chapelHighlight });
        },
        onClose: function() {
            if(Areas.currentItem) {
                if(Areas.currentItem.poly) {
                    Areas.currentItem.poly.setOptions({
                        strokeColor: '#FF6666',
                        fillColor: areaSettings.fillColor,
                        fillOpacity: areaSettings.fillOpacity,
                        zIndex: 0
                    });
                }
                else if(Areas.splitLine) {
                    Areas.splitLine.hide();
                    Areas.splitting = false;
                }
            }
            if(Areas.currentItem.flat && Areas.currentItem.flat.marker) {
                Flats.highlight(Areas.currentItem.flat, false);
            }
            Areas.currentItem.unit.chapel.marker.setOptions({ icon: icons.chapel });
        },
        onAllClose: function() {
            if(areaPoly) removeAreaPoly();
            if(Areas.chapelPathPoly) Areas.chapelPathPoly.hide();
        },
        onInitialise: function(items) {
            var area;
            //Make sure it is openable
            function check(field, defaultValue) {
                if(area[field] === undefined || area[field] === null) {
                    area[field] = defaultValue;
                    console.log("Field undefined: " + field + " in " + area.name);
                }
            }
            for(var i = 0; i < items.length; i++) {
                area = items[i];
                check("district", "");
                check("zone", "");
                check("unit", "");
                check("flat", "");
                check("missionaries", []);
                check("boundaries", []);
                check("areaSharedWith", []);
                check("size", 0);
                check("centroid", [ 0, 0 ]);
                check("centroidDistance", 0);
                check("chapelPath", []);
                check("chapelDistance", 0);
                for(var a = 0; a < area.missionaries.length; a++) {
                    var missionary = area.missionaries[a];
                    var prefix = missionary.elder ? "Elder " : "Sister ";
                    missionary.name = prefix + missionary.firstName + " " + missionary.lastName;
                    missionary.displayName = prefix + missionary.lastName;
                }
            }
            Areas.findUnits();
            Areas.findFlats();
        },
        variables: {
            areaSize: 0,
            centroidDistance: 0,
            chapelDistance: 0,
            chapelPath: [],
            chapelPathPoly: null,
            flat: null,
            chapel: null,
            areaClick: function(e) { Areas.open(this.areas[0]); },
            findUnits: function() {
                function areaClick(e) { Areas.open(this.areas[0]); }
                var areas = Areas.items, units = Units.items;
                if(!areas.length || !units.length) return;
                for(var a = 0; a < areas.length; a++) {
                    var area = areas[a];
                    area.unit = getItemBy(units, "name", area.unit);
                    Areas.createAreaPoly(area);
                    if(area.name == User.area) area.poly.pan();
                }
                Areas.calculateMissingFields();
            },
            findFlats: function() {
                var areas = Areas.items, flats = Flats.items;
                if(!areas.length || !flats.length) return;
                for(var a = 0, areaLength = areas.length; a < areaLength; a++) {
                    var area = areas[a];
                    //Work out if it is an elder, sister, senior area, office
                    var type = "unknown";
                    if(area.missionaries) {
                        var missionaryA = area.missionaries[0];
                        var missionaryB = area.missionaries[1];
                        if(missionaryA) {
                            if(missionaryA.elder) {
                                if(missionaryB && !missionaryB.elder) type = "senior";
                                else type = "elder";
                            }
                            else {
                                if(missionaryB && missionaryB.elder) type = "senior";
                                else type = "sister";
                            }
                        }
                    }
                    var areaName = areas[a].name;
                    var found = false;
                    for(var b = 0, flatLength = flats.length; b < flatLength; b++) {
                        var flat = flats[b];
                        var flatAreas = flat.areas || [];
                        for(var c = 0, flatAreaLength = flatAreas.length; c < flatAreaLength; c++) {
                            var flatArea = flatAreas[c];
                            if(areaName == flatArea) {
                                area.flat = flat;
                                flat.icon = icons[type + "Flat"];
                                flat.iconHighlight = icons[type + "FlatHighlight"];
                                Flats.highlight(flat, false);
                                found = true;
                                break;
                            }
                        }
                        if(found) break;
                    }
                }
                Areas.calculateMissingFields();
            },
            //Calculates any missing fields from each area and updates the database
            calculateMissingFields: function() {
                var areas = Areas.items, updates = [];
                for(var a = 0, areaLength = areas.length; a < areaLength; a++) {
                    var area = areas[a];
                    var update = {}, updateNeeded = false;
                    if(!area.size && area.unit && area.unit.boundaries) {
                        area.size = update.size = getArea(area.unit.boundaries);
                        updateNeeded = true;
                        console.log("Area '" + area.name + "' size calculated at " + area.size + "km2!");
                    }
                    if(!area.centroid[0] && (area.boundaries && area.boundaries.length || area.unit && area.unit.boundaries && area.unit.boundaries.length)) {
                        var boundaries = area.boundaries && area.boundaries.length ? area.boundaries : area.unit.boundaries;
                        area.centroid = update.centroid = calculateCentroid(boundaries);
                        updateNeeded = true;
                        console.log("Area '" + area.name + "' centroid calculated at " + area.centroid + "!");
                    }
                    if(!area.centroidDistance && area.centroid[0] && area.flat && area.flat.position) {
                        area.centroidDistance = update.centroidDistance = getDistance(area.centroid, area.flat.position);
                        updateNeeded = true;
                        console.log("Area '" + area.name + "' centroid distance calculated at " + area.size + "km!");
                    }
                    if(!area.chapelDistance && area.chapel && area.chapel.address && area.flat && area.flat.address) {
                        map.getDirections({
                            origin: area.flat.address,
                            destination: area.chapel.address,
                            callback: Areas.chapelDistanceCallback
                        });
                    }
                    if(updateNeeded) updates.push({ name: area.name, update: update });
                }
                if(updates.length) $.post("/maps/update_missing", updates);
            },
            chapelDistanceCallback: function(result) {
                var path = result[0].path, distance = 0;
                Areas.chapelPathPoly = new map.Polyline({
                    show: true,
                    path: path
                });
                for(var i = 1, pathLength = path.length; i < pathLength; i++) {
                    distance += getDistance(path[i - 1], path[i]);
                }
                area.chapelPath = path;
                area.chapelDistance = distance;
                console.log("Area '" + area.name + "' chapel distance calculated at " + distance + "km!");
            },
            changeBoundaries: function(e) {
                e.preventDefault();
                AreaSplits.splitArea(Areas.currentItem);
            },
            chapelPathPoly: new map.Polyline({
                show: false,
                strokeColor: '#66FF66',
                strokeOpacity: 0.5,
                strokeWeight: 4,
                clickable: false
            }),
            createAreaPoly: function(area) {
                if(!area.boundaries.length) {
                    if(!area.unit) return;
                    area.missingBoundaries = true;
                    if(area.unit.sharedPoly) {
                        area.poly = area.unit.sharedPoly;
                        area.poly.areas.push(area.name);
                        area.poly.label.setTitle(area.poly.areas.join(" / "));
                        return;
                    }
                    if(area.unit.sharedBoundaries && area.unit.sharedBoundaries.length) {
                        area.boundaries = map.clonePath(area.unit.sharedBoundaries);
                    }
                    else area.boundaries = map.clonePath(area.unit.boundaries);
                }
                area.points = [];
                for(var i = 0; i < area.boundaries.length; i++) {
                    area.points.push(area.boundaries[i]);
                }
                area.poly = new map.Polygon({
                    show: Areas.visible,
                    paths: area.points,
                    strokeColor: area.name == User.area ? "#F33" : '#f66',
                    strokeOpacity: 0.8,
                    strokeWeight: area.name == User.area ? 4 : 2,
                    fillColor: areaSettings.fillColor,
                    fillOpacity: areaSettings.fillOpacity,
                    clickable: true
                });
                if(area.missingBoundaries) area.unit.sharedPoly = area.poly;
                Areas.mapElements.push(area.poly);
                area.poly.on("click", Areas.areaClick);
                area.poly.areas = [ area.name ];
                area.poly.label = new map.Label({
                    show: Areas.visible,
                    position: calculateCentroid(area.points),
                    title: area.name
                });
                Areas.mapElements.push(area.poly.label);
            },
            areaPoly: null
        }
    });
    
    AreaSplits = new Form({
        name: "areaSplit",
        displayName: "Area Split Lines",
        noDisplay: true,
        noDb: true,
        onOpen: function() {
            var area = AreaSplits.area;
            
            //Hide the original area shapes
            area.poly.hide();
            var mapElements = Areas.mapElements, label = area.poly.label;
            for(var i = 0, length = mapElements.length; i < length; i++) {
                if(mapElements[i] == label) mapElements.splice(i, 1);
            }
            area.poly.label.hide();
            Form.currentForm.innerHTML = "";
            var container, a, h2, p;
            
            //Area splitting instructions
            var splitContainer = document.createElement("DIV");
            splitContainer.className = "splitContainer";
            container = document.createElement("DIV");
            a = document.createElement("A");
            a.href = "#Open/Close Instructions";
            h2 = document.createElement("H2");
            h2.innerText = "Area Splitting Instructions";
            a.appendChild(h2);
            container.appendChild(a);
            var instructions = document.createElement("DIV");
            p = document.createElement("P");
            p.innerText = [
                "Edit the green line on the map to alter the boundary between",
                "the two areas. If you need to start again, click cancel then",
                "start splitting the boundaries again. Every time the area",
                "boundaries are changed or a new area is created, you must",
                "update the boundaries on this website."
            ].join(" ");
            instructions.appendChild(p);
            p = document.createElement("P");
            p.innerText = [
                "You can edit the boundaries of any area in your ward/branch.",
                "To change the existing boundaries, you must open an area,",
                "start splitting the boundaries, then click 'Reset Unit",
                "Boundaries'. This will remove all split lines from the unit.",
                "After this, you must enter the new split lines of each area"
            ].join(" ");
            instructions.appendChild(p);
            p = document.createElement("P");
            p.innerText = [
                "Areas with no defined boundaries or boundaries that overlap",
                "other areas (EMP, River Terrace, etc.) do not need to be",
                "split and can be left where they are."
            ].join(" ");
            instructions.appendChild(p);
            a.addEventListener("click", function(e) {
                e.preventDefault();
                instructions.visible = !instructions.visible;
                instructions.style.display = instructions.visible ? "" : "none";
            }, false);
            instructions.visible = false;
            instructions.style.display = "none";
            container.appendChild(instructions);
            splitContainer.appendChild(container);
            
            //Save
            container = document.createElement("DIV");
            a = document.createElement("A");
            a.href = "#Save Area Boundary";
            a.textContent = "Save Area Boundary";
            a.addEventListener("click", AreaSplits.save);
            container.appendChild(a);
            splitContainer.appendChild(container);
            
            //Reset ward splits
            container = document.createElement("DIV");
            a = document.createElement("A");
            a.href = "#Reset Unit Area Boundaries";
            a.textContent = "Reset Unit Area Boundaries";
            a.addEventListener("click", AreaSplits.resetSplits);
            container.appendChild(a);
            splitContainer.appendChild(container);
            
            //Cancel
            container = document.createElement("DIV");
            a = document.createElement("A");
            a.href = "#Cancel Splitting Area";
            a.textContent = "Cancel Splitting Area";
            a.addEventListener("click", function(e) {
                e.preventDefault();
                Areas.open(AreaSplits.area);
            });
            container.appendChild(a);
            splitContainer.appendChild(container);
            Form.currentForm.appendChild(splitContainer);
            
            //Create polygons used to split area
            AreaSplits.areaPoly = new map.Polygon({
                show: true,
                strokeColor: '#FF6666',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: areaSettings.fillColor,
                fillOpacity: areaSettings.fillOpacity,
                clickable: true
            });
            AreaSplits.sharedPoly = new map.Polygon({
                show: true,
                strokeColor: "#FF6666",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: areaSettings.fillColor,
                fillOpacity: areaSettings.fillOpacity,
                clickable: true
            });
            
            AreaSplits.areaPoly.label = new map.Label({ title: area.name });
            AreaSplits.sharedPoly.label = new map.Label({});
            AreaSplits.addSplit();
        },
        onClose: function() {
            //Hide splitting tools
            if(AreaSplits.sharedPoly) {
                AreaSplits.sharedPoly.label.hide();
                AreaSplits.sharedPoly.hide();
            }
            if(AreaSplits.areaPoly) {
                AreaSplits.areaPoly.label.hide();
                AreaSplits.areaPoly.hide();
                //Show original area objects
                AreaSplits.area.poly.show();
                AreaSplits.area.poly.label.show();
            }
            AreaSplits.line.hide();
        },
        variables: {
            area: null,
            line: null,
            wardPath: null,
            areaPoly: null,
            sharedPoly: null,
            sharedPath: [],
            splitArea: function(area) {
                AreaSplits.area = area;
                AreaSplits.open();
            },
            addSplit: function() {
                var area = AreaSplits.area;
                var poly = area.poly;
                if(!poly) return;
                if(AreaSplits.line) AreaSplits.line.hide();
                var wardPath;
                AreaSplits.wardPath = wardPath = poly.getPath();
                var startPosition = map.clonePosition(wardPath[0]);
                var endPosition = map.clonePosition(wardPath[Math.floor(wardPath.length / 2)]);
                AreaSplits.line = new map.Polyline({
                    show: true,
                    path: [ startPosition, endPosition ],
                    strokeColor: "#0F0",
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                    clickable: false,
                    editable: true,
                    snapEndsToPath: AreaSplits.wardPath,
                    snapDragEnd: AreaSplits.calculateAreaBoundaries,
                    zIndex: 100
                });
                //Update area labels
                //Areas.areaPoly.hide();
                var sharedNames = [], areas = area.poly.areas;
                for(var i = 0; i < areas.length; i++) {
                    if(areas[i] != area.name) sharedNames.push(areas[i]);
                }
                AreaSplits.sharedPoly.areas = sharedNames;
                AreaSplits.sharedPoly.label.setOptions({ title: sharedNames.join(" / ") });
                AreaSplits.sharedPoly.label.show();
                AreaSplits.areaPoly.areas = [ area.name ];
                AreaSplits.areaPoly.label.setOptions({ title: AreaSplits.area.name });
                AreaSplits.areaPoly.label.show();
                AreaSplits.calculateAreaBoundaries();
            },
            calculateAreaBoundaries: function() {
                function same(pointA, pointB) {
                    return pointA[0] == pointB[0] && pointA[1] == pointB[1];
                }
                var path = [], sharedPath = AreaSplits.sharedPath = [];
                var linePath = AreaSplits.line.getPath();
                var wardPath = AreaSplits.wardPath;
                var wardPathLength = wardPath.length;
                var linePathLength = linePath.length;
                var firstPoint = linePath[0];
                var lastPoint = linePath[linePath.length - 1];
                //Add split line to the boundary
                for(var i = 0; i < linePathLength; i++) path.push(linePath[i]);
                //Find where the split line meets the ward boundary
                var i = -1, index;
                while(!same(wardPath[++i], lastPoint)) {}
                //Follow the ward boundary to where it meets the split line again
                while(!same(wardPath[index = ++i % wardPathLength], firstPoint)) {
                    path.push(wardPath[index]);
                }
                AreaSplits.areaPoly.setOptions({ paths: path });
                AreaSplits.areaPoly.label.setPosition(calculateCentroid(path));
                //Update the old shared boundary
                var wardPathStart = index;
                for(var i = linePathLength; i--;) sharedPath.push(linePath[i]);
                var i = wardPathStart, index;
                while(!same(wardPath[index = ++i % wardPathLength], lastPoint)) {
                    sharedPath.push(wardPath[index]);
                }
                AreaSplits.sharedPoly.setOptions({ paths: sharedPath });
                AreaSplits.sharedPoly.label.setPosition(calculateCentroid(sharedPath));
            },
            save: function(e) {
                e.preventDefault();
                AreaSplits.areaPoly.on("click", Areas.areaClick);
                AreaSplits.sharedPoly.on("click", Areas.areaClick);
                
                //Give the new area polygon the properties of the old one
                var area = Areas.currentItem;
                area.poly = AreaSplits.areaPoly;
                area.missingBoundaries = false;
                area.boundaries = area.points = area.poly.getPath();
                
                //Add the area labels to the list of map elements
                Areas.mapElements.push(AreaSplits.areaPoly.label);
                Areas.mapElements.push(AreaSplits.sharedPoly.label);
                
                //Assign the left over areas to the shared polygon
                var areas = AreaSplits.sharedPoly.areas;
                for(var i = 0; i < areas.length; i++) {
                    var item = getItemBy(Areas.items, "name", areas[i]);
                    if(item) item.poly = AreaSplits.sharedPoly;
                }
                area.unit.sharedPoly = AreaSplits.sharedPoly;
                //Prevent the onClose function from hiding the shared polygon
                AreaSplits.sharedPoly = AreaSplits.areaPoly = null;
                
                $.post("/maps/splits/add", {
                    area: area.name,
                    boundaries: area.boundaries,
                    unit: area.unit.name,
                    sharedBoundaries: AreaSplits.sharedPath
                });
                
                Areas.open(AreaSplits.area);
            },
            resetSplits: function(e) {
                e.preventDefault();
                //Confirm before resetting
                var unit = Areas.currentItem.unit;
                var message = "Are you sure you want to reset all area " +
                    "boundaries for " + unit.name + " " +
                    (unit.branch ? "Branch" : "Ward") + "?";
                if(!confirm(message)) return;
                //Remove the current shared polygon
                unit.sharedPoly.hide();
                unit.sharedPoly = unit.sharedBoundaries = null;
                //Remove then recreate each area's boundaries and polygons
                var mapElements = Areas.mapElements;
                var areas = getItemsBy(Areas.items, "unit", unit);
                for(var i = 0; i < areas.length; i++) {
                    var area = areas[i];
                    if(area.poly) {
                        //Remove area boundary and label from map
                        area.poly.hide();
                        var label = area.poly.label;
                        for(var a = 0, length = mapElements.length; a < length; a++) {
                            if(mapElements[a] == label) {
                                mapElements.splice(a, 1);
                                break;
                            }
                        }
                        label.hide();
                    }
                    area.boundaries = [];
                    Areas.createAreaPoly(area);
                }
                $.post("/maps/splits/reset", { unit: unit.name });
                Areas.open(AreaSplits.area);
            }
        }
    });
    
    Missionaries = new Form({
        name: "missionaries",
        displayName: "Missionaries",
        fields: {
            name: { displayName: "Name" },
            area: {
                displayName: "Area",
                render: renderLinks("Areas")
            },
            district: { displayName: "District" },
            zone: { displayName: "Zone" }
        },
        onInitialise: function(missionaries) {
            //Assign display names to the missionaries
            for(var i = 0, length = missionaries.length; i < length; i++) {
                var missionary = missionaries[i];
                var prefix = missionary.elder ? "Elder " : "Sister ";
                missionary.name = prefix + missionary.fullName;
                missionary.displayName = prefix + missionary.lastName;
            }
            //Sort missionaries by last name
            missionaries.sort(function(a, b) {
                if(a.lastName > b.lastName) return 1;
                if(a.lastName < b.lastName) return -1;
                return 0;
            });
            return missionaries;
        }
    });
    
    Form.initialiseForms();
    cluster = new Cluster(map);
    
    //Settings menu
    var menu = document.getElementById("settingsMenu");
    //Open menu button
    document.getElementById("settings").addEventListener("click", function(e) {
        e.preventDefault();
        menu.visible = !menu.visible;
        menu.style.display = menu.visible ? "" : "none";
    }, false);
    function settingBoxClicked(e) {
        
    }
    function addSettingTitle(text) {
        var title = document.createElement("H2");
        title.textContent = text;
        menu.appendChild(title);
    }
    function addSetting(name, description, defaultChecked) {
        var container = document.createElement("DIV");
        var checkbox = document.createElement("INPUT");
        checkbox.type = "checkbox";
        checkbox.id = name + "_settingbox";
        checkbox.settingName = name;
        checkbox.addEventListener("click", settingBoxClicked, false);
        checkbox.checked = defaultChecked;
        container.appendChild(checkbox);
        var label = document.createElement("LABEL");
        label.setAttribute("for", name + "_settingbox");
        label.textContent = description;
        container.appendChild(label);
        menu.appendChild(container);
    }
    addSettingTitle("Visibility");
    addSetting("areaVisible", "Show areas", true);
    addSetting("flatVisible", "Show flats", true);
    addSetting("chapelVisible", "Show chapels", true);
    addSettingTitle("Labels");
    addSetting("areaLabels", "Show area labels", true);
    addSetting("flatLabels", "Show flat labels", false);
    addSetting("chapelLabels", "Show chapel labels", false);
    if(User.auth >= Auth.ADMIN) {
        var help = document.createElement("SPAN");
        help.className = "helpMessage";
        help.textContent = "IMPORTANT: For instructions on how to upload " +
            "this data, see the ABM Portal documentation";
        menu.appendChild(help);
        //Import units
        var heading = document.createElement("H2");
        heading.textContent = "Import Units";
        menu.appendChild(heading);
        var div = document.createElement("DIV");
        var unitsStatus = document.createElement("SPAN");
        unitsStatus.id = "unitsStatus";
        div.appendChild(unitsStatus);
        menu.appendChild(div);
        var input = document.createElement("INPUT");
        input.id = "unitsInput";
        input.type = "file";
        input.setAttribute("Accept", ".kmz");
        input.multiple = true;
        input.addEventListener("change", function(e) {
            var files = e.target.files;
            if(!files.length) return;
            unitsStatus.textContent = "Processing KMZ unit files...";
            input.disabled = true;
            var results = [];
            var currentFile = 0;
            function readZip(file) {
                function onError(message) { console.log("ZIP Error: " + message); }
                zip.createReader(new zip.BlobReader(file), function(zipReader) {
                    zipReader.getEntries(function(entries) {
                        for(var i = 0; i < entries.length; i++) {
                            var entry = entries[i];
                            if(entry.filename != "doc.kml") continue;
                            //Read file
                            var writer = new zip.BlobWriter();
                            entry.getData(writer, function(blob) {
                                var reader = new FileReader();
                                reader.addEventListener("loadend", function(e) {
                                    results.push(e.target.result);
                                    if(++currentFile >= files.length) Units.uploaded(results);
                                    else readZip(files[currentFile]);
                                });
                                reader.readAsText(blob);
                            });
                            break;
                        }
                    });
                }, onError);
            }
            readZip(files[0]);
        }, false);
        menu.appendChild(input);
        //Import flats
        var heading = document.createElement("H2");
        heading.textContent = "Import Flats";
        menu.appendChild(heading);
        var div = document.createElement("DIV");
        var flatsStatus = document.createElement("SPAN");
        flatsStatus.id = "flatsStatus";
        div.appendChild(flatsStatus);
        menu.appendChild(div);
        var input = document.createElement("INPUT");
        input.id = "flatsInput";
        input.type = "file";
        input.setAttribute("Accept", ".csv");
        input.addEventListener("change", function(e) {
            var file = e.target.files[0];
            if(!file) return;
            flatsStatus.textContent = "Uploading flats...";
            input.disabled = true;
            var reader = new FileReader();
            reader.onload = function(e) {
                //CSV format
                //This weird character always appears in the file (???)
                var text = e.target.result.replace(new RegExp(String.fromCharCode(65533), "g"), "");
                var lines = CSV.csvToArray(text);
                lines.splice(0, 1);
                Flats.uploaded(lines);
                /*
                //Excel format (BUGGY)
                var cfb = XLS.CFB.read(e.target.result, { type: "binary" });
                var workbook = XLS.parse_xlscfb(cfb);
                for(var sheet in workbook) {
                    var result = XLS.utils.sheet_to_row_object_array(workbook.Sheets[sheet]);
                    if(result.length) {
                        form.onUpload(result);
                        return;
                    }
                }
                */
            };
            reader.readAsText(file);
        }, false);
        menu.appendChild(input);
    }
}
window.addEventListener('load', initialise, false);

/* --- SOURCE: http://easycalculation.com/area/polygon-centroid-point.php --- */
//0,0,0 1,0,0 1,1,0 0,1,0
function calculateCentroid(coordinates) {
    var v = [], area = 0, cx = 0, cy = 0;
    var count = coordinates.length, i;
    if(coordinates[0].getPosition) {
        for(i = 1; i <= count; i++) {
            v[i] = [];
            var position = coordinates[i - 1].getPosition();
            v[i][1] = position[0];
            v[i][2] = position[1];
        }
    }
    else {
        for(i = 1; i <= count; i++) {
            v[i] = [];
            v[i][1] = parseFloat(coordinates[i - 1][0]);
            v[i][2] = parseFloat(coordinates[i - 1][1]);
        }
    }
    
    for(i = 1; i <= count; i++) {
        if(i == count) area += v[i][1] * v[1][2] - v[1][1] * v[i][2];
        else area += v[i][1] * v[i+1][2] - v[i+1][1] * v[i][2];
    }
    area = area / 2;
    if(area) {
        for(i = 1; i <= count; i++) {
            if(i == count) {
                cx += (v[i][1] + v[1][1]) * ((v[i][1] * v[1][2]) - (v[1][1] * v[i][2]));
                cy += (v[i][2] + v[1][2]) * ((v[i][1] * v[1][2]) - (v[1][1] * v[i][2]));
            }
            else {
                cx += (v[i][1] + v[i+1][1]) * ((v[i][1] * v[i+1][2]) - (v[i+1][1] * v[i][2]));
                cy += (v[i][2] + v[i+1][2]) * ((v[i][1] * v[i+1][2]) - (v[i+1][1] * v[i][2]));
            }
        }
        cx = 1 / (6 * area) * cx;
        cy = 1 / (6 * area) * cy;
    }
    else cx = cy = 0;
    return [cx, cy];
}

/* --- END --- */

function getDistance(pointA, pointB) {
    var earthRadiusMeters = 6367460;
    var radiansPerDegree = Math.PI / 180;
    var dLat  = (pointB[0] - pointA[0]) * radiansPerDegree;
    var dLong = (pointB[1] - pointA[1]) * radiansPerDegree;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(pointA[0] * radiansPerDegree) *
          Math.cos(pointB[0] * radiansPerDegree) *
          Math.sin(dLong/2) * Math.sin(dLong/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (earthRadiusMeters * c) / 1000;
}

/* --- SOURCE: http://www.daftlogic.com/projects-google-maps-area-calculator-tool.htm --- */
function getArea(points) {
    var earthRadiusMeters = 6367460.0;
    var metersPerDegree = 2 * Math.PI * earthRadiusMeters / 360;
    var radiansPerDegree = Math.PI / 180;
    var a = 0;
    for (var i = 0; i < points.length; ++i) {
        var j = (i + 1) % points.length;
        var xi = points[i][1] * metersPerDegree * Math.cos(points[i][0] * radiansPerDegree);
        var yi = points[i][0] * metersPerDegree;
        var xj = points[j][1] * metersPerDegree * Math.cos(points[j][0] * radiansPerDegree);
        var yj = points[j][0] * metersPerDegree;
        a += xi * yj - xj * yi;
    }
    return (Math.abs(a / 2.0) / 1000000);
}

function capitalise(text) {
    return text.replace(/^(.)|\s(.)/g, function($1) {
        return $1.toUpperCase();
    });
}

function getItemBy(items, property, value) {
    for(var i = 0; i < items.length; i++) {
        var item = items[i];
        if(item[property] == value) return item;
    }
    return null;
}
function getItemsBy(items, property, value) {
    var values = [];
    for(var i = 0; i < items.length; i++) {
        var item = items[i];
        if(item[property] == value) values.push(item);
    }
    return values;
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }