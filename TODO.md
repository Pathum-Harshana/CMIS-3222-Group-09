# AuraHub - Implementation TODO

## Pagination for Feed (ikman.lk style)
- [ ] Implement server-side pagination endpoint for posts (limit/offset + total count)
- [ ] Update `wall.html`/`app.js` pagination UI (page numbers or Prev/Next + Load more)
- [ ] Update `app.js` to request only the current page instead of fetching all posts
- [ ] Ensure comments loading remains correct for visible posts only
- [ ] Add search compatibility (either reset pagination or include search in query)
- [ ] Test: load more / prev-next works, empty state works, delete/report/comment still functions

