# DESIGN_SYSTEM.md: ReleaseCheck

This describes the visual design for the ReleaseCheck web app. It is based on the mockup screenshot (releases list and add/update release screens). Keep it simple: the mockup is plain on purpose, so do not add decoration.

**Note on colours and sizes:** the values below are estimates read from the screenshot, not exact values from the design file. Use them as the starting point, and adjust by eye against the mockup if something looks off.

## 1. Principles

- Plain and functional. White panels on a light background, one accent colour, no icons beyond the ones in the mockup.
- Information first. Tables and forms should be easy to scan.
- Consistent. Every page uses the same header, the same card, and the same buttons.

## 2. Colour tokens

Define these as CSS custom properties on `:root`.

| Token | Value (estimate) | Used for |
|---|---|---|
| `--color-page-bg` | `#F1F4F8` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, table background, inputs |
| `--color-border` | `#D0D5DD` | Card and table borders, input borders |
| `--color-text` | `#1F2937` | Headings, body text, table text |
| `--color-text-muted` | `#6B7280` | Subtitle, placeholder text, column headers |
| `--color-accent` | `#6C5CE7` | Primary buttons, links, focus ring |
| `--color-accent-text` | `#FFFFFF` | Text on primary buttons |
| `--color-danger` | `#DC2626` | Delete button hover and error text |
| `--color-banner-bg` | `#EEF2FF` | Change banner background |

The mockup's "Delete" button is also purple. Keep it purple, and use `--color-danger` only on hover or for error messages.

## 3. Typography

- **Font:** a plain sans-serif system stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- **App title ("ReleaseCheck"):** bold, about 28px, centred.
- **Subtitle ("Your all-in-one release checklist tool"):** regular, about 14px, `--color-text-muted`, centred.
- **Card heading and breadcrumb:** about 14px. The current crumb is muted.
- **Table header:** bold, about 13px.
- **Table body, labels, checkboxes:** about 14px.
- **Buttons:** medium weight, about 14px.
- **Field labels:** about 12px, `--color-text`, above the input.

## 4. Spacing and layout

- Page padding: 24px on each side. On mobile, 16px.
- Title block sits at the top, with about 32px before the first card.
- Cards: white background, 1px `--color-border`, 4px border radius, no shadow.
- Card inner padding: 16px. Card header bar (breadcrumb and button row) has the same padding and a bottom border.
- Gap between fields: 16px. Gap between checklist rows: 8px.
- Maximum content width: about 900px, centred. The list and the form use the same width.

## 5. Components

### Page header
- Centred title and subtitle, as in the mockup.
- Appears at the top of every page.

### Card
- Wraps the list table and the release form.
- Header bar has the breadcrumb on the left and the primary action on the right.

### Breadcrumb
- "All releases" is a link in `--color-accent`. The separator is `>`.
- The current release name, such as "Version 1.0.1", is `--color-text-muted`, not a link.
- On the new release screen, the last crumb is "New release".

### Buttons
- **Primary** (New release, Delete, Save): background `--color-accent`, white text, 4px radius, 8px 14px padding, icon on the right.
- **Hover:** darken the background by about 8%.
- **Focus:** a 2px outline in `--color-accent`, offset 2px.
- **Delete** uses the same primary style in the mockup. Keep it that way.

### Table (releases list)
- Columns: Release, Date, Status, and two unlabelled action columns (View, Delete).
- Header row: bold, muted, with a bottom border.
- Rows: 1px `--color-border` between them. Row padding 10px 12px.
- Date format: `September 20, 2022` (long month, day, year).
- Status: plain text, `Planned`, `Ongoing`, or `Done`. No colour badges, as in the mockup.
- View: a text link with an eye icon. Delete: text with a trash icon.
- Delete asks for approval in the browser confirm dialog, using the release name. Cancel leaves the release in place. The release form uses the same dialog.
- The table scrolls sideways on narrow screens. The card does not change size.

### Inputs (text and date)
- Height about 36px, 1px `--color-border`, 4px radius, 10px horizontal padding.
- Focus: border becomes `--color-accent` with a 2px focus ring of the same colour at 20% opacity.
- Placeholder text uses `--color-text-muted`.
- Release name and date sit side by side on wide screens and stack on narrow screens.

### Textarea (Additional remarks / tasks)
- Full width of the form, about 140px high, resizable vertically only.
- Same border, radius, and focus style as inputs.
- Placeholder: "Please enter any other important notes for the release".

### Checklist
- One row per step: a native checkbox, then the label in `--color-text`.
- Checkbox size: about 14px, accent colour on checked.
- Labels are the exact text from `STEP_DEFINITIONS`. Do not shorten or reword them.
- Rows are not separated by borders, as in the mockup.
- The whole row is clickable, so the label also toggles the checkbox.

### Save
- Primary button at the bottom right of the form, with a check icon.

### Change banner (added for real-time updates)
- Sits at the top of the content area, above the card.
- Background `--color-banner-bg`, text `--color-text`, 4px radius, 12px padding.
- Message examples: Checkbox "All tests are passing" was checked in another tab, "3 changes from another tab".
- A close button (×) on the right dismisses it.

### Empty and error states
- **Empty list:** a single centred line, "No releases yet. Click New release to add one.", in `--color-text-muted`, inside the card.
- **Not found:** the same card, with the message "This release no longer exists." and a link back to "All releases".
- **Validation errors:** red text, `--color-danger`, about 12px, directly under the field.

## 6. Responsive behaviour

- **Wide screens (900px and up):** layout as in the mockup.
- **Tablets and phones (below 900px):** the card fills the width. The name and date fields stack. The table scrolls sideways inside the card. The header title and subtitle stay centred.
- Touch targets (checkboxes, buttons, links) are at least 40px high on small screens.

## 7. Things we are not doing

- No dark mode.
- No animations, except a standard hover and focus change.
- No icon library beyond the eye and trash icons. Use simple inline SVGs.
- No status colours, badges, or progress bars.
- No custom fonts.
