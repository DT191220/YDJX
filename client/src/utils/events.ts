// 简单的事件发布/订阅系统，用于跨组件通信

type EventCallback = () => void;

const eventListeners: Record<string, EventCallback[]> = {};

// 事件名称常量
export const EVENTS = {
  EXAM_REGISTRATION_CHANGED: 'exam_registration_changed',
} as const;

// 订阅事件
export function subscribe(event: string, callback: EventCallback): () => void {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(callback);
  
  // 返回取消订阅函数
  return () => {
    const index = eventListeners[event].indexOf(callback);
    if (index > -1) {
      eventListeners[event].splice(index, 1);
    }
  };
}

// 发布事件
export function publish(event: string): void {
  if (eventListeners[event]) {
    eventListeners[event].forEach(callback => callback());
  }
}
