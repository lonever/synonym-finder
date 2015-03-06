"use strict";

let express = require("express");
let path = require("path");
let favicon = require("serve-favicon");
let logger = require("morgan");
let cookieParser = require("cookie-parser");
let bodyParser = require("body-parser");
let mongojs = require("mongojs");
let crypto = require("crypto");
let WordPOS = require("wordpos");

let wordpos = new WordPOS();
let superSecretKey = "NO ONE WILL KNOW THIS";

let db = mongojs("words");

db.users = db.collection("users");
db.dictionary = db.collection("dictionary");

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

function findSynonyms(word, cb) {
  let found = [];
  wordpos.lookup(word, function (results) {
    for (let i = 0; i < results.length; ++i) {
      let result = results[i];
      for (let j = 0; j < result.synonyms.length; ++j) {
        let synonym = result.synonyms[j];
        if (found.indexOf(synonym) == -1) {
          found.push(synonym);
        }
      }
    }
    cb(found);
  })
}

function findSynonymsSet(words, cb) {
  let found = [];
  let pending = words.length;
  for (let i = 0; i < words.length; ++i) {
    let word = words[i];
    findSynonyms(word, function (results) {
      for (let j = 0; j < results.length; ++j) {
        if (found.indexOf(results[j]) == -1) {
          found.push(results[j]);
        }
      }
      pending--;
      if (pending == 0) {
        cb(found);
      }
    })
  }
  if (pending == 0) {
    cb(found);
  }
}

function findTieredSynonyms(word, tier, cb) {
  if (typeof(word) == "string") {
    word = [word];
  }
  if (tier != 0) {
    findSynonymsSet(word, function (results) {
      findTieredSynonyms(results, tier - 1, cb)
    });
  } else {
    cb(word);
  }
}

function storeInDictionary(username, word, results, cb) {
  db.dictionary.findOne({username: username}, function (err, doc) {
    if (err) {
      throw new Error(err);
    }
    let data = {
      query: word,
      result: results
    };

    if (!doc) {
      db.dictionary.save({
        username: username,
        data: [data]
      }, function (err) {
        if (err) {
          throw new Error(err);
        }
        cb()
      })
      return;
    }
    for (let i = 0; i < doc.data.length; ++i) {
      if (doc.data[i].query == word) {
        cb();
        return;
      }
    }
    db.dictionary.update({username: username}, {$push: {data: data}}, function (err) {
      if (err) {
        throw new Error(err);
      }
      cb();
      return;
    })
  });
}

function checkDictionary(username, word, cb) {
  db.dictionary.findOne({username: username}, function (err, doc) {
    if (err) {
      throw new Error(err);
    }
    if (!doc) {
      cb(null);
      return;
    }
    for (let i=0; i < doc.data.length; ++i) {
      if (word == doc.data[i].query) {
        console.log("EXIST IN DICTIONARY!");
        cb(doc.data[i].result);
        return;
      }
    }
    cb(null);
    return;
  });
}

app.get("/word", function (req, res) {
  let username = req.signedCookies["word-session"].user;
  if (req.query.q) {
    checkDictionary(username, req.query.q, function (results) {
      if (results) {
        res.render("word", {results: results, q: req.query.q})
        return;
      }
      findTieredSynonyms(req.query.q, 3, function (results) {
        let data = {q: req.query.q};
        if (results.length > 0) {
          data.results = results;
        } else {
          data.noResults = true;
        }
        storeInDictionary(username, req.query.q, results, function () {
          res.render("word", data);
        });
      });
    })
    return;
  }
  res.render("word", {q:""});
});

app.get("/dictionary", function (req, res) {
  let username = req.signedCookies["word-session"].user;
  db.dictionary.findOne({username: username}, function (err, doc) {
    if (err) {
      throw new Error(err);
    }
    if (!doc) {
      res.render("dictionary");
      return;
    }
    let results = [];
    for (let i = 0; i < doc.data.length; ++i) {
      for (let j = 0; j < doc.data[i].result.length; ++j) {
        if (results.indexOf(doc.data[i].result[j]) == -1) {
          results.push(doc.data[i].result[j]);
        }
      }
    }
    res.render("dictionary", { dictionary: results })
  });
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
