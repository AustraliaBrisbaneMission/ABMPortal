var express = require('express'),
    stylus = require('stylus'),
    nib = require('nib'),
    crypto = require('crypto'),
    mongodb = require('mongodb'),
    //sql = require('sql'),
    csv = require('./root/scripts/ucsv-1.1.0-min.js'),
    request = require("request"),
    fs = require("fs"),
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
        printerName: "",
        printerEmail: "",
        financeName: "",
        financeEmail: ""
    },
    imos: {
        startDate: new Date("2013-08-01"),
        latestDate: new Date("2013-08-01"),
        latestUpdate: new Date("2013-08-01"),
        daysUntilNextUpdate: 1
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
        db.callsheet = db.database.collection('callsheet');
        db.config = db.database.collection('config');
        db.store = db.database.collection('store');
        areaAnalysisCollections = {
            area: db.database.collection('area'),
            chapel: db.database.collection('chapel'),
            flat: db.database.collection('flat'),
            ward: db.database.collection('ward'),
            missionary: db.database.collection('missionaries')
        };
        imosCollections = {
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
        });
        db.indicators.findOne({ $query: {}, $orderby: { date: -1 }}, function(err, result) {
            if(result) Config.imos.latestDate = new Date(result.date);
        });
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
    login: function(req, callback) {
        var username = req.param('username'), password = req.param('password');
        /*
        //Bypass
        if(username == "admin" && password == "ldschurch") {
            req.session.username = username;
            req.session.auth = Auth.ADMIN;
            callback(true);
            return;
        }
        */
        
        function done(success) {
            //TODO: Delete SSO logging
            if(success) console.log(req.session.displayName + " (" + req.session.username + ") logged in! SSO=" + req.session.sso);
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
                req.session.sso = null;
                req.session.missionary = false;
                req.session.username = item.username;
                req.session.prefix = "";
                req.session.displayName = item.username;
                req.session.fullName = item.username;
                req.session.photoUrl = null;
                req.session.auth = item.auth;
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
                    if(error) {
                        console.log("SSO Request Error for [" + username + "]: " + error);
                    }
                    else if(response.statusCode != 200) {
                        console.log("SSO Status Error for [" + username + "]: " +
                                    response.statusCode);
                    }
                    else {
                        var cookies = response.headers["set-cookie"];
                        if(!cookies || !cookies.length) {
                            console.log("SSO Cookie Error for [" + username + "]: " +
                                        "No cookies received");
                        }
                        else {
                            req.session.sso = cookies[0].split(';')[0].split('=')[1];
                            //req.session.sso = "mI5jGtDle7ygVGheQieD9rTmJd3G1qgYCWdZeQxT%2FNBdGV4XZNfbivm9ahxygZH3uXD8VTOGh%2B01GIYL6PWjLT%2FT%2Boz5fZK6aQcuEd04XYAZ00Qr61rVMyY3%2FNPxBc%2B7oUzR4exo02owV2Nk2Ed%2BiCwG%2FyJ%2BCCq%2Bk9BhXNqHRHCXxQyogcAiWfewXtuH00EUkapfdDWrcWvT9wvULixHDLc5atrI8W%2F%2B6fbZIKal1XWW%2Bjd%2FNW0KOYiBo%2BsuvwXcl35WxYWXlwRfv1R%2BiLTMQSMpDwvJmHOAaLaIi9mmQFTwy6cbyzB8JLgWULPJVrPd4%2B%2BvDuF%2FXf2vdQXEJDoP%2Bpb7L5LRLeSRkuqH4YSwARc%3D";
                            req.session.username = username;
                            req.session.missionary = false;
                            req.session.imos = false;
                            req.session.prefix = "";
                            req.session.displayName = username;
                            req.session.fullName = username;
                            req.session.auth = Auth.OTHER;
                            //Get missionary information
                            Auth.sso(req, "https://missionary.lds.org/mcore-ws/Services/rest/missionary-assignment", function(result) {
                                if(result.asgLocName == Config.mission.name) {
                                    req.session.missionary = true;
                                    req.session.prefix = result.msnyIsElder ? "Elder " : "Sister ";
                                    req.session.displayName = req.session.prefix + result.lastName;
                                    req.session.fullName = result.fullName;
                                    req.session.auth = Auth.NORMAL;
                                }
                                else if(result.fullName) req.session.displayName = result.fullName;
                                done(true);
                            });
                            //Update IMOS information if possible
                            var now = new Date();
                            var updateTime = new Date(Config.imos.latestUpdate);
                            //Update if over a day has passed since last update
                            updateTime.setDate(updateTime.getDate() + Config.imos.daysUntilNextUpdate);
                            console.log("Now = " + now + " & updateTime = " + updateTime);
                            if(now > updateTime) Auth.updateIndicators(req);
                            return;
                        }
                    }
                    
                    //Login fail
                    Auth.logout(req);
                    done(false);
                });
            }
        });
    },
    logout: function(req) {
        req.session.sso = null;
        req.session.username = null;
        req.session.missionary = null;
        req.session.prefix = null;
        req.session.displayName = null;
        req.session.fullName = null;
        req.session.auth = Auth.NONE;
        req.session.imos = null;
    },
    require: function(req, res, auth) {
        if(req.session.auth && req.session.auth >= auth) return false;
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
            var status = response.statusCode;
            if(error) callback("Error Connecting to Server: " + error);
            else if(status != 200) callback("Status Error: " + status);
            //TODO: Refresh token when necessary
            //else callback(JSON.parse(body));
            else try { callback(JSON.parse(body)); }
            catch(error) { callback("JSON Error: " + body); }
        });
    },
    //Set 'date' to extract indicators from the previous to 'date'
    updateIndicators: function(req, date, all) {
        if(!date) date = new Date();
        //Convert the date to the Monday after the reported week
        date.setDate(date.getDate() - (date.getDay() || 7) + 1);
        //Do not sync if there are indicators in the old format
        console.log("date = " + date + " & startDate = " + Config.imos.startDate + " & latestDate = " + Config.imos.latestDate);
        if(date < Config.imos.startDate) {
            console.log("Reached IMOS start date while updating indicators. Stopping...");
            return;
        }
        if(!all && date < Config.imos.latestDate) {
            console.log("Reached latest indicators date. Stopping...");
            return;
        }
        var formattedDate = formatDate(date);
        //IMOS gets reports for the week that contains the date so minus one week
        var weekAgo = new Date(date);
        weekAgo.setDate(date.getDate() - 7);
        var imosDate = formatDate(weekAgo);
        var url = "https://imos.ldschurch.org/imos-ki-ws/report/" + imosDate + "/" + imosDate + "/mission/14292";
        Auth.sso(req, url, function(result) {
            //Return if the user does not have authority
            if(!result || !result.entity) {
                console.log("User does not have IMOS access. Stopping...");
                console.log("Result = " + result + " & url = " + url);
                return;
            }
            console.log("Getting indicators for " + formattedDate + "...");
            //Get key indicator IDs
            var logs = { "Items updated:": 0 };
            var indicatorNames = {
                "10": "baptised",
                "20": "confirmed",
                "30": "baptismalDates",
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
                for(var b = 0; b < districts.length; b++) {
                    var district = districts[b];
                    var areas = district.entities;
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
                        item.date = date;
                        //Add ward ('Chermside Ward' to 'Chermside')
                        var ward = report.name;
                        ward = ward.substring(0, ward.lastIndexOf(' '));
                        item.ward = ward;
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
                        db.indicators.update(query, item, { upsert: true }, doNothing);
                        logs["Items updated:"]++;
                    }
                }
            }
            req.session.imos = true;
            //Sync indicators for last week
            setTimeout(function() { Auth.updateIndicators(req, weekAgo); }, 10000);
            //Update latest update
            var date = new Date();
            var query = { category: "imos", name: "latestUpdate" };
            db.config.update(query, { date: date }, { upsert: true }, doNothing);
            Config.imos.latestUpdate = date;
            //Show the logs
            for(var message in logs) {
                console.log(message + " (x" + logs[message] + ")");
            }
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

//TODO: Remove these before deploying...
// --- TESTING ---
server.get('/sso', function (req, res) {
    res.send("Your SSO is: " + req.session.sso + '<form method="POST"><input type="text" name="sso" /><input type="submit"></form>');
});
server.post('/sso', function (req, res) {
    req.session.sso = req.body.sso;
    res.send("Your SSO is now set to: " + req.session.sso);
});
server.get('/update_indicators', function (req, res) {
    Auth.updateIndicators();
});
server.get('/update_indicators2', function (req, res) {
    var formattedDate = "2013-10-14";
    var url = "https://imos.ldschurch.org/imos-ki-ws/report/" + formattedDate + "/" + formattedDate + "/mission/14292";
    Auth.sso(req, url, function(result) {
        console.log("Indicators: " + result);
    });
});
// --------------

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
    params.username = req.session.username;
    params.prefix = req.session.prefix;
    params.displayName = req.session.displayName;
    params.fullName = req.session.fullName;
    params.auth = req.session.auth;
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
    render(req, res, "index", {});
});

server.get('/cards', function (req, res) {
    if(Auth.require(req, res, Auth.NORMAL)) return;
    var price = parseFloat(Config.cards.price).toFixed(2);
    render(req, res, "cards", {
        price: price,
        values: {
            packs: 1,
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
    var message = [
        'Date: ' + date.toLocaleDateString() + '<br />',
        'User: ' + req.session.displayName + ' (' + req.session.username + ')<br />',
        'Number of Packs: ' + req.body.packs + '<br />',
        'Total Cost: $' + (parseFloat(Config.cards.price) * req.body.packs).toFixed(2) + '<br />',
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
                values: {
                    packs: req.body.packs,
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
    render(req, res, "recommendations", {});
});
server.get('/recommendations/success', function (req, res) {
    if(Auth.require(req, res, Auth.ZL)) return;
    render(req, res, "recommendations_success", {});
});
server.post('/recommendations/submit', function (req, res) {
    if(Auth.require(req, res, Auth.ZL)) return;
    var data = [];
    for(var i = 0; i < req.body.length; i++) {
        data.push({
            zoneLeader: req.body[i].zoneLeader,
            zone: req.session.username,
            area: req.body[i].area,
            name: req.body[i].name,
            transfersInArea: req.body[i].tIn,
            transfersLeft: req.body[i].tLeft,
            stayOrGo: req.body[i].stay,
            leadership: req.body[i].leadership,
            comments: req.body[i].comments
        });
    }
    db.recommendations.insert(data, {w:1}, dbCallback);
    res.send(200);
    console.log(data);
});

server.get('/admin/recommendations', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    render(req, res, "admin_recommendations", {});
});
server.get('/admin/recommendations/get', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    db.recommendations.find().toArray(function(err, items) {
        if(err) { console.log(err); res.send(500); }
        else {
            for(var i = 0; i < items.length; i++) {
                var date = new Date(items[i]._id.getTimestamp());
                var year = date.getFullYear();
                var month = date.getMonth() + 1;
                var day = date.getDate();
                items[i].date = year + "-" + month + "-" + day;
            }
            res.send(items, 200);
        }
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
        var data = req.body.data, line;
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

//IMOS Importing
new Page("/imos", "imos.jade", Auth.ADMIN);
var imosCollections = null;
server.post('/imos/db', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var collection = imosCollections[req.body.collection];
    if(req.body.action == "insert") {
        var data = req.body.data, line;
        for(var i = 0; i < data.length; i++) {
            line = data[i];
            for(var key in line) {
                if(key == "date") line[key] = new Date(line[key]);
            }
        }
        collection.insert(data, {w:1}, function (err, result) {
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
server.get('/imos/indicators.csv', function (req, res) {
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
        "baptismalDates": "Baptismal Dates",
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
                for(var i in value) missionaries.push(value[i].substring(0, value[i].indexOf(',')));
                line[indexes["missionaries"]] = missionaries.join(' / ');
            }
            //TODO: Catch this before INSERTING into the database
            else if(key == "findingPotentials") {
                var finding = 0, potentials = 0;
                if(value.length > 1) {
                    finding = value.substring(0, value.length - 2);
                    potentials = value.substring(value.length - 2);
                }
                line[indexes["finding"]] = finding;
                line[indexes["potentials"]] = potentials;
            }
            else if(key == "date") {
                var day = value.getDate();
                if(day < 10) day = "0" + day;
                var month = value.getMonth() + 1;
                if(month < 10) month = "0" + month;
                var year = value.getFullYear();
                line[indexes["date"]] = year + "-" + month + "-" + day;
            }
            else if(key == "ward") line[indexes["ward"]] = wardAlias[value] || value;
            else line[indexes[key]] = value;
        }
        data.push(line);
    });
});
server.get('/imos/indicators2.csv', function (req, res) {
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
        "baptismalDates": "Baptismal Dates",
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
            //TODO: Catch this before INSERTING into the database
            if(key == "findingPotentials") {
                var finding = 0, potentials = 0;
                if(value.length > 1) {
                    finding = value.substring(0, value.length - 2);
                    potentials = value.substring(value.length - 2);
                }
                line[indexes["finding"]] = finding;
                line[indexes["potentials"]] = potentials;
            }
            else if(key == "date") {
                var day = value.getDate();
                if(day < 10) day = "0" + day;
                var month = value.getMonth() + 1;
                if(month < 10) month = "0" + month;
                var year = value.getFullYear();
                line[indexes["date"]] = year + "-" + month + "-" + day;
            }
            else if(key == "ward") line[indexes["ward"]] = wardAlias[value] || value;
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
server.get('/imos/stake_effectiveness_data.csv', function (req, res) {
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
            var month, year, months = [
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
                "Dec",
            ];
            for(var i = 0; i < data.length; i++) {
                month = months[data[i][0].getMonth()];
                year = data[i][0].getFullYear();
                data[i][0] = month + "-" + year;
            }
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
        //TODO: Catch this before INSERTING into the database
        if(doc.findingPotentials) {
            var value = doc.findingPotentials;
            var finding = value.substring(0, value.length - 2);
            var potentials = value.substring(value.length - 2);
            line[17] = finding;
            line[18] = potentials;
        }
        data.push(line);
    });
});
server.get('/imos/effectiveness_data.csv', function (req, res) {
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
            else if(name == "date") {
                var day = value.getDate();
                if(day < 10) day = "0" + day;
                var month = value.getMonth() + 1;
                if(month < 10) month = "0" + month;
                var year = value.getFullYear();
                line[key] = year + "-" + month + "-" + day;
            }
            //else if(name == "ward") line[key] = wardAlias[value] || value;
            else line[key] = value;
        }
        //TODO: Catch this before INSERTING into the database
        if(doc.findingPotentials) {
            var value = doc.findingPotentials;
            var finding = value.substring(0, value.length - 2);
            var potentials = value.substring(value.length - 2);
            line[17] = finding;
            line[18] = potentials;
        }
        data.push(line);
    });
});

//Area Analysis
server.get('/area_analysis', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    render(req, res, "area", {});
});
server.post('/area_analysis/get', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    if(req.body.id) {
        res.send({});
    }
    else {
        db[req.body.type].find().toArray(function(err, items) {
            if(err) { console.log(err); res.send(500, err); }
            else res.send(items);
        });
    }
});
server.post('/area_analysis/add', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var data = AreaAnalysis.getData(req);
    db[req.body.type].insert(data, {w:1}, function (err, result) {
            if(err) { console.log(err); res.send(500, err); }
        else res.send(result);
    });
});
server.post('/area_analysis/update', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    db[req.body.type].update({ _id: mongodb.ObjectID(req.body.id) }, {
        $set: AreaAnalysis.getData(req)
    }, {w:1}, function(err, result) {
        if(err) { console.log(err); res.send(500, err); }
        else {
            var query = { _id: mongodb.ObjectID(req.body.id) };
            db[req.body.type].find(query).toArray(function(err, items) {
                if(err) { console.log(err); res.send(500, err); }
                res.send(items, 200);
            });
        }
    });
});
server.post('/area_analysis/remove', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    db[req.body.type].remove({ _id: mongodb.ObjectID(req.body.id) }, {w:1}, function(err, result) {
        if(err) { console.log(err); res.send(500, err); }
        else res.send(200);
    });
});

var areaAnalysisCollections = null;
server.post('/area_analysis/db', function (req, res) {
    if(Auth.require(req, res, Auth.ADMIN)) return;
    var collection, id;
    //Missionary area calculator
    if(req.body.collection == "missionaryAreas") {
        var date = new Date();
        date.setDate(date.getDate() - 40);
        var query = { date: { $gt: date } };
        db.indicators.find(query).toArray(function(err, items) {
            if(err) { console.log(err); res.send(500, err); }
            else {
                console.error(date);
                var result = [], areas = {};
                for(var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if(areas[item.area]) continue;
                    areas[item.area] = true;
                    var missionaries = [];
                    for(var a = 0; a < item.missionaries.length; a++) {
                        var name = item.missionaries[a];
                        missionaries.push(name.substring(0, name.indexOf(',')));
                    }
                    result.push({
                        _id: null,
                        name: missionaries.join(' / '),
                        ward: item.ward,
                        area: item.area
                    });
                }
                console.log(result);
                res.send(result);
            }
        });
        return;
    }
    //--------------------------
    collection = areaAnalysisCollections[req.body.collection];
    if(req.body.action == "getall") {
        collection.find().toArray(function(err, items) {
            if(err) { console.log(err); res.send(500, err); }
            else res.send(items);
        });
    }
    else if(req.body.action == "insert") {
        collection.insert(req.body.data, {w:1}, function (err, result) {
            if(err) { console.log(err); res.send(500, err); }
            else { console.log(result); res.send(result); }
        });
    }
    else if(req.body.action == "update") {
        id = { _id: mongodb.ObjectID(req.body.id) };
        var data = req.body.data;
        collection.update(id, { $set: data }, {w:1}, function(err, result) {
            if(err) { console.log(err); res.send(500, err); }
            else {
                console.log(req.body.data);
                collection.find(id).toArray(function(err, items) {
                    if(err) { console.log(err); res.send(500, err); }
                    else res.send(items, 200);
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
    else res.send(500, "Unknown action");
});

server.listen(Config.nodejs.port, Config.nodejs.ip, function() {
    console.log("ABM Admin Website running...");
});

//-------------
function splitFindingPotentials(value) {
    var finding = 0, potentials = 0;
    if(value.length > 1) {
        finding = value.substring(0, value.length - 2);
        potentials = value.substring(value.length - 2);
    }
    return { finding: finding, potentials: potentials };
}
function formatDate(date) {
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    if(month < 10) month = "0" + month;
    var day = date.getDate();
    if(day < 10) day = "0" + day;
    return year + "-" + month + "-" + day;
}
function doNothing() {}
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
