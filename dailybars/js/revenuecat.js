// RevenueCat Web SDK integration helpers for Daily Raps
// Loads against the global Purchases SDK (UMD) and exposes a small helper API.
(function attachRevenueCat(window) {
    const API_KEY = 'test_jNdhQHLICLEbpZWbOOgbTkLQTlQ';
    const PRO_ENTITLEMENT = 'daily raps Pro';

    let configuredUserId = null;
    let currentCustomerInfo = null;
    let hasConfigured = false;
    const listeners = new Set();

    const notify = () => {
        listeners.forEach((cb) => {
            try {
                cb(currentCustomerInfo);
            } catch (err) {
                console.error('RevenueCat listener error', err);
            }
        });
    };

    const sdk = () => {
        if (!window.Purchases) {
            throw new Error('RevenueCat Purchases SDK not loaded');
        }
        return window.Purchases;
    };

    const ensureLogLevel = () => {
        try {
            sdk().setLogLevel('info');
        } catch (err) {
            console.warn('RevenueCat log level not set', err);
        }
    };

    const configure = async (appUserId) => {
        ensureLogLevel();
        const config = { apiKey: API_KEY };
        if (appUserId) config.appUserID = String(appUserId);
        await sdk().configure(config);
        configuredUserId = appUserId || null;
        hasConfigured = true;
        currentCustomerInfo = await sdk().getCustomerInfo();
        notify();
        return currentCustomerInfo;
    };

    const ensureConfigured = async (appUserId) => {
        if (!hasConfigured) return configure(appUserId);
        if (appUserId && configuredUserId !== appUserId) {
            try {
                const result = await sdk().logIn(String(appUserId));
                currentCustomerInfo = result.customerInfo;
                configuredUserId = appUserId;
                notify();
                return currentCustomerInfo;
            } catch (err) {
                console.warn('RevenueCat logIn failed, reconfiguring', err);
                return configure(appUserId);
            }
        }
        if (!currentCustomerInfo) {
            currentCustomerInfo = await sdk().getCustomerInfo();
            notify();
        }
        return currentCustomerInfo;
    };

    const getCustomerInfo = async () => {
        currentCustomerInfo = await sdk().getCustomerInfo();
        notify();
        return currentCustomerInfo;
    };

    const hasPro = (info = currentCustomerInfo) => Boolean(info?.entitlements?.active?.[PRO_ENTITLEMENT]);

    const getOfferings = async () => {
        await ensureConfigured(configuredUserId);
        const offerings = await sdk().getOfferings();
        return offerings?.current ?? null;
    };

    const purchasePackage = async (pkg) => {
        await ensureConfigured(configuredUserId);
        try {
            const { customerInfo } = await sdk().purchasePackage(pkg);
            currentCustomerInfo = customerInfo;
            notify();
            return customerInfo;
        } catch (err) {
            if (err?.userCancelled) return null;
            throw err;
        }
    };

    const restorePurchases = async () => {
        await ensureConfigured(configuredUserId);
        const info = await sdk().restorePurchases();
        currentCustomerInfo = info;
        notify();
        return info;
    };

    const presentCustomerCenter = async (mode = 'manage-subscriptions') => {
        await ensureConfigured(configuredUserId);
        if (typeof sdk().presentCustomerCenter !== 'function') {
            throw new Error('Customer Center is not available in this SDK version');
        }
        return sdk().presentCustomerCenter({ mode });
    };

    const showPaywall = async (opts = {}) => {
        await ensureConfigured(opts.appUserID || configuredUserId);
        const rc = sdk();

        if (typeof rc.presentPaywall === 'function') {
            const { controller } = await rc.presentPaywall({
                offeringIdentifier: opts.offeringIdentifier,
            });
            if (controller) {
                controller.onPurchaseCompleted(async () => {
                    await getCustomerInfo();
                });
                controller.onRestoreCompleted?.(async () => {
                    await getCustomerInfo();
                });
                controller.onPurchaseError?.((err) => console.warn('RevenueCat paywall purchase error', err));
            }
            return controller;
        }

        const offering = opts.offering || (await getOfferings());
        const pkg = opts.packageToPurchase || offering?.availablePackages?.[0];
        if (!pkg) throw new Error('No packages available to purchase');
        return purchasePackage(pkg);
    };

    const addCustomerInfoListener = (cb) => {
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
        addCustomerInfoListener,
    };
})(window);
