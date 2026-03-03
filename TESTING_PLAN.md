# MoviePlatform — Production E2E Testing Plan v2

> **Target:** `http://89.108.66.37/`
> **Method:** Manual E2E via Playwright MCP browser tools
> **Date:** March 2026
> **Sessions:** 17 total

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

- React hydration error #418 (cosmetic, caused by browser extensions)
- `/api/v1/documents/terms` not implemented
- Content thumbnails are dark placeholders (no images in MinIO)
- SMTP not configured (emails won't send)
- `/api/v1/bonuses/balance` and `/api/v1/bonuses/statistics` return 500

### Design System Colors

```
Backgrounds:   #05060a (primary), #080b12 (secondary), #10131c (surface), #151824 (elevated)
Accents:       #c94bff (violet), #28e0c4 (turquoise), #ff6b5a (coral)
Text:          #f5f7ff (primary), #9ca2bc (secondary), #5a6072 (disabled)
Border:        #272b38
Gradient CTA:  #c94bff → #28e0c4
Age badges:    0+/6+ = #28E0C4, 12+ = #3B82F6, 16+ = #F97316, 18+ = #EF4444
```

### Viewports

| Name    | Size     | Sessions   |
| ------- | -------- | ---------- |
| Desktop | 1440x900 | S1–S14     |
| Mobile  | 390x844  | S15        |
| Tablet  | 768x1024 | S16        |
| Mixed   | All 3    | S17        |

### MCP Tool Reference

| Tool                     | Use For                                    |
| ------------------------ | ------------------------------------------ |
| `browser_resize`         | Set viewport dimensions                    |
| `browser_navigate`       | Go to URL                                  |
| `browser_snapshot`       | Accessibility tree (for verifying content) |
| `browser_take_screenshot`| Visual evidence (fullPage for scrollable)  |
| `browser_click`          | Click elements by ref                      |
| `browser_type`           | Type into inputs                           |
| `browser_fill_form`      | Fill multiple fields at once               |
| `browser_press_key`      | Keyboard actions (End, Escape, Tab)        |
| `browser_evaluate`       | Run JS (check colors, overflow, etc.)      |
| `browser_console_messages`| Check for errors                          |
| `browser_navigate_back`  | Go back in history                         |
| `browser_wait_for`       | Wait for text/time                         |

---

## Session Overview

| #  | Session                                         | Status  | Bugs | Date |
| -- | ----------------------------------------------- | ------- | ---- | ---- |
| 1  | Landing Page & Navigation                       | ⬜ TODO |      |      |
| 2  | Static Pages (About, Support, Pricing, Docs)    | ⬜ TODO |      |      |
| 3  | Authentication Flows                            | ⬜ TODO |      |      |
| 4  | Content Listings                                | ⬜ TODO |      |      |
| 5  | Content Detail & Search                         | ⬜ TODO |      |      |
| 6  | Dashboard & Watch Page                          | ⬜ TODO |      |      |
| 7  | Account Pages (9 sub-pages)                     | ⬜ TODO |      |      |
| 8  | Partner Program Pages                           | ⬜ TODO |      |      |
| 9  | Bonus System Pages                              | ⬜ TODO |      |      |
| 10 | Store Pages                                     | ⬜ TODO |      |      |
| 11 | Admin — Dashboard & Navigation                  | ⬜ TODO |      |      |
| 12 | Admin — Users, Content, Subs, Verifications     | ⬜ TODO |      |      |
| 13 | Admin — Finance, Partners, Store, Comms, System | ⬜ TODO |      |      |
| 14 | Minor User — Age Restrictions                   | ⬜ TODO |      |      |
| 15 | Mobile Responsive (390×844)                     | ⬜ TODO |      |      |
| 16 | Tablet Responsive (768×1024)                    | ⬜ TODO |      |      |
| 17 | Cross-Cutting Quality Audit                     | ⬜ TODO |      |      |

---

## SESSION 1: Landing Page & Navigation

**Viewport:** 1440×900 | **Auth:** None | **Page:** `/`

### Pre-conditions
- Browser resized to 1440×900
- No auth cookies

### Test Steps

| #    | Action                             | Expected Result                                                     | Pass? |
| ---- | ---------------------------------- | ------------------------------------------------------------------- | ----- |
| 1.1  | Navigate to `http://89.108.66.37/` | Page loads without errors                                           |       |
| 1.2  | Snapshot page                      | LandingNav: logo, nav links, "Войти" + "Регистрация" buttons       |       |
| 1.3  | Check console (level: error)       | Only hydration #418 allowed                                        |       |
| 1.4  | Evaluate: background color         | `document.body` bg is `rgb(5, 6, 10)` (#05060a)                    |       |
| 1.5  | Evaluate: no horizontal overflow   | `document.documentElement.scrollWidth <= window.innerWidth`         |       |
| 1.6  | Scroll to bottom (press End)       | All sections visible: Hero, Stats, ContentPreview, Features, CTA   |       |
| 1.7  | Snapshot bottom                    | LandingFooter with links visible                                   |       |
| 1.8  | Screenshot (fullPage)              | Visual evidence saved                                               |       |
| 1.9  | Click "Войти"                      | Navigates to `/login`                                               |       |
| 1.10 | Navigate back                      | Landing page loads                                                  |       |
| 1.11 | Click "Регистрация"                | Navigates to `/register`                                            |       |
| 1.12 | Navigate back                      | Landing page loads                                                  |       |

### UI/UX Quality Gate

| Check                                     | Pass? |
| ----------------------------------------- | ----- |
| Dark background `#05060a`                 |       |
| Gradient CTA buttons (violet→turquoise)   |       |
| No broken images                          |       |
| No horizontal overflow                    |       |
| ScrollReveal elements visible (not opacity:0) |   |
| Typography: headings bold, body readable  |       |
| Footer complete with all links            |       |
| All text in Russian                       |       |

### Screenshots
- `s1-landing-full.png` — full page screenshot

### Bugs Found
_None yet_

---

## SESSION 2: Static Public Pages

**Viewport:** 1440×900 | **Auth:** None

### Pre-conditions
- Browser at 1440×900
- No auth

### About (`/about`)

| #   | Action               | Expected Result                                             | Pass? |
| --- | -------------------- | ----------------------------------------------------------- | ----- |
| 2.1 | Navigate to `/about` | Page loads                                                  |       |
| 2.2 | Snapshot             | Badge "Платформа нового поколения", heading "О MoviePlatform" |     |
| 2.3 | Verify sections      | Mission card, 6 feature cards, contact section              |       |
| 2.4 | Screenshot           | Visual evidence saved                                       |       |

### Support (`/support`)

| #   | Action                                  | Expected Result                        | Pass? |
| --- | --------------------------------------- | -------------------------------------- | ----- |
| 2.5 | Navigate to `/support`                  | Heading "Поддержка"                    |       |
| 2.6 | Verify 3 contact cards                  | Email, Telegram, Время работы          |       |
| 2.7 | Click FAQ item                          | Answer expands with animation          |       |
| 2.8 | Click same FAQ again                    | Answer collapses                       |       |
| 2.9 | Screenshot                              | Visual evidence saved                  |       |

### Pricing (`/pricing`)

| #    | Action                        | Expected Result                                | Pass? |
| ---- | ----------------------------- | ---------------------------------------------- | ----- |
| 2.10 | Navigate to `/pricing`        | Page loads, plan cards visible                 |       |
| 2.11 | Verify tabs                   | "Premium" and "Отдельный контент" tabs present |       |
| 2.12 | Click "Отдельный контент" tab | Content switches to individual plans           |       |
| 2.13 | Check console                 | No crash from JSON.parse                       |       |
| 2.14 | Screenshot both tab states    | Visual evidence saved                          |       |

### Documents (`/documents`)

| #    | Action                   | Expected Result             | Pass? |
| ---- | ------------------------ | --------------------------- | ----- |
| 2.15 | Navigate to `/documents` | Document list or empty      |       |
| 2.16 | Screenshot               | Visual evidence saved       |       |

### UI/UX Quality Gate

| Check                             | Pass? |
| --------------------------------- | ----- |
| Card borders `#272b38` consistent |       |
| Accent colors for icons/badges    |       |
| FAQ expand/collapse smooth        |       |
| All text in Russian               |       |
| No crashes (pricing JSON parse)   |       |

### Screenshots
- `s2-about.png`
- `s2-support.png`
- `s2-pricing-premium.png`
- `s2-pricing-individual.png`
- `s2-documents.png`

### Bugs Found
_None yet_

---

## SESSION 3: Authentication Flows

**Viewport:** 1440×900 | **Pages:** `/login`, `/register`, `/forgot-password`

### Pre-conditions
- Not logged in
- Browser at 1440×900

### Login Validation

| #   | Action                                    | Expected Result                                     | Pass? |
| --- | ----------------------------------------- | --------------------------------------------------- | ----- |
| 3.1 | Navigate to `/login`                      | "Вход в аккаунт" form with email + password         |       |
| 3.2 | Submit empty form                         | Validation messages in Russian                      |       |
| 3.3 | Enter "notanemail" in email               | Email validation error                              |       |
| 3.4 | Enter wrong@email.com / wrongpass, submit | Error toast (NOT silent redirect)                   |       |
| 3.5 | Toggle password visibility                | Eye icon toggles show/hide                          |       |

### Valid Login

| #   | Action                                   | Expected Result                                | Pass? |
| --- | ---------------------------------------- | ---------------------------------------------- | ----- |
| 3.6 | Enter user@movieplatform.local / user123 | Form accepts input                             |       |
| 3.7 | Click "Войти"                            | Loading spinner, then redirect to `/dashboard` |       |
| 3.8 | Verify auth state                        | Avatar in header, sidebar with user groups     |       |

### Auth Guards

| #    | Action                          | Expected Result                        | Pass? |
| ---- | ------------------------------- | -------------------------------------- | ----- |
| 3.9  | Navigate to `/login` while in   | Redirect away (auth guard)             |       |
| 3.10 | Navigate to `/account`          | Should stay (authenticated)            |       |

### Logout

| #    | Action                   | Expected Result                        | Pass? |
| ---- | ------------------------ | -------------------------------------- | ----- |
| 3.11 | Click "Выйти"            | Redirect to `/` or `/login`            |       |
| 3.12 | Navigate to `/account`   | Redirect to `/login?redirect=/account` |       |

### Register & Forgot Password

| #    | Action                         | Expected Result                           | Pass? |
| ---- | ------------------------------ | ----------------------------------------- | ----- |
| 3.13 | Navigate to `/register`        | Registration form visible (DO NOT submit) |       |
| 3.14 | Navigate to `/forgot-password` | Email input form (DO NOT submit)          |       |
| 3.15 | Screenshot both                | Visual evidence saved                     |       |

### UI/UX Quality Gate

| Check                              | Pass? |
| ---------------------------------- | ----- |
| Form inputs 48px+ height           |       |
| Error messages in Russian          |       |
| Loading spinner on submit          |       |
| Password visibility toggle works   |       |
| "Забыли пароль?" link visible      |       |
| "Зарегистрироваться" link visible  |       |

### Screenshots
- `s3-login.png`
- `s3-register.png`
- `s3-forgot-password.png`

### Bugs Found
_None yet_

---

## SESSION 4: Content Listings

**Viewport:** 1440×900 | **Auth:** User

### Pre-conditions
- Logged in as `user@movieplatform.local`
- Browser at 1440×900

### Series (`/series`)

| #   | Action                           | Expected Result                                      | Pass? |
| --- | -------------------------------- | ---------------------------------------------------- | ----- |
| 4.1 | Navigate to `/series`            | Heading "Сериалы", item count, sort dropdown, grid   |       |
| 4.2 | Click "Фильтры"                  | Filter sidebar: age ratings (0+, 6+, 12+, 16+, 18+) |       |
| 4.3 | Change sort to "По популярности" | Grid reloads                                         |       |
| 4.4 | Toggle grid/list view            | View switches                                        |       |
| 4.5 | Screenshot                       | Visual evidence saved                                |       |

### Clips (`/clips`)

| #   | Action               | Expected Result               | Pass? |
| --- | -------------------- | ----------------------------- | ----- |
| 4.6 | Navigate to `/clips` | Heading "Клипы", content grid |       |
| 4.7 | Verify filters       | Same filter functionality     |       |
| 4.8 | Screenshot           | Visual evidence saved         |       |

### Shorts (`/shorts`)

| #    | Action                | Expected Result                  | Pass? |
| ---- | --------------------- | -------------------------------- | ----- |
| 4.9  | Navigate to `/shorts` | Heading "Шортсы", content grid   |       |
| 4.10 | Screenshot            | Visual evidence saved            |       |

### Tutorials (`/tutorials`)

| #    | Action                   | Expected Result                    | Pass? |
| ---- | ------------------------ | ---------------------------------- | ----- |
| 4.11 | Navigate to `/tutorials` | Heading "Обучение", content grid   |       |
| 4.12 | Screenshot               | Visual evidence saved              |       |

### UI/UX Quality Gate

| Check                                      | Pass? |
| ------------------------------------------ | ----- |
| Age badges correct colors per category     |       |
| Skeleton loading before content            |       |
| Grid: 5 cols no filter, 4 cols with filter |       |
| Cards: rounded corners, dark surface       |       |
| No layout shift on load                    |       |

### Screenshots
- `s4-series.png`
- `s4-clips.png`
- `s4-shorts.png`
- `s4-tutorials.png`

### Bugs Found
_None yet_

---

## SESSION 5: Content Detail & Search

**Viewport:** 1440×900 | **Auth:** User

### Pre-conditions
- Logged in as user
- Browser at 1440×900

### Detail Pages

| #   | Action                              | Expected Result                                        | Pass? |
| --- | ----------------------------------- | ------------------------------------------------------ | ----- |
| 5.1 | From `/series`, click first card    | Detail page: title, description, thumbnail, age badge  |       |
| 5.2 | Verify layout                       | No overlapping elements, clean typography              |       |
| 5.3 | Navigate back                       | Returns to series listing                              |       |
| 5.4 | `/clips` → click first clip         | Clip detail page loads                                 |       |
| 5.5 | `/shorts` → click first short       | Short detail page loads                                |       |
| 5.6 | `/tutorials` → click first tutorial | Tutorial detail page loads                             |       |
| 5.7 | Screenshot each detail page         | Visual evidence saved                                  |       |

### Search (`/search`)

| #   | Action                 | Expected Result                           | Pass? |
| --- | ---------------------- | ----------------------------------------- | ----- |
| 5.8 | Navigate to `/search`  | Search input visible with placeholder     |       |
| 5.9 | Verify filters         | Type, category, age, year, sort dropdowns |       |
| 5.10| Type "тест" and submit | Results or "nothing found"                |       |
| 5.11| Screenshot             | Visual evidence saved                     |       |

### UI/UX Quality Gate

| Check                               | Pass? |
| ----------------------------------- | ----- |
| Detail page metadata readable       |       |
| Age badges match design system      |       |
| Watch/subscribe CTA visible         |       |
| Search filters functional           |       |

### Screenshots
- `s5-series-detail.png`
- `s5-clip-detail.png`
- `s5-short-detail.png`
- `s5-tutorial-detail.png`
- `s5-search.png`

### Bugs Found
_None yet_

---

## SESSION 6: Dashboard & Watch Page

**Viewport:** 1440×900 | **Auth:** User

### Pre-conditions
- Logged in as user
- Browser at 1440×900

### Dashboard (`/dashboard`)

| #   | Action                        | Expected Result                                       | Pass? |
| --- | ----------------------------- | ----------------------------------------------------- | ----- |
| 6.1 | Navigate to `/dashboard`      | DashboardHero visible (or skeleton)                   |       |
| 6.2 | Verify content rows           | DashboardRows with "Смотреть все" links               |       |
| 6.3 | Verify sidebar                | Groups: МЕНЮ, БИБЛИОТЕКА, МАГАЗИН, АККАУНТ, ПАРТНЁРАМ |       |
| 6.4 | Verify header                 | Search bar, cart badge, notification bell, avatar     |       |
| 6.5 | Click "Смотреть все" on a row | Navigates to relevant listing page                    |       |
| 6.6 | Screenshot                    | Visual evidence saved                                 |       |

### Watch Page

| #   | Action                          | Expected Result                  | Pass? |
| --- | ------------------------------- | -------------------------------- | ----- |
| 6.7 | Click content item → watch page | Video player area loads          |       |
| 6.8 | If 403 (no subscription)        | Subscription prompt shown        |       |
| 6.9 | If content loads                | Title + description below player |       |
| 6.10| Check console                   | No errors beyond hydration #418  |       |
| 6.11| Screenshot                      | Visual evidence saved            |       |

### UI/UX Quality Gate

| Check                              | Pass? |
| ---------------------------------- | ----- |
| Hero section styled correctly      |       |
| Content rows with horizontal scroll|       |
| Sidebar groups collapse/expand     |       |
| Header sticky with blur            |       |

### Screenshots
- `s6-dashboard.png`
- `s6-watch.png`

### Bugs Found
_None yet_

---

## SESSION 7: Account Pages (All 9)

**Viewport:** 1440×900 | **Auth:** User

### Pre-conditions
- Logged in as user
- Browser at 1440×900

### Test Each Page

| #   | Page                     | Key Verifications                                      | Pass? |
| --- | ------------------------ | ------------------------------------------------------ | ----- |
| 7.1 | `/account`               | Profile header, 4 stats cards, quick links grid        |       |
| 7.2 | `/account/profile`       | Edit form (name, email, avatar, phone) — DO NOT modify |       |
| 7.3 | `/account/settings`      | Notification prefs, security settings                  |       |
| 7.4 | `/account/subscriptions` | Active sub or "no subscription" state                  |       |
| 7.5 | `/account/payments`      | Payment history or empty                               |       |
| 7.6 | `/account/history`       | Watch history or empty                                 |       |
| 7.7 | `/account/watchlist`     | Saved content or empty                                 |       |
| 7.8 | `/account/notifications` | Notification list with type tabs                       |       |
| 7.9 | `/account/verification`  | Verification status and instructions                   |       |

### Navigation

| #    | Action                  | Expected Result                    | Pass? |
| ---- | ----------------------- | ---------------------------------- | ----- |
| 7.10 | Click each sidebar item | Page changes, active item highlights|      |
| 7.11 | Screenshot each page    | Visual evidence saved              |       |

### UI/UX Quality Gate

| Check                               | Pass? |
| ----------------------------------- | ----- |
| Account sidebar w-60 with user card |       |
| Active nav highlighted              |       |
| Empty states have icons + messages  |       |
| Stats cards distinct accent colors  |       |

### Screenshots
- `s7-account-dashboard.png`
- `s7-account-profile.png`
- `s7-account-settings.png`
- `s7-account-subscriptions.png`
- `s7-account-payments.png`
- `s7-account-history.png`
- `s7-account-watchlist.png`
- `s7-account-notifications.png`
- `s7-account-verification.png`

### Bugs Found
_None yet_

---

## SESSION 8: Partner Program Pages

**Viewport:** 1440×900 | **Auth:** Partner

### Pre-conditions
- Logged in as `partner@movieplatform.local`
- Browser at 1440×900

### Test Each Page

| #   | Page                       | Key Verifications                                            | Pass? |
| --- | -------------------------- | ------------------------------------------------------------ | ----- |
| 8.1 | `/partner`                 | "Партнёрская программа", stats grid, level card, invite card |       |
| 8.2 | `/partner/referrals`       | Referral list or empty                                       |       |
| 8.3 | `/partner/commissions`     | Commissions table or empty                                   |       |
| 8.4 | `/partner/withdrawals`     | Withdrawals list or empty                                    |       |
| 8.5 | `/partner/withdrawals/new` | Withdrawal form (DO NOT submit)                              |       |
| 8.6 | `/partner/invite`          | Invite page with referral link                               |       |

### Critical Normalization Checks

| #   | Check           | Expected                          | Pass? |
| --- | --------------- | --------------------------------- | ----- |
| 8.7 | Level display   | Shows level name (e.g. "Бронза"), NOT raw number "1" |       |
| 8.8 | Balance display | No NaN, proper ₽ formatting      |       |
| 8.9 | Referral code   | Displayed in monospace font       |       |

### UI/UX Quality Gate

| Check                              | Pass? |
| ---------------------------------- | ----- |
| Stats cards with accent colors     |       |
| Level badge styled correctly       |       |
| Commission status badges colored   |       |
| All text in Russian                |       |

### Screenshots
- `s8-partner-dashboard.png`
- `s8-partner-referrals.png`
- `s8-partner-commissions.png`
- `s8-partner-withdrawals.png`
- `s8-partner-invite.png`

### Bugs Found
_None yet_

---

## SESSION 9: Bonus System Pages

**Viewport:** 1440×900 | **Auth:** User

### Pre-conditions
- Logged in as user
- Browser at 1440×900

### Test Pages

| #   | Page                | Key Verifications                                                     | Pass? |
| --- | ------------------- | --------------------------------------------------------------------- | ----- |
| 9.1 | `/bonuses`          | "Мои бонусы", balance card (may show error gracefully), earning methods|      |
| 9.2 | `/bonuses/history`  | Transaction history or error/empty                                    |       |
| 9.3 | `/bonuses/withdraw` | Withdrawal form (DO NOT submit)                                       |       |

### Error Handling

| #   | Check            | Expected                                    | Pass? |
| --- | ---------------- | ------------------------------------------- | ----- |
| 9.4 | API 500 response | Graceful error message, NOT white screen    |       |
| 9.5 | Console check    | 500 logged but no unhandled exception/crash |       |

### UI/UX Quality Gate

| Check                              | Pass? |
| ---------------------------------- | ----- |
| Error states styled, not raw text  |       |
| Balance card visible even on error |       |
| All text in Russian                |       |

### Screenshots
- `s9-bonuses.png`
- `s9-bonuses-history.png`
- `s9-bonuses-withdraw.png`

### Bugs Found
_None yet_

---

## SESSION 10: Store Pages

**Viewport:** 1440×900 | **Auth:** User

### Pre-conditions
- Logged in as user
- Browser at 1440×900

### Test Store Flow

| #    | Page / Action       | Expected Result                                          | Pass? |
| ---- | ------------------- | -------------------------------------------------------- | ----- |
| 10.1 | `/store`            | "Магазин", search, sort, filters, product grid           |       |
| 10.2 | Click "Фильтры"     | StoreFilters sidebar (categories, price, stock)          |       |
| 10.3 | Change sort         | Products reload                                          |       |
| 10.4 | Click product card  | `/store/[slug]` detail: image, title, price, add-to-cart |       |
| 10.5 | `/store/cart`       | Cart items or empty state                                |       |
| 10.6 | `/store/checkout`   | Step indicator, shipping form (DO NOT submit)            |       |
| 10.7 | `/store/orders`     | Order history or empty                                   |       |
| 10.8 | CartBadge in header | Click opens CartDrawer from right                        |       |

### UI/UX Quality Gate

| Check                              | Pass? |
| ---------------------------------- | ----- |
| Product cards with proper images   |       |
| Price formatting with ₽            |       |
| CartDrawer slides from right       |       |
| Empty cart state styled            |       |

### Screenshots
- `s10-store.png`
- `s10-product-detail.png`
- `s10-cart.png`
- `s10-checkout.png`
- `s10-orders.png`

### Bugs Found
_None yet_

---

## SESSION 11: Admin — Dashboard & Navigation

**Viewport:** 1440×900 | **Auth:** Admin

### Pre-conditions
- Logged in as `admin@movieplatform.local`
- Browser at 1440×900

### Test Admin Dashboard

| #    | Page / Action              | Expected Result                              | Pass? |
| ---- | -------------------------- | -------------------------------------------- | ----- |
| 11.1 | `/admin/dashboard`         | "Панель управления", 4 stats cards, 2 charts |       |
| 11.2 | Verify charts              | Revenue + user growth area charts render     |       |
| 11.3 | "Требуют внимания" section | Action cards visible                         |       |
| 11.4 | "Последние транзакции"     | Transaction table visible                    |       |
| 11.5 | Admin sidebar groups       | 8 groups, collapse/expand works              |       |
| 11.6 | `/admin/reports`           | Charts and analytics render                  |       |

### Admin Sidebar Groups (Expected 8)

| Group         | Key Items                                |
| ------------- | ---------------------------------------- |
| ОБЗОР         | Дашборд, Отчёты                          |
| ПОЛЬЗОВАТЕЛИ  | Пользователи, Верификации                |
| КОНТЕНТ       | Контент, Подписки                        |
| ФИНАНСЫ       | Платежи                                  |
| ПАРТНЁРЫ      | Партнёры, Комиссии, Выводы               |
| МАГАЗИН       | Товары, Заказы                           |
| КОММУНИКАЦИИ  | Рассылки, Документы                      |
| СИСТЕМА       | Аудит, Настройки                         |

### UI/UX Quality Gate

| Check                                | Pass? |
| ------------------------------------ | ----- |
| Charts render (not stuck on skeleton)|       |
| Stats cards with correct icons       |       |
| Admin sidebar distinct from user     |       |
| All text in Russian                  |       |

### Screenshots
- `s11-admin-dashboard.png`
- `s11-admin-sidebar.png`
- `s11-admin-reports.png`

### Bugs Found
_None yet_

---

## SESSION 12: Admin — Users, Content, Subs, Verifications

**Viewport:** 1440×900 | **Auth:** Admin

### Pre-conditions
- Logged in as admin
- Browser at 1440×900

### Test CRUD Pages

| #    | Page                   | Key Verifications                                   | Pass? |
| ---- | ---------------------- | --------------------------------------------------- | ----- |
| 12.1 | `/admin/users`         | User table with search/filter                       |       |
| 12.2 | Click user row         | `/admin/users/[id]` — user detail                   |       |
| 12.3 | `/admin/verifications` | Verifications list or empty                         |       |
| 12.4 | `/admin/content`       | Content table with type/status filters              |       |
| 12.5 | `/admin/content/new`   | Creation form (DO NOT submit)                       |       |
| 12.6 | Click content item     | `/admin/content/[id]` — edit form with video status |       |
| 12.7 | `/admin/subscriptions` | Subscription plan management                        |       |

### UI/UX Quality Gate

| Check                              | Pass? |
| ---------------------------------- | ----- |
| DataTables sortable and filterable |       |
| Pagination works                   |       |
| Search debounced                   |       |
| Forms have proper labels           |       |

### Screenshots
- `s12-admin-users.png`
- `s12-admin-user-detail.png`
- `s12-admin-content.png`
- `s12-admin-content-new.png`
- `s12-admin-subscriptions.png`

### Bugs Found
_None yet_

---

## SESSION 13: Admin — Remaining Pages (13 pages)

**Viewport:** 1440×900 | **Auth:** Admin

### Pre-conditions
- Logged in as admin
- Browser at 1440×900

### Quick-Check Each Page

| #     | Page                          | Key Verifications      | Pass? |
| ----- | ----------------------------- | ---------------------- | ----- |
| 13.1  | `/admin/payments`             | Payments table         |       |
| 13.2  | `/admin/partners`             | Partners list          |       |
| 13.3  | `/admin/partners/commissions` | Commissions management |       |
| 13.4  | `/admin/partners/withdrawals` | Withdrawals management |       |
| 13.5  | `/admin/bonuses`              | Bonuses overview       |       |
| 13.6  | `/admin/bonuses/campaigns`    | Campaigns management   |       |
| 13.7  | `/admin/bonuses/rates`        | Rates management       |       |
| 13.8  | `/admin/store/products`       | Products table         |       |
| 13.9  | `/admin/store/orders`         | Orders table           |       |
| 13.10 | `/admin/newsletters`          | Newsletter management  |       |
| 13.11 | `/admin/documents`            | Documents CRUD         |       |
| 13.12 | `/admin/audit`                | Audit log              |       |
| 13.13 | `/admin/settings`             | Settings page          |       |

### UI/UX Quality Gate

| Check                              | Pass? |
| ---------------------------------- | ----- |
| All pages load without crash       |       |
| Tables have proper structure       |       |
| Console: only hydration #418      |       |

### Screenshots
- One per page (13 total)

### Bugs Found
_None yet_

---

## SESSION 14: Minor User — Age Restrictions

**Viewport:** 1440×900 | **Auth:** Minor

### Pre-conditions
- Logged in as `minor@movieplatform.local`
- Browser at 1440×900

### Test Age Filtering

| #    | Action                          | Expected Result                              | Pass? |
| ---- | ------------------------------- | -------------------------------------------- | ----- |
| 14.1 | Login as minor                  | Successful login, redirect to dashboard      |       |
| 14.2 | Navigate to `/series`           | Only age-appropriate content visible         |       |
| 14.3 | Navigate to `/clips`            | Only age-appropriate content visible         |       |
| 14.4 | Navigate to `/shorts`           | Only age-appropriate content visible         |       |
| 14.5 | Navigate to `/tutorials`        | Only age-appropriate content visible         |       |
| 14.6 | Try accessing 18+ content URL   | Access denied or content not shown           |       |
| 14.7 | Navigate to `/account`          | Profile shows minor status                   |       |
| 14.8 | Check content cards             | No 16+ or 18+ age badges visible            |       |
| 14.9 | Screenshot                      | Visual evidence saved                        |       |

### UI/UX Quality Gate

| Check                                    | Pass? |
| ---------------------------------------- | ----- |
| Age filtering enforced on all listings   |       |
| No adult content visible                 |       |
| Dashboard shows only appropriate content |       |

### Screenshots
- `s14-minor-series.png`
- `s14-minor-dashboard.png`

### Bugs Found
_None yet_

---

## SESSION 15: Mobile Responsive (390×844)

**Viewport:** 390×844

### Pre-conditions
- Browser resized to 390×844

### Public Pages (Unauthenticated)

| #    | Page          | Mobile Verifications                                  | Pass? |
| ---- | ------------- | ----------------------------------------------------- | ----- |
| 15.1 | `/` (landing) | Nav collapsed, hero stacks, 2-col grid, no h-overflow |       |
| 15.2 | `/login`      | Full-width form, 48px+ inputs                         |       |
| 15.3 | `/register`   | Full-width form                                       |       |
| 15.4 | `/pricing`    | Cards stack vertically                                |       |
| 15.5 | `/about`      | Cards stack to 1-col                                  |       |
| 15.6 | `/support`    | Contact cards stack, FAQ touch-friendly               |       |

### Authenticated Pages (Login as user)

| #     | Page / Action                | Mobile Verifications                             | Pass? |
| ----- | ---------------------------- | ------------------------------------------------ | ----- |
| 15.7  | `/dashboard`                 | Sidebar hidden, bottom nav visible (5 items)     |       |
| 15.8  | Tap hamburger                | Sidebar slides from left                         |       |
| 15.9  | Tap overlay                  | Sidebar closes                                   |       |
| 15.10 | `/series`                    | 2-col cards, filters in Sheet overlay            |       |
| 15.11 | `/account`                   | Mobile tabs (h-scroll), 2-col stats              |       |
| 15.12 | `/account/profile`           | Full-width form                                  |       |
| 15.13 | `/store`                     | 2-col products                                   |       |

### Partner Pages (Login as partner)

| #     | Page                    | Mobile Verifications             | Pass? |
| ----- | ----------------------- | -------------------------------- | ----- |
| 15.14 | `/partner`              | 1-col stats, full-width invite   |       |

### Mobile Quality Gate

| Check                                                    | Pass? |
| -------------------------------------------------------- | ----- |
| No horizontal scrollbar (evaluate scrollWidth check)     |       |
| Touch targets ≥ 48px                                     |       |
| Text readable without zoom                               |       |
| Images scale properly                                    |       |
| Bottom nav visible on main pages                         |       |
| Bottom nav hidden on watch pages                         |       |

### Screenshots
- `s15-mobile-landing.png`
- `s15-mobile-login.png`
- `s15-mobile-dashboard.png`
- `s15-mobile-series.png`
- `s15-mobile-account.png`
- `s15-mobile-partner.png`

### Bugs Found
_None yet_

---

## SESSION 16: Tablet Responsive (768×1024)

**Viewport:** 768×1024

### Pre-conditions
- Browser resized to 768×1024

### Spot-Check Key Pages

| #    | Page               | Verifications                   | Pass? |
| ---- | ------------------ | ------------------------------- | ----- |
| 16.1 | `/dashboard` (user)| Sidebar visible, content adapts |       |
| 16.2 | `/series`          | ~3-col grid                     |       |
| 16.3 | `/account`         | Horizontal tabs                 |       |
| 16.4 | `/admin/dashboard` | Admin sidebar visible           |       |
| 16.5 | `/store`           | ~3-col product grid             |       |

### Tablet Quality Gate

| Check                              | Pass? |
| ---------------------------------- | ----- |
| No horizontal overflow             |       |
| Sidebar adapts to tablet width     |       |
| Content grid responsive            |       |
| Forms usable at tablet size        |       |

### Screenshots
- `s16-tablet-dashboard.png`
- `s16-tablet-series.png`
- `s16-tablet-account.png`
- `s16-tablet-admin.png`
- `s16-tablet-store.png`

### Bugs Found
_None yet_

---

## SESSION 17: Cross-Cutting Quality Audit

**Viewport:** 1440×900 (primary), all 3 for final screenshots

### Pre-conditions
- Browser at 1440×900

### Error Pages

| #    | Test                        | Expected                               | Pass? |
| ---- | --------------------------- | -------------------------------------- | ----- |
| 17.1 | `/nonexistent-page`         | 404 error page with gradient "404"     |       |
| 17.2 | `/account` while logged out | Redirect to `/login?redirect=/account` |       |

### Console Audit (5 Key Pages)

| #    | Page       | Expected Errors        | Pass? |
| ---- | ---------- | ---------------------- | ----- |
| 17.3 | Landing    | Only hydration #418    |       |
| 17.4 | Dashboard  | Only hydration #418    |       |
| 17.5 | Account    | Only hydration #418    |       |
| 17.6 | Admin      | Only hydration #418    |       |
| 17.7 | Store      | Only hydration #418    |       |

### Design System Compliance

| #     | Check                                                    | Pass? |
| ----- | -------------------------------------------------------- | ----- |
| 17.8  | Dark backgrounds match design system                     |       |
| 17.9  | Accent colors: violet for actions, turquoise for success |       |
| 17.10 | Border color `#272b38`                                   |       |
| 17.11 | Text hierarchy (primary #f5f7ff, secondary #9ca2bc)      |       |
| 17.12 | Button hover states present                              |       |
| 17.13 | Loading spinners on async actions                        |       |
| 17.14 | Card border-radius consistent (rounded-xl)               |       |
| 17.15 | Typography: Inter font, correct weights                  |       |
| 17.16 | Sticky header with blur effect                           |       |
| 17.17 | All text in Russian                                      |       |
| 17.18 | Page transitions smooth                                  |       |

### Final Screenshots (All 3 Viewports)

| Page      | Desktop | Mobile | Tablet |
| --------- | ------- | ------ | ------ |
| Landing   |         |        |        |
| Dashboard |         |        |        |
| Account   |         |        |        |
| Admin     |         |        |        |
| Store     |         |        |        |

### Bugs Found
_None yet_

---

## Bug Tracker

| #   | Session | Severity | Page | Description | Fix Commit | Status |
| --- | ------- | -------- | ---- | ----------- | ---------- | ------ |
|     |         |          |      |             |            |        |

### Severity Levels

- **Critical:** Crash, security issue, data loss → fix immediately
- **Major:** Feature broken, layout destroyed → fix before next session
- **Minor:** Visual glitch, alignment off → batch fix
- **Cosmetic:** Polish, slight color mismatch → low priority

---

## Bug-Fix-Deploy Workflow

### 1. Document the Bug

```
URL:        [page URL]
Viewport:   [size]
User:       [role/email]
Steps:      [1. ... 2. ... 3. ...]
Expected:   [what should happen]
Actual:     [what happened]
Screenshot: [filename]
Console:    [errors]
```

### 2. Classify Severity

See severity levels above.

### 3. Fix & Deploy

```bash
# Fix code locally
git add [files]
git commit -m "fix(web): [description]"
git push origin main

# Deploy to production
ssh root@89.108.66.37
cd /root/MoviePlatform
git pull origin main
docker compose -f docker-compose.prod.yml build web  # or api
docker compose -f docker-compose.prod.yml up -d web   # or api
systemctl restart nginx  # REQUIRED after container recreate
```

### 4. Verify Fix

Re-run failed test steps, check no regressions introduced.

---

## Final Verification Checklist

After all 17 sessions:

- [ ] All 17 sessions completed with pass/fail documented
- [ ] All Critical/Major bugs fixed and deployed
- [ ] Final screenshots at all 3 viewports stored
- [ ] TESTING_PLAN.md fully updated with results
- [ ] Summary report written with total pass/fail counts
- [ ] Console clean on all key pages (only hydration #418)

---

## Summary Report

_To be filled after all sessions complete_

### Results

| Metric            | Count |
| ----------------- | ----- |
| Sessions Complete |  / 17 |
| Tests Passed      |       |
| Tests Failed      |       |
| Bugs Found        |       |
| Bugs Fixed        |       |
| Bugs Remaining    |       |

### Critical Issues
_None yet_

### Recommendations
_None yet_
