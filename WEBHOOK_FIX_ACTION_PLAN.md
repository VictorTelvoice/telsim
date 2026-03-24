# Webhook Fix - Action Plan

## What Was Done

I've enhanced the webhook system to diagnose and fix the data-saving issues:

### 1. **Enhanced Webhook Logging** ✅
- Added detailed logging at each step of the webhook processing
- Now logs the isAnnual flag, billing_type calculations, and amount values
- Added error logging for database insertion failures
- Improved slot lookup error handling (now uses `.maybeSingle()` instead of `.single()`)

### 2. **Created Diagnostic Endpoints** ✅
- **`GET /api/diagnostics`** - View the last 20 subscriptions in your database
- **`POST /api/diagnostics`** - Simulate webhook processing to test if the system works

### 3. **Updated Files**
- `api/webhooks/stripe.ts` - Enhanced logging and error handling
- `api/diagnostics/subscriptions.ts` - New endpoint (NEW FILE)
- `api/diagnostics/webhook-test.ts` - New endpoint (NEW FILE)
- `WEBHOOK_DIAGNOSTIC_GUIDE.md` - Complete testing guide

## Next Steps (CRITICAL - DO THESE NOW)

### Step 1: Deploy to Vercel
The diagnostic endpoints and improvements are committed but need to be deployed:

```bash
git push origin main
```

Go to Vercel and verify deployment is complete. The code should now be live.

### Step 2: Test if data was already saved
Visit this URL in your browser:
```
https://telsim.io/api/diagnostics
```

**Look for:**
- Your Power annual plan at $990
- billing_type should be "annual" (not "monthly")
- Created timestamp should match your purchase time

If you see it there, **the webhook is actually working!** The issue might be just a display problem in the Dashboard UI.

### Step 3: If you DON'T see the subscription
Test the webhook system with the diagnostic endpoint:

Open Postman or use this cURL command:
```bash
curl -X POST https://telsim.io/api/diagnostics \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-actual-user-id",
    "slotId": "slot-001",
    "planName": "Power",
    "isAnnual": true
  }'
```

**Replace:**
- `your-actual-user-id` with your actual user ID
- `slot-001` with an actual slot ID that exists in your database

**Expected response if it works:**
```json
{
  "success": true,
  "message": "Test webhook payload processed successfully",
  "data": {
    "subscription": {
      "id": "...",
      "plan_name": "Power",
      "amount": 990,
      "billing_type": "annual"
    }
  }
}
```

**If you get an error:**
- "Slot not found" → The slot_id doesn't exist. Check your slots table.
- "Failed to insert subscription" → Database permission issue. Check Supabase settings.
- "Missing required fields" → You didn't provide userId, slotId, or planName.

### Step 4: Check Vercel Logs
In Vercel dashboard:
1. Go to your Telsim project
2. Deployments → Latest deployment
3. Function Logs → api/webhooks/stripe
4. Look for `[WEBHOOK DEBUG]` and `[WEBHOOK INSERT]` messages

**What you should see for a successful webhook:**
```
[WEBHOOK INIT] sessionId: cs_..., userId: ..., slotId: ..., planName: Power, isAnnual: true, isAnnualBilling: true
[WEBHOOK DEBUG] planName: Power, isAnnual: true, isAnnualBilling: true, amount: 99, correctAmount: 990
[WEBHOOK INSERT] Attempting to insert subscription: {...}
[WEBHOOK INSERT SUCCESS] Subscription inserted successfully: [...]
```

**If you see an INSERT ERROR:**
The error message will tell you exactly what's wrong. For example:
- "Supabase insert error: relation subscriptions does not exist" → Table not created
- "Supabase insert error: permission denied" → Database permission issue
- "Supabase insert error: null value in column" → Missing required field

### Step 5: Verify the Full Flow
Once you confirm the diagnostics work:
1. Make a **new test purchase** with annual billing
2. After successful payment, visit `GET /api/diagnostics`
3. Your new subscription should appear with:
   - `"billing_type": "annual"`
   - `"amount": 990` (for Power)
   - `"status": "active"`

## Troubleshooting Reference

| Issue | Cause | Solution |
|-------|-------|----------|
| `GET /api/diagnostics` returns 404 | Code not deployed to Vercel | Run `git push origin main` and wait for deployment |
| Webhook test returns "Slot not found" | Invalid slotId | Check existing slots in your database |
| Webhook test returns database error | Permissions or schema issue | Check Supabase credentials and subscriptions table exists |
| Subscription shows wrong amount | isAnnual flag not passed | Verify Payment.tsx passes `isAnnual: isAnnual` |
| Subscription shows monthly price for annual | Webhook not using isAnnual | Check webhook logs for `[WEBHOOK DEBUG]` message |

## Key Insights

### What Should Happen:
1. User selects Power annual plan ($990)
2. Payment.tsx passes `isAnnual: true` to checkout
3. Stripe metadata includes `isAnnual: 'true'`
4. Webhook reads `isAnnual === 'true'`
5. Webhook calculates: `correctAmount = 990` (annual price)
6. Webhook saves with `billing_type: 'annual'` and `amount: 990`

### Your Current Issue:
The webhook likely:
- ✅ Receives the event
- ✅ Parses the metadata
- ? Inserts the data (this is what we're testing with diagnostic endpoints)

The enhanced logging will show us exactly where it's failing.

## Files to Reference

- **WEBHOOK_DIAGNOSTIC_GUIDE.md** - Full diagnostic guide with examples
- **api/webhooks/stripe.ts** - The webhook with enhanced logging
- **api/diagnostics/subscriptions.ts** - View subscriptions endpoint
- **api/diagnostics/webhook-test.ts** - Test webhook processing

## Quick Summary

1. ✅ Deploy: `git push origin main`
2. ✅ Test: Visit `https://telsim.io/api/diagnostics`
3. ✅ Check: If your Power $990 subscription is there, webhook works!
4. ✅ If not: POST to `/api/diagnostics` to identify the issue
5. ✅ Log: Check Vercel logs for `[WEBHOOK]` messages to see what's happening

The diagnostic tools will show us exactly where the problem is so we can fix it permanently.
