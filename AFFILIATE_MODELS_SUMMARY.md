# Quick Reference: Affiliate Models

## All 6 New Models Created ✅

| Model | Purpose | Main Fields | Storage |
|-------|---------|-------------|---------|
| **AffiliatePlatform** | Configure affiliate platforms | name, affiliateId, commissionRate, cashbackRate | Platform settings (admin only) |
| **AffiliateLink** | Store affiliate links per property | propertyId, affiliateLinks{}, clickStats{}, conversionStats{} | Links for each property |
| **AffiliateTracking** | Track individual clicks & conversions | trackingId, userId, source, status, userCashback, ggnHomeCommission | Click/conversion records |
| **UserWallet** | Store user's cashback balance | userId, balance, totalEarned, totalWithdrawn, pendingCashback | User's money account |
| **CashbackTransaction** | Record all wallet activities | transactionId, userId, type (earned/spent/withdrawn), amount | Transaction ledger |
| **Withdrawal** | Manage bank withdrawals | withdrawalId, userId, amount, bankAccount, status, utr | Payout requests |

---

## Quick Data Storage Guide

### 1. **Where do we store affiliate platform configs?**
→ **AffiliatePlatform.model.js**
```javascript
{
  name: 'nobroker',
  affiliateId: 'YOUR_ID',
  commissionPercentage: 12,
  userCashbackPercentage: 1.5,
  status: 'active'
}
```

### 2. **Where do we store links for properties?**
→ **AffiliateLink.model.js**
```javascript
{
  propertyId: ObjectId,
  affiliateLinks: {
    nobroker: { url: '...', enabled: true },
    nineNineAcres: { url: '...', enabled: true }
  },
  clickStats: { noBroker: 150, nineNineAcres: 200 }
}
```

### 3. **Where do we track user clicks?**
→ **AffiliateTracking.model.js**
```javascript
{
  trackingId: 'TRK_ABC123',
  userId: ObjectId,
  propertyId: ObjectId,
  source: 'nobroker',
  status: 'completed',
  userCashback: 7500,
  ggnHomeCommission: 60000
}
```

### 4. **Where do we store user's cashback balance?**
→ **UserWallet.model.js**
```javascript
{
  userId: ObjectId,
  balance: 5000,           // Current balance
  totalEarned: 25000,      // Lifetime earnings
  totalWithdrawn: 15000    // Total withdrawn
}
```

### 5. **Where do we log each cashback transaction?**
→ **CashbackTransaction.model.js**
```javascript
{
  transactionId: 'TXN_123',
  userId: ObjectId,
  type: 'earned',          // earned, spent, withdrawn
  amount: 7500,
  reason: 'affiliate_commission'
}
```

### 6. **Where do we store withdrawal requests?**
→ **Withdrawal.model.js**
```javascript
{
  withdrawalId: 'WTH_123',
  userId: ObjectId,
  amount: 10000,
  bankAccount: { ... },
  status: 'completed',
  utr: 'HDFC123456789'
}
```

---

## Field Recommendations

### For RentalProperty & SaleProperty Models
```javascript
// Optional: Add these fields
affiliateLinkId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'AffiliateLink'
},
hasAffiliateLinks: Boolean,
lastAffiliateSync: Date
```

### For User Model
```javascript
// Optional: Add these fields
walletId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'UserWallet'
},
totalCashbackEarned: {
  type: Number,
  default: 0
}
```

---

## Common Queries

```javascript
// 1. Get all affiliate links for a property
AffiliateLink.findOne({ propertyId: propertyId })

// 2. Get user's tracking history
AffiliateTracking.find({ userId: userId }).sort({ clickedAt: -1 })

// 3. Get user's wallet balance
UserWallet.findOne({ userId: userId })

// 4. Get user's transactions
CashbackTransaction.find({ userId: userId }).sort({ createdAt: -1 })

// 5. Get pending withdrawals for admin
Withdrawal.find({ status: 'pending' }).sort({ requestedAt: 1 })

// 6. Get platform performance
AffiliatePlatform.findOne({ name: 'nobroker' }).select('+metrics')

// 7. Calculate total earnings for a platform
AffiliateTracking.aggregate([
  { $match: { source: 'nobroker', status: 'completed' } },
  { $group: { _id: null, total: { $sum: '$ggnHomeCommission' } } }
])

// 8. Get user's pending cashback (not yet withdrawn)
UserWallet.findOne({ userId: userId }).select('balance')

// 9. Get withdrawal history for a user
Withdrawal.find({ userId: userId }).sort({ requestedAt: -1 })

// 10. Get total conversions from a property
AffiliateTracking.countDocuments({ 
  propertyId: propertyId, 
  status: 'completed' 
})
```

---

## Implementation Order

### Phase 1: Database Layer ✅
- [x] Create all 6 models
- [ ] Add indexes for performance
- [ ] Test model creation

### Phase 2: Core Controllers (Next)
- [ ] `affiliate.controller.js` - Handle clicks, conversions
- [ ] `wallet.controller.js` - Balance, transactions, history
- [ ] `withdrawal.controller.js` - Process withdrawals

### Phase 3: API Routes
- [ ] POST `/api/affiliate/track-click` - Record click
- [ ] POST `/api/affiliate/verify-conversion` - Verify booking
- [ ] GET `/api/wallet/balance` - Get user's balance
- [ ] GET `/api/wallet/transactions` - Get history
- [ ] POST `/api/withdrawal/request` - Request withdrawal
- [ ] GET `/api/withdrawal/status/:id` - Check status

### Phase 4: Admin Features
- [ ] Manage affiliate platforms
- [ ] View all transactions
- [ ] Process withdrawals
- [ ] Analytics dashboard

### Phase 5: User Features
- [ ] Show cashback in user dashboard
- [ ] Transaction history view
- [ ] Withdrawal request form
- [ ] Notifications on earnings

---

## Example: Complete Flow

**User Books Property via Affiliate Link**

```
1. Property Listed
   └─ Create AffiliateLink record for property
      └─ Generate links for all 5 platforms
         └─ TRK_ABC123 → nobroker link
            TRK_ABC124 → 99acres link, etc.

2. User Clicks Link
   └─ Clicks: https://ggnhome.com/property/123?platform=nobroker
      └─ Generate Tracking ID: TRK_ABC123
         └─ Redirect to: https://nobroker.in/p/12345?ref=TRK_ABC123
            └─ Create AffiliateTracking record
               - userId: User123
               - status: 'clicked'

3. User Completes Booking
   └─ No Broker sends verification to our webhook
      └─ Verify booking amount: ₹500,000
         └─ Calculate cashback: 500,000 × 1.5% = ₹7,500
            └─ Calculate commission: 500,000 × 12% = ₹60,000
               └─ Update AffiliateTracking
                  - status: 'completed'
                  - userCashback: 7500
                  - ggnHomeCommission: 60000

4. Credit Cashback to User
   └─ Create UserWallet if not exists
      └─ Update UserWallet
         - balance += 7500
         - totalEarned += 7500
            └─ Create CashbackTransaction
               - type: 'earned'
               - amount: 7500
               - reason: 'affiliate_commission'
                  └─ Send notification to user
                     "₹7,500 cashback earned! 🎉"

5. User Withdraws Cashback (Optional)
   └─ User requests withdrawal: ₹5,000
      └─ Create Withdrawal record
         - status: 'pending'
         └─ Admin reviews
            └─ Process bank transfer
               └─ Update Withdrawal
                  - status: 'completed'
                  - utr: 'HDFC123456789'
                     └─ Create CashbackTransaction
                        - type: 'withdrawn'
                        - amount: 5000
                           └─ Update UserWallet
                              - balance -= 5000
                              - totalWithdrawn += 5000
                                 └─ Notify user
                                    "₹5,000 withdrawn to your bank account"
```

---

## File Locations

```
server/models/
├── AffiliatePlatform.model.js  ✅ Created
├── AffiliateLink.model.js      ✅ Created
├── AffiliateTracking.model.js  ✅ Created
├── UserWallet.model.js         ✅ Created
├── CashbackTransaction.model.js ✅ Created
├── Withdrawal.model.js         ✅ Created
│
├── Rentalproperty.model.js     (Existing)
├── SaleProperty.model.js       (Existing)
├── user.model.js               (Existing)
├── Payment.model.js            (Existing)
├── Agent.model.js              (Existing)
└── ...other models...
```

---

## Summary

**Total Models Created: 6** ✅

These models form the backbone of the **ggnHome Real Estate CashKaro** system:

1. **AffiliatePlatform** → Manage which platforms we work with
2. **AffiliateLink** → Store links for each property
3. **AffiliateTracking** → Track each click & conversion
4. **UserWallet** → User's cashback account
5. **CashbackTransaction** → Transaction ledger
6. **Withdrawal** → Bank payout management

**Next Step:** Create controllers and routes to use these models! 🚀
