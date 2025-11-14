/**
 * Generate VAPID keys for Web Push Notifications
 * Run: node generate-vapid-keys.js
 */

const webpush = require("web-push")

const vapidKeys = webpush.generateVAPIDKeys()

console.log("\n=== VAPID Keys Generated ===\n")
console.log("Public Key (NEXT_PUBLIC_VAPID_PUBLIC_KEY):")
console.log(vapidKeys.publicKey)
console.log("\nPrivate Key (VAPID_PRIVATE_KEY):")
console.log(vapidKeys.privateKey)
console.log("\nEmail (VAPID_EMAIL):")
console.log("mailto:admin@yourdomain.com")
console.log("\n=== Add these to your .env.local file ===\n")
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + vapidKeys.publicKey)
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey)
console.log("VAPID_EMAIL=mailto:admin@yourdomain.com")





