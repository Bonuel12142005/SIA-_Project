import { Announcement } from '../models/announcementModel.js';
import { AnnouncementNotification as Notification } from '../models/notificationModel.js';
import { User } from '../models/userModel.js';
import { sequelize } from '../models/db.js';
import { canPost, canManage, canView, isRecipient, isCurrentlyPublished, parseInput, memberRoles } from '../services/announcementPolicy.js';
import { logAnnouncementError } from '../services/announcementErrors.js';
import { workspaceData, paginate, toPlain, formatDate } from '../services/workspaceData.js';
import { parseDateFilter, matchesDateFilter, dateFilterParams } from '../services/announcementDateFilter.js';
const plain = row => row.get({ plain: true });
const validId = value => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
const fail = (res, error) => {
  if (![400, 403, 404].includes(error.status)) logAnnouncementError('request', error);
  const code=[400,403,404].includes(error.status)?error.status:503;
  const message=code===503?'Your workspace is temporarily unavailable. Please try again shortly.':error.message;
  if(res.req?.accepts('html'))return res.status(code).render('workspace-error',{title:'Request unavailable',errorTitle:code===404?'This update is not available':code===403?'This action is not permitted':'We could not complete that request',errorMessage:message});
  return res.status(code).send(message);
};
const missing = () => Object.assign(new Error('Announcement not found.'), { status: 404 });
async function choices(transaction) {
  return (await User.findAll({ attributes: ['id', 'name', 'role'], transaction })).filter(u => memberRoles().includes(u.role));
}
async function inputFor(body, transaction, existing = null) {
  let input;
  try { input = parseInput(body, { allowLegacyTraining: existing?.category === 'training' }); } catch (e) { e.status = 400; throw e; }
  const users = await choices(transaction);
  if (input.recipientIds.some(id => !users.some(u => u.id === id)) || input.recipientRoles.some(r => !memberRoles().includes(r) || !users.some(u => u.role === r))) throw Object.assign(new Error('Select existing eligible recipients.'), { status: 400 });
  return { input, users };
}
async function notify(a, users, transaction) {
  for (const user of users.filter(u => u.id !== a.creatorId && isRecipient(u, a))) {
    await Notification.findOrCreate({ where: { announcementId: a.id, userId: user.id }, defaults: { readAt: null }, transaction });
  }
}
async function owned(req, transaction) {
  if (!validId(req.params.id)) throw missing();
  const a = await Announcement.findByPk(req.params.id, { transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (!a || a.deletedAt || !canManage(req.currentUser, a)) throw missing();
  return a;
}
export async function listAnnouncements(req, res) {
  try {
    const data=await workspaceData(req.currentUser);
    const q=typeof (req.query.search ?? req.query.q)==='string'?(req.query.search ?? req.query.q).trim().slice(0,255):'';
    const requestedStatus=typeof req.query.status==='string'?req.query.status:'';
    if (!['','all','draft','published','archived'].includes(requestedStatus)) throw Object.assign(new Error('Choose a valid announcement status.'),{status:400});
    const status=requestedStatus||'published';
    const dateFilter=parseDateFilter(req.query);
    const dateParams=dateFilterParams(dateFilter);
    const dateVisible=data.announcements.filter(a=>matchesDateFilter(a,dateFilter));
    const counts={published:0,draft:0,archived:0};
    for (const a of dateVisible) { const key=a.archivedAt?'archived':a.status; if (Object.hasOwn(counts,key)) counts[key]++; }
    const rows=dateVisible.filter(a=>status==='all'||(status==='archived'?!!a.archivedAt:!a.archivedAt&&a.status===status)).filter(a=>!q||(a.title+' '+a.content).toLowerCase().includes(q.toLowerCase()));
    rows.sort((a,b)=>Number(b.pinned||0)-Number(a.pinned||0) || new Date(b.publishDate||b.createdAt)-new Date(a.publishDate||a.createdAt));
    const pagination=paginate(rows,req.query.page,10);
    const link=page=>'/announcements?'+new URLSearchParams({q,status,...dateParams,page:String(page)});
    const tabs=[['published','Published'],['draft','Drafts'],['archived','Archived']].map(([key,label])=>({key,label,count:counts[key],active:status===key,url:'/announcements?'+new URLSearchParams({status:key,...(q?{search:q}:{}),...dateParams})}));
    const clearDateUrl='/announcements?'+new URLSearchParams({status,...(q?{search:q}:{})});
    const clearSearchUrl='/announcements?'+new URLSearchParams({status,...dateParams});
    const notificationByAnnouncement=new Map(data.notifications.map(n=>[n.announcementId,n]));
    res.render('announcements',{...data,title:'Announcements',activeAnnouncements:true,announcements:pagination.items.map(a=>{const notification=notificationByAnnouncement.get(a.id);return {...a,status:a.displayStatus,targetAudience:a.audience,publishDate:formatDate(a.publishDate||a.publishedAt||a.createdAt),isOwner:a.canManage,hasReadStatus:!!notification,unread:!!notification?.unread};}),pagination,tabs,q,dateFilter,clearDateUrl,clearSearchUrl,filterStatus:status,hasFilters:!!q,showPagination:pagination.pages>1,previousPage:link(pagination.page-1),nextPage:link(pagination.page+1),isAdmin:canPost(req.currentUser),searchQuery:q,statusFilter:status,currentPage:pagination.page,totalPages:pagination.pages,hasPrevPage:pagination.hasPrevious,hasNextPage:pagination.hasNext,prevPage:pagination.page-1,nextPage:pagination.page+1});
  } catch(e){fail(res,e);}
}
export async function workspaceDashboard(req,res){
  try{const data=await workspaceData(req.currentUser);res.render('dashboard',{...data,title:'Overview',activeDashboard:true,recentAnnouncements:data.announcements.filter(a=>!a.archivedAt&&a.status==='published').slice(0,3),recentNotifications:data.notifications.slice(0,4)});}catch(e){fail(res,e);}
}
export async function accountPage(req,res){
  try{const data=await workspaceData(req.currentUser);res.render('account',{...data,title:'My account',activeAccount:true});}catch(e){fail(res,e);}
}
async function editorPage(req,res,announcement={},formError=null,status=200,legacyTraining=false){
  const data=await workspaceData(req.currentUser);
  const users=data.eligibleUsers.map(u=>({...toPlain(u),selected:(announcement.recipientIds||[]).includes(u.id)}));
  const roleChoices=memberRoles().map(role=>({role,selected:(announcement.recipientRoles||[]).includes(role)}));
  const dateInput = value => { if (typeof value==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return value; if (!value || isNaN(new Date(value))) return ''; const d=new Date(new Date(value).getTime()+8*60*60*1000); return d.toISOString().slice(0,16); };
  const formErrorSection = !formError?'':/recipient/i.test(formError)?'recipients':/publication|expiry/i.test(formError)?'schedule':/event date/i.test(formError)?'event':/priority|status/i.test(formError)?'status':'';
  res.status(status).render('announcement-edit',{...data,title:announcement.id?'Edit announcement':'Create announcement',activeAnnouncements:true,announcement,editing:!!announcement.id,legacyTraining,users,roleChoices,formError,formErrorSection,publishDateFormatted:dateInput(announcement.publishDate||announcement.publishedAt),expiryDateFormatted:dateInput(announcement.expiryDate),eventDateFormatted:dateInput(announcement.eventDate)});
}
export async function newAnnouncementPage(req,res){
  if(!canPost(req.currentUser))return fail(res,Object.assign(new Error('Management is not permitted for your role.'),{status:403}));
  try{await editorPage(req,res,{status:'draft',audience:'all'});}catch(e){fail(res,e);}
}
function formValues(body,id){return {id,title:typeof body.title==='string'?body.title.slice(0,255):'',content:typeof body.content==='string'?body.content.slice(0,60000):'',status:body.status==='published'?'published':'draft',audience:body.audience==='specific'?'specific':'all',recipientIds:[body.recipientIds||[]].flat().map(Number).filter(Number.isSafeInteger),recipientRoles:[body.recipientRoles||[]].flat().filter(r=>memberRoles().includes(r)),category:body.category,priority:body.priority,pinned:body.pinned==='true',publishDate:body.publishDate,expiryDate:body.expiryDate,eventDate:body.eventDate,eventTime:body.eventTime,eventLocation:body.eventLocation};}
async function formFailure(req,res,error,id){
  if(error.status===400&&res.req){try{const existing=id?await owned(req):null;return await editorPage(req,res,formValues(req.body,id),error.message,400,existing?.category==='training');}catch(e){return fail(res,e);}}
  return fail(res,error);
}

export async function createAnnouncement(req, res) {
  if (!canPost(req.currentUser)) return fail(res,Object.assign(new Error('Posting is not permitted for your role.'),{status:403}));
  try {
    await sequelize.transaction(async transaction => {
      const { input, users } = await inputFor(req.body, transaction);
      const a = await Announcement.create({ ...input, creatorId: req.currentUser.id, publishedAt: input.status === 'published' ? new Date() : null }, { transaction });
      if (a.status === 'published') await notify(a, users, transaction);
    });
    req.flash('success_msg', 'Announcement saved.'); res.redirect('/announcements');
  } catch (e) { await formFailure(req,res,e); }
}
export async function editAnnouncementPage(req,res){
  if(!canPost(req.currentUser))return fail(res,Object.assign(new Error('Management is not permitted for your role.'),{status:403}));
  try{const a=await owned(req);await editorPage(req,res,plain(a),null,200,a.category==='training');}catch(e){fail(res,e);}
}

export async function updateAnnouncement(req, res) {
  if (!canPost(req.currentUser)) return fail(res,Object.assign(new Error('Management is not permitted for your role.'),{status:403}));
  try {
    await sequelize.transaction(async transaction => {
      const a = await owned(req, transaction);
      const { input, users } = await inputFor(req.body, transaction, a);
      await a.update({ ...input, publishedAt: a.publishedAt || (input.status === 'published' ? new Date() : null) }, { transaction });
      if (a.status === 'published' && !a.archivedAt) await notify(a, users, transaction);
    });
    req.flash('success_msg', 'Announcement updated.'); res.redirect('/announcements');
  } catch (e) { await formFailure(req,res,e,Number(req.params.id)); }
}
export async function deleteAnnouncement(req, res) { return lifecycle(req, res, 'delete'); }
export async function archiveAnnouncement(req, res) { return lifecycle(req, res, 'archive'); }
export async function restoreAnnouncement(req, res) { return lifecycle(req, res, 'restore'); }
async function lifecycle(req, res, action) {
  if (!canPost(req.currentUser)) return fail(res,Object.assign(new Error('Management is not permitted for your role.'),{status:403}));
  try {
    await sequelize.transaction(async transaction => {
      const a = await owned(req, transaction);
      await a.update(action === 'delete' ? { deletedAt: new Date() } : { archivedAt: action === 'archive' ? new Date() : null }, { transaction });
    });
    req.flash('success_msg', action === 'delete' ? 'Announcement removed; history retained.' : 'Announcement updated.'); res.redirect('/announcements');
  } catch (e) { fail(res, e); }
}
export async function detailAnnouncement(req,res){
  try{
    if(!validId(req.params.id))throw missing();
    const a=await Announcement.findByPk(req.params.id);
    if(!a||!canView(req.currentUser,a))throw missing();
    const data=await workspaceData(req.currentUser);
    const presented=data.present(a);
    res.render('announcement-detail',{...data,title:'Announcement details',activeAnnouncements:true,announcement:presented,authorName:presented.authorName,publishDate:presented.publishedLabel||presented.dateLabel,messageParagraphs:a.content.split('\n').filter(p=>p.trim()),isOwner:presented.canManage,markRead:isCurrentlyPublished(a)&&isRecipient(req.currentUser,a)});
  }catch(e){fail(res,e);}
}

export async function notificationsPage(req,res){
  try{
    const data=await workspaceData(req.currentUser);
    const unreadOnly=req.query.filter==='unread';
    res.render('notifications',{...data,title:'Notifications',activeNotifications:true,notifications:data.notifications.filter(n=>!unreadOnly||n.unread),notificationTotal:data.notifications.length,unread:data.unreadCount,unreadOnly});
  }catch(e){fail(res,e);}
}

export async function openNotification(req, res) {
  try {
    if (!validId(req.params.id)) throw missing();
    let target;
    await sequelize.transaction(async transaction => {
      const lookup = await Notification.findOne({ where: { id: req.params.id, userId: req.currentUser.id }, transaction });
      if (!lookup) throw missing();
      // Match publication's lock order: announcement first, notification second.
      const a = await Announcement.findByPk(lookup.announcementId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!a || a.deletedAt || !isCurrentlyPublished(a) || !isRecipient(req.currentUser, a)) throw missing();
      const n = await Notification.findOne({ where: { id: req.params.id, userId: req.currentUser.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!n || n.announcementId !== a.id) throw missing();
      if (!n.readAt) { await n.update({ readAt: new Date() }, { transaction }); if (typeof a.increment === 'function') await a.increment('viewCount', { transaction }); }
      target = a.id;
    });
    res.redirect(`/announcements/${target}`);
  } catch (e) { fail(res, e); }
}

export async function markAllAsRead(req, res) {
  try {
    await sequelize.transaction(async transaction => {
      const notifications = await Notification.findAll({ where: { userId: req.currentUser.id, readAt: null }, transaction });
      for (const notification of notifications) {
        const announcement = await Announcement.findByPk(notification.announcementId, { transaction });
        if (announcement && !announcement.deletedAt && isCurrentlyPublished(announcement) && isRecipient(req.currentUser, announcement)) await notification.update({ readAt: new Date() }, { transaction });
      }
    });
    res.redirect('/notifications');
  } catch (e) { fail(res, e); }
}

export async function markAnnouncementRead(req, res) {
  try {
    if (!validId(req.params.id)) throw missing();
    await sequelize.transaction(async transaction => {
      const a = await Announcement.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!a || a.deletedAt || !isCurrentlyPublished(a) || !isRecipient(req.currentUser, a)) throw missing();
      const n = await Notification.findOne({ where: { announcementId: a.id, userId: req.currentUser.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (n && !n.readAt) {
        await n.update({ readAt: new Date() }, { transaction });
        await a.increment('viewCount', { transaction });
      }
    });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
}

