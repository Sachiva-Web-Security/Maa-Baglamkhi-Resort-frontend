import { getBackendBaseURL } from "../api";

let socketPromise = null;
let socketInstance = null;
const SOCKET_CLIENT_VERSION = "proxy-ws-v3";

const resolveSocketBaseURL = () => {
  const explicitOrigin = import.meta.env.VITE_BACKEND_ORIGIN || import.meta.env.VITE_API_URL || "";
  if (/^https?:\/\//i.test(explicitOrigin)) {
    return explicitOrigin.replace(/\/api\/?$/, "");
  }
  return getBackendBaseURL();
};

const getSocketScriptURL = () => {
  return `${resolveSocketBaseURL()}/socket.io/socket.io.js?v=${SOCKET_CLIENT_VERSION}`;
};

const getSocketServerURL = () => resolveSocketBaseURL();

const loadSocketScript = () =>
  new Promise((resolve, reject) => {
    if (window.io) {
      resolve(window.io);
      return;
    }

    const existing = document.querySelector('script[data-socket-io-client="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.io), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = getSocketScriptURL();
    script.async = true;
    script.dataset.socketIoClient = "true";
    script.onload = () => resolve(window.io);
    script.onerror = reject;
    document.head.appendChild(script);
  });

export const getRestaurantSocket = async () => {
  if (!socketPromise) {
    socketPromise = loadSocketScript().then((ioFactory) => {
      if (!ioFactory) return null;
      socketInstance = ioFactory(getSocketServerURL(), {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        withCredentials: false,
        forceNew: true,
        reconnection: true,
      });
      return socketInstance;
    });
  }

  const socket = await socketPromise;
  if (socket && socket.disconnected) {
    socket.connect();
  }
  return socket;
};

export const releaseRestaurantSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  socketPromise = null;
  delete window.io;
};
