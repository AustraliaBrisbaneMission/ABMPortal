var express = require('express'),
    stylus = require('stylus'),
    nib = require('nib'),
    crypto = require('crypto'),
    mongodb = require('mongodb'),
    csv = require('./root/scripts/ucsv-1.1.0-min.js'),
    request = require("request"),
    nodemailer = require("nodemailer");

//Configuration
//TODO: Find a better (cross-platform) way to get these variables
var Config = {
    nodejs: {
        ip: process.env.ABMPORTAL_NODEJS_IP || process.env.OPENSHIFT_NODEJS_IP || process.env.IP || "127.0.0.1",
        port: parseInt(process.env.ABMPORTAL_NODEJS_PORT) || parseInt(process.env.OPENSHIFT_NODEJS_PORT) || parseInt(process.env.PORT) || 80
    },
    mongodb: {
        name: "abm",
        ip: process.env.ABMPORTAL_MONGODB_IP || process.env.OPENSHIFT_MONGODB_DB_HOST || process.env.IP || "127.0.0.1",
        port: parseInt(process.env.ABMPORTAL_MONGODB_PORT) || parseInt(process.env.OPENSHIFT_MONGODB_DB_PORT) || 27017,
        username: process.env.ABMPORTAL_MONGODB_USERNAME || process.env.OPENSHIFT_MONGODB_DB_USERNAME || null,
        password: process.env.ABMPORTAL_MONGODB_PASSWORD || process.env.OPENSHIFT_MONGODB_DB_PASSWORD || null
    },
    mission: {
        name: "Australia Brisbane Mission"
    },
    email: {
        name: "",
        address: "",
        password: ""
    },
    cards: {
        price: "",
        holderPrice: "",
        printerName: "",
        printerEmail: "",
        financeName: "",
        financeEmail: ""
    },
    standards: { elder: {}, sister: {} },
    indicators: {
        startDate: "2013-08-01",
        latestDate: "2013-08-01",
        latestUpdate: "2013-08-01",
        daysUntilNextUpdate: 1,
        displayWeeks: 6
    },
    chapels: { lastUpdate: new Date("2013-08-01") },
    seniors: {
        indicators: []
    },
    recommendations: {
        viewNumber: 5
    }
};
function dumpConfig() {
    for(var a in Config) {
        for(var b in Config[a]) {
            console.log("Config." + a + "." + b + "=" + Config[a][b]);
        }
    }
}

//Database Setup
var db = {};
db.mongoServer = new mongodb.Server(Config.mongodb.ip, Config.mongodb.port);
db.db = new mongodb.Db(Config.mongodb.name, db.mongoServer, { auto_reconnect: true, w: 1 });
db.db.open(function(error, database) {
    db.database = database;
    if(error) { console.error("MongoDB Open Error: " + error); return; }
    function getCollections() {
        db.recommendations = db.database.collection('recommendations');
        db.users = db.database.collection('users');
        db.indicators = db.database.collection('indicators');
        db.savedIndicators = db.database.collection('savedIndicators');
        db.callsheet = db.database.collection('callsheet');
        db.config = db.database.collection('config');
        db.store = db.database.collection('store');
        db.ward = db.database.collection('ward');
        db.units = db.database.collection('units');
        db.flat = db.database.collection('flat');
        db.chapel = db.database.collection('chapel');
        db.area = db.database.collection('area');
        db.missionary = db.database.collection('missionaries');
        db.standards = db.database.collection('standards');
        db.hastening = db.database.collection('hastening');
        db.seniorIndicators = db.database.collection('seniorIndicators');
        db.seniorActuals = db.database.collection('seniorActuals');
        db.seniorGoals = db.database.collection('seniorGoals');
        db.kilometers = db.database.collection('kilometers');
        areaAnalysisCollections = {
            area: db.database.collection('area'),
            chapel: db.database.collection('chapel'),
            flat: db.database.collection('flat'),
            ward: db.database.collection('ward'),
            units: db.database.collection('units'),
            missionaries: db.database.collection('missionaries')
        };
        importCollections = {
            indicators: db.database.collection('indicators'),
            flat: db.database.collection('flat'),
            ward: db.database.collection('ward')
        };
        //Get configuration options
        db.config.find().toArray(function(err, items) {
            if(error) { console.log("MongoDB Config Error: " + error); return; }
            for(var i = 0; i < items.length; i++) {
                var item = items[i];
                if(!Config[item.category]) Config[item.category] = {};
                var category = Config[item.category];
                category[item.name] = item.value;
            }
            Email = new Emailer();
            if(checkDaysPassed(Config.chapels.lastUpdate, 7)) updateChapels();
        });
        getLatestIndicators();
        getStandards();
        getSeniorIndicators();
    }
    if(Config.mongodb.username) {
        db.db.authenticate(Config.mongodb.username, Config.mongodb.password, { authdb: "admin" }, function(error, result) {
            if(error) console.log("MongoDB Auth Error: " + error);
            else getCollections();
        });
    }
    else getCollections();
});
function dbCallback(err, result) {
    if(err) return console.log(err);
    console.log(result);
}
function dbLogIfError(err, result) { if(err) return console.log(err); }

//Server Setup
var server = express();
server.use(express.bodyParser());
function compile(str, path) {
    return stylus(str)
        .set('filename', path)
        .use(nib());
}
server.set('views', __dirname + '/views');
server.set('view engine', 'jade');
server.use(express.logger('dev'));
server.use(stylus.middleware({
    src: __dirname + '/root',
    compile: compile
}));
server.use(express.static(__dirname + '/root'));
server.use(express.cookieParser(''+crypto.randomBytes(64)+'')); 
server.use(express.cookieSession());

//Authentication
var Auth = {
    NONE: 0,
    OTHER: 1,
    NORMAL: 2,
    DL: 3,
    ZL: 4,
    ADMIN: 5,
    setSession: function(req, variables) {
        var sessionVariables = {
            sso: null,
            username: "",
            missionary: false,
            senior: false,
            imos: false,
            prefix: "",
            displayName: "Guest",
            fullName: "",
            area: "",
            unit: "",
            zone: "",
            position: null,
            elder: true,
            auth: Auth.NONE,
            goals: {},
            actuals: {},
            temp: {}
        };
        if(!variables) for(var name in sessionVariables) req.session[name] = sessionVariables[name];
        else for(var name in variables) req.session[name] = variables[name];
    },
    login: function(req, callback) {
        var username = req.param('username'), password = req.param('password');
        Auth.setSession(req);
        
        function done(success) {
            if(success) console.log(req.session.displayName + " (" + req.session.username + ") logged in!");
            else Auth.logout(req);
            callback(success);
        }
        
        //Check the database first
        var query = {
            username: { $regex : new RegExp(username, "i") },
            password: md5(password)
        };
        db.users.findOne(query, function(err, item) {
            if(err) { console.log(err); done(false); return; }
            if(item) {
                Auth.setSession(req, {
                    missionary: false,
                    username: item.username,
                    displayName: item.username,
                    fullName: item.username,
                    auth: item.auth
                });
                done(true);
            }
            else {
                //Try SSO if the user is not in the database
                var data = {
                    uri: "https://lds.org/login.html",
                    method: "POST",
                    form: {
                        username: username,
                        password: password
                    }
                };
                request(data, function(error, response, body) {
                    if(error) console.log("SSO Request Error for [" + username + "]: " + error);
                    else if(response.statusCode != 200) {
                        console.log("SSO Status Error for [" + username + "]: " + response.statusCode);
                    }
                    else {
                        var cookies = response.headers["set-cookie"];
                        if(!cookies || !cookies.length) {
                            console.log("SSO Cookie Error for [" + username + "]: " +
                                        "No cookies received");
                        }
                        else {
                            var sso = cookies[0].split(';')[0].split('=')[1];
                            Auth.setSession(req, {
                                sso: sso,
                                username: username,
                                displayName: username,
                                fullName: username
                            });
                            //Get missionary information
                            Auth.sso(req, "https://missionary.lds.org/mcore-ws/Services/rest/missionary-assignment/", function(result) {
                                if(result.asgLocName == Config.mission.name) {
                                    Auth.setSession(req, {
                                        missionary: true,
                                        prefix: result.msnyIsElder ? "Elder " : "Sister ",
                                        fullName: result.fullName,
                                        displayName: (result.msnyIsElder ? "Elder " : "Sister ") + result.lastName,
                                        auth: Auth.NORMAL
                                    });
                                    var elder = result.msnyIsElder;
                                    //Update IMOS information if possible
                                    Auth.updateOrganisation(req, function(adminAccess) {
                                        //TODO: Find a way to get the missionary where it will work with two of the same name (ID maybe?)
                                        var query = { fullName: req.session.fullName };
                                        db.missionary.findOne(query, function(error, missionary) {
                                            if(error) { console.log(error); return; }
                                            Auth.sso(req, "https://missionary.lds.org/mcore-ws/Services/rest/missionary-portal-authz-status/undefined", function(result) {
                                                //If they're a senior missionary
                                                if(result && result.senior) {
                                                    Auth.setSession(req, {
                                                        senior: true,
                                                        position: "SENIOR_COUPLE",
                                                        elder: elder,
                                                        auth: Auth.NORMAL,
                                                        goals: {},
                                                        actuals: {}
                                                    });
                                                    if(!missionary) {
                                                        done(true);
                                                        return;
                                                    }
                                                    //Set area information
                                                    Auth.setSession(req, {
                                                        zone: missionary.zone,
                                                        district: missionary.district,
                                                        area: missionary.area,
                                                        unit: missionary.unit
                                                    });
                                                    //Get senior indicators
                                                    var date = new Date();
                                                    toWeekStart(date);
                                                    var thisWeek = formatDate(date);
                                                    var query = {
                                                        missionary: req.session.prefix + req.session.fullName,
                                                        date: thisWeek
                                                    };
                                                    db.seniorGoals.findOne(query, function(error, goals) {
                                                        if(error) { console.log(error); return; }
                                                        if(!goals) { done(true); return; }
                                                        Auth.setSession(req, { goals: goals });
                                                        date.setUTCDate(date.getUTCDate() - 7);
                                                        var lastWeek = formatDate(date);
                                                        query.date = lastWeek;
                                                        db.seniorActuals.findOne(query, function(error, actuals) {
                                                            if(error) { console.log(error); return; }
                                                            if(actuals) Auth.setSession(req, { actuals: actuals });
                                                            done(true);
                                                        });
                                                    });
                                                    return;
                                                }
                                                if(!missionary) { done(true); return; }
                                                var auth = Auth.NORMAL;
                                                if(adminAccess || missionary.position == "SPECIAL_ASSIGNMENT") {
                                                    auth = Auth.ADMIN;
                                                    //Update indicators if over a day has passed since last update
                                                    var now = new Date();
                                                    var updateTime = new Date(Config.indicators.latestUpdate);
                                                    updateTime.setDate(updateTime.getDate() + Config.indicators.daysUntilNextUpdate);
                                                    if(now > updateTime) Auth.updateIndicators(req, null, null, function() {});
                                                }
                                                else if(missionary.position == "ASSISTANT") auth = Auth.ADMIN;
                                                else if(missionary.position == "ZONE_LEADER_LEAD" ||
                                                    missionary.position == "ZONE_LEADER" ||
                                                    missionary.position == "SISTER_TRAINING_LEADER") auth = Auth.ZL;
                                                else if(missionary.position == "DISTRICT_LEADER_TRAINER" ||
                                                    missionary.position == "DISTRICT_LEADER") auth = Auth.DL;
                                                Auth.setSession(req, {
                                                    zone: missionary.zone, //"Logan",//
                                                    district: missionary.district, //"Logan",//
                                                    area: missionary.area, //"Logan 2",//
                                                    unit: missionary.unit, //"Logan",//
                                                    position: missionary.position,
                                                    elder: missionary.elder,
                                                    auth: auth //Auth.NORMAL//
                                                });
                                                done(true);
                                            });
                                        });
                                    });
                                    return;
                                }
                                else if(result.fullName) req.session.displayName = result.fullName;
                            });
                            return;
                        }
                    }
                    done(false);
                });
            }
        });
    },
    logout: function(req) { Auth.setSession(req); },
    require: function(req, res, auth, orSenior) {
        if(req.session.auth && (req.session.auth >= auth ||
            orSenior && req.session.senior)) return false;
        res.redirect('/noauth');
        return true;
    },
    sso: function(req, uri, callback, options) {
        if(!req.session.sso) { callback("Error! Not logged in to SSO!"); return; }
        /*
        //Cookie Jar doesn't work properly :(
        var cookie = request.cookie("ObSSOCookie=" + req.session.sso);
        var cookieJar = request.jar();
        cookieJar.setCookie(cookie, uri, function(err, cookie) {});
        */
        var data = {
            uri: uri,
            method: "GET",
            //jar: cookieJar
            headers: { "Cookie": "ObSSOCookie=" + req.session.sso }
        };
        if(options) {
            for(var option in options) data[option] = options[option];
        }
        request(data, function(error, response, body) {
            var status = response.statusCode, result;
            if(error) callback("Error Connecting to Server: " + error);
            else if(status != 200) callback("Status Error: " + status);
            //TODO: Refresh token when necessary
            //else callback(JSON.parse(body));
            else try { result = JSON.parse(body); }
            catch(error) { callback("JSON Error: " + error); }
            if(result) callback(result);
        });
    },
    updateOrganisation: function(req, callback) {
        Auth.sso(req, "https://missionary.lds.org/ki-entry-proxy/report/local/1/", function(result) {
            if(!result || !result.entity) { callback(false); return; }
            var records = {}, currentRecord;
            var missionaryRecords = {}, currentMissionaries = {};
            var zone, district, area;
            var positions = [
                "JUNIOR_COMPANION",
                "SENIOR_COMPANION",
                "SPECIAL_ASSIGNMENT",
                "TRAINER",
                "DISTRICT_LEADER",
                "DISTRICT_LEADER_TRAINER",
                "SISTER_TRAINING_LEADER",
                "ZONE_LEADER",
                "ZONE_LEADER_LEAD",
                "ASSISTANT"
            ];
            var positionValues = [];
            for(var i = 0; i < positions.length; i++) positionValues[positions[i]] = i;
            function parseError(message) { console.log("OrgParse Error: " + message); }
            function parseEntities(entity) {
                var entities = entity.entities;
                if(entity.type == "org") {
                    if(entities) parseError("Entity type 'org' has entities!");
                    else return;
                }
                else if(!entities) return parseError("No entities for " + entity.type + " '" + entity.name + "'!");
                for(var i = 0, count = entities.length; i < count; i++) {
                    parseEntity(entities[i]);
                }
            }
            function checkValue(obj, property, defaultValue) {
                if(!obj) {
                    parseError("Defaulting to '" + defaultValue + "' because object for '" + property + "' not set!");
                    return defaultValue;
                }
                var value = obj[property];
                if(value === null || value === undefined) {
                    parseError("'" + property + "'' defaulted to '" + defaultValue + "'");
                    return defaultValue;
                }
                return value;
            }
            function parseEntity(entity) {
                var type = entity.type;
                var name = entity.name;
                if(typeof name != "string") return parseError("Name != string");
                if(type == "mission") {
                    if(name != Config.mission.name) return;
                }
                else if(type == "zone") zone = entity;
                else if(type == "district") district = entity;
                else if(type == "area") {
                    area = entity;
                    var missionaries = [];
                    var areaPosition = 0;
                    currentMissionaries = {};
                    if(area.missionaries) {
                        for(var d = 0; d < area.missionaries.length; d++) {
                            var missionary = area.missionaries[d];
                            //Get missionary fields
                            var id = checkValue(missionary, "id", 0);
                            var firstName = checkValue(missionary, "firstName", "");
                            var middleName = checkValue(missionary, "middleName", "");
                            var lastName = checkValue(missionary, "lastName", "");
                            var elder = checkValue(missionary, "gender", "M") == "M";
                            var position = checkValue(missionary, "position", positions[0]);
                            //Add the missionary to the area
                            missionaries.push({
                                id: id,
                                firstName: firstName,
                                middleName: middleName,
                                lastName: lastName,
                                elder: elder,
                                position: position
                            });
                            //Calculate the highest missionary position in the area
                            var positionValue = positionValues[missionary.position];
                            if(positionValue > areaPosition) areaPosition = positionValue;
                            //Add the missionary to the database records
                            missionaryRecords[id] = currentMissionaries[id] = {
                                id: id,
                                firstName: firstName,
                                middleName: middleName,
                                lastName: lastName,
                                fullName: firstName + " " + lastName,
                                elder: elder,
                                position: position,
                                area: area.name,
                                district: district.name,
                                zone: zone.name
                            };
                        }
                    }
                    else parseError("No missionaries in '" + entity.name + "'");
                    //Create the new record
                    if(!zone) parseError("No zone for area '" + name + "'!");
                    if(!district) parseError("No district for area '" + name + "'!");
                    records[area.id] = currentRecord = {
                        id: checkValue(area, "id", 0),
                        name: name,
                        district: checkValue(district, "name", ""),
                        zone: checkValue(zone, "name", ""),
                        missionaries: missionaries,
                        position: positions[areaPosition]
                    };
                }
                else if(type == "org") {
                    var unit = entity.name;
                    if(typeof unit != "string") return parseError("unit.name != string");
                    if(unit.substr(-5) == " Ward") unit = unit.substr(0, unit.length - 5);
                    else if(unit.substr(-7) == " Branch") unit = unit.substr(0, unit.length - 7);
                    //Add unit to current area and missionaries
                    if(!currentRecord) return parseError("No current record set for unit!");
                    currentRecord.unit = unit;
                    for(var i in currentMissionaries) currentMissionaries[i].unit = unit;
                }
                parseEntities(entity);
            }
            var entity = result.entity;
            if(entity.type == "mission") {
                //Get all the area records for the database
                parseEntity(entity);
                //Update previous area details from the database before inserting
                db.area.find().toArray(function(error, items) {
                    for(var i = 0; i < items.length; i++) {
                        var item = items[i];
                        var record = records[item.id];
                        if(record) {
                            record.flat = item.flat;
                            record.boundaries = item.boundaries;
                            record.areaSharedWith = item.areaSharedWith;
                            record.size = item.size;
                            record.centroid = item.centroid;
                            record.centroidDistance = item.centroidDistance;
                            record.chapelPath = item.chapelPath;
                            record.chapelDistance = item.chapelDistance;
                        }
                    }
                    //Sort records into an array for the database to insert
                    var insert = [];
                    for(var id in records) insert.push(records[id]);
                    db.area.remove(function(error, result) {
                        if(error) { console.log(error); return; }
                        db.area.insert(insert, function(error, result) {
                            console.log(error ? error : "Organisation successfully updated!");
                            var insert = [];
                            for(var id in missionaryRecords) insert.push(missionaryRecords[id]);
                            var index = 0;
                            function updateLoop(error, result) {
                                if(error) { console.log(error); callback(false); }
                                else if(++index < insert.length) {
                                    var query = { id: insert[index].id };
                                    var update = {
                                        $set: insert[index],
                                        $setOnInsert: { standards: {} }
                                    };
                                    db.missionary.update(query, update, { upsert: true }, updateLoop);
                                }
                                else {
                                    console.log("Missionaries successfully updated!");
                                    callback(true);
                                }
                            }
                            var query = { id: insert[index].id };
                            var update = {
                                $set: insert[index],
                                $setOnInsert: { standards: {} }
                            };
                            db.missionary.update(query, update, { upsert: true }, updateLoop);
                        });
                    });
                });
            }
            else callback(false);
        });
    },
    //Set 'date' to extract indicators from the Monday to Sunday containing 'date'
    updateIndicators: function(req, date, all, callback) {
        if(date) date = new Date(date);
        else date = new Date(Config.indicators.latestDate);
        //Convert the date to the Monday starting the reported week
        toWeekStart(date);
        var formattedDate = formatDate(date);
        //Do not sync if there are indicators in the old format
        if(formattedDate < Config.indicators.startDate) {
            console.log("INDICATORS: Reached indicators start date while updating indicators. Stopping...");
            return;
        }
        var thisWeek = new Date();
        toWeekStart(thisWeek);
        if(!all && formattedDate >= formatDate(thisWeek)) {
            console.log("INDICATORS: Reached this week. Stopping...");
            return;
        }
        //IMOS gets reports for the week that contains the date
        //(Sending a Wednesday would get the Monday before the Wednesday to the Sunday after's indicators)
        //(The date on the IMOS indicators is the Monday beginning the reported week)
        console.log("INDICATORS: Getting indicators for " + formattedDate);
        var url = "https://imos.ldschurch.org/imos-ki-ws/report/" + formattedDate + "/" + formattedDate + "/mission/14292";
        Auth.sso(req, url, function(result) {
            //Return if the user does not have authority
            if(!result || !result.entity) {
                console.log("INDICATORS: User does not have IMOS access. Stopping...");
                if(callback) callback(false);
                return;
            }
            else if(callback) callback(true);
            //Get key indicator IDs
            var logs = { "Items updated:": 0 };
            var indicatorNames = {
                "10": "baptised",
                "20": "confirmed",
                "30": "baptismalDate",
                "40": "sacrament",
                "50": "memberPresent",
                "60": "otherLesson",
                "70": "progressing",
                "80": "received",
                "90": "contacted",
                "100": "newInvestigators",
                "110": "rcla",
                "2302": "findingPotentials"
            };
            for(var i = 0; i < result.keyIndicators.length; i++) {
                var indicator = result.keyIndicators[i];
                var id = indicator.id;
                if(indicatorNames[id]) continue;
                var name = indicator.shortName || indicator.name;
                indicatorNames[id] = name;
            }
            //Get the indicators
            var zones = result.entity.entities;
            for(var a = 0; a < zones.length; a++) {
                var zone = zones[a];
                var districts = zone.entities;
                if(!districts) { console.log("INDICATORS: No districts in zone " + zone.name); continue; }
                for(var b = 0; b < districts.length; b++) {
                    var district = districts[b];
                    var areas = district.entities;
                    if(!areas) { console.log("INDICATORS: No areas in district " + district.name); continue; }
                    for(var c = 0; c < areas.length; c++) {
                        var area = areas[c];
                        if(!area.entities) continue;
                        var d = area.entities.length - 1;
                        if(d < 0) continue;
                        var report = area.entities[d];
                        var indicators = report.kiData;
                        var item = {};
                        //Check that the report contains any actuals
                        var valid = false;
                        if(!indicators) continue;
                        for(var e = 0; e < indicators.length; e++) {
                            var indicator = indicators[e];
                            var actual = indicator.actual;
                            if(actual === undefined) continue;
                            var id = indicator.id;
                            //Split the 'Finding / Potentials' indicator
                            if(id == "2302") {
                                actual = splitFindingPotentials(actual);
                                item.finding = actual.finding;
                                item.potentials = actual.potentials;
                            }
                            else item[indicatorNames[id]] = actual;
                            valid = true;
                        }
                        if(!valid) continue;
                        //Add information now that we know it is valid
                        item.zone = zone.name;
                        item.district = district.name;
                        item.area = area.name;
                        //Set date as the Monday after the reported week
                        item.date = formattedDate;
                        //Add unit ('Chermside Ward' to 'Chermside')
                        var unit = report.name;
                        unit = unit.substring(0, unit.lastIndexOf(' '));
                        item.ward = unit;
                        //Add missionaries
                        item.missionaries = [];
                        if(!area.missionaries) continue;
                        for(var d = 0; d < area.missionaries.length; d++) {
                            var missionary = area.missionaries[d];
                            var firstName = missionary.firstName;
                            var middleName = missionary.middleName;
                            var lastName = missionary.lastName;
                            var name = lastName + ", " + firstName;
                            if(middleName) name += " " + middleName;
                            item.missionaries.push(name);
                        }
                        //Save the item
                        var query = { date: formattedDate, area: area.name };
                        db.indicators.update(query, item, { upsert: true }, dbLogIfError);
                        logs["Items updated:"]++;
                    }
                }
            }
            req.session.imos = true;
            //Show the logs
            for(var message in logs) {
                console.log("INDICATORS: " + message + " (x" + logs[message] + ")");
            }
            //Sync indicators for next week
            var nextWeek = new Date(formattedDate);
            nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
            console.log("INDICATORS: Just found: " + formattedDate + " & Next Week: " + formatDate(nextWeek));
            setTimeout(function() { Auth.updateIndicators(req, nextWeek); }, 10000);
            //Update latest update
            setConfig("indicators", "latestUpdate", formatDate(new Date()));
            //Update date of latest indicators in database
            if(formattedDate > Config.indicators.latestDate)
                setConfig("indicators", "latestDate", formattedDate);
        });
    }
};
server.get('/login', function (req, res) {
    var params = {};
    if(req.param('error')) params.error = "Incorrect username or password!";
    render(req, res, "login", params);
});
server.post('/login', function (req, res) {
    if(Auth.login(req, function(loggedIn) {
        if(loggedIn) res.redirect('/');
        else res.redirect('/login?error=1');
    }));
});
server.get('/logout', function (req, res) {
    Auth.logout(req);
    res.redirect('/');
});
server.get('/checklogin', function (req, res) {
    res.write("Username = " + req.session.username + " & Auth = " + req.session.auth);
    res.end();
});
server.get('/noauth', function (req, res) {
    render(req, res, "noauth", {});
});

//Email
var Email;
var Emailer = function() {
    var me = this;
    var smtpTransport = nodemailer.createTransport("SMTP", {
            service: "Gmail",
            auth: {
                user: Config.email.address,
                pass: Config.email.password
            }
        });
    me.send = function(options) {
        function parseEmail(name, email) {
            if(!name) return email;
            if(email) return name + " <" + email + ">";
            return "";
        }
        function parseEmails(emails) {
            var parsed = [];
            for(var i = 0; i < emails.length; i++) {
                parsed.push(parseEmail(emails[i].name, emails[i].email));
            }
            return parsed;
        }
        var mailOptions = {
            from: parseEmail(Config.email.name, Config.email.address),
            to: parseEmails(options.to),
            cc: parseEmails(options.cc),
            subject: options.subject,
            html: options.message
        };
        smtpTransport.sendMail(mailOptions, function(error, response) {
            if(error) console.log("Email Error: " + error);
            else if(options.callback) options.callback(error, response);
        });
    };
};

//Web Pages
function render(req, res, page, params) {
    if(!params) params = {};
    for(var key in req.session) params[key] = req.session[key];
    req.session.temp = {};
    params.admin = req.session.auth == Auth.ADMIN;
    res.render(page, params);
}
var Page = function(url, jade, auth, onResponse) {
    var page = this;
    page.auth = auth;
    page.jade = jade;
    page.onResponse = onResponse;
    server.get(url, function (req, res) {
        if(auth && Auth.require(req, res, page.auth)) return;
        if(page.onResponse) page.onResponse(req, res);
        else render(req, res, page.jade, {});
    });
};
server.get('/', function (req, res) {
    if(req.session.senior) {
        var indicators = [], configIndicators = Config.seniors.indicators;
        for(var i = 0, length = configIndicators.length; i < length; i++) {
            var item = configIndicators[i];
            indicators.push({
                id: item._id,
                name: item.name,
                description: item.description,
                lastWeekGoal: 0
            });
        }
        function formatDate(date) {
            var day = date.getUTCDate();
            var month = date.getUTCMonth() + 1;
            var year = date.getUTCFullYear();
            return day + "/" + month + "/" + year;
        }
        var fromDate = new Date(), toDate = new Date();
        //Convert fromDate to Monday and toDate to Sunday
        toWeekStart(fromDate);
        toDate.setUTCDate(fromDate.getUTCDate() + 6);
        var thisWeek = formatDate(fromDate) + " - " + formatDate(toDate);
        fromDate.setUTCDate(fromDate.getUTCDate() - 7);
        toDate.setUTCDate(toDate.getUTCDate() - 7);
        var lastWeek = formatDate(fromDate) + " - " + formatDate(toDate);
        render(req, res, "index", {
            indicators: indicators,
            thisWeek: thisWeek,
            lastWeek: lastWeek
        });
    }
    else render(req, res, "index", {});
});
new Page("/indicators/view", "sr_indicators_viewer.jade", Auth.ADMIN);
server.get("/indicators/get", function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    //Get indicators for the last few weeks
    var date = new Date();
    date.setDate(date.getDate() - Config.indicators.displayWeeks * 7);
    var query = { date: { $gt: formatDate(date) }};
    //Get the indicators from the database
    var indicators = Config.seniors.indicators;
    db.seniorActuals.find(query).toArray(function(error, actuals) {
        if(error) { console.log(error); res.send(500); return; }
        db.seniorGoals.find(query).toArray(function(error, goals) {
            if(error) { console.log(error); res.send(500); return; }
            res.send({
                goals: goals,
                actuals: actuals,
                indicators: indicators
            });
        });
    });
});
server.post("/indicators/save", function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    //Update modified indicators
    var modified = req.body.modified, index = -1;
    function update(error, result) {
        if(error) { console.log(error); res.send(500); return; }
        if(++index >= modified.length) {
            getSeniorIndicators(function() { res.send(); });
            return;
        }
        var item = modified[index];
        var query = { _id: new mongodb.ObjectID(item.id) };
        var record = { name: item.name, description: item.description };
        db.seniorIndicators.update(query, record, update);
    }
    //Remove deleted indicators
    var deleted = req.body.deleted;
    function remove(error, result) {
        if(error) { console.log(error); res.send(500); return; }
        if(++index >= deleted.length) {
            //Insert new indicators
            if(!req.body.inserted.length) {
                index = -1;
                update();
            }
            else db.seniorIndicators.insert(req.body.inserted, function(error, result) {
                if(error) { console.log(error); res.send(500); return; }
                index = -1;
                update();
            });
            return;
        }
        var query = { _id: new mongodb.ObjectID(deleted[index]) };
        db.seniorIndicators.remove(query, remove);
    }
    remove();
});
server.post("/indicators/submit", function(req, res) {
    if(!req.session.senior) return;
    //Calculate dates area information of indicators
    var date = new Date();
    toWeekStart(date);
    var goals = {}, actuals = {};
    goals.reportedBy = actuals.reportedBy = req.session.prefix + req.session.fullName;
    goals.area = actuals.area = req.session.area || "";
    goals.district = actuals.district = req.session.district || "";
    goals.zone = actuals.zone = req.session.zone || "";
    goals.unit = actuals.unit = req.session.unit || "";
    goals.missionaries = actuals.missionaries = req.session.missionaries || "";
    goals.date = formatDate(date);
    date.setDate(date.getDate() - 7);
    actuals.date = formatDate(date);
    //Get actuals and goals submitted
    var actualPrefix = "lastWeekActual_", goalPrefix = "thisWeekGoal_";
    for(var key in req.body) {
        if(!key.indexOf(actualPrefix)) {
            var id = key.substr(actualPrefix.length);
            actuals[id] = req.session.actuals[id] = req.body[key];
        }
        else if(!key.indexOf(goalPrefix)) {
            var id = key.substr(goalPrefix.length);
            goals[id] = req.session.goals[id] = req.body[key];
        }
    }
    //Insert indicators into database
    var query = { date: actuals.date, area: actuals.area };
    db.seniorActuals.update(query, actuals, { upsert: true }, function(error, result) {
        if(error) { console.log(error); res.send(500); return; }
        var query = { date: goals.date, area: goals.area };
        db.seniorGoals.update(query, goals, { upsert: true }, function(error, result) {
            if(error) { console.log(error); res.send(500); return; }
            req.session.temp.indicatorSuccess = true;
            req.session.indicatorsSubmitted = true;
            res.redirect("/");
        });
    });
});
function seniorIndicatorsToCSV(res, collection) {
    db.seniorIndicators.find().toArray(function(error, items) {
        if(error) { console.log(error); res.send(500); return; }
        var headings = [ "Date", "Area" ], ids = [], lines = [];
        for(var i = 0; i < items.length; i++) {
            var indicator = items[i];
            headings.push(indicator.name);
            ids.push(indicator._id);
        }
        lines.push(headings);
        var cursor = collection.find();
        function addRecord(error, result) {
            if(error) {
                console.log(error);
                res.send(500);
            }
            else if(result) {
                var line = [ result.date || "", result.area || "" ];
                for(var i = 0; i < headings.length; i++) {
                    var value = result[ids[i]];
                    line[i + 2] = value === undefined ? "" : value;
                }
                lines.push(line);
                cursor.next(addRecord);
            }
            else {
                res.set("Content-Type", "text/csv");
                res.send(csv.arrayToCsv(lines));
            }
        }
        cursor.next(addRecord);
    });
}
server.get("/indicators/senior_actuals.csv", function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    seniorIndicatorsToCSV(res, db.seniorActuals);
});
server.get("/indicators/senior_goals.csv", function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    seniorIndicatorsToCSV(res, db.seniorGoals);
});
function getSeniorIndicators(callback) {
    db.seniorIndicators.find().toArray(function(error, items) {
        if(error) console.log(error);
        else {
            var indicators = [];
            for(var i = 0; i < items.length; i++) {
                var item = items[i];
                indicators.push({
                    _id: "" + item._id + "",
                    name: item.name,
                    description: item.description
                });
            }
            Config.seniors.indicators = indicators;
        }
        if(callback) callback();
    });
}

server.get('/ki_check', function (req, res) {
    render(req, res, "ki_check", {});
});
server.get('/ki_check/get', function (req, res) {
    db.indicators.find().toArray(function(error, items) { res.send(items); });
});

server.get('/hastening', function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var query = { zone: req.session.zone };
    db.missionary.find(query).toArray(function(error, missionaries) {
        if(error) { console.log(error); res.send(500); return; }
        //Get the date for the report
        var months = [
            "January",
            "February",
            "March",
            "April",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];
        var date = new Date();
        date.setMonth(date.getMonth() - 1);
        var reportDate = months[date.getMonth()] + " " + date.getFullYear();
        //Get missionary counts, units and zone leaders
        var units = {}, zoneLeaders = [];
        for(var i = 0; i < missionaries.length; i++) {
            var missionary = missionaries[i];
            var unitName = missionary.unit;
            //Add the current missionary to the full-time missionary count
            if(!units[unitName]) units[unitName] = 1;
            else units[unitName]++;
            //Check if the missionary is one of the zone leaders
            var position = missionary.position;
            if(position == "ZONE_LEADER" || position == "ZONE_LEADER_LEAD") {
                zoneLeaders.push(missionary.lastName);
            }
        }
        //Listify function for the zone leaders
        function listify(items, prefixSingular, prefixPlural) {
            if(!items.length) return "";
            if(items.length == 1) return prefixSingular + " " + items[0];
            return prefixPlural + " " + items.slice(0, items.length - 1).join(", ") + " & " + items.pop();
        }
        var query = {
            $query: { stake: req.session.zone },
            $orderby: { date: -1 }
        };
        function complete() {
            db.hastening.findOne(query, function(error, lastReport) {
                if(error) { console.log(error); }
                //Send the page
                var data = {
                    reportDate: reportDate,
                    stake: req.session.zone,
                    zoneLeaders: listify(zoneLeaders, "Elder", "Elders"),
                    units: units,
                    lastReport: lastReport
                };
                render(req, res, "hastening", data);
            });
        }
        //Get district names for northern zone
        var unitNames = [];
        for(var name in units) unitNames.push(name);
        var currentUnit = -1;
        function nextUnit() {
            var name = unitNames[++currentUnit];
            if(!name) complete();
            else db.units.findOne({ name: name }, function(error, item) {
                if(error) { console.log(error); res.send(500, error); }
                else {
                    var unit = units[name];
                    units[item.stake + " - " + unitNames[currentUnit]] = unit;
                    delete units[name];
                    nextUnit();
                }
            });
        }
        if(req.session.zone == "Northern") nextUnit();
        else complete();
    });
});
server.post('/hastening/submit', function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var data = req.body;
    var date = new Date();
    data.submitDate = formatDate(date);
    date.setMonth(date.getMonth() - 1);
    date.setDate(1);
    data.date = formatDate(date);
    db.hastening.insert(data, function(error, result) {
        if(error) { console.log(error); res.send(500); }
        else res.send();
    });
});
server.get('/hastening/view', function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    render(req, res, "hastening_view", {});
});
server.get('/hastening/get', function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    db.hastening.find().toArray(function(error, items) {
        if(error) { console.log(error); res.send(500); }
        else res.send(items);
    });
});
server.get("/hastening/hastening.csv", function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    db.hastening.find().toArray(function(error, items) {
        if(error) { console.log(error); res.send(500); return; }
        function fix(value, yesNo) {
            if(value === undefined || value === null) return "";
            if(yesNo) return value ? "Yes" : "No";
            return value;
        }
        var headings = [
            "Month Reported",
            "Stake",
            "Stake President",
            "Goal",
            "Zone Leaders"
        ];
        for(var a = 1; a < 20; a++) {
            headings = headings.concat([
                "Unit " + a + " - Name",
                "Unit " + a + " - Ward Missionaries",
                "Unit " + a + " - Full-Time Missionaries",
                "Unit " + a + " - Has Ward Mission Plan",
                "Unit " + a + " - WMP Has Been Referenced",
                "Unit " + a + " - Member Presents",
                "Unit " + a + " - Investigators At Church",
                "Unit " + a + " - Missionary HT Families",
                "Unit " + a + " - 15 Names - Names",
                "Unit " + a + " - 15 Names - Invited",
                "Unit " + a + " - 15 Names - Being Taught",
                "Unit " + a + " - Rescue Visits",
                "Unit " + a + " - Needs and Concerns",
                "Unit " + a + " - WMP Date Last Reviewed",
                "Unit " + a + " - Goal"
            ]);
            for(var b = 1; b <= 12; b++) {
                headings.push("Unit " + a + " - Month " + b + " Baptisms");
            }
        }
        var lines = [], line = [];
        lines.push(headings);
        for(var a = 0, length = items.length; a < length; a++) {
            var item = items[a];
            var line = [
                fix(item.date),
                fix(item.stake),
                fix(item.president),
                fix(item.goal),
                fix(item.zoneLeaders)
            ];
            var units = item.units;
            for(var b = 0; b < units.length; b++) {
                var unit = units[b];
                line = line.concat([
                    fix(unit.name),
                    fix(unit.wardMissionaries),
                    fix(unit.fullTimeMissionaries),
                    fix(unit.hasWardMissionPlan, true),
                    fix(unit.hasBeenReferenced, true),
                    fix(unit.memberPresents),
                    fix(unit.investigatorsAtChurch),
                    fix(unit.missionaryHomeTeaching),
                    fix(unit.numberNames),
                    fix(unit.numberInvited),
                    fix(unit.numberBeingTaught),
                    fix(unit.rescueVisits),
                    fix(unit.needsAndConcerns),
                    fix(unit.dateReviewed),
                    fix(unit.goal)
                ]);
                for(var c = 1; c <= 12; c++) line.push(fix(unit["month" + b]));
            }
            for(var b = units.length; b < 20; b++) {
                for(var c = 0; c < 27; c++) line.push("");
            }
            lines.push(line);
        }
        res.set("Content-Type", "text/csv");
        res.send(csv.arrayToCsv(lines));
    });
});

server.get('/forms', function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    render(req, res, "forms", {});
});

function getStandards(callback) {
    db.standards.find().toArray(function(error, items) {
        if(error) { console.log(error); if(callback) callback(); return; }
        Config.standards = { elder: {}, sister: {} };
        for(var i = 0; i < items.length; i++) {
            var item = items[i];
            var standards = Config.standards[item.elder ? "elder" : "sister"];
            var category = standards[item.category] || {};
            category[item.name] = item._id;
            standards[item.category] = category;
        }
        if(callback) callback();
    });
}
server.get('/standards', function (req, res) {
    if(Auth.require(req, res, Auth.DL)) return;
    render(req, res, "standards", {});
});
server.get('/standards/get', function (req, res) {
    if(Auth.require(req, res, Auth.DL)) return;
    var query = {};
    if(req.session.auth == Auth.DL) query = { district: req.session.district };
    else if(req.session.auth == Auth.ZL) query = { zone: req.session.zone };
    db.missionary.find(query).toArray(function(error, items) {
        var zones = {};
        for(var i = 0; i < items.length; i++) {
            var item = items[i];
            if(!zones[item.zone]) zones[item.zone] = {};
            var zone = zones[item.zone];
            if(!zone[item.district]) zone[item.district] = {};
            var district = zone[item.district];
            if(!district[item.area]) district[item.area] = [];
            var area = district[item.area];
            area.push({
                _id: item._id,
                name: (item.elder ? "Elder " : "Sister ") + item.lastName,
                elder: item.elder,
                standards: item.standards
            });
        }
        res.send({ standards: Config.standards, zones: zones });
    });
});
server.post('/standards/save', function (req, res) {
    if(Auth.require(req, res, Auth.DL)) return;
    db.missionary.find().toArray(function(error, items) {
        if(error) { console.log(error); res.send(500); return; }
        var missionaries = req.body;
        var dbMissionaries = {};
        var today = formatDate(new Date());
        for(var i = 0, length = items.length; i < length; i++) {
            dbMissionaries[items[i]._id] = items[i];
        }
        for(var i = 0, length = missionaries.length; i < length; i++) {
            var missionary = missionaries[i];
            var id = missionary._id;
            var dbStandards = dbMissionaries[id].standards;
            var standards = {};
            for(var standard in missionary.standards) {
                if(missionary.standards[standard]) {
                    standards[standard] = dbStandards[standard] || today;
                }
            }
            var query = { _id: new mongodb.ObjectID(id) };
            if(req.session.auth == Auth.DL) query.district = req.session.district;
            else if(req.session.auth == Auth.ZL) query.zone = req.session.zone;
            var update = { $set: { standards: standards } };
            db.missionary.update(query, update, dbLogIfError);
        }
        res.send();
    });
});
server.post('/standards/admin', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var deleted = req.body.deleted;
    var modified = req.body.modified;
    var modifiedIds = [];
    for(var id in modified) modifiedIds.push(id);
    var inserted = req.body.inserted;
    var i = -1;
    function deleteStandard(error, result) {
        if(error) { console.log(error); res.send(500); return; }
        if(++i < deleted.length) {
            var query = { _id: new mongodb.ObjectID(deleted[i]) };
            db.standards.remove(query, deleteStandard);
        }
        else {
            i = -1;
            updateStandard();
        }
    }
    function updateStandard(error, result) {
        if(error) { console.log(error); res.send(500); return; }
        if(++i < modifiedIds.length) {
            var id = modifiedIds[i];
            var query = { _id: new mongodb.ObjectID(id) };
            db.standards.update(query, modified[id], updateStandard);
        }
        else {
            db.standards.insert(inserted, function(error, result) {
                if(error) { console.log(error); res.send(500); }
                else getStandards(function() { res.send(); });
            });
        }
    }
    deleteStandard();
});
server.get('/standards/standards.csv', function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    db.standards.find().toArray(function(error, items) {
        if(error) { console.log(error); res.send(500); return; }
        var headings = [ "Missionary" ];
        var ids = [ null ];
        for(var i = 0; i < items.length; i++) {
            var standard = items[i];
            headings.push(standard.name);
            ids.push(standard._id);
        }
        var lines = [];
        var cursor = db.missionary.find();
        function addRecord(error, result) {
            if(error) { console.log(error); res.send(500); }
            else if(result) {
                //Add missionary name
                var name = result.lastName + ", " + result.firstName;
                if(result.middleName) name += " " + result.middleName;
                var line = [ name ];
                //Get the status of each standard
                var missionaryStandards = result.standards;
                for(var i = 1; i < headings.length; i++) {
                    var completed = missionaryStandards[ids[i]];
                    line[i] = completed ? "TRUE" : "FALSE";
                }
                lines.push(line);
                cursor.next(addRecord);
            }
            else {
                lines.splice(0, 0, headings);
                res.set('Content-Type', 'text/csv');
                res.send(csv.arrayToCsv(lines));
                return;
            }
        }
        cursor.next(addRecord);
    });
});

server.get('/cards', function (req, res) {
    if(Auth.require(req, res, Auth.NORMAL)) return;
    render(req, res, "cards", {
        price: parseFloat(Config.cards.price).toFixed(2),
        holderPrice: parseFloat(Config.cards.holderPrice).toFixed(2),
        values: {
            packs: 1,
            holders: 0,
            name: req.session.prefix + req.session.fullName,
            address1: "",
            address2: "",
            address3: "",
            email: ""
        },
        message: "",
        success: false
    });
});
server.post('/cards', function (req, res) {
    if(Auth.require(req, res, Auth.NORMAL)) return;
    var subject = "Card Order for " + req.body.name;
    var date = new Date();
    date = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000 + 1000 * 60 * 60 * 10);
    var packCost = parseFloat(Config.cards.price) * req.body.packs;
    var holderCost = parseFloat(Config.cards.holderPrice) * req.body.holders;
    var cost = (packCost + holderCost).toFixed(2);
    var message = [
        'Date: ' + date.toLocaleDateString() + '<br />',
        'User: ' + req.session.displayName + ' (' + req.session.username + ')<br />',
        'Number of Packs: ' + req.body.packs + '<br />',
        'Number of Card Holders: ' + req.body.holders + '<br />',
        'Total Cost: $' + cost + '<br />',
        '<h2>Name</h2>' + req.body.name,
        '<h2>Address Line 1</h2>' + req.body.address1,
        '<h2>Address Line 2</h2>' + req.body.address2,
        '<h2>Address Line 3</h2>' + req.body.address3,
        '<h2>Email</h2>' + req.body.email
    ].join('');
    Email.send({
        to: [{ name: Config.cards.printerName, email: Config.cards.printerEmail }],
        cc: [{ name: Config.cards.financeName, email: Config.cards.financeEmail }],
        subject: subject,
        message: message,
        callback: function(error, response) {
            render(req, res, "cards", {
                price: parseFloat(Config.cards.price).toFixed(2),
                holderPrice: parseFloat(Config.cards.holderPrice).toFixed(2),
                values: {
                    packs: req.body.packs,
                    holders: req.body.holders,
                    name: req.body.name,
                    address1: req.body.address1,
                    address2: req.body.address2,
                    address3: req.body.address3,
                    email: req.body.email
                },
                message: error ?
                    "There was an error placing your order! Please try again or call the office." :
                    "Your order has been successfully placed!",
                success: !error
            });
        }
    });
});

server.get('/store', function(req, res) {
    if(Auth.require(req, res, Auth.NORMAL)) return;
    render(req, res, "store", {});
});
server.post('/store/order', function(req, res) {
    if(Auth.require(req, res, Auth.NORMAL)) return;
    var data = {
        user: req.session.displayName + " (" + req.session.username + ")",
        missionary: req.body.missionary,
        area: req.body.area,
        zone: req.body.zone,
        items: req.body.items
    };
    db.orders.insert(data, {w:1}, dbCallback);
});
server.get('/store/items', function(req, res) {
    if(Auth.require(req, res, Auth.NORMAL)) return;
    db.store.find().toArray(function(error, items) {
        if(error) { console.log(error); res.send(500); }
        else res.send(items);
    });
});

function setConfig(category, name, value) {
    Config[category][name] = value;
    var query = { category: category, name: name };
    var update = { category: category, name: name, value: value };
    db.config.update(query, update, { upsert: true }, dbLogIfError);
}
server.get('/config', function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    render(req, res, "config", { config: Config });
});
server.post('/config/update', function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var query = { category: req.body.category, name: req.body.name };
    var update = {
        category: req.body.category,
        name: req.body.name,
        value: req.body.value
    };
    db.config.update(query, update, { upsert: true }, function(err, result) {
        if(err) { console.log(err); res.send(500, err); }
        else {
            Config[req.body.category][req.body.name] = req.body.value;
            res.redirect('/config');
        }
    });
});
server.get('/config/dump', function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    dumpConfig();
    res.send('Config dumped to console');
});

server.get('/historical_data', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    render(req, res, "historical_data", {});
});

server.get('/recommendations', function (req, res) {
    if(Auth.require(req, res, Auth.ZL)) return;
    render(req, res, "recommendations", {
        zoneName: (req.session.position == "SISTER_TRAINING_LEADER" ? req.session.unit : req.session.zone) || req.session.username,
        zoneLeader: req.session.sso ? req.session.displayName : ""
    });
});
server.get('/recommendations/get_missionaries', function (req, res) {
    if(Auth.require(req, res, Auth.ZL)) return;
    db.missionary.find().toArray(function(error, items) {
        var areaNames = {}, areas = [];
        for(var i = 0; i < items.length; i++) {
            var missionary = items[i];
            if((req.session.position == "ZONE_LEADER" || req.session.position == "ZONE_LEADER_LEAD") && missionary.zone != req.session.zone) continue;
            if(!areaNames[missionary.area]) areaNames[missionary.area] = areas[areas.length] = [ missionary.area, missionary.zone ];
            areaNames[missionary.area].push((missionary.elder ? "Elder " : "Sister ") + missionary.fullName);
        }
        res.send({ all: req.session.position != "ZONE_LEADER" && req.session.position != "ZONE_LEADER_LEAD", areas: areas });
    });
});
server.get('/recommendations/success', function (req, res) {
    if(Auth.require(req, res, Auth.ZL)) return;
    render(req, res, "recommendations_success", {});
});
server.post("/recommendations/submit", function(req, res) {
    if(Auth.require(req, res, Auth.ZL)) return;
    var data = [];
    var zone = req.session.zone || req.session.username;
    var zoneLeader = req.session.sso ? req.session.displayName : req.body[0].zoneLeader;
    for(var i = 0; i < req.body.length; i++) {
        data.push({
            date: formatDate(new Date()),
            zoneLeader: zoneLeader,
            zone: req.body[i].zone,
            area: req.body[i].area,
            name: req.body[i].name,
            transfersInArea: req.body[i].tIn,
            transfersLeft: req.body[i].tLeft,
            stayOrGo: req.body[i].stay,
            leadership: req.body[i].leadership,
            comments: req.body[i].comments
        });
    }
    db.recommendations.insert(data, dbCallback);
    res.send(200);
});

server.get('/admin/recommendations', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    render(req, res, "admin_recommendations", {});
});
server.get('/admin/recommendations/get', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var date = new Date();
    date.setDate(date.getDate() - 7 * 6 * Config.recommendations.viewNumber);
    var query = { date: { $gt: formatDate(date) } };
    db.recommendations.find(query).toArray(function(err, items) {
        if(err) { console.log(err); res.send(500); }
        else res.send(items, 200);
    });
});

//Users
server.get('/admin/users', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    db.users.find().toArray(function(err, items) {
        if(err) { console.log(err); return; }
        var users = [];
        for(var i = 0; i < items.length; i++) {
            users.push({
                username: items[i].username,
                auth: items[i].auth
            });
        }
        render(req, res, "admin", { users: users });
    });
});
server.post('/admin/users/create', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var data = {
        username: req.param('username'),
        password: md5(req.param('password')),
        auth: parseInt(req.param('auth'), 10)
    };
    //Disallow \/"'()*&^%$#@!~ etc...
    db.users.insert(data, {w:1}, dbCallback);
    res.redirect('/admin/users');
});
server.post('/admin/users/delete', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    db.users.remove({ username: req.param('username')}, {w:1}, dbCallback);
    res.redirect('/admin/users');
});

//Graphs
server.post('/historical_data/db', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    if(req.body.action == "get") {
        db.indicators.find().toArray(function(err, items) {
            if(err) console.log(err);
            else res.send(items);
        });
    }
    else res.send(500, "Unknown action");
});

//Callsheet
new Page("/callsheet", "callsheet.jade", Auth.ADMIN);
server.post('/callsheet/db', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var collection = db.callsheet;
    if(req.body.action == "insert") {
        var data = req.body.data;
        collection.remove({}, {w:1}, function (err, result) {
            if(err) { console.log(err); res.send(500, err); return; }
            collection.insert(data, {w:1}, function (err, result) {
                if(err) { console.log(err); res.send(500, err); }
                else res.send(200);
            });
        });
    }
    else if(req.body.action == "get") {
        collection.findOne({}, function(err, result) {
            if(err) { console.log(err); res.send(500, err); return; }
            res.send(result);
        })
    }
    else res.send(500, "Unknown action");
});

new Page("/graphs", "graphs.jade", Auth.ADMIN);

function getLatestIndicators() {
    db.indicators.findOne({ $query: {}, $orderby: { date: -1 }}, function(err, result) {
        if(result) Config.indicators.latestDate = result.date;
        else Config.indicators.latestDate = "2013-08-01";
    });
}

function cloneCollection(fromCollection, toCollection, callback) {
    var newItems = [], cursor = fromCollection.find({});
    //Clear existing records
    toCollection.remove({}, function(error, result) {
        if(error) callback(error);
        else cursor.each(function(error, item) {
            if(error) callback(error);
            else if(item) {
                var newItem = {};
                for(var key in item) {
                    if(key != "_id") newItem[key] = item[key];
                }
                newItems.push(newItem);
            }
            else toCollection.insert(newItems, function(error, result) {
                if(error) callback(error);
                else callback();
            });
        });
    });
}
server.get("/import/save_indicators", function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    cloneCollection(db.indicators, db.savedIndicators, function(error) {
        if(error) { console.log(error); res.send(500, error); }
        else res.send("Success!");
    });
});
server.get("/import/reset_indicators", function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    cloneCollection(db.savedIndicators, db.indicators, function(error) {
        if(error) { console.log(error); res.send(500, error); }
        else res.send("Success!");
    });
});

//Importing / Exporting
new Page("/import", "import.jade", Auth.ADMIN);
var importCollections = null;
server.post('/import/db', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var collection = importCollections[req.body.collection];
    if(req.body.action == "insert") {
        collection.insert(req.body.data, {w:1}, function (err, result) {
            if(err) { console.log(err); res.send(500, err); }
            else res.send(result);
        });
    }
    else if(req.body.action == "delete") {
        collection.remove({}, {w:1}, function (err, result) {
            if(err) { console.log(err); res.send(500, err); }
            else res.send();
        });
    }
    else res.send(500, "Unknown action");
});
server.get('/import/clear_indicators', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    db.indicators.remove({}, function(error, result) {
        if(error) { console.log(error); res.send(500, error); }
        else res.send();
        getLatestIndicators();
    });
});
var wardAlias = {
    "Manly Australia": "Manly",
    "Burpengary Australia": "Burpengary",
    "River Terrace YSA": "River Terrace",
    "Bracken Ridge": "Brackenridge",
    "Burleigh": "Burleigh Heads",
    "Warwick Ward": "Warwick",
    "Mount Isa Australia": "Mount Isa",
    "Mt. Isa": "Mount Isa",
    "Cairns  1st": "Cairns 1st",
    "Cairns  2nd": "Cairns 2nd"
};
function sortByMonth(data) {
    var months = [
        null,
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];
    for(var i = 0; i < data.length; i++) {
        var dates = data[i][0].split("-");
        data[i][0] = months[parseInt(dates[1])] + "-" + dates[0];
    }
}
function checkForMissionary(missionaries, missionary) {
    for(var i = 0; i < missionaries.length; i++) {
        if(missionaries[i] == missionary) return true;
    }
    return false;
}
server.get('/import/indicators.csv', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var line = [], data = [], headings = [
        "Date",
        "Area",
        "District",
        "Zone",
        "Ward",
        "Missionaries",
        "Baptized",
        "Confirmed",
        "Baptismal Dates",
        "Investigators at Sacrament",
        "Member Present Lessons",
        "Other Lessons",
        "Progressing Investigators",
        "Referrals Received",
        "Referrals Contacted",
        "New Investigators",
        "Recent Convert and Less-Active Lessons",
        "Finding Hours",
        "Potential Investigators"
    ];
    var dbNames = {
        "date": "Date",
        "area": "Area",
        "district": "District",
        "zone": "Zone",
        "ward": "Ward",
        "missionaries": "Missionaries",
        "baptised": "Baptized",
        "confirmed": "Confirmed",
        "baptismalDate": "Baptismal Dates",
        "sacrament": "Investigators at Sacrament",
        "memberPresent": "Member Present Lessons",
        "otherLesson": "Other Lessons",
        "progressing": "Progressing Investigators",
        "received": "Referrals Received",
        "contacted": "Referrals Contacted",
        "newInvestigators": "New Investigators",
        "rcla": "Recent Convert and Less-Active Lessons",
        "finding": "Finding Hours",
        "potentials": "Potential Investigators"
    };
    var indexes = {};
    for(var key in dbNames) {
        var name = dbNames[key];
        for(var i = 0; i < headings.length; i++) {
            if(headings[i] == name) {
                indexes[key] = i;
                break;
            }
        }
    }
    var cursor = db.indicators.find();
    cursor.each(function(err, doc) {
        if(err) { console.log(err); return; }
        if(!doc) {
            data.sort(function(a, b) {
                if(a[0] > b[0]) return 1;
                if(a[0] < b[0]) return -1;
                return 0;
            });
            if(req.query.months) sortByMonth(data);
            data.splice(0, 0, headings);
            res.set('Content-Type', 'text/csv');
            res.send(csv.arrayToCsv(data));
            return;
        }
        line = [];
        for(var i = 0; i < headings.length; i++) line[i] = "";
        for(var key in doc) {
            if(key == "_id") continue;
            var value = doc[key];
            if(key == "missionaries") {
                var missionaries = [];
                if(req.query.missionary && !checkForMissionary(value, req.query.missionary)) return;
                for(var i in value) {
                    if(!req.query.shortName) missionaries.push(value[i].substring(0, value[i].indexOf(',')));
                    else missionaries.push(value[i]);
                }
                line[indexes.missionaries] = missionaries.join(" / ");
            }
            else if(key == "ward") line[indexes["ward"]] = wardAlias[value] || value;
            else line[indexes[key]] = value;
        }
        data.push(line);
    });
});
server.get('/import/indicators2.csv', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var line = [], data = [], headings = [
        "Date",
        "Area",
        "District",
        "Zone",
        "Ward",
        "Missionaries",
        "Baptized",
        "Confirmed",
        "Baptismal Dates",
        "Investigators at Sacrament",
        "Member Present Lessons",
        "Other Lessons",
        "Progressing Investigators",
        "Referrals Received",
        "Referrals Contacted",
        "New Investigators",
        "Recent Convert and Less-Active Lessons",
        "Finding Hours",
        "Potential Investigators"
    ];
    var dbNames = {
        "date": "Date",
        "area": "Area",
        "district": "District",
        "zone": "Zone",
        "ward": "Ward",
        "missionaries": "Missionaries",
        "baptised": "Baptized",
        "confirmed": "Confirmed",
        "baptismalDate": "Baptismal Dates",
        "sacrament": "Investigators at Sacrament",
        "memberPresent": "Member Present Lessons",
        "otherLesson": "Other Lessons",
        "progressing": "Progressing Investigators",
        "received": "Referrals Received",
        "contacted": "Referrals Contacted",
        "newInvestigators": "New Investigators",
        "rcla": "Recent Convert and Less-Active Lessons",
        "finding": "Finding Hours",
        "potentials": "Potential Investigators"
    };
    var indexes = {};
    for(var key in dbNames) {
        var name = dbNames[key];
        for(var i = 0; i < headings.length; i++) {
            if(headings[i] == name) {
                indexes[key] = i;
                break;
            }
        }
    }
    var cursor = db.indicators.find();
    cursor.each(function(err, doc) {
        if(err) { console.log(err); return; }
        if(!doc) {
            data.sort(function(a, b) {
                if(a[0] > b[0]) return 1;
                if(a[0] < b[0]) return -1;
                return 0;
            });
            if(req.query.months) sortByMonth(data);
            data.splice(0, 0, headings);
            res.set('Content-Type', 'text/csv');
            res.send(csv.arrayToCsv(data));
            return;
        }
        line = [];
        for(var i = 0; i < headings.length; i++) line[i] = "";
        for(var key in doc) {
            if(key == "_id" || key == "missionaries") continue;
            var value = doc[key];
            if(key == "ward") line[indexes["ward"]] = wardAlias[value] || value;
            else line[indexes[key]] = value;
        }
        for(var m in doc.missionaries) {
            var newLine = [];
            for(var i = 0; i < line.length; i++) newLine[i] = line[i];
            newLine[indexes["missionaries"]] = doc.missionaries[m];
            data.push(newLine);
        }
    });
});
server.get('/import/stake_effectiveness_data.csv', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var line = [], data = [], headings = [
        ["Date", "date"],
        ["Area", "area"],
        ["District", "district"],
        ["Zone", "zone"],
        ["Ward", "ward"],
        ["Missionaries", "missionaries"],
        ["Baptized", "baptised"],
        ["Confirmed", "confirmed"],
        ["Baptismal Dates", "baptismalDate"],
        ["Investigators at Sacrament", "sacrament"],
        ["Member Present Lessons", "memberPresent"],
        ["Other Lessons", "otherLesson"],
        ["Progressing Investigators", "progressing"],
        ["Referrals Received", "received"],
        ["Referrals Contacted", "contacted"],
        ["New Investigators", "newInvestigators"],
        ["Recent Convert and Less-Active Lessons", "rcla"],
        ["Finding Hours", "finding"],
        ["Potential Investigators", "potentials"]
    ];
    var cursor = db.indicators.find();
    cursor.each(function(err, doc) {
        if(err) { console.log(err); return; }
        if(!doc) {
            data.sort(function(a, b) {
                if(a[0] > b[0]) return 1;
                if(a[0] < b[0]) return -1;
                return 0;
            });
            sortByMonth(data);
            line = [];
            for(var i in headings) line[i] = headings[i][0];
            data.splice(0, 0, line);
            res.set('Content-Type', 'text/csv');
            res.send(csv.arrayToCsv(data));
            return;
        }
        line = [];
        for(var key in headings) {
            var name = headings[key][1];
            var value = doc[name];
            if(value === undefined) line[key] = "";
            else if(name == "missionaries") {
                var missionaries = [];
                for(var i in value) missionaries.push(value[i].substring(0, value[i].indexOf(',')));
                line[key] = missionaries.join(' / ');
            }
            else if(name == "ward") line[key] = wardAlias[value] || value;
            else line[key] = value;
        }
        data.push(line);
    });
});
server.get('/import/indicators_by_month.csv', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var line = [], data = [], headings = [
        ["Date", "date"],
        ["Area", "area"],
        ["District", "district"],
        ["Zone", "zone"],
        ["Ward", "ward"],
        ["Missionaries", "missionaries"],
        ["Baptized", "baptised"],
        ["Confirmed", "confirmed"],
        ["Baptismal Dates", "baptismalDate"],
        ["Investigators at Sacrament", "sacrament"],
        ["Member Present Lessons", "memberPresent"],
        ["Other Lessons", "otherLesson"],
        ["Progressing Investigators", "progressing"],
        ["Referrals Received", "received"],
        ["Referrals Contacted", "contacted"],
        ["New Investigators", "newInvestigators"],
        ["Recent Convert and Less-Active Lessons", "rcla"],
        ["Finding Hours", "finding"],
        ["Potential Investigators", "potentials"]
    ];
    var cursor = db.indicators.find();
    cursor.each(function(err, doc) {
        if(err) { console.log(err); return; }
        if(!doc) {
            data.sort(function(a, b) {
                if(a[0] > b[0]) return 1;
                if(a[0] < b[0]) return -1;
                return 0;
            });
            sortByMonth(data);
            line = [];
            for(var i in headings) line[i] = headings[i][0];
            data.splice(0, 0, line);
            res.set('Content-Type', 'text/csv');
            res.send(csv.arrayToCsv(data));
            return;
        }
        line = [];
        for(var key in headings) {
            var name = headings[key][1];
            var value = doc[name];
            if(value === undefined) line[key] = "";
            else if(name == "missionaries") {
                var missionaries = [];
                for(var i in value) missionaries.push(value[i].substring(0, value[i].indexOf(',')));
                line[key] = missionaries.join(' / ');
            }
            else if(name == "ward") line[key] = wardAlias[value] || value;
            else line[key] = value;
        }
        data.push(line);
    });
});
server.get('/import/effectiveness_data.csv', function (req, res) {
    //if(Auth.require(req, res, Auth.ADMIN)) return;
    var line = [], data = [], headings = [
        ["Date", "date"],
        ["Area", "area"],
        ["District", "district"],
        ["Zone", "zone"],
        ["Ward", "ward"],
        ["Missionaries", "missionaries"],
        ["Baptized", "baptised"],
        ["Confirmed", "confirmed"],
        ["Baptismal Dates", "baptismalDate"],
        ["Investigators at Sacrament", "sacrament"],
        ["Member Present Lessons", "memberPresent"],
        ["Other Lessons", "otherLesson"],
        ["Progressing Investigators", "progressing"],
        ["Referrals Received", "received"],
        ["Referrals Contacted", "contacted"],
        ["New Investigators", "newInvestigators"],
        ["Recent Convert and Less-Active Lessons", "rcla"],
        ["Finding Hours", "finding"],
        ["Potential Investigators", "potentials"]
    ];
    var date = new Date();
    date.setDate(date.getDate() - 7 * 3);
    var cursor = db.indicators.find(/*{ date: { $gte: date } }*/);
    cursor.each(function(err, doc) {
        if(err) { console.log(err); return; }
        if(!doc) {
            data.sort(function(a, b) {
                if(a[0] > b[0]) return 1;
                if(a[0] < b[0]) return -1;
                return 0;
            });
            line = [];
            for(var i in headings) line[i] = headings[i][0];
            data.splice(0, 0, line);
            res.set('Content-Type', 'text/csv');
            res.send(csv.arrayToCsv(data));
            return;
        }
        line = [];
        for(var key in headings) {
            var name = headings[key][1];
            var value = doc[name];
            if(value === undefined) line[key] = "";
            else if(name == "missionaries") {
                var missionaries = [];
                for(var i in value) missionaries.push(value[i].substring(0, value[i].indexOf(',')));
                line[key] = missionaries.join(' / ');
            }
            //else if(name == "ward") line[key] = wardAlias[value] || value;
            else line[key] = value;
        }
        data.push(line);
    });
});

//Area Analysis
server.get('/maps', function (req, res) {
    if(Auth.require(req, res, Auth.NORMAL)) return;
    render(req, res, "area", {});
    if(checkDaysPassed(Config.chapels.lastUpdate, 7)) updateChapels();
});

server.get("/force_chapel_update", function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    updateChapels();
    res.send("Updating chapels...");
});
var updatingChapels = false;
function updateChapels() {
    if(updatingChapels) return;
    updatingChapels = true;
    console.log("CHAPELS: Updating...");
    db.units.find().toArray(function(error, items) {
        if(error) { console.log(error); updatingChapels = false; return; }
        var index = -1, chapels = {}, retries = 0;
        function update() {
            if(++index >= items.length) {
                //We've done every unit so add the chapels now
                db.chapel.remove(function(error, result) {
                    if(error) { console.log(error); updatingChapels = false; return; }
                    var insert = [];
                    for(var address in chapels) insert.push(chapels[address]);
                    db.chapel.insert(insert, function(error, result) {
                        if(error) console.log(error);
                        else console.log("CHAPELS: Finished updating!");
                        setConfig("chapels", "lastUpdate", new Date());
                        updatingChapels = false;
                    });
                });
                return;
            }
            var unit = items[index];
            if(unit.name.toLowerCase() == "australia brisbane mission") {
                console.log("CHAPELS: Skipping ABM Branch...");
                if(index && !(index % 10)) console.log("CHAPELS: " + Math.round(index / items.length * 100) + "%");
                setTimeout(update, 10000);
                return;
            }
            var unitName = unit.name.replace(/ /g, "+") + (unit.branch ? "+Branch" : "+Ward");
            var uri = "https://www.lds.org/maps/services/search?query=" + unitName;
            request({ uri: uri, method: "GET" }, function(error, response, body) {
                var status = response.statusCode, result = [];
                if(error) {
                    console.log("Error Connecting to Server: " + error);
                    //Retry if it fails
                    if(retries < 3) {
                        retries++;
                        index--;
                    }
                    else console.log("Failed finding " + unitName);
                }
                else if(status != 200) {
                    console.log("Status Error: " + status);
                    //Retry if it fails
                    if(retries < 3) {
                        retries++;
                        index--;
                    }
                    else console.log("Failed finding " + unitName);
                }
                else {
                    try { result = JSON.parse(body); retries = 0; }
                    catch(error) {
                        console.log("Parse Error: " + error);
                        //Retry if it fails
                        if(retries < 3) {
                            retries++;
                            index--;
                        }
                        else console.log("Failed finding " + unitName);
                    }
                }
                //Try and find the best result (First result is not always
                //the chapel and ABM chapels are not all in Queensland)
                var bestResult = null;
                for(var i = 0, length = result.length; i < length; i++) {
                    var item = result[i];
                    if(item.type != "ward" && item.type != "branch") continue;
                    var address = item.address;
                    if(!address) continue;
                    if(address.state == "QUEENSLAND") { bestResult = item; break; }
                    else if(address.country == "AUSTRALIA" && !bestResult) bestResult = item;
                }
                if(bestResult) {
                    var addy = bestResult.address;
                    var address = "";
                    if(addy.street) address += capitalise(addy.street);
                    if(addy.city) address += ", " + capitalise(addy.city);
                    if(addy.state) address += ", " + capitalise(addy.state);
                    if(addy.zip) address += " " + addy.zip;
                    var name = addy.city ? capitalise(addy.city) : unit.name;
                    var position = [ bestResult.coordinates[1], bestResult.coordinates[0] ];
                    if(chapels[address]) chapels[address].units.push(unit.name);
                    else chapels[address] = {
                        name: name,
                        address: address,
                        units: [ unit.name ],
                        position: position
                    };
                    var query = { _id: unit._id };
                    var data = { $set: { chapel: name, phone: bestResult.phone } };
                    db.units.update(query, data, dbLogIfError);
                }
                else console.log("CHAPELS: NO RESULTS FOR " + unitName + "!!!");
                //Log the progress of updating all the chapels
                if(index && !(index % 10)) console.log("CHAPELS: " + Math.round(index / items.length * 100) + "%");
                setTimeout(update, 10000);
            });
        }
        update();
    });
}

var areaAnalysisCollections = null;
server.post("/maps/splits/reset", function(req, res) {
    if(Auth.require(req, res, Auth.NORMAL, true)) return;
    //Non-admin users cannot edit other unit's area boundaries
    if(req.session.auth < Auth.ZL && req.body.unit != req.session.unit) {
        res.send(500);
        return;
    }
    //Remove area boundaries belonging to the unit
    var query = { unit: req.body.unit };
    var update = { $set: {
        boundaries: [],
        centroid: null,
        centroidDistance: null,
        chapelDistance: null,
        chapelPath: null,
        size: null
    } };
    db.area.update(query, update, { multi: true }, function(err, result) {
        if(err) { console.log(err); res.send(500, err); return; }
        //Reset the unit's shared boundaries
        var query = { name: req.body.unit };
        var update = { $set: { sharedBoundaries: null } };
        db.units.update(query, update, function(err, result) {
            if(err) { console.log(err); res.send(500, err); }
            else res.send();
        });
    });
});
server.post("/maps/splits/add", function(req, res) {
    if(Auth.require(req, res, Auth.NORMAL, true)) return;
    //Non-admin users cannot edit other unit's area boundaries
    if(req.session.auth < Auth.ZL && req.body.unit != req.session.unit) {
        res.send(500);
        return;
    }
    //Update area boundaries
    var query = { name: req.body.area };
    var update = { $set: { boundaries: req.body.boundaries } };
    db.area.update(query, update, function(err, result) {
        if(err) { console.log(err); res.send(500, err); return; }
        var query = { unit: req.body.unit };
        var update = { $set: {
            centroid: null,
            centroidDistance: null,
            chapelDistance: null,
            chapelPath: null,
            size: null
        } };
        db.area.update(query, update, { multi: true }, function(err, result) {
            if(err) { console.log(err); res.send(500, err); return; }
            var query = { name: req.body.unit };
            var update = { $set: { sharedBoundaries: req.body.sharedBoundaries } };
            db.units.update(query, update, function(err, result) {
                if(err) { console.log(err); res.send(500, err); }
                else res.send();
            });
        });
    });
});
server.post('/maps/units', function(req, res) {
    if(Auth.require(req, res, Auth.ADMIN, true)) return;
    db.units.remove(function(error, result) {
        if(error) { console.log(error); res.send(500, error); }
        else db.units.insert(req.body.units, function(error, result) {
            if(error) { console.log(error); res.send(500, error); }
            else res.send();
        });
    });
});
server.post("/maps/update_missing", function(req, res) {
    if(Auth.require(req, res, Auth.NORMAL, true)) return;
    var index = -1;
    function next(error, result) {
        if(error) { console.log(error); res.send(500, error); }
        else if(++index < req.body.length) {
            var item = req.body[index];
            var query = { name: item.name };
            var update = { $set: item.update };
            db.area.update(query, update, next);
        }
        else res.send();
    }
    next();
});
server.post('/maps/db', function (req, res) {
    if(Auth.require(req, res, Auth.NORMAL)) return;
    var collection, id;
    collection = areaAnalysisCollections[req.body.collection];
    if(req.body.action == "getall") {
        if(req.session.auth < Auth.ADMIN && !req.session.senior) {
            if(req.body.collection == "units") {
                collection.findOne({ name: req.session.unit }, function(error, result) {
                    if(error) { console.log(error); res.send(500); }
                    else if(result) collection.find({ stake: result.stake }).toArray(function(err, items) {
                        if(err) { console.log(err); res.send(500); }
                        else res.send(items);
                    });
                    else console.log("Error: Unit '" + req.session.unit + "' is not in the database!");
                });
            }
            else if(req.body.collection == "area") {
                collection.find({ zone: req.session.zone }).toArray(function(err, items) {
                    if(err) { console.log(err); res.send(500); }
                    else res.send(items);
                });
            }
            else if(req.body.collection == "flat") {
                collection.find().toArray(function(err, items) {
                    if(err) { console.log(err); res.send(500, err); }
                    else db.area.find({ zone: req.session.zone }).toArray(function(err, areas) {
                        var flats = [];
                        for(var a = 0, length = items.length; a < length; a++) {
                            var flat = items[a];
                            var name = flat.name.toLowerCase();
                            var areasInFlat = flat.areas;
                            var inZone = name.indexOf("office") >= 0 || name.indexOf("home") >= 0;
                            if(inZone) flats.push(flat);
                            else if(areasInFlat) for(var b = 0; b < areasInFlat.length; b++) {
                                var areaName = areasInFlat[b];
                                for(var c = 0; c < areas.length; c++) {
                                    if(areaName == areas[c].name) {
                                        flats.push(flat);
                                        inZone = true;
                                        break;
                                    }
                                }
                                if(inZone) break;
                            }
                        }
                        res.send(flats);
                    });
                });
            }
            else collection.find().toArray(function(err, items) {
                if(err) { console.log(err); res.send(500, err); }
                else res.send(items);
            });
        }
        else collection.find().toArray(function(err, items) {
            if(err) { console.log(err); res.send(500, err); }
            else res.send(items);
        });
    }
    else if(req.body.action == "insert") {
        collection.insert(req.body.data, function(err, result) {
            if(err) { console.log(err); res.send(500, err); }
            else { res.send(result); }
        });
    }
    else if(req.body.action == "update") {
        id = { _id: mongodb.ObjectID(req.body.id) };
        var data = req.body.data;
        collection.update(id, { $set: data }, function(err, result) {
            if(err) { console.log(err); res.send(500, err); }
            else {
                collection.find(id).toArray(function(err, items) {
                    if(err) { console.log(err); res.send(500, err); }
                    else res.send(items);
                });
            }
        });
    }
    else if(req.body.action == "remove") {
        id = { _id: mongodb.ObjectID(req.body.id) };
        collection.remove(id, {w:1}, function(err, result) {
            if(err) { console.log(err); res.send(500, err); }
            else res.send(200);
        });
    }
    else if(req.body.action == "removeall") {
        collection.remove({}, {w:1}, function(err, result) {
            if(err) { console.log(err); res.send(500, err); }
            else res.send(200);
        });
    }
    else res.send(500, "Unknown action");
});
function csvTemplate(res, collection, headings) {
    var line = [];
    for(var i = 0; i < headings.length; i++) line.push(headings[i].csvName);
    var lines = [ line ];
    var cursor = collection.find();
    function addRecord(error, result) {
        if(error) { console.log(error); res.send(500); return; }
        if(!result) {
            res.set('Content-Type', 'text/csv');
            res.send(csv.arrayToCsv(lines));
            return;
        }
        var line = [];
        for(var i = 0; i < headings.length; i++) {
            var value = result[headings[i].dbName];
            line.push((value === undefined || value === null) ? "" : value);
        }
        lines.push(line);
        cursor.next(addRecord);
    }
    cursor.next(addRecord);
}

server.get('/kilometers', function (req, res) {
    if(Auth.require(req, res, Auth.ZL)) return;
    render(req, res, "kilometers", {});
});

server.post('/kilometers/submit', function (req, res) {
    if(Auth.require(req, res, Auth.ZL)) return;
    var report = {
        zone: req.session.zone,
        date: formatDate(new Date()),
        reportedBy: req.session.displayName,
        cars: []
    };
    for(var i = 0; i < 15; i++) {
        var car = {
            license: req.body["license" + i],
            km: req.body["km" + i],
            drivers: req.body["drivers" + i],
            areas: req.body["areas" + i]
        };
        if(car.license.length && car.km.length && car.drivers.length && car.areas.length) report.cars.push(car);
    }
    function reportInserted(error, result) {
        if(error) res.send(500, "Database error: " + error);
        else res.send("Successfully submitted!");
    }
    db.kilometers.insert(report, reportInserted);
});

server.get('/kilometers_view', function(req, res) {
    if(Auth.require(req, res, Auth.OTHER, true)) return;
    var date = new Date();
    date.setUTCMonth(date.getUTCMonth() - 1);
    var query = {
        $query: {
            date: { $gt: formatDate(date) }
        },
        $orderby: { date: -1 } //Order by Descending Date
    };
    db.kilometers.find(query).toArray(function(error, result) {
        if(error) res.send(500, "Database error: " + error);
        else render(req, res,"kilometers_view", { reports: result });
    });
});
server.get('/kilometers_view/kilometers_view.csv', function(req, res){
    if(Auth.require(req, res, Auth.OTHER, true)) return;
    var date = new Date();
    date.setUTCDate(0); //current month only
    var query = {
        $query: {
            date: { $gt: formatDate(date) }
        },
        $orderby: { zone: 1 }
    };
    db.kilometers.find(query).toArray(function(error, dbItems) {
        var rows = [ [ "Zone", "Areas", "Drivers", "Number Plate", "KMs", "Date", "Reported By", ] ]; //Heading
        for(var i = 0; i < dbItems.length; i++) {
            var item = dbItems[i]; // A single Zone object (report)
            var cars = item.cars;
            cars.sort(function(a, b) {
                if(a.license > b.license) return 1;
                if(a.license < b.license) return -1;
                return 0;
            });
            for(var x = 0; x < cars.length; x++) {
                var car = cars[x]; // A single vehicle in the Zone
                //[ "Zone", "Areas", "Drivers", "Number Plate", "KMs", "Date", "Reported By", ]
                rows.push([ item.zone, car.areas, car.drivers, car.license, car.km, item.date, item.reportedBy]);
            }
            //rows.push(["----------------------"]);
        }
        res.set("Content-Type", "text/csv");
        res.send(csv.arrayToCsv(rows));
    });
});
server.get('/kilometers_archive', function(req, res) {
    if(Auth.require(req, res, Auth.OTHER, true)) return;
    var query = {
        $query: {},
        $orderby: { date: -1 } //Order by Descending Date
    };
    db.kilometers.find(query).toArray(function(error, result) {
        if(error) res.send(500, "Database error: " + error);
        else render(req, res,"kilometers_archive_view", { reports: result });
    });
});

server.listen(Config.nodejs.port, Config.nodejs.ip, function() {
    console.log("ABM Admin Website running...");
});

//-------------
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
function toWeekStart(date) {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() || 7) + 1);
}
function formatDate(date) {
    var year = date.getUTCFullYear();
    var month = date.getUTCMonth() + 1;
    if(month < 10) month = "0" + month;
    var day = date.getUTCDate();
    if(day < 10) day = "0" + day;
    return year + "-" + month + "-" + day;
}
function doNothing() {}
function escapeHtml(str) {
    return String(str).replace(/[&<>"'\/]/g, function(s) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': '&quot;',
            "'": '&#39;',
            "/": '&#x2F;'
        }[s];
    });
}
function checkDaysPassed(date, daysPassed) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysPassed);
    return date < cutoff;
}
function capitalise(title) {
	function lower(word) { return word.toLowerCase(); }
	function upper(word) { return word.substr(0, 1).toUpperCase() + word.substr(1); }
	function replaceA(all) { return (/[A-Za-z]\.[A-Za-z]/).test(all) ? all : upper(all); }
	function replaceB(all, punct, word) { return punct + upper(word); }
	var small = "(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v[.]?|via|vs[.]?)";
	var punct = "([!\"#$%&'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]*)";
	var allWords = /\b([A-Za-z][a-z.'Õ]*)\b/g;
	var smallWords = RegExp("\\b" + small + "\\b", "ig");
	var punctSmall = RegExp("^" + punct + small + "\\b", "ig");
	var smallPunct = RegExp("\\b" + small + punct + "$", "ig");
	
	title = title.toLowerCase();
	var parts = [], split = /[:.;?!] |(?: |^)["Ò]/g, index = 0, m = true;
	while(m) {
		m = split.exec(title);
		parts.push(title.substring(index, m ? m.index : title.length)
			.replace(allWords, replaceA).replace(smallWords, lower)
			.replace(punctSmall, replaceB).replace(smallPunct, upper));
		index = split.lastIndex;
		if(m) parts.push(m[0]);
	}
	
	return parts.join("").replace(/ V(s?)\. /ig, " v$1. ")
		.replace(/(['Õ])S\b/ig, "$1s")
		.replace(/\b(AT&T|Q&A)\b/ig, function(all) { return all.toUpperCase(); }).trim();
}
//-------------
function md5cycle(x, k) {
var a = x[0], b = x[1], c = x[2], d = x[3];

a = ff(a, b, c, d, k[0], 7, -680876936);
d = ff(d, a, b, c, k[1], 12, -389564586);
c = ff(c, d, a, b, k[2], 17,  606105819);
b = ff(b, c, d, a, k[3], 22, -1044525330);
a = ff(a, b, c, d, k[4], 7, -176418897);
d = ff(d, a, b, c, k[5], 12,  1200080426);
c = ff(c, d, a, b, k[6], 17, -1473231341);
b = ff(b, c, d, a, k[7], 22, -45705983);
a = ff(a, b, c, d, k[8], 7,  1770035416);
d = ff(d, a, b, c, k[9], 12, -1958414417);
c = ff(c, d, a, b, k[10], 17, -42063);
b = ff(b, c, d, a, k[11], 22, -1990404162);
a = ff(a, b, c, d, k[12], 7,  1804603682);
d = ff(d, a, b, c, k[13], 12, -40341101);
c = ff(c, d, a, b, k[14], 17, -1502002290);
b = ff(b, c, d, a, k[15], 22,  1236535329);

a = gg(a, b, c, d, k[1], 5, -165796510);
d = gg(d, a, b, c, k[6], 9, -1069501632);
c = gg(c, d, a, b, k[11], 14,  643717713);
b = gg(b, c, d, a, k[0], 20, -373897302);
a = gg(a, b, c, d, k[5], 5, -701558691);
d = gg(d, a, b, c, k[10], 9,  38016083);
c = gg(c, d, a, b, k[15], 14, -660478335);
b = gg(b, c, d, a, k[4], 20, -405537848);
a = gg(a, b, c, d, k[9], 5,  568446438);
d = gg(d, a, b, c, k[14], 9, -1019803690);
c = gg(c, d, a, b, k[3], 14, -187363961);
b = gg(b, c, d, a, k[8], 20,  1163531501);
a = gg(a, b, c, d, k[13], 5, -1444681467);
d = gg(d, a, b, c, k[2], 9, -51403784);
c = gg(c, d, a, b, k[7], 14,  1735328473);
b = gg(b, c, d, a, k[12], 20, -1926607734);

a = hh(a, b, c, d, k[5], 4, -378558);
d = hh(d, a, b, c, k[8], 11, -2022574463);
c = hh(c, d, a, b, k[11], 16,  1839030562);
b = hh(b, c, d, a, k[14], 23, -35309556);
a = hh(a, b, c, d, k[1], 4, -1530992060);
d = hh(d, a, b, c, k[4], 11,  1272893353);
c = hh(c, d, a, b, k[7], 16, -155497632);
b = hh(b, c, d, a, k[10], 23, -1094730640);
a = hh(a, b, c, d, k[13], 4,  681279174);
d = hh(d, a, b, c, k[0], 11, -358537222);
c = hh(c, d, a, b, k[3], 16, -722521979);
b = hh(b, c, d, a, k[6], 23,  76029189);
a = hh(a, b, c, d, k[9], 4, -640364487);
d = hh(d, a, b, c, k[12], 11, -421815835);
c = hh(c, d, a, b, k[15], 16,  530742520);
b = hh(b, c, d, a, k[2], 23, -995338651);

a = ii(a, b, c, d, k[0], 6, -198630844);
d = ii(d, a, b, c, k[7], 10,  1126891415);
c = ii(c, d, a, b, k[14], 15, -1416354905);
b = ii(b, c, d, a, k[5], 21, -57434055);
a = ii(a, b, c, d, k[12], 6,  1700485571);
d = ii(d, a, b, c, k[3], 10, -1894986606);
c = ii(c, d, a, b, k[10], 15, -1051523);
b = ii(b, c, d, a, k[1], 21, -2054922799);
a = ii(a, b, c, d, k[8], 6,  1873313359);
d = ii(d, a, b, c, k[15], 10, -30611744);
c = ii(c, d, a, b, k[6], 15, -1560198380);
b = ii(b, c, d, a, k[13], 21,  1309151649);
a = ii(a, b, c, d, k[4], 6, -145523070);
d = ii(d, a, b, c, k[11], 10, -1120210379);
c = ii(c, d, a, b, k[2], 15,  718787259);
b = ii(b, c, d, a, k[9], 21, -343485551);

x[0] = add32(a, x[0]);
x[1] = add32(b, x[1]);
x[2] = add32(c, x[2]);
x[3] = add32(d, x[3]);

}

function cmn(q, a, b, x, s, t) {
a = add32(add32(a, q), add32(x, t));
return add32((a << s) | (a >>> (32 - s)), b);
}

function ff(a, b, c, d, x, s, t) {
return cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
return cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
return cmn(c ^ (b | (~d)), a, b, x, s, t);
}

function md51(s) {
txt = '';
var n = s.length,
state = [1732584193, -271733879, -1732584194, 271733878], i;
for (i=64; i<=s.length; i+=64) {
md5cycle(state, md5blk(s.substring(i-64, i)));
}
s = s.substring(i-64);
var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
for (i=0; i<s.length; i++)
tail[i>>2] |= s.charCodeAt(i) << ((i%4) << 3);
tail[i>>2] |= 0x80 << ((i%4) << 3);
if (i > 55) {
md5cycle(state, tail);
for (i=0; i<16; i++) tail[i] = 0;
}
tail[14] = n*8;
md5cycle(state, tail);
return state;
}

/* there needs to be support for Unicode here,
 * unless we pretend that we can redefine the MD-5
 * algorithm for multi-byte characters (perhaps
 * by adding every four 16-bit characters and
 * shortening the sum to 32 bits). Otherwise
 * I suggest performing MD-5 as if every character
 * was two bytes--e.g., 0040 0025 = @%--but then
 * how will an ordinary MD-5 sum be matched?
 * There is no way to standardize text to something
 * like UTF-8 before transformation; speed cost is
 * utterly prohibitive. The JavaScript standard
 * itself needs to look at this: it should start
 * providing access to strings as preformed UTF-8
 * 8-bit unsigned value arrays.
 */
function md5blk(s) { /* I figured global was faster.   */
var md5blks = [], i; /* Andy King said do it this way. */
for (i=0; i<64; i+=4) {
md5blks[i>>2] = s.charCodeAt(i)
+ (s.charCodeAt(i+1) << 8)
+ (s.charCodeAt(i+2) << 16)
+ (s.charCodeAt(i+3) << 24);
}
return md5blks;
}

var hex_chr = '0123456789abcdef'.split('');

function rhex(n)
{
var s='', j=0;
for(; j<4; j++)
s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]
+ hex_chr[(n >> (j * 8)) & 0x0F];
return s;
}

function hex(x) {
for (var i=0; i<x.length; i++)
x[i] = rhex(x[i]);
return x.join('');
}

function md5(s) {
return hex(md51(s));
}

/* this function is much faster,
so if possible we use it. Some IEs
are the only ones I know of that
need the idiotic second function,
generated by an if clause.  */

function add32(a, b) {
return (a + b) & 0xFFFFFFFF;
}

if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
function add32(x, y) {
var lsw = (x & 0xFFFF) + (y & 0xFFFF),
msw = (x >> 16) + (y >> 16) + (lsw >> 16);
return (msw << 16) | (lsw & 0xFFFF);
}
}