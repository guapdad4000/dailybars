// RevenueCat helpers for Daily Raps.
// Uses native Capacitor Purchases on mobile and the Web SDK where available.
(function attachRevenueCat(window) {
    const config = window.DAILYBARS_CONFIG?.revenueCat || {};
    const PRO_ENTITLEMENT = config.entitlementId || 'daily raps Pro';
    const DEFAULT_OFFERING = config.offeringId || 'dailybars_pro';

    let configuredUserId = null;
    let currentCustomerInfo = null;
    let purchasesInstance = null;
    let configured = false;
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

    const platform = () => window.Capacitor?.getPlatform?.() || 'web';

    const apiKeyForPlatform = () => {
        const current = platform();
        if (current === 'ios') return config.iosApiKey || '';
        if (current === 'android') return config.androidApiKey || '';
        return config.webApiKey || '';
    };

    const isPurchaseConfigured = () => Boolean(apiKeyForPlatform());

    const nativePurchases = () => window.CapacitorPurchases || null;

    const getPurchasesClass = () => {
        if (!window.Purchases) return null;
        if (window.Purchases.Purchases && typeof window.Purchases.Purchases.configure === 'function') {
            return window.Purchases.Purchases;
        }
        if (typeof window.Purchases.configure === 'function') return window.Purchases;
        return null;
    };

    const unavailable = () => {
        if (!apiKeyForPlatform()) {
            console.warn('RevenueCat API key not configured for this platform.');
        }
        return null;
    };

    const configurationError = () => {
        if (!apiKeyForPlatform()) {
            return `RevenueCat is not configured for ${platform()}.`;
        }
        return 'RevenueCat could not be initialized for this platform.';
    };

    const offeringForConfig = (offerings) => {
        const namedOffering = offerings?.all?.[DEFAULT_OFFERING];
        if (namedOffering) return namedOffering;

        const currentOffering = offerings?.current;
        const currentIdentifier = currentOffering?.identifier ||
            currentOffering?.offeringIdentifier ||
            currentOffering?.id;
        return currentIdentifier === DEFAULT_OFFERING ? currentOffering : null;
    };

    const ensurePurchaseReady = async (appUserId) => {
        await ensureConfigured(appUserId);
        if (!configured) throw new Error(configurationError());
    };

    const configureNative = async (appUserId, apiKey) => {
        const plugin = nativePurchases();
        if (!plugin?.configure) return null;
        await plugin.configure({ apiKey, appUserID: appUserId ? String(appUserId) : undefined });
        configuredUserId = appUserId || null;
        configured = true;
        currentCustomerInfo = await getCustomerInfo();
        return currentCustomerInfo;
    };

    const configureWeb = async (appUserId, apiKey) => {
        const Purchases = getPurchasesClass();
        if (!Purchases?.configure) return null;
        if (typeof Purchases.setLogLevel === 'function') Purchases.setLogLevel('warn');
        const userId = appUserId ? String(appUserId) : Purchases.generateRevenueCatAnonymousAppUserId?.() || 'anonymous';
        purchasesInstance = Purchases.configure({ apiKey, appUserId: userId });
        configuredUserId = appUserId || null;
        configured = true;
        currentCustomerInfo = await purchasesInstance?.getCustomerInfo?.();
        notify();
        return currentCustomerInfo;
    };

    const configure = async (appUserId) => {
        const apiKey = apiKeyForPlatform();
        if (!apiKey) return unavailable();

        try {
            if (platform() !== 'web') {
                const nativeInfo = await configureNative(appUserId, apiKey);
                if (nativeInfo) return nativeInfo;
            }
            return configureWeb(appUserId, apiKey);
        } catch (err) {
            console.error('RevenueCat configure failed', err);
            return null;
        }
    };

    const ensureConfigured = async (appUserId) => {
        if (!configured) return configure(appUserId);
        if (appUserId && configuredUserId !== appUserId) return configure(appUserId);
        return currentCustomerInfo || getCustomerInfo();
    };

    async function getCustomerInfo() {
        try {
            if (platform() !== 'web' && nativePurchases()?.getCustomerInfo) {
                const result = await nativePurchases().getCustomerInfo();
                currentCustomerInfo = result?.customerInfo || result || null;
                notify();
                return currentCustomerInfo;
            }

            if (!purchasesInstance) {
                const Purchases = getPurchasesClass();
                purchasesInstance = Purchases?.getSharedInstance?.();
            }
            if (purchasesInstance?.getCustomerInfo) {
                currentCustomerInfo = await purchasesInstance.getCustomerInfo();
                notify();
            }
            return currentCustomerInfo;
        } catch (err) {
            console.error('RevenueCat getCustomerInfo failed', err);
            return currentCustomerInfo;
        }
    }

    const hasPro = (info = currentCustomerInfo) => Boolean(info?.entitlements?.active?.[PRO_ENTITLEMENT]);

    const getOfferings = async () => {
        await ensureConfigured(configuredUserId);
        try {
            if (platform() !== 'web' && nativePurchases()?.getOfferings) {
                const offerings = await nativePurchases().getOfferings();
                return offeringForConfig(offerings);
            }
            const offerings = await purchasesInstance?.getOfferings?.();
            return offeringForConfig(offerings);
        } catch (err) {
            console.error('RevenueCat getOfferings failed', err);
            return null;
        }
    };

    const purchasePackage = async (pkg) => {
        await ensurePurchaseReady(configuredUserId);
        try {
            let result = null;
            if (platform() !== 'web' && nativePurchases()?.purchasePackage) {
                result = await nativePurchases().purchasePackage({ aPackage: pkg, package: pkg });
                currentCustomerInfo = result?.customerInfo || null;
            } else if (purchasesInstance?.purchasePackage) {
                result = await purchasesInstance.purchasePackage(pkg);
                currentCustomerInfo = result?.customerInfo || result || null;
            }
            notify();
            return currentCustomerInfo;
        } catch (err) {
            if (err?.userCancelled || err?.cancelled) return null;
            throw err;
        }
    };

    const restorePurchases = async () => {
        await ensurePurchaseReady(configuredUserId);
        try {
            if (platform() !== 'web' && nativePurchases()?.restorePurchases) {
                const result = await nativePurchases().restorePurchases();
                currentCustomerInfo = result?.customerInfo || result || null;
            } else if (purchasesInstance?.restorePurchases) {
                currentCustomerInfo = await purchasesInstance.restorePurchases();
            }
            notify();
            return currentCustomerInfo;
        } catch (err) {
            console.error('RevenueCat restorePurchases failed', err);
            return null;
        }
    };

    const presentCustomerCenter = async (mode = 'manage-subscriptions') => {
        await ensurePurchaseReady(configuredUserId);
        if (platform() !== 'web' && nativePurchases()?.presentCustomerCenter) {
            return nativePurchases().presentCustomerCenter({ mode });
        }
        return purchasesInstance?.presentCustomerCenter?.({ mode }) || null;
    };

    const showPaywall = async (opts = {}) => {
        await ensurePurchaseReady(opts.appUserID || configuredUserId);
        if (platform() !== 'web' && nativePurchases()?.presentPaywall) {
            return nativePurchases().presentPaywall({ offeringIdentifier: opts.offeringIdentifier || DEFAULT_OFFERING });
        }
        if (purchasesInstance?.presentPaywall) {
            return purchasesInstance.presentPaywall({ offeringIdentifier: opts.offeringIdentifier || DEFAULT_OFFERING });
        }
        const offering = opts.offering || await getOfferings();
        if (!offering) {
            throw new Error(`RevenueCat offering "${DEFAULT_OFFERING}" is not available for ${platform()}.`);
        }
        const pkg = opts.packageToPurchase || offering.availablePackages?.[0];
        if (!pkg) {
            throw new Error(`RevenueCat offering "${DEFAULT_OFFERING}" has no purchasable package for ${platform()}.`);
        }
        return purchasePackage(pkg);
    };

    const addCustomerInfoListener = (cb) => {
        listeners.add(cb);
        return () => listeners.delete(cb);
    };

    window.RevenueCat = {
        PRO_ENTITLEMENT,
        DEFAULT_OFFERING,
        configure,
        ensureConfigured,
        getCustomerInfo,
        getOfferings,
        isPurchaseConfigured,
        hasPro,
        purchasePackage,
        restorePurchases,
        presentCustomerCenter,
        showPaywall,
        addCustomerInfoListener
    };
})(window);
