'use strict';
const $=id=>document.getElementById(id);
const base=location.pathname.replace(/\/$/,'');
let csrf='',state=null,loaded=false,toastTimer,refreshing=false,qrShown=false;
const fields=['name','persona','user_persona','memory','base_url','model','temperature','history_turns'];
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6500);}
async function api(path,data){const response=await fetch(base+'/api/'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',headers:data===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:data===undefined?undefined:JSON.stringify(data)});const result=await response.json();if(response.status===401){if(wb.view!=='closed')showWorldbook('closed');$('login-panel').hidden=false;$('app').hidden=true;loaded=false;}if(!response.ok)throw Error(result.error||'请求失败，请稍后重试。');return result;}
async function action(button,callback){button.disabled=true;try{await callback();}catch(error){toast(error.message);}finally{button.disabled=false;}}
async function refresh(){if(refreshing)return;refreshing=true;try{state=await api('state');csrf=state.csrf;$('login-panel').hidden=true;$('app').hidden=wb.view!=='closed';const c=state.config;renderSetup(c);if(!loaded){for(const field of fields)$(field).value=c[field]??'';$('tg-mode').value=state.telegram.relay_url?'pages':'standard';$('tg-relay-url').value=state.telegram.relay_url||'';renderTelegramMode();loadExperience(state.experience);loaded=true;}$('api_key').placeholder=c.has_api_key?'已保存，留空保持不变':'填写你的 API Key';$('key-status').textContent=c.has_api_key?'已有 Key，保存后不会回显。':'尚未保存 API Key';$('connection').textContent=c.enabled?'微信助手运行中':state.connected?'微信已连接，回复已暂停':'尚未连接微信';$('status-dot').classList.toggle('online',c.enabled&&state.connected);$('runtime').textContent=c.enabled?state.runtime.poll:'先保存配置并扫码，然后开启自动回复。';$('runtime-error').textContent=c.enabled?state.runtime.error:'';$('enabled').textContent=c.enabled?'暂停自动回复':'开启自动回复';$('new-qr').disabled=!!state.login.running;const statuses={idle:'',starting:'正在获取二维码…',wait:'等待微信扫码与确认',scaned:'已扫码，请在微信确认',confirmed:'微信连接成功，可以开启自动回复。',expired:'二维码已过期，请重新获取。',need_verifycode:'请填写微信显示的验证码。',verify_code_blocked:'验证码尝试过多，请重新扫码。',scaned_but_redirect:'微信正在继续验证…',binded_redirect:'这个 Bot 已绑定其他实例，请在微信检查连接。',error:state.login.error||'连接失败，请重新尝试。'};$('qr-status').textContent=statuses[state.login.status]??state.login.status;$('verify-area').hidden=state.login.status!=='need_verifycode';$('qr-area').hidden=!state.login.has_qr;if(state.login.has_qr&&!qrShown){$('qr-image').src=base+'/api/qr.png?t='+Date.now();qrShown=true;}if(!state.login.has_qr)qrShown=false;$('owner-area').hidden=!state.connected||state.owner_bound;renderOwners(state.pending_owners);renderTelegram(state.telegram);renderExperience(state.experience,state.telegram);renderMemories(state.saved_memories,state.telegram.saved_memories);renderMessages();}catch(error){if($('login-panel').hidden)toast(error.message);}finally{refreshing=false;}}
function renderSetup(config){
  const modelReady=config.persona&&config.base_url&&config.model&&config.has_api_key;
  const preview=new URLSearchParams(location.search).get('preview')==='1';
  $('setup-card').hidden=!preview&&Boolean(modelReady&&(state.owner_bound||state.telegram.bound));
}

function renderOwners(owners){$('owner-list').replaceChildren();for(const owner of owners){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='绑定我的微信：'+owner.peer;button.addEventListener('click',()=>{if(confirm('确认这是你刚才发送消息的微信用户标识？'))action(button,async()=>{await api('approve',{peer:owner.peer});await refresh();});});$('owner-list').append(button);}}
const stateLabels={pending:'等待回复',generating:'正在生成',ready:'准备发送',sending:'正在发送',done:'已提交 · 送达待确认',uncertain:'送达待确认',failed_model:'模型请求失败',failed_send:'发送失败',skipped:'已跳过'};
const memoryForm=$('memory-edit-form');
const memoryText=$('memory-text');

function renderTelegram(tg){
  const label=tg.enabled?'自动回复运行中':tg.bound?'已绑定，自动回复已暂停':tg.pair_url?'等待在 Telegram 点 Start':'绑定链接已过期';
  $('tg-status').textContent=tg.username
    ?'@'+tg.username+' · '+label+((tg.enabled||tg.pair_url)&&tg.runtime.poll?' · '+tg.runtime.poll:'')
    :'尚未连接 Telegram';
  $('tg-error').textContent=tg.runtime.error;
  $('tg-token').placeholder=tg.has_token?'已保存，留空保留':'填写 BotFather Token';
  $('tg-proxy').placeholder=tg.has_proxy?'已保存，留空保留':'留空使用服务器直连';
  $('tg-direct-row').hidden=!tg.has_proxy;
  $('tg-relay-key').placeholder=tg.relay_url?'地址不变时，留空保留已保存的密钥':'填写 Pages 的 RELAY_KEY';
  $('tg-enabled').hidden=!tg.bound;
  $('tg-enabled').textContent=tg.enabled?'暂停 Telegram 自动回复':'开启 Telegram 自动回复';
  $('tg-renew').hidden=!tg.username||tg.bound;
  $('tg-pair').hidden=!tg.pair_url;
  const link=$('tg-link');
  if(tg.pair_url&&link.getAttribute('href')!==tg.pair_url){
    link.href=tg.pair_url;
    $('tg-qr').src=base+'/api/telegram/qr.png?t='+Date.now();
  }else if(!tg.pair_url&&link.hasAttribute('href')){
    link.removeAttribute('href');
    $('tg-qr').removeAttribute('src');
  }
}

function renderTelegramMode(){
  const pages=$('tg-mode').value==='pages';
  $('tg-standard-fields').hidden=pages;
  $('tg-pages-fields').hidden=!pages;
}

function telegramNetwork(){
  const mode=$('tg-mode').value;
  if(mode==='pages'){
    return {mode,relay_url:$('tg-relay-url').value.trim(),relay_key:$('tg-relay-key').value.trim()};
  }
  return {mode,proxy:$('tg-proxy').value.trim(),direct:$('tg-direct').checked,token:$('tg-token').value.trim()};
}

$('tg-mode').addEventListener('change',renderTelegramMode);
$('tg-form').addEventListener('submit',event=>{
  event.preventDefault();
  action(event.submitter,async()=>{
    await api('telegram/save',telegramNetwork());
    $('tg-token').value=$('tg-proxy').value=$('tg-relay-key').value='';
    $('tg-direct').checked=false;
    toast('Telegram Bot 已保存。');
    await refresh();
  });
});
$('tg-test').addEventListener('click',event=>action(event.currentTarget,async()=>{
  const settings=telegramNetwork();
  delete settings.token;
  const result=await api('telegram/probe',settings);
  toast(settings.mode==='pages'?'助手 → Pages → Telegram 已连通。':'助手已连到 Telegram（HTTP '+result.status+'）。');
}));
$('tg-renew').addEventListener('click',event=>action(event.currentTarget,async()=>{
  await api('telegram/pair',{});
  await refresh();
}));
$('tg-enabled').addEventListener('click',event=>action(event.currentTarget,async()=>{
  await api('telegram/enabled',{enabled:!state.telegram.enabled});
  await refresh();
}));

function loadExperience(options){
  $('auto-memory').checked=options.auto_memory;
  $('photo-enabled').checked=options.photo_enabled;
  $('shared-history').checked=options.shared_history;
  $('letters-enabled').checked=options.letters_enabled;
  $('letters-quiet-start').value=options.quiet_start;
  $('letters-quiet-end').value=options.quiet_end;
  $('letters-daily-limit').value=String(options.daily_limit);
}

function renderExperience(options,tg){
  $('letters-status').textContent=!tg.bound?'绑定 Telegram 私聊后可以开启主动来信。'
    :!options.letters_enabled?'主动来信已关闭。'
    :tg.enabled?'主动来信已开启，会在允许的时段随机发送。':'主动来信已设置，等待开启 Telegram 自动回复。';
}

$('experience-form').addEventListener('submit',event=>{
  event.preventDefault();
  action(event.submitter,async()=>{
    await api('experience',{
      shared_history:$('shared-history').checked,
      auto_memory:$('auto-memory').checked,
      photo_enabled:$('photo-enabled').checked,
      letters_enabled:$('letters-enabled').checked,
      quiet_start:$('letters-quiet-start').value,
      quiet_end:$('letters-quiet-end').value,
      daily_limit:Number($('letters-daily-limit').value),
    });
    toast('聊天体验已保存。');
    await refresh();
  });
});

function closeMemoryEditor(){
  memoryForm.hidden=true;
  delete memoryForm.dataset.id;
  delete memoryForm.dataset.channel;
  memoryText.value='';
}

function renderMemories(weixin,telegram){
  renderAutoMemoryStatus();
  const memories=[
    ...weixin.map(memory=>({...memory,channel:'weixin'})),
    ...telegram.map(memory=>({...memory,channel:'telegram'})),
  ].sort((first,second)=>second.created-first.created);
  const list=$('memory-list');
  const fingerprint=JSON.stringify(memories);
  if(list.dataset.fingerprint===fingerprint)return;
  list.dataset.fingerprint=fingerprint;
  list.replaceChildren();
  if(!memories.some(memory=>memory.id===memoryForm.dataset.id))closeMemoryEditor();
  if(!memories.length){
    const empty=document.createElement('p');
    empty.className='muted';
    empty.textContent='还没有在微信或 Telegram 保存的记忆。';
    list.append(empty);
    return;
  }
  for(const memory of memories){
    const entry=document.createElement('article');
    entry.className='message';
    const source=document.createElement('div');
    source.className='meta';
    source.textContent=`${memory.channel==='telegram'?'Telegram':'微信'} · ${memory.source==='auto'?'自动记忆':'手动记忆'} · ${memoryDate(memory.created)}`;
    const content=document.createElement('p');
    content.textContent=memory.text;
    const actions=document.createElement('div');
    actions.className='actions';
    const edit=document.createElement('button');
    const remove=document.createElement('button');
    edit.type=remove.type='button';
    edit.className=remove.className='secondary';
    edit.textContent='修改';
    remove.textContent='删除';
    edit.addEventListener('click',()=>{
      memoryForm.dataset.id=memory.id;
      memoryForm.dataset.channel=memory.channel;
      memoryText.value=memory.text;
      memoryForm.hidden=false;
      memoryText.focus();
    });
    remove.addEventListener('click',()=>{
      if(!confirm('删除这条长期记忆？'))return;
      action(remove,async()=>{
        await api('memory',{id:memory.id,channel:memory.channel,operation:'delete'});
        toast('记忆已删除。');
        await refresh();
      });
    });
    actions.append(edit,remove);
    entry.append(source,content,actions);
    list.append(entry);
  }
}

function memoryDate(seconds){
  return new Date(seconds*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
}

function renderAutoMemoryStatus(){
  const enabled=state.experience.auto_memory;
  $('auto-memory-state').textContent=enabled?'自动记忆已开启 · 最近处理结果':'自动记忆已关闭，可继续手动保存';
  for(const [channel,name,bound] of [['weixin','微信',state.owner_bound],['telegram','Telegram',state.telegram.bound]]){
    const line=$('auto-memory-'+channel);
    const event=state.memory_status?.[channel];
    line.hidden=!enabled;
    if(!enabled)continue;
    if(!bound){line.textContent=`${name} · 等待绑定私聊`;continue;}
    if(!event){line.textContent=`${name} · 等待新消息回复后筛选`;continue;}
    const labels={saved:`新增 ${event.saved} 条长期记忆`,duplicate:'已有相同的记忆',full:'已到自动记忆保存上限',
      skipped:'本轮没有可筛选的纯文字',no_match:'模型没有选出长期信息',error:'筛选失败，可能是模型超时或返回格式不兼容'};
    line.textContent=`${name} · ${labels[event.status]||'状态未知'} · ${memoryDate(event.at)}`;
  }
}

$('memory-refresh').addEventListener('click',event=>action(event.currentTarget,refresh));
$('memory-cancel').addEventListener('click',closeMemoryEditor);
memoryForm.addEventListener('submit',event=>{
  event.preventDefault();
  const id=memoryForm.dataset.id;
  action(event.submitter,async()=>{
    await api('memory',{id,channel:memoryForm.dataset.channel,operation:'edit',text:memoryText.value});
    if(memoryForm.dataset.id===id)closeMemoryEditor();
    toast('记忆已更新。');
    await refresh();
  });
});
function renderMessages(){
  if(!state)return;
  const channel=$('message-channel').value;
  const telegram=channel==='telegram';
  const platform=telegram?'Telegram':'微信';
  const jobs=telegram?state.telegram.jobs:state.jobs;
  $('delivery-note').textContent=telegram
    ?'「Telegram 已发送」表示 Telegram 返回了消息编号。'
    :'提交状态只表示微信接口处理了请求。实际送达以微信聊天窗口为准。';
  $('quote-note').textContent=platform+' 提供的文字引用会一起显示。原文缺失时会注明。';
  const list=$('messages');
  const fingerprint=JSON.stringify([channel,jobs]);
  if(list.dataset.fingerprint===fingerprint)return;
  list.dataset.fingerprint=fingerprint;
  list.replaceChildren();
  if(!jobs.length){
    const empty=document.createElement('p');
    empty.className='muted';
    empty.textContent='还没有 '+platform+' 消息。开启自动回复后，发一句话试试。';
    list.append(empty);
    return;
  }
  for(const job of jobs){
    const el=document.createElement('article');
    el.className='message';
    const meta=document.createElement('div');
    meta.className='meta';
    const label=job.state==='done'&&job.sent>0&&job.receipts===job.sent
      ?(telegram?'Telegram 已发送':'微信已受理 · 送达待确认')
      :stateLabels[job.state]||job.state;
    const recorded=job.is_letter?(job.reply_at??job.created):(job.end_at??job.created);
    meta.textContent=new Date(recorded*1000).toLocaleString('zh-CN')+' · '+label;
    const text=document.createElement('p');
    text.textContent=job.is_letter?'主动来信':job.text;
    el.append(meta,text);
    if(job.reply){
      const reply=document.createElement('p');
      reply.className='reply';
      reply.textContent=job.reply;
      el.append(reply);
    }
    if(job.error){
      const error=document.createElement('p');
      error.className='error';
      error.textContent=job.error;
      el.append(error);
    }
    const actions=document.createElement('div');
    actions.className='actions';
    function addAction(route,title,question,payload={id:job.id}){
      const button=document.createElement('button');
      button.type='button';
      button.className='secondary';
      button.textContent=title;
      button.addEventListener('click',()=>{
        if(question&&!confirm(question))return;
        action(button,async()=>{
          await api(route,{...payload,channel});
          if(route==='resend')toast('原回复已排队补发。');
          await refresh();
        });
      });
      actions.append(button);
    }
    if(!job.is_letter&&job.state==='done'&&job.reply&&job.sent>0){
      addAction('resend','没收到，补发',
        '确认 '+platform+' 里没收到这条回复？会补发整条原回复。如果已收到其中几段，那几段可能重复。',
        {id:job.id,resends:job.resends});
    }
    if(!job.is_letter&&['uncertain','failed_model','failed_send'].includes(job.state)){
      addAction('retry','重试这条',job.state==='uncertain'
        ?'先确认 '+platform+' 里没有收到这段回复，再重试。已经收到时请跳过，避免重复。':'');
      addAction('skip','跳过这条','跳过这条，继续处理后面的消息？');
    }
    if(actions.childElementCount)el.append(actions);
    list.append(el);
  }
}
$('message-channel').addEventListener('change',renderMessages);
$('login-form').addEventListener('submit',event=>{event.preventDefault();action(event.submitter,async()=>{await api('login',{password:$('password').value});$('password').value='';loaded=false;await refresh();});});
$('config-form').addEventListener('submit',event=>{event.preventDefault();const data={};for(const field of fields)data[field]=['temperature','history_turns'].includes(field)?Number($(field).value):$(field).value;data.api_key=$('api_key').value;action(event.submitter,async()=>{await api('config',data);$('api_key').value='';toast('角色和模型配置已保存。');await refresh();});});
const modelProbeFields=['base_url','model','temperature','api_key'];
const modelTestStatus=$('model-test-status');
let modelProbeRevision=0;

function showModelTest(message='',failed=false){
  modelTestStatus.textContent=message;
  modelTestStatus.classList.toggle('error',failed);
}

$('config-form').addEventListener('input',event=>{
  if(!modelProbeFields.includes(event.target.id))return;
  modelProbeRevision++;
  showModelTest();
});

$('model-test').addEventListener('click',async event=>{
  const saved=state.config;
  const edited=$('api_key').value.trim()||$('base_url').value.trim()!==saved.base_url||
    $('model').value.trim()!==saved.model||Number($('temperature').value)!==saved.temperature;
  if(edited||!saved.base_url||!saved.model||!saved.has_api_key){
    showModelTest('请先填写并保存模型设置，再点测试。',true);
    return;
  }
  const button=event.currentTarget;
  const revision=modelProbeRevision;
  button.disabled=true;
  showModelTest('正在请求模型…');
  try{
    await api('model/probe',{});
    if(revision===modelProbeRevision)showModelTest('模型测试通过，可以去微信或 Telegram 试聊。');
  }catch(error){
    if(revision===modelProbeRevision)showModelTest(error.message,true);
  }finally{
    button.disabled=false;
  }
});

$('enabled').addEventListener('click',event=>action(event.currentTarget,async()=>{await api('enabled',{enabled:!state.config.enabled});await refresh();}));
$('new-qr').addEventListener('click',event=>action(event.currentTarget,async()=>{await api('qr',{});qrShown=false;await refresh();}));
$('send-verify').addEventListener('click',event=>action(event.currentTarget,async()=>{await api('verify',{code:$('verify-code').value.trim()});$('verify-code').value='';toast('验证码已提交。');}));
$('refresh').addEventListener('click',()=>refresh());
$('logout').addEventListener('click',event=>action(event.currentTarget,async()=>{await api('logout',{});location.reload();}));
const wb={view:'closed',category:null,entries:[],editing:null,dirty:false,scroll:0};
const wbIcons={
  back:'<path d="m15 5-7 7 7 7"/>',
  add:'<path d="M12 5v14M5 12h14"/>',
  folder:'<path d="M3 6a2 2 0 0 1 2-2h4l3 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  import:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  export:'<path d="M12 15V3m-4 4 4-4 4 4M4 16v4h16v-4"/>',
  edit:'<path d="m14 6 4 4M5 19l4-1L20 7l-4-4L5 14l-1 5Z"/>',
  remove:'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 3v7m4-7v7"/>',
};
function wbIcon(kind){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+wbIcons[kind]+'</svg>';
}
function wbNode(tag,className='',content=''){
  const node=document.createElement(tag);
  node.className=className;
  node.textContent=content;
  return node;
}
function wbButton(label,kind,handler){
  const button=wbNode('button','wb-icon'+(kind==='remove'?' wb-danger':''));
  button.type='button';
  button.setAttribute('aria-label',label);
  button.innerHTML=wbIcon(kind);
  button.addEventListener('click',()=>handler(button));
  return button;
}

function showWorldbook(view){
  wb.view=view;
  const open=view!=='closed';
  document.body.classList.toggle('wb-mode',open);
  $('app').hidden=open;
  $('wb-panel').hidden=!open;
  $('wb-library').hidden=view!=='library';
  $('wb-form').hidden=view!=='editor';
  $('wb-import-form').hidden=view!=='import';
  const libraryTitle=wb.category===null?'世界书':wbCategoryName(wb.category);
  $('wb-title').textContent={library:libraryTitle,editor:wb.editing?'编辑条目':'创建条目',import:'导入世界书'}[view]||'世界书';
  $('wb-title').focus({preventScroll:true});
  $('wb-toolbar').hidden=view!=='library';
  if(view==='library')renderWorldbook();
  window.scrollTo(0,open?0:wb.scroll);
}
function wbExit(){
  if(wb.view==='editor'&&wb.dirty&&!confirm('放弃尚未保存的条目修改？'))return;
  if(wb.view!=='library'){
    showWorldbook('library');
  }else if(wb.category!==null){
    wb.category=null;
    $('wb-search').value='';
    showWorldbook('library');
  }else{
    showWorldbook('closed');
    $('wb-open').focus({preventScroll:true});
  }
}
function wbCategoryName(category){return category||'未分类';}

function renderWorldbook(){
  const query=$('wb-search').value.trim().toLocaleLowerCase();
  const status=$('wb-filter').value;
  const inCategory=wb.category===null?wb.entries:wb.entries.filter(entry=>entry.category===wb.category);
  const entries=inCategory.filter(entry=>{
    const fields=[entry.name,wbCategoryName(entry.category),entry.content,entry.tags,entry.keywords];
    return (status==='all'||entry.enabled===(status==='enabled')) &&
      (!query||fields.some(value=>value.toLocaleLowerCase().includes(query)));
  });
  const count=inCategory.filter(entry=>entry.enabled).length;
  $('wb-summary').textContent=(query||status!=='all'?entries.length+' 条符合筛选 · ':'')+
    inCategory.length+' 条 · '+count+' 条启用';
  const list=$('wb-list');
  list.replaceChildren();
  if(wb.category!==null&&inCategory.length){
    const bulk=wbNode('button','text-button',count?'停用本分类全部条目':'启用本分类全部条目');
    bulk.type='button';
    bulk.addEventListener('click',()=>{
      if(!confirm('确定'+bulk.textContent+'？'))return;
      action(bulk,()=>wbUpdate({operation:'toggle_category',category:wb.category,enabled:!count}));
    });
    list.append(bulk);
  }
  if(!entries.length){
    const message=wb.entries.length?'没有符合条件的条目。':'世界书还是空的。可以批量导入，或点右上角＋新增。';
    list.append(wbNode('p','note',message));
    return;
  }
  if(wb.category!==null){
    for(const entry of entries)list.append(wbEntryCard(entry));
    return;
  }
  const categories=new Map();
  for(const entry of entries)categories.set(entry.category,(categories.get(entry.category)||0)+1);
  for(const [category,count] of categories){
    const name=wbCategoryName(category);
    const row=wbNode('div','wb-category');
    const open=wbNode('button','wb-folder');
    open.type='button';
    open.innerHTML=wbIcon('folder');
    open.append(wbNode('span','',name),wbNode('span','wb-count',count+' 项'));
    open.addEventListener('click',()=>{
      wb.category=category;
      $('wb-search').placeholder='搜索条目名称、正文…';
      showWorldbook('library');
    });
    const edit=wbButton('重命名分类 '+name,'edit',button=>{
      const next=prompt('分类名称',category);
      if(next===null||next.trim()===category||!next.trim())return;
      action(button,()=>wbUpdate({operation:'rename_category',category,destination:next}));
    });
    row.append(open,edit);
    if(category){
      row.append(wbButton('移除分类 '+name,'remove',button=>{
        if(!confirm('移除分类「'+name+'」？里面的条目会移到「未分类」。'))return;
        action(button,()=>wbUpdate({operation:'rename_category',category,destination:''}));
      }));
    }
    list.append(row);
  }
}

function wbEntryCard(entry){
  const card=wbNode('article','wb-entry');
  const head=wbNode('div','wb-entry-head');
  const title=wbNode('button','wb-entry-title',entry.name);
  title.type='button';
  title.addEventListener('click',()=>openWorldbookEditor(entry));
  const toggle=wbNode('button','wb-state',entry.enabled?'停用':'启用');
  toggle.type='button';
  toggle.setAttribute('aria-pressed',String(entry.enabled));
  toggle.setAttribute('aria-label',toggle.textContent+' '+entry.name);
  toggle.addEventListener('click',()=>action(toggle,()=>wbUpdate({operation:'toggle',id:entry.id,enabled:!entry.enabled})));
  const remove=wbButton('删除条目 '+entry.name,'remove',button=>{
    if(confirm('删除条目「'+entry.name+'」？'))action(button,()=>wbUpdate({operation:'delete',id:entry.id}));
  });
  const pills=wbNode('div','wb-pills');
  const position={before:'前',middle:'中',after:'后'}[entry.position];
  for(const item of [entry.always?'常驻':'按触发词','注入·'+position,entry.global_?'全局':'',entry.tags]){
    if(item)pills.append(wbNode('span','',item));
  }
  head.append(title,toggle,remove);
  card.append(head,pills,wbNode('p','wb-preview',entry.content.slice(0,360)));
  return card;
}
async function loadWorldbook(){
  wb.entries=(await api('worldbook')).entries;
}
async function wbUpdate(payload){
  await api('worldbook',payload);
  await loadWorldbook();
  renderWorldbook();
}
function syncWbKeywords(){
  const show=!$('wb-always').checked;
  $('wb-keywords-label').hidden=!show;
  $('wb-keywords').required=show;
}
function openWorldbookEditor(entry={}){
  wb.editing=entry.id||null;
  wb.dirty=false;
  $('wb-name').value=entry.name||'';
  $('wb-category').value=entry.category??wb.category??'';
  $('wb-tags').value=entry.tags||'';
  $('wb-content').value=entry.content||'';
  $('wb-global').checked=entry.global_===true;
  $('wb-always').checked=entry.always!==false;
  $('wb-keywords').value=entry.keywords||'';
  $('wb-enabled').checked=entry.enabled!==false;
  for(const radio of document.querySelectorAll('[name=wb-position]')){
    radio.checked=radio.value===(entry.position||'before');
  }
  const categories=new Set(wb.entries.map(entry=>entry.category).filter(Boolean));
  $('wb-categories').replaceChildren(...Array.from(categories,value=>Object.assign(wbNode('option'),{value})));
  syncWbKeywords();
  showWorldbook('editor');
}

// Strip unrelated backup data before sending any file contents to the server.
function extractWorldbook(data){
  const keys=['name','title','comment','content','text','category','categoryName','position','tags',
    'enabled','disabled','global_','isGlobal','always','alwaysOn','isAlways','isAlwaysOn','isConstant','constant',
    'keywords','key','keys','triggerWords'];
  const entry=item=>Object.fromEntries(keys.filter(key=>Object.hasOwn(item||{},key)).map(key=>[key,item[key]]));
  if(Array.isArray(data))return data.map(entry);
  if(!data||typeof data!=='object')throw Error('世界书 JSON 格式不正确。');
  for(const field of ['worldbook_entries','worldBooks','entries']){
    const value=data[field];
    if(Array.isArray(value))return value.map(entry);
    if(field==='entries'&&value&&typeof value==='object')return Object.values(value).map(entry);
  }
  if(Array.isArray(data.categories)){
    return {categories:data.categories.map(category=>({
      name:category.name||category.title,entries:extractWorldbook(category.entries||category.items||[]),
    }))};
  }
  if(data.character_book)return {name:data.name,character_book:extractWorldbook(data.character_book)};
  for(const field of ['data','db','backup','profile']){
    if(data[field]&&typeof data[field]==='object')return extractWorldbook(data[field]);
  }
  if(data.content||data.text)return entry(data);
  throw Error('没有找到可识别的世界书条目。');
}

async function encodeFile(file){
  const bytes=new Uint8Array(await file.arrayBuffer());
  let binary='';
  for(let i=0;i<bytes.length;i+=8192){
    binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  }
  return btoa(binary);
}

async function readWorldbookFile(file){
  const magic=new Uint8Array(await file.slice(0,2).arrayBuffer());
  if(magic[0]!==0x1f||magic[1]!==0x8b)return file.text();
  if(typeof DecompressionStream!=='function')throw Error('这个浏览器无法打开 .ee，请换浏览器或导入 JSON。');
  const reader=file.stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const decoder=new TextDecoder();
  let bytes=0;
  let raw='';
  while(true){
    const {done,value}=await reader.read();
    if(done)return raw+decoder.decode();
    bytes+=value.byteLength;
    if(bytes>64*1024*1024){
      await reader.cancel();
      throw Error('解压后超过 64 MB。请只导出世界书，或分批导入。');
    }
    raw+=decoder.decode(value,{stream:true});
  }
}

for(const [id,kind] of Object.entries({'wb-back':'back','wb-import-open':'import','wb-export':'export','wb-add':'add'})){
  $(id).innerHTML=wbIcon(kind);
}
$('wb-open').addEventListener('click',event=>action(event.currentTarget,async()=>{
  await loadWorldbook();
  wb.category=null;
  wb.scroll=window.scrollY;
  $('wb-search').value='';
  $('wb-search').placeholder='搜索名称、分类、正文…';
  $('wb-filter').value='all';
  showWorldbook('library');
}));
$('wb-back').addEventListener('click',()=>{
  if(wb.view==='library'&&wb.category!==null)$('wb-search').placeholder='搜索名称、分类、正文…';
  wbExit();
});
$('wb-add').addEventListener('click',()=>openWorldbookEditor());
$('wb-import-open').addEventListener('click',()=>{
  $('wb-import-form').reset();
  showWorldbook('import');
});
$('wb-search').addEventListener('input',renderWorldbook);
$('wb-filter').addEventListener('change',renderWorldbook);
$('wb-always').addEventListener('change',syncWbKeywords);
$('wb-form').addEventListener('input',()=>{wb.dirty=true;});
$('wb-form').addEventListener('submit',event=>{
  event.preventDefault();
  const entry={
    name:$('wb-name').value,category:$('wb-category').value,tags:$('wb-tags').value,
    content:$('wb-content').value,keywords:$('wb-keywords').value,
    position:document.querySelector('[name=wb-position]:checked').value,
    always:$('wb-always').checked,global_:$('wb-global').checked,enabled:$('wb-enabled').checked,
  };
  action(event.submitter,async()=>{
    await wbUpdate({operation:wb.editing?'edit':'create',id:wb.editing,entry});
    wb.category=entry.category.trim();
    $('wb-search').placeholder='搜索条目名称、正文…';
    wb.dirty=false;
    $('wb-search').value='';
    $('wb-filter').value='all';
    showWorldbook('library');
    toast('世界书条目已保存。');
  });
});
$('wb-import-form').addEventListener('submit',event=>{
  event.preventDefault();
  action(event.submitter,async()=>{
    const files=Array.from($('wb-files').files);
    if(files.length>50)throw Error('一次最多选 50 个文件。');
    if(files.reduce((sum,file)=>sum+file.size,0)>64*1024*1024)throw Error('本次选中的文件超过 64 MB。');
    const wordFiles=files.filter(file=>/\.docx$/i.test(file.name));
    if(wordFiles.some(file=>file.size>8*1024*1024))throw Error('单个 Word 文件最大 8 MB。');
    if(wordFiles.reduce((sum,file)=>sum+file.size,0)>8*1024*1024)throw Error('Word 文件总大小超过 8 MB，请分批导入。');
    const documents=[];
    for(const file of files){
      try{
        if(/\.docx$/i.test(file.name)){
          documents.push({name:file.name,file:await encodeFile(file)});
          continue;
        }
        const raw=await readWorldbookFile(file);
        const name=file.name.replace(/\.[^.]+$/,'');
        const data=file.name.toLowerCase().endsWith('.txt')?{name,content:raw}:extractWorldbook(JSON.parse(raw.replace(/^\uFEFF/,'')));
        documents.push({name:file.name,data});
      }catch(error){
        throw Error(file.name+' · '+error.message);
      }
    }
    const payload={operation:'import',documents,keep_enabled:$('wb-keep-enabled').checked};
    if(new Blob([JSON.stringify(payload)]).size>12*1024*1024)throw Error('世界书内容超过 12 MB，请分批导入。');
    const result=await api('worldbook',payload);
    await loadWorldbook();
    wb.category=null;
    $('wb-search').value='';
    $('wb-search').placeholder='搜索名称、分类、正文…';
    $('wb-filter').value='all';
    showWorldbook('library');
    toast(result.added?'已导入 '+result.added+' 条世界书。':'这些条目已存在。');
  });
});
$('wb-export').addEventListener('click',()=>{
  const entries=wb.category===null?wb.entries:wb.entries.filter(entry=>entry.category===wb.category);
  if(!entries.length){toast('当前没有可导出的世界书。');return;}
  const link=wbNode('a');
  link.href=URL.createObjectURL(new Blob([JSON.stringify({worldbook_entries:entries},null,2)],{type:'application/json'}));
  link.download=(wb.category?wbCategoryName(wb.category):'世界书')+'.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
});

document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
refresh();setInterval(()=>{if(!document.hidden&&loaded)refresh();},2500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loaded)refresh();});
