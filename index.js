var express = require('express');
var pg = require('pg');
var bodyParser = require('body-parser');
//require modules for using passport with auth0
var passport = require('passport');
var Auth0Strategy = require('passport-auth0');

var routes = require('./routes/index');
var user = require('./routes/user');

var app = express();
app.set('port', (process.env.PORT || 5000));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser());
app.use('/', routes);
app.use('/user', user);

//set up auth0 strategy for passport
var strategy = new Auth0Strategy({
    domain:       process.env.AUTH0_DOMAIN,
    clientID:     process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL:  process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
  }, function(accessToken, refreshToken, extraParams, profile, done) {
    return done(null, profile);
  });

passport.use(strategy);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

//connection string for connecting to postgres database
var connectionString = process.env.DATABASE_URL;

app.listen(app.get('port'), function(){
  console.log('Node app is running on port', app.get('port'));
});

app.get('*', function(req,res){
  res.render('page404', {req});
});
