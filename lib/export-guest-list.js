'use strict';

var json2csv = require('json2csv');
var async = require('async');

function exportGuestList (args, callback) {
  var seneca = this;
  var eventId = args.eventId;
  var csvFields = ['Session', 'Name', 'Phone', 'Email', 'Ticket Name', 'Ticket Type'];
  var plugin = args.role;

  async.waterfall([
    retrieveUserData,
    convertToCSV
  ], function (err, csv) {
    if (err) return callback(null, {error: err});
    return callback(null, {
      data: csv
    });
  });

  function retrieveUserData (done) {
    seneca.act({role: plugin, cmd: 'searchApplications', query: {eventId: eventId, status: 'approved', deleted: false}}, function (err, applications) {
      if (err) return callback(err);
      async.map(applications, function (application, cb) {
        seneca.act({role: 'cd-profiles', cmd: 'list', query: {userId: application.userId}}, function (err, profiles) {
          if (err) return cb(err);
          var userProfile = profiles[0];
          seneca.act({role: plugin, cmd: 'loadSession', id: application.sessionId}, function (err, session) {
            if (err) return cb(err);
            var user = {};
            user['Session'] = session.name;
            user['Name'] = userProfile.name;
            user['Phone'] = userProfile.phone || '';
            user['Email'] = userProfile.email || '';
            user['Ticket Name'] = application.ticketName;
            user['Ticket Type'] = application.ticketType;
            return cb(null, user);
          });
        });
      }, function (err, csvData) {
        if (err) return callback(null, {error: err});
        return done(null, csvData);
      });
    });
  }

  function convertToCSV (csvData, done) {
    json2csv({data: csvData, fields: csvFields}, done);
  }
}

module.exports = exportGuestList;
