bash

cat > /tmp/proxy_clean.js << 'EOF'
const https = require("https");
const http = require("http");

const GAS_URL = "https://script.google.com/macros/s/AKfycbzYUmZQsyBi47tjfDeckYRbmOeT3Rp0ZKOZGURpTdqS9ixNpwYt7sn0a0SQ9ivAoxU_/exec";

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
    var raw = event.queryStringParameters && event.queryStringParameters.payload;
    if (raw) {
      payload = JSON.parse(decodeURIComponent(raw));
    } else if (event.body) {
      payload = JSON.parse(event.body);
    }
  } catch(e) {}

  if (!payload.action || payload.action === "ping") {
    callback(null, {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true, msg: "OK Gong Cha proxy " + new Date().toISOString() })
    });
    return;
  }

  var gasBody = JSON.stringify(payload);
  var urlObj = require("url").parse(GAS_URL);

  var options = {
    hostname: urlObj.hostname,
    path: urlObj.path,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(gasBody),
      "User-Agent": "Mozilla/5.0"
    }
  };

  var redirectCount = 0;

  function doRequest(opts, body) {
    var lib = opts.protocol === "http:" ? http : https;
    var req = lib.request(opts, function(res) {
      if ([301,302,303,307,308].indexOf(res.statusCode) >= 0 && res.headers.location) {
        if (++redirectCount > 8) {
          callback(null, { statusCode: 200, headers: cors, body: JSON.stringify({ ok: false, msg: "Too many redirects" }) });
          return;
        }
        var loc = res.headers.location;
        var newUrl = require("url").parse(loc.startsWith("http") ? loc : "https://script.google.com" + loc);
        doRequest({ hostname: newUrl.hostname, path: newUrl.path, method: "GET", headers: { "User-Agent": "Mozilla/5.0" }, protocol: newUrl.protocol }, null);
        return;
      }
      var data = "";
      res.on("data", function(c) { data += c; });
      res.on("end", function() {
        var result;
        try { result = JSON.parse(data); } catch(e) { result = { ok: false, msg: "Bad JSON: " + data.substring(0, 200) }; }
        callback(null, { statusCode: 200, headers: cors, body: JSON.stringify(result) });
      });
    });
    req.on("error", function(e) {
      callback(null, { statusCode: 200, headers: cors, body: JSON.stringify({ ok: false, msg: e.message }) });
    });
    if (body) req.write(body);
    req.end();
  }

  options.protocol = "https:";
  doRequest(options, gasBody);
};
EOF
cat /tmp/proxy_clean.js
Salida

const https = require("https");
const http = require("http");

const GAS_URL = "https://script.google.com/macros/s/AKfycbzYUmZQsyBi47tjfDeckYRbmOeT3Rp0ZKOZGURpTdqS9ixNpwYt7sn0a0SQ9ivAoxU_/exec";

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
    var raw = event.queryStringParameters && event.queryStringParameters.payload;
    if (raw) {
      payload = JSON.parse(decodeURIComponent(raw));
    } else if (event.body) {
      payload = JSON.parse(event.body);
    }
  } catch(e) {}

  if (!payload.action || payload.action === "ping") {
    callback(null, {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true, msg: "OK Gong Cha proxy " + new Date().toISOString() })
    });
    return;
  }

  var gasBody = JSON.stringify(payload);
  var urlObj = require("url").parse(GAS_URL);

  var options = {
    hostname: urlObj.hostname,
    path: urlObj.path,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(gasBody),
      "User-Agent": "Mozilla/5.0"
    }
  };

  var redirectCount = 0;

  function doRequest(opts, body) {
    var lib = opts.protocol === "http:" ? http : https;
    var req = lib.request(opts, function(res) {
      if ([301,302,303,307,308].indexOf(res.statusCode) >= 0 && res.headers.location) {
        if (++redirectCount > 8) {
          callback(null, { statusCode: 200, headers: cors, body: JSON.stringify({ ok: false, msg: "Too many redirects" }) });
          return;
        }
        var loc = res.headers.location;
        var newUrl = require("url").parse(loc.startsWith("http") ? loc : "https://script.google.com" + loc);
        doRequest({ hostname: newUrl.hostname, path: newUrl.path, method: "GET", headers: { "User-Agent": "Mozilla/5.0" }, protocol: newUrl.protocol }, null);
        return;
      }
      var data = "";
      res.on("data", function(c) { data += c; });
      res.on("end", function() {
        var result;
        try { result = JSON.parse(data); } catch(e) { result = { ok: false, msg: "Bad JSON: " + data.substring(0, 200) }; }
        callback(null, { statusCode: 200, headers: cors, body: JSON.stringify(result) });
      });
    });
    req.on("error", function(e) {
      callback(null, { statusCode: 200, headers: cors, body: JSON.stringify({ ok: false, msg: e.message }) });
    });
    if (body) req.write(body);
    req.end();
  }

  options.protocol = "https:";
  doRequest(options, gasBody);
};
Listo
Copia ese código completo, ve a GitHub → netlify/functions/proxy.js → edita → borra todo → pega el nuevo → Commit changes.

Netlify redesplegará automáticamente. ¿Lo hiciste?



