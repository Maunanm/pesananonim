// DOM Elements
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messagesContainer');

// Global state
let currentMessages = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadMessages();
  setupEventListeners();
});

function setupEventListeners() {
  sendButton.addEventListener('click', sendMessage);
}

async function loadMessages() {
  try {
    showLoading(true);
    
    const response = await fetch('/api/messages');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to load messages');
    }
    
    currentMessages = await response.json();
    renderMessages();
  } catch (error) {
    console.error('Error loading messages:', error);
    showNotification(error.message, 'error');
  } finally {
    showLoading(false);
  }
}

async function sendMessage() {
  const message = messageInput.value.trim();
  
  if (!message) {
    showNotification('Please enter a message', 'error');
    return;
  }

  try {
    showLoading(true, 'Sending...');
    
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send message');
    }

    messageInput.value = '';
    await loadMessages(); // Refresh messages
    showNotification('Message sent successfully!', 'success');
  } catch (error) {
    console.error('Error sending message:', error);
    showNotification(error.message, 'error');
  } finally {
    showLoading(false);
  }
}

function renderMessages() {
  messagesContainer.innerHTML = '';
  
  if (currentMessages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="empty-message">
        No messages yet. Be the first to share!
      </div>
    `;
    return;
  }

  currentMessages.forEach(msg => {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    messageElement.innerHTML = `
      <div class="message-content">${msg.message}</div>
      <div class="message-meta">
        <div class="message-time">
          <i class="far fa-clock"></i>
          ${formatFirestoreTimestamp(msg.createdAt)}
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(messageElement);
  });
}

// Helper functions
function formatFirestoreTimestamp(timestamp) {
  if (!timestamp) return 'Just now';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Invalid timestamp:', timestamp);
    return 'Unknown time';
  }
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
    ${message}
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 3000);
}

function showLoading(isLoading, text = 'Loading...') {
  if (isLoading) {
    sendButton.disabled = true;
    sendButton.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i>
      ${text}
    `;
  } else {
    sendButton.disabled = false;
    sendButton.innerHTML = `
      <i class="fas fa-paper-plane"></i>
      Send Message
    `;
  }
}
