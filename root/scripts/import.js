function importIndicators(csv) {
    
    //Input information
    var DATE_COLUMN = 0;
    var AREA_COLUMN = 1;
    var DISTRICT_COLUMN = 2;
    var ZONE_COLUMN = 3;
    var WARD_COLUMN = 4;
    var KI_TYPE_COLUMN = 5;
    var KI_VALUE_COLUMN = 6;
    var MISSIONARY1_COLUMN = 7;
    var MISSIONARY2_COLUMN = 8;
    var MISSIONARY3_COLUMN = 9;
    var MISSIONARY4_COLUMN = 10;
    var MISSIONARY5_COLUMN = 11;
    var MISSIONARY6_COLUMN = 12;
    
    //Format the indicator names that come from IMOS
    var indicatorNames = {
        "BAPTIZED": "baptised",
        "CONFIRMED": "confirmed",
        "BAPTISMAL_DATE": "baptismalDate",
        "SACRAMENT": "sacrament",
        "LESSONS_MEMBER_PRESENT": "memberPresent",
        "OTHER_LESSONS_TAUGHT": "otherLesson",
        "PROGRESSING_INVESTIGATORS": "progressing",
        "REFERRALS_RECEIVED": "received",
        "REFERRALS_CONTACTED": "contacted",
        "NEW_INVESTIGATORS": "newInvestigators",
        "LESSONS_TO_RC_LA": "rcla",
        "Finding / Potentials": "findingPotentials"
    };
    function indicatorName(imosName) {
        return indicatorNames[imosName] || imosName;
    }
    function getZone(zone) {
        var zones = {
            "brisbane": "Brisbane",
            "brisbane north": "Brisbane North",
            "sunshine coast": "Sunshine Coast",
            "cleveland": "Cleveland",
            "ipswich": "Ipswich",
            "centenary": "Centenary",
            "logan": "Logan",
            "eight mile plains": "Eight Mile Plains",
            "emp": "Eight Mile Plains",
            "coomera": "Coomera",
            "gold coast": "Gold Coast",
            "northern": "Northern"
        };
        return zones[zone] || zone;
    }
    function getWard(ward) {
        var index = ward.length - 10;
        if(ward.substring(index) == " Australia")
            return ward.substring(0, 10);
        return ward;
    }
    
    //Get each record by date
    var lines = CSV.csvToArray(csv);
    var records = {};
    for(var i = 1; i < lines.length; i++) {
        var line = lines[i];
        if(line.length < KI_VALUE_COLUMN) continue;
        var date = formatDate(new Date(line[DATE_COLUMN]));
        if(date < "2013-08-01") continue;
        var recordName = date + " " + line[AREA_COLUMN];
        var record = records[recordName];
        if(!record) {
            var missionaries = [];
            for(var missionary = 0; missionary < 6; missionary++) {
                var value = line[MISSIONARY1_COLUMN + missionary];
                if(value && value.length > 1) missionaries.push(value);
            }
            record = {
                date: date,
                area: line[AREA_COLUMN],
                district: line[DISTRICT_COLUMN],
                zone: getZone(line[ZONE_COLUMN]),
                ward: line[WARD_COLUMN],
                missionaries: missionaries
            };
            records[recordName] = record;
        }
        if(line[KI_TYPE_COLUMN] == "Finding / Potentials") {
            var result = splitFindingPotentials(line[KI_VALUE_COLUMN]);
            record.finding = result.finding;
            record.potentials = result.potentials;
        }
        else record[indicatorName(line[KI_TYPE_COLUMN])] = parseInt(line[KI_VALUE_COLUMN], 10);
    }
    
    //Convert to array of database records
    var output = [];
    $.each(records, function(key, record) { output.push(record); });
    var data = { action: "insert", collection: "indicators", data: output };
    upload(data, function(result) {
        $('#ki_status').text("Updated Successfully!");
    });
    $('#ki_status').text("Uploading...");
}

function importFlats(csv) {
    
    //Input information
    var ID_COLUMN = 0;
    var ADDRESS_COLUMN = 1;
    var CITY_COLUMN = 2;
    var AREA_COLUMN = 3;
    var TYPE_COLUMN = 4;
    
    var lines = CSV.csvToArray(csv);
    var records = [], line;
    for(var i = 1; i < lines.length; i++) {
        line = lines[i];
        records.push({
            name: line[CITY_COLUMN],
            address: line[ADDRESS_COLUMN] + ", " + line[CITY_COLUMN],
            position: []
        });
    }
    
    var data = { action: "insert", collection: "flat", data: records };
    upload(data, function(result) {
        $('#flat_status').text("Updated Successfully!");
    });
    $('#flat_status').text("Uploading...");
}

//Units assigned to areas
var wards = {
    "capalaba": "Capalaba",
    "cleveland 2": "Cleveland",
    "holland park": "Holland Park",
    "camp hill": "Camp Hill",
    "river terrace 1": "River Terrace",
    "brisbane east": "Brisbane",
    "manly": "Manly",
    "redcliffe 1 ": "Redcliffe",
    "brackenridge 1 ": "Brackenridge",
    "burpengary e": "Burpengary",
    "centenary lakes": "Centenary Lakes",
    "enoggera": "Enoggera",
    "north pine": "North Pine",
    "bunya forest": "Bunya Forest",
    "chermside ": "Chermside",
    "nambour": "Nambour",
    "buderim": "Buderim",
    "kawana waters e": "Kawana Waters",
    "forest glen": "Forest Glen",
    "gympie ": "Gympie",
    "hervey bay": "Hervey Bay",
    "bundaberg": "Bundaberg",
    "kenmore": "Kenmore",
    "springfield": "Springfield",
    "forest lake": "Forest Lake",
    "bellbird park": "Bellbird Park",
    "camira": "Camira",
    "richlands 1": "Richlands",
    "collingwood park": "Collingwood Park",
    "tallai": "Tallai",
    "nerang ": "Nerang",
    "helensvale": "Helensvale",
    "coomera": "Coomera",
    "mudgeeraba": "Mudgeeraba",
    "isle of capri (chinese)": "Isle of Capri",
    "isle of capri ": "Isle of Capri",
    "tweed heads": "Tweed Heads",
    "lismore": "Lismore",
    "heritage park ": "Heritage Park",
    "karawatha ": "Karawatha",
    "logan 1": "Logan",
    "park ridge 1": "Park Ridge",
    "marsden 1": "Marsden",
    "windaroo": "Windaroo",
    "beenleigh s": "Beenleigh",
    "waterford 1 ": "Waterford",
    "springwood": "Springwood",
    "rochedale ": "Rochedale",
    "emp 2": "Eight Mile Plains",
    "emp 1": "Eight Mile Plains",
    "brassall ": "Brassall",
    "sommerset": "Somerset",
    "darling heights": "Darling Heights",
    "raceview": "Raceview",
    "toowoomba ": "Toowoomba",
    "warwick": "Warwick",
    "redbank": "Redbank",
    "bundamba ": "Bundamba",
    "townsville west": "Townsville",
    "mt isa ": "Mount Isa",
    "rockhampton ": "Rockhampton",
    "emerald": "Emerald",
    "gladstone": "Gladstone",
    "cairns 1 ": "Cairns 1st",
    "cairns 2": "Cairns 2nd",
    "river terrace 2": "River Terrace",
    "loganholme": "Loganholme",
    "park ridge 2": "Park Ridge",
    "logan 2": "Logan",
    "atherton": "Atherton",
    "cleveland 1": "Cleveland",
    "river terrace": "River Terrace",
    "brisbane west": "Brisbane",
    "brackenridge 2": "Brackenridge",
    "redcliffe 2/decep": "Redcliffe",
    "burpengary w": "Burpengary",
    "kawana waters 1": "Kawana Waters",
    "kawana waters 2": "Kawana Waters",
    "richlands 2": "Richlands",
    "logan": "Logan",
    "park ridge": "Park Ridge",
    "beenleigh n": "Beenleigh",
    "waterford ": "Waterford",
    "chinese emp 2": "Eight Mile Plains",
    "townsville east": "Townsville",
    "mackay": "Mackay",
    "kawana waters": "Kawana Waters",
    "chinese emp 1": "Eight Mile Plains",
    "emp 2 (chinese)": "Eight Mile Plains",
    "emp 1 (chinese)": "Eight Mile Plains",
    "emp 3": "Eight Mile Plains",
    "tallai ": "Tallai",
    "mudgerraba": "Mudgeeraba",
    "marsden 2": "Marsden",
    "townsville east  ": "Townsville",
    "ascot": "Chermside",
    "manly (leota)": "Manly",
    "k. waters e": "Kawana Waters",
    "kingaroy": "Kingaroy",
    "kenmore (judge)": "Kenmore",
    "richlands 1 (s)": "Richlands",
    "tallai 1 ": "Tallai",
    "isle of capri (chin)": "Isle of Capri",
    "tallai 2": "Tallai",
    "burleigh heads": "Burleigh Heads",
    "pacific pines": "Pacific Pines",
    "waterford 2": "Waterford",
    "cleveland": "Cleveland",
    "redcliffe ": "Redcliffe",
    "brackenridge 1": "Brackenridge",
    "deception bay": "Redcliffe",
    "burpengary": "Burpengary",
    "k. waters": "Kawana Waters",
    "richlands 2 (s)": "Richlands",
    "richlands 1 (n)": "Richlands",
    "beenleigh": "Beenleigh",
    "waterford 1": "Waterford",
    "somerset": "Somerset",
    "innisfail": "Innisfail",
    "capalaba (zl)": "Capalaba",
    "cleveland (dl)": "Cleveland",
    "manly ": "Manly",
    "camp hill (dl)": "Camp Hill",
    "river terrace ": "River Terrace",
    "chinese (river ter)": "River Terrace",
    "brisbane 1": "Brisbane",
    "brisbane 2": "Brisbane",
    "redcliffe 1 (zl)": "Redcliffe",
    "brackenridge (dl)": "Brackenridge",
    "redcliffe 2": "Redcliffe",
    "enoggera (dl)": "Enoggera",
    "chermside (aps)": "Chermside",
    "nambour (dl)": "Nambour",
    "gympie": "Gympie",
    "camira (zl)": "Camira",
    "richlands": "Richlands",
    "tallai (zl)": "Tallai",
    "nerang (dl)": "Nerang",
    "tweed heads (dl)": "Tweed Heads",
    "marsden 1 (zl)": "Marsden",
    "marsden 2 (dl)": "Marsden",
    "woodridge": "Woodridge",
    "kingston": "Kingston",
    "karawatha": "Karawatha",
    "waterford (dl)": "Waterford",
    "daisy hill": "Daisy Hill",
    "rochedale (dl)": "Rochedale",
    "eight mile plains": "Eight Mile Plains",
    "chinese (emp)": "Eight Mile Plains",
    "brassall (zl)": "Brassall",
    "toowoomba (dl)": "Toowoomba",
    "raceview (dl)": "Raceview",
    "bundamba": "Bundamba",
    "mt isa (zl)": "Mount Isa",
    "townsville 1 (dl)": "Townsville",
    "townsville 2": "Townsville",
    "rockhampton": "Rockhampton",
    "cairns 2 (dl)": "Cairns 2nd",
    "cairns 1": "Cairns 1st",
    "river terrace (zl)": "River Terrace",
    "manly (dl)": "Manly",
    "brisbane (dl)": "Brisbane",
    "bunya forest (dl)": "Bunya Forest",
    "bracken ridge ": "Brackenridge",
    "redcliffe (dl)": "Redcliffe",
    "buderim (zl)": "Buderim",
    "kawana waters (dl)": "Kawana Waters",
    "kenmore (zl)": "Kenmore",
    "forest lake (dl)": "Forest Lake",
    "richlands (sisters)": "Richlands",
    "camera (dl)": "Camira",
    "brassal ": "Brassall",
    "nerang (zl)": "Nerang",
    "tallai (dl)": "Tallai",
    "chinese (i of c) (dl)": "Isle of Capri",
    "waterford": "Waterford",
    "daisy hill (dl)": "Daisy Hill",
    "bundaberg (dl)": "Bundaberg",
    "rockhampton (dl)": "Rockhampton",
    "townsville 1 (zl)": "Townsville",
    "mt isa": "Mount Isa",
    "cleveland ": "Cleveland",
    "holland park (dl)": "Holland Park",
    "brisbane west end": "Brisbane",
    "manley": "Manly",
    "redcliffe 2 (zl)": "Redcliffe",
    "enoggra": "Enoggera",
    "chermside (aps) ": "Chermside",
    "gympie (dl)": "Gympie",
    "bellbird": "Bellbird Park",
    "chinese (ioc)": "Isle of Capri",
    "heritage park (zl)": "Heritage Park",
    "karawatha (dl)": "Karawatha",
    "marsden": "Marsden",
    "emp": "Eight Mile Plains",
    "sommerset (dl)": "Somerset",
    "bundamba (dl)": "Bundamba",
    "townsville 1  (dl)": "Townsville",
    "brackenridge": "Brackenridge",
    "redcliffe": "Redcliffe",
    "forest lake 2": "Forest Lake",
    "goodna": "Goodna",
    "redbank plains": "Redbank Plains",
    "kenmore 2": "Kenmore",
    "tallai 1": "Tallai",
    "heritage park": "Heritage Park",
    "emp (english)": "Eight Mile Plains",
    "emp 4": "Eight Mile Plains",
    "rochedale 2": "Rochedale",
    "kuraby": "Kuraby",
    "kenmore 1": "Kenmore",
    "bunya forest 1": "Bunya Forest",
    "bunya forest 2": "Bunya Forest",
    "chermside": "Chermside",
    "manly 2": "Manly",
    "camp hill 1": "Camp Hill",
    "camp hill 2": "Camp Hill",
    "holland park 1": "Holland Park",
    "holland park 2": "Holland Park",
    "brassall 1": "Brassall",
    "brassall 2": "Brassall",
    "toowoomba": "Toowoomba",
    "goodna 2": "Goodna",
    "forest lake 1": "Forest Lake",
    "kuraby 2": "Kuraby",
    "rochedale": "Rochedale",
    "emp english": "Eight Mile Plains",
    "nerang": "Nerang",
    "burleigh": "Burleigh Heads",
    "tweed heads 2": "Tweed Heads",
    "isle of capri": "Isle of Capri",
    "breakfast creek (oe)": "Chermside",
    "isle of capri chi": "Isle of Capri",
    "mt. isa": "Mount Isa",
    "capalaba (dl)": "Capalaba",
    "chinese (river t)(dl)": "River Terrace",
    "brisbane ": "Brisbane",
    "brisbane #2": "Brisbane",
    "braken ridge (dl)": "Brakenridge",
    "chermside (dl)": "Chermside",
    "nambour (zl)": "Nambour",
    "buderim (dl)": "Buderim",
    "kawana waters ": "Kawana Waters",
    "camira(zl)": "Camira",
    "bellbird park(dl)": "Bellbird Park",
    "brassal (zl)": "Brassall",
    "darling heights (dl)": "Darling Heights",
    "mudgeeraba(dl)": "Mudgeeraba",
    "kenmore (dl)": "Kenmore",
    "townsville 1 (zl) (dl)": "Townsville",
    "cairns 1 (dl)": "Cairns 1st",
    "office (bunya forest)": "Bunya Forest",
    "bracken ridge (dl)": "Brackenridge",
    "springfield (dl)": "Springfield",
    "ipswich 2nd": "Ipswich",
    "brassal (dl)": "Brassall",
    "isle of capri (dl)": "Isle of Capri",
    "logan (dl)": "Logan",
    "rockhampton (zl)": "Rockhampton",
    "forest lake (zl)": "Forest Lake",
    "brassall": "Brassall",
    "rochedale 1": "Rochedale",
    "brisbane": "Brisbane",
    "enoggera ": "Enoggera",
    "forest lake ": "Forest Lake",
    "chinese (river terr.)": "River Terrace",
    "bunya forrest ": "Bunya Forrest",
    "kenmore ": "Kenmore",
    "camera (zl)": "Camira",
    "bellbird park (dl)": "Bellbird Park",
    "townsville  (zl)": "Townsville",
    "office(bunya forest)": "Bunya Forest",
    "chinese (kenmore)": "Kenmore",
    "bundaberg (zl)": "Bundaberg",
    "kawana waters w": "Kawana Waters",
    "redcliffe (zl)": "Redcliffe",
    "braken ridge ": "Brackenridge",
    "nambour ": "Nambour",
    "daisy hill ": "Daisy Hill",
    "bracken ridge": "Brackenridge",
    "camira (dl)": "Camira",
    "chinese (river terr)": "River Terrace",
    "chinese (i of c)": "Isle of Capri",
    "tallali 2": "Tallai",
    "isle of capri eng": "Isle of Capri",
    "brackenridge 1 (dl)": "Brackenridge",
    "chermside (oes) ": "Chermside",
    "windaroo (dl)": "Windaroo",
    "charters towers": "Charters Towers",
    "centenary lks 2": "Centenary Lakes",
    "north pine 2": "North Pine",
    "burleigh 2": "Burleigh Heads",
    "isle of capri 2": "Isle of Capri",
    "kawana wtrs 2": "Kawana Waters",
    "springfield ": "Springfield",
    "chinese (i of c) ": "Isle of Capri",
    "mudgeeraba (dl)": "Mudgeeraba",
    "thursday island": "Thursday Island",
    "mudgeeraba ": "Mudgeeraba",
    "north pine (n&s)": "North Pine",
    "north pine n": "North Pine",
    "north pine s": "North Pine",
    "springfield 1": "Springfield",
    "springfield 2": "Springfield",
    "enoggera 2": "Enoggera",
    "tweed heads 2 ": "Tweed Heads",
    "kawana water 2": "Kawana Waters",
    "gladstone 2": "Gladstone",
    "temple sisters": "Brisbane",
    "sisters": "Richlands",
    "assistants": "Chermside",
    "eight mile pl 3": "Eight Mile Plains",
    "ipswich 2nd ": "Ipswich 2nd",
    "ipswich 1st": "Ipswich 1st"
};
var oldData = [], oldMissingList = [], oldHtml = [];


/* ---------------------------------- 2013 --------------------------------- */

var stakes2013 = {
    "river terrace": "Brisbane",
    "brisbane": "Brisbane",
    "redcliffe": "Brisbane North",
    "brackenridge": "Brisbane North",
    "burpengary": "Brisbane North",
    "north pine": "Brisbane North",
    "nambour": "Sunshine Coast",
    "buderim": "Sunshine Coast",
    "kawana waters": "Sunshine Coast",
    "forest glen": "Sunshine Coast",
    "gympie": "Sunshine Coast",
    "hervey bay": "Sunshine Coast",
    "bundaberg": "Sunshine Coast",
    "springfield": "Centenary",
    "forest lake": "Centenary",
    "bellbird park": "Centenary",
    "camira": "Centenary",
    "richlands": "Centenary",
    "tallai": "Gold Coast",
    "mudgeeraba": "Gold Coast",
    "isle of capri": "Gold Coast",
    "tweed heads": "Gold Coast",
    "lismore": "Gold Coast",
    "heritage park": "Logan",
    "karawatha": "Logan",
    "logan": "Logan",
    "park ridge": "Logan",
    "marsden": "Logan",
    "waterford": "Eight Mile Plains",
    "springwood": "Eight Mile Plains",
    "rochedale": "Eight Mile Plains",
    "eight mile plains": "Eight Mile Plains",
    "brassall": "Ipswich",
    "somerset": "Ipswich",
    "darling heights": "Ipswich",
    "raceview": "Ipswich",
    "toowoomba": "Ipswich",
    "redbank": "Ipswich",
    "bundamba": "Ipswich",
    "townsville": "Northern",
    "mt. isa": "Northern",
    "rockhampton": "Northern",
    "emerald": "Northern",
    "gladstone": "Northern",
    "mackay": "Northern",
    "cairns 1st": "Northern",
    "cairns 2nd": "Northern",
    "warwick": "Ipswich",
    "centenary lakes": "Brisbane North",
    "collingwood park": "Centenary",
    "loganholme": "Eight Mile Plains",
    "atherton": "Northern",
    "kingaroy": "Sunshine Coast",
    "burleigh heads": "Gold Coast",
    "innisfail": "Northern",
    "goodna": "Centenary",
    "redbank plains": "Centenary",
    "kuraby": "Eight Mile Plains",
    "mount isa": "Northern",
    "windaroo": "Coomera",
    "pacific pines": "Coomera",
    "coomera": "Coomera",
    "nerang": "Coomera",
    "helensvale": "Coomera",
    "beenleigh": "Coomera",
    "chermside": "Brisbane",
    "enoggera": "Brisbane",
    "bunya forest": "Brisbane",
    "kenmore": "Brisbane",
    "capalaba": "Cleveland",
    "cleveland": "Cleveland",
    "holland park": "Cleveland",
    "camp hill": "Cleveland",
    "manly": "Cleveland"
};
function importOld2013(csv) {
    //Line is ignored if missionary or area column equal any of these values:
    var ignore = [ "Totals" ];
    var DATE_ROW = 3;
    var DATE_COLUMN = 2;
    var START = 22;
    var MISSIONARY_COLUMN = 0;
    var AREA_COLUMN = 1;
    
    var oldIndicators = {
        baptised: 2,
        confirmed: 3,
        baptismalDate: 4,
        sacrament: 5,
        memberPresent: 6,
        otherLesson: 7,
        progressing: 8,
        received: 9,
        contacted: 10,
        newInvestigators: 11,
        rcla: 12,
        finding: 13,
        potentials: 14
    };
    
    var lines = CSV.csvToArray(csv);
    var date = new Date(lines[DATE_ROW][DATE_COLUMN]);
    var zone = "";
    $.each(lines, function(lineNumber, line) {
        if(typeof line[0] == "string" && line[0].substr(-5).toLowerCase() == " zone") {
            zone = line[0].substring(0, line[0].length - 5);
            return;
        }
        if(line[0] == "Australia Brisbane Mission") {
            zone = lines[lineNumber + 1][0];
            return;
        }
        if(lineNumber < START || !line[AREA_COLUMN]) return;
        for(var i = 0; i < ignore.length; i++) {
            if(line[AREA_COLUMN] == ignore[i]) return;
            if(line[MISSIONARY_COLUMN] == ignore[i]) return;
        }
        
        var current = {}, hasIndicators = false, missing = [];
        $.each(oldIndicators, function(indicator, column) {
            if(typeof line[column] == "number") {
                current[indicator] = line[column];
                hasIndicators = true;
            }
            else if(indicator != "finding" && indicator != "potentials") missing.push(indicator);
        });
        if(!hasIndicators) return;
        current.date = formatDate(date);
        var area = line[AREA_COLUMN];
        current.area = area;
        var ward = wards[area.toLowerCase()];
        if(!ward) missing.push("ward");
        else current.ward = ward;
        current.zone = zone;
        current.missionaries = [ line[MISSIONARY_COLUMN] + "," ];
        oldMissingList.push(missing);
        oldData.push(current);
    });
}
function displayOld2013() {
    //Get area/ward data
    var wardData = [], missingWards = [], stakeData = [], missingStakes = [], missing;
    $.each(oldData, function(i, record) {
        if(!record.ward) {
            missing = true;
            $.each(missingWards, function(area, ward) {
                if(record.area.toLowerCase() == ward) {
                    missing = false;
                    return false;
                }
            });
            if(missing) {
                missingWards.push(record.area.toLowerCase());
                wardData.push('"' + record.area.toLowerCase() + '": "' + record.area + '"');
            }
        }
        else if(record.zone != stakes2013[record.ward.toLowerCase()]) {
            missingStakes[record.ward.toLowerCase()] = record.zone;
            //Fixes zone for 2011 and before (Comment this when inserting 2012)
            record.zone = stakes2013[record.ward.toLowerCase()];
            oldMissingList[i].push("Stake");
        }
    });
    if(wardData.length) console.log("Missing Wards:\n\n" + wardData.join(',\n    '));
    for(var ward in missingStakes) stakeData.push('"' + ward.toLowerCase() + '": "' + missingStakes[ward] + '"');
    if(stakeData.length) console.log("Missing Stakes:\n\n" + stakeData.join(',\n    '));
    
    $.each(oldData, function(i, record) {
        var missing = "";
        if(oldMissingList[i].length) {
            missing = '<span style="color:#F00">MISSING: ' + oldMissingList[i].join(', ') + '</span>';
        }
        oldHtml.push('<span class="highlight">' + record.area + '</span>: ' + missing + '<br />' + JSON.stringify(record));
    });
    
    $('#old_container2013').append(
        $('<div id="old_check2013"></div>').append(
            $('<button>Confirm Upload</button>').on("click", function() {
                var data = { action: "insert", collection: "indicators", data: oldData };
                upload(data, function() {
                    $('#old_status2013').text("Updated Successfully!");
                    oldData = [];
                    oldMissingList = [];
                    oldHtml = [];
                });
                $('#old_check2013').remove();
                $('#old_status2013').text("Uploading...");
            })
        )
    );
    $('#old_status2013').text("Please review for errors then click 'Confirm Upload':");
    $('#old_check2013').append($('<div></div>').html(oldHtml.join('<br /><br />')));
}


/* ---------------------------------- 2012 --------------------------------- */

var stakes2012 = {
    "river terrace": "Brisbane",
    "brisbane": "Brisbane",
    "redcliffe": "Brisbane North",
    "brackenridge": "Brisbane North",
    "burpengary": "Brisbane North",
    "north pine": "Brisbane North",
    "nambour": "Sunshine Coast",
    "buderim": "Sunshine Coast",
    "kawana waters": "Sunshine Coast",
    "forest glen": "Sunshine Coast",
    "gympie": "Sunshine Coast",
    "hervey bay": "Sunshine Coast",
    "bundaberg": "Sunshine Coast",
    "springfield": "Centenary",
    "forest lake": "Centenary",
    "bellbird park": "Centenary",
    "camira": "Centenary",
    "richlands": "Centenary",
    "tallai": "Gold Coast",
    "mudgeeraba": "Gold Coast",
    "isle of capri": "Gold Coast",
    "tweed heads": "Gold Coast",
    "lismore": "Gold Coast",
    "heritage park": "Logan",
    "karawatha": "Logan",
    "logan": "Logan",
    "park ridge": "Logan",
    "marsden": "Logan",
    "waterford": "Eight Mile Plains",
    "springwood": "Eight Mile Plains",
    "rochedale": "Eight Mile Plains",
    "eight mile plains": "Eight Mile Plains",
    "brassall": "Ipswich",
    "somerset": "Ipswich",
    "darling heights": "Ipswich",
    "raceview": "Ipswich",
    "toowoomba": "Ipswich",
    "redbank": "Ipswich",
    "bundamba": "Ipswich",
    "townsville": "Northern",
    "mt. isa": "Northern",
    "rockhampton": "Northern",
    "emerald": "Northern",
    "gladstone": "Northern",
    "mackay": "Northern",
    "cairns 1st": "Northern",
    "cairns 2nd": "Northern",
    "warwick": "Ipswich",
    "centenary lakes": "Brisbane North",
    "collingwood park": "Centenary",
    "loganholme": "Eight Mile Plains",
    "atherton": "Northern",
    "kingaroy": "Sunshine Coast",
    "burleigh heads": "Gold Coast",
    "innisfail": "Northern",
    "goodna": "Centenary",
    "redbank plains": "Centenary",
    "kuraby": "Eight Mile Plains",
    "mount isa": "Northern",
    "windaroo": "Eight Mile Plains",
    "pacific pines": "Gold Coast",
    "coomera": "Gold Coast",
    "nerang": "Gold Coast",
    "helensvale": "Gold Coast",
    "beenleigh": "Eight Mile Plains",
    "chermside": "Brisbane North",
    "enoggera": "Brisbane North",
    "bunya forest": "Brisbane North",
    "kenmore": "Centenary",
    "cleveland": "Brisbane",
    "holland park": "Brisbane",
    "camp hill": "Brisbane",
    "capalaba": "Brisbane",
    "manly": "Brisbane"
};
function importOld2012(csv) {
    //Line is ignored if missionary or area column equal any of these values:
    var ignore = [ "Totals" ];
    var DATE_ROW = 3;
    var DATE_COLUMN = 2;
    var START = 22;
    var MISSIONARY_COLUMN = 0;
    var AREA_COLUMN = 1;
    
    var oldIndicators = {
        baptised: 2,
        confirmed: 3,
        baptismalDate: 4,
        sacrament: 5,
        memberPresent: 6,
        otherLesson: 7,
        progressing: 8,
        received: 9,
        contacted: 10,
        newInvestigators: 11,
        rcla: 12,
        finding: 13,
        potentials: 14
    };
    
    var lines = CSV.csvToArray(csv);
    var date = new Date(lines[DATE_ROW][DATE_COLUMN]);
    var zone = "";
    $.each(lines, function(lineNumber, line) {
        if(typeof line[0] == "string" && line[0].substr(-5).toLowerCase() == " zone") {
            zone = line[0].substring(0, line[0].length - 5);
            return;
        }
        if(line[0] == "Australia Brisbane Mission") {
            zone = lines[lineNumber + 1][0];
            return;
        }
        if(lineNumber < START || !line[AREA_COLUMN]) return;
        for(var i = 0; i < ignore.length; i++) {
            if(line[AREA_COLUMN] == ignore[i]) return;
            if(line[MISSIONARY_COLUMN] == ignore[i]) return;
        }
        
        var current = {}, hasIndicators = false, missing = [];
        $.each(oldIndicators, function(indicator, column) {
            if(typeof line[column] == "number") {
                current[indicator] = line[column];
                hasIndicators = true;
            }
            else if(indicator != "finding" && indicator != "potentials") missing.push(indicator);
        });
        if(!hasIndicators) return;
        current.date = formatDate(date);
        var area = line[AREA_COLUMN];
        current.area = area;
        var ward = wards[area.toLowerCase()];
        if(!ward) missing.push("ward");
        else current.ward = ward;
        current.zone = zone;
        current.missionaries = [ line[MISSIONARY_COLUMN] + "," ];
        oldMissingList.push(missing);
        oldData.push(current);
    });
}
function displayOld2012() {
    //Get area/ward data
    var wardData = [], missingWards = [], stakeData = [], missingStakes = [], missing;
    $.each(oldData, function(i, record) {
        if(!record.ward) {
            missing = true;
            $.each(missingWards, function(area, ward) {
                if(record.area.toLowerCase() == ward) {
                    missing = false;
                    return false;
                }
            });
            if(missing) {
                missingWards.push(record.area.toLowerCase());
                wardData.push('"' + record.area.toLowerCase() + '": "' + record.area + '"');
            }
        }
        else if(record.zone != stakes2012[record.ward.toLowerCase()]) {
            missingStakes[record.ward.toLowerCase()] = record.zone;
            oldMissingList[i].push("Stake");
        }
    });
    if(wardData.length) console.log("Missing Wards:\n\n" + wardData.join(',\n    '));
    for(var ward in missingStakes) stakeData.push('"' + ward.toLowerCase() + '": "' + missingStakes[ward] + '"');
    if(stakeData.length) console.log("Missing Stakes:\n\n" + stakeData.join(',\n    '));
    
    $.each(oldData, function(i, record) {
        var missing = "";
        if(oldMissingList[i].length) {
            missing = '<span style="color:#F00">MISSING: ' + oldMissingList[i].join(', ') + '</span>';
        }
        oldHtml.push('<span class="highlight">' + record.area + '</span>: ' + missing + '<br />' + JSON.stringify(record));
    });
    
    $('#old_container2012').append(
        $('<div id="old_check2012"></div>').append(
            $('<button>Confirm Upload</button>').on("click", function() {
                var data = { action: "insert", collection: "indicators", data: oldData };
                upload(data, function() {
                    $('#old_status2012').text("Updated Successfully!");
                    oldData = [];
                    oldMissingList = [];
                    oldHtml = [];
                });
                $('#old_check2012').remove();
                $('#old_status2012').text("Uploading...");
            })
        )
    );
    $('#old_status2012').text("Please review for errors then click 'Confirm Upload':");
    $('#old_check2012').append($('<div></div>').html(oldHtml.join('<br /><br />')));
}


/* ---------------------------------- 2011 --------------------------------- */

function importOld2011(csv) {
    //Line is ignored if missionary or area column equal any of these values:
    var ignore = [ "Totals" ];
    var DATE_ROW = 3;
    var DATE_COLUMN = 2;
    var START = 22;
    var MISSIONARY_COLUMN = 0;
    var AREA_COLUMN = 1;
    
    var oldIndicators = {
        baptised: 2,
        confirmed: 3,
        baptismalDate: 4,
        sacrament: 5,
        memberPresent: 6,
        otherLesson: 7,
        progressing: 8,
        received: 9,
        contacted: 10,
        newInvestigators: 11,
        rcla: 12,
        finding: 13,
        potentials: 14
    };
    
    var lines = CSV.csvToArray(csv);
    var date = new Date(lines[DATE_ROW][DATE_COLUMN]);
    var zone = "";
    $.each(lines, function(lineNumber, line) {
        if(typeof line[0] == "string" && line[0].substr(-5).toLowerCase() == " zone") {
            zone = line[0].substring(0, line[0].length - 5);
            return;
        }
        if(line[0] == "Australia Brisbane Mission") {
            zone = lines[lineNumber + 1][0];
            return;
        }
        if(lineNumber < START || !line[AREA_COLUMN]) return;
        for(var i = 0; i < ignore.length; i++) {
            if(line[AREA_COLUMN] == ignore[i]) return;
            if(line[MISSIONARY_COLUMN] == ignore[i]) return;
        }
        
        var current = {}, hasIndicators = false, missing = [];
        $.each(oldIndicators, function(indicator, column) {
            if(typeof line[column] == "number") {
                current[indicator] = line[column];
                hasIndicators = true;
            }
            else if(indicator != "finding" && indicator != "potentials") missing.push(indicator);
        });
        if(!hasIndicators) return;
        current.date = formatDate(date);
        var area = line[AREA_COLUMN];
        current.area = area;
        var ward = wards[area.toLowerCase()];
        if(!ward) missing.push("ward");
        else current.ward = ward;
        current.zone = zone;
        current.missionaries = [ line[MISSIONARY_COLUMN] + "," ];
        oldMissingList.push(missing);
        oldData.push(current);
    });
}
function displayOld2011() {
    //Get area/ward data
    var wardData = [], missingWards = [], stakeData = [], missingStakes = [], missing;
    $.each(oldData, function(i, record) {
        if(!record.ward) {
            missing = true;
            $.each(missingWards, function(area, ward) {
                if(record.area.toLowerCase() == ward) {
                    missing = false;
                    return false;
                }
            });
            if(missing) {
                missingWards.push(record.area.toLowerCase());
                wardData.push('"' + record.area.toLowerCase() + '": "' + record.area + '"');
            }
        }
        else if(record.zone != stakes2012[record.ward.toLowerCase()]) {
            missingStakes[record.ward.toLowerCase()] = record.zone;
            //Fixes zone for 2011 and before (Comment this when inserting 2012)
            record.zone = stakes2012[record.ward.toLowerCase()];
            oldMissingList[i].push("Stake");
        }
    });
    if(wardData.length) console.log("Missing Wards:\n\n" + wardData.join(',\n    '));
    for(var ward in missingStakes) stakeData.push('"' + ward.toLowerCase() + '": "' + missingStakes[ward] + '"');
    if(stakeData.length) console.log("Missing Stakes:\n\n" + stakeData.join(',\n    '));
    
    $.each(oldData, function(i, record) {
        var missing = "";
        if(oldMissingList[i].length) {
            missing = '<span style="color:#F00">MISSING: ' + oldMissingList[i].join(', ') + '</span>';
        }
        oldHtml.push('<span class="highlight">' + record.area + '</span>: ' + missing + '<br />' + JSON.stringify(record));
    });
    
    $('#old_container2011').append(
        $('<div id="old_check2011"></div>').append(
            $('<button>Confirm Upload</button>').on("click", function() {
                var data = { action: "insert", collection: "indicators", data: oldData };
                upload(data, function(result) {
                    $('#old_status2011').text("Updated Successfully!");
                    oldData = [];
                    oldMissingList = [];
                    oldHtml = [];
                });
                $('#old_check2011').remove();
                $('#old_status2011').text("Uploading...");
            })
        )
    );
    $('#old_status2011').text("Please review for errors then click 'Confirm Upload':");
    $('#old_check2011').append($('<div></div>').html(oldHtml.join('<br /><br />')));
}

/*
//EXCEL MACRO
Public Sub SaveWorksheetsAsCsv()
Dim WS As Excel.Worksheet
Dim SaveToDirectory As String

    SaveToDirectory = "C:\Users\2014513\SkyDrive\Office\Elder Field\Key Indicators (MILES)\CSV\"

    For Each WS In ThisWorkbook.Worksheets
        WS.SaveAs SaveToDirectory & WS.Name, xlCSV
    Next

End Sub
*/

function importWards(files) {
    var stakes = {
        "Gold Coast Australia Stake": "Gold Coast",
        "Brisbane Australia Centenary Stake": "Centenary",
        "Townsville Australia District": "Townsville",
        "Cairns Australia District": "Cairns",
        "Rockhampton Australia District": "Rockhampton",
        "Brisbane Australia Cleveland Stake": "Cleveland",
        "Coomera Australia Stake": "Coomera",
        "Australia Brisbane Mission": "Australia Brisbane Mission",
        "Brisbane Australia North Stake": "Brisbane North",
        "Brisbane Australia Stake": "Brisbane",
        "Eight Mile Plains Australia Stake": "Eight Mile Plains",
        "Ipswich Australia Stake": "Ipswich",
        "Brisbane Australia Logan Stake": "Logan",
        "Sunshine Coast Australia Stake": "Sunshine Coast"
    };
    var unknownStakes = [];
    var wards = [];
    $.each(files, function(i, file) {
        var kml = X2J.parseXml(file)[0].kml[0].Document[0].Folder[0];
        if(kml.name[0].jValue != "Ward_Boundaries") return;
        $.each(kml.Placemark, function(i, ward) {
            var name = ward.name[0].jValue;
            if(name.substring(name.length - 5) == " Ward") {
                name = name.substring(0, name.length - 5);
            }
            else console.log("Unknown Ward: " + name);
            var stake = "", unitId = "";
            $.each(ward.ExtendedData[0].SchemaData[0].SimpleData, function(i, data) {
                if(data.jAttr.name == "Unit_Number") unitId = data.jValue;
                else if(data.jAttr.name == "Parent_Organization") {
                    stake = stakes[data.jValue] || data.jValue;
                    if(!stakes[data.jValue]) {
                        var unknown = true;
                        $.each(unknownStakes, function(i, stake) {
                            if(stake == data.jValue) {
                                unknown = false;
                                return false;
                            }
                        });
                        if(unknown) unknownStakes.push(data.jValue);
                    }
                }
            });
            var boundaries = [];
            var coordinates = ward.MultiGeometry[0];
            if(!coordinates.Polygon) coordinates = coordinates.MultiGeometry[0];
            coordinates = coordinates.Polygon[0].outerBoundaryIs[0].LinearRing[0].coordinates[0].jValue;
            coordinates = coordinates.split(' ');
            $.each(coordinates, function(i, coordinate) {
                var point = coordinate.split(',');
                if(point[0] && point[1]) {
                    boundaries.push([
                        parseFloat(point[1]),
                        parseFloat(point[0])
                    ]);
                }
            });
            wards.push({
                name: name,
                chapel: name,
                stake: stake,
                unitId: unitId,
                boundaries: boundaries
            });
        });
    });
    
    if(unknownStakes.length) console.log('Unknown Stakes:,\n        "' + unknownStakes.join('": "",\n        "'));
    $('#ward_status').text("Uploading...");
    var currentWard = 0;
    function addWard(ward) {
        var data = { action: "insert", collection: "ward", data: ward };
        upload(data, function(result) {
            if(++currentWard < wards.length) addWard(wards[currentWard]);
            else $('#ward_status').text("Success!");
        });
    }
    if(wards.length) addWard(wards[currentWard]);
}

$(window).load(function() {
    function importButton(id, description, collection, callback) {
        $('#imports').append(
            $('<div id="' + id + '_container"></div>').append(
                '<h2>' + description + '</h2>',
                $('<input type="file" accept=".csv">').on('change', function(e) {
                    $('#' + id + '_status').text("Processing...");
                    var file = e.target.files[0];
                    var reader = new FileReader();
                    reader.onload = function(e) { callback(e.target.result); };
                    reader.readAsText(file);
                }),
                '<span id="' + id + '_status"></span>',
                $('#' + id + '_delete').on('click', function(e) {
                    if(confirm("Are you sure you want to delete all key indicator data?")) {
                        var data = { action: "delete", collection: collection };
                        $.post("/import/db", data, function(result) {
                            $('#' + id + '_status').text("Deleted Successfully!");
                        });
                    }
                })
            )
        );
    }
    importButton("ki", "Key Indicators by Date", "indicators", importIndicators);
    //2013
    $('#imports').append(
        $('<div id="old_container2013"></div>').append(
            '<h2>Previous Indicator Format (2013)</h2>',
            $('<input type="file" multiple accept=".csv">').on('change', function(e) {
                $('#old_status2013').text("Processing...");
                oldData = [];
                oldMissingList = [];
                oldHtml = [];
                var files = e.target.files;
                var currentFile = 0;
                var reader = new FileReader();
                reader.onload = function(e) {
                    importOld2013(e.target.result);
                    var newFile = files[++currentFile];
                    if(newFile) reader.readAsText(newFile);
                    else displayOld2013();
                };
                reader.readAsText(files[0]);
            }),
            '<span id="old_status2013"></span>'
        )
    );
    //2012
    $('#imports').append(
        $('<div id="old_container2012"></div>').append(
            '<h2>Previous Indicator Format (2012)</h2>',
            $('<input type="file" multiple accept=".csv">').on('change', function(e) {
                $('#old_status2012').text("Processing...");
                oldData = [];
                oldMissingList = [];
                oldHtml = [];
                var files = e.target.files;
                var currentFile = 0;
                var reader = new FileReader();
                reader.onload = function(e) {
                    importOld2012(e.target.result);
                    var newFile = files[++currentFile];
                    if(newFile) reader.readAsText(newFile);
                    else displayOld2012();
                };
                reader.readAsText(files[0]);
            }),
            '<span id="old_status2012"></span>'
        )
    );
    //2011
    $('#imports').append(
        $('<div id="old_container2011"></div>').append(
            '<h2>Previous Indicator Format (2008 - 2011)</h2>',
            $('<input type="file" multiple accept=".csv">').on('change', function(e) {
                $('#old_status2011').text("Processing...");
                oldData = [];
                oldMissingList = [];
                oldHtml = [];
                var files = e.target.files;
                var currentFile = 0;
                var reader = new FileReader();
                reader.onload = function(e) {
                    importOld2011(e.target.result);
                    var newFile = files[++currentFile];
                    if(newFile) reader.readAsText(newFile);
                    else displayOld2011();
                };
                reader.readAsText(files[0]);
            }),
            '<span id="old_status2011"></span>'
        )
    );
    importButton("flat", "Flats", "flats", importFlats);
    importButton("ro", "Roster - Excel", "roster", function(csv) {
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
        //Generate data
        var lines = CSV.csvToArray(csv), line;
        var zones = {};
        var name, position, phone, district, address;
        var zone, area, type, id, birthday, status, email, component;
        for(var i = 0; i < lines.length; i++) {
            //Check if it's a missionary line
            line = lines[i];
            if(!line[NAME] || line[NAME].indexOf(",") < 0) continue;
            //Get missionary details
            name = line[NAME];
            type = types[line[TYPE]];
            id = line[ID];
            birthday = line[BIRTHDAY];
            status = line[STATUS];
            position = line[POSITION];
            phone = line[PHONE];
            email = line[EMAIL];
            area = line[AREA] || "Unknown";
            district = line[DISTRICT] || "Unknown";
            component = line[COMPONENT];
            zone = zoneNames[line[ZONE]] || "Unknown";
            address = line[ADDRESS];
            //Get their zone
            if(!zones[zone]) {
                zones[zone] = {
                    districts: {}
                };
            }
            zone = zones[zone];
            //Get their district
            if(!zone.districts[district]) {
                zone.districts[district] = {
                    areas: {},
                    rank: 0,
                    president: null
                };
            }
            district = zone.districts[district];
            //Get their area
            if(!district.areas[area]) {
                district.areas[area] = {
                    missionaries: [],
                    phone: phone,
                    address: address,
                    rank: 0
                };
            }
            area = district.areas[area];
            var rank = rankByTitle[position];
            area.missionaries.push({
                name: name,
                type: type,
                email: email,
                birthday: birthday,
                status: status,
                id: id,
                rank: rank
            });
            if(rank.rank > area.rank) area.rank = rank.rank;
            if(rank.rank > district.rank) district.rank = rank.rank;
        }
        //Generate the callsheet HTML
        var missionaries, missionary;
        var html = '<table class="callsheet">';
        for(var key in zoneNames) {
            //Zone
            zone = zones[zoneNames[key]];
            html += '<tr></tr><tr><td class="zone" colspan="4">' + zoneNames[key] + '</th></tr>';
            var districtRanks = [];
            for(var districtName in zone.districts) {
                districtRanks.push({ name: districtName, rank: zone.districts[districtName].rank });
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
                    areaRanks.push({ name: areaName, rank: district.areas[areaName].rank });
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
        }
        html += '</table>';
        document.body.innerHTML = html;
        var data = { action: "insert", data: zones };
        $.post("/callsheet/db", data, function(result) {
            $('#ro_status').text("Updated Successfully!");
        });
    });
    //Ward boundaries
    var id = "ward", description = "Ward Boundaries";
    $('#imports').append(
        $('<div id="' + id + '_container"></div>').append(
            '<h2>' + description + '</h2>',
            $('<input type="file" accept=".kml" multiple>').on('change', function(e) {
                $('#' + id + '_status').text("Processing...");
                var files = e.target.files;
                var results = [];
                var currentFile = 0;
                var reader = new FileReader();
                reader.onload = function(e) {
                    results.push(e.target.result);
                    if(++currentFile >= files.length) importWards(results);
                    else reader.readAsText(files[currentFile]);
                };
                reader.readAsText(files[0]);
            }),
            '<span id="' + id + '_status"></span>'
        )
    );
});
function formatDate(date) {
    var year = date.getUTCFullYear();
    var month = date.getUTCMonth() + 1;
    if(month < 10) month = "0" + month;
    var day = date.getUTCDate();
    if(day < 10) day = "0" + day;
    return year + "-" + month + "-" + day;
}
function upload(data, success) {
    var index = 0, maxRecordsAtOnce = 500;
    function next() {
        var dbData = {
            action: data.action,
            collection: data.collection,
            data: data.data.slice(index, index + maxRecordsAtOnce)
        };
        $.post("/import/db", dbData, function(result) {
            index += maxRecordsAtOnce;
            if(index < data.data.length) next();
            else success();
        });
    }
    next();
}
function splitFindingPotentials(value) {
    var finding, potentials;
    value = value + "";
    if(value.length > 2) {
        finding = parseInt(value.substr(0, value.length - 2));
        potentials = parseInt(value.substr(-2));
        if(potentials > finding * 10) {
            finding = parseInt(value.substr(0, value.length - 3));
            potentials = parseInt(value.substr(-1));
        }
    }
    else if(value.length == 2) {
        if(value.charAt(0) == 1 && value.charAt(1) > 2) finding = parseInt(value);
        else {
            finding = parseInt(value.charAt(0));
            potentials = parseInt(value.charAt(1));
        }
    }
    else if(value.length == 1) finding = parseInt(value);
    return { finding: finding || 0, potentials: potentials || 0 };
}