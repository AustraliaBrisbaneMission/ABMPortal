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
    flat: {
        url: iconBase + "flat.png",
        size: [ 34, 41 ]
    },
    flatHighlight: {
        url: iconBase + "flat_highlight.png",
        size: [ 34, 41 ]
    },
};
var map;
var cluster;
var areaSettings = {
    fillColor: '#FF6666',
    fillOpacity: 0.1
};

//Forms
var Chapels, Flats, Areas, Wards, Directions, Missionaries, AreaSplits;

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
    $.each(snapPoints, function(key, point) {
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
    $.each(Areas.items, function(key, area) {
        if(area != Areas.currentItem) {
            $.each(area.points, function(key, point) {
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
                    index: key
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
    $.each(snapPoints, function(key, point) { point.snapper.hide(); });
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
    
    Directions = new Form({
        name: "Directions",
        noDb: true,
        onAllClose: map.hideDirections,
        onOpen: function() {
            Directions.points = [];
            var directionsForm = document.createElement('FORM');
            Directions.picker = new PointPicker(Directions.points, directionsForm);
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
    
    WardLabels = new Form({ name: "Display Ward Labels:", show: false, noDb: true });
    Wards = new Form({
        name: "ward",
        displayName: "Wards",
        show: false,
        fields: {
            name: { displayName: "Name" },
            chapel: { displayName: "Chapel" },
            boundaries: {
                noDisplay: true,
                getValueToSave: function() {
                    Areas.setValueToSave("boundaries", Ward.boundaries);
                }
            }
        },
        onOpen: function() {
            Wards.currentItem.poly.pan();
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
                    show: Wards.visible,
                    paths: ward.boundaries,
                    strokeColor: ward.name == User.unit ? "#F33" : "#333",
                    strokeOpacity: 0.5,
                    strokeWeight: ward.name == User.unit ? 4 : 2,
                    fillColor: colour,
                    fillOpacity: 0.1,
                    zIndex: 1,
                    clickable: false,
                    pan: ward.name == User.unit
                });
                Wards.mapElements.push(ward.poly);
                ward.label = new map.Label({
                    show: WardLabels.visible, //Showing labels adds lag
                    title: ward.name,
                    size: 12,
                    position: calculateCentroid(ward.boundaries)
                });
                WardLabels.mapElements.push(ward.label);
            }
            Areas.findUnits();
        },
        variables: {
            boundaries: [],
            markers: [],
            poly: null
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
                render: function(areas) { return areas.join(" / "); }
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
        onOpen: function(itemIndex) {
            Flats.currentItem.marker.setOptions({ icon: icons.flatHighlight });
            map.pan(Flats.currentItem.marker.getPosition());
        },
        onClose: function() {
            if(Flats.currentItem) {
                Flats.currentItem.marker.setOptions({ icon: icons.flat });
            }
            Flats.marker.show(false);
        },
        variables: {
            marker: new map.Marker({
                icon: icons.flatHighlight
            })
        },
        onInitialise: function(items) {
            Areas.findFlats();
            return items;
        },
        onItemInitialise: function(flat) {
            function createMarker(result) {
                flat.marker = new map.Marker({
                    show: true,
                    position: result ? result.position : flat.position,
                    icon: icons.flat,
                    label: flat.name + " Flat"
                });
                Flats.mapElements.push(flat.marker);
                PointPicker.addClick(flat.marker, flat.address);
                flat.marker.on('click', function(e) {
                    openInfoWindow(flat, "Flat", Flats);
                });
                if(result) {
                    flat.position = result.position;
                    $.post("/area_analysis/db", {
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
        onUpload: function(data, callback) {
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
            callback(dbData);
        }
    });
    
    Chapels = new Form({
        name: "chapel",
        displayName: "Chapels",
        fields: {
            name: { displayName: "Name" },
            address: { displayName: "Address" },
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
                    $.post("/area_analysis/db", {
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
        onUpload: function(data, callback) {
            var dbData = [];
            for(var i = 0; i < data.length; i++) {
                var line = data[i];
                dbData.push({
                    name: line[0],
                    address: line[1],
                    position: null
                });
            }
            callback(dbData);
        }
    });
    
    Missionaries = new Form({
        name: "missionaryAreas",
        displayName: "Areas by Missionaries",
        fields: {
            name: { displayName: "Name" },
            ward: { displayName: "Ward" },
            area: { displayName: "Area" }
        },
        onOpen: function(itemIndex) {
            var wardName = Missionaries.currentItem.ward;
            for(var i = 0; i < Wards.items.length; i++) {
                var ward = Wards.items[i];
                if(ward.name == wardName) ward.poly.pan();
            }
        }
    });
    
    Areas = new Form({
        name: "area",
        displayName: "Areas",
        fields: {
            name: { displayName: "Name" },
            district: { displayName: "District" },
            zone: { displayName: "Zone" },
            unit: {
                displayName: "Unit",
                render: function(unit) { return unit ? unit.name : "(Unknown)"; }
            },
            missionaries: {
                displayName: "Missionaries",
                render: function(missionaries) {
                    if(!missionaries || !missionaries.length) return "";
                    var list = [];
                    for(var i = 0; i < missionaries.length; i++) {
                        var missionary = missionaries[i];
                        var prefix = missionary.elder ? "Elder " : "Sister ";
                        list.push(prefix + missionary.lastName);
                    }
                    return list.join(" / ");
                }
            },
            flat: {
                displayName: "Flat",
                render: function(flat) { return flat.name; }
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
            },
            changeBoundaries: {
                displayName: "Change Area Boundaries",
                render: function() {
                    var a = document.createElement("A");
                    a.href = "#Change Area Boundaires";
                    a.textContent = "Click to add boundaries...";
                    a.addEventListener("click", Areas.changeBoundaries, false);
                    return a;
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
        },
        onAllClose: function() {
            if(areaPoly) removeAreaPoly();
            if(Areas.chapelPathPoly) Areas.chapelPathPoly.hide();
        },
        onInitialise: function(items) {
            for(var i = 0; i < items.length; i++) {
                var area = items[i];
                
                //Make sure it is openable
                function check(field, defaultValue) {
                    if(area[field] === undefined || area[field] == null) {
                        area[field] = defaultValue;
                        console.log("Field undefined: " + field + " in " + area.name);
                    }
                }
                check("district", "");
                check("zone", "");
                check("unit", "");
                check("flat", "");
                check("missionaries", "");
                check("boundaries", []);
                check("areaSharedWith", []);
                check("size", 0);
                check("centroid", [ 0, 0 ]);
                check("centroidDistance", 0);
                check("chapelPath", []);
                check("chapelDistance", 0);
            }
            Areas.findUnits();
            Areas.findFlats();
        },
        onUpload: function(data, callback) {
            var dbData = [];
            for(var i = 0; i < data.length; i++) {
                var line = data[i];
                dbData.push({
                    name: line[0],
                    district: line[1],
                    zone: line[2],
                    unit: line[3],
                    flat: line[4],
                    missionaries: line[5],
                    boundaries: null,
                    size: null,
                    centroid: null,
                    centroidDistance: null,
                    chapelPath: null,
                    chapelDistance: null
                });
            }
            callback(dbData);
        },
        variables: {
            areaSize: 0,
            centroidDistance: 0,
            chapelDistance: 0,
            chapelPath: [],
            chapelPathPoly: null,
            flat: null,
            findUnits: function() {
                var areas = Areas.items, units = Wards.items;
                if(!areas.length || !units.length) return;
                for(var a = 0; a < areas.length; a++) {
                    var area = areas[a];
                    var unit = area.unit = getItemBy(units, "name", area.unit);
                    if(unit && !area.boundaries.length) {
                        area.missingBoundaries = true;
                        if(unit.sharedPoly) {
                            area.poly = unit.sharedPoly;
                            area.poly.areas.push(area.name);
                            area.poly.label.setTitle(area.poly.areas.join(" / "));
                            continue;
                        }
                        else area.boundaries = map.clonePath(unit.boundaries);
                    }
                    else if(!area.boundaries.length) continue;
                    
                    //Draw area boundaries on map
                    area.points = [];
                    for(var i = 0; i < area.boundaries.length; i++) {
                        area.points.push(area.boundaries[i]);
                    }
                    area.poly = new map.Polygon({
                        show: Areas.visible,
                        paths: area.points,
                        strokeColor: '#FF6666',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: areaSettings.fillColor,
                        fillOpacity: areaSettings.fillOpacity,
                        clickable: true
                    });
                    if(area.missingBoundaries) unit.sharedPoly = area.poly;
                    Areas.mapElements.push(area.poly);
                    area.poly.on('click', function(e) {
                        Areas.open(this.areas[0]);
                    });
                    area.poly.areas = [ area.name ];
                    area.poly.label = new map.Label({
                        show: Areas.visible,
                        position: calculateCentroid(area.points),
                        title: area.name
                    });
                    Areas.mapElements.push(area.poly.label);
                }
                Areas.calculateMissingFields();
            },
            findFlats: function() {
                var areas = Areas.items, flats = Flats.items;
                if(!areas.length || !flats.length) return;
                for(var a = 0, areaLength = areas.length; a < areaLength; a++) {
                    var area = areas[a];
                    var areaName = areas[a].name;
                    var found = false;
                    for(var b = 0, flatLength = flats.length; b < flatLength; b++) {
                        var flat = flats[b];
                        var flatAreas = flat.areas;
                        for(var c = 0, flatAreaLength = flatAreas.length; c < flatAreaLength; c++) {
                            var flatArea = flatAreas[c];
                            if(areaName == flatArea) {
                                area.flat = flat;
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
                var areas = Areas.items;
                for(var a = 0, areaLength = areas.length; a < areaLength; a++) {
                    var area = areas[a];
                    if(!area.size && area.unit && area.unit.boundaries) {
                        area.size = getArea(area.unit.boundaries);
                        console.log("Area '" + area.name + "' size calculated at " + area.size + "km2!");
                    }
                    if(!area.centroid[0] && (area.boundaries && area.boundaries.length || area.unit && area.unit.boundaries && area.unit.boundaries.length)) {
                        var boundaries = area.boundaries && area.boundaries.length ? area.boundaries : area.unit.boundaries;
                        area.centroid = calculateCentroid(boundaries);
                        console.log("Area '" + area.name + "' centroid calculated at " + area.centroid + "!");
                    }
                    if(!area.centroidDistance && area.centroid[0] && area.flat && area.flat.position) {
                        area.centroidDistance = getDistance(area.centroid, area.flat.position);
                        console.log("Area '" + area.name + "' centroid distance calculated at " + area.size + "km!");
                    }
                    if(!area.chapelDistance && area.chapel && area.chapel.address && area.flat && area.flat.address) {
                        map.getDirections({
                            origin: area.flat.address,
                            destination: area.chapel.address,
                            callback: Areas.chapelDistanceCallback
                        });
                    }
                }
            },
            chapelDistanceCallback: function(result) {
                var path = result[0].path;
                Areas.chapelPathPoly = new map.Polyline({
                    show: show,
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
            areaPoly: new map.Polygon({
                show: false,
                strokeColor: '#FF6666',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: areaSettings.fillColor,
                fillOpacity: areaSettings.fillOpacity,
                clickable: false
            }),
            areaLabel: new map.Label({
                show: true,
                position: [ 0, 0 ],
                title: "Area"
            })
        }
    });
    
    AreaSplits = new Form({
        name: "areaSplit",
        displayName: "Area Split Lines",
        noDisplay: true,
        noDb: true,
        onOpen: function() {
            var area = AreaSplits.area;
            var unit = area.unit;
            Form.currentForm.textContent = area.name;
        },
        variables: {
            area: null,
            line: null,
            wardPath: null,
            areaPoly: new map.Polygon({
                show: false,
                strokeColor: "#6666FF",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: areaSettings.fillColor,
                fillOpacity: areaSettings.fillOpacity,
                clickable: false
            }),
            areaLabel: new map.Label({}),
            sharedPoly: new map.Polygon({
                show: false,
                strokeColor: "#FF6666",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#FF6666",
                fillOpacity: areaSettings.fillOpacity,
                clickable: false
            }),
            sharedLabel: new map.Label({}),
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
                Areas.areaPoly.hide();
                Areas.areaLabel.hide();
                var sharedNames = [], shared = area.poly.shared;
                for(var i = 0; i < shared.length; i++) {
                    if(shared != area) sharedNames.push(shared.name);
                }
                AreaSplits.sharedLabel.setOptions({ title: sharedNames.join(" / ") });
                AreaSplits.areaLabel.setOptions({ title: AreaSplits.area.name });
                AreaSplits.calculateAreaBoundaries();
            },
            calculateAreaBoundaries: function() {
                function same(pointA, pointB) {
                    return pointA[0] == pointB[0] && pointA[1] == pointB[1];
                }
                var path = [], sharedPath = [];
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
                AreaSplits.areaLabel.setPosition(calculateCentroid(path));
                //Update the old shared boundary
                var wardPathStart = index;
                for(var i = linePathLength; i--;) sharedPath.push(linePath[i]);
                var i = wardPathStart, index;
                while(!same(wardPath[index = ++i % wardPathLength], lastPoint)) {
                    sharedPath.push(wardPath[index]);
                }
                AreaSplits.sharedPoly.setOptions({ paths: sharedPath });
                AreaSplits.sharedLabel.setPosition(calculateCentroid(sharedPath));
            }
        }
    });
    
    Form.initialiseForms();
    cluster = new Cluster(map);
    
    /*
    //Add ward boundaries
    var files = [
        "1945637-Ward_Boundaries",
        "1945831-Ward_Boundaries",
        "524484-Ward_Boundaries",
        "525758-Ward_Boundaries",
        "543004-Ward_Boundaries",
        "601454-Ward_Boundaries",
        "606022-Ward_Boundaries",
        "608874-Ward_Boundaries",
        "ABM-Ward_Boundaries",
        "Brisbane North-Ward_Boundaries",
        "Brisbane-Ward_Boundaries",
        "EMP-Ward_Boundaries",
        "Ipswich-Ward_Boundaries",
        "Logan-Ward_Boundaries",
        "River Terrace-Overlay_Boundaries"
    ];
    for(var i = 0; i < files.length; i++) {
        var ward = new map.KML({ show: true });
        var prefix = "http://transferrecommendations.tk/Boundaries/";
        var suffix = ".kmz";
        ward.open(prefix + files[i] + suffix);
    }
    */
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