var express = require('express');
var pg = require('pg');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt');
var saltRounds = 10;
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

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
        pgdone();
        pg.end();
        if(err){
          console.log("error querying database");
          return done(err);
        }
        if (result.rows.length){ //user found
          return done(null, result.rows[0]);
        }
        return done(null, false); //user not found
      }); //end client.query
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
  // pg.connect(connectionString, function(err,client,done){
  //   client.query("select * from users;", function(err,result){
  //     if (err){
  //       return console.log("error querying database");
  //     }
  //   });
  // });
  if(req.user){
    res.redirect('/users/' + req.user.username);
  }
  else{
    res.redirect('/login');
  }
});

app.get('/users/:username', function(req,res){
  if(req.user){
    if(req.user.username === req.params.username){
      pg.connect(connectionString, function(err,client,done){
        client.query(`select * from polls where fk_user_id = ${req.user.id};`, function(err,polls_created){
          client.query(`select * from users_polls_voted where user_id = ${req.user.id};`, function(err,polls_voted){
            res.render('user', {own_page: true, user: req.user, polls_created: polls_created, polls_voted: polls_voted});
            done();
            pg.end();
          }); //end client.query users_polls_voted
        }); //end client.query polls
      }); //end pg.connect
    } //end if(req.user.username === req.params.username)
    else{
      res.render('user', {own_page: false, user: req.params.username});
    }
  } //end if(req.user)
  else{
    res.render('user', {own_page: false, user: req.params.username});
  }
}); //end app.get

app.get('/users', function(req,res){
  pg.connect(connectionString, function(err,client,done){
    client.query("select * from users order by id;", function(err,result){
      res.render('users', result);
    }); //end client.query
  }); //end pg.connect
}); //end app.get

app.get('/login', function(req,res){
  res.render('login');
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
      done();
      pg.end();
    }); //end client.query
  }); //end pg.connect
}); //end app.post

//go to page for creating new poll
app.get('/polls/create', function(req,res){
  if(req.user){ //if a user is signed in, take them to the poll creation page
    res.render('createPoll', {user: req.user});
  }
  else{ //otherwise, tell them to sign in
    res.redirect('/login');
  }
}); //end app.get

//create new poll
app.post('/polls/create', function(req,res){
  pg.connect(connectionString, function(err,client,done){
    if(err){
      return console.log("error connecting to database");
    }
    //get new poll's variables
    var title = req.body.title;
    var description = req.body.description;
    var fk_user_id = req.user.id;
    //insert new poll into database
    client.query(`insert into polls (title,description,avg_opinion,votes,fk_user_id) values ('${title}','${description}', 0, 0, ${fk_user_id});`, function(err,result){
      if(err){
        return console.log("error querying database");
      }
      done();
      pg.end();
    }); //end client.query
  }); //end pg.connect
  res.redirect('/polls/');
}); //end app.post

app.get('/polls/:id', function(req,res){
  pg.connect(connectionString, function(err,client,done){
    if(err){
      return console.log("error connecting to database");
    }
    client.query(`select * from polls where id = ${req.params.id};`, function(err,result){
      if(err){
        return console.log("error querying database");
      }
      if(result.rows.length){
        var post = result.rows[0];
        client.query(`select * from users where id = ${post.fk_user_id};`, function(err,pollMaker){
          console.log("USER: " + req.user);
          if (req.user){ //if a user is currently signed in, check if they have already voted on this poll
            client.query(`select * from users_polls_voted where user_id = ${req.user.id} and poll_id = ${post.id};`, function(err,user_voted){
              console.log("USER VOTED: " + user_voted);
              res.render('post', {post: post, pm: pollMaker.rows[0], uv: user_voted});
              done();
              pg.end();
            }); //end client.query users_polls_voted
          }
          else{
            res.render('post', {post: post, pm: pollMaker.rows[0], uv: undefined});
            done();
            pg.end();
          }
        }); //end client.query users
      }
      else{
        res.render('page404', {req});
      }

    }); //end client.query polls
  }); //end pg.connect
}); //end app.get

app.post('/polls/:id', function(req,res){
  if (req.user){
    pg.connect(connectionString, function(err,client,done){
      if(err){
        return console.log("error connecting to database");
      }
      client.query(`select * from polls where id = ${req.params.id}`, function(err,result){
        if(result.rows.length){
          var post = result.rows[0];
          var avg_opinion = post.avg_opinion;
          var votes = post.votes;
          //get posted opinion
          var opinion = parseFloat(req.body.opinion);
          //clamp opinion to be between 0 and 10
          if (opinion < 0) opinion = 0;
          else if (opinion > 10) opinion = 10;
          //update avg_opinion with new opinion (and increment votes by 1)
          avg_opinion = (avg_opinion * votes + opinion) / (++votes);
          //update polls table with new avg_opinion and votes
          client.query(`update polls set avg_opinion = ${avg_opinion}, votes = ${votes} where id = ${post.id};`, function(){
            //update users_polls_voted table to show that this user has voted on this poll
            client.query(`insert into users_polls_voted (user_id,poll_id,opinion) values (${req.user.id},${post.id},${opinion});`, function(){
              //end database connection
              done();
              pg.end();
            }); //end client.query users_polls_voted
          }); //end client.query polls
          //refresh page
          res.redirect('/polls/' + post.id);
        }
        else{ //if no poll found with requested id
          res.render('page404',{req});
        }
      }); //end client.query
    }); //end pg.connect
  }
  else{
    res.redirect('/');
  }
}); //end app.post

//go to page listing all polls
app.get('/polls', function(req,res){
  pg.connect(connectionString, function(err,client,done){
    if(err){
      return console.log("error connecting to database");
    }
    client.query("select * from polls order by id desc;", function(err,result){
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
