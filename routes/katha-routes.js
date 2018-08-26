const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const request = require('request');
const fs = require('fs');
const child_process = require('child_process');
const { Pool, Client } = require('pg');
const config = require('../config/database');


function initialize_client(){
    return new Client(config.vismaadnaad);
}

function initialize_pool(){
    return new Pool(config.vismaadnaad);
}

module.exports = router;