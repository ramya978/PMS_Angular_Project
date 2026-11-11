# Aviv PMS (Angular)

Converted from the Aviv PMS static HTML source (1723 pages). Each page is a lazy-loaded standalone
component; its stylesheets and page scripts load when the screen opens.

## Run
1. `npm install`
2. `npm start` then open http://localhost:4200 (sign in first; the login page is `/common/cm-01-login`).

## Build
`npm run build`

## Not converted yet
- Inline `<script>` blocks inside pages are dropped. External page scripts are loaded after the markup renders,
  but they were written for the static pages, so some interactions may not work until they are checked.
- Duplicate `u-emp-*` copies are not generated as routes.
- Very large pages (for example the New Reservation and Guest Folio screens) are slow to compile and to open.

This project was generated without being compiled, because the package registry was not reachable from the
generator's sandbox. Run `npm install` and `npm run build` and send any errors back.
