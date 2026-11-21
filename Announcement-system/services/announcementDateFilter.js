// Calendar dates in the same timezone used by workspace date labels.
const calendar = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit' });
const dayString = value => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(calendar.formatToParts(date).map(part => [part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const validDay = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d=new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===value;
};
const invalid = message => Object.assign(new Error(message),{status:400});
export function parseDateFilter(query, now = new Date()) {
  const mode=query.date === undefined || query.date === '' ? 'all' : query.date;
  if (!['all','today','7days','30days','custom'].includes(mode)) throw invalid('Choose a valid date filter.');
  let from='', to='';
  if (mode==='custom') {
    from=query.from; to=query.to;
    if (!validDay(from)||!validDay(to)) throw invalid('Enter valid From and To dates.');
    if (from>to) throw invalid('From Date must not be later than To Date.');
  } else if (mode!=='all') {
    to=dayString(now);
    const span=mode==='today'?0:mode==='7days'?6:29;
    const start=new Date(`${to}T00:00:00Z`); start.setUTCDate(start.getUTCDate()-span);
    from=start.toISOString().slice(0,10);
  }
  return {mode,from,to,active:mode!=='all'};
}
export function matchesDateFilter(announcement, filter) {
  if (!filter.active) return true;
  const day=dayString(announcement.publishDate || announcement.publishedAt || announcement.createdAt);
  return !!day && day>=filter.from && day<=filter.to;
}
export function dateFilterParams(filter) {
  if (!filter.active) return {};
  return filter.mode==='custom'?{date:filter.mode,from:filter.from,to:filter.to}:{date:filter.mode};
}
