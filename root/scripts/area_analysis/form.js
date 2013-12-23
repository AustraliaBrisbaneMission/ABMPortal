var Form = function(properties) {
    var form = this;
    Form.forms.push(form);
    form.name = properties.name;
    form.displayName = capitalise(form.name);
    form.fields = properties.fields;
    form.mapElements = properties.mapElements || [];
    form.noDisplay = properties.noDisplay || false;
    form.noDb = properties.noDb || false;
    form.items = [];
    form.editing = {
        data: {},
        action: null,
        callback: null
    };
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
    form.onCreate = properties.onCreate || function() {};
    form.onCreateCancel = function(e) {
        if(properties.onCreateCancel) properties.onCreateCancel(e);
        if(properties.onAllClose) properties.onAllClose(e);
    };
    form.onEdit = properties.onEdit || function() {};
    form.onEditCancel = function(e) {
        if(properties.onEditCancel) properties.onEditCancel(e);
        if(properties.onAllClose) properties.onAllClose(e);
    };
    form.onRemove = properties.onRemove || function() {};
    form.onInitialise = properties.onInitialise || function(items) { return items; };
    form.onItemInitialise = properties.onItemInitialise || function(item) { return item; };
    form.onShow = properties.onShow || function() {};
    form.onHide = properties.onHide || function() {};
    if(properties.variables) {
        $.each(properties.variables, function(name, value) {
            form[name] = value;
        });
    }
    form.open = function(itemIndex) {
        if(Form.openForm && Form.openForm != form) Form.openForm.destroy();
        Form.openForm = form;
        if(!form.visible) form.show();
        var html = "<table>", item, value;
        if(form.state == "open") form.onClose();
        else if(form.state == "edit") form.onEditCancel();
        else if(form.state == "create") form.onCreateCancel();
        if(itemIndex === undefined) {
            item = form.currentItem = null;
            form.currentItemIndex = 0;
            form.editing = { data: {}, action: null, callback: null };
        }
        else {
            if(isNaN(itemIndex)) {
                $.each(form.items, function(i, item) {
                    if(item == itemIndex) {
                        itemIndex = i;
                        return false;
                    }
                })
            }
            item = form.currentItem = form.items[itemIndex];
            form.currentItemIndex = itemIndex;
            form.onOpen();
            if(cluster) cluster.calculate();
        }
        map.info.close();
        if(!form.noDisplay) Form.toggle(true);
        if(form.noDisplay || form.noDb) return;
        $.each(form.fields, function(name, type) {
            if(type.noDisplay) return;
            value = item ? item[name] : "";
            html += '<tr><td>' + capitalise(name) + ':</td>' +
                '<td id="' + form.name + '_' + name + '_field">' +
                form.getFieldHTML(name) + '</td></tr>';
        });
        html += '<tr><td></td><td id="buttons"></td></tr>';
        $('#form_open').html(html + '</table>');
        if(item) {
            $('#buttons').append(
                $('<input type="button" value="Edit ' + form.displayName + '" />').click(form.edit),
                $('<input type="button" value="Close" />').click(form.close)
            );
        }
        else {
            $('#buttons').append(
                $('<input type="button" value="New ' + form.displayName + '" />').click(form.create)
            );
        }
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
    form.create = function() {
        form.editing = { data: {}, action: null, callback: null };
        $.each(form.fields, function(name, type) {
            form.editing.data[name] = type.defaultValue;
        });
        form.onCreate();
        $.each(form.fields, function(name, type) {
            if(type.noDisplay) return;
            $('#' + form.name + '_' + name).attr({ disabled: false });
            $('#buttons').empty().append(
                $('<input type="button" value="Add ' + form.displayName + '" />').click(form.add),
                $('<input type="button" value="Cancel" />').click(form.open)
            );
        });
        form.state = "create";
    };
    form.add = function() {
        form.save("insert", function(response) {
            form.items.push(form.onItemInitialise(response[0]));
            form.renderList();
            form.open(form.items.length - 1);
        });
    };
    form.edit = function() {
        form.onEdit();
        $.each(form.fields, function(name, type) {
            if(type.noDisplay) return;
            $('#' + form.name + '_' + name).attr({ disabled: false });
            $('#buttons').empty().append(
                $('<input type="button" value="Update ' + form.displayName + '" />').click(form.update),
                $('<input type="button" value="Cancel" />').click(form.reset),
                $('<input type="button" value="DELETE" style="float:right" />').click(form.remove)
            );
        });
        form.state = "edit";
    };
    form.update = function() {
        form.save("update", function(response) {
            form.items.splice(form.currentItemIndex, 1, form.onItemInitialise(response[0]));
            form.renderList();
            form.open(form.currentItemIndex);
        });
    };
    form.save = function(action, callback) {
        form.editing = {
            data: {},
            action: action,
            callback: callback
        };
        form.state = "waiting";
        $.each(form.fields, function(name, type) {
            if(type.getValueToSave) type.getValueToSave();
            else form.setValueToSave(name, $('#' + form.name + '_' + name).val());
        });
    };
    form.reset = function() {
        form.open(form.currentItemIndex);
    };
    form.remove = function() {
        var text = "Are you sure you want to delete " +
            form.currentItem.name + "?";
        if(!confirm(text)) return;
        $.ajax({
            type: "POST",
            url: "/area_analysis/db",
            data: { action: "remove", collection: form.name, id: form.currentItem._id },
            success: function(response) {
                form.onRemove();
                form.items.splice(form.currentItemIndex, 1);
                form.renderList();
                form.open();
            }
        });
        $('#buttons').html("Deleting...");
    };
    form.getFieldHTML = function(fieldName) {
        var field = form.fields[fieldName];
        if(field.render) return field.render();
        else {
            return '<input type="' + field + '" id="' + form.name + '_' + fieldName + '" ' +
                (form.currentItem ? 'value="' + form.currentItem[fieldName] + '" ' : '') +
                'disabled="true" />';
        }
    };
    form.updateField = function(fieldName) {
        $('#' + form.name + '_' + fieldName + '_field').html(form.getFieldHTML(fieldName));
    };
    form.renderList = function() {
        form.list.innerHTML = "";
        var list = $(form.list);
        $.each(form.items, function(index, item) {
            list.append($('<li></li>').append($('<a></a>').attr({
                href: "#" + item.name
            }).text(item.name).click(function(e) {
                form.open(index);
                e.preventDefault();
            })));
        });
    };
    form.show = function() {
        for(var i = 0; i < form.mapElements.length; i++) {
            form.mapElements[i].show();
        }
        form.showCheckbox.checked = form.visible = true;
        if(cluster) cluster.calculate();
        form.onShow();
    };
    form.hide = function() {
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
            var items = form.onInitialise(response);
            $.each(items, function(index, item) {
                item.form = form;
                form.items.push(form.onItemInitialise(item));
            });
            if(cluster) cluster.calculate();
            form.renderList();
            form.ready = true;
        }
        //Get items from database
        if(!form.noDb) $.ajax({
            type: "POST",
            url: "/area_analysis/db",
            data: { action: "getall", collection: form.name },
            success: success
        });
        //Add form to list
        var container = document.createElement('DIV');
        container.className = "list_container";
        var headingContainer = document.createElement('DIV');
        headingContainer.className = "heading";
        var heading = document.createElement('H3');
        heading.textContent = form.displayName;
        headingContainer.appendChild(heading);
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
    form.setValueToSave = function(field, value) {
        form.editing.data[field] = value;
        if(!form.editing.action) return;
        if(form.state == "waiting") form.checkFields();
    };
    form.checkFields = function() {
        var finished = true;
        $.each(form.fields, function(field, type) {
            if(form.editing.data[field] === undefined) {
                finished = false;
                return false;
            }
        });
        if(!finished) return;
        var data = {
            collection: form.name,
            action: form.editing.action,
            data: form.editing.data,
            id: form.currentItem ? form.currentItem._id : null
        };
        $.ajax({
            type: "POST",
            url: "/area_analysis/db",
            data: data,
            success: form.editing.callback
        });
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