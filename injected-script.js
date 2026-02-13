(function() {
  const nativeConsoleLog = window.console.log;
  const nativeConsoleWarn = window.console.warn;

  if (window.PUNOTED_HAS_RUN) {
    nativeConsoleWarn('[PUNoted Interceptor] Already running. Skipping.');
    return;
  }
  window.PUNOTED_HAS_RUN = true;
  nativeConsoleLog('[PUNoted Interceptor] Init.');

  function safeExtractContext(href) {
    try {
      const m = href.match(/[?&]context=([0-9a-fA-F\-]{16,64})/);
      return m ? m[1] : undefined;
    } catch (e) {
      return undefined;
    }
  }

  function processMessage(messageData) {
    try {
      const decoder = window.PrUnDecoder || window.getPrunMessagePayload;
      if (typeof decoder !== 'function' && typeof decoder?.getPayload !== 'function') {
        nativeConsoleWarn('[PUNoted Interceptor] Decoder not available.');
        return;
      }
      const parsed = (typeof decoder.getPayload === 'function') ? decoder.getPayload(messageData) : decoder(messageData);
      if (parsed) {
        const context = safeExtractContext(location.href);
        window.postMessage({
          type: 'prun-ws-message-parsed',
          context,
          message: parsed
        }, '*');
      }
    } catch (error) {
      nativeConsoleWarn('[PUNoted Interceptor] processMessage failed.');
    }
  }

  // Proxy XHR
  window.XMLHttpRequest = new Proxy(XMLHttpRequest, {
    construct(target) {
      const xhr = new target();
      return new Proxy(xhr, {
        get(t, prop) {
          const value = Reflect.get(t, prop);
          if (typeof value === 'function') return value.bind(t);
          return value;
        },
        set(t, prop, value) {
          if (prop === 'onreadystatechange') {
            t.onreadystatechange = function() {
              try {
                if (t.readyState === 4 && t.status === 200 && typeof t.responseText === 'string') {
                  processMessage(t.responseText);
                }
              } catch (e) {}
              try { value(); } catch (e) {}
            };
            return true;
          }
          return Reflect.set(t, prop, value);
        }
      });
    }
  });

  // Proxy WebSocket
  window.WebSocket = new Proxy(WebSocket, {
    construct(target, args) {
      const ws = new target(...args);
      return new Proxy(ws, {
        get(t, prop) {
          const value = Reflect.get(t, prop);
          if (typeof value === 'function') return value.bind(t);
          return value;
        },
        set(t, prop, value) {
          if (prop === 'onmessage') {
            t.onmessage = function(e) {
              try { processMessage(e.data); } catch (ex) {}
              try { value(e); } catch (ex) {}
            };
            return true;
          }
          return Reflect.set(t, prop, value);
        }
      });
    }
  });

  window.addEventListener("unload", () => { try { delete window.PUNOTED_HAS_RUN; } catch (e) {} });
})();
