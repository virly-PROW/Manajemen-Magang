// Push notification service worker
// This will be merged with the main service worker

self.addEventListener("push", function (event) {
  console.log("Push notification received:", event)

  let notificationData = {
    title: "Notifikasi Baru",
    body: "Anda memiliki notifikasi baru",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    data: {
      url: "/",
    },
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: {
          url: data.url || data.data?.url || "/",
          role: data.role || data.data?.role,
        },
      }
    } catch (e) {
      console.error("Error parsing push data:", e)
      notificationData.body = event.data.text()
    }
  }

  const promiseChain = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    tag: "notification",
    requireInteraction: false,
    vibrate: [200, 100, 200],
  })

  event.waitUntil(promiseChain)
})

self.addEventListener("notificationclick", function (event) {
  console.log("Notification clicked:", event)

  event.notification.close()

  const urlToOpen = event.notification.data?.url || "/"

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus()
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})



















