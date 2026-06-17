# TMWEB Event Finder

Leader dashboard for searching monthly faction event scores from a Google Sheet.

## How it works

- `index.html` is the website page.
- `styles.css` controls the layout and colours.
- `app.js` loads the Google Sheet CSV exports and powers the search, highest/lowest filters, and player score view.

When the Google Sheet changes, the website reads the latest sheet data when the page is refreshed.
