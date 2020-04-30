var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');


var indexRouter = require('./routes/index');
var admin = require('./routes/admin');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
var app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
mongoose.connect(process.env.MONGODB_URI, {useFindAndModify: false, useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true}, ()=>{
    console.log("Database Connected");
});

mongoose.connection.on('error', ()=>{
console.log("MongoDB connection error. Please make sure that MongoDB is running.");
process.exit(1);
});

app.use('/', indexRouter);
app.use('/admin', admin);

module.exports = app;
