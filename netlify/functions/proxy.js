
Show proxy.js content

Show proxy.js content
bash

cat /mnt/user-data/outputs/gongcha-deploy/netlify/functions/proxy.js
Salida

const https = require('https');
const http  = require('http');

const GAS_BASE = 'https://script.google.com/macros/s/AKfycbzYUmZQsyBi47tjfDeckYRbmOeT3Rp0ZKOZGURpTdqS9ixNpwYt7sn0a0SQ9ivAoxU_/exec';

exports.handler = async (event) => {
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  try {
    let payload = {};
    const raw = event.queryStringParameters && event.queryStringParameters.payload;
    if (raw) {
      try { payload = JSON.parse(decodeURIComponent(raw)); } catch(_) {}
    } else if (event.body) {
      try { payload = JSON.parse(event.body); } catch(_) {}
    }

    // Ping responde directo sin llamar a Google
    if (!payload.action || payload.action === 'ping') {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ ok: true, msg: 'OK — Gong Cha proxy v2 — ' + new Date().toISOString() })
      };
    }

    // Llamar a Google con POST esta vez
    const gasBody = JSON.stringify(payload);
    const gasResponse = await postToGAS(GAS_BASE, gasBody);

    let result;
    try {
      result = JSON.parse(gasResponse);
    } catch(_) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ 
          ok: false, 
          msg: 'Google respondio texto plano',
          raw: gasResponse.substring(0, 500)
        })
      };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify(result) };

  } catch (err) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: false, msg: 'Proxy error: ' + err.message })
    };
  }
};

function postToGAS(url, body) {
  return new Promise(function(resolve, reject) {
    var redirects = 0;

    function req(u, method, postBody) {
      var urlObj = new URL(u);
      var options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postBody ? Buffer.byteLength(postBody) : 0,
          'User-Agent': 'Mozilla/5.0'
        }
      };

      var lib = u.startsWith('https') ? https : http;
      var request = lib.request(options, function(res) {
        // Seguir redirects con GET (comportamiento estándar de browser)
        if ([301,302,303,307,308].indexOf(res.statusCode) >= 0 && res.headers.location) {
          if (++redirects > 8) { reject(new Error('Too many redirects')); return; }
          var next = res.headers.location.startsWith('http')
            ? res.headers.location
            : 'https://script.google.com' + res.headers.location;
          // Despues de redirect usar GET
          req(next, 'GET', null);
          return;
        }

        var data = '';
        res.on('data', function(c) { data += c; });
        res.on('end', function() { resolve(data); });
        res.on('error', reject);
      });

      request.on('error', reject);
      if (postBody && method === 'POST') request.write(postBody);
      request.end();
    }

    req(url, 'POST', body);
  });
}
