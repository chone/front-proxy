
var nodeStatic = require('node-static').Server;
var request = require("request");
var dns = require("dns");
var http = require("http");
var path = require('path');
var fs = require('fs');
var config = require('./config-default');

try {
  config = require('./config');
} catch(e) {}

var paths;

loadPaths();

fs.watchFile(config.paths, function(curr, prev) {
  loadPaths();  
});

var fileServer = new nodeStatic(config.root);
var httpServer = http.createServer(handleRequest);
httpServer.listen(config.port, config.ip);
console.log('listen on ' + config.ip + ':' + config.port);

/**
 * server监听函数
 */
function handleRequest(req, res) {
  req.addListener('end', function() {
    var url = 'http://' + req.headers.host + req.url;
    try {
      var file = paths[url]; 
      if (file) {
	var content = loadPath(file);
	if (content) {
	  res.writeHeader(200, 'application/x-javascript');
	  res.write(content);
	  res.end();
	  console.log(url);
	  console.log(' --> ' + file);
	}
      }
    } catch(e) {
      console.log('load failure: ' + file);
    }

    fileServer.serve(req, res, function(err, result) {
      if (err && (err.status === 404)) {
	//本地没有文件访问线上，透明server
	dns.resolve4(req.headers.host,function(err,addresses){
	  try {
	    if(err){
	      res.writeHeader(200,'text/html');   
	      res.write(req.url);
	      res.end(err);
	    }else{
	      var ip = addresses[0];
	      var p = 'http://' + ip + req.url;
	      req.headers['Host'] = req.headers.host;
	      request({
		method:req.method,
		url: p,
		headers:req.headers
	      }).pipe(res);
	    } 
	  } catch(e) {}
	});
      }
    });
  }).resume();
}

function loadPaths() {
  delete require.cache[path.resolve(config.paths)];
  try {
    paths = require(config.paths);
    console.log('load ' + config.paths + ' success.');
  } catch(e) {
    console.log('load ' + config.paths + ' failure.');
  }
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
