const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./assets/Sikh_Granths.sqlite');

router.get('/linesWithInitials/:initials', (req, res) => {
    var allLines = [];
    db.serialize(function(){
        db.each("SELECT * FROM 'SGGS' WHERE English_Initials LIKE '%" + req.params.initials + "%'", function(err, row){
            allLines.push(row);
        }, function(){
            res.json(allLines);
        });

    });

});

router.get('/shabadLines/:kirtanId', (req, res) => {
   var lines = [];
   db.serialize(function(){
       db.each("SELECT * FROM 'SGGS' WHERE Kirtan_ID = " + req.params.kirtanId, function(err, row){
           lines.push(row);
       }, function(){
           res.json(lines);
       });
   });
});

router.get('/linesFrom/:from/linesTo/:to', (req, res) => {
   var lines = [];
    db.serialize(function(){

        db.each("SELECT * FROM 'SGGS' WHERE ID BETWEEN " + req.params.from + " AND " + req.params.to, function(err, row){
            lines.push(row);
        }, function(){
            res.json(lines);
        });

    });
});


module.exports = router;