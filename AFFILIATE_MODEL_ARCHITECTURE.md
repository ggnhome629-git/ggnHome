# ggnHome Affiliate Cashback System - Model Architecture

## Overview
This document describes the database models created for the affiliate cashback system (Real Estate CashKaro model) in ggnHome.

---

## 1. **AffiliatePlatform.model.js**
Stores configuration for each affiliate platform (No Broker, 99acres, Housing.com, etc.)

### Purpose
- Manage affiliate platforms and their settings
- Store API credentials and commission rates
- Track platform performance metrics

### Key Fields
```javascript
{
  name: 'nobroker',              // Platform identifier
  displayName: 'No Broker',
  affiliateId: 'YOUR_ID',        // Your affiliate ID with the platform
  commissionPercentage: 12,      // 12% commission from platform
  userCashbackPercentage: 1.5,   // 1.5% cashback to user
  payoutFrequency: 'monthly',
  status: 'active',
  metrics: {
    totalLinks,
    totalClicks,
    totalConversions,
    totalEarnings
  }
}
```

### Use Cases
- Admin configures which affiliate platforms to use
- Store platform API keys and credentials securely
- Track earnings from each platform
- Enable/disable platforms dynamically

---

## 2. **AffiliateLink.model.js**
Stores affiliate links for each property across all platforms

### Purpose
- Maintain affiliate links for properties
- Track performance (clicks, conversions) per platform
- Store earning statistics per property

### Key Fields
```javascript
{
  propertyId: ObjectId,          // Reference to RentalProperty/SaleProperty
  propertyType: 'rental',        // rental or sale
  affiliateLinks: {
    noBroker: { url, affiliateId, enabled },
    nineNineAcres: { url, affiliateId, enabled },
    housingCom: { url, affiliateId, enabled },
    magicbricks: { url, affiliateId, enabled }
  },
  clickStats: {
    noBroker: 150,              // Clicks on No Broker link
    nineNineAcres: 200          // Clicks on 99acres link
  },
  conversionStats: {
    noBroker: 5,               // Completed bookings
    nineNineAcres: 8
  },
  earningsStats: {
    noBroker: 25000,           // Total earnings from No Broker
    nineNineAcres: 32000       // Total earnings from 99acres
  }
}
```

### Use Cases
- Store multiple affiliate links for each property
- Track which platform generates best conversions
- Calculate per-property ROI
- Optimize link placement based on performance

---

## 3. **AffiliateTracking.model.js**
Tracks individual user clicks and conversions

### Purpose
- Record each click on affiliate link
- Track conversion journey from click to completion
- Calculate cashback and commissions
- Verify transactions

### Key Fields
```javascript
{
  trackingId: 'TRK_12345',        // Unique tracking ID (URL parameter)
  userId: ObjectId,              // User who clicked
  propertyId: ObjectId,
  source: 'nobroker',            // Which platform link was clicked
  affiliateLink: 'https://...',
  status: 'completed',           // clicked → viewed → pending → completed
  clickedAt: Date,
  completedAt: Date,
  propertyAmount: 500000,        // ₹5L property
  commissionPercentage: 12,
  cashbackPercentage: 1.5,
  userCashback: 7500,           // ₹7,500 to user (1.5% of ₹5L)
  ggnHomeCommission: 60000,     // ₹60,000 to ggnHome (12% of ₹5L)
  conversionDetails: {
    bookingId: 'BOOK_123',
    verificationStatus: 'verified',
    verifiedAt: Date
  }
}
```

### Use Cases
- Generate unique tracking ID for each affiliate link
- Add tracking ID to affiliate URL: `nobroker.in/p/123?ref=TRK_12345`
- Record when user clicks link
- Record when user completes transaction
- Calculate cashback automatically

---

## 4. **UserWallet.model.js**
Stores user's cashback balance and transaction history

### Purpose
- Maintain user's cashback wallet
- Track total earned, spent, and withdrawn
- Link to all cashback transactions

### Key Fields
```javascript
{
  userId: ObjectId,              // Reference to User model
  balance: 5000,                 // Current available cashback
  totalEarned: 25000,            // Total lifetime earnings
  totalSpent: 5000,              // Total used for bookings
  totalWithdrawn: 15000,         // Total withdrawn to bank
  pendingCashback: 2500,         // Awaiting verification
  transactions: [ObjectId],      // References to CashbackTransaction
  withdrawalDetails: {
    bankAccount: '1234567890',
    ifscCode: 'HDFC0001234',
    accountHolder: 'John Doe'
  }
}
```

### Use Cases
- Show user their cashback balance
- Display transaction history
- Enable cashback withdrawal
- Use cashback for future bookings
- Track wallet statistics

---

## 5. **CashbackTransaction.model.js**
Records each cashback transaction (earned, spent, withdrawn)

### Purpose
- Maintain detailed transaction ledger
- Audit trail for all wallet activities
- Reconciliation and reporting

### Key Fields
```javascript
{
  transactionId: 'TXN_12345',
  userId: ObjectId,
  walletId: ObjectId,
  type: 'earned',               // earned/spent/withdrawn/refunded
  amount: 7500,                 // ₹7,500
  balanceAfter: 12500,          // Balance after transaction
  affiliateTrackingId: ObjectId, // Which affiliate tracking caused this
  status: 'completed',          // pending/completed/failed
  reason: 'affiliate_commission',
  description: '2BHK in Sector 57 - Booking completed',
  details: {
    propertyId: ObjectId,
    propertyName: '2BHK in Gurgaon',
    platform: 'nobroker',
    bookingReference: 'BOOK_123'
  },
  createdAt: Date,
  processedAt: Date
}
```

### Use Cases
- Show detailed transaction history to user
- Audit all wallet changes
- Generate monthly statements
- Reconcile with platform payouts
- Track source of each cashback

---

## 6. **Withdrawal.model.js**
Manages cashback withdrawal requests to user's bank account

### Purpose
- Process user withdrawal requests
- Track bank transfer status
- Maintain withdrawal history

### Key Fields
```javascript
{
  withdrawalId: 'WTH_12345',
  userId: ObjectId,
  walletId: ObjectId,
  amount: 10000,                // ₹10,000 withdrawal
  status: 'completed',          // pending/processing/completed/failed
  bankAccount: {
    accountNumber: '1234567890',
    accountHolder: 'John Doe',
    ifscCode: 'HDFC0001234',
    bankName: 'HDFC Bank'
  },
  utr: 'HDFC123456789',        // Transaction reference from bank
  verified: true,
  processedAt: Date,
  requestedAt: Date,
  notes: 'Bank transfer successful'
}
```

### Use Cases
- User requests withdrawal from wallet
- Admin processes withdrawal
- Track bank transfer status
- Maintain withdrawal history
- Handle failed transfers with retry

---

## 7. **Modified User.model.js**
Enhanced existing User model with affiliate data (Optional enhancement)

### Suggested Additions
```javascript
{
  // ... existing fields ...
  affiliateStats: {
    totalEarned: 25000,
    totalTransactions: 15,
    lastEarningDate: Date
  },
  walletId: ObjectId,  // Reference to UserWallet
  hasVerifiedBankAccount: Boolean
}
```

---

## Model Relationships

```
AffiliatePlatform (1)
    ↓
    └── N:1 (via 'source' field)

AffiliateLink (1)
    ├── propertyId → RentalProperty/SaleProperty
    └── Tracks performance metrics per platform

AffiliateTracking (1..N)
    ├── userId → User
    ├── propertyId → Property
    ├── source → AffiliatePlatform
    └── Creates CashbackTransaction when completed

UserWallet (1..1)
    ├── userId → User (1:1)
    └── transactions → CashbackTransaction[] (1:N)

CashbackTransaction (1..N)
    ├── userId → User
    ├── walletId → UserWallet
    ├── affiliateTrackingId → AffiliateTracking
    └── recordedBy → System/Admin

Withdrawal (1..N)
    ├── userId → User
    ├── walletId → UserWallet
    └── Each represents a bank payout
```

---

## Data Flow Example

### Scenario: User books property via affiliate link

**Step 1: User Clicks Link**
```
1. Generate Tracking ID: TRK_ABC123
2. Create AffiliateTracking record
   - status: 'clicked'
   - clickedAt: Now
3. Redirect to: https://nobroker.in/p/12345?ref=TRK_ABC123
```

**Step 2: User Views Property**
```
1. Update AffiliateTracking
   - status: 'viewed'
   - viewedAt: Now
2. Track impressions, engagement
```

**Step 3: User Completes Booking**
```
1. Update AffiliateTracking
   - status: 'pending'
   - propertyAmount: 500000
2. Wait for verification from No Broker
```

**Step 4: Transaction Verified**
```
1. Update AffiliateTracking
   - status: 'completed'
   - completedAt: Now
   - Calculate cashback:
     * userCashback = 500000 * 1.5% = 7500
     * ggnHomeCommission = 500000 * 12% = 60000
```

**Step 5: Credit Cashback to User**
```
1. Create CashbackTransaction
   - type: 'earned'
   - amount: 7500
   - reason: 'affiliate_commission'
   - affiliateTrackingId: TRK_ABC123

2. Update UserWallet
   - balance += 7500
   - totalEarned += 7500

3. Send notification to user
   - "₹7,500 cashback credited to your wallet!"
```

**Step 6: User Withdraws Cashback**
```
1. Create Withdrawal record
   - amount: 7500
   - status: 'processing'
   - bankAccount details

2. Update UserWallet
   - balance -= 7500
   - totalWithdrawn += 7500

3. Create CashbackTransaction
   - type: 'withdrawn'
   - amount: 7500
   - withdrawalId: WTH_XYZ789

4. Process bank transfer
   - Update Withdrawal status: 'completed'
   - Add UTR (transaction reference)
```

---

## Implementation Checklist

- [x] **Models Created:**
  - [x] AffiliatePlatform.model.js
  - [x] AffiliateLink.model.js
  - [x] AffiliateTracking.model.js
  - [x] UserWallet.model.js
  - [x] CashbackTransaction.model.js
  - [x] Withdrawal.model.js

- [ ] **Next Steps:**
  - [ ] Create API controllers for each model
  - [ ] Create routes for affiliate operations
  - [ ] Build admin dashboard for managing affiliates
  - [ ] Create user dashboard for viewing cashback
  - [ ] Implement click tracking logic
  - [ ] Implement conversion verification logic
  - [ ] Create withdrawal request handling
  - [ ] Add notification system
  - [ ] Create analytics/reporting endpoints
  - [ ] Set up automated verification from platforms
  - [ ] Create admin tools for managing platforms
  - [ ] Implement referral bonus system

---

## Database Indexes

All models include optimized indexes for performance:

```javascript
// AffiliateTracking
- trackingId (unique)
- userId + createdAt (user's tracking history)
- source + status (platform-specific queries)
- clickedAt (for reporting)

// AffiliateLink
- propertyId (find links for property)
- status (active links only)

// UserWallet
- userId (one per user)

// CashbackTransaction
- userId + createdAt (user's transaction history)
- type + status (filter by transaction type)
- createdAt (time-based reports)

// Withdrawal
- userId + createdAt (user's withdrawal history)
- status (pending withdrawals)
```

---

## Security Considerations

1. **API Keys & Credentials:**
   - AffiliatePlatform.affiliateId → kept secret
   - AffiliatePlatform.apiKey → selected: false

2. **Bank Details:**
   - Withdrawal.bankAccount → should be encrypted
   - Verify user owns bank account before processing

3. **Tracking ID Verification:**
   - Validate tracking ID format
   - Verify user matches when processing conversion

4. **Commission Calculation:**
   - Use decimal arithmetic, not floating point
   - Verify amounts match affiliate platform's records

5. **Audit Trail:**
   - Log all wallet modifications
   - Track who made admin changes
   - Keep transaction history immutable

---

## Performance Notes

- All frequently queried fields have indexes
- Use pagination for transaction history
- Cache platform configuration in memory
- Batch process conversions for verification
- Archive old tracking records (>90 days)

---

## Next Phase: Controllers & Routes

After models are confirmed, create:
1. `/controllers/affiliate.controller.js`
2. `/controllers/wallet.controller.js`
3. `/controllers/withdrawal.controller.js`
4. `/routes/affiliate.routes.js`
5. `/routes/wallet.routes.js`

These will handle the business logic for affiliate tracking, cashback calculations, and withdrawals.
