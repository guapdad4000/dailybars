(function () {
// RevenueCat Web SDK integration helpers for Daily Raps
// Loads against the global Purchases SDK (UMD) and exposes a small helper API.
// Updated for @revenuecat/purchases-js v1.23+ 
// NOTE: UMD builds from CDN expose Purchases.Purchases (nested) while npm builds use Purchases directly
(function attachRevenueCat(window) {
  const API_KEY = 'test_jNdhQHLICLEbpZWbOOgbTkLQTlQ';
  const PRO_ENTITLEMENT = 'daily raps Pro';
  let configuredUserId = null;
  let currentCustomerInfo = null;
  let hasConfigured = false;
  let purchasesInstance = null;
  const listeners = new Set();
  const notify = () => {
    listeners.forEach(cb => {
      try {
        cb(currentCustomerInfo);
      } catch (err) {
        console.error('RevenueCat listener error', err);
      }
    });
  };

  // Get the Purchases class - handles both UMD (Purchases.Purchases) and ESM (Purchases) builds
  const getPurchasesClass = () => {
    if (!window.Purchases) {
      throw new Error('RevenueCat Purchases SDK not loaded');
    }
    // UMD build from CDN exposes it as window.Purchases.Purchases
    // ESM/npm build exposes it as window.Purchases directly
    if (window.Purchases.Purchases && typeof window.Purchases.Purchases.configure === 'function') {
      return window.Purchases.Purchases;
    }
    // Fallback to direct access (for ESM builds or if structure changes)
    if (typeof window.Purchases.configure === 'function') {
      return window.Purchases;
    }
    // Neither pattern worked
    throw new Error('RevenueCat Purchases SDK structure not recognized');
  };

  // Get the shared instance after configuration
  const getInstance = () => {
    if (!purchasesInstance) {
      try {
        const Purchases = getPurchasesClass();
        if (Purchases.isConfigured && Purchases.isConfigured()) {
          purchasesInstance = Purchases.getSharedInstance();
        }
      } catch (err) {
        // Silently fail - SDK may not be configured yet
      }
    }
    return purchasesInstance;
  };
  const ensureLogLevel = () => {
    try {
      const Purchases = getPurchasesClass();
      // setLogLevel is a static method on the Purchases class
      if (typeof Purchases.setLogLevel === 'function') {
        Purchases.setLogLevel('info');
      }
    } catch (err) {
      // Log level setting is optional, don't warn if it fails
    }
  };
  const configure = async appUserId => {
    try {
      const Purchases = getPurchasesClass();
      ensureLogLevel();

      // configure takes a config object in newer SDK versions:
      // Purchases.configure({ apiKey: '...', appUserId: '...' })
      const userId = appUserId ? String(appUserId) : Purchases.generateRevenueCatAnonymousAppUserId?.() || 'anonymous';
      if (typeof Purchases.configure === 'function') {
        purchasesInstance = Purchases.configure({
          apiKey: API_KEY,
          appUserId: userId
        });
        configuredUserId = appUserId || null;
        hasConfigured = true;

        // Get customer info from the instance
        if (purchasesInstance && typeof purchasesInstance.getCustomerInfo === 'function') {
          currentCustomerInfo = await purchasesInstance.getCustomerInfo();
          notify();
        }
        return currentCustomerInfo;
      } else {
        throw new Error('Purchases.configure is not a function');
      }
    } catch (err) {
      console.error('RevenueCat init failed', err);
      // Return null but don't break the app
      hasConfigured = true; // Mark as "configured" to prevent retry loops
      return null;
    }
  };
  const ensureConfigured = async appUserId => {
    try {
      if (!hasConfigured) return configure(appUserId);
      const instance = getInstance();
      if (!instance) return configure(appUserId);
      if (appUserId && configuredUserId !== appUserId) {
        // changeUser is an instance method in newer SDK versions
        if (typeof instance.changeUser === 'function') {
          try {
            currentCustomerInfo = await instance.changeUser(String(appUserId));
            configuredUserId = appUserId;
            notify();
            return currentCustomerInfo;
          } catch (err) {
            console.warn('RevenueCat changeUser failed, reconfiguring', err);
            return configure(appUserId);
          }
        } else {
          // Fallback: reconfigure
          return configure(appUserId);
        }
      }
      if (!currentCustomerInfo && instance) {
        currentCustomerInfo = await instance.getCustomerInfo();
        notify();
      }
      return currentCustomerInfo;
    } catch (err) {
      console.error('RevenueCat ensureConfigured failed', err);
      return null;
    }
  };
  const getCustomerInfo = async () => {
    try {
      const instance = getInstance();
      if (instance && typeof instance.getCustomerInfo === 'function') {
        currentCustomerInfo = await instance.getCustomerInfo();
        notify();
      }
      return currentCustomerInfo;
    } catch (err) {
      console.error('RevenueCat getCustomerInfo failed', err);
      return null;
    }
  };
  const hasPro = (info = currentCustomerInfo) => Boolean(info?.entitlements?.active?.[PRO_ENTITLEMENT]);
  const getOfferings = async () => {
    try {
      await ensureConfigured(configuredUserId);
      const instance = getInstance();
      if (instance && typeof instance.getOfferings === 'function') {
        const offerings = await instance.getOfferings();
        return offerings?.current ?? null;
      }
      return null;
    } catch (err) {
      console.error('RevenueCat getOfferings failed', err);
      return null;
    }
  };
  const purchasePackage = async pkg => {
    try {
      await ensureConfigured(configuredUserId);
      const instance = getInstance();
      if (instance && typeof instance.purchasePackage === 'function') {
        const {
          customerInfo
        } = await instance.purchasePackage(pkg);
        currentCustomerInfo = customerInfo;
        notify();
        return customerInfo;
      }
      return null;
    } catch (err) {
      if (err?.userCancelled) return null;
      throw err;
    }
  };
  const restorePurchases = async () => {
    try {
      await ensureConfigured(configuredUserId);
      const instance = getInstance();
      // Note: Web SDK may not have restorePurchases - handle gracefully
      if (instance && typeof instance.restorePurchases === 'function') {
        const info = await instance.restorePurchases();
        currentCustomerInfo = info;
        notify();
        return info;
      }
      console.warn('RevenueCat restorePurchases not available in Web SDK');
      return currentCustomerInfo;
    } catch (err) {
      console.error('RevenueCat restorePurchases failed', err);
      return null;
    }
  };
  const presentCustomerCenter = async (mode = 'manage-subscriptions') => {
    try {
      await ensureConfigured(configuredUserId);
      const instance = getInstance();
      if (instance && typeof instance.presentCustomerCenter === 'function') {
        return instance.presentCustomerCenter({
          mode
        });
      }
      console.warn('Customer Center is not available in this SDK version');
      return null;
    } catch (err) {
      console.error('RevenueCat presentCustomerCenter failed', err);
      return null;
    }
  };
  const showPaywall = async (opts = {}) => {
    try {
      await ensureConfigured(opts.appUserID || configuredUserId);
      const instance = getInstance();
      if (instance && typeof instance.presentPaywall === 'function') {
        const {
          controller
        } = await instance.presentPaywall({
          offeringIdentifier: opts.offeringIdentifier
        });
        if (controller) {
          controller.onPurchaseCompleted(async () => {
            await getCustomerInfo();
          });
          controller.onRestoreCompleted?.(async () => {
            await getCustomerInfo();
          });
          controller.onPurchaseError?.(err => console.warn('RevenueCat paywall purchase error', err));
        }
        return controller;
      }
      const offering = opts.offering || (await getOfferings());
      const pkg = opts.packageToPurchase || offering?.availablePackages?.[0];
      if (!pkg) {
        console.warn('No packages available to purchase');
        return null;
      }
      return purchasePackage(pkg);
    } catch (err) {
      console.error('RevenueCat showPaywall failed', err);
      return null;
    }
  };
  const addCustomerInfoListener = cb => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  window.RevenueCat = {
    PRO_ENTITLEMENT,
    configure,
    ensureConfigured,
    getCustomerInfo,
    getOfferings,
    hasPro,
    purchasePackage,
    restorePurchases,
    presentCustomerCenter,
    showPaywall,
    addCustomerInfoListener
  };
})(window);
})();
