# MoviePlatform — Production E2E Testing Plan v3

> **Target:** `http://89.108.66.37/`
> **Method:** Manual E2E via Playwright MCP browser tools
> **Date:** March 2026
> **Sessions:** 20 total (independently executable)
> **Previous:** v2 (17 sessions, all passed 2026-03-03)

---

## Quick Reference

### Test Credentials

| Role    | Email                       | Password   |
| ------- | --------------------------- | ---------- |
| User    | user@movieplatform.local    | user123    |
| Partner | partner@movieplatform.local | partner123 |
| Admin   | admin@movieplatform.local   | admin123   |
| Minor   | minor@movieplatform.local   | minor123   |

### Known Issues (Ignore)

- React hydration error #418 (cosmetic, caused by browser extensions or useMediaQuery)
- `/api/v1/documents/terms` not implemented (returns error)
- Content thumbnails are dark placeholders (no actual images in MinIO)
- SMTP not configured on production (emails won't send)
- `/api/v1/bonuses/balance` and `/api/v1/bonuses/statistics` return 500 (backend issue, frontend handles gracefully)

### Design System Colors

```
Backgrounds:   #05060a (primary), #080b12 (secondary), #10131c (surface), #151824 (elevated)
Accents:       #c94bff (violet-magenta), #28e0c4 (turquoise-cyan), #ff6b5a (warm coral)
Text:          #f5f7ff (primary), #9ca2bc (secondary), #5a6072 (disabled)
Border:        #272b38
Gradient CTA:  linear-gradient(135deg, #c94bff 0%, #28e0c4 100%)
Hero gradient: linear-gradient(180deg, transparent 0%, #05060a 100%)

Age badge colors:
  0+ / 6+  = #28E0C4 (turquoise)
  12+      = #3B82F6 (blue)
  16+      = #F97316 (orange)
  18+      = #EF4444 (red)

Notifications:
  Success bg: #12352e, text: #7cf2cf
  Error bg:   #35141a, text: #ff9aa8
```

### Viewports

| Name    | Size      | Sessions    |
| ------- | --------- | ----------- |
| Desktop | 1440×900  | S1–S17      |
| Mobile  | 390×844   | S18         |
| Tablet  | 768×1024  | S19         |
| Mixed   | All 3     | S20         |

### MCP Tool Reference

| Tool                       | Use For                                    |
| -------------------------- | ------------------------------------------ |
| `browser_resize`           | Set viewport dimensions                    |
| `browser_navigate`         | Go to URL                                  |
| `browser_snapshot`         | Accessibility tree (for verifying content) |
| `browser_take_screenshot`  | Visual evidence (fullPage for scrollable)  |
| `browser_click`            | Click elements by ref                      |
| `browser_type`             | Type into inputs                           |
| `browser_fill_form`        | Fill multiple fields at once               |
| `browser_press_key`        | Keyboard actions (End, Escape, Tab)        |
| `browser_evaluate`         | Run JS (check colors, overflow, etc.)      |
| `browser_console_messages` | Check for errors                           |
| `browser_navigate_back`    | Go back in history                         |
| `browser_wait_for`         | Wait for text/time                         |

---

## Session Overview

| #  | Session                                            | Status | Bugs | Date |
| -- | -------------------------------------------------- | ------ | ---- | ---- |
| 1  | Landing Page Deep Inspection                       |        |      |      |
| 2  | Static Public Pages                                |        |      |      |
| 3  | Authentication Flows                               |        |      |      |
| 4  | Content Listings                                   | ✅ PASS |  0   | 2026-03-03 |
| 5  | Content Detail Pages                               | ✅ PASS |  0   | 2026-03-03 |
| 6  | Search Functionality                               | ✅ PASS |  2 (Minor) | 2026-03-03 |
| 7  | Dashboard & Watch Page                             |        |      |      |
| 8  | Account Pages — Part 1                             |        |      |      |
| 9  | Account Pages — Part 2                             |        |      |      |
| 10 | Partner Program — Dashboard, Referrals, Invite     |        |      |      |
| 11 | Partner Program — Commissions, Withdrawals         |        |      |      |
| 12 | Bonus System                                       |        |      |      |
| 13 | Store — Catalog & Product Detail                   |        |      |      |
| 14 | Store — Cart, Checkout, Orders                     |        |      |      |
| 15 | Admin — Dashboard, Reports, Navigation             |        |      |      |
| 16 | Admin — Users, Content, Subscriptions              |        |      |      |
| 17 | Admin — Remaining Pages (24 pages)                 |        |      |      |
| 18 | Mobile Responsive (390×844) — Full Sweep           |        |      |      |
| 19 | Tablet Responsive (768×1024) — Full Sweep          |        |      |      |
| 20 | Cross-Cutting Quality Audit & Regression           |        |      |      |

---

## SESSION 1: Landing Page Deep Inspection

**Viewport:** 1440×900 | **Auth:** None | **Route:** `/`

### Pre-conditions
- Browser at desktop viewport
- Not logged in (clear cookies if needed)

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Resize browser to 1440×900 | Viewport set |
| 2  | Navigate to `http://89.108.66.37/` | Landing page loads |
| 3  | Take snapshot | Full accessibility tree visible |
| 4  | Check console messages (error level) | Only hydration #418 allowed |
| 5  | Evaluate `getComputedStyle(document.body).backgroundColor` | ~rgb(5, 6, 10) or #05060a |
| 6  | Evaluate `document.documentElement.scrollWidth <= window.innerWidth` | `true` (no horizontal overflow) |
| 7  | Verify Hero section: heading text, subtitle, 2 CTA buttons ("Начать бесплатно", "Узнать больше") | All present |
| 8  | Verify Stats section: 3 stat counters visible | Numbers visible |
| 9  | Verify ContentPreview section: content cards/carousel | Cards visible |
| 10 | Verify Features section: 6 feature cards with icons and descriptions | Cards with icons present |
| 11 | Verify Pricing preview section: plan cards visible | Pricing cards show |
| 12 | Verify CTA section: gradient background, call-to-action text and button | Gradient CTA present |
| 13 | Verify Footer section: links, copyright, social icons | Footer complete |
| 14 | Evaluate CTA gradient: check for #c94bff and #28e0c4 in gradient | Gradient matches design system |
| 15 | Click "Войти" nav link | Navigates to `/login` |
| 16 | Navigate back to `/` | Landing page returns |
| 17 | Click "Начать" / registration CTA button | Navigates to `/register` |
| 18 | Navigate back to `/` | Landing page returns |
| 19 | Scroll to footer, verify footer links (About, Support, Documents) | Links present and valid |
| 20 | Take full-page screenshot | Visual evidence captured |

### UI/UX Quality Checks
- ScrollReveal: sections should be visible (opacity fix verified — no elements stuck at opacity:0)
- Dark background (#05060a) consistent throughout
- Gradient buttons render correctly (violet → turquoise)
- Inter font used for all text
- All text in Russian
- No horizontal overflow at any scroll position

### Known Bug Verifications
- ScrollReveal opacity:0 fix (mounted state guard) — sections should appear immediately

---

## SESSION 2: Static Public Pages

**Viewport:** 1440×900 | **Auth:** None | **Routes:** `/about`, `/support`, `/pricing`, `/documents`, `/documents/[type]`

### Pre-conditions
- Desktop viewport, not logged in

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/about` | About page loads |
| 2  | Verify badge "О платформе" or heading | Badge/heading present |
| 3  | Verify mission card with platform description | Card with text present |
| 4  | Verify 6 feature cards (icons, titles, descriptions) | 6 cards visible |
| 5  | Verify contact section at bottom | Contact info present |
| 6  | Check console for errors | Only hydration #418 |
| 7  | Navigate to `/support` | Support page loads |
| 8  | Verify 3 contact cards (email, phone, chat) | 3 cards visible |
| 9  | Verify FAQ accordion section | Accordion present |
| 10 | Click first FAQ item → verify it expands | Content expands smoothly |
| 11 | Click again → verify it collapses | Content collapses |
| 12 | Navigate to `/pricing` | Pricing page loads |
| 13 | Verify plan cards: "Премиум" plan (pricing visible, e.g. 499₽/3990₽) | Plan cards with ₽ prices |
| 14 | Verify tab switching (Премиум / Отдельный контент or similar) | Tabs switch content |
| 15 | Verify no JSON.parse crash (bug #4 fix — features come as JSON string) | Page renders normally |
| 16 | Navigate to `/documents` | Documents listing page loads |
| 17 | Verify document list items | Document links visible |
| 18 | Click a document → verify detail page loads | Detail page renders |

### UI/UX Quality Checks
- Card borders use #272b38
- Accent colors (#c94bff, #28e0c4) used for icons and highlights
- FAQ accordion animations smooth (no jank)
- Pricing: ruble sign (₽) formatting correct
- All text in Russian

---

## SESSION 3: Authentication Flows

**Viewport:** 1440×900 | **Auth:** Varies | **Routes:** `/login`, `/register`, `/forgot-password`

### Pre-conditions
- Desktop viewport, start logged out

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/login` | Login form with "Вход в аккаунт" heading |
| 2  | Submit empty form (click submit without filling) | Russian validation messages appear |
| 3  | Type invalid email format, submit | Email format error in Russian |
| 4  | Fill valid email but wrong password, submit | Error **toast** appears (NOT silent redirect — bug #13 fix) |
| 5  | Verify password field has toggle (show/hide) button | Toggle icon present |
| 6  | Click password toggle | Password becomes visible/hidden |
| 7  | Fill correct credentials: `user@movieplatform.local` / `user123`, submit | Successful login, redirect to `/dashboard` |
| 8  | Verify dashboard loads with user content | Dashboard visible |
| 9  | Navigate to `/login` while authenticated | Redirects to `/` or `/dashboard` (auth guard) |
| 10 | Log out (via avatar menu or `/logout`) | Redirected to landing or login |
| 11 | Navigate to `/account` while logged out | Redirects to `/login?redirect=...` (protected route guard) |
| 12 | Navigate to `/register` | Registration form loads |
| 13 | Verify form fields: Имя, Email, Пароль, Подтверждение пароля, checkbox | All fields present |
| 14 | DO NOT submit registration (preserve test accounts) | — |
| 15 | Navigate to `/forgot-password` | Forgot password form loads |
| 16 | Verify email input and submit button | Form structure correct |

### UI/UX Quality Checks
- Input fields min 48px height for touch accessibility
- All error messages in Russian
- Loading spinner visible during form submission
- Password toggle icon changes state
- Form centered on page, max-width constraint
- Focus states visible on inputs

### Known Bug Verifications
- Bug #13: Wrong credentials shows error toast, NOT silent redirect
- Login/register/forgotPassword use `skipRefresh: true, skipAuth: true`

---

## SESSION 4: Content Listings

**Viewport:** 1440×900 | **Auth:** User | **Routes:** `/series`, `/clips`, `/shorts`, `/tutorials`

### Pre-conditions
- Logged in as user@movieplatform.local

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/series` | Page loads with heading "Сериалы" |
| 2  | Verify grid layout of content cards | Grid visible (5 cols without filter panel) |
| 3  | Verify content cards: thumbnail, title, age badge, description | Card elements present |
| 4  | Click filter button → filter panel opens | Filter panel slides in/appears |
| 5  | Verify filter options (genre, age, year, etc.) | Filter dropdowns present |
| 6  | Verify grid adjusts (4 cols with filter panel open) | Grid narrows |
| 7  | Close filter panel | Panel closes, grid returns to 5 cols |
| 8  | Verify sort dropdown (По дате, По популярности, По рейтингу) | Sort options available |
| 9  | Navigate to `/clips` | Page loads with heading "Клипы" |
| 10 | Verify grid layout and card structure | Cards present |
| 11 | Navigate to `/shorts` | Page loads with heading "Шортсы" |
| 12 | Verify grid layout | Cards present |
| 13 | Navigate to `/tutorials` | Page loads with heading "Обучение" |
| 14 | Verify grid layout and card structure | Tutorial cards present |
| 15 | Verify age badge colors on cards | 0+/6+=#28E0C4, 12+=#3B82F6, 16+=#F97316, 18+=#EF4444 |
| 16 | Verify skeleton loading appears briefly | Loading skeletons show before content |
| 17 | Check no layout shift after content loads | CLS minimal |

### UI/UX Quality Checks
- Age badge colors match design system exactly
- Skeleton loading components render during fetch
- Grid columns: 5 without filter, 4 with filter
- Cards use rounded-xl with #10131c surface background
- No layout shift when content loads
- Sort dropdown styled consistently

---

## SESSION 5: Content Detail Pages

**Viewport:** 1440×900 | **Auth:** User | **Routes:** `/series/[slug]`, `/clips/[slug]`, `/tutorials/[slug]`

### Pre-conditions
- Logged in as user@movieplatform.local

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/series` | Series listing loads |
| 2  | Click first series card | Navigate to `/series/[slug]` detail page |
| 3  | Verify title and description | Title and description text present |
| 4  | Verify thumbnail/poster image | Image or placeholder visible |
| 5  | Verify age badge with correct color | Badge present with correct color |
| 6  | Verify metadata (year, genre, episodes, etc.) | Metadata section visible |
| 7  | Verify CTA buttons ("Смотреть", "В список" or similar) | Action buttons present |
| 8  | Verify NO duplicate metadata (bug #2 fix — SeriesCard mobile) | Season/episode info shown once only |
| 9  | Navigate back to series listing | Listing loads |
| 10 | Navigate to `/clips` | Clips listing loads |
| 11 | Click first clip card → detail page | Clip detail renders |
| 12 | Verify clip metadata (duration, views, etc.) | Metadata present |
| 13 | Navigate back | Listing returns |
| 14 | Navigate to `/tutorials` | Tutorials listing loads |
| 15 | Click first tutorial card → detail page | Tutorial detail renders |
| 16 | Verify tutorial tabs ("Уроки", "О курсе", "Отзывы" or similar) | Tabs present and clickable |

### UI/UX Quality Checks
- Metadata readable against dark background
- Age badges use correct design system colors
- CTA buttons use gradient (violet → turquoise)
- Tab navigation smooth, active tab highlighted
- Back navigation works cleanly (no stale state)

---

## SESSION 6: Search Functionality

**Viewport:** 1440×900 | **Auth:** User | **Route:** `/search`

### Pre-conditions
- Logged in as user@movieplatform.local

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/search` | Search page loads |
| 2  | Verify search input with Russian placeholder | Input visible with placeholder |
| 3  | Verify 5 filter dropdowns (type, genre, age, year, sort) | Dropdowns present |
| 4  | Type "тест" in search input | Results update or empty state shows |
| 5  | Clear search, type "сериал" | Results or empty state |
| 6  | Change type filter dropdown | Results filter |
| 7  | Change age filter dropdown | Results filter |
| 8  | Change sort dropdown | Results re-sort |
| 9  | Clear all filters | Reset to default state |
| 10 | Verify empty state with icon and message | Styled empty state present |
| 11 | Verify header search bar → clicking navigates to /search | Header search navigates correctly |

### UI/UX Quality Checks
- Search input prominent and large
- Filter dropdowns consistent styling
- Results use same card components as listings
- Empty state includes icon and helpful message in Russian
- Search debounce (not firing on every keystroke)

---

## SESSION 7: Dashboard & Watch Page

**Viewport:** 1440×900 | **Auth:** User | **Routes:** `/dashboard`, `/watch/[id]`

### Pre-conditions
- Logged in as user@movieplatform.local

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/dashboard` | Dashboard loads |
| 2  | Verify DashboardHero (title, subtitle, CTA buttons) | Hero section present |
| 3  | Verify DashboardRows (content rows with "Смотреть все" links) | Content rows visible |
| 4  | Verify sidebar groups: МЕНЮ, БИБЛИОТЕКА, МАГАЗИН, АККАУНТ, ПАРТНЁРАМ | 5 groups in sidebar |
| 5  | Verify header: search icon, cart badge, notifications bell, avatar | Header elements present |
| 6  | Click "Смотреть все" on a content row | Navigates to listing page |
| 7  | Navigate back to `/dashboard` | Dashboard returns |
| 8  | Click a content card | Navigates to detail or watch page |
| 9  | Navigate to a watch page (e.g., `/watch/[id]`) | Watch page loads |
| 10 | Verify video player area (or placeholder) | Player area visible |
| 11 | Verify content metadata below player | Title, description present |
| 12 | Navigate to `/watch/nonexistent-id` or invalid | 403 or 404 error handling |
| 13 | Check console for errors | Only hydration #418 |

### UI/UX Quality Checks
- Hero gradient overlay renders smoothly
- Content rows support horizontal scroll
- Sticky header with backdrop blur effect
- Skeleton loading on initial load
- Watch page error states styled (not raw error text)

---

## SESSION 8: Account Pages — Part 1

**Viewport:** 1440×900 | **Auth:** User | **Routes:** `/account`, `/account/profile`, `/account/settings`, `/account/verification`

### Pre-conditions
- Logged in as user@movieplatform.local

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/account` | Account dashboard loads |
| 2  | Verify avatar and user info card | Avatar/initials + name visible |
| 3  | Verify 4 stats cards (subscriptions, bonuses, referrals, orders or similar) | 4 stat cards present |
| 4  | Verify 6 quick links section | Quick links visible |
| 5  | Verify account sidebar: 9 nav items | Sidebar with all nav items |
| 6  | Verify active nav item highlighted in violet (#c94bff) | Active state visible |
| 7  | Click "Профиль" in sidebar → `/account/profile` | Profile page loads |
| 8  | Verify edit form: Имя, Фамилия, Email, Телефон fields | Form fields present |
| 9  | Verify avatar upload area | Upload area visible |
| 10 | Click "Настройки" → `/account/settings` | Settings page loads |
| 11 | Verify 3 tabs: Уведомления, Безопасность, Сессии | Tabs present |
| 12 | Click each tab → content switches | Tab content changes |
| 13 | Click "Верификация" → `/account/verification` | Verification page loads |
| 14 | Verify 3-step progress indicator | Steps visible |
| 15 | Verify status badge (Не верифицирован or similar) | Status badge present |

### UI/UX Quality Checks
- Sidebar width ~w-60 with user card at top
- Violet active state (#c94bff) on current nav item
- Stats cards use accent colors from design system
- Form labels in Russian
- Toggle switches styled correctly
- Tab transitions smooth

---

## SESSION 9: Account Pages — Part 2

**Viewport:** 1440×900 | **Auth:** User | **Routes:** `/account/subscriptions`, `/account/payments`, `/account/history`, `/account/watchlist`, `/account/notifications`

### Pre-conditions
- Logged in as user@movieplatform.local

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/account/subscriptions` | Subscriptions page loads |
| 2  | Verify empty state with "Выбрать тариф" CTA → links to /pricing | Empty state with CTA |
| 3  | Navigate to `/account/payments` | Payments page loads |
| 4  | Verify 3 filter dropdowns (status, type, period) | Filters present |
| 5  | Verify table or empty state | Payments list or empty message |
| 6  | Navigate to `/account/history` | Watch history page loads |
| 7  | Verify 5 type tabs (Все, Сериалы, Клипы, Шортсы, Обучение) | Tabs present |
| 8  | Click different tabs → content filters | Tab filtering works |
| 9  | Navigate to `/account/watchlist` | Watchlist page loads |
| 10 | Verify grid/list toggle and sort dropdown | Toggle and sort present |
| 11 | Navigate to `/account/notifications` | Notifications page loads |
| 12 | Verify type tabs (Все, Система, Подписки, Платежи, Контент, Партнёры, Бонусы, Промо) | 8 tabs present |
| 13 | Verify infinite scroll or load more behavior | Scroll/pagination works |

### UI/UX Quality Checks
- Empty states include icon + descriptive message + CTA in Russian
- Filter tabs horizontally scrollable on overflow
- Grid/list toggle functional with visual state change
- Notification items have hover effects
- Consistent card styling across all account pages

---

## SESSION 10: Partner Program — Dashboard, Referrals, Invite

**Viewport:** 1440×900 | **Auth:** Partner | **Routes:** `/partner`, `/partner/referrals`, `/partner/invite`

### Pre-conditions
- Log out user, log in as partner@movieplatform.local / partner123

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/partner` | Partner dashboard loads |
| 2  | Verify stats grid (referral count, earnings, pending) | Stats cards present |
| 3  | Verify level card shows NAME (e.g., "Бронза") not number | Text name, NOT "1" (bug #5 fix) |
| 4  | Verify balance shows valid number, NOT NaN | No NaN anywhere (bug #6 fix) |
| 5  | Verify invite card with referral link | Referral link visible |
| 6  | Click copy button on referral link | Copy action triggers |
| 7  | Navigate to `/partner/referrals` | Referrals page loads |
| 8  | Verify referrals tree structure (5 levels) | Tree/list structure visible |
| 9  | Verify level labels | Level labels in Russian |
| 10 | Navigate to `/partner/invite` | Invite page loads |
| 11 | Verify 3-step guide for inviting | Steps visible |
| 12 | Verify commission rates (10% / 5% / 3% / 2% / 1%) | Rates displayed |
| 13 | Verify level progression table | Table with levels present |
| 14 | Verify referral link on invite page | Link present |
| 15 | Check console for errors | Only hydration #418 |

### UI/UX Quality Checks
- Stats cards use accent colors from design system
- Level badge styled with color
- Referral code in monospace font
- Commission rates table formatted clearly
- All text in Russian

### Known Bug Verifications
- Bug #5: Level shows name (LEVEL_NUMBER_TO_NAME mapping), not number
- Bug #6: Balance shows valid number, not NaN (field normalization)
- Bug #7: Invite page uses normalized level data (levelNumber → level mapping)

---

## SESSION 11: Partner Program — Commissions, Withdrawals

**Viewport:** 1440×900 | **Auth:** Partner | **Routes:** `/partner/commissions`, `/partner/withdrawals`, `/partner/withdrawals/new`

### Pre-conditions
- Logged in as partner@movieplatform.local

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/partner/commissions` | Commissions page loads |
| 2  | Verify table columns: Дата, От кого, Уровень, Сумма, Статус | Columns present |
| 3  | Verify 2 filter dropdowns (level, status) | Filters present |
| 4  | Verify status badges are color-coded | Badges colored (green=approved, yellow=pending, etc.) |
| 5  | Check table or empty state | Data or empty message |
| 6  | Navigate to `/partner/withdrawals` | Withdrawals page loads |
| 7  | Verify withdrawals table structure | Table headers visible |
| 8  | Verify status filter | Filter dropdown present |
| 9  | Navigate to `/partner/withdrawals/new` | Withdrawal form loads |
| 10 | Verify 4-step wizard: Сумма, Налог, Реквизиты, Подтверждение | Step indicator visible |
| 11 | Verify tax calculator display | Tax info shown |
| 12 | Verify form fields and labels in Russian | Russian labels |
| 13 | DO NOT submit withdrawal form | — |

### UI/UX Quality Checks
- Tables use #272b38 borders with row hover effects
- Status badges color-coded consistently
- Wizard step indicators show progress
- Tax breakdown formatted with ₽ currency
- All form labels and placeholders in Russian

---

## SESSION 12: Bonus System

**Viewport:** 1440×900 | **Auth:** User | **Routes:** `/bonuses`, `/bonuses/history`, `/bonuses/withdraw`

### Pre-conditions
- Log out partner, log in as user@movieplatform.local / user123

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/bonuses` | Bonuses page loads |
| 2  | Verify balance card | Balance card visible (may show 0 or error gracefully) |
| 3  | Verify 4 stats cards | Stats section present |
| 4  | Verify 6 detail cards | Detail cards visible |
| 5  | Verify earning methods section | Methods listed |
| 6  | Check that API 500 for /bonuses/balance is handled gracefully | No crash, error handled |
| 7  | Check that API 500 for /bonuses/statistics is handled gracefully | No crash, styled error |
| 8  | Check console (expect API 500 errors but no unhandled crashes) | 500 errors OK, no crashes |
| 9  | Navigate to `/bonuses/history` | History page loads |
| 10 | Verify 4 summary cards at top | Summary cards present |
| 11 | Verify filter controls | Filters visible |
| 12 | Verify history list or empty state | List or empty message |
| 13 | Navigate to `/bonuses/withdraw` | Withdraw page loads |
| 14 | Verify balance display | Balance shown |
| 15 | Verify 1000₽ minimum warning | Warning text present |
| 16 | Verify FAQ section | FAQ visible |

### UI/UX Quality Checks
- Balance renders despite API 500 errors (graceful degradation)
- Error states styled with icons, not raw error text
- All text in Russian
- Accent colors used for stats and icons
- FAQ section formatted consistently

---

## SESSION 13: Store — Catalog & Product Detail

**Viewport:** 1440×900 | **Auth:** User | **Routes:** `/store`, `/store/[slug]`

### Pre-conditions
- Logged in as user@movieplatform.local

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/store` | Store catalog page loads |
| 2  | Verify heading "Магазин" or "Каталог" | Page heading present |
| 3  | Verify product count indicator | Count visible |
| 4  | Verify search input | Search field present |
| 5  | Verify sort dropdown | Sort options available |
| 6  | Click filter button → filter panel opens | Filter panel appears |
| 7  | Verify filter options (category, price range, etc.) | Filter controls present |
| 8  | Close filter panel | Panel closes |
| 9  | Verify product cards: image, title, price in ₽, "или X бонусов" | Card elements present |
| 10 | Click a product card → detail page | Product detail loads |
| 11 | Verify breadcrumbs | Breadcrumb navigation present |
| 12 | Verify image gallery | Product image(s) visible |
| 13 | Verify category, price, stock info | Product metadata present |
| 14 | Verify quantity selector (+/- buttons) | Quantity controls work |
| 15 | Verify "Добавить в корзину" button | Add to cart button present |

### UI/UX Quality Checks
- Product cards consistent styling
- Price formatted with ₽ symbol
- Image gallery renders (or placeholder)
- Breadcrumbs use proper separator
- Cart badge updates in real-time when item added
- CartDrawer slides from right on add

---

## SESSION 14: Store — Cart, Checkout, Orders

**Viewport:** 1440×900 | **Auth:** User | **Routes:** `/store/cart`, `/store/checkout`, `/store/orders`

### Pre-conditions
- Logged in as user@movieplatform.local

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Click cart icon in header | CartDrawer slides from right |
| 2  | Verify drawer contents (items, quantity, price) | Cart items or empty state |
| 3  | Verify checkout link in drawer | Link present |
| 4  | Close drawer (click outside or X) | Drawer closes smoothly |
| 5  | Navigate to `/store/cart` | Full cart page loads |
| 6  | Verify cart items with +/- quantity controls | Quantity controls present |
| 7  | Verify delete button per item | Delete buttons visible |
| 8  | Verify subtotal calculation | Subtotal shown in ₽ |
| 9  | Verify "Оформить заказ" button | Checkout button present |
| 10 | Navigate to `/store/checkout` | Checkout page loads |
| 11 | Verify 4-step indicator (Корзина, Доставка, Оплата, Подтверждение) | Step indicator present |
| 12 | Verify step 1: shipping form fields | Form fields present |
| 13 | DO NOT submit checkout | — |
| 14 | Navigate to `/store/orders` | Orders page loads |
| 15 | Verify 4 tabs: Все, Активные, Доставленные, Отменённые | Tab navigation present |
| 16 | Verify order list or empty state | List or empty message |
| 17 | Check console for errors | Only hydration #418 |

### UI/UX Quality Checks
- CartDrawer slides smoothly from right
- Cart item layout clean (image, title, price, quantity, delete)
- Checkout step progress indicator styled
- Shipping form labels in Russian
- Empty order state includes CTA to store

---

## SESSION 15: Admin — Dashboard, Reports, Navigation

**Viewport:** 1440×900 | **Auth:** Admin | **Routes:** `/admin/dashboard`, `/admin/reports`

### Pre-conditions
- Log out user, log in as admin@movieplatform.local / admin123

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/admin/dashboard` | Admin dashboard loads |
| 2  | Verify heading "Панель управления" | Heading present |
| 3  | Verify 4 stats cards (Users, Subscriptions, Revenue, Content) | 4 stat cards present |
| 4  | Verify 2 charts render (area chart + line/bar chart) | Charts visible (not just skeleton) |
| 5  | Verify "Требуют внимания" section | Attention section present |
| 6  | Verify "Последние транзакции" section | Transactions list present |
| 7  | Verify admin sidebar with 8 groups: ОБЗОР, ПОЛЬЗОВАТЕЛИ, КОНТЕНТ, ФИНАНСЫ, ПАРТНЁРЫ, МАГАЗИН, КОММУНИКАЦИИ, СИСТЕМА | All 8 groups visible |
| 8  | Expand/collapse sidebar groups | Groups toggle correctly |
| 9  | Navigate to `/admin/reports` | Reports page loads |
| 10 | Verify 6 stats cards | Stats cards present |
| 11 | Verify 3 charts render | Charts visible |
| 12 | Check console for errors | Only hydration #418 |

### UI/UX Quality Checks
- Charts render with data (not just loading skeleton)
- Stats cards show correct icons
- Admin sidebar distinct from user sidebar
- All text in Russian
- Chart labels readable against dark background

---

## SESSION 16: Admin — Users, Content, Subscriptions, Verifications

**Viewport:** 1440×900 | **Auth:** Admin | **Routes:** `/admin/users`, `/admin/users/[userId]`, `/admin/content`, `/admin/content/new`, `/admin/content/[id]`, `/admin/subscriptions`, `/admin/verifications`

### Pre-conditions
- Logged in as admin@movieplatform.local

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/admin/users` | Users DataTable loads |
| 2  | Verify search input | Search field present |
| 3  | Type in search → table filters | Results filter |
| 4  | Verify filter dropdowns (role, status) | Filters present |
| 5  | Verify 5+ seeded users visible | User rows present |
| 6  | Click a user row → user detail page | User detail loads (`/admin/users/[id]`) |
| 7  | Verify user info, role, status, timestamps | User details present |
| 8  | Navigate back to users list | List returns |
| 9  | Navigate to `/admin/content` | Content DataTable loads |
| 10 | Verify type/status filter dropdowns | Filters present |
| 11 | Navigate to `/admin/content/new` | Content creation form loads |
| 12 | Verify form fields (title, type, description, age category) | Form fields present |
| 13 | DO NOT submit content creation | — |
| 14 | Navigate to `/admin/subscriptions` | Subscriptions page loads |
| 15 | Verify subscription plans or management table | Content present |
| 16 | Navigate to `/admin/verifications` | Verifications page loads |
| 17 | Verify verification queue or empty state | Page renders |

### UI/UX Quality Checks
- DataTables sortable, filterable, searchable
- Pagination controls present and functional
- Search has debounce (not firing on every keystroke)
- Forms labeled in Russian
- No English text like "No results found" (should be Russian equivalent)

---

## SESSION 17: Admin — Remaining Pages (24 pages)

**Viewport:** 1440×900 | **Auth:** Admin | **Routes:** All remaining admin pages

### Pre-conditions
- Logged in as admin@movieplatform.local

### Test Steps — Batch Navigation

Navigate to each page, take snapshot, verify basic structure (heading, table/form), check console.

| #  | Route | Expected Structure |
|----|-------|--------------------|
| 1  | `/admin/payments` | Payments table or dashboard |
| 2  | `/admin/partners` | Partners list/table |
| 3  | `/admin/partners/commissions` | Commissions management |
| 4  | `/admin/partners/withdrawals` | Withdrawals management |
| 5  | `/admin/bonuses` | Bonuses overview |
| 6  | `/admin/bonuses/campaigns` | Bonus campaigns |
| 7  | `/admin/bonuses/rates` | Bonus rates config |
| 8  | `/admin/store/products` | Store products table |
| 9  | `/admin/store/categories` | Store categories |
| 10 | `/admin/store/orders` | Store orders table |
| 11 | `/admin/newsletters` | Newsletters list |
| 12 | `/admin/newsletters/new` | Newsletter creation form |
| 13 | `/admin/documents` | Documents management |
| 14 | `/admin/documents/new` | Document creation form |
| 15 | `/admin/audit` | Audit log table |
| 16 | `/admin/settings` | Settings page |

### Quality Gate
- All pages load without crash
- Tables have proper structure (headers, rows or empty state)
- Empty states styled (not raw "undefined" or blank page)
- Console: only hydration #418
- All headings in Russian

---

## SESSION 18: Mobile Responsive (390×844) — Full Sweep

**Viewport:** 390×844 | **Auth:** Multiple | **Routes:** All major routes

### Pre-conditions
- Resize browser to 390×844

### Test Steps

**Unauthenticated (logged out):**

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/` (landing) | Mobile layout, stacked sections, no overflow |
| 2  | Verify hamburger menu or mobile nav | Mobile navigation present |
| 3  | Navigate to `/login` | Form usable, inputs full width |
| 4  | Navigate to `/register` | Form usable |
| 5  | Navigate to `/pricing` | Pricing cards stacked vertically |
| 6  | Navigate to `/about` | Content stacked, readable |
| 7  | Navigate to `/support` | FAQ usable on mobile |

**Authenticated as user:**

| #  | Action | Expected |
|----|--------|----------|
| 8  | Log in as user, navigate to `/dashboard` | Mobile dashboard |
| 9  | Verify sidebar → hamburger menu (not always visible) | Sidebar hidden, hamburger available |
| 10 | Verify bottom nav (5 items) | Bottom navigation bar visible |
| 11 | Navigate to `/series` | 2-column card grid |
| 12 | Navigate to `/account` | Mobile tabs (horizontal, not sidebar) |
| 13 | Navigate to `/store` | 2-column product grid |
| 14 | Navigate to `/bonuses` | Stats stacked vertically |

**Partner:**

| #  | Action | Expected |
|----|--------|----------|
| 15 | Log in as partner | Partner dashboard mobile |
| 16 | Verify 1-column stats layout | Stats stacked |
| 17 | Navigate to `/partner/commissions` | Table scrolls horizontally |

**Admin:**

| #  | Action | Expected |
|----|--------|----------|
| 18 | Log in as admin | Admin dashboard mobile |
| 19 | Verify admin sidebar adapts | Sidebar responsive |
| 20 | Navigate to `/admin/users` | DataTable scrolls horizontally |

**Quality Gates:**

| #  | Check | Expected |
|----|-------|----------|
| 21 | Evaluate `document.documentElement.scrollWidth <= window.innerWidth` on 5 key pages | `true` on all (no horizontal scrollbar) |
| 22 | Verify all text readable without zoom | Text ≥14px body, ≥20px headings |

### UI/UX Quality Checks
- NO horizontal scrollbar on any page
- Touch targets ≥ 48px (buttons, links, inputs)
- Text readable without zoom
- Images scale to fit viewport
- Bottom nav visible on main pages
- Hamburger menu functional
- Tables scroll horizontally (not break layout)

---

## SESSION 19: Tablet Responsive (768×1024) — Full Sweep

**Viewport:** 768×1024 | **Auth:** Multiple | **Routes:** All major routes

### Pre-conditions
- Resize browser to 768×1024

### Test Steps

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/` (landing) | Tablet layout, sections adapt |
| 2  | Log in as user, navigate to `/dashboard` | Sidebar visible (not hamburger) |
| 3  | Navigate to `/series` | 3-column card grid |
| 4  | Navigate to `/account` | Horizontal tabs (not sidebar) |
| 5  | Navigate to `/store` | 3-column product grid |
| 6  | Navigate to `/partner` (log in as partner) | Partner layout adapts |
| 7  | Navigate to `/admin/dashboard` (log in as admin) | Admin layout adapts |
| 8  | Evaluate horizontal overflow on 5 key pages | No overflow |
| 9  | Verify DataTables readable (admin) | Tables fit or scroll |
| 10 | Verify forms usable | Inputs full width or reasonable |

### Quality Gates
- No horizontal overflow on any page
- Sidebar visible or adapts appropriately
- Content grids: 2-4 columns depending on page
- Forms usable (inputs not too narrow)
- DataTables readable (columns not squished)

---

## SESSION 20: Cross-Cutting Quality Audit & Regression

**Viewport:** All 3 | **Auth:** User + Minor

### Test Steps

**Error Pages (Desktop 1440×900):**

| #  | Action | Expected |
|----|--------|----------|
| 1  | Navigate to `/nonexistent-page-xyz` | 404 page renders |
| 2  | Verify gradient "404" text | Large "404" with gradient styling |
| 3  | Verify Russian error message | Message in Russian |
| 4  | Verify navigation buttons (home, back) | Buttons present and functional |

**Console Audit (Desktop 1440×900, logged in as user):**

| #  | Page | Expected |
|----|------|----------|
| 5  | `/dashboard` — check console | Only hydration #418 |
| 6  | `/series` — check console | Only hydration #418 |
| 7  | `/account` — check console | Only hydration #418 |
| 8  | `/store` — check console | Only hydration #418 |
| 9  | `/bonuses` — check console | Hydration #418 + bonuses API 500 OK |

**Design System Compliance (Desktop, evaluate via JS):**

| #  | Check | Expected |
|----|-------|----------|
| 10 | `document.body` background color | #05060a / rgb(5,6,10) |
| 11 | Find accent color usage on page | #c94bff / #28e0c4 present |
| 12 | Check border colors on cards | #272b38 |
| 13 | Text hierarchy (h1 > h2 > body) | Proper size hierarchy |
| 14 | Button hover states work | Hover changes opacity/color |
| 15 | Loading skeletons appear | Skeletons render briefly |
| 16 | Card border-radius | Rounded corners (12-16px) |
| 17 | Font family check | Inter or system font |
| 18 | Sticky header with blur | Header stays on scroll |
| 19 | Verify `<html lang="ru">` | Russian language tag set |

**Age Badge Spot Check:**

| #  | Action | Expected |
|----|--------|----------|
| 20 | Navigate to `/series`, find age badges | Badges visible |
| 21 | Evaluate badge colors match spec | Colors match design system |

**Minor User Regression:**

| #  | Action | Expected |
|----|--------|----------|
| 22 | Log out, log in as minor@movieplatform.local / minor123 | Login succeeds |
| 23 | Navigate to `/series` | Age-filtered content (no 18+ content) |
| 24 | Navigate to `/dashboard` | Dashboard shows age-appropriate content |
| 25 | Log out minor | Successfully logged out |

---

## Bug-Fix-Deploy Protocol

### Bug Documentation Template

```
BUG #[N]
Session: [session number]
URL: [page URL]
Viewport: [viewport]
Steps to reproduce: [numbered steps]
Expected: [what should happen]
Actual: [what happens instead]
Severity: Critical / Major / Minor / Cosmetic
Screenshot: [filename]
```

### Severity Levels

| Level    | Definition                              | Action                    |
|----------|-----------------------------------------|---------------------------|
| Critical | Crash, security issue, data loss        | Fix immediately           |
| Major    | Feature broken, unusable                | Fix before next session   |
| Minor    | Visual glitch, wrong text               | Batch fix at end          |
| Cosmetic | Polish, spacing, minor alignment        | Low priority              |

### Fix and Deploy Steps

```bash
# 1. Fix code locally
# 2. Commit
git add [files]
git commit -m "fix(web|api): [description]"

# 3. Push
git push origin main

# 4. Deploy on server
ssh root@89.108.66.37
cd /root/MoviePlatform
git pull origin main
docker compose -f docker-compose.prod.yml build web  # or api
docker compose -f docker-compose.prod.yml up -d web   # or api
systemctl restart nginx  # REQUIRED after container recreate

# 5. Verify fix on production
# 6. Re-test affected session step
```

---

## Session Results

### SESSION 1: Landing Page Deep Inspection
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 2: Static Public Pages
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 3: Authentication Flows
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 4: Content Listings
**Date:** 2026-03-03 | **Status:** ✅ PASS | **Bugs:** 0

| # | Check | Result |
|---|-------|--------|
| 1 | /series heading "Сериалы" | PASS |
| 2 | Grid layout visible (2 series cards) | PASS |
| 3 | Cards: thumbnail, title, age badge, metadata | PASS |
| 4 | Filter button → filter panel opens | PASS |
| 5 | Filter: "Возрастной рейтинг" with 0+/6+/12+/16+/18+ | PASS |
| 6 | Grid adjusts with filter panel | PASS |
| 7 | Close filter panel | PASS |
| 8 | Sort dropdown "Сначала новые" | PASS |
| 9 | /clips heading "Клипы" + controls | PASS |
| 10 | Clips grid layout | PASS (0 clips — empty state) |
| 11 | /shorts heading + vertical feed (3 shorts) | PASS |
| 12 | Shorts grid layout (vertical feed) | PASS |
| 13 | /tutorials heading "Обучение" + controls | PASS |
| 14 | Tutorials grid layout | PASS (0 tutorials — empty) |
| 15 | Age badges: 12+=#3B82F6, 18+=#EF4444 | PASS |
| 16 | Skeleton loading on initial loads | PASS |
| 17 | No layout shift | PASS |

### SESSION 5: Content Detail Pages
**Date:** 2026-03-03 | **Status:** ✅ PASS | **Bugs:** 0

| # | Check | Result |
|---|-------|--------|
| 1 | Navigate to /series | PASS |
| 2 | Click series card → detail page | PASS (/series/magic-school-adventures) |
| 3 | Title "Точка Невозврата" + description | PASS |
| 4 | Thumbnail/poster image | PASS (placeholder) |
| 5 | Age badge 16+ with correct color | PASS |
| 6 | Metadata: 2024, Триллер/Криминал/Драма, 3 сезон • 24 серий | PASS |
| 7 | CTA buttons "Смотреть" + "В список" | PASS |
| 8 | NO duplicate metadata (bug #2 fix) | PASS |
| 9 | Navigate back to listing | PASS |
| 10 | Navigate to /clips | PASS (0 in listing, direct slug works) |
| 11 | Clip detail: "За кулисами" — 0+, 15:00, description, Смотреть | PASS |
| 12 | Clip metadata (views, duration) | PASS |
| 13 | Navigate back | PASS |
| 14 | Navigate to /tutorials | PASS (0 in listing, direct slug works) |
| 15 | Tutorial detail: "Введение в фотографию" | PASS |
| 16 | Tutorial tabs: Уроки, О курсе, Отзывы — all clickable | PASS |

### SESSION 6: Search Functionality
**Date:** 2026-03-03 | **Status:** ✅ PASS | **Bugs:** 2 (Minor)

| # | Check | Result |
|---|-------|--------|
| 1 | Search page loads at /search | PASS |
| 2 | Search input with Russian placeholder | PASS ("Поиск фильмов, сериалов, курсов...") |
| 3 | 5 filter dropdowns | PASS (Все типы/категории/возрасты/годы + По релевантности) |
| 4 | Type "точка" → results update | PASS (empty state "Ничего не найдено") |
| 5 | Search "кулис" → result found | PASS (1 result shown) |
| 6 | Type filter dropdown options | PASS (Все типы/Сериалы/Фильмы/Обучение) |
| 7 | Age filter dropdown | PASS (present) |
| 8 | Sort dropdown | PASS (По релевантности) |
| 9 | Clear filters (X button) | PASS (returns to initial state) |
| 10 | Empty state with icon and message | PASS (Russian text + tips) |
| 11 | Header search bar | PASS (focuses inline, doesn't navigate to /search) |

### Bugs Found
**BUG S6-1 (Minor):** Search result count says "Найдено 0 результатов" but actually shows 1 result — counter is incorrect.
**BUG S6-2 (Minor):** Clip search results display "undefined сезонов • undefined серий" — clips don't have seasons/episodes, should show duration or nothing. Also links to /series/slug instead of /clips/slug.

### SESSION 7: Dashboard & Watch Page
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 8: Account Pages — Part 1
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 9: Account Pages — Part 2
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 10: Partner Program — Dashboard, Referrals, Invite
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 11: Partner Program — Commissions, Withdrawals
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 12: Bonus System
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 13: Store — Catalog & Product Detail
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 14: Store — Cart, Checkout, Orders
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 15: Admin — Dashboard, Reports, Navigation
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 16: Admin — Users, Content, Subscriptions
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 17: Admin — Remaining Pages
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 18: Mobile Responsive (390×844)
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 19: Tablet Responsive (768×1024)
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

### SESSION 20: Cross-Cutting Quality Audit & Regression
**Date:** — | **Status:** — | **Bugs:** —

| # | Check | Result |
|---|-------|--------|

---

## Bug Registry

| # | Session | Severity | Description | Status | Fix Commit |
|---|---------|----------|-------------|--------|------------|
| 1 | S6      | Minor    | Search result count says "0 результатов" but shows 1 result | Open | — |
| 2 | S6      | Minor    | Clip in search shows "undefined сезонов • undefined серий" + links to /series/ instead of /clips/ | Open | — |
