var Cluster = function(map) {
    var me = this;
    var gridSize = 100;
    var wait = 1000;
    var labels = [];
    //This is used to get grid size
    var overlay = new google.maps.OverlayView();
    overlay.draw = function() {};
    overlay.setMap(map.map);
    //Calculate only once
    var timeout = null;
    me.calculate = function() {
        if(timeout) clearTimeout(timeout);
        timeout = setTimeout(go, wait);
    };
    //Calculates and clusters markers
    function go() {
        timeout = null;
        //Get the grid size
        var zoom = map.map.getZoom();
        var projection = overlay.getProjection();
        var a = projection.fromContainerPixelToLatLng(new google.maps.Point(0, 0));
        var b = projection.fromContainerPixelToLatLng(new google.maps.Point(0, gridSize));
        var boxSize = a.lat() - b.lat();
        //Remove previous cluster labels
        for(var a = 0; a < labels.length; a++) labels[a].hide();
        labels = [];
        //Loop through each form
        for(var a = 0; a < Form.forms.length; a++) {
            var form = Form.forms[a];
            if(!form.visible) continue;
            var boxes = [];
            //Get each form item
            for(var b = 0; b < form.items.length; b++) {
                var item = form.items[b];
                if(!item.marker) continue;
                //Check if the marker is in any cluster boxes
                var position = item.marker.getPosition();
                var x = position[0], y = position[1];
                var inBox = false;
                if(form.currentItem != item) {
                    for(var c = 0; c < boxes.length; c++) {
                        var box = boxes[c];
                        var x1 = box.x1, x2 = box.x2, y1 = box.y1, y2 = box.y2;
                        //If it is in the box, add the item
                        if(x > x1 && x < x2 && y > y1 && y < y2) {
                            inBox = true;
                            box.items.push(item);
                            item.marker.hide();
                            break;
                        }
                    }
                }
                //If it is not in the box, make a new box
                if(!inBox) {
                    boxes.push({
                        items: [ item ],
                        label: null,
                        x: x,
                        y: y,
                        x1: x - boxSize / 2,
                        x2: x + boxSize / 2,
                        y1: y - boxSize / 2,
                        y2: y + boxSize / 2
                    });
                    item.marker.show();
                }
            }
            for(var c = 0; c < boxes.length; c++) {
                var box = boxes[c];
                var count = box.items.length;
                if(count == 1) continue;
                box.label = new map.Label({
                    show: true,
                    title: count,
                    position: box.items[0].marker.getPosition(),
                    className: "cluster",
                    size: 14
                });
                labels.push(box.label);
            }
        }
    }
    map.map.addListener('zoom_changed', function(e) { me.calculate(); });
    //calculate(0);
};