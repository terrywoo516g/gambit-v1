const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/workspace/list',
  method: 'GET',
  headers: {
    'Cookie': 'deviceId=913d2c29-a23a-44ca-865d-a819b39c7ec1'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data); });
});
req.on('error', console.error);
req.end();