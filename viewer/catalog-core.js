/* Shared catalog logic: validation and graph building (design rule D-3).
   Source of truth for the viewer and the editor. Works in the browser
   (window.CatalogCore) and in Node (module.exports).
   viewer/catalog-core.js is a copy of this file: edit here, then run `npm run sync`. */
(function (root) {
'use strict';
var ID=/^[a-z0-9]+(-[a-z0-9]+)*$/;
var VERSION='1.3';
var COLLECTION_VERSION='1.0';
var CATS=['ai-assistant','automation','browser','connector','data','database','agent-component','skill','other'];
var PKINDS=['host-app','runtime','os','container','cloud','other'];
var STATUS=['available','planned','restricted'];
var TONES=['purple','teal','coral','pink','gray','blue','green','amber','red'];

/* ---------- validation ---------- */
function isObj(v){return v&&typeof v==='object'&&!Array.isArray(v);}
function str(v){return typeof v==='string'&&v.length>0;}
function checkHow(how,who,er){
  if(!Array.isArray(how)||!how.length||how.some(function(s){return!str(s);}))er.push(who+': "how" must be a list of steps.');
}
function checkDifficulty(d,who,er){
  if(!isObj(d)){er.push(who+': difficulty needs installation and usage ratings.');return;}
  ['installation','usage'].forEach(function(k){
    var r=d[k];
    if(!isObj(r)||!Number.isInteger(r.stars)||r.stars<1||r.stars>5)er.push(who+': difficulty.'+k+'.stars must be a whole number from 1 to 5.');
    else if(!str(r.why))er.push(who+': difficulty.'+k+' needs a reason.');
  });
}
function isDate(v){
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  var d=new Date(v+'T00:00:00Z');
  return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;
}
function checkLink(l,where,er,wa){
  if(!isObj(l)||!str(l.label)||!str(l.url)){er.push(where+' needs a label and a url.');return;}
  if(!/^https?:\/\//i.test(l.url))wa.push(where+': the link "'+l.url+'" is not http or https and will not be shown.');
}
function checkResearch(r,who,er,wa){
  if(!isObj(r)){er.push(who+': research must be an object.');return;}
  if(!isDate(r.verifiedOn))er.push(who+': research.verifiedOn must be a date like 2026-10-19.');
  var any=false;
  ['facts','openPoints','sources'].forEach(function(k){
    if(r[k]===undefined)return;
    if(!Array.isArray(r[k])){er.push(who+': research.'+k+' must be a list.');return;}
    if(r[k].length)any=true;
    r[k].forEach(function(item,i){
      var at=who+': research.'+k+'['+i+']';
      if(k==='sources'){checkLink(item,at,er,wa);return;}
      if(!isObj(item)||!str(item.text)){er.push(at+' needs text.');return;}
      if(k==='facts'&&item.source!==undefined)checkLink(item.source,at+'.source',er,wa);
      if(k==='openPoints'&&item.owner!==undefined&&!str(item.owner))er.push(at+'.owner must be text.');
    });
  });
  if(!any)er.push(who+': research needs at least one fact, open point or source.');
}
function validate(c){
  var er=[],wa=[];
  if(!isObj(c))return{er:['The file is not a JSON object.'],wa:wa};
  if(c.schemaVersion!==VERSION)er.push('schemaVersion is "'+c.schemaVersion+'". This viewer reads "'+VERSION+'".');
  if(!isObj(c.meta)||!str(c.meta.title))er.push('meta.title is missing.');
  ['studs','platforms','bricks','recipes'].forEach(function(k){if(!Array.isArray(c[k]))er.push('"'+k+'" must be a list.');});
  if(er.length)return{er:er,wa:wa};
  var studIds=new Set(),platIds=new Set(),brickIds=new Set(),recipeIds=new Set();
  function dup(set,id,what){if(set.has(id))er.push('Duplicate '+what+' id "'+id+'".');set.add(id);}
  if(c.research!==undefined)checkResearch(c.research,'profile',er,wa);
  c.studs.forEach(function(s,i){
    if(!isObj(s)||!ID.test(s.id||'')||!str(s.label)){er.push('studs['+i+'] needs a valid id and a label.');return;}
    dup(studIds,s.id,'stud');
  });
  c.platforms.forEach(function(p,i){
    if(!isObj(p)||!ID.test(p.id||'')){er.push('platforms['+i+'] needs a valid id.');return;}
    dup(platIds,p.id,'platform');
    if(!str(p.label))er.push(p.id+': label is missing.');
    if(PKINDS.indexOf(p.kind)<0)er.push(p.id+': unknown kind "'+p.kind+'".');
    if(!str(p.summary))er.push(p.id+': summary is missing.');
    if(p.why!==undefined&&!str(p.why))er.push(p.id+': why must be text.');
    if(p.what!==undefined&&!str(p.what))er.push(p.id+': what must be text.');
    if(p.how!==undefined)checkHow(p.how,p.id,er);
    if(p.difficulty!==undefined)checkDifficulty(p.difficulty,p.id,er);
    if(p.variants!==undefined&&(!Array.isArray(p.variants)||p.variants.some(function(v){return!str(v);})))er.push(p.id+': variants must be a list of text.');
    if(p.research!==undefined)checkResearch(p.research,p.id,er,wa);
  });
  if(!c.bricks.length)er.push('The catalog has no bricks.');
  c.bricks.forEach(function(b,i){
    if(!isObj(b)||!ID.test(b.id||'')){er.push('bricks['+i+'] needs a valid id.');return;}
    dup(brickIds,b.id,'brick');
    if(!str(b.name))er.push(b.id+': name is missing.');
    if(CATS.indexOf(b.category)<0)er.push(b.id+': unknown category "'+b.category+'".');
    if(!str(b.summary))er.push(b.id+': summary is missing.');
    if(!str(b.why))er.push(b.id+': why is missing.');
    if(!str(b.what))er.push(b.id+': what is missing.');
    checkHow(b.how,b.id,er);
    checkDifficulty(b.difficulty,b.id,er);
    if(STATUS.indexOf(b.status)<0)er.push(b.id+': unknown status "'+b.status+'".');
    if(b.color!==undefined&&TONES.indexOf(b.color)<0)er.push(b.id+': unknown color "'+b.color+'".');
    ['provides','accepts'].forEach(function(k){
      if(!Array.isArray(b[k])){er.push(b.id+': "'+k+'" must be a list.');return;}
      b[k].forEach(function(s){if(!studIds.has(s))er.push(b.id+': '+k+' uses unknown stud "'+s+'".');});
    });
    if(b.research!==undefined)checkResearch(b.research,b.id,er,wa);
  });
  platIds.forEach(function(id){if(brickIds.has(id))er.push('The id "'+id+'" is used by both a brick and a platform.');});
  /* runsOn (alternatives) and requires (all needed) may name platforms or bricks */
  function checkRefs(n,isBrick){
    ['runsOn','requires'].forEach(function(k){
      if(n[k]===undefined)return;
      if(!Array.isArray(n[k])||(isBrick&&!n[k].length)){er.push(n.id+': "'+k+'" must be a list'+(isBrick?' with at least one entry':'')+'.');return;}
      n[k].forEach(function(q){if(!platIds.has(q)&&!brickIds.has(q))er.push(n.id+': '+k+' uses unknown platform or brick "'+q+'".');});
    });
  }
  c.platforms.forEach(function(p){if(isObj(p)&&p.id)checkRefs(p,false);});
  c.bricks.forEach(function(b){if(isObj(b)&&b.id)checkRefs(b,true);});
  c.recipes.forEach(function(r,i){
    if(!isObj(r)||!ID.test(r.id||'')){er.push('recipes['+i+'] needs a valid id.');return;}
    dup(recipeIds,r.id,'recipe');
    if(!str(r.title))er.push(r.id+': title is missing.');
    if(!str(r.why))er.push(r.id+': why is missing.');
    if(!str(r.what))er.push(r.id+': what is missing.');
    checkHow(r.how,r.id,er);
    checkDifficulty(r.difficulty,r.id,er);
    if(r.icon!==undefined&&!/^[a-z0-9-]+$/.test(r.icon))er.push(r.id+': icon must be a lowercase name.');
    if(r.research!==undefined)checkResearch(r.research,r.id,er,wa);
    if(!Array.isArray(r.bricks)||!r.bricks.length)er.push(r.id+': needs at least one brick.');
    else r.bricks.forEach(function(id){if(!brickIds.has(id))er.push(r.id+': refers to unknown brick "'+id+'".');});
  });
  if(er.length)return{er:er,wa:wa};
  var seen2={};
  var deps=new Map();
  c.platforms.concat(c.bricks).forEach(function(n){deps.set(n.id,(n.runsOn||[]).concat(n.requires||[]));});
  function visit(id,trail){
    if(seen2[id]===2)return;
    if(seen2[id]===1){er.push('Platforms and bricks depend on each other in a loop: '+trail.concat(id).join(' > ')+'.');return;}
    seen2[id]=1;
    (deps.get(id)||[]).forEach(function(q){visit(q,trail.concat(id));});
    seen2[id]=2;
  }
  deps.forEach(function(v,id){visit(id,[]);});
  if(er.length)return{er:er,wa:wa};
  var g=buildGraph(c);
  c.recipes.forEach(function(r){
    if(r.bricks.length<2)return;
    var set=new Set(r.bricks),seen=new Set([r.bricks[0]]),queue=[r.bricks[0]];
    while(queue.length){
      var cur=queue.shift();
      g.edges.forEach(function(e){
        var o=e.from===cur?e.to:e.to===cur?e.from:null;
        if(o&&set.has(o)&&!seen.has(o)){seen.add(o);queue.push(o);}
      });
    }
    if(seen.size!==set.size)wa.push('Recipe "'+r.title+'": its bricks do not connect through studs.');
  });
  var used=new Set();
  c.bricks.forEach(function(b){b.provides.concat(b.accepts).forEach(function(s){used.add(s);});});
  c.studs.forEach(function(s){if(!used.has(s.id))wa.push('Stud "'+s.id+'" is not used by any brick.');});
  if(c.platforms.length){
    c.platforms.forEach(function(p){if(!g.runs.some(function(e){return e.to===p.id;}))wa.push('Platform "'+p.id+'" is not used by any brick.');});
    c.bricks.forEach(function(b){if(!(b.runsOn||[]).length&&!(b.requires||[]).length)wa.push('Brick "'+b.id+'" has no infrastructure defined.');});
  }
  return{er:er,wa:wa};
}

/* ---------- graph ---------- */
function buildGraph(c){
  var byId=new Map(c.bricks.map(function(b){return[b.id,b];}));
  var platById=new Map(c.platforms.map(function(p){return[p.id,p];}));
  var nodeById=new Map();
  c.platforms.forEach(function(p){nodeById.set(p.id,p);});
  c.bricks.forEach(function(b){nodeById.set(b.id,b);});
  var edges=[];
  c.bricks.forEach(function(a){
    a.accepts.forEach(function(s){
      c.bricks.forEach(function(b){
        if(b.id!==a.id&&b.provides.indexOf(s)>=0)edges.push({from:a.id,to:b.id,stud:s});
      });
    });
  });
  var depth=new Map(c.bricks.map(function(b){return[b.id,0];}));
  for(var k=0;k<c.bricks.length;k++){
    var changed=false;
    edges.forEach(function(e){
      var d=depth.get(e.from)+1;
      if(d>depth.get(e.to)&&d<c.bricks.length){depth.set(e.to,d);changed=true;}
    });
    if(!changed)break;
  }
  var linked=new Set();
  edges.forEach(function(e){linked.add(e.from);linked.add(e.to);});
  var layers=[];
  c.bricks.forEach(function(b){
    if(!linked.has(b.id))return;
    var d=depth.get(b.id);
    (layers[d]=layers[d]||[]).push(b.id);
  });
  var runs=[];
  c.bricks.concat(c.platforms).forEach(function(n){
    (n.runsOn||[]).forEach(function(q,i){runs.push({from:n.id,to:q,altIndex:i,kind:'runsOn'});});
    (n.requires||[]).forEach(function(q){runs.push({from:n.id,to:q,altIndex:0,kind:'requires'});});
  });
  return{
    byId:byId,platById:platById,nodeById:nodeById,edges:edges,runs:runs,layers:layers.filter(Boolean),
    loose:c.bricks.filter(function(b){return!linked.has(b.id);}).map(function(b){return b.id;})
  };
}

/* ---------- collection (manifest of topics) ---------- */
function validateCollection(m){
  var er=[],wa=[];
  if(!isObj(m))return{er:['The collection is not a JSON object.'],wa:wa};
  if(m.schemaVersion!==COLLECTION_VERSION)er.push('collection schemaVersion is "'+m.schemaVersion+'". This viewer reads "'+COLLECTION_VERSION+'".');
  if(!str(m.title))er.push('The collection needs a title.');
  if(!Array.isArray(m.topics)||!m.topics.length){er.push('The collection needs at least one topic.');return{er:er,wa:wa};}
  var ids=new Set(),files=new Set();
  m.topics.forEach(function(t,i){
    var at='topics['+i+']';
    if(!isObj(t)){er.push(at+' must be an object.');return;}
    if(!ID.test(t.id||''))er.push(at+' needs a valid id.');
    else{if(ids.has(t.id))er.push('Duplicate topic id "'+t.id+'".');ids.add(t.id);}
    if(typeof t.file!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(t.file))er.push(at+' needs a file name like profile.json, without a path.');
    else{if(files.has(t.file))er.push('Duplicate topic file "'+t.file+'".');files.add(t.file);}
    if(t.icon!==undefined&&!/^[a-z0-9-]+$/.test(t.icon))er.push(at+': icon must be a lowercase name.');
  });
  return{er:er,wa:wa};
}

var api = { validate: validate, buildGraph: buildGraph, validateCollection: validateCollection, VERSION: VERSION, COLLECTION_VERSION: COLLECTION_VERSION };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.CatalogCore = api;
})(typeof self !== 'undefined' ? self : this);
