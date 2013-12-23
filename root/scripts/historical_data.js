function convert() {
}

//Initialisation
$(window).load(function() {
    $('#files').on('change', handleFileSelect);
});

function handleFileSelect(e) {
    var file = e.target.files[0];
    console.log(file.name);
}