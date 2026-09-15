import icons from './operation-icons.json'

// Adapt module-owned DOM at the boundary. React roots retain exclusive ownership.
export function installOperationsBridge() {
 const roots=[...document.querySelectorAll('.view:not(#view-dashboard):not(#view-students)'),document.getElementById('modals')]
 const normalize=(root)=>{
  if(!(root instanceof Element))return
  const nodes=[root,...root.querySelectorAll('[style],.mdi,.icon,[onclick]')]
  for(const el of nodes){
   if(el.matches('.mdi,.icon')&&!el.querySelector('svg')){
    const name=icons.material[el.textContent.trim()]
    if(icons.svg[name]){el.innerHTML=icons.svg[name];el.classList.add('erp-operation-icon')}
   }
   if(el.style.backgroundImage.includes('gradient')){el.style.backgroundImage='none';el.style.backgroundColor='var(--muted)'}
   for(const prop of ['color','backgroundColor','borderColor','borderLeftColor','borderRightColor','borderTopColor','borderBottomColor']){
    const value=el.style[prop]
    if(!value||value.includes('var(')||value==='transparent'||!value.match(/#|rgb/))continue
    const rgb=value.match(/[\d.]+/g)?.map(Number)||[]
    if(rgb.length>=4&&rgb[3]===0)continue
    if(prop.includes('border')||prop.includes('Border'))el.style[prop]='var(--border)'
    else if(prop==='backgroundColor')el.style[prop]=rgb.slice(0,3).every(c=>c>=248)?'var(--card)':'var(--muted)'
    else el.style[prop]=(rgb[0]>170&&rgb[0]>rgb[1]*1.7&&rgb[0]>rgb[2]*1.4)?'var(--destructive)':(rgb[0]>80&&rgb[0]<220&&Math.abs(rgb[0]-rgb[1])<35)?'var(--muted-foreground)':'var(--foreground)'
   }
   if(el.style.fontSize&&parseFloat(el.style.fontSize)<12)el.style.fontSize='12px'
   if(el.style.display==='grid'&&el.style.gridTemplateColumns.includes('repeat(6'))el.classList.add('erp-responsive-stats')
   if(el.matches('[onclick]:not(button):not(a):not(input):not(select):not(textarea)')&&!el.hasAttribute('tabindex')){el.tabIndex=0;el.setAttribute('role','button')}
  }
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('script,style,textarea,input,option,svg,.erp-emoji')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT})
  const texts=[];while(walk.nextNode())texts.push(walk.currentNode)
  for(const node of texts){
   const keys=Object.keys(icons.emoji).filter(k=>node.textContent.includes(k))
   if(!keys.length)continue
   const pattern=new RegExp('('+keys.join('|')+')','gu'),parts=node.textContent.split(pattern),fragment=document.createDocumentFragment()
   for(const part of parts){if(icons.emoji[part]&&icons.svg[icons.emoji[part]]){const span=document.createElement('span');span.className='erp-emoji';span.innerHTML=icons.svg[icons.emoji[part]];fragment.append(span)}else fragment.append(document.createTextNode(part))}
   node.replaceWith(fragment)
  }
 }
 const observer=new MutationObserver(records=>{
  observer.disconnect()
  for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)normalize(node)
  roots.forEach(root=>observer.observe(root,{childList:true,subtree:true}))
 })
 roots.forEach(root=>{normalize(root);observer.observe(root,{childList:true,subtree:true})})
 document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=button][onclick]:not(button)')){e.preventDefault();e.target.click()}
  const modal=[...document.querySelectorAll('.modal-overlay.open')].at(-1)
  if(!modal)return
  if(e.key==='Escape'){e.preventDefault();window.Modal.close(modal.id)}
  if(e.key==='Tab'){
   const focusable=[...modal.querySelectorAll('button,[href],input,select,textarea,[tabindex="0"]')].filter(e=>e.getClientRects().length&&!e.disabled)
   const first=focusable[0],last=focusable.at(-1)
   if(!first){e.preventDefault();return}
   if(e.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){e.preventDefault();first.focus()}
  }
 })
 const opened=new Map()
 const modals=document.getElementById('modals')
 new MutationObserver(()=>{
  modals.querySelectorAll('.modal-overlay').forEach(overlay=>{
   if(overlay.classList.contains('open')&&!opened.has(overlay)){
    opened.set(overlay,document.activeElement)
    const dialog=overlay.querySelector('.modal');if(!dialog)return
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1
    const title=dialog.querySelector('.modal-title');if(title){title.id=overlay.id+'-title';dialog.setAttribute('aria-labelledby',title.id)}
    const close=dialog.querySelector('.modal-close');if(close){close.setAttribute('role','button');close.tabIndex=0;close.setAttribute('aria-label','Close dialog')}
    dialog.focus()
   }else if(!overlay.classList.contains('open')&&opened.has(overlay)){opened.get(overlay)?.focus();opened.delete(overlay);window.dispatchEvent(new Event('erp:data'))}
  })
 }).observe(modals,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})
}
