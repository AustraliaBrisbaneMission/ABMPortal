var areaBoundaries = [], centroid, areaPoly;
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
var Chapels, Flats, Areas, Wards, Directions, Missionaries;

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
                            Areas.chapelPath = path;
                            Areas.chapelDistance = distance;
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
function getCentroidDistance() {
    if(!Areas.flat || !centroid) return 0;
    return getDistance(centroid.getPosition(), Areas.flat.position);
}
function initAreaPoly(area) {
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
    Areas.mapElements.push(area.poly);
    area.poly.on('click', function(e) {
        Areas.open(area);
    });
    area.label = new map.Label({
        show: Areas.visible,
        position: calculateCentroid(area.points),
        title: area.name
    });
    Areas.mapElements.push(area.label);
}
function removeAreaPoly() {
    for(var i = 0; i < areaBoundaries.length; i++) areaBoundaries[i].hide();
    areaBoundaries = [];
    areaPoly.hide();
}
function resetAreaPoly(area) {
    if(Areas.chapelPathPoly) Areas.chapelPathPoly.hide();
    area.poly.show();
}
function updateBoundary() {
    var paths = [];
    for(var i = 0; i < areaBoundaries.length; i++) paths.push(areaBoundaries[i].getPosition());
    areaPoly.setOptions({ paths: paths });
    if(areaBoundaries.length >= 3) {
        centroid.setOptions({ position: calculateCentroid(areaBoundaries) });
        Areas.centroidDistance = getCentroidDistance();
    }
    Areas.areaSize = getArea(areaBoundaries);
    Areas.updateField("size");
    Areas.updateField("centroidDistance");
}
function addBoundaryMarker(position) {
    var marker = new map.Marker({
        position: position,
        draggable: true
    });
    enableSnapping(marker);
    marker.on('dragend', updateBoundary);
    areaBoundaries.push(marker);
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
    map.on('click', function(e) {
        if(Areas.state == "create") {
            addBoundaryMarker(e.position);
            updateBoundary();
        }
    });
    centroid = new map.Marker({ title: "Centroid" });
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
                }
                if(points[points.length - 1].value.length && points.length < 10) {
                    Directions.addPoint();
                }
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
        fields: {
            name: "text",
            chapel: "text",
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
                if(!stakeColours[ward.stake]) {
                    stakeColours[ward.stake] = defaultColours[colourCount++];
                }
                ward.poly = new map.Polygon({
                    show: Wards.visible,
                    paths: ward.boundaries,
                    strokeColor: "#333",
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    fillColor: stakeColours[ward.stake],
                    fillOpacity: 0.1,
                    clickable: false
                });
                Wards.mapElements.push(ward.poly);
                ward.label = new map.Label({
                    show: WardLabels.visible, //Showing labels adds lag
                    title: ward.name,
                    size: 12,
                    position: calculateCentroid(ward.boundaries)
                });
                WardLabels.mapElements.push(ward.label);
            };
            return items;
        },
        variables: {
            boundaries: [],
            markers: [],
            poly: null
        }
    });
    
    Flats = new Form({
        name: "flat",
        fields: {
            name: "text",
            address: "text",
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
        onItemInitialise: function(flat) {
            flat.marker = new map.Marker({
                show: true,
                icon: icons.flat,
                label: flat.name + " Flat"
            });
            Flats.mapElements.push(flat.marker);
            PointPicker.addClick(flat.marker, flat.address);
            flat.marker.on('click', function(e) {
                openInfoWindow(flat, "Flat", Flats);
            });
            if(flat.position) {
                flat.position = [
                    parseFloat(flat.position[0]),
                    parseFloat(flat.position[1])
                ];
                flat.marker.setOptions({ position: flat.position });
            }
            else if(flat.address) {
                map.geocode(flat.address, function(results) {
                    flat.position = results.position;
                    flat.marker.setOptions({ position: flat.position });
                    $.post("/area_analysis/db", {
                        action: "update",
                        collection: "flat",
                        id: flat._id,
                        data: { position: flat.position }
                    });
                });
            }
            return flat;
        }
    });
    
    Chapels = new Form({
        name: "chapel",
        fields: {
            name: "text",
            address: "text",
            position: {
                noDisplay: true,
                getValueToSave: function(callback) {
                    map.geocode(Chapels.currentItem.address, function(results) {
                        Chapels.setValueToSave("position", results.position);
                    });
                }
            }
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
            chapel.marker = new map.Marker({
                show: true,
                position: chapel.position,
                icon: icons.chapel
            });
            Chapels.mapElements.push(chapel.marker);
            PointPicker.addClick(chapel.marker, chapel.address);
            chapel.marker.on('click', function(e) {
                openInfoWindow(chapel, "Chapel", Chapels);
            });
            return chapel;
        }
    });
    
    Missionaries = new Form({
        name: "missionaryAreas",
        fields: {
            name: "text",
            ward: "text",
            area: "text"
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
        show: false,
        fields: {
            name: "text",
            ward: "text",
            flat: "text",
            boundaries: {
                noDisplay: true,
                getValueToSave: function() {
                    var boundaries = [];
                    for(var i = 0; i < areaBoundaries.length; i++) {
                        boundaries.push(areaBoundaries[i].position);
                    }
                    Areas.setValueToSave("boundaries", boundaries);
                }
            },
            size: {
                render: function() {
                    var size = 0;
                    if(Areas.state == "open") {
                        if(Areas.currentItem) size = Areas.currentItem.size;
                    }
                    else if(Areas.state == "edit") size = Areas.areaSize;
                        else if(Areas.state == "create") size = Areas.areaSize;
                        return parseFloat(size).toFixed(1) + "km2";
                },
                getValueToSave: function() {
                    Areas.areaSize = getArea(areaBoundaries);
                    Areas.setValueToSave("size", Areas.areaSize);
                },
                defaultValue: 0
            },
            centroid: {
                noDisplay: true,
                getValueToSave: function() {
                    Areas.setValueToSave("centroid", centroid.position);
                }
            },
            centroidDistance: {
                render: function() {
                    return parseFloat(Areas.centroidDistance).toFixed(2) + "km";
                },
                getValueToSave: function() {
                    Areas.setValueToSave("centroidDistance", getCentroidDistance());
                },
                defaultValue: 0
            },
            chapelDistance: {
                render: function() {
                    return parseFloat(Areas.chapelDistance).toFixed(2) + "km";
                },
                getValueToSave: function() {
                    //chapelPath will send the callback for chapelDistance
                },
                defaultValue: 0
            },
            chapelPath: {
                noDisplay: true,
                getValueToSave: function(callback) {
                    getChapelPath(false, function() {
                        Areas.setValueToSave("chapelPath", Areas.chapelPath);
                        Areas.setValueToSave("chapelDistance", Areas.chapelDistance);
                    });
                }
            }
        },
        onOpen: function(itemIndex) {
            if(!Areas.currentItem) return;
            //Get flat object
            for(var i = 0; i < Flats.items.length; i++) {
                if(Flats.items[i].name == Areas.currentItem.flat) {
                    Areas.flat = Flats.items[i];
                    break;
                }
            }
            //Create edit boundaries
            var boundaries = Areas.currentItem.boundaries;
            for(var i = 0; i < boundaries.length; i++) {
                addBoundaryMarker(boundaries[i]);
            }
            updateBoundary();
            //Areas.areaSize = Areas.currentItem.size;
            //Areas.centroidDistance = Areas.currentItem.centroidDistance;
            Areas.chapelDistance = Areas.currentItem.chapelDistance;
            
            Areas.chapelPathPoly = new map.Polyline({
                show: true,
                path: Areas.currentItem.chapelPath,
                strokeColor: '#66FF66',
                strokeOpacity: 0.5,
                strokeWeight: 4,
                clickable: false
            });
            Areas.currentItem.poly.setOptions({
                strokeColor: '#6666FF',
                fillColor: '#6666FF',
                fillOpacity: 0.15,
                zIndex: 1
            });
            
            map.pan(centroid.getPosition());
        },
        onClose: function() {
            if(Areas.currentItem) {
                Areas.currentItem.poly.setOptions({
                    strokeColor: '#FF6666',
                    fillColor: areaSettings.fillColor,
                    fillOpacity: areaSettings.fillOpacity,
                    zIndex: 0
                });
            }
        },
        onAllClose: function() {
            if(areaPoly) removeAreaPoly();
            if(Areas.chapelPathPoly) Areas.chapelPathPoly.hide();
            Areas.areaSize = Areas.centroidDistance = Areas.chapelDistance = 0;
        },
        onEdit: function() {
            $.each(areaBoundaries, function(index, boundary) {
                boundary.show();
            });
            Areas.centroidDistance = getCentroidDistance();
            areaPoly.show();
            Areas.currentItem.poly.hide();
        },
        onEditCancel: function() {
            removeAreaPoly();
            for(var i = 0; i < Areas.currentItem.boundaries; i++) {
                addBoundaryMarker(Areas.currentItem.boundaries[i]);
            }
            resetAreaPoly(Areas.currentItem);
        },
        onCreate: function() {
            areaPoly.show();
        },
        onCreateCancel: function() {
            removeAreaPoly();
        },
        onRemove: function() {
            Areas.currentItem.label.hide();
            Areas.currentItem.poly.show();
        },
        onInitialise: function(items) {
            for(var i = 0; i < items.length; i++) {
                var area = items[i];
                
                //Make sure it is openable
                function check(field, defaultValue) {
                    if(area[field] === undefined) {
                        area[field] = defaultValue;
                        console.log("Field undefined: " + field + " in " + area.name);
                    }
                }
                check("flat", "");
                check("flat", "");
                check("boundaries", []);
                check("size", 0);
                check("centroid", [0, 0]);
                check("centroidDistance", 0);
                check("chapelDistance", 0);
                check("chapelPath", []);
                
                initAreaPoly(area);
            };
            return items;
        },
        variables: {
            areaSize: 0,
            centroidDistance: 0,
            chapelDistance: 0,
            chapelPath: [],
            chapelPathPoly: null,
            flat: null
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
        var xi = points[i].getPosition()[1] * metersPerDegree *
            Math.cos(points[i].getPosition()[0] * radiansPerDegree);
        var yi = points[i].getPosition()[0] * metersPerDegree;
        var xj = points[j].getPosition()[1] * metersPerDegree *
            Math.cos(points[j].getPosition()[0] * radiansPerDegree);
        var yj = points[j].getPosition()[0] * metersPerDegree;
        a += xi * yj - xj * yi;
    }
    return (Math.abs(a / 2.0) / 1000000);
}

function capitalise(text) {
    return text.replace(/^(.)|\s(.)/g, function($1) {
        return $1.toUpperCase();
    });
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}