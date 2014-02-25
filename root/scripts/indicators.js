var indicatorInputs = [];
function keyPressed(e) {
    if(e.keyCode == 13) {
        e.preventDefault();
        for(var i = 0, length = indicatorInputs.length; i < length; i++) {
            var input = indicatorInputs[i];
            if(input == this) {
                if(i == length - 1) document.getElementById("submit").focus();
                else indicatorInputs[i + 1].focus();
                break;
            }
        }
    }
}

window.on("load", function() {
    var input, i = 0;
    while((input = document.getElementById("actual" + (++i)))) {
        indicatorInputs.push(input);
        input.on("keydown", keyPressed);
    }
    i = 0;
    while((input = document.getElementById("goal" + (++i)))) {
        indicatorInputs.push(input);
        input.on("keydown", keyPressed);
    }
});