const autocannon = require('autocannon');

const url = 'http://localhost:7001/login';
const connections = 1000;
const duration = 30;

console.log(`Running performance test against ${url}`);
console.log(`Connections: ${connections}, Duration: ${duration}s`);

const instance = autocannon(
  {
    url,
    connections,
    duration,
    pipelining: 1,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  },
  (err, result) => {
    if (err) {
      console.error('Performance test failed:', err);
      process.exit(1);
    }
    console.log('Performance test completed.');
    console.log(autocannon.printResult(result));
  }
);

autocannon.track(instance, { renderProgressBar: true });
