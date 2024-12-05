let redis;
let client;

// PRODUCTION
// module.exports = {
//   init: redisConfig => {
//     redis = require('redis');
//     client = redis.createClient({
//       url: `redis://${redisConfig.server}:${redisConfig.port}`
//     });
//     return client;
//   },
//   onError: client => {
//     return client.on('error', (err) => console.log('Redis Client Error', err));
//   },
//   onConnect: client => {
//     return client.connect().then(() => console.log('Redis server established successfully.'));
//   },
//   getRedis: () => {
//     if (!client) {
//       throw new Error('redis is not initialized!');
//     }
//     return client;
//   }
// }

// dev, uat
module.exports = {
  init: redisConfig => {
    redis = require('redis');
    client = redis.createClient({
      password: 'aoFoEIKWI7VWwC5uJc6DSdhjxctPNDZE',
      socket: {
        host: 'redis-13238.c264.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 13238
      }
    });
    return client;
  },
  onError: client => {
    return client.on('error', (err) => console.log('Redis Client Error', err));
  },
  onConnect: client => {
    return client.connect().then(() => console.log('Redis server established successfully.'));
  },
  getRedis: () => {
    if (!client) {
      throw new Error('redis is not initialized!');
    }
    return client;
  }
}