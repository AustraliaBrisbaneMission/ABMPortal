var Form = function(properties) {
    var form = this;
    Form.forms.push(form);
    form.name = properties.name;
    form.displayName = properties.displayName || form.name;
    form.fields = properties.fields;
    form.mapElements = properties.mapElements || [];
    form.noDisplay = properties.noDisplay || false;
    form.noDb = properties.noDb || false;
    form.labels = properties.labels;
    form.items = [];
    form.ready = false;
    form.currentItem = null;
    form.currentItemIndex = 0;
    form.visible = properties.show !== undefined ? properties.show : true;
    form.showCheckbox = null;
    form.state = "closed";
    form.onOpen = properties.onOpen || function() {};
    form.onClose = function(e) {
        if(properties.onClose) properties.onClose(e);
        if(properties.onAllClose) properties.onAllClose(e);
    };
    form.onInitialise = properties.onInitialise || function(items) { return items; };
    form.onItemInitialise = properties.onItemInitialise || function(item) { return item; };
    form.onShow = properties.onShow || function() {};
    form.onHide = properties.onHide || function() {};
    if(properties.variables) {
        $.each(properties.variables, function(value, name) {
            form[name] = value;
        });
    }
    form.open = function(itemIndex) {
        if(Form.openForm && Form.openForm != form) Form.openForm.destroy();
        Form.openForm = form;
        if(!form.visible) form.show();
        var item;
        if(form.state == "open") form.onClose();
        if(itemIndex === undefined) {
            item = form.currentItem = null;
            form.currentItemIndex = 0;
        }
        else {
            if(isNaN(itemIndex)) {
                var items = form.items;
                if(typeof itemIndex == "string") {
                    for(var i = 0, len = items.length; i < len; i++) {
                        if(items[i].name == itemIndex) {
                            itemIndex = i;
                            break;
                        }
                    }
                }
                else {
                    for(var i = 0, len = items.length; i < len; i++) {
                        if(items[i] == itemIndex) {
                            itemIndex = i;
                            break;
                        }
                    }
                }
            }
            item = form.currentItem = form.items[itemIndex];
            form.currentItemIndex = itemIndex;
            form.onOpen();
            if(cluster) cluster.calculate();
        }
        map.info.close();
        //if(form.render)
        if(!form.noDisplay) Form.toggle(true);
        if(form.noDisplay || form.noDb) return;
        //Display the table
        var table = document.createElement("TABLE");
        table.className = "item";
        $.each(form.fields, function(field, fieldName) {
            if(field.noDisplay) return;
            var value = "";
            if(item) {
                value = item[fieldName];
                if(form.fields[fieldName].render) {
                    value = form.fields[fieldName].render(value);
                }
            }
            var row = document.createElement("TR");
            var cell = document.createElement("TD");
            var displayName = field.displayName || fieldName;
            cell.textContent = displayName + ": ";
            row.appendChild(cell);
            cell = document.createElement("TD");
            if(typeof value == "string") cell.textContent = value;
            else if(value) cell.appendChild(value);
            else cell.textContent = "";
            row.appendChild(cell);
            table.appendChild(row);
        });
        document.getElementById("form_open").innerHTML = "";
        document.getElementById("form_open").appendChild(table);
        form.state = "open";
    };
    form.destroy = function() {
        Form.currentForm.innerHTML = "";
        form.onClose();
        form.state = "closed";
    };
    form.close = function() {
        form.destroy();
        form.open();
    };
    form.reset = function() {
        form.open(form.currentItemIndex);
    };
    function listItemClicked(e) {
        e.preventDefault();
        form.open(this.index);
    }
    form.renderList = function() {
        form.list.innerHTML = "";
        $.each(form.items, function(item, index) {
            var a = $.create("A", { href: "#" + item.name }, item.name);
            a.index = index;
            a.on("click", listItemClicked);
            $.create("LI", { parent: form.list }, a);
        });
    };
    form.show = function() {
        if(form.noDisplay) return;
        for(var i = 0; i < form.mapElements.length; i++) {
            form.mapElements[i].show();
        }
        form.showCheckbox.checked = form.visible = true;
        if(cluster) cluster.calculate();
        form.onShow();
    };
    form.hide = function() {
        if(form.noDisplay) return;
        for(var i = 0; i < form.mapElements.length; i++) {
            form.mapElements[i].hide();
        }
        form.showCheckbox.checked = form.visible = false;
        if(cluster) cluster.calculate();
        form.onHide();
    };
    form.initialise = function() {
        if(form.noDisplay) return;
        //Sorts and adds items to form
        function success(response) {
            response = response.sort(function(a, b) {
                if(a.name > b.name) return 1;
                if(a.name < b.name) return -1;
                return 0;
            });
            var items = form.items = response;
            form.onInitialise(items);
            $.each(items, function(item, index) {
                item.form = form;
                form.onItemInitialise(item);
            });
            if(cluster) cluster.calculate();
            form.renderList();
            form.ready = true;
        }
        //Get items from database
        if(!form.noDb) $.post("/maps/db", {
            action: "getall",
            collection: form.name
        }, success);
        //Add form to list
        var container = document.createElement('DIV');
        container.className = "list_container";
        var headingContainer = document.createElement('DIV');
        headingContainer.className = "heading";
        var heading = document.createElement('H3');
        heading.textContent = form.displayName;
        headingContainer.appendChild(heading);
        //Show labels option
        if(form.labels !== undefined) {
            var toggle = document.createElement("A");
            toggle.href = "#Toggle Labels";
            toggle.className = "labelToggle";
            function labelsToggled(e) {
                e.preventDefault();
                form.labels = !form.labels;
                toggle.textContent = "Labels: " + (form.labels ? "On" : "Off");
                var items = form.items;
                for(var i = 0, length = items.length; i < length; i++) {
                    var item = items[i];
                    if(item.marker && item.marker.label) {
                        var marker = item.marker;
                        var label = marker.label;
                        label.hidden = true;
                        if(marker.visible) form.labels ? label.show() : label.hide();
                    }
                }
            }
            toggle.textContent = "Labels: " + (form.labels ? "On" : "Off");
            toggle.addEventListener("click", labelsToggled, false);
        }
        //Show checkbox
        var show = form.showCheckbox = document.createElement('INPUT');
        show.type = "checkbox";
        show.addEventListener('change', function(e) {
            this.checked ? form.show() : form.hide();
        }, false);
        show.checked = form.visible;
        headingContainer.appendChild(show);
        container.appendChild(headingContainer);
        var listContainer = document.createElement('DIV');
        listContainer.className = "list";
        listContainer.style.display = 'none';
        listContainer.form = form;
        listContainer.open = false;
        var list = document.createElement('UL');
        form.list = list;
        listContainer.appendChild(list);
        container.appendChild(listContainer);
        Form.list.appendChild(container);
        headingContainer.addEventListener('mousedown', function(e) {
            e.preventDefault();
        }, false);
        headingContainer.addEventListener('click', function(e) {
            listContainer.open = !listContainer.open;
            listContainer.style.display = listContainer.open ? '' : 'none';
            headingContainer.className = "heading" + (listContainer.open ? " open" : "");
        }, false);
        show.addEventListener('click', function(e) {
            e.stopPropagation();
        }, false);
        if(form.noDb) success([]);
    };
};
Form.forms = [];
Form.openForm = null;
Form.toggled = true;
Form.toggle = function(show) {
    Form.toggled = show !== undefined ? show : !Form.toggled;
    Form.currentForm.style.display = Form.list.style.display = Form.toggled ? '' : 'none';
};
//Elements
Form.element = null;
Form.list = null;
Form.currentForm = null;
Form.checkReady = function() {
    for(var i = 0; i < Form.forms.length; i++) {
        if(!Form.forms[i].ready) return;
    }
    for(var a = 0; a < Form.forms.length; a++) {
        var form = Form.forms[i];
        for(var b = 0; b < form.fields.length; b++) {
            
        }
    }
};
Form.initialiseForms = function() {
    var element = Form.element;
    var formOpen = document.createElement('DIV');
    formOpen.id = "form_open";
    Form.currentForm = formOpen;
    Form.list = document.createElement('DIV');
    Form.list.id = "form_list";
    
    var title = document.createElement('A');
    title.className = "titleLink";
    title.href = "#Open/Close Form";
    title.title = "Open/Close Form";
    title.addEventListener('click', function(e) {
        e.preventDefault();
        Form.toggle();
    }, false);
    title.innerHTML = '<h1>Area Analysis</h1>';
    
    element.appendChild(title);
    element.appendChild(formOpen);
    element.appendChild(Form.list);
    for(var i = 0; i < Form.forms.length; i++) {
        var form = Form.forms[i];
        form.initialise();
        form.visible ? form.show() : form.hide();
    }
};

function createControl() {
    var control = document.createElement('DIV');
    control.className = "control";
    control.textContent = "Click to set ZOOM...";
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(control);
    google.maps.event.addDomListener(control, 'click', function() {
        map.setZoom(5);
    });
}