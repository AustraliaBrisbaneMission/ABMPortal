//Form Object Creator
var formObjects = {};
var FormObject = function(name, dialogFields, onAdd) {
    var me = this;
    me.name = name;
    me.onAdd = function(inputs) { return onAdd.call(me, inputs); };
    me.dialogBox = new DialogBox(me, dialogFields);
    formObjects[name] = me;
};
function objectClicked(e) {
    this.nextSibling.remove();
    this.remove();
}
var Field = function(name, type) { this.name = name; this.type = type; };

//Dialog Boxes (used to add form options)
var openDialog = null;
var DialogBox = function(formObject, fields) {
    var dialog = this;
    dialog.callback = formObject.onAdd;
    dialog.replaced = null;
    var box = dialog.box = $.create("DIV");
    var table = $.create("TABLE", { parent: box });
    var fieldInputs = dialog.inputs = {};
    for(var i = 0; i < fields.length; i++) {
        var field = fields[i], typeElement;
        if(field.type == "text") {
            typeElement = $.create("INPUT", { type: "text" });
        }
        else typeElement = $.create("INPUT", { type: "text" });
        fieldInputs[field.name] = typeElement;
        $.create("TR", { parent: table }, [
            $.create("TD", field.name),
            typeElement
        ]);
    }
    var submit = $.create("BUTTON", { parent: box }, "Create Object");
    submit.on("click", submitDialog);
    var cancel = $.create("BUTTON", { parent: box }, "Cancel");
    cancel.dialog = dialog;
    cancel.on("click", cancelDialog);
    //Function used to open the dialog box
    this.open = function(replace) {
        cancelDialog();
        openDialog = dialog;
        dialog.replaced = replace;
        replace.parentNode.replaceChild(box, replace);
    };
};
function submitDialog() {
    var inputs = openDialog.inputs;
    var results = {};
    for(var field in inputs) results[field] = inputs[field].value;
    //Create the element on the page
    var element = openDialog.callback(results);
    if(!element) return;
    var container = $.create("DIV", { className: "formObject" }, element);
    container.on("click", objectClicked);
    openDialog.box.parentNode.insertBefore(container, openDialog.box);
    cancelDialog();
    container.parentNode.insertBefore(createObjectSelector(), container);
}
function cancelDialog() {
    if(!openDialog) return;
    for(var name in openDialog.inputs) openDialog.inputs[name].value = "";
    openDialog.box.parentNode.replaceChild(openDialog.replaced, openDialog.box);
    openDialog = null;
}

//Create all the different types of form objects
new FormObject("Title", [ new Field("Title Text", "text") ], function(inputs) {
    var text = inputs["Title Text"];
    if(text === "") return null;
    var title = $.create("H1", text);
    return title;
});
new FormObject("Heading", [ new Field("Heading Text", "text") ], function(inputs) {
    var text = inputs["Heading Text"];
    if(text === "") return null;
    var heading = $.create("H2", text);
    return heading;
});
new FormObject("Text Input", [
    new Field("Name", "text"),
    new Field("Default Text", "text")
], function(inputs) {
    var name = inputs["Name"];
    if(name === "") return null;
    var text = inputs["Default Text"];
    var input = $.create("INPUT", { type: "text", value: text, name: name });
    return input;
});

function createObjectSelector() {
    var objectSelect = $.create("SELECT", $.create("OPTION", "Create New Object..."));
    for(var name in formObjects) {
        var option = $.create("OPTION", {
            parent: objectSelect,
            value: name
        }, name);
        option.dialog = formObjects[name].dialogBox;
    }
    objectSelect.on("change", objectAdded);
    return objectSelect;
}
function objectAdded(e) {
    var option = this.selectedOptions[0];
    if(!option.dialog) return;
    option.dialog.open(this);
    this.selectedIndex = 0;
}

window.on("load", function() {
    document.getElementById("builder").appendChild(createObjectSelector());
});