
var nodeStatic = require('node-static').Server;
var request = require("request");
var dns = require("dns");
var fileServer = new nodeStatic("../");
var http = require("http");
var fs = require('fs');

var httpServer = http.createServer(function(req, res) {

      req.addListener('end', function() {

	var url = 'http://' + req.headers.host + req.url;
	var host = req.headers.host;

	console.log('request: ' + url);
	try {
	  var paths = getPaths();
	  var path = paths[url]; 
	  if (path) {
	    var content = loadPath(path);
	    if (content) {
	      console.log('local file:' + path);
	      res.writeHeader(200, 'application/x-javascript');
	      res.write(content);
	      res.end();
	    }
	  }
	} catch(e) {
	  console.log('local file error:' + path);
	  //console.log(e);
	}


        fileServer.serve(req, res, function(err, result) {
            if (err && (err.status === 404)) {
            //本地没有文件访问线上，透明server
	    /*console.log(host)
            dns.resolve(host ,function(err,addresses){
	      try {
                if(err){
                    res.writeHeader(200,'text/html');   
                    res.write(req.url + ' request failure');
                    res.end();
                 }else{
		 */
                    //var ip = addresses[0];
                    var p = 'http://' + host + req.url;
                    req.headers['Host'] = host;

		    if (/longzhu\.com/.exec(host)) {
		      if (/star\./.exec(host) || /u\.longzhu/.exec(host)
			|| (/mb\./).exec(host)) {
			p = 'http://127.0.0.1:1343' + req.url;
			//p = 'http://172.16.9.9' + req.url;
		      } else {
			p = 'http://127.0.0.1:1343' + req.url;
			//p = 'http://' + host + ':81' + req.url;
		      }
		    }
		    console.log(p);

		    try {
                    request({
                        method:req.method,
                        url: p,
                        headers:req.headers
                    }).pipe(res);
		    } catch(e) {}
              /*    } 
	      } catch(e) {
		console.log('proxy error:' + e);
	      }
            });*/
            }
        });
    }).resume();
});

try {
  httpServer.listen(80);
} catch(e) {
  console.log(e);
}

console.log('listen on 127.0.0.1:80');

function getPaths() {
  var content = fs.readFileSync('./paths.json');
  return JSON.parse(content);
}

function loadPath(path) {
  if (typeof path == 'object') {
    return loadPathObject(path);
  } else {
    return loadPathFile(path);
  }
}

function loadPathObject(path) {
  var namespace = path.namespace;
  if (!namespace) {
    console.log('Cant find namespace');
    return;
  }
  var content = '';
  var main = namespace.replace(/\./g, '/');
  // style
  if (namespace.match(/\.css\./)) {
    content = fs.readFileSync('../' + main + '.css', 'utf-8');
    content = content.replace(/([\/\.])*\/css/g, '/plu/css');
  } else {
    content = fs.readFileSync('../plu/base.js', 'utf-8');
    content += 'document.write(\'<script src="../' + main + '.js"></script>\');';
    content += 'document.write(\'<script>' + namespace + '();</script>\');';
  }
  return content;
}

function loadPathFile(path) {
  var content = fs.readFileSync(path, 'utf-8');
  return content;
}
