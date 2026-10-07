# ✅ ggnHome Affiliate Cashback System - MODELS COMPLETE

## Status: Database Layer ✅ DONE

All 6 models successfully created and documented!

---

## What We've Accomplished

### ✅ Models Created (6/6)
```
1. ✅ AffiliatePlatform.model.js     - Store platform configs
2. ✅ AffiliateLink.model.js         - Store affiliate links per property
3. ✅ AffiliateTracking.model.js     - Track clicks & conversions
4. ✅ UserWallet.model.js            - Store user's cashback balance
5. ✅ CashbackTransaction.model.js   - Record all transactions
6. ✅ Withdrawal.model.js            - Manage bank withdrawals
```

### ✅ Documentation Created (3/3)
```
1. ✅ AFFILIATE_MODEL_ARCHITECTURE.md - Deep dive into each model
2. ✅ AFFILIATE_MODELS_SUMMARY.md     - Quick reference guide
3. ✅ MODEL_USAGE_GUIDE.md            - When to use which model
```

---

## Model Overview

```
┌─────────────────────────────────────────────────────────────┐
│         ggnHome Affiliate Cashback System Models            │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Admin Side                                               │
├──────────────────────────────────────────────────────────┤
│ AffiliatePlatform                                        │
│ ├─ Configure No Broker (12% commission)                │
│ ├─ Configure 99acres (10% commission)                  │
│ ├─ Configure Housing.com (10% commission)              │
│ └─ Configure others (Magicbricks, Sulekha)             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Property Side                                            │
├──────────────────────────────────────────────────────────┤
│ AffiliateLink                                            │
│ ├─ Links for each property                              │
│ ├─ Track clicks per platform                            │
│ ├─ Track conversions per platform                       │
│ └─ Calculate earnings per property                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ User Click Journey                                       │
├──────────────────────────────────────────────────────────┤
│ User clicks link → AffiliateTracking records it        │
│ ├─ Generate Tracking ID (TRK_ABC123)                   │
│ ├─ Record click timestamp                               │
│ ├─ Store platform source                                │
│ └─ Redirect to affiliate link                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ User Conversion & Cashback                               │
├──────────────────────────────────────────────────────────┤
│ Booking completed → AffiliateTracking updates          │
│ ├─ Mark as completed                                    │
│ ├─ Calculate cashback: amount × 1.5%                   │
│ └─ Create CashbackTransaction                           │
│    └─ Add to UserWallet balance                         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ User Wallet Management                                   │
├──────────────────────────────────────────────────────────┤
│ UserWallet                                               │
│ ├─ Current balance: ₹5,000                              │
│ ├─ Total earned: ₹25,000                                │
│ ├─ Total withdrawn: ₹15,000                             │
│ └─ Pending cashback: ₹2,500                             │
│    └─ View history in CashbackTransaction              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ User Withdrawal                                          │
├──────────────────────────────────────────────────────────┤
│ User requests withdrawal → Withdrawal model              │
│ ├─ Amount: ₹10,000                                      │
│ ├─ Bank account: HDFC 1234567890                        │
│ ├─ Status: pending → processing → completed            │
│ └─ Track UTR: HDFC123456789                             │
│    └─ Update UserWallet & CashbackTransaction          │
└──────────────────────────────────────────────────────────┘
```

---

## File Locations

```
/home/user/ggnHome/
├── server/
│   ├── models/
│   │   ├── AffiliatePlatform.model.js      ✅
│   │   ├── AffiliateLink.model.js          ✅
│   │   ├── AffiliateTracking.model.js      ✅
│   │   ├── UserWallet.model.js             ✅
│   │   ├── CashbackTransaction.model.js    ✅
│   │   ├── Withdrawal.model.js             ✅
│   │   ├── Rentalproperty.model.js         (existing)
│   │   ├── SaleProperty.model.js           (existing)
│   │   └── user.model.js                   (existing)
│   ├── controllers/                        (NEXT STEP)
│   └── routes/                             (NEXT STEP)
│
├── AFFILIATE_MODEL_ARCHITECTURE.md         ✅
├── AFFILIATE_MODELS_SUMMARY.md             ✅
├── MODEL_USAGE_GUIDE.md                    ✅
└── AFFILIATE_SYSTEM_COMPLETE.md            ✅ (this file)
```

---

## Data Flow Example

```
Property Listed on ggnHome
    ↓
Generate AffiliateLink records for all 5 platforms
    ├─ No Broker link: nobroker.in/p/12345?ref=TRK_ABC123
    ├─ 99acres link:   99acres.com/p/12345?ref=TRK_ABC124
    └─ [3 more platforms]
    ↓
User searches property on ggnHome
    ↓
User sees property with "View on No Broker" button
    ↓
User clicks button
    ↓
Create AffiliateTracking record
    ├─ trackingId: TRK_ABC123
    ├─ userId: user_456
    ├─ propertyId: prop_123
    ├─ source: nobroker
    └─ status: clicked
    ↓
Update AffiliateLink click stats
    └─ clickStats.noBroker: 150 → 151
    ↓
Redirect to No Broker with tracking ID
    ↓
[User completes booking on No Broker]
    ↓
No Broker sends webhook to ggnHome
    "Booking completed! Tracking ID: TRK_ABC123"
    ↓
Update AffiliateTracking
    ├─ status: clicked → completed
    ├─ completedAt: Now
    ├─ propertyAmount: 500000
    ├─ userCashback: 7500 (1.5% of 500000)
    └─ ggnHomeCommission: 60000 (12% of 500000)
    ↓
Create UserWallet (if not exists)
    └─ userId: user_456
    ↓
Create CashbackTransaction
    ├─ transactionId: TXN_ABC123
    ├─ type: earned
    ├─ amount: 7500
    └─ reason: affiliate_commission
    ↓
Update UserWallet
    ├─ balance: 0 → 7500
    ├─ totalEarned: 0 → 7500
    └─ transactions: [TXN_ABC123]
    ↓
Update AffiliateLink
    ├─ conversionStats.noBroker: 5 → 6
    ├─ earningsStats.noBroker: 25000 → 32500
    └─ totalEarnings: 25000 → 32500
    ↓
Send notification to user
    "🎉 ₹7,500 cashback credited to your wallet!"
    ↓
User sees ₹7,500 in wallet
    ├─ Can view transaction history
    ├─ Can use for future bookings
    └─ Can withdraw to bank
```

---

## Next Steps: Controllers & Routes

### Phase 2: API Layer (Coming Next)

**Controllers to Create:**
```
1. AffiliateController
   ├─ POST /affiliate/track-click
   ├─ POST /affiliate/verify-conversion
   ├─ GET /affiliate/links/:propertyId
   └─ GET /affiliate/stats

2. WalletController
   ├─ GET /wallet/balance
   ├─ GET /wallet/transactions
   ├─ GET /wallet/stats
   └─ POST /wallet/use-cashback

3. WithdrawalController
   ├─ POST /withdrawal/request
   ├─ GET /withdrawal/status/:id
   ├─ GET /withdrawal/history
   └─ (Admin) PATCH /withdrawal/:id/process

4. AdminController
   ├─ POST /admin/platforms (add platforms)
   ├─ PUT /admin/platforms/:id (update)
   ├─ GET /admin/analytics (earnings reports)
   └─ GET /admin/withdrawals/pending
```

**Routes to Create:**
```
/api/affiliate/          - User affiliate tracking
/api/wallet/             - User wallet management
/api/withdrawal/         - User withdrawal requests
/api/admin/affiliate/    - Admin affiliate management
/api/admin/analytics/    - Admin earnings reports
```

---

## Database Queries You'll Need

```javascript
// 1. Create affiliate link when property is listed
AffiliateLink.create({
  propertyId, propertyType,
  affiliateLinks: { nobroker: {}, 99acres: {}, ... }
})

// 2. Track a click
AffiliateTracking.create({
  trackingId, userId, propertyId, source, ...
})

// 3. Update to completed when booking done
AffiliateTracking.updateOne(
  { trackingId },
  { status: 'completed', userCashback, ggnHomeCommission }
)

// 4. Create/update wallet
UserWallet.updateOne(
  { userId },
  { $inc: { balance: userCashback, totalEarned: userCashback } }
)

// 5. Record transaction
CashbackTransaction.create({
  transactionId, userId, type: 'earned', amount, ...
})

// 6. Process withdrawal
Withdrawal.updateOne(
  { withdrawalId },
  { status: 'completed', utr, processedAt }
)

// 7. Get user's balance
UserWallet.findOne({ userId })

// 8. Get user's transactions
CashbackTransaction.find({ userId }).sort({ createdAt: -1 })

// 9. Get platform earnings
AffiliateTracking.aggregate([...])

// 10. Get pending withdrawals
Withdrawal.find({ status: 'pending' })
```

---

## Performance & Indexing

All models include indexes on:
- ✅ Primary lookup fields (userId, propertyId, trackingId)
- ✅ Status fields (for filtering)
- ✅ Date fields (for reporting)
- ✅ Compound indexes (userId + date for user history)

---

## Security Features Built-In

✅ API keys use `select: false` (not returned by default)
✅ Encrypted field support (for bank details)
✅ Audit trail (createdBy, updatedBy fields)
✅ Transaction immutability (CashbackTransaction)
✅ Status validation (enums prevent invalid states)
✅ Unique constraints (trackingId, transactionId, withdrawalId)

---

## Ready for Phase 2?

### What You Have Now:
- ✅ 6 Complete MongoDB models
- ✅ Proper schema design
- ✅ Indexed queries
- ✅ Security best practices
- ✅ Complete documentation

### What You Need Next:
- 🔄 Controllers (business logic)
- 🔄 Routes (API endpoints)
- 🔄 Middleware (authentication, validation)
- 🔄 Webhooks (from affiliate platforms)
- 🔄 Notifications (email/SMS/push)
- 🔄 Admin dashboard
- 🔄 User dashboard
- 🔄 Analytics reports

---

## Recommended Next Actions

1. **Test Models** (5 min)
   ```bash
   npm test -- --testMatch="**/models/**"
   ```

2. **Create Controllers** (1-2 hours)
   - Start with AffiliateController
   - Handle click tracking logic
   - Calculate cashback

3. **Create Routes** (1 hour)
   - Set up Express routes
   - Add middleware
   - Test with Postman

4. **Implement Webhooks** (2-3 hours)
   - Receive callbacks from No Broker
   - Verify conversions
   - Credit cashback

5. **Build Dashboards** (Ongoing)
   - User wallet view
   - User transaction history
   - Admin analytics

---

## Summary

**✅ MISSION ACCOMPLISHED!**

You now have a complete, production-ready database schema for the "**Real Estate CashKaro**" affiliate cashback system!

**6 Models | 3 Documentation Files | Ready for Implementation**

---

## Questions?

Refer to:
- **AFFILIATE_MODEL_ARCHITECTURE.md** - For detailed model info
- **AFFILIATE_MODELS_SUMMARY.md** - For quick reference
- **MODEL_USAGE_GUIDE.md** - For usage examples

**Ready to build Phase 2? Let's create the controllers!** 🚀
