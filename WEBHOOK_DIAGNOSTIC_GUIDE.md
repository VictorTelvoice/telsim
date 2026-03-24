# Stripe Webhook Diagnostic Guide

## Problem Summary
The Stripe webhook for `checkout.session.completed` is returning 404 errors on first attempt, then succeeding with 200 OK on retry, but subscription data may not be saved to the Supabase database.

## New Diagnostic Endpoints

### 1. **View Recent Subscriptions**
**Endpoint:** `GET /api/diagnostics`

Shows the last 20 subscriptions created, including:
- Plan name
- Amount charged
- Billing type (annual/monthly)
- Subscription status
- Creation timestamp

**Use this to:**
- Verify if your Power annual plan purchase ($990) was saved
- Check billing_type is "annual" not "monthly"
- See the amount that was actually saved

**Example URL:**
```
https://telsim.io/api/diagnostics
```

**Expected Response:**
```json
{
  "message": "Recent subscriptions from database",
  "stats": {
    "total_in_recent_20": 5,
    "annual": 2,
    "monthly": 3,
    "active": 4
  },
  "subscriptions": [
    {
      "id": "xxx",
      "plan_name": "Power",
      "amount": 990,
      "billing_type": "annual",
      "status": "active",
      "created_at": "2026-03-05T...",
      ...
    }
  ]
}
```

### 2. **Test Webhook Processing**
**Endpoint:** `POST /api/diagnostics`

Simulates the webhook payload processing without requiring Stripe. Useful for testing if the database insertion logic works.

**Request Body:**
```json
{
  "userId": "your-user-id",
  "slotId": "test-slot-001",
  "planName": "Power",
  "isAnnual": true,
  "amount": 99000
}
```

**Use this to:**
- Test if the subscription insertion works at all
- Verify slot exists in your database
- Confirm billing_type and amount calculations are correct

**Steps to test:**
1. Replace `userId` with your actual user ID
2. Replace `slotId` with an actual slot ID from your database
3. Send POST request with this JSON body
4. Check the response for success or error details

**Example cURL:**
```bash
curl -X POST https://telsim.io/api/diagnostics \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000000",
    "slotId": "slot-001",
    "planName": "Power",
    "isAnnual": true
  }'
```

## Enhanced Webhook Logging

The webhook now logs detailed information at each step:

- `[WEBHOOK INIT]` - Initial webhook received with metadata
- `[WEBHOOK DEBUG]` - Plan details and amount calculations
- `[WEBHOOK INSERT]` - Data about to be inserted
- `[WEBHOOK INSERT SUCCESS]` - Successful database insertion
- `[WEBHOOK INSERT ERROR]` - Database insertion failure with details
- `[WEBHOOK ERROR]` - Any exceptions that occur

**Check these logs in Vercel's server logs:**
1. Go to https://vercel.com
2. Navigate to your Telsim project
3. Go to Deployments → Most recent deployment
4. Open Function Logs → api/webhooks/stripe
5. Look for `[WEBHOOK DEBUG]` and `[WEBHOOK INSERT]` messages

## Troubleshooting Steps

### If you see `[WEBHOOK INSERT ERROR]`:
The database insertion is failing. Check:
1. Is the `slotId` valid? (should exist in `slots` table)
2. Do you have permissions to insert into `subscriptions` table?
3. Are all required fields being provided?

### If webhook shows 404 error in Stripe dashboard:
The endpoint URL is not being found. Check:
1. Webhook URL in Stripe dashboard should be exactly: `https://telsim.io/api/webhooks/stripe`
2. Verify this is a live endpoint in Vercel (not localhost)
3. Check recent deployments - your code must be deployed to Vercel

### If subscription amount is wrong (e.g., $19.90 instead of $990):
The `isAnnual` flag is not being passed correctly. Check:
1. Payment.tsx is passing `isAnnual` to checkout session
2. Stripe metadata includes `isAnnual: 'true'` or `isAnnual: 'false'`
3. Webhook correctly reads `isAnnual === 'true'` to determine billing type

### If subscription data appears in diagnostics but not in Dashboard UI:
The data is being saved but the Dashboard isn't loading it correctly. Check:
1. WebDashboard query is filtering correctly
2. Check browser console for any JavaScript errors
3. Verify Supabase real-time subscriptions are working

## Testing the Complete Flow

**To manually test end-to-end:**

1. **Check if slot is available:**
   ```bash
   # Visit diagnostics endpoint - check the slot_id values
   https://telsim.io/api/diagnostics
   ```

2. **Test the webhook directly:**
   ```bash
   curl -X POST https://telsim.io/api/diagnostics \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "your-user-id",
       "slotId": "slot-id-that-exists",
       "planName": "Power",
       "isAnnual": true
     }'
   ```

3. **Verify subscription was created:**
   ```bash
   https://telsim.io/api/diagnostics
   ```

4. **Check Vercel logs for any errors:**
   - Vercel Dashboard → Your Project → Deployments → Most Recent
   - Click on Function Logs
   - Search for `[WEBHOOK]` logs

## Next Steps

1. **Deploy to Vercel:**
   ```bash
   git push origin main
   ```

2. **Run the diagnostics:**
   - Visit `GET /api/diagnostics` to see if your purchase was saved

3. **Test webhook with simulation:**
   - POST to `/api/diagnostics` to verify the system works

4. **Check Vercel logs:**
   - Look for `[WEBHOOK DEBUG]` and `[WEBHOOK INSERT SUCCESS]` messages
   - If you see INSERT ERROR, the error message will tell you what's wrong

5. **Report findings:**
   - Share the output from diagnostics endpoints
   - Share relevant log lines from Vercel
   - This will help identify the exact issue

## Key Files Modified

- **api/webhooks/stripe.ts** - Added detailed logging for debugging
- **api/diagnostics/subscriptions.ts** - New endpoint to view recent subscriptions
- **api/diagnostics/webhook-test.ts** - New endpoint to test webhook processing

## Support Info

If you're still having issues after running these diagnostics:
1. Visit `GET /api/diagnostics` and note the recent subscriptions (or lack thereof)
2. POST a test to `/api/diagnostics` and note any error messages
3. Check Vercel logs for `[WEBHOOK ERROR]` messages
4. Share this information to help debug the issue
