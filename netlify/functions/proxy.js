var https = require("https");
var http = require("http");
var url = require("url");

var GAS_URL = "https://script.google.com/macros/s/AKfycbzYUmZQsyBi47tjfDeckYRbmOeT3Rp0ZKOZGURpTdqS9ixNpwYt7sn0a0SQ9ivAoxU_/exec";

exports.handler = function(event, context, callback) {
  var cors = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (event.httpMethod === "OPTIONS") {
    callback(null, { statusCode: 200, headers: cors, body: "" });
    return;
  }

  var payload = {};
  try {
    var qs = event.queryStringParameters;
    if (qs && qs.payload) {
      payload = JSON.parse(decodeURIComponent(qs.payload));
    } else if (event.body) {
      payload = JSON.parse(event.body);
    }
  } catch(e) {}

  if (!payload.action || payload.action === "ping") {
    callback(null, {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true, msg: "OK proxy " + new Date().toISOString() })
    });
    return;
  }

  var body = JSON.stringify(payload);
  var parsed = url.parse(GAS_URL);
  var redirects = 0;

  function req(hostname, path, method, postBody) {
    var opts = {
      hostname: hostname,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    };
    if (postBody && method === "POST") {
      opts.headers["Content-Length"] = Buffer.byteLength(postBody);
    }

    var r = https.request(opts, function(res) {
      var loc = res.headers.location;
      if (loc && redirects < 8) {
        redirects++;
        var next = url.parse(loc.startsWith("http") ? loc : "https://script.google.com" + loc);
        req(next.hostname, next.path, "GET", null);
        return;
      }
      var data = "";
      res.on("data", function(c) { data += c; });
      res.on("end", function() {
        var result;
        try {
          result = JSON.parse(data);
        } catch(e) {
          result = { ok: false, msg: "Bad JSON from Google: " + data.substring(0, 200) };
        }
        callback(null, { statusCode: 200, headers: cors, body: JSON.stringify(result) });
      });
    });

    r.on("error", function(e) {
      callback(null, { statusCode: 200, headers: cors, body: JSON.stringify({ ok: false, msg: e.message }) });
    });

    if (postBody && method === "POST") r.write(postBody);
    r.end();
  }

  req(parsed.hostname, parsed.path, "POST", body);
};
