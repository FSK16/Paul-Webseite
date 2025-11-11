const https = require('https'); 
const http = require('http'); 
const { URL } = require('url'); 
const convert = require('xml-js');


function xmlRequest(targetUrl, xml) {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(xml),
        'IncludeRealtimeData': 'true'
      }
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // versuche, das XML in ein JS-Objekt zu konvertieren
        let parsed = null;
        try {
          // compact: true liefert ein kompakteres Objekt; anpassen wenn nötig
          parsed = stripNamespaces(convert.xml2js(data, { compact: true, trim: true, ignoreDeclaration: true }));

        } catch (parseErr) {
          // bei Parse-Fehlern trotzdem die Roh-Antwort zurückgeben und den Fehler mitliefern
          return resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            json: null,
            parseError: parseErr.message
          });
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json: parsed
        });
      });
    });

    req.on('error', reject);
    req.write(xml);
    req.end();
  });
}

function stripNamespaces(obj) {
  if (Array.isArray(obj)) return obj.map(stripNamespaces);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const key of Object.keys(obj)) {
      const cleanKey = key.includes(':') ? key.split(':').pop() : key;
      out[cleanKey] = stripNamespaces(obj[key]);
    }
    return out;
  }
  return obj;
}

module.exports = xmlRequest;