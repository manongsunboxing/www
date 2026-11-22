// Shared reader for trends.json, used by graphs.js and summary.js.
//
// Kept in one file on purpose. The Python side has the same lesson recorded in
// export_trend_json.py: its file list was once copied rather than imported, and
// both times a store was added the copy was forgotten, so PCHub's CPU, MOBO,
// RAM and MONITOR categories were scraped for months and silently dropped from
// trends.json. A format reader duplicated across two pages would fail the same
// way -- one page updated, the other quietly wrong.
//
// trends.json stores each (store, link, name) triple once in a top-level table
// and has entries reference it by index, because those 4,271 triples used to be
// written out 216,862 times and took the file to 95.36 MB against GitHub's
// 100 MB limit. This expands it back to the shape the pages want.
//
// Both layouts are accepted: a model maps to a list in the old one and to an
// object in the compact one, so they are distinguished per model and a
// half-migrated file still reads.
(function (global) {
  'use strict';

  function expandTrends(raw) {
    const payload = raw && raw.trends ? raw : { trends: raw || {} };
    const table = payload.stores || [];
    const models = {};

    Object.keys(payload.trends || {}).forEach(function (model) {
      const node = payload.trends[model];

      if (Array.isArray(node)) {
        // Old layout: entries already carry full store objects.
        models[model] = {
          category: node.length ? node[0].category || null : null,
          entries: node,
        };
        return;
      }

      const modelCategory = node.category || null;
      const entries = (node.entries || []).map(function (entry) {
        const stores = (entry.stores || [])
          .map(function (i) {
            const row = table[i];
            if (!row) return null;
            return { store: row[0], link: row[1], name: row[2] };
          })
          .filter(Boolean);
        return {
          category: entry.category || modelCategory,
          date: entry.date,
          price: entry.price,
          stores: stores,
        };
      });
      models[model] = { category: modelCategory, entries: entries };
    });

    return { models: models, meta: payload.meta || {} };
  }

  // The prefix heuristic is only reached for models whose entries carry no
  // category at all, which is why it stays beside the reader rather than being
  // repeated on each page.
  function inferCategory(model, node) {
    if (node && node.category) return node.category;
    if (node && node.entries && node.entries.length && node.entries[0].category) {
      return node.entries[0].category;
    }
    if (/^DDR/i.test(model)) return 'RAM';
    if (/^(I[3579]-|R[3579]-|Ultra[579]-|ATHLON-|PENTIUM-)/i.test(model)) return 'CPU';
    if (/^(RTX[A-Z]?\d|GTX\d|GT\d|RX\d|ARC[A-Z]?\d|T\d)/i.test(model)) return 'GPU';
    return null;
  }

  global.expandTrends = expandTrends;
  global.inferTrendCategory = inferCategory;
})(window);
