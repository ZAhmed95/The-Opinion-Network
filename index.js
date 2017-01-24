var express = require('express');
var pg = require('pg');
var bodyParser = require('body-parser');
var session = require('express-session')
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = {
  findOne: function(user, verify){

  }
};

var app = express();
app.set('port', (process.env.PORT || 5000));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser());
app.use(session({
  secret: 'no clue',
  resave: false,
  saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());

//connection string for connecting to postgres database
var connectionString = process.env.DATABASE_URL;

//authentication strategy
passport.use(new LocalStrategy(
  function(username, password, done) {
    //connect to database
    pg.connect(connectionString, function(err,client,pgdone){
      if(err){
        console.log("error connecting to database");
        return done(err);
      }
      //find matching user and password
      client.query("select * from users where username = '" + username + "' and password = '" + password + "';", function(err,result){
        if(err){
          console.log("error querying database");
          console.log(err);
          return done(err);
        }
        if (result.rows){ //user found
          return done(null, result.rows[0]);
        }
        return done(null, false); //user not found
      }); //end client.query
      pgdone();
      pg.end();
    }); //end pg.connect
  } //end strategy function
)); //end passport.use(new LocalStrategy())

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.listen(app.get('port'), function(){
  console.log('Node app is running on port', app.get('port'));
});

app.get('/', function(req,res){
  pg.connect(connectionString, function(err,client,done){
    client.query("select * from users;", function(err,result){
      if (err){
        return console.log("error querying database");
      }
      console.log(result);
    });
  });
  if(req.user){
    res.render('user', {user: req.user});
  }
  else{
    res.render('login');
  }
});

app.get('/login', function(req,res){
  res.redirect('/');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'}));

app.get('*', function(req,res){
  res.render('page404', {req});
});
