var express = require('express');
var pg = require('pg');
var bodyParser = require('body-parser');

var app = express();
app.set('port', (process.env.PORT || 5000));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser());

//connection string for connecting to postgres database
var connectionString = process.env.DATABASE_URL;

app.listen(app.get('port'), function(){
  console.log('Node app is running on port', app.get('port'));
});

app.get('*', function(req,res){
  res.render('page404', {req});
});
