(function() {
  // Get configuration from window.aiChatConfig
  const config = window.aiChatConfig || {};
  const siteId = config.siteId;
  const channelId = config.channelId || "";
  
  // Auto-detect base URL from script source
  const scriptTag = document.currentScript;
  let detectedBaseUrl = "https://whatsway.diploy.in";
  if (scriptTag && scriptTag.src) {
    try {
      const url = new URL(scriptTag.src);
      detectedBaseUrl = `${url.protocol}//${url.host}`;
    } catch (e) {}
  }

  const baseUrl = config.url || detectedBaseUrl;

  if (!siteId) {
    console.error("WhatsWay Widget: siteId is required in window.aiChatConfig");
    return;
  }

  // Create Widget Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #whatsway-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #whatsway-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #3b82f6;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
    }
    #whatsway-widget-button:hover {
      transform: scale(1.1);
    }
    #whatsway-widget-button svg {
      width: 30px;
      height: 30px;
      fill: white;
    }
    #whatsway-widget-iframe-container {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 400px;
      height: 600px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      overflow: hidden;
      display: none;
      border: 1px solid #e2e8f0;
    }
    #whatsway-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    @media (max-width: 480px) {
      #whatsway-widget-iframe-container {
        width: calc(100vw - 40px);
        height: calc(100vh - 120px);
      }
    }
  `;
  document.head.appendChild(style);

  // Create Container
  const container = document.createElement('div');
  container.id = 'whatsway-widget-container';
  container.style.visibility = 'hidden'; // Hide until config loaded

  // Create Button
  const button = document.createElement('div');
  button.id = 'whatsway-widget-button';
  button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

  // Create Iframe Container
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'whatsway-widget-iframe-container';

  const iframe = document.createElement('iframe');
  iframe.id = 'whatsway-widget-iframe';
  iframe.src = `${baseUrl}/widget-chat?siteId=${siteId}&channelId=${channelId}`;

  iframeContainer.appendChild(iframe);
  container.appendChild(iframeContainer);
  container.appendChild(button);
  document.body.appendChild(container);

  // Fetch Config and Apply Styles
  fetch(`${baseUrl}/api/widget/config/${siteId}`)
    .then(r => r.json())
    .then(data => {
      const widgetConfig = data.config || {};
      const primaryColor = widgetConfig.accentColor || '#3b82f6';
      const position = widgetConfig.position || 'bottom-right';
      
      // Update Button Color
      button.style.backgroundColor = primaryColor;
      
      // Update Position
      if (position === 'bottom-left') {
        container.style.right = 'auto';
        container.style.left = '20px';
        iframeContainer.style.right = 'auto';
        iframeContainer.style.left = '0';
      } else {
        container.style.left = 'auto';
        container.style.right = '20px';
        iframeContainer.style.left = 'auto';
        iframeContainer.style.right = '0';
      }
      
      container.style.visibility = 'visible';
    })
    .catch(err => {
      console.error("WhatsWay Widget: Failed to load config", err);
      container.style.visibility = 'visible'; // Show anyway with defaults
    });

  // Toggle Logic
  let isOpen = false;
  button.onclick = function() {
    isOpen = !isOpen;
    if (isOpen) {
      iframeContainer.style.display = 'block';
      button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    } else {
      iframeContainer.style.display = 'none';
      button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    }
  };
})();
