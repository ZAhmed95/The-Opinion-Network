var express = require('express');
var pg = require('pg');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt');
var saltRounds = 10;
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
      var encrypted;
      bcrypt.hash(password, saltRounds, function(err,hash){
        encrypted = hash;
      });
      console.log("HASH: " + encrypted);
      //find matching user and password
      client.query("select * from users where username = '" + username + "' and password = '" + encrypted + "';", function(err,result){
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
    });
  });
  if(req.user){
    res.redirect('/users/' + req.user.username);
  }
  else{
    res.render('login');
  }
});

app.get('/users/:username', function(req,res){
  res.render('user', {user: req.user});
});

app.get('/login', function(req,res){
  res.redirect('/');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'}));

app.get('/logout', function(req,res){
  req.logout();
  res.redirect('/');
});

app.get('/signup', function(req,res){
  res.render('signup');
});

app.post('/signup', function(req,res){
  pg.connect(connectionString, function(err,client,done){
    if(err){
      return console.log("error connecting to database");
    }
    var fname = req.body.fname;
    var lname = req.body.lname;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;
    client.query(`insert into users (fname,lname,email,username,password) values ('${fname}','${lname}','${email}','${username}','${password}');`, function(err,result){
      if(err){
        return console.log("error inserting into database");
      }
      res.redirect('/');
    }); //end client.query
    done();
    pg.end();
  }); //end pg.connect
}); //end app.post

app.get('/polls', function(req,res){
  pg.connect(connectionString, function(err,client,done){
    if(err){
      return console.log("error connecting to database");
    }
    client.query("select * from polls;", function(err,result){
      if(err){
        return console.log("error querying database");
      }
      res.render('polls', result);
      done();
      pg.end();
    })
  }); //end pg.connect
}); //end app.get

app.get('*', function(req,res){
  res.render('page404', {req});
});
