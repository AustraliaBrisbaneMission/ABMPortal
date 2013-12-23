var Map = function(element) {
    var me = this;
    
    //Map functions
    me.pan = function(position) {
        map.panTo(convertPosition(position));
    };
    
    //Creates map objects
    function createMapObject(obj, type, options) {
        function getOptions(options) {
            var newOptions = {}, optionList = {
                title: 'title',
                clickable: 'clickable',
                draggable: 'draggable',
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
                else if(i == "paths") {
                    var paths = [];
                    for(var a = 0; a < options.paths.length; a++) {
                        paths.push(convertPosition(options.paths[a]));
                    }
                    newOptions.paths = paths;
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
                        title: options.label,
                        size: 12
                    };
                    if(options.position) labelOptions.position = convertPosition(options.position);
                    var label = new me.Label(labelOptions);
                    label.marginTop = (options.icon ?
                        options.icon.size[1] : 16) + "px";
                    mapObjects.push(label.real);
                }
            }
            return newOptions;
        }
        var mapObjects = [ {} ];
        var mapObject = obj.real = new type(getOptions(options));
        mapObjects[0] = mapObject;
        obj.on = function(event, callback) {
            mapObject.addListener(event, function(e) {
                var response = {};
                if(e.position) response.position = convertFromPosition(e.position);
                callback(response);
            });
        };
        obj.setOptions = function(options) {
            for(var i in mapObjects) mapObjects[i].setOptions(getOptions(options));
        };
        obj.getPosition = function() {
            return convertFromPosition(mapObject.getPosition());
        };
        obj.visible = !!options.show;
        obj.show = function() {
            if(obj.visible) return;
            obj.visible = true;
            for(var i in mapObjects) mapObjects[i].setMap(map);
        };
        obj.hide = function() {
            if(!obj.visible) return;
            obj.visible = false;
            for(var i in mapObjects) mapObjects[i].setMap(null);
        };
    };
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
        }
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
    me.geocode = function(address, callback) {
        //A loop is used to stop many requests hitting the query limit
        toGeocode.push({ address: address, callback: callback });
        if(!geoStamp) geocodeLoop();
    };
    function geocodeLoop() {
        if(toGeocode.length) {
            geocodeGo(toGeocode[0].address, toGeocode[0].callback);
            geoStamp = setTimeout(geocodeLoop, 1000);
            toGeocode.splice(0, 1);
        }
        else geoStamp = null;
    }
    function geocodeGo(address, successCallback) {
        geocoder.geocode( { address: address }, function(results, status) {
            if(status == google.maps.GeocoderStatus.OK) {
                var result = {
                    position: convertPosition(results[0].geometry.location)
                };
                successCallback(results);
            }
            else console.log('Geocode Error: ' + status);
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
        this.div_ = null;
        this.size = params.size || 18;
        this.setMap(params.map);
    }
    LabelOverlay.prototype = new google.maps.OverlayView();
    LabelOverlay.prototype.onAdd = function() {
        var div = document.createElement('DIV');
        div.className = this.cls_;
        div.innerHTML = this.txt_;
        this.div_ = div;
        var overlayProjection = this.getProjection();
        var position = overlayProjection.fromLatLngToDivPixel(this.pos);
        div.style.position = "absolute";
        div.style.left = position.x + 'px';
        div.style.top = position.y + 'px';
        div.style.fontSize = this.size + 'px';
        div.style.fontWeight = 'bold';
        var panes = this.getPanes();
        panes.overlayImage.appendChild(div);
    };
    LabelOverlay.prototype.draw = function(){
        var overlayProjection = this.getProjection();
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
};