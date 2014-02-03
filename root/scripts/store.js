var items = {}, order = {};
var itemTable = $.create("TABLE", { id: "items" });
var orderTable = $.create("TABLE", { id: "order" }, [
    $.create("TR", [
        $.create("TH", "Item"),
        $.create("TH", "Language"),
        $.create("TH", "Stock"),
        $.create("TH", "Price"),
        $.create("TH", "Quantity"),
        $.create("TH"),
        $.create("TH")
    ])
]);
function itemClicked(e) {
    var item = this.item;
    var newOrder = order[item.name];
    if(newOrder) return;
    order[item.name] = newOrder = {
        language: "",
        amount: 0,
        quantity: "",
        price: 0,
        row: this
    };
    this.className = "ordered";
    var defaultLanguage = null;
    var name = item.name;
    var languageOptions = [];
    $.each(item.languages, function(details, language) {
        if(!defaultLanguage) defaultLanguage = details;
        languageOptions.push($.create("OPTION", { value: language }, language));
    });
    var languageSelect = $.create("SELECT", { className: "language" }, languageOptions);
    languageSelect.item = item;
    languageSelect.on("change", languageChanged);
    var row = $.create("TR", { className: "item", parent: orderTable }, [
        $.create("TD", name),
        $.create("TD", languageSelect)
    ]);
    row.item = item;
    row.order = newOrder;
    row.oldRow = this;
    languageSelect.stockCell = $.create("TD", { parent: row });
    languageSelect.priceCell = $.create("TD", { parent: row });
    var amount = $.create("TD", { parent: row });
    var amountInput = $.create("INPUT", { parent: amount, type: "text", className: "amount" });
    amountInput.order = newOrder;
    amountInput.on("change", amountChanged);
    languageSelect.amountCell = amountInput;
    var quantity = $.create("TD", { parent: row });
    var quantitySelect = $.create("SELECT", { parent: quantity, className: "quantity" });
    quantitySelect.order = newOrder;
    quantitySelect.on("change", quantityChanged);
    languageSelect.quantityCell = quantitySelect;
    getDetails(languageSelect);
    var removeButton = $.create("BUTTON", "Remove");
    removeButton.on("click", removeItem);
    $.create("TD", { parent: row }, removeButton);
}
function getDetails(element) {
    var details = element.item.languages[element.value];
    element.stockCell.text(details.stock);
    element.priceCell.text("$" + details.price.toFixed(2));
    element.amountCell.value = "";
    var select = element.quantityCell;
    select.html("");
    $.create("OPTION", { parent: select, value: 1 }, "Single (1)");
    $.each($.keySort(details.quantities), function(item) {
        var amount = item.value, quantity = item.key;
        $.create("OPTION", { parent: select, value: amount }, quantity + " (" + amount + ")");
    });
    //Update order variable
    var ord = order[element.item.name];
    ord.language = element.value;
    ord.price = details.price;
    calculateCost();
}
function languageChanged(e) { getDetails(this); }
function amountChanged(e) { this.order.amount = this.value; }
function quantityChanged(e) { this.order.quantity = this.value; }
$.get("/store/items", function(result) {
    $.create("TR", { parent: itemTable }, [
        $.create("TH", "Item")
    ]);
    $.each(result, function(item, i) {
        var row = $.create("TR", { className: "item", parent: itemTable }, $.create("TD", item.name));
        items[item._id] = row.item = item;
        row.on("click", itemClicked);
    });
});
function removeItem(e) {
    var row = this.parentNode.parentNode;
    order[row.item.name] = null;
    row.oldRow.className = "item";
    row.remove();
}
function submitOrder(e) {
    var items = [];
    for(var name in order) {
        var item = order[name];
        items.push({
            name: name,
            language: item.language,
            amount: item.amount,
            quantity: item.quantity
        });
    }
    var data = {
        missionary: $("#missionary").value,
        area: $("#area").value,
        zone: $("#zone").value,
        items: items
    };
    
    $.post("/store/order", data, function(response) {
        
    });
}
function calculateCost() {
    var cost = 0;
    for(var i in order) cost += order[i].price;
    $('#cost').text("Total Cost: $" + cost.toFixed(2));
}
window.on("load", function(e) {
    var form = $("#store");
    form.append(orderTable);
    form.append($.create("DIV", { id: "cost" }, "Total Cost: $0.00"));
    form.append(itemTable);
});