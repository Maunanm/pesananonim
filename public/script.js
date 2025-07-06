document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const messagesContainer = document.getElementById('messagesContainer');
  const charCount = document.getElementById('charCount');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const prevPage = document.getElementById('prevPage');
  const nextPage = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  
  // State management
  let messages = [];
  let currentPage = 1;
  const messagesPerPage = 10;
  let sortOrder = 'newest';
  let searchQuery = '';
  
  // Initialize the app
  init();
  
  function init() {
    loadMessages();
    setupEventListeners();
  }
  
  function setupEventListeners() {
    // Send message
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        sendMessage();
      }
    });
    
    // Character counter
    messageInput.addEventListener('input', updateCharCount);
    
    // Search and sort
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      currentPage = 1;
      renderMessages();
    });
    
    sortSelect.addEventListener('change', (e) => {
      sortOrder = e.target.value;
      currentPage = 1;
      renderMessages();
    });
    
    // Pagination
    prevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderMessages();
      }
    });
    
    nextPage.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredMessages().length / messagesPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderMessages();
      }
    });
  }
  
  function updateCharCount() {
    const count = messageInput.value.length;
    charCount.textContent = count;
    
    if (count > 500) {
      charCount.style.color = 'var(--danger-color)';
    } else {
      charCount.style.color = '';
    }
  }
  
  // Helper function to safely convert Firestore timestamp
  function safeToDate(timestamp) {
    if (!timestamp) return new Date();
    if (typeof timestamp === 'string') return new Date(timestamp);
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date();
  }
  
  async function loadMessages() {
    try {
      const response = await fetch('/api/messages');
      if (!response.ok) throw new Error('Gagal memuat pesan');
      
      messages = await response.json();
      renderMessages();
    } catch (error) {
      console.error('Error:', error);
      showNotification('Gagal memuat pesan. Coba lagi nanti.', 'error');
    }
  }
  
  async function sendMessage() {
    const message = messageInput.value.trim();
    
    // Validation
    if (!message) {
      showNotification('Masukkan pesan terlebih dahulu', 'error');
      return;
    }
    
    if (message.length > 500) {
      showNotification('Pesan maksimal 500 karakter', 'error');
      return;
    }
    
    try {
      sendButton.disabled = true;
      sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) throw new Error('Gagal mengirim pesan');
      
      messageInput.value = '';
      updateCharCount();
      await loadMessages(); // Refresh messages
      
      showNotification('Pesan terkirim secara anonim!', 'success');
      
    } catch (error) {
      console.error('Error:', error);
      showNotification('Gagal mengirim pesan. Coba lagi.', 'error');
    } finally {
      sendButton.disabled = false;
      sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim';
    }
  }
  
  function filteredMessages() {
    let filtered = [...messages];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(msg => 
        msg.message.toLowerCase().includes(searchQuery)
      );
    }
    
    // Apply sort with safe date conversion
    filtered.sort((a, b) => {
      const dateA = safeToDate(a.createdAt);
      const dateB = safeToDate(b.createdAt);
      
      return sortOrder === 'newest' ? 
        dateB - dateA : 
        dateA - dateB;
    });
    
    return filtered;
  }
  
  function formatDateTime(date) {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    };
    return date.toLocaleDateString('id-ID', options);
  }
  
  function renderMessages() {
    const filtered = filteredMessages();
    const totalPages = Math.ceil(filtered.length / messagesPerPage);
    
    // Update pagination controls
    prevPage.disabled = currentPage <= 1;
    nextPage.disabled = currentPage >= totalPages;
    pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages || 1}`;
    
    // Get messages for current page
    const startIdx = (currentPage - 1) * messagesPerPage;
    const paginatedMessages = filtered.slice(startIdx, startIdx + messagesPerPage);
    
    // Render messages
    messagesContainer.innerHTML = '';
    
    if (paginatedMessages.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = searchQuery ? 
        'Tidak ada pesan yang cocok' : 
        'Belum ada pesan. Jadilah yang pertama!';
      messagesContainer.appendChild(emptyMsg);
      return;
    }
    
    paginatedMessages.forEach(msg => {
      const messageElement = document.createElement('div');
      messageElement.className = 'message';
      
      const messageContent = document.createElement('div');
      messageContent.className = 'message-content';
      messageContent.textContent = msg.message;
      
      const messageMeta = document.createElement('div');
      messageMeta.className = 'message-meta';
      
      const messageTime = document.createElement('div');
      messageTime.className = 'message-time';
      
      const createdAt = safeToDate(msg.createdAt);
      const timeText = formatDateTime(createdAt);
      
      messageTime.innerHTML = `<i class="far fa-clock"></i> ${timeText}`;
      
      messageMeta.appendChild(messageTime);
      messageElement.appendChild(messageContent);
      messageElement.appendChild(messageMeta);
      messagesContainer.appendChild(messageElement);
    });
  }
  
  function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
});