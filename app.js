const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const raagi_route = require('./routes/raagi-routes');
const sggs_route = require('./routes/sggs-routes');
const user_route = require('./routes/user-routes');
const config = require('./config/database');
const passport = require('passport');
const app = express();

mongoose.connect(config.database);

mongoose.connection.on('connected', () => {
    console.log('Connected to database ' + config.database);
});

mongoose.connection.on('error', (err) => {
    console.log('Database error ' + err);
});

app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

app.use('/api/raagiRoutes', raagi_route);
app.use('/api/sggsRoutes', sggs_route);
app.use('/api/userRoutes', user_route);

app.get('/', (req, res) => {
    res.send('Invalid Endpoint');
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

const port = process.env.PORT || '3200';

app.listen(port, () => {
    console.log(`API running on localhost:${port}`);
});