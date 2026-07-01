/**
 * ServerSideEventBufferService 单元测试
 */
import { ServerSideEventBufferService, EventBufferConfig } from './server-side-event-buffer.service';

describe('ServerSideEventBufferService', () => {
  let service: ServerSideEventBufferService;
  let processedEvents: any[] = [];
  
  beforeEach(() => {
    processedEvents = [];
    service = new ServerSideEventBufferService({
      batchSize: 3,
      throttleMs: 100,
      maxRetries: 2,
      enableOfflineCache: false, // 测试时禁用离线缓存
      enablePriorityQueue: true
    });
    
    // 设置事件处理函数
    service.setEventHandler(async (events) => {
      processedEvents.push(...events);
    });
  });
  
  afterEach(() => {
    service.destroy();
  });
  
  it('should create service instance', () => {
    expect(service).toBeTruthy();
    expect(service.getQueueLength()).toBe(0);
  });
  
  it('should buffer events', (done) => {
    service.bufferEvent('sort', { field: 'name', direction: 'asc' });
    service.bufferEvent('filter', { field: 'age', value: 25 });
    
    setTimeout(() => {
      expect(processedEvents.length).toBe(2);
      expect(processedEvents[0].type).toBe('sort');
      expect(processedEvents[1].type).toBe('filter');
      done();
    }, 150);
  });
  
  it('should batch events', (done) => {
    // 添加 5 个事件，batchSize=3，应该分两批处理
    service.bufferEvent('sort', { field: 'name' });
    service.bufferEvent('filter', { field: 'age' });
    service.bufferEvent('group', { field: 'department' });
    service.bufferEvent('sort', { field: 'age' });
    service.bufferEvent('filter', { field: 'email' });
    
    setTimeout(() => {
      expect(processedEvents.length).toBe(5);
      done();
    }, 250); // 等待两批处理完成
  });
  
  it('should prioritize events', (done) => {
    // 优先级: 0 最高, 10 最低
    service.bufferEvent('filter', {}, 5); // 优先级 5
    service.bufferEvent('sort', {}, 0);  // 优先级 0 (最高)
    service.bufferEvent('group', {}, 3);  // 优先级 3
    
    setTimeout(() => {
      // 应该按优先级顺序处理: sort (0), group (3), filter (5)
      expect(processedEvents[0].type).toBe('sort');
      expect(processedEvents[1].type).toBe('group');
      expect(processedEvents[2].type).toBe('filter');
      done();
    }, 150);
  });
  
  it('should retry failed events', (done) => {
    let attemptCount = 0;
    
    // 设置会失败的事件处理函数
    service.setEventHandler(async (events) => {
      attemptCount++;
      if (attemptCount <= 2) {
        throw new Error('Simulated failure');
      }
      processedEvents.push(...events);
    });
    
    service.bufferEvent('sort', { field: 'name' });
    
    setTimeout(() => {
      // 应该重试 2 次后成功
      expect(attemptCount).toBe(3); // 1 次初始 + 2 次重试
      expect(processedEvents.length).toBe(1);
      done();
    }, 500);
  });
  
  it('should flush all events immediately', async () => {
    service.bufferEvent('sort', { field: 'name' });
    service.bufferEvent('filter', { field: 'age' });
    service.bufferEvent('group', { field: 'department' });
    
    await service.flush();
    
    expect(processedEvents.length).toBe(3);
    expect(service.getQueueLength()).toBe(0);
  });
  
  it('should clear event queue', () => {
    service.bufferEvent('sort', { field: 'name' });
    service.bufferEvent('filter', { field: 'age' });
    
    service.clear();
    
    expect(service.getQueueLength()).toBe(0);
  });
  
  it('should handle empty queue', async () => {
    await service.flush();
    expect(processedEvents.length).toBe(0);
  });
});
