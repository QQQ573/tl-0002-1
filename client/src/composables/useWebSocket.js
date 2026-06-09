import { ref, onUnmounted, reactive } from 'vue'

export function useWebSocket() {
  const ws = ref(null)
  const isConnected = ref(false)
  const isReconnecting = ref(false)
  const reconnectAttempts = ref(0)
  const lastMessage = ref(null)
  const messageHistory = reactive([])
  
  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_DELAY = 1000
  const HEARTBEAT_INTERVAL = 30000
  
  let heartbeatTimer = null
  let reconnectTimer = null
  let wsUrl = ''
  let manualClose = false
  let messageId = 0

  function connect(url) {
    wsUrl = url
    manualClose = false
    
    try {
      ws.value = new WebSocket(url)
      
      ws.value.onopen = () => {
        console.log('WebSocket connected')
        isConnected.value = true
        isReconnecting.value = false
        reconnectAttempts.value = 0
        startHeartbeat()
      }

      ws.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          messageId++
          const msgRecord = { id: messageId, data, timestamp: Date.now() }
          lastMessage.value = msgRecord
          messageHistory.push(msgRecord)
          if (messageHistory.length > 100) {
            messageHistory.shift()
          }
        } catch (e) {
          console.error('Parse message error:', e)
        }
      }

      ws.value.onclose = () => {
        console.log('WebSocket closed')
        isConnected.value = false
        stopHeartbeat()
        
        if (!manualClose && reconnectAttempts.value < MAX_RECONNECT_ATTEMPTS) {
          scheduleReconnect()
        }
      }

      ws.value.onerror = (error) => {
        console.error('WebSocket error:', error)
        isConnected.value = false
      }
    } catch (e) {
      console.error('Connect error:', e)
    }
  }

  function send(message) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message))
      return true
    }
    return false
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      send({ type: 'ping' })
    }, HEARTBEAT_INTERVAL)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function scheduleReconnect() {
    if (isReconnecting.value) return
    
    isReconnecting.value = true
    reconnectAttempts.value++
    
    const delay = Math.min(RECONNECT_DELAY * Math.pow(2, reconnectAttempts.value - 1), 10000)
    
    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value}/${MAX_RECONNECT_ATTEMPTS})`)
    
    reconnectTimer = setTimeout(() => {
      connect(wsUrl)
    }, delay)
  }

  function reconnectNow() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    isReconnecting.value = false
    connect(wsUrl)
  }

  function close() {
    manualClose = true
    stopHeartbeat()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    isConnected.value = false
    isReconnecting.value = false
  }

  onUnmounted(() => {
    close()
  })

  return {
    ws,
    isConnected,
    isReconnecting,
    lastMessage,
    messageHistory,
    reconnectAttempts,
    connect,
    send,
    close,
    reconnectNow,
  }
}
