"use strict";

let express = require("express");
let path = require("path");
let favicon = require("serve-favicon");
let logger = require("morgan");
let cookieParser = require("cookie-parser");
let bodyParser = require("body-parser");
let mongojs = require("mongojs");
let crypto = require("crypto");
let wordpos

let superSecretKey = "NO ONE WILL KNOW THIS";


let db = mongojs("words");

db.users = db.collection("users");

let app = express();

let PORT = process.env.PORT || 3000;

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");
app.set("port", process.env.PORT || 3000);

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + "/public/favicon.ico"));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(superSecretKey));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  if (req.signedCookies["word-session"]) {
    res.redirect("word");
  }
  res.render("index", {created: req.query.created});
});


app.post("/login", function (req, res) {
  if (!req.body.password) {
    res.render("index", {noPassword: true});
    return;
  }
  db.users.findOne({username: req.body.email}, function (err, user) {
    if (err) {
      throw new Error(err);
    }
    if (!user) {
      res.render("index", {invalidLogin: true});
      return;
    }
    if (user.password != hashPassword(req.body.password)) {
      console.log(req.body.password);
      res.render("index", {invalidLogin: true});
      return;
    }
    let expiresAt = new Date(Date.now() + 360000);
    res.cookie("word-session", { user: req.body.email, expires: expiresAt } , { expires: new Date(Date.now() + 60000), signed: true });
    res.redirect("word");
  });
});


app.use(function (req, res, next) {
  if (!req.signedCookies["word-session"]) {
    res.redirect("/");
    return;
  }
  next();
})

function hashPassword (password) {
  let shasum = crypto.createHash("sha1");
  shasum.update(superSecretKey);
  shasum.update(password);
  return shasum.digest("hex");
}

// respond with "Hello World!" on the homepage

app.get("/word", function (req, res) {
  res.render("word");
});

app.get("/changepassword", function (req, res) {
  res.render("changepassword");
});

app.post("/changepassword", function (req, res) {
  let username = req.signedCookies["word-session"].user;
  db.users.findOne({username: username}, function (err, user) {
    if (err) {
      throw new Error(err);
    }
    if (hashPassword(req.body["old-password"]) != user.password) {
      res.render("changepassword", {wrongPassword: true});
      return;
    }
    if (req.body["new-password"] != req.body["confirm-new-password"]) {
      res.render("changepassword", {passwordDoNotMatch: true})
      return;
    }
    db.users.update({username:username}, {$set: {password: hashPassword(req.body["new-password"])}}, function (err) {
      if (err){
        throw new Error(err);
      }
      res.clearCookie("word-session");
      res.redirect("/");
    })
  });
})


app.get("/signup", function (req, res) {
  res.render("signup");
})

app.get("/logout", function (req, res) {
  res.clearCookie("word-session");
  res.redirect("/");
})


// accept POST request on the homepage
app.post("/signup", function (req, res) {
  let providedUserName = req.body.email;
  if (req.body.password != req.body["confirm-password"]) {
    res.render("signup", {passwordDoNotMatch: true})
    return;
  }
  db.users.findOne({username: req.body.email}, function (err, user) {
    if (err) {
      throw new Error(err);
    }
    if (user) {
      res.send(400);
      // res.render("signup", {alreadyExist: true})
      return;
    }
    console.log(hashPassword(req.body.password));
    db.users.save({
      username: req.body.email,
      password: hashPassword(req.body.password)
    }, function (err) {
      if (err) {
        throw new Error(err);
      }
      res.redirect("/");
    })
  })
})

// accept DELETE request at /user
app.delete("/user", function (req, res) {
  res.send("Got a DELETE request at /user");
})


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get("env") === process.env.NODE_ENV || "development") {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: err
    });
  });
}

let server = app.listen(PORT || 3000, function () {
  console.log("words app listening at port", PORT)
})


module.exports = app;
