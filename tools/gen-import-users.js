#!/usr/bin/nodejs

var fs = require('fs')
var crypto = require ('crypto');
var uuid = require ('node-uuid');

var cmdopt = require('cmdopt');
var parser = new cmdopt.Parser();

parser.option("-h, --help",            "show help");
parser.option("-f, --file=FILE",       "CSV file");
parser.option("-p, --package=PACKAGE", "package name");

/// parse args
var args = process.argv.slice(2);
var defaults = {package: "default"};

try {
  var opts = parser.parse(args, defaults);

  if (opts.help) {
    var command = require('path').basename(__filename);
    process.stdout.write("Usage: " + command + " [options] [args...]\n"
                           + parser.help());
    return 0;
  }
} catch (ex) {
  if (ex instanceof cmdopt.ParseError) {
    process.stderr.write(ex.message + "\n");
    process.exit(1);
  }
  throw ex;
}

function parseCsvFile(fileName, callback){
  var stream = fs.createReadStream(fileName)
  var iteration = 0, header = [], buffer = ""
  var pattern = /(?:^|,)("(?:[^"]+)*"|[^,]*)/g
  stream.addListener('data', function(data){
    buffer+=data.toString()
    var parts = buffer.split('\n')
    parts.forEach(function(d, i){
      if(i == parts.length-1) return
      if(iteration++ == 0 && i == 0){
        d = d.replace (/"/g, '');
        header = d.split(pattern)
      }else{
        callback(buildRecord(d))
      }
    })
    buffer = parts[parts.length-1]
  })

  function buildRecord(str){
    var record = {}
    str.split(pattern).forEach(function(value, index){
      if(header[index] != '')
        record[header[index].toLowerCase()] = value.replace(/"/g, '')
    })
    return record
  }
}

// Main

if (opts.file) {
  parseCsvFile(opts.file, function(rec){
    var data = {};
    data.username   = rec.username;
    data.firstname  = rec.firstname;
    data.surname    = rec.surname;
    data.personid   = "Thai Personal ID:" + rec.id;
    data.package    = opts.package;
    data.userstatus = true;
    data.management = false;
    data.usertype   = "manual";
    data.email      = "import@rahunas.intranet";
    data.timestamp  = { create: new Date (),
                        roles: [] };
    data.salt       = uuid.v4 ();

    var hash = crypto.createHash ('sha1');
    var saltHex = new Buffer (data.salt, 'binary').toString ('hex');

    hash.update (rec.password);
    hash.update (data.salt);

    var ssha = new Buffer (hash.digest ('hex') + saltHex, 'hex').toString ('base64');

    data.password = ssha;

    var criteria = {};
    criteria.username = rec.username;

    save = "db.users.update(" + JSON.stringify (criteria) + "," + JSON.stringify (data) + ", true, false);";
    process.stdout.write (save + "\n");
  });
}
