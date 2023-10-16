//jshint esversion:6
require('dotenv').config();
const express = require ("express");
const bodyParser = require ("body-parser");
const ejs = require ("ejs");
const findOrCreate = require('mongoose-findorcreate')
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const app = express();
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

//const LocalStrategy = require('passport-local').Strategy;
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
//const bcrypt = require('bcrypt');
//const saltRounds = 10;
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
  extended:true
}));
app.use(session({
  secret: 'kos',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://puriyaj:13491377Pp@cluster0.rb7aj1k.mongodb.net/userDB");
//mongoose.set("useCreateIndex", true);
const userSchema = new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields: ["password"] });
const User = new mongoose.model("user", userSchema);
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id).then(function (user, err) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
  clientID:     process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  passReqToCallback   : true
},
function(request, accessToken, refreshToken, profile, done) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return done(err, user);
  });
}
));
app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ "profile" ] }
));
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
app.get("/",function (req, res){
  res.render("home");
});
app.get("/submit",function (req, res){
  if(req.isAuthenticated()){
    res.render("submit");    
    } else {
      res.redirect("/login");
    }
});

app.get("/login",function (req, res){
  res.render("login");
});

app.get("/register",function (req, res){
  res.render("register");
});
app.get("/secrets",function (req, res){
  if(req.isAuthenticated()){
    User.find({"secret":{$ne:null}}).then(function(resul,err){
    res.render("secrets",{sec:resul});  
    })
    
  } else {
    res.redirect("/login");
  }

});
app.post("/submit",function(req,res){
  const  submittedsec = req.body.secret;
  User.findById(req.user.id).then(function(result,err){
    if(err){
      console.log(err);
    
    } else {
      if(result){
        result.secret = submittedsec;
        result.save();
        res.redirect("secrets");
      }
    }
  })

})
app.post("/register",function (req, res){
 User.register({username:req.body.username},req.body.password,function(err, user){
  if(err){
    console.log(err);
    res.redirect("/register");
  } else{
    passport.authenticate("local")(req, res , function(){
      res.redirect("/secrets");
    });
  }
 });
});






app.post("/login", function(req, res){
   const user = new User ({
    username:req.body.username,
    password:req.body.password
   });
   req.login(user, function(err){
    if (err){
      console.log(err);
    } else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      })
    }
   })

          
      });
app.get("/logout", function(req,res){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
});
});
  
app.listen(3000,function (){
  console.log("server is running on port:3000");
});
