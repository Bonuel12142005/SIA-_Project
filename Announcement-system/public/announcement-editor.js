const form=document.querySelector('#announcementForm');
if(form){
 const sections=[...form.querySelectorAll('.settings-accordion')];
 const audience=form.elements.audience,from=form.elements.publishDate,to=form.elements.expiryDate;
 const recipientInputs=[...form.querySelectorAll('[name=recipientIds],[name=recipientRoles]')];
 const recipientError=document.querySelector('#recipientError');
 function openSection(section){if(!section)return;for(const item of sections)if(item!==section)item.open=false;section.open=true;}
 for(const section of sections)section.addEventListener('toggle',()=>{if(section.open)for(const other of sections)if(other!==section)other.open=false;});
 function toggleRecipients(){const specific=audience.value==='specific';for(const input of recipientInputs)input.disabled=!specific;if(!specific)recipientError.hidden=true;}
 audience.addEventListener('change',toggleRecipients);toggleRecipients();
 for(const input of recipientInputs)input.addEventListener('change',()=>{if(recipientInputs.some(field=>field.checked))recipientError.hidden=true;});
 if(!from.value){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());from.value=d.toISOString().slice(0,16);}
 function validateDates(){to.setCustomValidity(from.value&&to.value&&to.value<from.value?'Expiry Date must not be earlier than Publish Date.':'');}
 from.addEventListener('input',validateDates);to.addEventListener('input',validateDates);validateDates();
 let firstInvalid=null;
 form.addEventListener('invalid',event=>{if(firstInvalid)return;firstInvalid=event.target;openSection(event.target.closest('.settings-accordion'));setTimeout(()=>{firstInvalid=null;},0);},true);
 form.addEventListener('submit',event=>{validateDates();if(audience.value==='specific'&&!recipientInputs.some(input=>input.checked)){event.preventDefault();recipientError.hidden=false;const section=form.querySelector('[data-section="recipients"]');openSection(section);(recipientInputs[0]||section.querySelector('summary')).focus();return;}if(!form.reportValidity())event.preventDefault();});
 const errorSection=form.dataset.errorSection;if(errorSection){const section=sections.find(item=>item.dataset.section===errorSection);if(section){openSection(section);const target=section.querySelector('input:not([disabled]),select,textarea')||section.querySelector('summary');target?.focus();}}
}
