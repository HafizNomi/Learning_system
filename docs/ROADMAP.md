# Quran Tutor Platform — Project Roadmap

**Last updated:** 23 September 2026 (Phases 0, 3 and 4 complete)
**Branch:** `feat/tech-courses`
**Build order:** Phase 0 ✅ → Phase 3 ✅ → Phase 4 ✅ → **deploy next** (Phase 1)

This document explains, in plain language:

1. What this app actually does (the flow)
2. What is finished, what is half-finished, what is not started
3. What is broken right now
4. The step-by-step plan from here to a live website
5. How to edit courses, and where payments stand

Read section 1 first. Everything else makes sense after that.

---

## 1. What this app does — the full flow

Think of the app as a **pipeline**. A visitor goes in one end, and a paying, attending student comes out the other end.

```
  [1] Visitor browses courses
             |
  [2] Visitor fills the application form   <-- no account needed
             |
  [3] Admin reviews it and approves + picks a teacher
             |
  [4] A student login is created automatically
             |
  [5] Student pays the first month
             |
  [6] Admin/teacher schedules the classes
             |
  [7] Student and teacher join the video class
             |
  [8] Teacher marks attendance after each class
             |
  [9] Teacher writes a monthly progress report for the parent
```

Here is the honest status of each step:

| # | Step | Backend (API) | Frontend (screens) | Overall |
|---|------|---------------|--------------------|---------|
| 1 | Browse courses | ✅ Done | ✅ Done | ✅ **Working** |
| 2 | Apply for a course | ✅ Done | ✅ Done | ✅ **Working** |
| 3 | Admin approves + assigns teacher | ✅ Done | ✅ Done | ✅ **Working** |
| 4 | Student login auto-created | ✅ Done | — | 🟡 **No email sent yet** |
| 5 | Pay the monthly fee | 🟢 80% | ❌ Not started | 🟠 **Deferred by choice** |
| 6 | Schedule the classes | ✅ Done | ✅ Done | ✅ **Working** |
| 7 | Video class (Google Meet) | ✅ Done | ✅ Done | ✅ **Working** |
| 8 | Mark attendance | ✅ Done | ✅ Done | ✅ **Working** |
| 9 | Monthly report | ✅ Done | ✅ Done | ✅ **Working** |

**Plus: login / register / password reset / email verification — ✅ fully done.**

### What this means in practice

**The whole teaching pipeline now works.** A parent applies, an admin approves
and assigns a teacher, the admin generates a month of classes in one click, the
teacher pastes a Google Meet link, the student joins from their dashboard, the
teacher takes the register afterwards, and at month end writes a report the
parent can read.

Two things are deliberately left out:

- **Step 4** creates the student's login but does not email them the password.
  Until that is done, an admin has to send the password reset link by hand.
- **Step 5** (card payments) is parked on purpose — collect fees by bank
  transfer or JazzCash and mark them paid in the Django admin.

Login, registration, email verification and password reset sit alongside this
pipeline and are fully finished.

---

## 2. What we have built so far

### Backend (Django + Django REST Framework) — roughly 95% done

| App | What it holds | Status |
|-----|---------------|--------|
| `accounts` | Users, teachers, JWT login, email verification, password reset | ✅ **100%** — 46 tests pass |
| `courses` | The course catalogue | 🟢 **85%** — can list/read/create, but **cannot edit or delete via API** |
| `applications` | The apply form + admin approval | ✅ **100%** — finished in the last session |
| `scheduling` | Class sessions, timezone handling | ✅ **100%** — recurring generator, Meet links, join window |
| `attendance` | Present/absent + monthly summary | ✅ **100%** |
| `payments` | Stripe payment intents + webhook | 🟢 **80%** — webhook fixed; no frontend |
| `reports` | Monthly progress reports | ✅ **100%** — finalise bug fixed |

### Frontend (React + Vite + Redux Toolkit + Tailwind) — roughly 85% done

| Area | Status |
|------|--------|
| Login / Register / Forgot password / Verify email | ✅ **100%** |
| Token refresh, protected routes, role guards | ✅ **100%** |
| Course list + filters + course detail page | ✅ **100%** |
| Apply form + application status tracking | ✅ **100%** |
| Admin panel — applications review | ✅ **100%** |
| Admin panel — class scheduling | ✅ **100%** |
| Admin panel — courses, users, payments | ❌ **0%** |
| Student dashboard | ✅ **100%** — next class, calendar, attendance, reports |
| Teacher dashboard | ✅ **100%** — today's classes, Meet links, register, reports |
| Payments screens | ❌ **0%** — `PaymentModal.jsx` is 5 lines |
| Class calendar / schedule | ✅ **100%** |
| Attendance screens | ✅ **100%** |
| Reports screens | ✅ **100%** |

### Files that are still empty stubs

Only the payment screens remain, and those are deliberately deferred:

```
frontend/src/pages/PaymentPage.jsx                     (14 lines)
frontend/src/components/payments/PaymentModal.jsx      (5 lines)
frontend/src/components/payments/PaymentHistory.jsx    (5 lines)
frontend/src/redux/slices/paymentSlice.js              (no API calls)
```

Everything else that was a stub on 14 September is now built.

---

## 3. What was broken — all fixed ✅

Phase 0 is complete. Every item below was verified in the code, fixed, and
covered by a regression test so it cannot come back.

| # | Bug | Where | Status |
|---|-----|-------|--------|
| 1 | Stripe webhook 403'd every call from Stripe — money taken, DB never updated | `payments/views.py` | ✅ Fixed |
| 2 | Reports API crashed with `NameError` (`status` never imported) | `reports/views.py` | ✅ Fixed |
| 3 | Payment rows crashed the admin (`self.month` doesn't exist) | `payments/models.py` | ✅ Fixed |
| 4 | `IsAdminUser` refused your own `role='admin'` users | `scheduling/`, `courses/` | ✅ Fixed |
| 5 | No `STATIC_ROOT` — `collectstatic` failed | `settings.py` | ✅ Fixed |
| 6 | WhiteNoise installed but not in `MIDDLEWARE` | `settings.py` | ✅ Fixed |
| 7 | `CORS_ALLOW_ALL_ORIGINS = True` in production | `settings.py` | ✅ Fixed |
| 8 | No `frontend/.env.production` | `frontend/` | ✅ Fixed |

**Also fixed along the way:**

- The webhook is now **idempotent** — Stripe retries until it gets a 200, so the
  same event can arrive twice. A replay no longer re-activates anything.
- The webhook **refuses to run without `STRIPE_WEBHOOK_SECRET`** rather than
  trusting an unsigned payload that moves money.
- `print()` in the payment failure path replaced with real logging, plus a
  `LOGGING` config so `journalctl -u gunicorn` shows it.
- `Course` had no `Meta.ordering`, so paginated pages could repeat or skip
  courses. Fixed with a migration.
- `backend/.gitignore` had `/staticfiles/` with a leading slash, which anchored
  it to `backend/` — but the folder is at `backend/quran_platform/`. All 196
  generated files would have been committed.
- Deleted the dead `AppRoutes.jsx`, cleared the unused-import lint warnings.

**Test suite: 120 passing** (was 46 this morning). `manage.py check --deploy` is
clean apart from the development `SECRET_KEY`, which you replace at deploy time.

---

## 4. The roadmap — where you are

```
  ✅ Phase 0   Fix and harden                DONE
  ✅ Phase 3   Scheduling + Google Meet      DONE
  ✅ Phase 4   Attendance + reports          DONE
  ▶  Phase 1   Deploy                        2-4 days   <-- next
     Phase 2   Online payments               4-6 days
     Phase 5   Admin panel, part two         3-5 days
     Phase 6   Polish and grow               ongoing
```

Phase numbers keep their original names so they still match the rest of this
document — only the order changed.

---

### ✅ Phase 0 — Fix and harden — **COMPLETE**

All eight issues fixed plus five more found along the way. See section 3.

---

### ✅ Phase 3 — Scheduling and Google Meet — **COMPLETE**

**Backend**
- `POST /api/scheduling/generate/` — a whole run of classes in one call. Reads
  the days and time from the application, converts the family's local time to
  UTC, skips slots where the teacher is already booked and **reports which ones
  it skipped** rather than dropping them silently.
- `GET /api/scheduling/history/` and `/scheduling/<id>/` added.
- `is_joinable`, `join_opens_at` and `duration_minutes` on the session, so the
  frontend never has to guess when a class can be joined.
- Reschedule checks for clashes; cancelling requires a reason.
- `meeting_link` is now writable by the teacher, and validated — a pasted link
  without `https://` is repaired, a link to an unexpected host is refused.
- Database indexes on the three ways sessions are actually queried.

**Frontend**
- `useTimeZone.js` — the single place class times are formatted. Reads the
  signed-in user's saved timezone, falls back to the browser's. Also does
  "Today"/"Tomorrow" labels and the "in 2h 15m" countdown.
- `sessionSlice.js` — full thunks, replacing the 18-line stub.
- `SessionCard` — the Join button, which re-checks itself on a 30-second timer
  so a card left open goes live on its own.
- `SessionCalendar` — month view with dots on days that have classes.
- **Student dashboard** — next class with a countdown and a big Join button,
  upcoming/calendar/past tabs, attendance and course stats.
- **Teacher dashboard** — today's classes, and a prompt listing every class
  still missing a Meet link, because that is the one thing that stops a student
  attending.
- **Admin panel** — a "Schedule" action on each approved application, opening a
  form seeded from what the family asked for.

---

### ✅ Phase 4 — Attendance and reports — **COMPLETE**

**Backend**
- Admins can now take a register when a teacher cannot; the attendance row
  still credits the session's own teacher.
- Reports are paginated and filterable by student, month and year.
- **Parents only ever see finalised reports.** A draft is invisible to them.
- Fixed: `is_finalized` was missing from the field whitelist, so a report could
  never leave draft and **no parent would ever have seen one**.
- Attendance figures on a report are computed from the register and ignored if
  sent in the request — they can never disagree with the attendance record.

**Frontend**
- `attendanceSlice.js` and a new `reportSlice.js` (registered in the store).
- `AttendanceModal` — present/absent as the primary choice, with late, minutes
  attended and a performance rating; the rest of the form hides when the
  student was absent.
- `AttendanceSummary` — monthly percentage with a colour that changes as it
  drops, plus the class-by-class list.
- `ReportForm` — **switches its questions on the course category.** Quran
  courses are asked about surahs memorised and tajweed; tech courses about
  projects and skills. Save as draft, or finalise and send to the parent.
- `ReportCard` — the read view, shared by teacher and parent. The teacher gets
  an Edit button; the parent does not.

---

### ▶ Phase 1 — Deploy (2–4 days) — **NEXT**

Fully written up in **[DEPLOYMENT.md](./DEPLOYMENT.md)**. Phase 0 already did
every code change Part 1 of that guide asks for, so you can start at Part 2.

---

### Phase 2 — Online payments (4–6 days)

Manual bank-transfer payments cover you until then. See section 6.

---

### Phase 5 — Admin panel, part two (3–5 days)

Courses (needs new API endpoints first — see section 5), users, payments and
report approval, plus a dashboard with real numbers.

---

### Phase 6 — Polish and grow (ongoing)

Celery reminders, WhatsApp notifications, trial bookings, multi-currency,
Arabic and Urdu translation.

---

## 4b. Video classes with Google Meet

You chose Google Meet over Daily.co. Good reasons to: everyone already knows it,
it is free, it works on any phone, and no student has to install anything.

One thing to know up front: **Google Meet has no simple "give me a room" API**
the way Daily.co does. There are two realistic ways to do it.

### Option A — the teacher pastes the link (half a day)

The admin or teacher creates a Meet link at `meet.google.com/new` and pastes it
into the session. The `meeting_link` field already exists on `ClassSession`, so
this is a form field and a Join button.

- ✅ Works today, with any free Gmail account
- ✅ No Google Cloud project, no OAuth, no Workspace subscription
- ❌ Manual work for every recurring class
- ❌ No automatic calendar entry or reminder

### Option B — generate links via the Google Calendar API (2–3 days)

Create a Calendar event with `conferenceDataVersion=1`, and Google returns a
Meet link attached to it.

- ✅ Fully automatic
- ✅ **The class lands in the teacher's and parent's Google Calendar**, with
  Google's own reminders — this is the real prize, not the link itself
- ✅ Works with a **free Gmail account** using one-time OAuth consent plus a
  stored refresh token (a paid Workspace account is only needed for the
  service-account/domain-delegation route)
- ❌ Needs a Google Cloud project, OAuth credentials, and a consent screen
- ❌ Refresh tokens can be revoked and need re-authorising

### What was built: Option A

The teacher pastes the link. `MeetLinkModal.jsx` walks them through it:

1. Open `meet.google.com/new`
2. Copy the link
3. Paste and save

The link is validated (a missing `https://` is added, a link to an unexpected
host is refused), and the teacher dashboard shows a standing prompt listing
every class that still has no link.

### Upgrading to Option B later

Nothing built for A is thrown away. Both routes write to the same
`meeting_link` field on `ClassSession`, so the Join button, the session card
and both dashboards stay exactly as they are. Only `MeetLinkModal` is replaced
by a server-side call.

When you want it:

1. Create a Google Cloud project, enable the Calendar API
2. Create OAuth credentials and a consent screen
3. Sign in once as the account that will own the class calendar, store the
   refresh token
4. On session creation, POST a Calendar event with `conferenceDataVersion=1`
   and read the Meet link back out of `conferenceData`

---

## 5. How to edit a course

### Today — use the Django admin (this already works well)

1. Go to `http://localhost:8000/admin/` (or `https://yourdomain.com/admin/` once live)
2. Log in with a superuser account
   - To make one: `python manage.py createsuperuser`
3. Click **Courses**
4. Click any course title to edit it, or **Add Course** at the top right
5. You can change: title, category, level, description, price, class length, classes per week, thumbnail image, syllabus, active/inactive
6. Press **Save**

The change is live on the website immediately — no restart needed.

**Tip:** you do **not** have to delete a course. Untick **is_active** and it disappears from the public site but keeps all its history. `CourseListView` only returns `is_active=True` courses.

### Why can't I edit courses from the React admin panel?

Because the API does not allow it yet. `courses/urls.py` only has:

```
GET  /api/courses/          list
GET  /api/courses/<id>/     read one
POST /api/courses/create/   create
```

There is **no** `PATCH` (edit) and **no** `DELETE`. To manage courses from your own admin panel you need to add:

```python
# courses/views.py
class CourseUpdateView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdmin]
    lookup_field = 'id'
```

```python
# courses/urls.py
path('<uuid:id>/manage/', CourseUpdateView.as_view(), name='course-manage'),
```

Then build the screen in React. That is **Phase 5** work. Until then, the Django admin does the job perfectly well — there is no rush.

---

## 6. Payment integration — exact status

**Short answer: yes, it is still pending. It is about 40% done overall.**

### ✅ What exists

- `Payment` model with Stripe fields, month/year, status, receipt URL
- `POST /api/payments/create/` — creates a Stripe PaymentIntent and a pending Payment row
- `POST /api/payments/webhook/` — the handler that marks a payment as paid and sets the application to `active`
- `GET /api/payments/history/` — role-aware payment history
- `GET /api/payments/<id>/status/`
- `stripe==11.3.0` installed, `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` in `.env`

### ❌ What is missing

| Missing thing | Why it matters |
|---------------|----------------|
| The whole frontend | `PaymentModal.jsx` is 5 lines. A student literally cannot pay. |
| `@stripe/react-stripe-js` package | Without it you cannot render Stripe's card input in React |
| `STRIPE_WEBHOOK_SECRET` in `.env` | Webhook signature check fails → payments never confirmed |
| `AllowAny` on the webhook view | Stripe gets 403 → **money taken, database not updated** |
| An endpoint that gives React the publishable key | Otherwise you hardcode it, which breaks between test and live mode |
| Auto-creating classes after payment | There is a `TODO` comment in `handle_successful_payment` |
| Recurring monthly billing | Right now it is one-off payments only. Stripe Subscriptions would be better for a monthly tuition business. |

### A practical warning about Stripe in Pakistan

Stripe does not currently support Pakistani businesses directly. Before you invest days in this, check:

- Can you legally receive money through Stripe from your country?
- If not, plan for an alternative: **PayPal**, **Wise**, **Payoneer**, or local gateways (**JazzCash**, **EasyPaisa**, **SafePay**)
- The good news: the way the code is structured, the `Payment` model and the application flow stay the same. Only the "create a payment" and "confirm a payment" parts change. Swapping Stripe for SafePay is roughly 1–2 days of work, not a rewrite.

**My recommendation:** for the first version, add a **"manual payment"** option — the parent sends a bank/JazzCash transfer, uploads a screenshot, and the admin marks the payment as paid in the admin panel. That takes about 1 day instead of 6, works in every country, and lets you start earning while you sort out a card gateway.

---

## 7. Where Daily.co went

`@daily-co/daily-js` is still in `frontend/package.json` and `DAILY_API_KEY` is
still in `.env`. Neither is used by any code. Leave them for now — removing the
package is a one-line change if you settle on Google Meet for good, and keeping
it costs nothing while you are still deciding.

If you do commit to Google Meet permanently:

```bash
cd frontend && npm uninstall @daily-co/daily-js
```

and delete the `DAILY_API_KEY` line from `.env`.

---

## 8. Key files to know

| What you want to change | Where to look |
|-------------------------|---------------|
| Add/change an API endpoint | `backend/quran_platform/<app>/views.py` + `urls.py` |
| Change what an API returns | `backend/quran_platform/<app>/serializers.py` |
| Change the database shape | `backend/quran_platform/<app>/models.py`, then `makemigrations` + `migrate` |
| Who is allowed to do what | `backend/quran_platform/accounts/permissions.py` |
| Settings, keys, database | `backend/quran_platform/quran_platform/settings.py` + `.env` |
| The list of API URLs React calls | `frontend/src/api/endpoints.js` |
| Login token handling | `frontend/src/api/axios.js` + `authStorage.js` |
| App state (data shared between screens) | `frontend/src/redux/slices/*.js` |
| Page routes | `frontend/src/App.jsx` |
| Shared dropdown options / labels | `frontend/src/utils/constants.js` |
| Form validation rules | `frontend/src/utils/validation.js` |


https://claude.ai/code/artifact/d1658425-a571-4ba5-9957-9f13c8bbc1a7?sk=lveCXgBvbmrftYHwJ5GnZA