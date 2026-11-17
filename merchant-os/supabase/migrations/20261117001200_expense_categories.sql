-- Merchant OS — more expense categories (1.3.1), requested by the owner.
-- New values only; functions using them are updated in the next migration
-- (a new enum value cannot be used in the transaction that adds it).
alter type public.expense_category add value if not exists 'internet';
alter type public.expense_category add value if not exists 'phone';
alter type public.expense_category add value if not exists 'ai_tools';
alter type public.expense_category add value if not exists 'electricity';
alter type public.expense_category add value if not exists 'transport';
-- Repaying the principal of a debt is cash out, not a cost of the business.
alter type public.expense_category add value if not exists 'debt_repayment';
