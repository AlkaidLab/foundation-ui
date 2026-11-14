# Help and folds: one rule

Decided 2026-11-09 after the group feedback of 2026-11-07/08 ("some rows have an info icon, some a fold; unify").

- **Help text sits behind an info icon** (`MInfo`). It opens on a mouse click, a tap or the keyboard, not on hover alone; it stays until the next press, Escape, a scroll or the focus leaving; the pointer leaving does not close what a press opened. Hover and keyboard focus still show it after a short delay.
- **A fold holds a group of rows** (`MExpander`: the 高级 expander of a page). It is never the help of one row.
- **The expert row** (`MExpertItem`, tier 3) follows the same rule: the control works in place, what it does, what it changes and the default are the row's help behind the info icon (one line each), a row that differs from the default has a 「Changed」 chip and a reset button.
- Every row, expert rows included, can be pinned to the overview (overflow button, long press, context menu); a tier 3 setting pins as a link to its page.
- A hint of one sentence is a `description` of a section or the `text` line of a row; more than that is help behind the icon.

Wheel rule: an inner scroller either sizes to its content or is the only scroller of its place. A control never takes the plain vertical wheel from the page: the smart stack turns on a sideways wheel (tilt, Shift + wheel), the dock row hands the wheel on to the page at either end.

Log viewer: the level filter opens on 「Info and above」; 「All levels (with debug)」 in the level menu shows the debug and verbose lines.
