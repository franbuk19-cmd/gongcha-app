var https = require("https");
var url = require("url");

var GAS = "https://script.google.com/macros/s/AKfycbzYUmZQsyBi47tjfDeckYRbmOeT3Rp0ZKOZGURpTdqS9ixNpwYt7sn0a0SQ9ivAoxU_/exec";

exports.handler = function(event, context, callback) {
  var cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  if (event.httpMethod === "OPTIONS") {
    callback(null, { statusCode: 200, headers: cors, body: "" });
    return;
  }

  var payload = null;
  var raw = null;

  try {
    if (event.queryStringParameters && event.queryStringParameters.payload) {
      raw = event.queryStringParameters.payload;
      payload = JSON.parse(decodeURIComponent(raw));
    } else if (event.body) {
      payload = JSON.parse(event.body);
    }
  } catch(e) {
    callback(null, { statusCode: 200, headers: cors, body: JSON.stringify({ ok: false, msg: "Parse error: " + e.message + " raw: " + raw }) });
    return;
  }

  if (!payload) {
    callback(null, { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, msg: "OK proxy no-payload " + new Date().toISOString() }) });
    return;
  }

  if (payload.action === "ping") {
    callback(null, { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, msg: "OK proxy ping " + new Date().toISOString() }) });
    return;
  }

  var body = JSON.stringify(payload);
  var parsed = url.parse(GAS);
  var redirects = 0;

  function doReq(hostname, path, method, postBody) {
    var opts = {
      hostname: hostname,
      path: path,
      method: method,
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" }
    };
    if (postBody && method === "POST") {
      opts.headers["Content-Length"] = Buffer.byteLength(postBody);
    }
    var req = https.request(opts, function(res) {
      var loc = res.headers.location;
      if (loc && redirects < 8) {
        redirects++;
        var next = url.parse(loc.startsWith("http") ? loc : "https://script.google.com" + loc);
        doReq(next.hostname, next.path, "GET", null);
        return;
      }
      var data = "";
      res.on("data", function(c) { data += c; });
      res.on("end", function() {
        var result;
        try { result = JSON.parse(data); }
        catch(e) { result = { ok: false, msg: "Bad JSON: " + data.substring(0, 300) }; }
        callback(null, { statusCode: 200, headers: cors, body: JSON.stringify(result) });
      });
    });
    req.on("error", function(e) {
      callback(null, { statusCode: 200, headers: cors, body: JSON.stringify({ ok: false, msg: e.message }) });
    });
    if (postBody && method === "POST") req.write(postBody);
    req.end();
  }

  doReq(parsed.hostname, parsed.path, "POST", body);
};
