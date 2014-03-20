var Map = function(element) {
    var me = this;
    
    //Map functions
    me.pan = function(position) {
        map.panTo(convertPosition(position));
    };
    me.zoom = function(zoomLevel) {
        map.setZoom(zoomLevel);
    };
    
    //Creates map objects
    function createMapObject(obj, type, options) {
        function getOptions(options) {
            var newOptions = {}, optionList = {
                title: 'title',
                clickable: 'clickable',
                draggable: 'draggable',
                //editable: 'editable',
                strokeColor: 'strokeColor',
                strokeOpacity: 'strokeOpacity',
                strokeWeight: 'strokeWeight',
                fillColor: 'fillColor',
                fillOpacity: 'fillOpacity',
                zIndex: 'zIndex',
                size: 'size',
                className: 'className'
            };
            for(var i in options) {
                if(optionList[i]) newOptions[optionList[i]] = options[i];
                else if(i == "show") {
                    newOptions.map = options.show ? map : null;
                }
                else if(i == "position") {
                    newOptions.position = convertPosition(options.position);
                }
                else if(i == "path") {
                    var path = [];
                    for(var a = 0; a < options.path.length; a++) {
                        path.push(convertPosition(options.path[a]));
                    }
                    newOptions.path = editPath = path;
                    editPath = options.path;
                }
                else if(i == "paths") {
                    var paths = [];
                    for(var a = 0; a < options.paths.length; a++) {
                        paths.push(convertPosition(options.paths[a]));
                    }
                    newOptions.paths = paths;
                    editPath = options.paths;
                }
                else if(i == "icon") {
                    var x = options.icon.size[0], y = options.icon.size[1];
                    newOptions.icon = { url: options.icon.url };
                    if(options.icon.center) {
                        newOptions.icon.anchor = new google.maps.Point(x / 2, y / 2);
                    }
                }
                else if(i == "label") {
                    var labelOptions = {
                        show: options.show, //Showing labels adds lag
                        position: options.position,
                        title: options.label,
                        size: 12
                    };
                    var label = new me.Label(labelOptions);
                    if(options.icon) label.real.marginTop = "12px";
                    mapObjects.push(label.real);
                }
                else if(i == "pan") {
                    if(options.position) me.pan(options.position);
                }
            }
            return newOptions;
        }
        var editPath = [];
        var mapObjects = [ {} ];
        var mapObject = obj.real = new type(getOptions(options));
        mapObjects[0] = mapObject;
        //Compute editable
        if(options.editable) {
            function dragStart(e) {
                this.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "#fff",
                    fillOpacity: 1,
                    strokeColor: "#666",
                    strokeWeight: 2,
                    strokeOpacity: 1,
                    scale: 8
                });
                for(var i = 0, len = editPath.length - 1; i < len; i++) {
                    var point = editPath[i];
                    if(point == this.point) {
                        var newPoint = convertFromPosition(e.latLng);
                        editPath.splice(i + 1, 0, newPoint);
                        this.point = newPoint;
                        newPoint.marker = this;
                        //Create adder A
                        createEditPoint(point, newPoint);
                        var adderA = editPoints[editPoints.length - 1];
                        adderA.affected = [ this.affected[0], this ];
                        //Create adder B
                        createEditPoint(newPoint, editPath[i + 2]);
                        var adderB = editPoints[editPoints.length - 1];
                        adderB.affected = [
                            this,
                            this.affected[1]
                        ];
                        //Update affected points
                        this.affected[0].affected[1] = adderA;
                        this.affected[1].affected[0] = adderB;
                        //Update new point's affects
                        this.affected = [
                            editPoints[editPoints.length - 2],
                            editPoints[editPoints.length - 1]
                        ];
                        break;
                    }
                }
                google.maps.event.clearListeners(this, "dragstart");
            }
            function setHalfway(point) {
                var positionA = point.affected[0].point;
                var positionB = point.affected[1].point;
                point.setPosition(convertPosition([
                    positionA[0] + (positionB[0] - positionA[0]) / 2,
                    positionA[1] + (positionB[1] - positionA[1]) / 2
                ]));
            }
            function drag(e) {
                var position = convertFromPosition(e.latLng);
                if(this.snaps) {
                    var closest = { distance: Infinity, position: null };
                    for(var i = 0; i < this.snapPath.length; i++) {
                        var snapPoint = this.snapPath[i];
                        var distanceLat = Math.abs(position[0] - snapPoint[0]);
                        var distanceLng = Math.abs(position[1] - snapPoint[1]);
                        var distance = distanceLat + distanceLng;
                        if(distance < closest.distance) {
                            closest.distance = distance;
                            closest.position = snapPoint;
                        }
                    }
                    this.setPosition(convertPosition(closest.position));
                    position = closest.position;
                }
                var point = this.point;
                point[0] = position[0];
                point[1] = position[1];
                for(var i = 0, len = this.affected.length; i < len; i++) {
                    if(this.affected[i]) setHalfway(this.affected[i]);
                }
                obj.setOptions({ path: editPath });
            }
            function createEditPoint(point, nextPoint) {
                var position = nextPoint ? [
                    point[0] + (nextPoint[0] - point[0]) / 2,
                    point[1] + (nextPoint[1] - point[1]) / 2
                ] : point;
                var marker = new google.maps.Marker({
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: "#fff",
                        fillOpacity: nextPoint ? 0.5 : 1,
                        strokeColor: "#666",
                        strokeWeight: 2,
                        strokeOpacity: nextPoint ? 0.5 : 1,
                        scale: 8
                    },
                    map: options.show ? map : null,
                    position: convertPosition(position),
                    draggable: true,
                    raiseOnDrag: false,
                    zIndex: options.zIndex || 0
                });
                //Hack to stop areas being opened when dragging a point
                function removeCover(e) { this.remove(); }
                function stopClickEvent(e) {
                    var cover = document.createElement("DIV");
                    cover.style.position = "absolute";
                    cover.style.top = cover.style.bottom = 0;
                    cover.style.left = cover.style.right = 0;
                    cover.style.zIndex = 99999;
                    document.body.appendChild(cover);
                    cover.addEventListener("mouseup", removeCover, false);
                }
                marker.addListener("dragstart", stopClickEvent);
                marker.point = point;
                point.marker = marker;
                editPoints.push(marker);
                mapObjects.push(marker);
                if(nextPoint) {
                    marker.addListener("dragstart", dragStart);
                }
                marker.addListener("drag", drag);
                if(options.snapDragEnd) marker.addListener("dragend", options.snapDragEnd);
                return point;
            }
            var editPoints = [];
            for(var i = 0, len = editPath.length - 1; i < len; i++) {
                createEditPoint(editPath[i]);
                createEditPoint(editPath[i], editPath[i + 1]);
                var length = editPoints.length;
                var point = editPoints[length - 2];
                //Add affected points
                if(length < 3) point.affected = [ null, editPoints[length - 1] ];
                else {
                    point.affected = [
                        editPoints[length - 3],
                        editPoints[length - 1]
                    ];
                    editPoints[length - 3].affected = [
                        editPoints[length - 4],
                        editPoints[length - 2]
                    ];
                }
            }
            var length = editPoints.length;
            createEditPoint(editPath[length - 1]);
            editPoints[length].affected = [
                editPoints[length - 1]
            ];
            editPoints[length - 1].affected = [
                editPoints[length - 2],
                editPoints[length]
            ];
            function setSnap(marker, snapPath) {
                marker.snaps = true;
                marker.snapPath = snapPath;
            }
            if(options.snapEndsToPath) {
                setSnap(editPoints[0], options.snapEndsToPath);
                setSnap(editPoints[editPoints.length - 1], options.snapEndsToPath);
            }
        }
        //Helper functions
        var eventListeners = [];
        obj.on = function(event, callback) {
            mapObject.addListener(event, function(e) {
                var response = {};
                if(e.position) response.position = convertFromPosition(e.position);
                else if(e.latLng) response.position = convertFromPosition(e.latLng);
                callback.call(obj, response);
            });
            eventListeners.push({ event: event, callback: callback });
        };
        obj.removeListener = function(event, callback) {
            for(var i = 0; i < eventListeners.length; i++) {
                var listener = eventListeners[i];
                if(listener.event === event && listener.callback === callback) {
                    mapObject.removeListener(event, callback);
                    return;
                }
            }
        };
        obj.setOptions = function(options) {
            for(var i = 0; i < mapObjects.length; i++) mapObjects[i].setOptions(getOptions(options));
        };
        obj.setPosition = function(position) {
            for(var i = 0; i < mapObjects.length; i++) mapObjects[i].setPosition(convertPosition(position));
        };
        obj.setTitle = function(title) {
            mapObject.setTitle(title);
        };
        obj.getPosition = function() {
            return convertFromPosition(mapObject.getPosition());
        };
        obj.getPath = function() {
            var path = mapObject.getPath(), newPath = [];
            path.forEach(function(position, index) {
                newPath[index] = convertFromPosition(position);
            });
            return newPath;
        };
        obj.getBounds = function() {
            var path = obj.getPath();
            var minBound = clonePosition(path[0]);
            var maxBound = clonePosition(path[0]);
            for(var i = 1; i < path.length; i++) {
                var point = path[i];
                if(point[0] < minBound[0]) minBound[0] = point[0];
                else if(point[0] > maxBound[0]) maxBound[0] = point[0];
                if(point[1] < minBound[1]) minBound[1] = point[1];
                else if(point[1] > maxBound[1]) maxBound[1] = point[1];
            }
            return [ minBound, maxBound ];
        };
        obj.visible = !!options.show;
        obj.show = function() {
            if(obj.visible) return;
            obj.visible = true;
            for(var i = 0; i < mapObjects.length; i++) {
                var mapObject = mapObjects[i];
                if(!mapObject.hidden) mapObject.setMap(map);
            }
        };
        obj.hide = function() {
            if(!obj.visible) return;
            obj.visible = false;
            for(var i = 0; i < mapObjects.length; i++) mapObjects[i].setMap(null);
        };
    }
    me.Marker = function(options) { createMapObject(this, google.maps.Marker, options); };
    me.Polygon = function(options) {
        createMapObject(this, google.maps.Polygon, options);
        this.pan = function() {
            var bounds = new google.maps.LatLngBounds();
            var points = this.real.getPath().getArray();
            for (var i = 0; i < points.length; i++) {
                bounds.extend(points[i]);
            }
            map.fitBounds(bounds);
            map.panToBounds(bounds);
        };
        if(options.pan) this.pan();
        this.pointIsInside = function(point) {
            var position = convertPosition(point);
            return google.maps.geometry.poly.containsLocation(position, this.real);
        };
    };
    me.Polyline = function(options) { createMapObject(this, google.maps.Polyline, options); };
    me.Label = function(options) { createMapObject(this, LabelOverlay, options); };
    me.Snapper = function(options) { createMapObject(this, SnapperOverlay, options); };
    me.Info = function(options) { createMapObject(this, google.maps.InfoWindow, options); };
    
    //Info Window
    var info = me.info = new function() {
        var content = this.content = document.createElement('DIV');
        content.className = "info";
        var infoWindow = new google.maps.InfoWindow({ content: content });
        this.open = function(marker) { infoWindow.open(map, marker.real); };
        this.close = function() { infoWindow.close(); };
    };
    
    //Geocode address
    var toGeocode = [], geoStamp = null;
    me.geocode = function(address, success, failure) {
        //A loop is used to stop many requests hitting the query limit
        toGeocode.push({ address: address, success: success, failure: failure });
        if(!geoStamp) geocodeLoop();
    };
    function geocodeLoop() {
        if(toGeocode.length) {
            geocodeGo(toGeocode[0]);
            geoStamp = setTimeout(geocodeLoop, 1000);
            toGeocode.splice(0, 1);
        }
        else geoStamp = null;
    }
    function geocodeGo(geocodeMe) {
        geocoder.geocode( { address: geocodeMe.address }, function(results, status) {
            if(status == google.maps.GeocoderStatus.OK) {
                var result = {
                    position: convertFromPosition(results[0].geometry.location),
                    address: results[0].formatted_address
                };
                if(geocodeMe.success) geocodeMe.success(result);
            }
            else {
                console.log('Geocode Error: ' + status);
                if(geocodeMe.failure) geocodeMe.failure();
            }
        });
    }
    
    //Directions service
    var dr = me.dr = new google.maps.DirectionsRenderer({ preserveViewport: true });
    me.getDirections = function(options) {
        var request = {};
        if(options.origin !== undefined) request.origin = options.origin;
        if(options.destination !== undefined) request.destination = options.destination;
        if(options.waypoints !== undefined) request.waypoints = options.waypoints;
        else request.waypoints = [];
        if(options.travelMode !== undefined) request.travelMode = options.travelMode;
        else request.travelMode = google.maps.TravelMode.DRIVING;
        if(options.draggable !== undefined) dr.setOptions({ draggable: options.draggable });
        else dr.setOptions({ draggable: true });
        if(options.pan) dr.setOptions({ preserveViewport: false });
        directions.route(request, function(result, status) {
            if(status != google.maps.DirectionsStatus.OK) return;
            var data = [];
            var path = [], overview = result.routes[0].overview_path;
            for(var i = 0; i < overview; i++) {
                path.push(convertFromPosition(overview[i]));
            }
            data[0] = {};
            data[0].path = path;
            if(options.show) {
                dr.setDirections(result);
                if(options.element) {
                    options.element.innerHTML = "";
                    dr.setPanel(options.element);
                }
                dr.setMap(map);
            }
            info.close();
            if(options.callback) options.callback(data);
        });
    };
    me.showDirections = function(element) {
        dr.setOptions({ preserveViewport: true });
        dr.setMap(map);
    };
    me.hideDirections = function() {
        dr.setMap(null);
        dr.setPanel(null);
    };
    
    //KML Reader
    var KML = me.KML = function(options) {
        var newOptions = {};
        if(options.show) newOptions.map = map;
        if(!options.pan) newOptions.preserveViewport = true;
        var kml = this.kml = new google.maps.KmlLayer(newOptions);
        this.open = function(url) { kml.setUrl(url); };
    };
    
    //Utility functions
    function convertPosition(position) {
        return new google.maps.LatLng(position[0], position[1]);
    }
    function convertFromPosition(position) {
        return [ position.lat(), position.lng() ];
    }
    function clonePosition(position) {
        return [ position[0], position[1] ];
    }
    me.clonePosition = clonePosition;
    function clonePath(path) {
        var clonedPath = [];
        for(var i = 0, length = path.length; i < length; i++) {
            clonedPath[i] = clonePosition(path[i]);
        }
        return clonedPath;
    }
    me.clonePath = clonePath;
    var overlay = new google.maps.OverlayView();
    function positionToPixel(position) {
        var overlayProjection = overlay.getProjection();
        var latLng = convertPosition(position);
        var pixelPosition = overlayProjection.fromLatLngToDivPixel(latLng);
        return [ pixelPosition.x, pixelPosition.y ];
    }
    me.positionToPixel = positionToPixel;
    
    //Create the map and relevent services
    var mapOptions = {
        center: convertPosition([ -27.42558997444417, 153.05507218822197 ]),
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.MAP,
        panControl: false,
        streetViewControl: true,
        streetViewControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        zoomControl: true,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.SMALL,
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        mapTypeControl: true,
        styles: [{
            featureType: "poi",
            stylers: [{ visibility: "off" }]
        }]
    };
    var map = me.map = new google.maps.Map(element, mapOptions);
    me.on = function(event, callback) {
        map.addListener(event, function(e) {
            var response = {};
            if(e.position) response.position = convertFromPosition(e.position);
            callback(response);
        });
    };
    var geocoder = new google.maps.Geocoder();
    var directions = new google.maps.DirectionsService();
    
    //Create the form control
    var form = document.createElement('DIV');
    form.id = "form";
    Form.element = form;
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(form);
    
    //Create the overlay used to get distance from mouse to snapper
    overlay.draw = function() {};
    overlay.setMap(map);
    snapOverlay = new google.maps.OverlayView();
    snapOverlay.draw = function() {};
    snapOverlay.setMap(map);
    
    //Create the snap overlay
    function SnapperOverlay(params) {
        this.position = params.position;
        this.map_ = params.map;
        this.div_ = null;
        if(params.map) this.setMap(params.map);
    }
    SnapperOverlay.prototype = new google.maps.OverlayView();
    SnapperOverlay.prototype.onAdd = function() {
        var div = document.createElement('DIV');
        div.className = "snapper";
        this.div_ = div;
        var overlayProjection = this.getProjection();
        var position = overlayProjection.fromLatLngToDivPixel(this.position);
        div.style.position = "absolute";
        div.style.left = position.x + 'px';
        div.style.top = position.y + 'px';
        var panes = this.getPanes();
        panes.floatPane.appendChild(div);
    };
    SnapperOverlay.prototype.draw = function() {
        var overlayProjection = this.getProjection();
        var position = overlayProjection.fromLatLngToDivPixel(this.pos);
        var div = this.div_;
        div.style.left = (position.x - div.offsetWidth / 2) + 'px';
        div.style.top = (position.y - div.offsetHeight / 2) + 'px';
    };
    SnapperOverlay.prototype.onRemove = function() {
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
    };
    SnapperOverlay.prototype.hide = function() {
        if(this.div_) this.div_.style.visibility = "hidden";
    };
    SnapperOverlay.prototype.show = function() {
        if(this.div_) this.div_.style.visibility = "visible";
    };
    SnapperOverlay.prototype.toggle = function() {
        if(this.div_) {
            if(this.div_.style.visibility == "hidden") this.show();
            else this.hide();
        }
    };
    SnapperOverlay.prototype.toggleDOM = function() {
        if(this.getMap()) this.setMap(null);
        else this.setMap(this.map_);
    };
    
    //Create the label overlay (used for area names)
    //http://code.google.com/apis/maps/documentation/javascript/overlays.html#CustomOverlays
    function LabelOverlay(params) {
        this.pos = params.position || convertPosition([ 0, 0 ]);
        this.txt_ = params.title;
        this.cls_ = params.className || "label";
        this.map_ = params.map;
        this.size = params.size || 18;
        this.setMap(params.map);
        
        var div = document.createElement('DIV');
        div.className = this.cls_;
        div.innerHTML = this.txt_;
        this.div_ = div;
    }
    LabelOverlay.prototype = new google.maps.OverlayView();
    LabelOverlay.prototype.onAdd = function() {
        var overlayProjection = this.getProjection();
        var position = overlayProjection.fromLatLngToDivPixel(this.pos);
        var div = this.div_;
        if(!div) {
            div = document.createElement('DIV');
            div.className = this.cls_;
            div.innerHTML = this.txt_;
            this.div_ = div;
        }
        div.style.position = "absolute";
        div.style.fontSize = this.size + 'px';
        div.style.fontWeight = 'bold';
        //Get label size
        div.style.left = div.style.top = "-1000px";
        document.body.appendChild(div);
        this.pixelSize = [ div.offsetWidth, div.offsetHeight ];
        div.style.left = position.x + "px";
        div.style.top = position.y + "px";
        if(this.marginTop) div.style.marginTop = this.marginTop;
        var panes = this.getPanes();
        panes.overlayImage.appendChild(div);
    };
    LabelOverlay.prototype.draw = function() {
        var overlayProjection = this.getProjection();
        if(!overlayProjection) return;
        var position = overlayProjection.fromLatLngToDivPixel(this.pos);
        var div = this.div_;
        div.style.left = (position.x - div.offsetWidth / 2) + 'px';
        div.style.top = (position.y - div.offsetHeight / 2) + 'px';
    };
    LabelOverlay.prototype.onRemove = function(){
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
    };
    LabelOverlay.prototype.hide = function(){
        if(this.div_) this.div_.style.visibility = "hidden";
    };
    LabelOverlay.prototype.show = function(){
        if(this.div_) this.div_.style.visibility = "visible";
    };
    LabelOverlay.prototype.toggle = function(){
        if(this.div_) {
            if (this.div_.style.visibility == "hidden") this.show();
            else this.hide();
        }
    };
    LabelOverlay.prototype.toggleDOM = function(){
        if(this.getMap()) this.setMap(null);
        else this.setMap(this.map_);
    };
    LabelOverlay.prototype.setPosition = function(position) {
        this.pos = position;
        this.draw();
    };
    LabelOverlay.prototype.setTitle = function(title) {
        this.txt_ = title;
        if(this.div_) {
            this.div_.innerHTML = title;
            this.draw();
        }
    };
};