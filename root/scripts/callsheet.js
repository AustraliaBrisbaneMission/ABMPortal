$.post("/callsheet/db", { action: "get" }, function(result) {
    var zones = result;
    var zoneNames = {
        Br: "Brisbane",
        BN: "Brisbane North",
        SC: "Sunshine Coast",
        Ip: "Ipswich",
        CE: "Centenary",
        LG: "Logan",
        EM: "Eight Mile Plains",
        CO: "Coomera",
        CL: "Cleveland",
        GC: "Gold Coast",
        NO: "Northern"
    };
    var ranks = [
        { rank: 0, imos: "(JC)", name: "", bold: false },
        { rank: 0, imos: "(CS)", name: "", bold: false },
        { rank: 0, imos: "(SA)", name: "", bold: false },
        { rank: 0, imos: "(SC)", name: "", bold: false },
        { rank: 0, imos: "(TR)", name: "", bold: false },
        { rank: 0, imos: "(DL)", name: " (DL)", bold: true },
        { rank: 0, imos: "(DT)", name: " (DL)", bold: true },
        { rank: 0, imos: "(STL)", name: " (STL)", bold: true },
        { rank: 0, imos: "(ZL3)", name: " (ZL)", bold: true },
        { rank: 0, imos: "(ZL2)", name: " (ZL)", bold: true },
        { rank: 0, imos: "(ZL1)", name: " (ZL)", bold: true },
        { rank: 0, imos: "(AP)", name: " (AP)", bold: true }
    ];
    var rankByTitle = {}, rankByAuth = [];
    for(var i = 0; i < ranks.length; i++) {
        ranks[i].rank = i;
        rankByTitle[ranks[i].imos] = ranks[i];
        rankByAuth[i] = ranks[i];
    }
    //CSV Lines
    var NAME = 0;
    var TYPE = 1;
    var ID = 2;
    var BIRTHDAY = 3;
    var STATUS = 4;
    var POSITION = 5;
    var PHONE = 6;
    var EMAIL = 9;
    var ADDRESS = 10;
    var AREA = 12;
    var DISTRICT = 13;
    var ZONE = 14;
    var COMPONENT = 15;
    //Missionary types
    var types = {
        "Elder": 1,
        "Sister": 2,
        "Senior Couple - Elder": 3,
        "Senior Couple - Sister": 4,
        "PT Couple - Elder": 5,
        "PT Couple - Sister": 6
    };
    //Generate the callsheet HTML
    var missionaries, missionary;
    var html = '<table class="callsheet">';
    for(var key in zoneNames) {
        //Zone
        zone = zones[zoneNames[key]];
        html += '<tr><td class="zone" colspan="4">' + zoneNames[key] + '</th></tr>';
        var districtRanks = [];
        for(var districtName in zone.districts) {
            districtRanks.push({ name: districtName, rank: parseInt(zone.districts[districtName].rank) });
        }
        districtRanks.sort(function(a, b) {
            if(a.rank > b.rank) return -1;
            if(a.rank < b.rank) return 1;
            else return 0;
        });
        for(var a in districtRanks) {
            var areaRanks = [];
            var district = zone.districts[districtRanks[a].name];
            for(var areaName in district.areas) {
                areaRanks.push({ name: areaName, rank: parseInt(district.areas[areaName].rank) });
            }
            areaRanks.sort(function(a, b) {
                if(a.rank > b.rank) return -1;
                if(a.rank < b.rank) return 1;
                else return 0;
            });
            var name;
            for(var i in areaRanks) {
                name = areaRanks[i].name;
                area = district.areas[name];
                //Missionary names
                area.missionaries.sort(function(a, b) {
                    if(a.rank.rank > b.rank.rank) return -1;
                    if(a.rank.rank < b.rank.rank) return 1;
                    else return 0;
                });
                var className = (area.rank == 11 || area.rank == 10 || area.rank == 6 || area.rank == 5) ? ' class="district"' : '';
                html += '<tr' + className + '><td>';
                missionaries = [];
                for(var i = 0; i < area.missionaries.length; i++) {
                    missionary = area.missionaries[i].name;
                    missionary = missionary.substring(0, missionary.indexOf(','));
                    missionary += area.missionaries[i].rank.name;
                    if(area.missionaries[i].rank.rank >= rankByTitle['(DL)'].rank) {
                        missionary = '<b>' + missionary + '</b>';
                    }
                    var type = area.missionaries[i].type;
                    if(type == types["Sister"] || type == types["Senior Couple - Sister"] || type == types["PT Couple - Sister"]) {
                        missionary = '<i>' + missionary + '</i>';
                    }
                    missionaries.push(missionary);
                }
                html += missionaries.join(' / ') + '</td>';
                //Phone number
                html += '<td>' + (area.phone || "") + '</td>';
                //Area name
                html += '<td>' + (name || "") + '</td>';
                //Address
                html += '<td>' + (area.address || "") + '</td></tr>';
            }
        }
        html += '<tr style="height:0"><td class="last_row" colspan="4"></td></tr><tr class="page_break"></tr>';
    }
    html += '</table>';
    $('#callsheet_container').html(html);
});