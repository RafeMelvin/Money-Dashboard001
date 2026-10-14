/* BTCSV — brokerage CSV import for Budget Tracker.
   Plain script (globals, no modules) so file:// works. No dependencies.
   Supports: generic ticker/shares/price/cost files, Fidelity, Charles Schwab,
   Vanguard, Robinhood exports (header-alias detection), plus a manual
   column-mapping fallback when headers are not recognized. */
"use strict";

/* Shared CSV row splitter: handles quoted fields and "" escapes. */
function splitRowCSV(r){
  var out=[],cur="",q=false;
  for(var i=0;i<r.length;i++){var ch=r[i];
    if(ch==='"'){if(q&&r[i+1]==='"'){cur+='"';i++;}else{q=!q;}}
    else if(ch===","&&!q){out.push(cur);cur="";}
    else{cur+=ch;}}
  out.push(cur);return out;
}

/* Generic CSV importer (kept from the original single-file edition):
   needs ticker + shares; price / cost / dividend optional. */
function parseCSV(text){
  var lines=String(text||"").split(/\r?\n/).filter(function(l){return l.trim();});
  if(lines.length<2)return[];
  var head=splitRowCSV(lines[0]).map(function(h){return h.trim().toLowerCase();});
  function col(){for(var i=0;i<arguments.length;i++){var ix=head.indexOf(arguments[i]);if(ix>=0)return ix;}return -1;}
  var ci=col("ticker","symbol"),si=col("shares","quantity","qty"),
      pi=col("price","current price","price per share"),
      ki=col("cost","cost basis","cost per share","cost/share"),
      di=col("dividend","div","annual dividend","div/yr");
  var rows=[];
  for(var l=1;l<lines.length;l++){var c=splitRowCSV(lines[l]);
    var tick=ci>=0?(c[ci]||"").trim().toUpperCase():"";if(!tick)continue;
    var sh=si>=0?parseFloat((c[si]||"").replace(/,/g,"")):NaN;if(!(sh>0))continue;
    rows.push({ticker:tick,shares:sh,price:pi>=0?(c[pi]||"").trim():"",cost:ki>=0?(c[ki]||"").trim():"",div:di>=0?(c[di]||"").trim():""});}
  return rows;
}

var BTCSV=(function(){
"use strict";

var TICKER_ALIASES=["symbol","ticker","instrument","security symbol"];
var SHARES_ALIASES=["quantity","shares","qty","# of shares","number of shares","shares held","units","share balance"];
var PRICE_ALIASES=["last price","price","current price","market price","price per share","last","closing price"];
var COST_PS_ALIASES=["average cost basis","average cost","cost basis per share","cost per share","cost/share","unit cost","avg cost","average price"];
var COST_TOT_ALIASES=["cost basis total","total cost basis","total cost","cost basis"];

function norm(h){return String(h==null?"":h).trim().toLowerCase().replace(/\s+/g," ");}

function aliasIndex(headers,aliases){
  for(var i=0;i<aliases.length;i++){var ix=headers.indexOf(aliases[i]);if(ix>=0)return ix;}
  return -1;
}

function cleanTicker(t){
  t=String(t||"").trim().toUpperCase().replace(/^\*/,"");
  if(!/^[A-Z0-9.\-]{1,10}$/.test(t))return "";
  if(/^(TOTAL|CASH|ACCOUNT|SUBTOTAL)$/.test(t))return "";
  return t;
}

function cleanNum(v){
  if(v==null)return NaN;
  var s=String(v).trim().replace(/[$,]/g,"");
  if(s===""||/^n\/?a$/i.test(s)||/--/.test(s))return NaN;
  s=s.replace(/[()]/g,"");
  var n=parseFloat(s);return isNaN(n)?NaN:n;
}

/* Find the header row: scan the first 30 lines, pick the row with the
   most column-header alias hits (handles Fidelity/Schwab preamble lines). */
function findHeader(lines){
  var best={index:-1,score:0,headers:[]};
  var max=Math.min(lines.length,30);
  for(var i=0;i<max;i++){
    var cells=splitRowCSV(lines[i]).map(norm);
    if(!cells.length)continue;
    var score=0;
    TICKER_ALIASES.forEach(function(a){if(cells.indexOf(a)>=0)score+=3;});
    SHARES_ALIASES.forEach(function(a){if(cells.indexOf(a)>=0)score+=2;});
    PRICE_ALIASES.forEach(function(a){if(cells.indexOf(a)>=0)score+=1;});
    if(score>best.score)best={index:i,score:score,headers:cells};
  }
  return best.index>=0?best:null;
}

function mapColumns(headers){
  return{
    ticker:aliasIndex(headers,TICKER_ALIASES),
    shares:aliasIndex(headers,SHARES_ALIASES),
    price:aliasIndex(headers,PRICE_ALIASES),
    costPS:aliasIndex(headers,COST_PS_ALIASES),
    costTot:aliasIndex(headers,COST_TOT_ALIASES)
  };
}

function detectBroker(headText,headers){
  var t=String(headText||"").toLowerCase();
  function has(sub){return headers.some(function(h){return h.indexOf(sub)>=0;});}
  if(t.indexOf("fidelity")>=0||headers.indexOf("cost basis total")>=0)return "Fidelity";
  if(t.indexOf("schwab")>=0||has("mkt val"))return "Charles Schwab";
  if(t.indexOf("vanguard")>=0)return "Vanguard";
  if(t.indexOf("robinhood")>=0)return "Robinhood";
  return "generic";
}

function rowsFromLines(lines,hi,map){
  var rows=[],skipped=0;
  for(var l=hi+1;l<lines.length;l++){
    var line=lines[l];if(!line.trim())continue;
    var c=splitRowCSV(line);
    var tick=map.ticker>=0?cleanTicker(c[map.ticker]):"";
    if(!tick){skipped++;continue;}
    var sh=map.shares>=0?cleanNum(c[map.shares]):NaN;
    if(!(sh>0)){skipped++;continue;}
    var price=map.price>=0?cleanNum(c[map.price]):NaN;
    var costPS=map.costPS>=0?cleanNum(c[map.costPS]):NaN;
    var costTot=map.costTot>=0?cleanNum(c[map.costTot]):NaN;
    var cost=isNaN(costPS)?(isNaN(costTot)?"":Math.round((costTot/sh)*100)/100):Math.round(costPS*100)/100;
    rows.push({ticker:tick,
      shares:Math.round(sh*10000)/10000,
      price:isNaN(price)?"":Math.round(price*100)/100,
      cost:(cost===""||isNaN(cost))?"":cost,
      div:""});
  }
  return{rows:rows,skipped:skipped};
}

/* Main entry: parse pasted/uploaded CSV text.
   Returns {broker, headers, rows, skipped, needsMapping, guess, raw}. */
function importText(text){
  text=String(text||"").replace(/^\uFEFF/,"");
  var lines=text.split(/\r?\n/);
  var found=findHeader(lines);
  if(!found){
    var h0=splitRowCSV(lines[0]||"").map(function(h){return h.trim();});
    return{broker:null,headers:h0,rows:[],skipped:0,needsMapping:true,
      guess:{ticker:-1,shares:-1,price:-1,cost:-1},
      raw:{lines:lines,headerIndex:0}};
  }
  var map=mapColumns(found.headers);
  var broker=detectBroker(lines.slice(0,Math.min(8,found.index+1)).join("\n"),found.headers);
  var needsMapping=(map.ticker<0||map.shares<0);
  var out={broker:broker==="generic"?null:broker,
    headers:splitRowCSV(lines[found.index]).map(function(h){return h.trim();}),
    rows:[],skipped:0,needsMapping:needsMapping,
    guess:{ticker:map.ticker,shares:map.shares,price:map.price,cost:map.costPS>=0?map.costPS:-1},
    raw:{lines:lines,headerIndex:found.index,map:map}};
  if(!needsMapping){
    var r=rowsFromLines(lines,found.index,map);
    out.rows=r.rows;out.skipped=r.skipped;
  }
  return out;
}

/* Manual fallback: re-parse using a user-supplied column mapping.
   mapping = {ticker:idx, shares:idx, price:idx, cost:idx} (-1 = none). */
function remap(imp,mapping){
  var map={ticker:mapping.ticker,shares:mapping.shares,price:mapping.price,
    costPS:mapping.cost,costTot:-1};
  var r=rowsFromLines(imp.raw.lines,imp.raw.headerIndex,map);
  return{broker:imp.broker,headers:imp.headers,rows:r.rows,skipped:r.skipped,needsMapping:false};
}

return{importText:importText,remap:remap,parseCSV:parseCSV,splitRowCSV:splitRowCSV};
})();
