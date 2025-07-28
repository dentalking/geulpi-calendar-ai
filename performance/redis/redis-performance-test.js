// Redis Performance Testing Script for Geulpi Calendar Service
// Tests Redis caching performance, data structures, and operations

const Redis = require('ioredis');
const { performance } = require('perf_hooks');

class RedisPerformanceTester {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      lazyConnect: true
    });
    
    this.results = {
      connectionTest: null,
      basicOperations: {},
      dataStructures: {},
      cacheOperations: {},
      pipelineOperations: {},
      memoryAnalysis: {},
      keyExpiration: {},
      transactionPerformance: {},
      pubSubPerformance: {},
      luaScriptPerformance: {}
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Redis Performance Tests...\n');
    
    try {
      await this.testConnection();
      await this.testBasicOperations();
      await this.testDataStructures();
      await this.testCacheOperations();
      await this.testPipelineOperations();
      await this.testMemoryOperations();
      await this.testKeyExpiration();
      await this.testTransactionPerformance();
      await this.testPubSubPerformance();
      await this.testLuaScriptPerformance();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Error during testing:', error);
    } finally {
      await this.cleanup();
    }
  }

  async testConnection() {
    console.log('📡 Testing Redis Connection...');
    const start = performance.now();
    
    try {
      await this.redis.connect();
      const ping = await this.redis.ping();
      const end = performance.now();
      
      this.results.connectionTest = {
        status: ping === 'PONG' ? 'SUCCESS' : 'FAILED',
        latency: end - start
      };
      
      console.log(`✅ Connection: ${this.results.connectionTest.status} (${this.results.connectionTest.latency.toFixed(2)}ms)\n`);
    } catch (error) {
      this.results.connectionTest = {
        status: 'FAILED',
        error: error.message
      };
      console.log(`❌ Connection failed: ${error.message}\n`);
    }
  }

  async testBasicOperations() {
    console.log('🔧 Testing Basic Operations...');
    
    // Test SET operations
    const setTimes = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      await this.redis.set(`test:set:${i}`, `value_${i}`);
      setTimes.push(performance.now() - start);
    }
    
    // Test GET operations
    const getTimes = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      await this.redis.get(`test:set:${i}`);
      getTimes.push(performance.now() - start);
    }
    
    // Test DELETE operations
    const delTimes = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      await this.redis.del(`test:set:${i}`);
      delTimes.push(performance.now() - start);
    }
    
    this.results.basicOperations = {
      set: {
        avg: this.average(setTimes),
        min: Math.min(...setTimes),
        max: Math.max(...setTimes),
        operations: setTimes.length
      },
      get: {
        avg: this.average(getTimes),
        min: Math.min(...getTimes),
        max: Math.max(...getTimes),
        operations: getTimes.length
      },
      delete: {
        avg: this.average(delTimes),
        min: Math.min(...delTimes),
        max: Math.max(...delTimes),
        operations: delTimes.length
      }
    };
    
    console.log(`✅ Basic Operations completed`);
    console.log(`   SET: ${this.results.basicOperations.set.avg.toFixed(2)}ms avg`);
    console.log(`   GET: ${this.results.basicOperations.get.avg.toFixed(2)}ms avg`);
    console.log(`   DEL: ${this.results.basicOperations.delete.avg.toFixed(2)}ms avg\n`);
  }

  async testDataStructures() {
    console.log('📊 Testing Data Structures...');
    
    // Test Lists (for event queues)
    const listTimes = [];
    const listKey = 'test:events:queue';
    
    for (let i = 0; i < 500; i++) {
      const start = performance.now();
      await this.redis.lpush(listKey, JSON.stringify({
        id: i,
        title: `Event ${i}`,
        timestamp: Date.now()
      }));
      listTimes.push(performance.now() - start);
    }
    
    // Test Hash operations (for user data)
    const hashTimes = [];
    const hashKey = 'test:user:1';
    
    for (let i = 0; i < 500; i++) {
      const start = performance.now();
      await this.redis.hset(hashKey, `field_${i}`, `value_${i}`);
      hashTimes.push(performance.now() - start);
    }
    
    // Test Set operations (for tags)
    const setOpTimes = [];
    const setKey = 'test:tags:user:1';
    
    for (let i = 0; i < 500; i++) {
      const start = performance.now();
      await this.redis.sadd(setKey, `tag_${i}`);
      setOpTimes.push(performance.now() - start);
    }
    
    // Test Sorted Set operations (for leaderboards/priorities)
    const zsetTimes = [];
    const zsetKey = 'test:priorities';
    
    for (let i = 0; i < 500; i++) {
      const start = performance.now();
      await this.redis.zadd(zsetKey, i, `item_${i}`);
      zsetTimes.push(performance.now() - start);
    }
    
    this.results.dataStructures = {
      list: {
        avg: this.average(listTimes),
        operations: listTimes.length
      },
      hash: {
        avg: this.average(hashTimes),
        operations: hashTimes.length
      },
      set: {
        avg: this.average(setOpTimes),
        operations: setOpTimes.length
      },
      sortedSet: {
        avg: this.average(zsetTimes),
        operations: zsetTimes.length
      }
    };
    
    console.log(`✅ Data Structures completed`);
    console.log(`   Lists: ${this.results.dataStructures.list.avg.toFixed(2)}ms avg`);
    console.log(`   Hashes: ${this.results.dataStructures.hash.avg.toFixed(2)}ms avg`);
    console.log(`   Sets: ${this.results.dataStructures.set.avg.toFixed(2)}ms avg`);
    console.log(`   Sorted Sets: ${this.results.dataStructures.sortedSet.avg.toFixed(2)}ms avg\n`);
    
    // Cleanup
    await this.redis.del(listKey, hashKey, setKey, zsetKey);
  }

  async testCacheOperations() {
    console.log('💾 Testing Cache Operations...');
    
    // Simulate user session caching
    const sessionTimes = [];
    for (let i = 0; i < 100; i++) {
      const sessionData = {
        userId: i,
        email: `user${i}@example.com`,
        preferences: {
          theme: 'dark',
          timezone: 'UTC',
          language: 'en'
        },
        lastActivity: Date.now()
      };
      
      const start = performance.now();
      await this.redis.setex(`session:${i}`, 3600, JSON.stringify(sessionData));
      sessionTimes.push(performance.now() - start);
    }
    
    // Simulate event caching
    const eventCacheTimes = [];
    for (let i = 0; i < 100; i++) {
      const eventData = {
        id: i,
        title: `Cached Event ${i}`,
        startTime: new Date(Date.now() + i * 86400000).toISOString(),
        endTime: new Date(Date.now() + i * 86400000 + 3600000).toISOString(),
        attendees: Math.floor(Math.random() * 10) + 1
      };
      
      const start = performance.now();
      await this.redis.setex(`event:${i}`, 1800, JSON.stringify(eventData));
      eventCacheTimes.push(performance.now() - start);
    }
    
    // Test cache retrieval performance
    const retrievalTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await this.redis.get(`session:${i}`);
      await this.redis.get(`event:${i}`);
      retrievalTimes.push(performance.now() - start);
    }
    
    this.results.cacheOperations = {
      sessionCaching: {
        avg: this.average(sessionTimes),
        operations: sessionTimes.length
      },
      eventCaching: {
        avg: this.average(eventCacheTimes),
        operations: eventCacheTimes.length
      },
      retrieval: {
        avg: this.average(retrievalTimes),
        operations: retrievalTimes.length
      }
    };
    
    console.log(`✅ Cache Operations completed`);
    console.log(`   Session Cache: ${this.results.cacheOperations.sessionCaching.avg.toFixed(2)}ms avg`);
    console.log(`   Event Cache: ${this.results.cacheOperations.eventCaching.avg.toFixed(2)}ms avg`);
    console.log(`   Retrieval: ${this.results.cacheOperations.retrieval.avg.toFixed(2)}ms avg\n`);
  }

  async testPipelineOperations() {
    console.log('🔄 Testing Pipeline Operations...');
    
    // Test individual operations
    const individualTimes = [];
    const start1 = performance.now();
    for (let i = 0; i < 100; i++) {
      await this.redis.set(`individual:${i}`, `value_${i}`);
    }
    individualTimes.push(performance.now() - start1);
    
    // Test pipelined operations
    const pipelineTimes = [];
    const start2 = performance.now();
    const pipeline = this.redis.pipeline();
    for (let i = 0; i < 100; i++) {
      pipeline.set(`pipeline:${i}`, `value_${i}`);
    }
    await pipeline.exec();
    pipelineTimes.push(performance.now() - start2);
    
    this.results.pipelineOperations = {
      individual: {
        total: individualTimes[0],
        perOperation: individualTimes[0] / 100
      },
      pipeline: {
        total: pipelineTimes[0],
        perOperation: pipelineTimes[0] / 100,
        speedup: individualTimes[0] / pipelineTimes[0]
      }
    };
    
    console.log(`✅ Pipeline Operations completed`);
    console.log(`   Individual: ${this.results.pipelineOperations.individual.total.toFixed(2)}ms total`);
    console.log(`   Pipeline: ${this.results.pipelineOperations.pipeline.total.toFixed(2)}ms total`);
    console.log(`   Speedup: ${this.results.pipelineOperations.pipeline.speedup.toFixed(2)}x\n`);
    
    // Cleanup
    const cleanupPipeline = this.redis.pipeline();
    for (let i = 0; i < 100; i++) {
      cleanupPipeline.del(`individual:${i}`, `pipeline:${i}`);
    }
    await cleanupPipeline.exec();
  }

  async testMemoryOperations() {
    console.log('🧠 Testing Memory Operations...');
    
    // Get memory info before test
    const memoryBefore = await this.redis.memory('usage', 'test:memory:large');
    
    // Test large value storage
    const largeValue = 'x'.repeat(10000); // 10KB string
    const largeValueTimes = [];
    
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      await this.redis.set(`test:memory:large:${i}`, largeValue);
      largeValueTimes.push(performance.now() - start);
    }
    
    // Test small value storage
    const smallValue = 'small';
    const smallValueTimes = [];
    
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      await this.redis.set(`test:memory:small:${i}`, smallValue);
      smallValueTimes.push(performance.now() - start);
    }
    
    // Get memory usage stats
    const memoryInfo = await this.redis.memory('stats');
    
    this.results.memoryAnalysis = {
      largeValues: {
        avg: this.average(largeValueTimes),
        operations: largeValueTimes.length,
        size: '10KB per value'
      },
      smallValues: {
        avg: this.average(smallValueTimes),
        operations: smallValueTimes.length,
        size: '5B per value'
      },
      memoryStats: this.parseMemoryStats(memoryInfo)
    };
    
    console.log(`✅ Memory Operations completed`);
    console.log(`   Large Values (10KB): ${this.results.memoryAnalysis.largeValues.avg.toFixed(2)}ms avg`);
    console.log(`   Small Values (5B): ${this.results.memoryAnalysis.smallValues.avg.toFixed(2)}ms avg\n`);
    
    // Cleanup
    const cleanupPipeline = this.redis.pipeline();
    for (let i = 0; i < 50; i++) {
      cleanupPipeline.del(`test:memory:large:${i}`);
    }
    for (let i = 0; i < 1000; i++) {
      cleanupPipeline.del(`test:memory:small:${i}`);
    }
    await cleanupPipeline.exec();
  }

  async testKeyExpiration() {
    console.log('⏱️ Testing Key Expiration...');
    
    // Test TTL setting performance
    const ttlTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await this.redis.setex(`test:ttl:${i}`, 60, `value_${i}`);
      ttlTimes.push(performance.now() - start);
    }
    
    // Test TTL checking performance
    const ttlCheckTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await this.redis.ttl(`test:ttl:${i}`);
      ttlCheckTimes.push(performance.now() - start);
    }
    
    this.results.keyExpiration = {
      setting: {
        avg: this.average(ttlTimes),
        operations: ttlTimes.length
      },
      checking: {
        avg: this.average(ttlCheckTimes),
        operations: ttlCheckTimes.length
      }
    };
    
    console.log(`✅ Key Expiration completed`);
    console.log(`   TTL Setting: ${this.results.keyExpiration.setting.avg.toFixed(2)}ms avg`);
    console.log(`   TTL Checking: ${this.results.keyExpiration.checking.avg.toFixed(2)}ms avg\n`);
    
    // Cleanup will happen automatically via TTL
  }

  async testTransactionPerformance() {
    console.log('🔒 Testing Transaction Performance...');
    
    // Test simple transaction
    const transactionTimes = [];
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      const transaction = this.redis.multi();
      transaction.set(`test:trans:${i}:a`, `value_a_${i}`);
      transaction.set(`test:trans:${i}:b`, `value_b_${i}`);
      transaction.incr(`test:trans:counter`);
      await transaction.exec();
      transactionTimes.push(performance.now() - start);
    }
    
    this.results.transactionPerformance = {
      avg: this.average(transactionTimes),
      operations: transactionTimes.length,
      commandsPerTransaction: 3
    };
    
    console.log(`✅ Transaction Performance completed`);
    console.log(`   Avg: ${this.results.transactionPerformance.avg.toFixed(2)}ms (3 commands per transaction)\n`);
    
    // Cleanup
    await this.redis.del('test:trans:counter');
    const cleanupPipeline = this.redis.pipeline();
    for (let i = 0; i < 50; i++) {
      cleanupPipeline.del(`test:trans:${i}:a`, `test:trans:${i}:b`);
    }
    await cleanupPipeline.exec();
  }

  async testPubSubPerformance() {
    console.log('📢 Testing Pub/Sub Performance...');
    
    // Create subscriber
    const subscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined
    });
    
    let messagesReceived = 0;
    const publishTimes = [];
    
    subscriber.subscribe('test:channel');
    subscriber.on('message', (channel, message) => {
      messagesReceived++;
    });
    
    // Give subscriber time to connect
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test publishing performance
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await this.redis.publish('test:channel', `message_${i}`);
      publishTimes.push(performance.now() - start);
    }
    
    // Wait for messages to be received
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.results.pubSubPerformance = {
      publish: {
        avg: this.average(publishTimes),
        operations: publishTimes.length
      },
      messagesReceived: messagesReceived,
      deliveryRate: (messagesReceived / 100) * 100
    };
    
    console.log(`✅ Pub/Sub Performance completed`);
    console.log(`   Publish: ${this.results.pubSubPerformance.publish.avg.toFixed(2)}ms avg`);
    console.log(`   Delivery Rate: ${this.results.pubSubPerformance.deliveryRate}%\n`);
    
    subscriber.disconnect();
  }

  async testLuaScriptPerformance() {
    console.log('📜 Testing Lua Script Performance...');
    
    // Test Lua script for atomic operations
    const luaScript = `
      local key = KEYS[1]
      local value = ARGV[1]
      local current = redis.call('GET', key)
      if current then
        return redis.call('SET', key, value .. ':' .. current)
      else
        return redis.call('SET', key, value)
      end
    `;
    
    const luaTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await this.redis.eval(luaScript, 1, 'test:lua:key', `value_${i}`);
      luaTimes.push(performance.now() - start);
    }
    
    this.results.luaScriptPerformance = {
      avg: this.average(luaTimes),
      operations: luaTimes.length
    };
    
    console.log(`✅ Lua Script Performance completed`);
    console.log(`   Avg: ${this.results.luaScriptPerformance.avg.toFixed(2)}ms\n`);
    
    // Cleanup
    await this.redis.del('test:lua:key');
  }

  parseMemoryStats(memoryInfo) {
    const stats = {};
    memoryInfo.forEach((line, index) => {
      if (index % 2 === 0) {
        const key = line.replace(/\./g, '_');
        const value = memoryInfo[index + 1];
        stats[key] = value;
      }
    });
    return stats;
  }

  average(numbers) {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REDIS PERFORMANCE TEST REPORT');
    console.log('='.repeat(60));
    
    console.log('\n🔗 Connection:');
    console.log(`   Status: ${this.results.connectionTest.status}`);
    console.log(`   Latency: ${this.results.connectionTest.latency?.toFixed(2) || 'N/A'}ms`);
    
    console.log('\n⚡ Basic Operations:');
    Object.entries(this.results.basicOperations).forEach(([op, data]) => {
      console.log(`   ${op.toUpperCase()}: ${data.avg.toFixed(2)}ms avg (${data.operations} ops)`);
    });
    
    console.log('\n📊 Data Structures:');
    Object.entries(this.results.dataStructures).forEach(([type, data]) => {
      console.log(`   ${type}: ${data.avg.toFixed(2)}ms avg (${data.operations} ops)`);
    });
    
    console.log('\n💾 Cache Operations:');
    Object.entries(this.results.cacheOperations).forEach(([type, data]) => {
      console.log(`   ${type}: ${data.avg.toFixed(2)}ms avg (${data.operations} ops)`);
    });
    
    console.log('\n🔄 Pipeline Performance:');
    console.log(`   Individual: ${this.results.pipelineOperations.individual.total.toFixed(2)}ms total`);
    console.log(`   Pipeline: ${this.results.pipelineOperations.pipeline.total.toFixed(2)}ms total`);
    console.log(`   Speedup: ${this.results.pipelineOperations.pipeline.speedup.toFixed(2)}x`);
    
    console.log('\n📈 Performance Summary:');
    const overallAvg = this.average([
      this.results.basicOperations.get.avg,
      this.results.basicOperations.set.avg,
      this.results.cacheOperations.retrieval.avg
    ]);
    console.log(`   Overall Average Latency: ${overallAvg.toFixed(2)}ms`);
    console.log(`   Pub/Sub Delivery Rate: ${this.results.pubSubPerformance.deliveryRate}%`);
    
    // Performance classification
    const performanceLevel = overallAvg < 1 ? 'EXCELLENT' : 
                           overallAvg < 5 ? 'GOOD' : 
                           overallAvg < 10 ? 'FAIR' : 'POOR';
    console.log(`   Performance Level: ${performanceLevel}`);
    
    console.log('\n' + '='.repeat(60));
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    await this.redis.flushdb();
    await this.redis.disconnect();
    console.log('✅ Cleanup completed');
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const tester = new RedisPerformanceTester();
  tester.runAllTests().catch(console.error);
}

module.exports = RedisPerformanceTester;