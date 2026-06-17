"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderText = renderText;
function renderText(data) {
    return `Your gift subscription is ending soon

Your gift subscription to ${data.siteTitle} ends on ${data.gift.consumesAt}. Continue with a paid subscription to keep reading.

Gift subscription: ${data.gift.tierName}
Ends on: ${data.gift.consumesAt}
Price after gift ends: ${data.gift.priceAfter}

Continue subscription:
${data.gift.manageSubscriptionUrl}

---

Sent to ${data.memberEmail} from ${data.siteDomain}.
You received this email because your gift subscription to ${data.siteTitle} is ending soon.`;
}
