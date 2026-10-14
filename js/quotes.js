/* BTQuotes — live stock quotes via Finnhub for Budget Tracker.
   Plain script (global namespace, no modules) so file:// works.
   The API key lives ONLY in browser localStorage (bta_finnhub_key) and is
   transmitted ONLY to https://api.finnhub.io. Quote cache is also local. */
var BTQuotes=(function(){
"use strict";

var KEY_LS="bta_finnhub_key";
var CACHE_LS="bta_quotes_v1";
var API="https://finnhub.io/api/v1/quote";

function getKey(){try{return localStorage.getItem(KEY_LS)||"";}catch(e){return "";}}
function hasKey(){return !!getKey();}
function setKey(k){try{localStorage.setItem(KEY_LS,String(k||"").trim());}catch(e){}}
function clearKey(){try{localStorage.removeItem(KEY_LS);}catch(e){}}
function masked(){var k=getKey();return k?("\u2022\u2022\u2022\u2022"+k.slice(-4)):"";}

function loadCache(){
  try{var c=JSON.parse(localStorage.getItem(CACHE_LS));
    return(c&&typeof c==="object")?c:{};}catch(e){return {};}
}
var cache=loadCache();
function saveCache(){try{localStorage.setItem(CACHE_LS,JSON.stringify(cache));}catch(e){}}

function getCached(sym){
  sym=String(sym||"").toUpperCase();
  return cache[sym]||null;
}

function ageText(sym){
  var q=getCached(sym);
  if(!q||!q.ts)return "";
  var s=Math.floor((Date.now()-q.ts)/1000);
  if(s<60)return "just now";
  var m=Math.floor(s/60);
  if(m<60)return m+"m ago";
  var h=Math.floor(m/60);
  if(h<24)return h+"h ago";
  return Math.floor(h/24)+"d ago";
}

/* Fetch one quote. Response fields used: c (current), pc (prev close). */
function fetchOne(sym){
  var key=getKey();
  if(!key)return Promise.reject(new Error("no api key"));
  var url=API+"?symbol="+encodeURIComponent(sym)+"&token="+encodeURIComponent(key);
  return fetch(url).then(function(r){
    if(!r.ok)throw new Error("HTTP "+r.status);
    return r.json();
  }).then(function(j){
    if(!j||typeof j.c!=="number"||!(j.c>0))throw new Error("bad quote for "+sym);
    cache[sym]={c:j.c,pc:(typeof j.pc==="number"?j.pc:null),ts:Date.now()};
    saveCache();
    return cache[sym];
  });
}

/* Refresh quotes for a list of symbols, 4 concurrent requests.
   onDone({ok, fail}) always called. Failures fall back to cached/manual. */
function refresh(symbols,onDone){
  symbols=(symbols||[]).map(function(s){return String(s||"").toUpperCase();}).filter(Boolean);
  symbols=symbols.filter(function(s,i){return symbols.indexOf(s)===i;});
  function done(r){if(onDone){try{onDone(r);}catch(e){}}}
  if(!hasKey()||!symbols.length){done({ok:0,fail:symbols.length});return;}
  var i=0,ok=0,fail=0;
  function next(){
    if(i>=symbols.length)return Promise.resolve();
    var sym=symbols[i++];
    return fetchOne(sym).then(function(){ok++;},function(){fail++;}).then(next);
  }
  var workers=[];
  for(var w=0;w<4;w++)workers.push(next());
  Promise.all(workers).then(function(){done({ok:ok,fail:fail});});
}

return{
  getKey:getKey,hasKey:hasKey,setKey:setKey,clearKey:clearKey,masked:masked,
  getCached:getCached,ageText:ageText,refresh:refresh
};
})();
