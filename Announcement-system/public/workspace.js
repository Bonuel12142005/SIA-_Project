const navButton=document.querySelector('[data-toggle-nav]');
const nav=document.querySelector('#kims-nav');
function closeNav(){if(!navButton||!nav)return;nav.classList.remove('is-open');navButton.setAttribute('aria-expanded','false');navButton.setAttribute('aria-label','Open navigation');}
navButton?.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');navButton.setAttribute('aria-expanded',String(open));navButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
const themeButton=document.querySelector('#themeToggle');
function setTheme(theme){document.documentElement.dataset.theme=theme;document.body.classList.toggle('light-mode',theme==='light');themeButton?.setAttribute('aria-label',theme==='light'?'Switch to dark theme':'Switch to light theme');try{localStorage.setItem('kambac-theme',theme)}catch(e){}}
setTheme(document.documentElement.dataset.theme==='dark'?'dark':'light');
themeButton?.addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeNav();document.querySelectorAll('details[open]').forEach(item=>item.open=false);}});
document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('.account-menu[open]'))if(!menu.contains(event.target))menu.open=false;if(nav&&!nav.contains(event.target)&&!navButton?.contains(event.target))closeNav();});
const dialog=document.querySelector('#confirm-dialog');let pendingDelete;
for(const form of document.querySelectorAll('[data-confirm-delete]'))form.addEventListener('submit',event=>{if(form.dataset.confirmed)return;if(!dialog){if(!confirm('Remove this announcement? Its history will be retained.'))event.preventDefault();return;}event.preventDefault();pendingDelete=form;dialog.returnValue='cancel';dialog.showModal();});
dialog?.addEventListener('close',()=>{if(dialog.returnValue==='confirm'&&pendingDelete){pendingDelete.dataset.confirmed='true';pendingDelete.requestSubmit();}pendingDelete=null;});
for(const form of document.querySelectorAll('form:not([method="dialog"])'))form.addEventListener('submit',event=>{if(event.defaultPrevented)return;queueMicrotask(()=>{if(event.defaultPrevented)return;const button=form.querySelector('button[type="submit"],button:not([type])');if(button){button.disabled=true;button.setAttribute('aria-busy','true');}const loading=document.querySelector('.page-loading');if(loading)loading.hidden=false;});});
window.addEventListener('pageshow',()=>{document.querySelectorAll('button[aria-busy]').forEach(button=>{button.disabled=false;button.removeAttribute('aria-busy');});const loading=document.querySelector('.page-loading');if(loading)loading.hidden=true;});
const logoutDialog=document.querySelector('#logout-dialog');
for(const link of document.querySelectorAll('[data-confirm-logout]'))link.addEventListener('click',event=>{if(!logoutDialog)return;event.preventDefault();logoutDialog.returnValue='cancel';logoutDialog.showModal();});
logoutDialog?.addEventListener('close',()=>{if(logoutDialog.returnValue==='confirm')window.location.assign('/logout');});
