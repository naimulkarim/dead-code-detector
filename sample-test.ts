// ============================================================
// SAMPLE FILE — use this to test Dead Code Detector
// Run: Dead Code: Analyze Current File on this file
// ============================================================

// 🚩 OBSOLETE FEATURE FLAGS
const FEATURE_DARK_MODE = false;        // never turns on
const USE_NEW_CHECKOUT = true;          // always on — condition below is pointless
const ENABLE_BETA_SEARCH = false;

function renderUI() {
  if (FEATURE_DARK_MODE) {
    // 🚫 UNREACHABLE — flag is always false
    applyDarkTheme();
    loadDarkAssets();
  }

  if (USE_NEW_CHECKOUT) {
    showNewCheckout();
  } else {
    // 🚫 UNREACHABLE — USE_NEW_CHECKOUT is always true
    showLegacyCheckout();
    trackLegacyCheckoutEvent();
  }
}

// 🚫 UNREACHABLE LOGIC — return before code
function calculateDiscount(price: number, userType: string): number {
  if (userType === "admin") {
    return price * 0;
  }
  return price * 0.9;

  // Dead code below — never reached
  const bonus = price * 0.05;
  console.log("Applying bonus:", bonus);
  return price - bonus;
}

// 🔌 UNUSED API — exported but never referenced
export function legacyFormatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export class OldReportGenerator {
  generate(data: any[]) {
    return data.map((d) => JSON.stringify(d)).join("\n");
  }
  exportToCsv(data: any[]) {
    return data.join(",");
  }
}

// Active code below (should NOT be flagged)
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function showNewCheckout() { console.log("new checkout"); }
function showLegacyCheckout() { console.log("legacy checkout"); }
function applyDarkTheme() { console.log("dark"); }
function loadDarkAssets() { console.log("assets"); }
function trackLegacyCheckoutEvent() { console.log("tracking"); }
