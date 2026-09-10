// Tag inference for company entries. Rules implemented exactly per
// wbw-artifacts/03-lld.md §4 — do not add/remove tags without a spec update.

const RULES = [
  { tag: 'Remote', field: 'location', re: /remote/i },
  { tag: 'Take-home project', field: 'description', re: /take[\s-]?home/i },
  { tag: 'Pair programming', field: 'description', re: /pair(ing)?\s*programm|\bpairing\b/i },
  { tag: 'System design', field: 'description', re: /system design|architecture/i },
  { tag: 'Live coding', field: 'description', re: /live cod(e|ing)/i },
  { tag: 'Portfolio review', field: 'description', re: /portfolio|github profile|open.source/i },
  { tag: 'Culture fit', field: 'description', re: /culture|values/i },
];

export function inferTags(company) {
  return RULES.filter(({ field, re }) => re.test(company[field] ?? '')).map(({ tag }) => tag);
}
