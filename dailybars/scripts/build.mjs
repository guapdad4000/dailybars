import esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const temp = path.join(root, '.build-temp');

const environment = process.env.DAILYBARS_ENVIRONMENT || 'production';
const useDevelopmentDefaults = environment !== 'production';

const env = {
  environment,
  releaseEnabled: process.env.DAILYBARS_RELEASE_ENABLED === 'true',
  supabaseUrl: process.env.DAILYBARS_SUPABASE_URL ||
    (useDevelopmentDefaults ? 'https://tilpgwoyyervbgdlucap.supabase.co' : ''),
  supabaseAnonKey: process.env.DAILYBARS_SUPABASE_ANON_KEY ||
    (useDevelopmentDefaults ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbHBnd295eWVydmJnZGx1Y2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTAwNDksImV4cCI6MjA4MjQ4NjA0OX0.Zw1DPMS91CxaNArACem74_-mR6IPmYpDqJksK8gwEk0' : ''),
  aiFunctionName: process.env.DAILYBARS_AI_FUNCTION || 'dailybars-ai',
  deleteAccountFunctionName: process.env.DAILYBARS_DELETE_ACCOUNT_FUNCTION || 'delete-account',
  authRedirectUrl: process.env.DAILYBARS_AUTH_REDIRECT_URL || '',
  stripeEnabled: process.env.DAILYBARS_STRIPE_ENABLED === 'true',
  revenueCat: {
    iosApiKey: process.env.DAILYBARS_REVENUECAT_IOS_KEY || '',
    androidApiKey: process.env.DAILYBARS_REVENUECAT_ANDROID_KEY || '',
    offeringId: process.env.DAILYBARS_REVENUECAT_OFFERING || 'dailybars_pro',
    entitlementId: process.env.DAILYBARS_REVENUECAT_ENTITLEMENT || 'daily raps Pro'
  }
};

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function copyIfExists(name) {
  const from = path.join(root, name);
  if (await exists(from)) {
    await fs.cp(from, path.join(dist, name), { recursive: true });
  }
}

async function transformScript(name) {
  const source = await fs.readFile(path.join(root, 'js', name), 'utf8');
  const result = await esbuild.transform(source, {
    loader: name.endsWith('.jsx') ? 'jsx' : 'jsx',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: 'es2018',
    sourcemap: false,
    minify: true
  });
  await fs.writeFile(
    path.join(dist, 'js', name),
    `;(() => {\n${result.code}\n})();\n`
  );
}

async function writeVendor() {
  await fs.mkdir(temp, { recursive: true });
  const vendorEntry = path.join(temp, 'vendor-entry.mjs');
  await fs.writeFile(vendorEntry, `
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as ReactDOMLegacy from 'react-dom';
import * as supabaseSdk from '@supabase/supabase-js';
import * as lucide from 'lucide';
import html2canvas from 'html2canvas';
 import { jsPDF } from 'jspdf';
import { Capacitor, registerPlugin } from '@capacitor/core';

window.React = React;
window.ReactDOM = { ...ReactDOMLegacy, createRoot };
window.supabaseSdk = supabaseSdk;
window.supabase = supabaseSdk;
window.lucide = lucide;
window.html2canvas = html2canvas;
window.jspdf = { jsPDF };
window.Capacitor = Capacitor;
window.CapacitorPurchases = registerPlugin('Purchases');
`);
  await esbuild.build({
    entryPoints: [vendorEntry],
    outfile: path.join(dist, 'vendor', 'vendor.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2018',
    minify: true,
    legalComments: 'none'
  });
}

async function writeConfig() {
  await fs.writeFile(
    path.join(dist, 'js', 'app-config.js'),
    `window.DAILYBARS_CONFIG = ${JSON.stringify(env, null, 2)};\n`
  );
}

async function writeIndex() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#000000">
  <meta name="description" content="Write bars daily. Stay creative. Oakland energy meets brutalist design.">
  <meta name="author" content="GUAPDAD 4000">
  <title>DAILY RAPS | GUAPDAD 4000</title>
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="images/icon-180.png">
  <link rel="icon" href="images/icon-32.png" type="image/png">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <script src="vendor/vendor.js"></script>
  <script src="js/app-config.js"></script>
   <script src="js/revenuecat.js"></script>
</head>
<body>
  <div id="root"></div>
  <script src="js/daily-deposit-engine.js"></script>
  <script src="js/visualizer.js"></script>
  <script src="js/ui-components.js"></script>
  <script src="js/app.js"></script>
  <script src="js/scratch-lab.js"></script>
  <script src="js/app-views.js"></script>
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('service-worker.js?v=77', { updateViaCache: 'none' });
          registration.update();
          if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } catch (error) {
          console.warn('Service Worker registration skipped:', error);
        }
      });
    }
  </script>
</body>
</html>
`;
  await fs.writeFile(path.join(dist, 'index.html'), html);
}

await fs.rm(dist, { recursive: true, force: true });
await fs.rm(temp, { recursive: true, force: true });
await fs.mkdir(path.join(dist, 'js'), { recursive: true });
await fs.mkdir(path.join(dist, 'vendor'), { recursive: true });

for (const item of ['css', 'images', 'manifest.json', 'privacy.html', '_headers', '_redirects', 'service-worker.js']) {
  await copyIfExists(item);
}

await writeVendor();
await writeConfig();
await fs.copyFile(path.join(root, 'js', 'revenuecat.js'), path.join(dist, 'js', 'revenuecat.js'));

for (const file of ['daily-deposit-engine.js', 'visualizer.js', 'ui-components.js', 'app.js', 'scratch-lab.js', 'app-views.js']) {
  await transformScript(file);
}

await writeIndex();
await fs.rm(temp, { recursive: true, force: true });
console.log('Daily Raps production build ready: dist');
