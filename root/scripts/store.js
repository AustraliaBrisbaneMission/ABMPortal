var items = {}, order = [];
$.get("/store/items", function(result) {
    $.each(result, function(item, i) {
        var table = $.create("TABLE", [
            $.create("TR", [
                $.create("TH", "Item"),
                $.create("TH", "Stock"),
                $.create("TH", "Price"),
                $.create("TH", "Quantity"),
                $.create("TH")
            ])
        ]);
        $.create("TR", [
            $.create("TD", item.name),
            $.create("TD", item.stock),
            $.create("TD", "$" + item.price),
            $.create("TD", $.create("INPUT", {}))
        ]);
        items[item._id] = item;
    });
});
function submitOrder(e) {
    var data = {
        missionary: $('#missionary').value,
        area: $('#area').value,
        zone: $('#zone').value,
        items: []
    };
    
    $.post("/store/order", data, function(response) {
        
    });
}
var loaded = false;
window.on('load', function(e) {
    var form = $('#store');
    var itemList = document.getElementsByName();
    for(var i in itemList)
    form.on('submit', submitOrder);
    loaded = true;
});