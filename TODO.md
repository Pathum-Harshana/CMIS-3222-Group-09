# TODO - Failed to load resource (net::ERR_CONNECTION_RESET)

- [x] Inspect and modify `api/config/db.php` to remove/limit runtime DDL operations (CREATE/ALTER) executed on every request.
- [x] Add server-side logging in `api/config/db.php` and auth endpoints to capture root cause of connection resets.

- [ ] Verify login/signup flows in browser and confirm no connection reset.
- [ ] (If needed) add minimal client-side diagnostics in `auth.js` to surface failing URL.


