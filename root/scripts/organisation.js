var zones = {
    "Brisbane": {
        areas: {
            "Enoggera 1": {
                missionaries: ["Paia'aua", "Merrell"]
            },
            "Enoggera 2": {
                missionaries: ["Wilson", "Nakatsu"]
            },
            "Bunya Forest 1": {
                missionaries: ["Allen", "Solomon"]
            },
            "Bunya Forest 2": {
                missionaries: ["Smith", "Maua"]
            }
        },
        element: null
    },
    "Cleveland": {
        areas: {
            "Manly 1": {
                missionaries: ["Wilson", "Nagato"]
            },
            "Manly 2": {
                missionaries: ["Skadins", "Smith"]
            }
        },
        element: null
    }
};

function createLayout() {
    var zone;
    for(var i = 0; i < zones.length; i++) {
        zone = document.createElement("div");
        zone.class = "zone";
        container.appendChild(zone);
        zones[i].element = zone;
    }
}

var container = document.getElementById('container');