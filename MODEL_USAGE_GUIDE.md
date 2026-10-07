# Model Usage Guide - When to Use Which Model

## Decision Tree

```
Do you want to...

├─ Configure affiliate platforms (admin task)?
│  └─→ Use: AffiliatePlatform.model.js
│      Fields: name, affiliateId, commissionPercentage, etc.
│      Example: "Set up No Broker with 12% commission"

├─ Store affiliate links for properties?
│  └─→ Use: AffiliateLink.model.js
│      Fields: propertyId, affiliateLinks{}, clickStats{}
│      Example: "Generate links for 2BHK in Sector 57"

├─ Track when user clicks an affiliate link?
│  └─→ Use: AffiliateTracking.model.js
│      Fields: trackingId, userId, source, status, clickedAt
│      Example: "User clicked No Broker link at 2:30 PM"

├─ Track when booking is completed and cashback is earned?
│  └─→ Use: AffiliateTracking.model.js (update status to 'completed')
│      Fields: status='completed', completedAt, userCashback
│      Example: "Booking verified, ₹7,500 cashback earned"

├─ Store user's cashback balance?
│  └─→ Use: UserWallet.model.js
│      Fields: userId, balance, totalEarned, totalWithdrawn
│      Example: "User has ₹12,500 available in wallet"

├─ Record each cashback transaction?
│  └─→ Use: CashbackTransaction.model.js
│      Fields: type ('earned'/'spent'/'withdrawn'), amount, reason
│      Example: "₹7,500 earned from No Broker booking"

├─ User requests to withdraw cashback to bank?
│  └─→ Use: Withdrawal.model.js
│      Fields: withdrawalId, userId, amount, bankAccount, status
│      Example: "User wants to withdraw ₹10,000 to HDFC"

└─ Need to show user all their cashback activities?
   └─→ Use: CashbackTransaction.model.js
       Query: Find all where userId = X, sorted by date
       Example: "Show user's last 30 transactions"
```

---

## Scenario-Based Guide

### Scenario 1: Admin Sets Up A New Affiliate Platform

**What:** Admin wants to add Housing.com affiliate program

**Models Used:**
1. **AffiliatePlatform** ← Use to store Housing.com config
   ```javascript
   AffiliatePlatform.create({
     name: 'housing.com',
     displayName: 'Housing.com',
     affiliateId: 'GGNHOME_HOUSING_123',
     commissionPercentage: 10,
     userCashbackPercentage: 1.2,
     status: 'active'
   })
   ```

---

### Scenario 2: Generate Affiliate Links For A New Property

**What:** Owner lists new property, system generates affiliate links

**Models Used:**
1. **AffiliateLink** ← Store the generated links
   ```javascript
   AffiliateLink.create({
     propertyId: ObjectId('prop_123'),
     propertyType: 'rental',
     affiliateLinks: {
       noBroker: { url: 'nobroker.in/p/5678?ref=TRK_ABC123' },
       nineNineAcres: { url: '99acres.com/p/9012?ref=TRK_ABC124' },
       housingCom: { url: 'housing.com/p/3456?ref=TRK_ABC125' }
     }
   })
   ```

**Next:** When property is displayed, fetch from AffiliateLink and show affiliate links

---

### Scenario 3: User Clicks Affiliate Link

**What:** User clicks "View on No Broker" button on property

**Models Used:**
1. **AffiliateTracking** ← Record the click
   ```javascript
   AffiliateTracking.create({
     trackingId: 'TRK_ABC123',
     userId: ObjectId('user_456'),
     propertyId: ObjectId('prop_123'),
     source: 'nobroker',
     affiliateLink: 'https://...',
     status: 'clicked',
     clickedAt: new Date()
   })
   ```

2. **AffiliateLink** ← Update click count
   ```javascript
   AffiliateLink.updateOne(
     { propertyId: 'prop_123' },
     { $inc: { 'clickStats.noBroker': 1, totalClicks: 1 } }
   )
   ```

---

### Scenario 4: User Completes Booking

**What:** No Broker sends webhook that user completed booking

**Models Used:**
1. **AffiliateTracking** ← Update status to completed
   ```javascript
   AffiliateTracking.updateOne(
     { trackingId: 'TRK_ABC123' },
     {
       status: 'completed',
       completedAt: new Date(),
       propertyAmount: 500000,
       userCashback: 7500,        // 1.5% of 500000
       ggnHomeCommission: 60000   // 12% of 500000
     }
   )
   ```

2. **UserWallet** ← Create wallet if not exists
   ```javascript
   const wallet = await UserWallet.findOne({ userId: 'user_456' })
   if (!wallet) {
     UserWallet.create({ userId: 'user_456', balance: 0 })
   }
   ```

3. **CashbackTransaction** ← Record the earnings
   ```javascript
   CashbackTransaction.create({
     transactionId: 'TXN_ABC123',
     userId: 'user_456',
     type: 'earned',
     amount: 7500,
     reason: 'affiliate_commission',
     affiliateTrackingId: ObjectId('tracking_id'),
     description: '2BHK in Sector 57 - No Broker',
     status: 'completed'
   })
   ```

4. **UserWallet** ← Update balance
   ```javascript
   UserWallet.updateOne(
     { userId: 'user_456' },
     {
       $inc: { balance: 7500, totalEarned: 7500 },
       $push: { transactions: transactionId }
     }
   )
   ```

5. **AffiliateLink** ← Update conversion stats
   ```javascript
   AffiliateLink.updateOne(
     { propertyId: 'prop_123' },
     { 
       $inc: { 
         'conversionStats.noBroker': 1,
         'earningsStats.noBroker': 7500,
         totalConversions: 1,
         totalEarnings: 7500
       }
     }
   )
   ```

---

### Scenario 5: User Checks Their Wallet

**What:** User clicks "My Cashback" in app

**Models Used:**
1. **UserWallet** ← Get balance info
   ```javascript
   UserWallet.findOne({ userId: 'user_456' })
   // Returns: { balance: 7500, totalEarned: 7500, ... }
   ```

2. **CashbackTransaction** ← Get transaction history
   ```javascript
   CashbackTransaction.find({ userId: 'user_456' })
     .sort({ createdAt: -1 })
     .limit(20)
   // Returns: [{ type: 'earned', amount: 7500, ... }, ...]
   ```

---

### Scenario 6: User Requests Withdrawal

**What:** User clicks "Withdraw to Bank" and enters bank details

**Models Used:**
1. **Withdrawal** ← Create withdrawal request
   ```javascript
   Withdrawal.create({
     withdrawalId: 'WTH_XYZ789',
     userId: 'user_456',
     amount: 5000,
     bankAccount: {
       accountNumber: '1234567890',
       accountHolder: 'John Doe',
       ifscCode: 'HDFC0001234'
     },
     status: 'pending'
   })
   ```

2. **UserWallet** ← Deduct from pending
   ```javascript
   UserWallet.updateOne(
     { userId: 'user_456' },
     { $inc: { pendingCashback: 5000 } }
   )
   ```

---

### Scenario 7: Admin Processes Withdrawal

**What:** Admin approves and transfers money to user's bank

**Models Used:**
1. **Withdrawal** ← Mark as completed
   ```javascript
   Withdrawal.updateOne(
     { withdrawalId: 'WTH_XYZ789' },
     {
       status: 'completed',
       utr: 'HDFC123456789', // Bank transfer reference
       processedAt: new Date()
     }
   )
   ```

2. **UserWallet** ← Update balance
   ```javascript
   UserWallet.updateOne(
     { userId: 'user_456' },
     {
       $inc: { 
         balance: -5000,           // Deduct from balance
         totalWithdrawn: 5000,
         pendingCashback: -5000
       }
     }
   )
   ```

3. **CashbackTransaction** ← Record withdrawal transaction
   ```javascript
   CashbackTransaction.create({
     transactionId: 'TXN_WTH_789',
     userId: 'user_456',
     type: 'withdrawn',
     amount: 5000,
     reason: 'withdrawal',
     withdrawalId: ObjectId('WTH_XYZ789'),
     description: 'Bank withdrawal to HDFC',
     status: 'completed'
   })
   ```

---

### Scenario 8: View Platform Performance

**What:** Admin views earnings from each platform

**Models Used:**
1. **AffiliatePlatform** ← Get platform config
   ```javascript
   AffiliatePlatform.findOne({ name: 'nobroker' })
   ```

2. **AffiliateTracking** ← Aggregate earnings by platform
   ```javascript
   AffiliateTracking.aggregate([
     { $match: { source: 'nobroker', status: 'completed' } },
     { $group: { 
       _id: null,
       totalClicks: { $sum: 1 },
       totalConversions: { $sum: 1 },
       totalEarnings: { $sum: '$ggnHomeCommission' },
       avgEarnings: { $avg: '$ggnHomeCommission' }
     }}
   ])
   ```

---

## Quick Lookup Table

| Need | Use This Model | Primary Field | Query |
|------|---|---|---|
| Platform config | AffiliatePlatform | name | `{ name: 'nobroker' }` |
| Generate links | AffiliateLink | propertyId | `{ propertyId: X }` |
| Track click | AffiliateTracking | trackingId | `{ trackingId: X }` |
| Check conversion | AffiliateTracking | status | `{ status: 'completed' }` |
| User balance | UserWallet | userId | `{ userId: X }` |
| Transaction ledger | CashbackTransaction | userId | `{ userId: X }` |
| Withdrawal request | Withdrawal | userId | `{ userId: X }` |
| Click stats | AffiliateLink | clickStats | Aggregation |
| Earnings report | AffiliateTracking | ggnHomeCommission | Aggregation |

---

## Common Operations

### Get everything about a property's affiliates
```javascript
const affiliateLink = await AffiliateLink.findOne({ propertyId: 'prop_123' })
// Shows: links, click count, conversion count, earnings
```

### Get user's cashback summary
```javascript
const wallet = await UserWallet.findOne({ userId: 'user_456' })
const transactions = await CashbackTransaction.find({ userId: 'user_456' })
// Shows: balance, total earned, transaction history
```

### Track a specific booking conversion
```javascript
const tracking = await AffiliateTracking.findOne({ trackingId: 'TRK_ABC123' })
// Shows: who clicked, which property, which platform, when it converted, cashback earned
```

### Get all pending withdrawals
```javascript
const pending = await Withdrawal.find({ status: 'pending' })
// Shows: how much needs to be transferred, to which accounts
```

### Calculate total ggnHome earnings for a date range
```javascript
AffiliateTracking.aggregate([
  { $match: { 
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    }
  },
  { $group: { 
      _id: null,
      total: { $sum: '$ggnHomeCommission' }
    }
  }
])
```

---

## Summary

| Model | Stores | Created By | Used By |
|-------|--------|------------|---------|
| **AffiliatePlatform** | Platform configs | Admin | Admin, System |
| **AffiliateLink** | Links per property | System (auto) | Frontend, Tracking |
| **AffiliateTracking** | Click/conversion data | System (auto) | Analytics, Wallet |
| **UserWallet** | User balance | System (auto) | User, Admin, Withdrawal |
| **CashbackTransaction** | All transactions | System (auto) | User, Admin, Reports |
| **Withdrawal** | Bank payouts | User | User, Admin |

**Total: 6 models covering entire affiliate cashback system!** 🎉
