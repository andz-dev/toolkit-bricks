(function(){
'use strict';
var ICONS={
  bolt:'<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
  plug:'<path d="M9.785 6l8.215 8.215l-2.054 2.054a5.81 5.81 0 1 1 -8.215 -8.215l2.054 -2.054z"/><path d="M4 20l3.5 -3.5"/><path d="M15 4l-3.5 3.5"/><path d="M20 9l-3.5 3.5"/>',
  bot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1"/><circle cx="9.5" cy="13" r="1"/><circle cx="14.5" cy="13" r="1"/><path d="M9.5 16.5h5"/>',
  workflow:'<rect x="3" y="4" width="6" height="6" rx="1.5"/><rect x="15" y="14" width="6" height="6" rx="1.5"/><path d="M9 7h6a3 3 0 0 1 3 3v4"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.8 3 2.8 15 0 18c-2.8-3-2.8-15 0-18z"/>',
  database:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  cube:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5"/><path d="M12 12v9"/><path d="M12 12L4 7.5"/>',
  window:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M7 6.5h.01M10 6.5h.01"/>',
  cpu:'<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  layers:'<path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/>',
  box:'<path d="M12 3l8 4v10l-8 4-8-4V7z"/><path d="M4 7l8 4 8-4"/><path d="M12 11v10"/>',
  cloud:'<path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 7 9.5 4.25 4.25 0 0 0 7 18z"/>',
  rails:'<path d="M7 3L5 21M17 3l2 18"/><path d="M6.2 8h11.6M5.6 13h12.8M5 18h14"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  down:'<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
  up:'<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  left:'<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
  home:'<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  chevL:'<path d="M15 5l-7 7 7 7"/>',
  chevR:'<path d="M9 5l7 7-7 7"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  book:'<path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6v13"/><path d="M12 6v13"/><path d="M21 6v13"/>'
};
var CAT_ICON={'ai-assistant':'bot',automation:'workflow',browser:'globe',connector:'plug',data:'database',database:'database','agent-component':'layers',skill:'bolt',other:'cube'};
var KIND_ICON={'host-app':'window',runtime:'cpu',os:'layers',container:'box',cloud:'cloud',other:'cube'};
var KIND_LABEL={'host-app':'host app',runtime:'runtime',os:'operating system',container:'container',cloud:'cloud',other:'other'};
var state={pkg:null,pages:[],page:null,visible:null,current:null,cat:null,graph:null,sel:null,back:null,layer:false,layerEl:null};
var reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
var NS='http://www.w3.org/2000/svg';

function $(s){return document.querySelector(s);}
function el(tag,props){
  var n=document.createElement(tag),p=props||{};
  Object.keys(p).forEach(function(k){
    var v=p[k];
    if(v==null||v===false)return;
    if(k==='class')n.className=v;
    else if(k==='text')n.textContent=v;
    else if(k==='dataset')Object.assign(n.dataset,v);
    else if(k.slice(0,2)==='on')n.addEventListener(k.slice(2),v);
    else n.setAttribute(k,v);
  });
  for(var i=2;i<arguments.length;i++){
    [].concat(arguments[i]).forEach(function(kid){
      if(kid==null||kid===false)return;
      n.append(kid.nodeType?kid:document.createTextNode(kid));
    });
  }
  return n;
}
function sv(tag,attrs){
  var n=document.createElementNS(NS,tag);
  Object.keys(attrs||{}).forEach(function(k){n.setAttribute(k,attrs[k]);});
  return n;
}
function icon(name,size){
  var s=el('span',{class:'ico','aria-hidden':'true'});
  s.innerHTML='<svg viewBox="0 0 24 24" width="'+(size||18)+'" height="'+(size||18)+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[name]||ICONS.cube)+'</svg>';
  return s;
}
function brickIcon(b){return ICONS[b.icon]?b.icon:CAT_ICON[b.category];}
/* Wording (design rule I-3): inside a brick or a host app, on everything else, needs for requirements. */
function verb(n,kind){
  if(kind==='requires')return 'needs';
  return n&&(n.category||n.kind==='host-app')?'running inside':'running on';
}
function httpLinks(list){return (list||[]).filter(function(l){return l&&/^https?:\/\//i.test(l.url||'');});}
function linkEl(l){return el('a',{href:l.url,target:'_blank',rel:'noopener noreferrer',text:l.label});}
function add(box,list){list.forEach(function(n){if(n)box.append(n);});}

/* Validation and graph building come from catalog-core.js (shared with the editor). */
var validate=CatalogCore.validate;
var buildGraph=CatalogCore.buildGraph;
function studIndex(id){
  var i=state.cat.studs.findIndex(function(s){return s.id===id;});
  return (i<0?0:i)%6;
}
function studLabel(id){
  var s=state.cat.studs.find(function(x){return x.id===id;});
  return s?s.label:id;
}
function closure(seed,edges,down){
  var out=new Set(seed),q=seed.slice();
  while(q.length){
    var cur=q.pop();
    edges.forEach(function(e){
      var from=down?e.from:e.to,to=down?e.to:e.from;
      if(from===cur&&!out.has(to)){out.add(to);q.push(to);}
    });
  }
  return out;
}

/* ---------- board ---------- */
function brickEl(b){
  var ports=function(list,cls,pos){
    return list.length?el('span',{class:'ports '+pos},list.map(function(s){
      return el('span',{class:'port '+cls,style:'--c:var(--stud-'+studIndex(s)+')',dataset:{brick:b.id,stud:s}});
    })):null;
  };
  return el('button',{type:'button',class:'brick tone-'+(b.color||'gray'),dataset:{id:b.id},'aria-pressed':'false',
      'aria-label':b.name+', '+b.category+(b.status!=='available'?', '+b.status:'')+(b.research?', has research':''),onclick:function(){select(b.id);}},
    ports(b.provides,'out','top'),
    b.status!=='available'?el('span',{class:'tag',text:b.status}):null,
    b.research?el('span',{class:'rmark','aria-hidden':'true',title:'Has checked facts'},icon('book',13)):null,
    el('span',{class:'ibox'},icon(brickIcon(b),22)),
    el('span',{class:'name',text:b.name}),
    el('span',{class:'cat',text:b.category.replace('-',' ')}),
    ports(b.accepts,'in','bottom'));
}
function renderBoard(){
  var rows=$('#rows'),g=state.graph;
  rows.replaceChildren();
  var row=function(ids){return el('div',{class:'row'},ids.map(function(id){return brickEl(g.byId.get(id));}));};
  var vis=state.visible,shown=function(id){return vis.has(id);};
  g.layers.forEach(function(ids){var f=ids.filter(shown);if(f.length)rows.append(row(f));});
  var loose=g.loose.filter(shown);
  if(loose.length)rows.append(el('div',{},el('div',{class:'mono loose-label',text:'Not connected yet'}),row(loose)));
  requestAnimationFrame(function(){drawWires();applyFocus();});
}
function drawWires(){
  if(!state.graph)return;
  var board=$('#board'),svg=$('#wires'),chips=$('#chips');
  var br=board.getBoundingClientRect();
  svg.setAttribute('width',br.width);svg.setAttribute('height',br.height);
  svg.replaceChildren();chips.replaceChildren();
  var defs=sv('defs');
  for(var i=0;i<6;i++){
    var m=sv('marker',{id:'ah-'+i,viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'11',markerHeight:'11',markerUnits:'userSpaceOnUse',orient:'auto'});
    m.append(sv('path',{d:'M1 1L9 5L1 9z',style:'fill:var(--stud-'+i+')'}));
    defs.append(m);
  }
  svg.append(defs);
  state.graph.edges.forEach(function(e,n){
    var a=board.querySelector('.port.in[data-brick="'+e.from+'"][data-stud="'+e.stud+'"]');
    var b=board.querySelector('.port.out[data-brick="'+e.to+'"][data-stud="'+e.stud+'"]');
    if(!a||!b)return;
    var ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
    var x1=ra.left+ra.width/2-br.left,y1=ra.top+ra.height/2-br.top;
    var x2=rb.left+rb.width/2-br.left,y2=rb.top+rb.height/2-br.top;
    var dir=y2>=y1?1:-1,sy=y1+dir*8,ey=y2-dir*8;
    var dy=dir*Math.max(36,Math.abs(ey-sy)*0.5);
    var f=function(v){return v.toFixed(1);};
    var d='M'+f(x1)+' '+f(sy)+'C'+f(x1)+' '+f(sy+dy)+' '+f(x2)+' '+f(ey-dy)+' '+f(x2)+' '+f(ey);
    var idx=studIndex(e.stud),col='stroke:var(--stud-'+idx+')';
    var g=sv('g',{class:'edge'});g.dataset.from=e.from;g.dataset.to=e.to;
    g.append(sv('path',{d:d,class:'cable',style:col,'marker-end':'url(#ah-'+idx+')'}));
    g.append(sv('path',{d:d,class:'flow',style:col}));
    if(!reduceMotion.matches){
      var dot=sv('circle',{r:'3.8',style:'fill:var(--stud-'+idx+')'});
      dot.append(sv('animateMotion',{dur:'2.8s',repeatCount:'indefinite',path:d,begin:'-'+((n*0.7)%2.8).toFixed(1)+'s'}));
      g.append(dot);
    }
    svg.append(g);
    var tmp=sv('path',{d:d});svg.append(tmp);
    var p=tmp.getPointAtLength(tmp.getTotalLength()/2);tmp.remove();
    chips.append(el('span',{class:'chip',style:'left:'+f(p.x)+'px;top:'+f(p.y)+'px;--c:var(--stud-'+idx+')',dataset:{from:e.from,to:e.to}},icon('plug',13),studLabel(e.stud)));
  });
}
function applyFocus(){
  if(!state.graph)return;
  var g=state.graph,sel=state.sel,focus=null,active;
  var selPlat=!!sel&&g.platById.has(sel);
  if(selPlat){
    focus=new Set();
    closure([sel],g.runs,false).forEach(function(id){if(g.byId.has(id))focus.add(id);});
    active=function(a,b){return focus.has(a)&&focus.has(b);};
  }else if(sel){
    focus=new Set([sel]);
    g.edges.forEach(function(e){if(e.from===sel)focus.add(e.to);if(e.to===sel)focus.add(e.from);});
    active=function(a,b){return a===sel||b===sel;};
  }else active=function(){return true;};
  document.querySelectorAll('#board .brick').forEach(function(n){
    var id=n.dataset.id;
    n.classList.toggle('dim',!!focus&&!focus.has(id));
    n.classList.toggle('sel',id===sel);
    n.setAttribute('aria-pressed',String(id===sel));
  });
  document.querySelectorAll('#board .edge,#board .chip').forEach(function(n){
    n.classList.toggle('dim',!active(n.dataset.from,n.dataset.to));
  });
}

/* ---------- details panel ---------- */
function starsEl(n){
  var html='';
  for(var i=1;i<=5;i++)html+='<svg viewBox="0 0 24 24" class="'+(i<=n?'on':'off')+'" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></svg>';
  var s=el('span',{class:'stars',role:'img','aria-label':n+' of 5 stars'});
  s.innerHTML=html;
  return s;
}
function explain(o){
  var out=[];
  if(o.why)out.push(el('section',{class:'sec'},el('h3',{text:'Why'}),el('p',{class:'txt',text:o.why})));
  if(o.what)out.push(el('section',{class:'sec'},el('h3',{text:'What'}),el('p',{class:'txt',text:o.what})));
  if(o.how&&o.how.length)out.push(el('section',{class:'sec'},el('h3',{text:'How'}),el('ol',{class:'steps'},o.how.map(function(s){return el('li',{text:s});}))));
  return out;
}
function difficultySection(d){
  if(!d)return null;
  var sec=el('section',{class:'sec'},el('h3',{text:'Difficulty'}));
  [['installation','Installation'],['usage','Usage']].forEach(function(k){
    var r=d[k[0]];
    sec.append(el('div',{class:'rating'},
      el('div',{class:'rhead'},el('span',{class:'rlabel',text:k[1]}),starsEl(r.stars),el('span',{class:'rnum',text:r.stars+' of 5'})),
      el('p',{class:'rwhy',text:r.why})));
  });
  sec.append(el('p',{class:'muted note',text:'More stars means harder.'}));
  return sec;
}
function researchSection(r,title){
  if(!r)return null;
  var sec=el('section',{class:'sec research'},el('h3',{text:title||'Research'}),el('p',{class:'muted note',text:'Checked on '+r.verifiedOn+'.'}));
  if(r.facts&&r.facts.length)sec.append(el('h4',{text:'Facts'}),el('ul',{class:'rlist'},r.facts.map(function(f){
    var src=httpLinks(f.source?[f.source]:[])[0];
    return el('li',{},f.text,src?[' ',linkEl(src)]:null);
  })));
  if(r.openPoints&&r.openPoints.length)sec.append(el('h4',{text:'Open points'}),el('ul',{class:'rlist'},r.openPoints.map(function(o){
    return el('li',{},o.text,o.owner?el('span',{class:'owner',text:'Who can answer: '+o.owner}):null);
  })));
  var links=httpLinks(r.sources);
  if(links.length)sec.append(el('h4',{text:'Sources'}),el('ul',{class:'rlist'},links.map(function(l){return el('li',{},linkEl(l));})));
  return sec;
}
function studChip(id){return el('span',{class:'stud',style:'--c:var(--stud-'+studIndex(id)+')'},icon('plug',14),studLabel(id));}
/* Other use cases of the same topic that use a brick are listed as links (design rule N-6). */
function pageHref(pg){return '/'+encodeURIComponent(pg.topic.id)+'/'+encodeURIComponent(pg.recipe.id);}
function pageIcon(pg){return pg.recipe.icon&&ICONS[pg.recipe.icon]?pg.recipe.icon:(pg.topic.icon&&ICONS[pg.topic.icon]?pg.topic.icon:'layers');}
function pageLink(pg){
  return el('a',{class:'conn plink',href:'#'+pageHref(pg),dataset:{go:pageHref(pg)}},
    icon(pageIcon(pg),16),el('span',{class:'nm',text:pg.recipe.title}),
    el('span',{class:'effort',text:'Install '+pg.recipe.difficulty.installation.stars+'/5 · Use '+pg.recipe.difficulty.usage.stars+'/5'}));
}
function usedInSection(brickId){
  var others=state.pages.filter(function(pg){return pg.topic===state.page.topic&&pg!==state.page&&pg.recipe.bricks.indexOf(brickId)>=0;});
  if(!others.length)return null;
  return el('section',{class:'sec'},el('h3',{text:'Also used in'}),others.map(pageLink));
}
function useCasePanel(){
  var r=state.page.recipe,box=el('div',{class:'usecase'});
  box.append(el('div',{class:'dhead tone-gray'},
    el('span',{class:'ibox'},icon(pageIcon(state.page),26)),
    el('div',{},el('h2',{text:r.title}),el('div',{class:'meta'},el('span',{class:'pill',text:state.page.topic.cat.meta.title})))));
  add(box,explain(r));
  if(r.example)box.append(el('section',{class:'sec'},el('h3',{text:'Example'}),el('p',{class:'txt',text:r.example})));
  add(box,[difficultySection(r.difficulty),researchSection(r.research)]);
  return box;
}
function connRow(otherId,stud,dir){
  var o=state.graph.byId.get(otherId);
  return el('button',{type:'button',class:'conn',onclick:function(){select(otherId,{via:true});}},
    icon(dir,16),el('span',{class:'nm',text:o.name}),studChip(stud));
}
function nodeRow(id,dir,pillText){
  var g=state.graph,p=g.platById.get(id),b=g.byId.get(id);
  return el('button',{type:'button',class:'conn',onclick:function(){select(id,{via:true});}},
    icon(dir,16),el('span',{class:'nm',text:p?p.label:b.name}),el('span',{class:'pill',text:pillText}));
}
function whereSections(node){
  var runs=node.runsOn||[],needs=node.requires||[],out=[];
  var nodeOf=function(id){return state.graph.nodeById.get(id);};
  if(!runs.length&&!needs.length){
    return [el('section',{class:'sec'},el('h3',{text:'Where it runs'}),el('p',{class:'muted',text:'No infrastructure defined yet.'}))];
  }
  if(runs.length){
    var sec=el('section',{class:'sec'},el('h3',{text:'Where it runs'}));
    if(runs.length>1)sec.append(el('p',{class:'muted',text:'Any one of these is enough.'}));
    runs.forEach(function(id){sec.append(nodeRow(id,'down',verb(nodeOf(id))));});
    out.push(sec);
  }
  if(needs.length){
    var sn=el('section',{class:'sec'},el('h3',{text:'Also needs'}));
    if(needs.length>1)sn.append(el('p',{class:'muted',text:'All of these are needed.'}));
    needs.forEach(function(id){sn.append(nodeRow(id,'down','needs'));});
    out.push(sn);
  }
  return out;
}
function linksSection(list){
  var links=httpLinks(list);
  if(!links.length)return null;
  return el('section',{class:'sec'},el('h3',{text:'Links'}),el('div',{class:'links'},links.map(linkEl)));
}

/* infrastructure layer: foundation at the bottom, wagons drive upward */
function stackOf(id){
  var g=state.graph,set=new Set();
  closure([id],g.runs,true).forEach(function(n){set.add(n);});
  g.runs.forEach(function(e){if(e.to===id)set.add(e.from);});
  var edges=g.runs.filter(function(e){return set.has(e.from)&&set.has(e.to);});
  var level=new Map();set.forEach(function(n){level.set(n,0);});
  for(var k=0;k<set.size;k++){
    var ch=false;
    edges.forEach(function(e){var d=level.get(e.from)+1;if(d>level.get(e.to)){level.set(e.to,d);ch=true;}});
    if(!ch)break;
  }
  var rows=[];
  state.cat.bricks.concat(state.cat.platforms).forEach(function(n){
    if(!set.has(n.id))return;
    var l=level.get(n.id);
    (rows[l]=rows[l]||[]).push(n.id);
  });
  return{rows:rows.filter(Boolean),edges:edges};
}
function lnode(id,cur){
  var g=state.graph,b=g.byId.get(id),p=g.platById.get(id);
  return el('button',{type:'button',class:'lnode '+(p?'pf':'tone-'+(b.color||'gray'))+(id===cur?' cur':''),dataset:{id:id},'aria-pressed':String(id===cur),
      'aria-label':p?p.label+', '+KIND_LABEL[p.kind]:b.name,onclick:function(){if(id!==cur)select(id,{via:true});}},
    icon(p?KIND_ICON[p.kind]:brickIcon(b),16),
    el('span',{class:'lt'},el('span',{text:p?p.label:b.name}),p&&p.variants&&p.variants.length?el('span',{class:'lv',text:p.variants.join(' · ')}):null));
}
function layerEl(cur){
  var s=stackOf(cur);
  var wrap=el('div',{class:'layer'});
  var rows=el('div',{class:'lrows'},s.rows.map(function(ids){return el('div',{class:'lrow'},ids.map(function(id){return lnode(id,cur);}));}));
  wrap.append(sv('svg',{class:'lsvg','aria-hidden':'true'}),rows,el('div',{class:'lchips','aria-hidden':'true'}));
  wrap._stack=s;
  return wrap;
}
function drawLayer(wrap){
  if(!wrap||!wrap.isConnected)return;
  var br=wrap.getBoundingClientRect(),svg=wrap.querySelector('.lsvg'),chips=wrap.querySelector('.lchips');
  svg.setAttribute('width',br.width);svg.setAttribute('height',br.height);
  svg.replaceChildren();chips.replaceChildren();
  var f=function(v){return v.toFixed(1);};
  wrap._stack.edges.forEach(function(e,n){
    var upper=wrap.querySelector('.lnode[data-id="'+e.from+'"]'),lower=wrap.querySelector('.lnode[data-id="'+e.to+'"]');
    if(!upper||!lower)return;
    var ru=upper.getBoundingClientRect(),rl=lower.getBoundingClientRect();
    var xU=ru.left+ru.width/2-br.left,yU=ru.bottom-br.top;
    var xL=rl.left+rl.width/2-br.left,yL=rl.top-br.top;
    var dy=Math.max(20,(yL-yU)*0.5);
    var d='M'+f(xL)+' '+f(yL)+'C'+f(xL)+' '+f(yL-dy)+' '+f(xU)+' '+f(yU+dy)+' '+f(xU)+' '+f(yU);
    var grp=sv('g',{});
    grp.append(sv('path',{d:d,class:'tie'}),sv('path',{d:d,class:'rail'}),sv('path',{d:d,class:'railin'}));
    if(!reduceMotion.matches){
      var wagon=sv('rect',{x:'-8',y:'-4.5',width:'16',height:'9',rx:'2',class:'wagon'});
      wagon.append(sv('animateMotion',{dur:'3.6s',repeatCount:'indefinite',path:d,rotate:'auto',begin:'-'+((n*0.9)%3.6).toFixed(1)+'s'}));
      grp.append(wagon);
    }
    svg.append(grp);
    var tmp=sv('path',{d:d});svg.append(tmp);
    var p=tmp.getPointAtLength(tmp.getTotalLength()*0.5);tmp.remove();
    var target=state.graph.nodeById.get(e.to);
    chips.append(el('span',{class:'chip rel',style:'left:'+f(p.x)+'px;top:'+f(p.y)+'px',text:e.kind==='requires'?'needs':(e.altIndex>0?'or':verb(target))}));
  });
}
function layerSection(cur){
  var sec=el('section',{class:'sec'},el('h3',{text:'Infrastructure'}));
  var s=stackOf(cur);
  if(!s.edges.length){
    sec.append(el('p',{class:'muted',text:'No infrastructure defined for this item yet.'}));
    state.layerEl=null;
    return sec;
  }
  var lw=layerEl(cur);
  sec.append(lw,el('p',{class:'muted note',text:(state.graph.runs.some(function(e){return e.to===cur;})?'Showing what runs directly on this item. ':'')+'The foundation is at the bottom. Wagons drive upward, from what carries to what is carried. Select an item to read about it.'}));
  state.layerEl=lw;
  requestAnimationFrame(function(){drawLayer(lw);});
  return sec;
}

function renderDetail(){
  var box=$('#detail');box.replaceChildren();
  state.layerEl=null;
  var cat=state.cat,g=state.graph;
  var hasPlats=g.platById.size>0||g.runs.length>0;
  box.append(el('div',{class:'ptop'},
    hasPlats?el('button',{type:'button',class:'tog','aria-pressed':String(state.layer),onclick:function(){state.layer=!state.layer;renderDetail();}},icon('rails',16),'Infrastructure layer'):el('span'),
    state.sel?el('button',{class:'close',type:'button','aria-label':'Close details',onclick:closeDetail},icon('x',16)):null));
  if(!state.sel){
    box.append(
      el('div',{class:'empty'},el('span',{class:'bolt'},icon('bolt',22)),el('h2',{text:'Pick a brick'}),
        el('p',{text:'Select a brick to see why it matters, what it is and how to get started.'+(hasPlats?' Switch on the infrastructure layer to see what it runs on.':'')})),
      useCasePanel());
    add(box,[researchSection(cat.research,'Research on this topic')]);
    return;
  }
  var backNode=state.back&&g.nodeById.get(state.back);
  if(backNode)box.append(el('button',{type:'button',class:'back',onclick:function(){select(state.back,{via:true,back:null});}},icon('left',14),'Back to '+(backNode.name||backNode.label)));
  var p=g.platById.get(state.sel);
  if(p){
    var here=cat.bricks.concat(cat.platforms).filter(function(n){return(n.runsOn||[]).indexOf(p.id)>=0&&(n.name==null||state.visible.has(n.id));});
    box.append(
      el('div',{class:'dhead tone-gray'},
        el('span',{class:'ibox'},icon(KIND_ICON[p.kind],26)),
        el('div',{},el('h2',{text:p.label}),el('div',{class:'meta'},el('span',{class:'pill',text:KIND_LABEL[p.kind]})))),
      el('p',{class:'summary',text:p.summary}));
    if(state.layer)box.append(layerSection(p.id));
    add(box,explain(p));
    add(box,[difficultySection(p.difficulty),researchSection(p.research)]);
    if(p.variants&&p.variants.length)box.append(el('section',{class:'sec'},el('h3',{text:'Variants'}),el('div',{class:'tags'},p.variants.map(function(v){return el('span',{class:'pill',text:v});}))));
    if((p.runsOn||[]).length||(p.requires||[]).length)add(box,whereSections(p));
    if(here.length)box.append(el('section',{class:'sec'},el('h3',{text:'Running here'}),here.map(function(n){return nodeRow(n.id,'up',n.name?n.category.replace('-',' '):KIND_LABEL[n.kind]);})));
    add(box,[linksSection(p.links)]);
    return;
  }
  var b=g.byId.get(state.sel);
  var shown=function(id){return state.visible.has(id);};
  var uses=g.edges.filter(function(e){return e.from===b.id&&shown(e.to);});
  var usedBy=g.edges.filter(function(e){return e.to===b.id&&shown(e.from);});
  box.append(
    el('div',{class:'dhead tone-'+(b.color||'gray')},
      el('span',{class:'ibox'},icon(brickIcon(b),26)),
      el('div',{},el('h2',{text:b.name}),
        el('div',{class:'meta'},el('span',{class:'pill',text:b.category.replace('-',' ')}),el('span',{class:'pill '+b.status,text:b.status})))),
    el('p',{class:'summary',text:b.summary}));
  if(state.layer)box.append(layerSection(b.id));
  add(box,explain(b));
  add(box,[difficultySection(b.difficulty),researchSection(b.research)]);
  box.append(el('section',{class:'sec'},el('h3',{text:'Offers'}),
    b.provides.length?el('div',{class:'tags'},b.provides.map(studChip)):el('p',{class:'muted',text:'Nothing other bricks can plug into.'})));
  box.append(el('section',{class:'sec'},el('h3',{text:'Needs'}),
    b.accepts.length?el('div',{class:'tags'},b.accepts.map(studChip)):el('p',{class:'muted',text:'Works on its own.'})));
  if(hasPlats)add(box,whereSections(b));
  var hosted=cat.bricks.concat(cat.platforms).filter(function(n){return(n.runsOn||[]).indexOf(b.id)>=0&&(n.name==null||state.visible.has(n.id));});
  if(hosted.length)box.append(el('section',{class:'sec'},el('h3',{text:'Running inside it'}),hosted.map(function(n){return nodeRow(n.id,'up',n.name?n.category.replace('-',' '):KIND_LABEL[n.kind]);})));
  if(uses.length)box.append(el('section',{class:'sec'},el('h3',{text:'Uses'}),uses.map(function(e){return connRow(e.to,e.stud,'down');})));
  if(usedBy.length)box.append(el('section',{class:'sec'},el('h3',{text:'Used by'}),usedBy.map(function(e){return connRow(e.from,e.stud,'up');})));
  add(box,[usedInSection(b.id),linksSection(b.links)]);
}
function select(id,opts){
  opts=opts||{};
  var prev=state.sel;
  if(opts.via){
    state.back=Object.prototype.hasOwnProperty.call(opts,'back')?opts.back:(prev&&prev!==id?prev:null);
    state.sel=id;
  }else{
    state.back=null;
    state.sel=prev===id?null:id;
  }
  applyFocus();renderDetail();
  if(state.sel&&window.innerWidth<880)$('#detail-wrap').scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'start'});
}
function closeDetail(){
  state.sel=null;state.back=null;applyFocus();renderDetail();
  if(window.innerWidth<880)$('#board').scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'start'});
}

/* ---------- header, legend, notices ---------- */
function setHeader(kicker,title,lede){
  $('#title').textContent=title;
  $('#lede').textContent=lede||'';
  $('#kicker').textContent=kicker;
}
function renderLegend(){
  var lg=$('#legend');lg.replaceChildren();
  var used=new Set();
  state.cat.bricks.forEach(function(b){if(state.visible.has(b.id))b.provides.concat(b.accepts).forEach(function(x){used.add(x);});});
  state.cat.studs.forEach(function(s){
    if(!used.has(s.id))return;
    lg.append(el('span',{class:'item',style:'--c:var(--stud-'+studIndex(s.id)+')'},icon('plug',15),el('span',{text:s.label+(s.description?' · '+s.description:'')})));
  });
  lg.append(el('p',{text:'Cables run from the brick that uses a capability to the brick that offers it. The pulse moves in that direction, from top to bottom.'}));
}
function notice(lines){
  var box=$('#notice');box.replaceChildren();
  var items=lines.filter(Boolean);
  if(!items.length)return;
  box.append(el('div',{class:'notice'},
    el('ul',{},items.map(function(t){return el('li',{text:t});})),
    el('button',{type:'button','aria-label':'Dismiss',onclick:function(){box.replaceChildren();}},icon('x',16))));
}

/* ---------- dashboard, pages, navigation (design rules N-1 to N-9) ---------- */
function stars2(r){
  return el('span',{class:'eff'},
    el('span',{class:'effrow'},el('span',{class:'effl',text:'Install'}),starsEl(r.difficulty.installation.stars)),
    el('span',{class:'effrow'},el('span',{class:'effl',text:'Use'}),starsEl(r.difficulty.usage.stars)));
}
function renderDashboard(){
  var box=$('#dash');box.replaceChildren();
  state.pkg.topics.forEach(function(t){
    var mine=state.pages.filter(function(pg){return pg.topic===t;});
    var sec=el('section',{class:'topic','aria-label':t.cat.meta.title,dataset:{topic:t.id}},
      el('h2',{class:'thead'},icon(t.icon&&ICONS[t.icon]?t.icon:'layers',20),el('span',{text:t.cat.meta.title}),
        el('span',{class:'count',text:mine.length+(mine.length===1?' use case':' use cases')})));
    var grid=el('div',{class:'boxes'});
    mine.forEach(function(pg){
      var r=pg.recipe,names=r.bricks.map(function(id){var b=t.graph.byId.get(id);return b?b.name:id;});
      grid.append(el('a',{class:'box',href:'#'+pageHref(pg),dataset:{go:pageHref(pg)}},
        el('span',{class:'ibox'},icon(pageIcon(pg),24)),
        el('span',{class:'bt'},el('span',{class:'btitle',text:r.title}),el('span',{class:'btopic',text:t.cat.meta.title})),
        el('span',{class:'bwhat',text:r.what}),
        stars2(r),
        el('span',{class:'mini'},names.map(function(n){return el('span',{text:n});}))));
    });
    sec.append(grid);box.append(sec);
  });
}
function renderNav(){
  var nav=$('#pagenav'),n=state.pages.length,i=state.pages.indexOf(state.page);
  nav.replaceChildren();
  var link=function(pg,cls,label,ic,after){
    var inner=[el('span',{class:'nt'},el('span',{class:'nl',text:label}),el('span',{class:'nm',text:pg.recipe.title}))];
    var kids=after?inner.concat([icon(ic,22)]):[icon(ic,22)].concat(inner);
    return el('a',{class:'navb '+cls,href:'#'+pageHref(pg),dataset:{go:pageHref(pg)},'aria-label':label+': '+pg.recipe.title},kids);
  };
  var prev=state.pages[(i-1+n)%n],next=state.pages[(i+1)%n];
  nav.append(
    n>1?link(prev,'prev','Back','chevL',false):el('span'),
    el('a',{class:'navb home',href:'#/',dataset:{go:'/'},'aria-label':'Home, all use cases'},icon('home',22),
      el('span',{class:'nt'},el('span',{class:'nl',text:'Home'}),el('span',{class:'pos',text:(i+1)+' of '+n}))),
    n>1?link(next,'next','Next','chevR',true):el('span'));
}
function showView(page){
  $('#dash').hidden=!!page;
  $('#page').hidden=!page;
  $('#pagenav').hidden=!page;
  document.body.classList.toggle('on-page',!!page);
}
function showDashboard(){
  state.page=null;state.sel=null;state.back=null;state.layerEl=null;
  var np=state.pages.length,nt=state.pkg.topics.length;
  setHeader('Overview · '+nt+(nt===1?' topic':' topics')+' · '+np+(np===1?' use case':' use cases'),state.pkg.title,state.pkg.description);
  showView(null);
  renderDashboard();
}
function showPage(pg){
  var i=state.pages.indexOf(pg);
  state.page=pg;state.cat=pg.topic.cat;state.graph=pg.topic.graph;
  state.visible=new Set(pg.recipe.bricks);state.sel=null;state.back=null;
  setHeader(pg.topic.cat.meta.title+' · '+(i+1)+' of '+state.pages.length,pg.recipe.title,'');
  showView(pg);
  renderBoard();renderLegend();renderDetail();renderNav();
}
function route(path,moved){
  var key=path||'/';
  if(key===state.current&&!moved)return;
  state.current=key;
  var parts=key.replace(/^\//,'').split('/').map(function(x){try{return decodeURIComponent(x);}catch(e){return x;}});
  var pg=parts.length===2?state.pages.filter(function(p){return p.topic.id===parts[0]&&p.recipe.id===parts[1];})[0]:null;
  if(pg)showPage(pg);else showDashboard();
  if(moved){document.documentElement.scrollTop=0;document.body.scrollTop=0;$('#title').focus();}
}
function go(path){
  try{if(location.hash!=='#'+path)location.hash=path;}catch(e){}
  route(path,true);
}
function hashPath(){return location.hash.replace(/^#/,'');}

/* ---------- loading ---------- */
function adopt(pkg){
  var lines=[],topics=[];
  var c=CatalogCore.validateCollection(pkg.collection);
  if(c.er.length){notice(['The collection was not loaded.'].concat(c.er.slice(0,6)));return false;}
  pkg.collection.topics.forEach(function(t){
    var data=pkg.profiles[t.file];
    if(!data){lines.push(t.file+' could not be read.');return;}
    var r=validate(data);
    if(r.er.length){lines.push(t.file+' was not loaded: '+r.er.slice(0,3).join(' ')+(r.er.length>3?' …and '+(r.er.length-3)+' more.':''));return;}
    if(r.wa.length&&window.console)console.warn(t.file+' warnings:\n'+r.wa.join('\n'));
    topics.push({id:t.id,file:t.file,icon:t.icon,cat:data,graph:buildGraph(data)});
  });
  if(!topics.length){notice(['No topic could be loaded.'].concat(lines));return false;}
  if(lines.length)notice(lines);
  var pages=[];
  topics.forEach(function(t){t.cat.recipes.forEach(function(r){pages.push({topic:t,recipe:r});});});
  state.pkg={title:pkg.collection.title,description:pkg.collection.description,topics:topics};
  state.pages=pages;state.current=null;
  route(hashPath(),false);
  return true;
}
function loadPackage(){
  var embedded=JSON.parse($('#package-data').textContent);
  if(!window.fetch||location.protocol==='file:'){adopt(embedded);return;}
  var json=function(name){
    return fetch(name,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('missing '+name);return r.json();});
  };
  json('collection.json').then(function(col){
    var topics=Array.isArray(col&&col.topics)?col.topics:[];
    return Promise.all(topics.map(function(t){
      return typeof t.file==='string'?json(t.file).catch(function(){return null;}):null;
    })).then(function(list){
      var profiles={};
      topics.forEach(function(t,i){if(list[i])profiles[t.file]=list[i];});
      if(!adopt({collection:col,profiles:profiles}))adopt(embedded);
    });
  }).catch(function(){adopt(embedded);});
}

/* ---------- theme ---------- */
function effectiveTheme(){
  var t=document.documentElement.getAttribute('data-theme');
  return t||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
}
function paintThemeButton(){
  var b=$('#theme'),dark=effectiveTheme()==='dark';
  b.replaceChildren(icon(dark?'sun':'moon',18));
  b.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
}
function toggleTheme(){
  var next=effectiveTheme()==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('toolkit-bricks-theme',next);}catch(e){}
  paintThemeButton();
}

/* ---------- init ---------- */
$('#theme').addEventListener('click',toggleTheme);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',paintThemeButton);
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&state.sel){closeDetail();return;}
  if((e.key!=='ArrowLeft'&&e.key!=='ArrowRight')||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||!state.page||state.pages.length<2)return;
  var t=e.target,tag=t&&t.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable))return;
  var n=state.pages.length,i=state.pages.indexOf(state.page);
  go(pageHref(state.pages[(i+(e.key==='ArrowRight'?1:-1)+n)%n]));
});
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[data-go]');
  if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  e.preventDefault();go(a.dataset.go);
});
window.addEventListener('hashchange',function(){if(state.pkg)route(hashPath(),true);});
var redrawQueued=false;
function queueRedraw(){
  if(redrawQueued)return;
  redrawQueued=true;
  requestAnimationFrame(function(){redrawQueued=false;drawWires();applyFocus();drawLayer(state.layerEl);});
}
if(window.ResizeObserver)new ResizeObserver(queueRedraw).observe($('#board'));
window.addEventListener('resize',queueRedraw);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(queueRedraw);
try{var saved=localStorage.getItem('toolkit-bricks-theme');if(saved==='light'||saved==='dark')document.documentElement.setAttribute('data-theme',saved);}catch(e){}
paintThemeButton();
loadPackage();
})();
