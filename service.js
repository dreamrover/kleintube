const Service = require('node-windows').Service;
 
// Create a new service object
var svc = new Service({
  name:'Kleintube',
  description: 'KleinTube Proxy Server',
  script: 'kleintube.js',
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
  //, workingDirectory: '...'
  //, allowServiceLogon: true
});
 
// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});
 
svc.install();