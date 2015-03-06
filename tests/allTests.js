"use strict";

let request = require("request");
let async = require("async");

let rawAccounts = [
{"email":"yong@fastmail.com","password":"mybirthdate","confirm-password":"mybirthdate"},
{"email":"random@fastmail.com","password":"mycrush","confirm-password":"mycrush"},
{"email":"sora@yahoo.com","password":"mywife","confirm-password":"mywife"},
{"email":"leland@yahoo.sg","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"sora@hotmail.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"pikachu@fastmail.com","password":"mybirthdate","confirm-password":"mybirthdate"},
{"email":"keith@aol.com","password":"mybirthdate","confirm-password":"mybirthdate"},
{"email":"pikachu@yahoo.sg","password":"mywife","confirm-password":"mywife"},
{"email":"zoe@goraydar.com","password":"mybirthdate","confirm-password":"mybirthdate"},
{"email":"yong@goraydar.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"james@goraydar.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"john@goraydar.com","password":"mycrush","confirm-password":"mycrush"},
{"email":"keith@hotmail.com","password":"mywife","confirm-password":"mywife"},
{"email":"sora@gmail.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"john@aol.com","password":"mywife","confirm-password":"mywife"},
{"email":"sara@gmail.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"miki@aol.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"leland@yahoo.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"something@gmail.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"james@hotmail.com","password":"mybirthdate","confirm-password":"mybirthdate"},
{"email":"miki@fastmail.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"zoe@hotmail.com","password":"mycrush","confirm-password":"mycrush"},
{"email":"yong@aol.com","password":"mybirthdate","confirm-password":"mybirthdate"},
{"email":"yong@yahoo.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"leland@aol.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"yong@gmail.com","password":"mywife","confirm-password":"mywife"},
{"email":"random@goraydar.com","password":"mycrush","confirm-password":"mycrush"},
{"email":"something@goraydar.com","password":"mybirthdate","confirm-password":"mybirthdate"},
{"email":"sara@aol.com","password":"mybirthdate","confirm-password":"mybirthdate"},
{"email":"leland@gmail.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"pikachu@gmail.com","password":"mycrush","confirm-password":"mycrush"},
{"email":"something@hotmail.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"james@yahoo.com","password":"mycrush","confirm-password":"mycrush"},
{"email":"john@gmail.com","password":"mywife","confirm-password":"mywife"},
{"email":"miki@goraydar.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},
{"email":"miki@yahoo.com","password":"mywife","confirm-password":"mywife"},
{"email":"keith@yahoo.com","password":"mywife","confirm-password":"mywife"},
{"email":"pikachu@yahoo.com","password":"myhusbandsname","confirm-password":"myhusbandsname"},

]

let ACTIVE_NUMBER = 2;
let accounts = {};


let possibleQueries = ["monkey", "dog", "eat", "fly", "urinate", "poop", "drink", "god"];
function takeOne(array) {
  return array[Math.floor(Math.random() * array.length)];
}

for (let i = 0; i < rawAccounts.length; ++i) {
  accounts[rawAccounts[i].email] = rawAccounts[i];
  accounts[rawAccounts[i].email].jar = request.jar();
}

function login (account, cb) {
  request.post(
    {
      url: "http://localhost:3000/login",
      form:{email: account.email, password: account.password},
      jar: account.jar
    },
    function (err, response, body) {
      console.log(body);
      cb();
  })
}

function query(account, cb) {
  let options = {
    url: "http://localhost:3000/word",
    jar: account.jar,
    qs: {q: takeOne(possibleQueries)},
  };
  request(options, function (err, response, body) {
    if (err) {
      process.exit();
    }
    console.log(account.email, "did query on", options.qs.q);
    cb();
  })
}

function dictionary(account, cb) {
  request({
    url: "http://localhost:3000/dictionary",
    jar: account.jar
  }, function (err, response, body) {
    if (err) {
      process.exit();
    }
    console.log(account.email, "get dictionary");
    cb();
  });
}

function changePassword (account, cb) {
  let newPass = account.password; //just fake the password change
  request.post(
    {
      url: "http://localhost:3000/changepassword",
      form:{"old-password": account.password, "new-password": newPass, "confirm-new-password": newPass},
      jar: account.jar
    },
    function (err, response, body) {
      if (err) {
        process.exit();
      }
      console.log("account", account.username, "change password from", account.password, "to", newPass);
      account.password = newPass;
      cb();
  })
}

function pickRandomAccount() {
  let keys = Object.keys(accounts)
  return accounts[keys[ keys.length * Math.random() << 0]];
}

let doneRequest = {
  query:0,
  dictionary:0,
  changePassword:0
};

function getLeastDone () {
  let leastNumber = Infinity;
  let least;
  for (let key in doneRequest) {
    if (doneRequest[key] < leastNumber) {
      leastNumber = doneRequest[key];
      least = key;
    }
  }
  return least;
}

function doRequest() {
  let processing = 0;
  let account = pickRandomAccount();
  setTimeout(function () {
    if (processing < ACTIVE_NUMBER) {
      processing++;
      if (doneRequest.query < doneRequest.dictionary) {
        query(pickRandomAccount(), function () {
          processing--;
          doneRequest.query++;
        });
      } else {
        dictionary(pickRandomAccount(), function () {
          processing--;
          doneRequest.dictionary++;
        });
      }
      // } else if (leastDone == "changePassword"){
      //   changePassword(pickRandomAccount(), function () {
      //     processing--;
      //     doneRequest.changePassword++;
      //   })
      // }
    }
    doRequest();
  }, 50)
}

let notYetLoggedIn = Object.keys(accounts).length;
for (let key in accounts) {
  login(accounts[key], function () {
    notYetLoggedIn--;
    if (notYetLoggedIn == 0) {
      console.log("all accounts logged in.. beginning requests");
      doRequest();
    }
  })
}



