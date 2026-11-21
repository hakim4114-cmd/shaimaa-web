# Scenario review: money rules and product tests

Status of each real-life situation that can make the numbers wrong, checked against the code on 2026-11-21 (1.18.0). Run this list again before any change to money, stock, ads or reports, and add new situations as they show up.

Legend: **OK** handled by the app · **FIXED** gap found in this review and fixed · **RULE** the app cannot see it, a working habit covers it · **OPEN** known, not handled yet.

## Ads and campaigns

| # | Situation | What could go wrong | Status |
|---|---|---|---|
| A1 | Ad expense recorded without a campaign | It escapes the loss cap and the ad cost per product; the test looks better | **FIXED** 1.17.2: while a campaign runs, it needs a reason (`no_campaign`) and is listed under rules crossed |
| A2 | The ad platform charges the card late (billing threshold, end of month) | Spend not recorded for days: the test looks profitable while it loses, the cap fires late | **RULE**: record spend from Ads Manager every 2–3 days, not from the invoice. **FIXED** 1.17.2: the bell warns when a running campaign has no spend recorded for 3 days |
| A3 | Card charged in another currency, with bank fees | The amount in the app is lower than what left the account | **RULE**: record the amount debited by the bank, fees included |
| A4 | The platform refunds part of the spend | Expenses cannot be negative | **RULE**: delete the expense and record the net amount |
| A5 | A second campaign for the same product | The loss counter starts again at zero | **RULE**: one product = one campaign. Reports → products still adds the ads of every campaign of a product. **OPEN**: a cap per product needs campaigns linked to a product |
| A6 | A campaign ended, then the ads restarted | The ended campaign leaves the tests list 30 days after its end | **RULE**: end a campaign only when its ads are off for good |
| A7 | Ad budget in the first month | No last month to compare with | **OK**: the fixed amount applies |
| A8 | A profitable month followed by a big budget | Budget = 30 % of revenue only after a month profitable after ads | **OK** 1.17.0 |
| A9 | The app checks the cap on spend recorded every 2–3 days | The loss is seen late; spend can run past the cap meanwhile | **RULE**: set the limits in Meta itself: a lifetime budget per campaign equal to its loss cap, and an account spending limit equal to the monthly ad budget. Meta stops the spend; the app does the accounting |

## Orders and attribution

| # | Situation | What could go wrong | Status |
|---|---|---|---|
| B1 | An order that did not come from the ad, with one campaign running | It is linked to the campaign by default: the test looks better | **FIXED** 1.17.2: the form says to pick "no campaign" for such customers. **RULE**: ask the customer where they saw the product |
| B2 | An order cancelled before shipping | — | **OK**: no revenue, no carrier cost, not counted in the 20 orders |
| B3 | An order linked to the wrong campaign | — | **OK**: the campaign can be changed on the order |
| B4 | Store orders (Shopify, YouCan) | They arrive without a campaign: no ad cost per product | **OPEN** until the store is used; then link them by hand or by UTM |
| B5 | Exchange | — | **OK**: counted as delivered; both parcels' carrier costs are counted |
| B6 | A product sold without a cost | Its pieces count as free: margin and test results look too good | **FIXED** 1.17.2: the tests list shows how many lines have no cost. **RULE**: never sell a product without a cost |
| B7 | The customer keeps only part of the order | The app has no partial delivery | **OPEN**: record it as an exchange or edit the order before delivery |

## Delivery, refusals and returns

| # | Situation | What could go wrong | Status |
|---|---|---|---|
| C1 | Refused at the door | — | **OK**: carrier cost counted, no revenue, stock back after inspection |
| C2 | Returned after delivery | — | **OK**: revenue removed, carrier counted |
| C3 | A returned or refused piece comes back damaged or missing | Its cost was lost but not counted in the test | **FIXED** 1.17.2: counted in the campaign's result |
| C4 | Orders still on the way when the cap is reached | Ads are counted when paid, revenue only when delivered: "stop" can come too early | **FIXED** 1.17.1: "pause ads and wait" while the pending orders could bring it back (best case, carrier cost included since 1.17.2) |
| C5 | Sendit pays late or not at all | The money at the carrier counts in the business value | **FIXED** 1.17.2: the bell warns about orders delivered over 7 days ago and still not paid |
| C6 | The carrier invoice differs from the estimated fee | — | **OK**: Sendit invoices are recorded and reconciled on the cash page |

## Capital, cash and owner pay

| # | Situation | What could go wrong | Status |
|---|---|---|---|
| D1 | Rules set before the money arrives | — | **OK**: nothing is guarded until the opening balance and the start date are set (Pay page checklist) |
| D7 | Another amount of capital (3,000 or 300,000) | Fixed defaults (2,000 ads, 600 cap) fit only one amount | **FIXED** 1.18.0: reserve, ad budget and loss cap are shares of the capital; they grow when money is put in |
| D8 | A campaign created before any capital is entered | It had a 600 MAD cap and the no-campaign rule while nothing else was guarded | **FIXED** 1.18.0: the cap is 10 % of the capital, so zero until money is entered. The no-campaign rule still applies once a campaign runs |
| D9 | A new test started while the business is below the capital floor | Two losing tests at 10 % each put a 6,000 MAD shop exactly at the 80 % floor; a third goes below it with no objection (only withdrawals are blocked) | **FIXED** 1.18.1: an ad expense below the floor needs a reason and is flagged `below_floor`. **RULE**: below the floor, no new test |
| D10 | Shares are taken on the money put in, not on what is left | After losses the ad budget and the cap stay the same; money added raises the cap at once | **RULE**: never put money in to rescue a losing test |
| D2 | Personal spending paid from the business cash | Cash in the app is higher than in reality | **RULE**: record it as an owner withdrawal |
| D3 | Stock bought on credit | — | **OK**: unpaid obligations are subtracted from the business value |
| D4 | An expense recorded twice, or with a wrong amount | — | **OK**: delete it and record it again (it passes the guard again) |
| D5 | Back-dating an expense before the start date | It would escape the cash count | **OK**: refused (`BEFORE_OPENING_DATE`) |
| D6 | Cash counted in the app differs from the real cash | — | **RULE**: count the real cash at the monthly close and record the difference |

## Reading the reports

| # | Situation | What could go wrong | Status |
|---|---|---|---|
| E1 | Judging a period that ended less than 10 days ago | Deliveries still pending | **OK** 1.17.0: the report says it is incomplete |
| E2 | Judging a product before 20 orders | Too few orders | **OK**: "too early" until 20 orders; a test ends at 20 orders or the cap, whichever comes first |
| E3 | Unsold stock of a stopped test | The test's result does not count stock bought and not sold | **RULE**: buy 10–15 pieces per test; sleeping stock is listed in Reports |
