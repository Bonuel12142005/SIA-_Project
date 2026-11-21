const form=document.querySelector('#dateFilterForm');
if(form){
 const choice=form.elements.date,range=document.querySelector('#customDateRange'),from=form.elements.from,to=form.elements.to;
 const validate=()=>{to.setCustomValidity(from.value&&to.value&&from.value>to.value?'From Date must not be later than To Date.':'');};
 const showCustom=()=>{const custom=choice.value==='custom';range.hidden=!custom;for(const input of [from,to]){input.disabled=!custom;input.required=custom;}validate();};
 choice.addEventListener('change',()=>{showCustom();if(choice.value==='custom')from.focus();else form.requestSubmit();});
 from.addEventListener('input',validate);to.addEventListener('input',validate);
 form.addEventListener('submit',event=>{if(choice.value==='custom'){validate();if(!form.reportValidity())event.preventDefault();}});
 showCustom();
}
