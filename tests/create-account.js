
"use strict";

let request = require("request");
let ACTIVE_NUMBER = 50;

function takeOne(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomEmail () {
  var name = ["john", "sara", "leland", "keith", "james", "yong", "random", "pikachu", "something", "sora", "miki", "zoe"];
  var domain = ["gmail.com", "yahoo.com", "hotmail.com", "goraydar.com", "yahoo.sg", "fastmail.com", "aol.com"];
  return takeOne(name) + "@" + takeOne(domain);
}

function randomPassword() {
  var pass = ["mywife", "myhusbandsname", "mybirthdate", "mycrush"];
  return takeOne(pass);
}


let active = 0;
let always = true;
while (active < ACTIVE_NUMBER) {
  if (active < ACTIVE_NUMBER) {
    let form = {
      email:randomEmail(),
      password: randomPassword()
    }
    form["confirm-password"] = form.password;
    active++;
    request.post({ url:"http://localhost:3000/signup", form: form},
      function (err, response, body) {
        active--;
        if (response.statusCode == 302) {
          console.log(JSON.stringify(form) + ",");
        }
      });
  }
}
