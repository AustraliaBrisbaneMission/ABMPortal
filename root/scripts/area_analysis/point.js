var PointPicker = function(elements, pickedResult, searchFields, directions) {
    var me = this;
    me.setElements = function(newElements) {
        if(typeof newElements == "string") {
            newElements = [ document.getElementById(newElements) ];
        }
        else if(typeof newElements == "object") {
            for(var i = 0; i < newElements.length; i++) {
                if(typeof newElements[i] == "string") {
                    newElements[i] = document.getElementById(newElements[i]);
                }
            }
        }
        else return;
        elements = newElements;
    };
    me.setElements(elements);
    if(typeof form == "string") form = document.getElementById(form);
    me.elements = elements;
    var element = elements[0];
    
    //Work out which properties to search
    if(!pickedResult) pickedResult = "name";
    
    function pick(item) {
        PointPicker.picking = me;
        element = item;
        predict();
    }
    
    function unpick() {
        PointPicker.picking = null;
        unpredict();
    }
    
    function next() {
        unpick();
        for(var i = 0; i < elements.length; i++) {
            if(elements[i] == element) {
                if(directions) Directions.checkPoints();
                if(i < elements.length - 1) elements[i + 1].focus();
                else element.blur();
                return;
            }
        }
    }
    
    var predictionBox = null;
    function predict() {
        var value = element.value;
        if(value === null || value === "") { unpredict(); return; }
        
        //Create the prediction box
        if(!predictionBox) {
            var BORDER = 1;
            var PADDING = 4;
            
            var box = document.createElement('DIV');
            box.className = "prediction";
            var top = element.offsetHeight, left = 0, node = element;
            while(node != document.body) {
                left += node.offsetLeft;
                top += node.offsetTop;
                node = node.offsetParent;
            }
            node = element;
            while(node != document.body) {
                left -= node.scrollLeft;
                top -= node.scrollTop;
                node = node.parentNode;
            }
            box.style.top = top + "px";
            box.style.left = left + "px";
            box.style.width = (element.offsetWidth - (BORDER + PADDING) * 2) + "px";
            box.addEventListener('mousedown', function(e) { e.preventDefault(); }, false);
            document.body.appendChild(box);
            predictionBox = box;
        }
        
        //Get the predicted items
        var items = [], valueLower = value.toLowerCase();
        function check(value) {
            if(typeof value == "string" && value.toLowerCase().indexOf(valueLower) >= 0) {
                items.push(item);
                return true;
            }
            return false;
        }
        for(var a = 0; a < Form.forms.length; a++) {
            var form = Form.forms[a];
            for(var b = 0; b < form.items.length; b++) {
                var item = form.items[b];
                if(!item[pickedResult] && (!directions || !item.position)) continue;
                if(searchFields) for(var c = 0; c < searchFields.length; c++) {
                    if(check(item[searchFields[c]])) break;
                }
                else for(var key in item) if(check(item[key])) break;
            }
        }
        
        //Google maps search for address
        items.push({ name: value, form: AddressSearch });
        
        //Display the predicted items
        predictionBox.innerHTML = "";
        if(!items.length) predictionBox.innerHTML = "No Results";
        element.item = items[0];
        for(var a = 0; a < items.length; a++) {
            var item = items[a];
            var name = document.createElement('SPAN');
            name.className = "prediction_name";
            name.textContent = item.name;
            var type = document.createElement('SPAN');
            type.className = "prediction_type";
            type.textContent = item.form.displayName;
            var container = document.createElement('DIV');
            container.appendChild(name);
            container.appendChild(type);
            var link = document.createElement('A');
            link.href = "#" + item[pickedResult];
            link.item = item;
            link.value = item[pickedResult];
            link.addEventListener('click', function(e) {
                e.preventDefault();
                element.value = this.value;
                if(element.onPick) element.onPick(this.item, this.item.form);
                next();
            }, false);
            link.appendChild(container);
            predictionBox.appendChild(link);
        }
    }
    function unpredict() {
        if(!predictionBox) return;
        document.body.removeChild(predictionBox);
        predictionBox = null;
    }
    
    //Sets the value of the element and stops picking
    me.set = function(value) {
        element.value = value;
        setTimeout(next, 0);
    };
    
    function stopUnfocusing(e) {
        var element = e.target;
        while(element != Form.element && element != map.info.content) {
            if(element == mapContainer) {
                e.preventDefault();
                return;
            }
            element = element.parentNode;
        }
    }
    function blur(e) {
        unpick();
        mapContainer.removeEventListener('mousedown', stopUnfocusing, false);
    }
    function focus(e) {
        mapContainer.addEventListener('mousedown', stopUnfocusing, false);
        pick(e.target);
    }
    function enter(e) {
        if(e.keyCode == 13 && this.item) element.onPick(this.item, this.item.form);
    }
    me.addEvents = function(element) {
        element.addEventListener('focus', focus, false);
        element.addEventListener('blur', blur, false);
        element.addEventListener('keyup', predict, false);
        element.addEventListener("keydown", enter, false);
    };
    
    for(var i = 0; i < elements.length; i++) {
        if(elements[i].type != "submit") me.addEvents(elements[i]);
    }
};
PointPicker.picking = null;
PointPicker.addClick = function(element, value) {
    function click() {
        if(PointPicker.picking) PointPicker.picking.set(value);
    }
    element.on('mousedown', click);
};