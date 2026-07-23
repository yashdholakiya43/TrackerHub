STEP 1 PACE  ·  v3.2
USMLE Step 1 tracker for iPad / iPhone

════════════════════════════════════════════
THE 5 FILES
════════════════════════════════════════════

  step1-pace.html   Complete app, one file.
                    Works on its own.

  index.html   ┐
  app.js       ├─  Same app, split up.
  sw.js        ┘   Keep these 3 together
                   in one folder.

  README.txt        This file.

Use EITHER step1-pace.html on its own,
OR the three files together. Not a mix.

════════════════════════════════════════════
FASTEST — no internet, no upload
════════════════════════════════════════════

  1. Extract the zip on your iPad
  2. Open step1-pace.html in SAFARI
     (Files app -> tap -> Share -> Safari)
  3. Share button -> Add to Home Screen
  4. Done. Fullscreen, own icon, works offline.

Must be Safari. Chrome cannot add to
Home Screen on iOS.

════════════════════════════════════════════
IF YOU WANT THE UPDATE BUTTON
════════════════════════════════════════════

  1. Go to netlify.com/drop
  2. Drag in a folder containing
     index.html + app.js + sw.js
  3. Copy the URL it gives you
  4. Open that URL in Safari
     -> Add to Home Screen
  5. In the app: Plan tab -> paste the URL
     -> Save URL

  From then on: change the code, re-upload,
  tap "Update now". Logs stay untouched.

════════════════════════════════════════════
FIRST THING TO DO
════════════════════════════════════════════

Plan tab -> set your exam date.

Nothing calculates until that is filled in.
Every target, phase and deadline works
backwards from it.

════════════════════════════════════════════
WHAT'S NEW IN 3.2
════════════════════════════════════════════

  · Dark theme contrast fixed. All text now
    passes WCAG AA against the background.
    Labels, notes and dates were too dim
    before and are now clearly readable.

  · Last 5 days on the home page now has
    four states instead of three:

      Purple  beat the goal (115%+)
      Teal    goal met
      Amber   under goal
      Grey    nothing logged

    Each day shows the question count AND
    the percentage of goal, plus a summary
    line: how many of 5 days you hit, total
    questions, and daily average.

  · Backgrounds lifted so cards separate
    clearly from the page behind them.

  · Ambient glow toned down — it was washing
    out text underneath it.

════════════════════════════════════════════
THE FIVE TABS
════════════════════════════════════════════

HOME   Days to exam, today's target,
       progress bars with a vertical PACE
       marker, last 5 days, 14-day curve,
       insights, weekly summary, 35-day
       heatmap, streak, NBME snapshot

LOG    Questions, correct, pages, note.
       Per-system accuracy. Full history.

NBME   Scores, % correct, weak areas.
       Trajectory against your average.

WATCH  Timer + stopwatch for UWorld blocks,
       First Aid reading, and lectures.
       Hour goal, 14-day curve, 7-day split.

PLAN   Exam date, totals, phases, projection,
       cost of a rest day, backup, update.

════════════════════════════════════════════
YOUR DATA
════════════════════════════════════════════

Stored in the device's own storage, separate
from the app file. Survives updates, closing
the app, and restarts.

It does NOT survive: clearing Safari website
data, or deleting the Home Screen icon.

So export a backup now and then:
Plan -> Export (JSON) or Export CSV.
The app reminds you every 14 days.

Import merges by date. Nothing already
saved is lost unless the same date exists
in both files.

════════════════════════════════════════════
HOW THE PACE WORKS
════════════════════════════════════════════

First Aid and UWorld are paced to finish
25 days BEFORE the exam, leaving the last
stretch for NBMEs, incorrects, and rapid
review.

Daily target sits in the 30-60 band,
averaging around 40 — but if you fall
behind it shows the real number needed,
not a comfortable one.

Sketchy Micro and Boards & Beyond are not
paced. Log their time in the Watch tab.

════════════════════════════════════════════
PHASES
════════════════════════════════════════════

Run from 1 August 2026 to your finish date.

Four phases when the exam falls between
late October and end of December.
Three otherwise.

Anything logged before 1 July 2026 counts
as "earlier preparation" — included in your
totals, excluded from phase progress.

════════════════════════════════════════════
PER-SYSTEM TRACKING
════════════════════════════════════════════

Type a system name in the note field and
accuracy for it is tracked automatically:

  Cardio  Resp  Renal  GI  Neuro  Endo
  Repro  Heme  MSK  Psych  Micro  Immuno
  Biochem  Pharm  Path  Behavioral

Needs the Correct field filled in to show
accuracy. Log tab ranks your weakest
systems; Home flags the lowest one.

════════════════════════════════════════════
EDITING THE CODE
════════════════════════════════════════════

Text editor: Textastic or Koder on iPad,
VS Code on a computer.

  index.html   colours, fonts, spacing.
               All CSS variables sit at
               the very top of the file.
  app.js       everything else.

Constants near the top of app.js:

  UW_TOTAL      3657   UWorld questions
  FA_TOTAL      800    First Aid pages
  BUFFER_DAYS   25     finish-before margin
  PHASE_START   2026-08-01
  PRE_CUTOFF    2026-07-01

Most are also editable inside the app under
Plan, without touching any code.

To rebuild step1-pace.html after editing:
paste the whole contents of app.js in place
of this line in index.html

  <script src="app.js"></script>

wrapping it in <script> ... </script>,
then save the result as step1-pace.html.

════════════════════════════════════════════
TWO PEOPLE, ONE APP
════════════════════════════════════════════

Data is per-device, so you each keep your
own logs, exam date and phases with no
setup needed.

If you both want to change the CODE, host
at separate URLs. Same URL means whoever
uploads last overwrites the other's version.
Logs survive either way.
