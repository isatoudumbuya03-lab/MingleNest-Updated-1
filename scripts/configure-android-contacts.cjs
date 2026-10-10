// Capacitor after-sync hook: only adds contact-read permission; preserves identity,
// microphone permissions, deep links, and all other native settings.
const fs = require('node:fs')
const path = 'android/app/src/main/AndroidManifest.xml'
if (!fs.existsSync(path)) {
  console.log('Android project is not in this workspace. Run sync in the existing Android project.')
  process.exit(0)
}
// Contacts 8 groups READ and WRITE in one alias. Discovery never writes contacts.
// Restrict that native alias to READ so a missing WRITE grant cannot block reads.
const pluginPath = 'node_modules/@capacitor-community/contacts/android/src/main/java/getcapacitor/community/contacts/ContactsPlugin.java'
if (!fs.existsSync(pluginPath)) throw new Error('Contacts plugin is missing; install dependencies before sync')
const plugin = fs.readFileSync(pluginPath, 'utf8')
const combined = 'Manifest.permission.READ_CONTACTS, Manifest.permission.WRITE_CONTACTS'
if (plugin.includes(combined)) fs.writeFileSync(pluginPath, plugin.replace(combined, 'Manifest.permission.READ_CONTACTS'))
else if (!plugin.includes('strings = { Manifest.permission.READ_CONTACTS }')) throw new Error('Contacts plugin permissions changed; review before building')
const manifest = fs.readFileSync(path, 'utf8')
if (!manifest.includes('android.permission.READ_CONTACTS')) {
  if (!/<manifest\b[^>]*>/.test(manifest)) throw new Error('Invalid existing Android manifest')
  fs.writeFileSync(path, manifest.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.READ_CONTACTS" />'))
}
console.log('Android READ_CONTACTS configured. No WRITE_CONTACTS permission added.')
