export const roles = Object.freeze(["admin", "staff", "visitors"]);
// User-approved policy: Admin posts; all registered roles are recipients.
// Read the current role from the database, never from submitted form values.
export const postingRoles = () => ["admin"];
export const memberRoles = () => [...roles];
const registered = user => !!user && Number.isSafeInteger(user.id) && user.id > 0;
export const canPost = user => registered(user) && user.role === "admin";
export const canManage = (user, a) => canPost(user) && a.creatorId === user.id;
export const isRecipient = (user, a) => registered(user) && roles.includes(user.role) && (a.audience === "all"
  ? memberRoles().includes(user.role)
  : a.audience === "specific" && ((a.recipientIds || []).includes(user.id) || (a.recipientRoles || []).includes(user.role)));
export const isCurrentlyPublished = a => a.status === 'published' && !a.archivedAt && (!a.publishDate || new Date(a.publishDate) <= new Date()) && (!a.expiryDate || new Date(a.expiryDate) >= new Date());
export const canView = (user, a) => !a.deletedAt && (canManage(user, a) || (isCurrentlyPublished(a) && isRecipient(user, a)));
export function parseInput(body, { allowLegacyTraining = false } = {}) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!title || title.length > 255 || !content || Buffer.byteLength(content, "utf8") > 60000) throw new Error("Enter a title (up to 255 characters) and details (up to 60,000 bytes).");
  if (!["draft", "published"].includes(body.status) || !["all", "specific"].includes(body.audience)) throw new Error("Choose a valid status and audience.");
  const list = value => value === undefined ? [] : Array.isArray(value) ? value : [value];
  const ids = list(body.recipientIds);
  const selectedRoles = list(body.recipientRoles);
  if (ids.some(id => typeof id !== "string" || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) || selectedRoles.some(r => !roles.includes(r))) throw new Error("Invalid recipients.");
  const recipientIds = [...new Set(ids.map(Number))];
  const recipientRoles = [...new Set(selectedRoles)];
  if (body.audience === "all" && (recipientIds.length || recipientRoles.length)) throw new Error("Clear specific recipients when selecting All Members.");
  if (body.audience === "specific" && !recipientIds.length && !recipientRoles.length) throw new Error("Select at least one recipient or role.");
  const result = { title, content, status: body.status, audience: body.audience, recipientIds, recipientRoles };
  if (body.category !== undefined) {
    if (!['general','meeting','event','notice','reminder','emergency','deadline'].includes(body.category) && !(allowLegacyTraining && body.category === 'training')) throw new Error('Choose a valid category.');
    if (!['normal','high','urgent'].includes(body.priority)) throw new Error('Choose a valid priority.');
    const localDate = value => value ? new Date(/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value) ? value + ':00+08:00' : value) : null;
    const publishDate = localDate(body.publishDate);
    const expiryDate = localDate(body.expiryDate);
    const eventDate = localDate(body.eventDate);
    if (!publishDate || isNaN(publishDate) || (expiryDate && (isNaN(expiryDate) || expiryDate < publishDate))) throw new Error('Choose valid publication and expiry dates.');
    if (eventDate && isNaN(eventDate)) throw new Error('Choose a valid event date.');
    Object.assign(result, { category:body.category, priority:body.priority, publishDate, expiryDate, pinned:body.pinned === 'true', sendNotification:true, eventDate, eventTime:typeof body.eventTime==='string'?body.eventTime.slice(0,255)||null:null, eventLocation:typeof body.eventLocation==='string'?body.eventLocation.slice(0,255)||null:null });
  }
  return result;
}

