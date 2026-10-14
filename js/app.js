
(function(){
"use strict";
/* ---------- utils ---------- */
var LS="bta_v1";
var PALETTE=["#22d3ee","#8b5cf6","#34d399","#fbbf24","#fb7185","#60a5fa","#f472b6","#a3e635","#f97316","#2dd4bf"];
var DEFCAT={Housing:"#22d3ee",Food:"#34d399",Transport:"#fbbf24",Utilities:"#60a5fa",Insurance:"#8b5cf6",Subscriptions:"#f472b6",Health:"#fb7185",Fun:"#a3e635",Other:"#5b6685"};
var state={income:{amount:"",freq:"monthly"},oneTime:[],rate:"",weekOffset:0,dayHours:{},
  expenses:[],debts:[],assets:[],invAccts:[],payoff:{},calcFilter:"all",calcSearch:""};
try{var s=JSON.parse(localStorage.getItem(LS));if(s&&typeof s==="object")state=Object.assign(state,s);}catch(e){}
var hadSave=false;try{hadSave=!!localStorage.getItem(LS);}catch(e){}
if(!hadSave){try{var oldS=JSON.parse(localStorage.getItem("bt_file_v2"));if(oldS&&typeof oldS==="object"){state=Object.assign(state,oldS);save();}}catch(e){}}
if(!state.payoff)state.payoff={};
if(!state.dayHours)state.dayHours={};
["expenses","debts","assets","invAccts","oneTime","metals"].forEach(function(k){if(!Array.isArray(state[k]))state[k]=[];});
state.debts.forEach(function(d){if(!Array.isArray(d.txns))d.txns=[];if(!Array.isArray(d.payments))d.payments=[];});
state.invAccts.forEach(function(a){if(!Array.isArray(a.holdings))a.holdings=[];
a.holdings.forEach(function(h){if(h.useLive===undefined)h.useLive=true;});});
function save(){try{localStorage.setItem(LS,JSON.stringify(state));}catch(e){}}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function pnum(v){if(v==null)return 0;var n=parseFloat(String(v).replace(/,/g,""));return isNaN(n)?0:n;}
function fmt(n,d){if(n==null||isNaN(n)||!isFinite(n))return "—";return n.toLocaleString("en-US",{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d});}
function money(n){if(n==null||isNaN(n)||!isFinite(n))return "—";var a=Math.abs(n);return(n<0?"−$":"$")+a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
function signed(n){if(n==null||isNaN(n)||!isFinite(n))return "—";return(n>0?"+":"")+fmt(n);}
function signedMoney(n){if(n==null||isNaN(n)||!isFinite(n))return "—";return(n>0?"+":"")+money(n);}
function cls(n){return n>0?"up":(n<0?"down":"flat");}
function toMonthly(amt,freq){amt=pnum(amt);if(freq==="weekly")return amt*52/12;if(freq==="biweekly")return amt*26/12;if(freq==="yearly")return amt/12;return amt;}
function txnSum(d){return(d.txns||[]).reduce(function(a,t){return a+pnum(t.amount);},0);}
function paySum(d){return(d.payments||[]).reduce(function(a,t){return a+pnum(t.amount);},0);}
function debtTotal(d){return pnum(d.balance)+txnSum(d)-paySum(d);}
function metalsTotal(){return state.metals.reduce(function(a,m){return a+pnum(m.ounces)*pnum(m.price);},0);}
function effPrice(h){var q=(window.BTQuotes?BTQuotes.getCached(h.ticker):null);if(h.useLive!==false&&q&&q.c>0)return q.c;return pnum(h.price);}
function priceSrc(h){var q=(window.BTQuotes?BTQuotes.getCached(h.ticker):null);return(h.useLive!==false&&q&&q.c>0)?"live":"manual";}
function dayGain(h){var q=(window.BTQuotes?BTQuotes.getCached(h.ticker):null);if(!(h.useLive!==false&&q&&q.c>0&&q.pc>0))return null;return(q.c-q.pc)*pnum(h.shares);}
function dayGainPct(h){var q=(window.BTQuotes?BTQuotes.getCached(h.ticker):null);if(!(h.useLive!==false&&q&&q.c>0&&q.pc>0))return null;return(q.c-q.pc)/q.pc*100;}
function holdingVal(h){return pnum(h.shares)*effPrice(h);}
function holdingCost(h){return pnum(h.shares)*pnum(h.cost);}
function acctTotal(a){return(a.holdings||[]).reduce(function(s,h){return s+holdingVal(h);},0);}
function allAssets(){var m=state.assets.reduce(function(a,x){return a+pnum(x.value);},0)+metalsTotal();var i=state.invAccts.reduce(function(a,x){return a+acctTotal(x);},0);return m+i;}
function allDebt(){return state.debts.reduce(function(a,d){return a+debtTotal(d);},0);}
function totals(){var mInc=toMonthly(state.income.amount,state.income.freq);
  var mExp=state.expenses.reduce(function(a,e){return a+toMonthly(e.amount,e.freq);},0);
  var mPay=state.debts.reduce(function(a,d){return a+pnum(d.minpay);},0);
  var debt=allDebt(),assets=allAssets();
  return{mInc:mInc,mExp:mExp,mPay:mPay,cash:mInc-mExp-mPay,debt:debt,assets:assets,net:assets-debt};}
function donut(segs,size){var total=segs.reduce(function(a,s){return a+s.value;},0)||1;
  var R=70,C=2*Math.PI*R,off=0,out="";
  segs.forEach(function(g){var frac=g.value/total,len=frac*C;
    out+='<circle r="'+R+'" cx="90" cy="90" fill="none" stroke="'+g.color+'" stroke-width="26" stroke-dasharray="'+len.toFixed(1)+' '+C.toFixed(1)+'" stroke-dashoffset="'+(-off).toFixed(1)+'" transform="rotate(-90 90 90)"/>';
    off+=len;});
  var px=size||180;
  return '<svg viewBox="0 0 180 180" width="'+px+'" height="'+px+'">'+out+'</svg>';}
function addMonths(date,n){var d=new Date(date);d.setMonth(d.getMonth()+n);return d;}
function fmtDate(d){return d.toLocaleDateString("en-US",{month:"short",year:"numeric"});}
function payoffMonths(balance,apr,pay){var i=apr/100/12;if(pay<=0)return Infinity;if(i<=0)return balance/pay;
  if(pay<=balance*i)return Infinity;return -Math.log(1-i*balance/pay)/Math.log(1+i);}
function loanPayment(principal,apr,months){var i=apr/100/12;if(months<=0)return 0;if(i<=0)return principal/months;
  return principal*i/(1-Math.pow(1+i,-months));}
function parseHours(str){str=String(str||"").trim();if(!str)return 0;
  var m=str.match(/^(\d+):([0-5]?\d)$/);if(m)return parseInt(m[1],10)+parseInt(m[2],10)/60;
  var n=parseFloat(str.replace(",","."));return isNaN(n)||n<0?0:n;}
function weekStart(offset){var d=new Date();d.setHours(0,0,0,0);var dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow+(offset||0)*7);return d;}
function dayKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function weeklyTaxes(gross){var annual=gross*52;
  var taxable=Math.max(0,annual-15000),fed=0,prev=0;
  var br=[[11925,.10],[48475,.12],[103350,.22],[197300,.24],[250525,.32],[626350,.35],[1e15,.37]];
  for(var i=0;i<br.length;i++){if(taxable>prev){fed+=(Math.min(taxable,br[i][0])-prev)*br[i][1];prev=br[i][0];}else break;}
  return{fed:fed/52,mi:annual*.0425/52,ss:Math.min(annual,184500)*.062/52,med:annual*.0145/52};}
var expanded={};

/* ---------- tabs ---------- */
document.querySelectorAll(".tab").forEach(function(btn){
  btn.addEventListener("click",function(){
    document.querySelectorAll(".tab").forEach(function(b){b.classList.remove("active");});
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(function(v){v.classList.remove("active");});
    $("view-"+btn.dataset.tab).classList.add("active");
    render();
  });
});

/* ---------- overview ---------- */
function renderOverview(){
  var b=totals(),el=$("view-overview");
  var expByName={};
  state.expenses.forEach(function(e){var k=e.name||"Unnamed";expByName[k]={value:(expByName[k]||{value:0}).value+toMonthly(e.amount,e.freq),color:e.color||DEFCAT[e.cat]||"#5b6685"};});
  var segs=Object.keys(expByName).map(function(k){return{label:k,value:expByName[k].value,color:expByName[k].color};})
    .sort(function(a,c){return c.value-a.value;});
  var totExp=segs.reduce(function(a,s){return a+s.value;},0);
  var mx=Math.max(b.assets,b.debt,1);
  var h='<div class="cards">'+
    '<div class="card clickable" data-goto="overview"><div class="label">Net Worth</div><div class="big '+cls(b.net)+'">'+money(b.net)+'</div></div>'+
    '<div class="card clickable" data-goto="income"><div class="label">Monthly Cash Flow</div><div class="big '+cls(b.cash)+'">'+signed(b.cash)+' /mo</div></div>'+
    '<div class="card clickable" data-goto="assets"><div class="label">Total Assets</div><div class="big">'+money(b.assets)+'</div></div>'+
    '<div class="card clickable" data-goto="debts"><div class="label">Total Debt</div><div class="big '+(b.debt>0?"down":"flat")+'">'+money(b.debt)+'</div></div></div>'+
    '<div class="card section"><h3>Weekly spending vs income</h3>';
  if(!segs.length){h+='<div class="empty">Add expenses to see your spending wheel.</div>';}
  else{
    h+='<div class="donut-wrap"><div class="donut-c">'+donut(segs)+
       '<div class="ctr"><div class="v">'+money(totExp)+'</div><div class="l">exp / mo</div></div></div><div class="legend">';
    segs.forEach(function(s){h+='<div class="li"><span class="dot" style="background:'+s.color+'"></span>'+esc(s.label)+'<span class="vv">'+money(s.value)+'</span></div>';});
    h+='</div></div><div class="note">Income: <b>'+money(b.mInc)+'</b>/mo &middot; left over: <b class="'+cls(b.mInc-totExp)+'">'+money(b.mInc-totExp)+'</b>/mo</div>';
  }
  h+='</div><div class="grid2"><div class="card section"><h3>Assets vs Debt</h3>'+
    '<div class="hbar-lbl"><span><b style="color:var(--green)">●</b> Assets <b>'+money(b.assets)+'</b></span></div>'+
    '<div class="hbar"><div style="background:var(--green);width:'+(b.assets/mx*100)+'%"></div></div>'+
    '<div class="hbar-lbl" style="margin-top:10px"><span><b style="color:var(--red)">●</b> Debt <b>'+money(b.debt)+'</b></span></div>'+
    '<div class="hbar"><div style="background:var(--red);width:'+(b.debt/mx*100)+'%"></div></div></div>'+
    '<div class="card section"><h3>Snapshot</h3>'+
     '<div class="kv"><span class="k">Monthly income</span><span class="v">'+money(b.mInc)+'</span></div>'+
     '<div class="kv"><span class="k">Monthly expenses</span><span class="v">'+money(b.mExp)+'</span></div>'+
     '<div class="kv"><span class="k">Monthly debt minimums</span><span class="v">'+money(b.mPay)+'</span></div>'+
     '<div class="kv"><span class="k">Debts tracked</span><span class="v">'+state.debts.length+'</span></div>'+
     '<div class="kv"><span class="k">Assets tracked</span><span class="v">'+(state.assets.length+state.invAccts.length+state.metals.length)+'</span></div>'+
     '</div></div>';
  el.innerHTML=h;
  el.querySelectorAll("[data-goto]").forEach(function(c){c.addEventListener("click",function(){
    var t=c.dataset.goto;
    document.querySelectorAll(".tab").forEach(function(x){x.classList.toggle("active",x.dataset.tab===t);});
    document.querySelectorAll(".view").forEach(function(v){v.classList.remove("active");});
    $("view-"+t).classList.add("active");window.scrollTo(0,0);render();});});
}

/* ---------- planning ---------- */
var calcState={q:"",cat:"all"};
function renderPlanning(){
  var el=$("view-planning"),h="";
  /* debt payoff tracker */
  h+='<div class="card section"><h3>Debt payoff tracker</h3>';
  if(!state.debts.length){h+='<div class="empty">Add debts on the Debts tab to track payoffs.</div>';}
  state.debts.forEach(function(d){
    var pid="po_"+d.id, open=expanded[pid];
    var cfg=state.payoff[d.id]||{payAmt:"",payFreq:"monthly",goalDate:""};
    h+='<div class="paybox"><div class="pt" data-po="'+d.id+'" style="cursor:pointer"><span style="color:var(--cyan)">'+(open?"▾":"▸")+'</span> '+esc(d.name)+
       ' <span class="cname">'+money(debtTotal(d))+(d.apr?" · "+fmt(pnum(d.apr),2)+"% APR":"")+'</span></div>';
    if(open){
      var pm=toMonthly(cfg.payAmt,cfg.payFreq), bal=debtTotal(d), apr=pnum(d.apr);
      h+='<div class="grid2"><div><div class="label" style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:6px">YOUR PAYMENT</div>'+
         '<div class="form-row" style="margin-top:0"><input class="num" style="width:120px" data-poamt="'+d.id+'" type="text" inputmode="decimal" placeholder="0.00" value="'+esc(cfg.payAmt)+'">'+
         '<select data-pofreq="'+d.id+'"><option value="weekly">per week</option><option value="biweekly"'+(cfg.payFreq==="biweekly"?" selected":"")+'>every 2 weeks</option><option value="monthly"'+(cfg.payFreq==="monthly"?" selected":"")+'>per month</option></select></div>';
      var n=payoffMonths(bal,apr,pm);
      if(pm>0&&isFinite(n)){var dt=addMonths(new Date(),Math.ceil(n));
        h+='<div class="resline">At this payment: paid off by <b>'+fmtDate(dt)+'</b> ('+Math.ceil(n)+' months)</div>';}
      else if(pm>0){h+='<div class="resline" style="color:var(--red)">Payment doesn\'t cover the interest — balance would grow.</div>';}
      h+='</div><div><div class="label" style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:6px">PAYOFF GOAL</div>'+
         '<div class="form-row" style="margin-top:0"><input type="date" data-pogoal="'+d.id+'" value="'+esc(cfg.goalDate||"")+'"></div>';
      if(cfg.goalDate){
        var gdate=new Date(cfg.goalDate+"T12:00:00"),now=new Date();
        var mn=Math.max(1,Math.round((gdate-now)/(30.44*86400000)));
        var req=loanPayment(bal,apr,mn),extra=Math.max(0,req-pm);
        h+='<div class="resline">To reach your goal: <b>'+money(req)+'</b>/mo'+(extra>0?' — that\'s <b>'+money(extra)+'</b>/mo extra':" — you're on pace")+'</div>';
      }
      h+='</div></div>'+
         '<div class="label" style="font-size:11px;letter-spacing:2px;color:var(--muted);margin:10px 0 6px">EXTRA PAYMENT IMPACT</div>'+
         '<div class="form-row" style="margin-top:0"><input class="num" style="width:110px" data-poextra="'+d.id+'" type="text" inputmode="decimal" placeholder="$ extra">'+
         '<select data-poxtype="'+d.id+'"><option value="recurring">recurring / mo</option><option value="once">one-time</option></select>'+
         '<button class="mini" data-poxgo="'+d.id+'">Calculate</button></div><div data-poxres="'+d.id+'"></div>'+
         '<div class="form-row"><button data-posave="'+d.id+'">Save plan</button></div>';
    }
    h+='</div>';
  });
  h+='</div>';
  /* calculators */
  var q=(calcState.q||"").toLowerCase();
  function show(name,cat){return (calcState.cat==="all"||calcState.cat===cat)&&(!q||name.toLowerCase().indexOf(q)>=0);}
  h+='<div class="toolbar"><input type="text" id="calcQ" placeholder="Search calculators…" value="'+esc(calcState.q)+'">'+
     '<button class="chip'+(calcState.cat==="all"?" on":"")+'" data-ccat="all">All</button>'+
     '<button class="chip'+(calcState.cat==="investing"?" on":"")+'" data-ccat="investing">Investing</button>'+
     '<button class="chip'+(calcState.cat==="loan"?" on":"")+'" data-ccat="loan">Loan</button></div><div class="calc-grid">';
  if(show("growth projection","investing")){
    h+='<div class="card section"><h3>#1 · Growth Projection <span class="cname">· Investing</span></h3>'+
    '<div class="form-row"><input class="num" id="gPV" type="text" inputmode="decimal" placeholder="starting $" style="width:120px">'+
    '<input class="num" id="gPMT" type="text" inputmode="decimal" placeholder="$ / month" style="width:120px"></div>'+
    '<div class="form-row"><input class="num" id="gRate" type="text" inputmode="decimal" placeholder="return % / yr" style="width:120px">'+
    '<input class="num" id="gYrs" type="text" inputmode="decimal" placeholder="years" style="width:90px">'+
    '<button id="gGo">Calculate</button></div><div id="gRes"></div></div>';
  }
  if(show("loan payment","loan")){
    h+='<div class="card section"><h3>#2 · Loan Payment <span class="cname">· Loan</span></h3>'+
    '<div class="form-row"><input class="num" id="lAmt" type="text" inputmode="decimal" placeholder="loan $" style="width:120px">'+
    '<input class="num" id="lApr" type="text" inputmode="decimal" placeholder="APR %" style="width:100px"></div>'+
    '<div class="form-row"><input class="num" id="lYrs" type="text" inputmode="decimal" placeholder="years" style="width:90px">'+
    '<button id="lGo">Calculate</button></div><div id="lRes"></div></div>';
  }
  if(show("refinance comparison","loan")){
    h+='<div class="card section"><h3>#3 · Refinance Comparison <span class="cname">· Loan</span></h3>'+
    '<div class="form-row"><input class="num" id="rBal" type="text" inputmode="decimal" placeholder="balance $" style="width:120px">'+
    '<input class="num" id="rCur" type="text" inputmode="decimal" placeholder="current APR %" style="width:120px"></div>'+
    '<div class="form-row"><input class="num" id="rPay" type="text" inputmode="decimal" placeholder="current $/mo" style="width:120px">'+
    '<input class="num" id="rNew" type="text" inputmode="decimal" placeholder="new APR %" style="width:120px"></div>'+
    '<div class="form-row"><input class="num" id="rTerm" type="text" inputmode="decimal" placeholder="new term yrs" style="width:120px">'+
    '<input class="num" id="rCost" type="text" inputmode="decimal" placeholder="closing costs $" style="width:120px">'+
    '<button id="rGo">Calculate</button></div><div id="rRes"></div></div>';
  }
  h+='</div>';
  el.innerHTML=h;
  /* bindings */
  el.querySelectorAll("[data-po]").forEach(function(t){t.addEventListener("click",function(){var id=t.dataset.po;expanded["po_"+id]=!expanded["po_"+id];render();});});
  el.querySelectorAll("[data-poamt]").forEach(function(i){i.addEventListener("change",function(){var id=i.dataset.poamt;state.payoff[id]=state.payoff[id]||{};state.payoff[id].payAmt=i.value;save();render();});});
  el.querySelectorAll("[data-pofreq]").forEach(function(i){i.addEventListener("change",function(){var id=i.dataset.pofreq;state.payoff[id]=state.payoff[id]||{};state.payoff[id].payFreq=i.value;save();render();});});
  el.querySelectorAll("[data-pogoal]").forEach(function(i){i.addEventListener("change",function(){var id=i.dataset.pogoal;state.payoff[id]=state.payoff[id]||{};state.payoff[id].goalDate=i.value;save();render();});});
  el.querySelectorAll("[data-posave]").forEach(function(b){b.addEventListener("click",function(){save();b.textContent="Saved ✓";setTimeout(function(){b.textContent="Save plan";},1200);});});
  el.querySelectorAll("[data-poxgo]").forEach(function(b){b.addEventListener("click",function(){
    var id=b.dataset.poxgo,d=state.debts.filter(function(x){return x.id===id;})[0];if(!d)return;
    var xAmt=pnum(el.querySelector('[data-poextra="'+id+'"]').value),
        xtype=el.querySelector('[data-poxtype="'+id+'"]').value,
        bal=debtTotal(d),apr=pnum(d.apr),base=Math.max(pnum(d.minpay),1);
    var n0=payoffMonths(bal,apr,base),i0=isFinite(n0)?base*n0-bal:NaN;
    var res=el.querySelector('[data-poxres="'+id+'"]');
    if(!(xAmt>0)){res.innerHTML='<div class="empty">Enter an extra amount first.</div>';return;}
    if(xtype==="once"){var nb=Math.max(0,bal-xAmt),n1=payoffMonths(nb,apr,base),i1=isFinite(n1)?base*n1-nb:NaN;
      res.innerHTML='<div class="resline">One-time '+money(xAmt)+': payoff in <b>'+(isFinite(n1)?Math.ceil(n1)+" months":"—")+'</b> (was '+(isFinite(n0)?Math.ceil(n0):"—")+'), interest <b>'+money(i1)+'</b> (was '+money(i0)+'), saves <b class="up">'+money(i0-i1)+'</b>.</div>';}
    else{var n2=payoffMonths(bal,apr,base+xAmt),i2=isFinite(n2)?(base+xAmt)*n2-bal:NaN;
      res.innerHTML='<div class="resline">Extra '+money(xAmt)+'/mo: payoff in <b>'+(isFinite(n2)?Math.ceil(n2)+" months":"—")+'</b> (was '+(isFinite(n0)?Math.ceil(n0):"—")+'), interest <b>'+money(i2)+'</b> (was '+money(i0)+'), saves <b class="up">'+money(i0-i2)+'</b>.</div>';}
  });});
  var qEl=$("calcQ");
  if(qEl){qEl.addEventListener("input",function(){calcState.q=qEl.value;var v=qEl.value;render();var nq=$("calcQ");if(nq){nq.focus();nq.setSelectionRange(v.length,v.length);}});}
  el.querySelectorAll("[data-ccat]").forEach(function(b){b.addEventListener("click",function(){calcState.cat=b.dataset.ccat;render();});});
  function gv(id){var n=$(id);return n?pnum(n.value):0;}
  var gGo=$("gGo");
  if(gGo)gGo.addEventListener("click",function(){
    var pv=gv("gPV"),pmt=gv("gPMT"),r=gv("gRate")/100/12,yrs=gv("gYrs"),n=Math.round(yrs*12);
    var fv=pv*Math.pow(1+r,n)+(r>0?pmt*((Math.pow(1+r,n)-1)/r):pmt*n);
    var contrib=pv+pmt*n;
    $("gRes").innerHTML='<div class="resline">Future value: <b>'+money(fv)+'</b></div><div class="resline">You put in '+money(contrib)+' · growth '+money(fv-contrib)+'</div><div class="note">Assumes steady '+esc($("gRate").value||"0")+'% annual return, compounded monthly. Estimates only.</div>';
  });
  var lGo=$("lGo");
  if(lGo)lGo.addEventListener("click",function(){
    var amt=gv("lAmt"),apr=gv("lApr"),n=Math.round(gv("lYrs")*12),pay=loanPayment(amt,apr,n);
    $("lRes").innerHTML='<div class="resline">Monthly payment: <b>'+money(pay)+'</b></div><div class="resline">Total interest: '+money(pay*n-amt)+' · total cost '+money(pay*n)+'</div>';
  });
  var rGo=$("rGo");
  if(rGo)rGo.addEventListener("click",function(){
    var bal=gv("rBal"),cur=gv("rCur"),pay=gv("rPay"),nr=gv("rNew"),nt=Math.round(gv("rTerm")*12),cost=gv("rCost");
    var npay=loanPayment(bal,nr,nt),save=pay-npay,be=save>0?cost/save:Infinity;
    var h='<div class="resline">New payment: <b>'+money(npay)+'</b>/mo</div>';
    h+= save>0?'<div class="resline">You save <b class="up">'+money(save)+'</b>/mo · break-even in <b>'+(isFinite(be)?Math.ceil(be)+" months":"—")+'</b></div>'
              :'<div class="resline" style="color:var(--red)">New payment is higher — refinancing costs you '+money(-save)+'/mo.</div>';
    var nCur=payoffMonths(bal,cur,pay),intCur=isFinite(nCur)?pay*nCur-bal:NaN;
    var intNew=npay*nt-bal,intSave=intCur-intNew;
    if(isFinite(intSave))h+='<div class="resline">Interest savings: <b class="'+(intSave>=0?"up":"down")+'">'+signed(intSave)+'</b></div>';
    h+='<div class="note">Interest comparison excludes closing costs.</div>';
    $("rRes").innerHTML=h;
  });
}

/* ---------- income ---------- */
function renderIncome(){
  var el=$("view-income"),h="";
  h+='<div class="grid2"><div><div class="card section"><h3>Recurring income</h3>'+
     '<div class="form-row" style="margin-top:0"><input class="num" id="incAmt2" type="text" inputmode="decimal" placeholder="0.00" style="width:140px" value="'+esc(state.income.amount)+'">'+
     '<select id="incFreq2"><option value="weekly">per week</option><option value="biweekly"'+(state.income.freq==="biweekly"?" selected":"")+'>every 2 weeks</option><option value="monthly"'+(state.income.freq==="monthly"?" selected":"")+'>per month</option><option value="yearly"'+(state.income.freq==="yearly"?" selected":"")+'>per year</option></select></div>'+
     '<div class="note">'+(state.income.amount?"≈ <b style='color:var(--text)'>"+money(toMonthly(state.income.amount,state.income.freq))+"</b> per month":"Enter your take-home pay above.")+'</div></div>'+
     '<div class="card section"><h3>One-time income</h3><div id="otList"></div>'+
     '<div class="form-row"><input class="txt" id="otDesc" type="text" placeholder="e.g. Bonus" maxlength="40">'+
     '<input class="num" id="otAmt" type="text" inputmode="decimal" placeholder="$">'+
     '<input type="date" id="otDate" value="'+new Date().toISOString().slice(0,10)+'"><button id="otAdd">Add</button></div></div></div>'+
     '<div><div class="card section"><h3>2026 earnings</h3><div id="ytdBox"></div><div class="note">Counts from Jan 1, 2026: recurring pay prorated + dated one-time payments.</div></div>'+
     '<div class="card section"><h3>Timecard</h3>'+
     '<div class="form-row" style="margin-top:0"><input class="num" id="rateIn" type="text" inputmode="decimal" placeholder="$ / hour" style="width:120px" value="'+esc(state.rate)+'">'+
     '<button class="ghost mini" id="wkPrev">← Prev week</button><button class="ghost mini" id="wkNext">Next week →</button></div>'+
     '<div id="weekLbl" style="margin:10px 0 4px;color:var(--muted);font-size:13px"></div><div id="dayRows"></div><div id="payRes" style="margin-top:10px"></div>'+
     '<div class="note">Hours over 40/week pay 1.5×. Taxes are 2026 estimates (federal brackets, MI 4.25%, SS, Medicare).</div></div></div></div>';
  el.innerHTML=h;
  $("incAmt2").addEventListener("change",function(){state.income.amount=$("incAmt2").value;save();render();});
  $("incFreq2").addEventListener("change",function(){state.income.freq=$("incFreq2").value;save();render();});
  $("rateIn").addEventListener("change",function(){state.rate=$("rateIn").value;save();render();});
  /* one-time list */
  var ot=$("otList");
  if(!state.oneTime.length)ot.innerHTML='<div class="empty">No one-time payments yet.</div>';
  else{var oh='<table class="mini"><tbody>';
    state.oneTime.forEach(function(o){oh+='<tr><td>'+esc(o.desc)+'<span class="gl-sub">'+esc(o.date)+'</span></td><td style="color:var(--green)">'+money(o.amount)+'</td><td><button class="ghost mini del" data-delot="'+o.id+'">✕</button></td></tr>';});
    ot.innerHTML=oh+'</tbody></table>';}
  ot.querySelectorAll("[data-delot]").forEach(function(b){b.addEventListener("click",function(){state.oneTime=state.oneTime.filter(function(o){return o.id!==b.dataset.delot;});save();render();});});
  $("otAdd").addEventListener("click",function(){
    var d=$("otDesc").value.trim(),a=pnum($("otAmt").value),dt=$("otDate").value;
    if(!d||!(a>0)||!dt)return;
    state.oneTime.push({id:uid(),desc:d,amount:a,date:dt});$("otDesc").value="";$("otAmt").value="";save();render();});
  /* YTD */
  var now=new Date(),jan1=new Date(2026,0,1),daysEl=Math.max(0,(now-jan1)/86400000);
  var recYTD=toMonthly(state.income.amount,state.income.freq)*(daysEl/30.4375);
  var otYTD=state.oneTime.reduce(function(a,o){return a+(o.date>="2026-01-01"?pnum(o.amount):0);},0);
  $("ytdBox").innerHTML='<div class="big" style="color:var(--green)">'+money(recYTD+otYTD)+'</div><div class="note" style="margin-top:6px">Recurring: '+money(recYTD)+' · one-time: '+money(otYTD)+'</div>';
  /* timecard */
  var ws=weekStart(state.weekOffset),we=new Date(ws);we.setDate(we.getDate()+6);
  $("weekLbl").textContent=ws.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" – "+we.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  var dr=$("dayRows"),totH=0,days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  for(var i=0;i<7;i++){var d=new Date(ws);d.setDate(d.getDate()+i);var k=dayKey(d),hv=state.dayHours[k]||0;totH+=hv;
    dr.innerHTML+='<div class="dayrow"><span class="dn">'+days[i]+'</span><span class="dd">'+d.toLocaleDateString("en-US",{month:"numeric",day:"numeric"})+'</span><span class="hrbubble" data-day="'+k+'">'+(hv?fmt(hv,2)+" h":"tap to add")+'</span></div>';}
  dr.querySelectorAll("[data-day]").forEach(function(b){b.addEventListener("click",function(){
    var k=b.dataset.day,cur=state.dayHours[k]||"";
    b.innerHTML='<input type="text" inputmode="decimal" value="'+cur+'" placeholder="0">';
    var inp=b.querySelector("input");inp.focus();inp.select();
    function done(){var v=parseHours(inp.value);if(v>0)state.dayHours[k]=Math.round(v*100)/100;else delete state.dayHours[k];save();render();}
    inp.addEventListener("blur",done);
    inp.addEventListener("keydown",function(e){if(e.key==="Enter")inp.blur();if(e.key==="Escape")render();});
  });});
  $("wkPrev").addEventListener("click",function(){state.weekOffset--;save();render();});
  $("wkNext").addEventListener("click",function(){state.weekOffset++;save();render();});
  var rate=pnum(state.rate),reg=Math.min(totH,40),otH=Math.max(0,totH-40);
  var gross=reg*rate+otH*rate*1.5,t=weeklyTaxes(gross),net=gross-t.fed-t.mi-t.ss-t.med;
  $("payRes").innerHTML='<div class="kv"><span class="k">Hours</span><span class="v">'+fmt(totH,2)+'</span></div>'+
    '<div class="kv"><span class="k">Overtime worked</span><span class="v">'+fmt(otH,2)+' h · '+money(otH*rate*1.5)+'</span></div>'+
    '<div class="kv"><span class="k">Gross pay</span><span class="v">'+money(gross)+'</span></div>'+
    '<div class="kv"><span class="k">Federal (est)</span><span class="v">−'+money(t.fed)+'</span></div>'+
    '<div class="kv"><span class="k">Michigan (est)</span><span class="v">−'+money(t.mi)+'</span></div>'+
    '<div class="kv"><span class="k">Social Security (est)</span><span class="v">−'+money(t.ss)+'</span></div>'+
    '<div class="kv"><span class="k">Medicare (est)</span><span class="v">−'+money(t.med)+'</span></div>'+
    '<div class="kv"><span class="k"><b style="color:var(--text)">Take-home pay</b></span><span class="v" style="color:var(--green)">'+money(net)+'</span></div>';
}

/* ---------- expenses ---------- */
function renderExpenses(){
  var el=$("view-expenses"),h='<div class="grid2"><div class="card section"><h3>Expenses</h3><div id="expList2"></div>'+
    '<div class="form-row"><input class="txt" id="expName2" type="text" placeholder="e.g. Rent" maxlength="40">'+
    '<input class="num" id="expAmt2" type="text" inputmode="decimal" placeholder="$">'+
    '<select id="expFreq2"><option value="weekly">weekly</option><option value="monthly" selected>monthly</option><option value="yearly">yearly</option></select>'+
    '<select id="expCat2"><option>Housing</option><option>Food</option><option>Transport</option><option>Utilities</option><option>Insurance</option><option>Subscriptions</option><option>Health</option><option>Fun</option><option>Other</option></select>'+
    '<button id="expAdd2">Add</button></div></div>'+
    '<div class="card section"><h3>By category / month</h3><div id="catBreak2"></div>'+
    '<div class="note">Pick a color per expense — it shows on the Overview wheel.</div></div></div>';
  el.innerHTML=h;
  var list=$("expList2");
  if(!state.expenses.length)list.innerHTML='<div class="empty">No expenses yet.</div>';
  else{var t='<table class="mini"><thead><tr><th style="text-align:left">Name</th><th style="text-align:left">Category</th><th>Amount</th><th>/ month</th><th>Color</th><th></th></tr></thead><tbody>';
    state.expenses.forEach(function(e){
      t+='<tr><td>'+esc(e.name)+'</td><td style="text-align:left"><span class="cname">'+esc(e.cat||"Other")+'</span></td>'+
        '<td>'+money(e.amount)+'<span class="gl-sub">'+esc(e.freq)+'</span></td><td>'+money(toMonthly(e.amount,e.freq))+'</td>'+
        '<td><input type="color" data-expcolor="'+e.id+'" value="'+esc(e.color||DEFCAT[e.cat]||"#5b6685")+'"></td>'+
        '<td><button class="ghost mini del" data-delexp2="'+e.id+'">✕</button></td></tr>';});
    list.innerHTML=t+'</tbody></table>';}
  list.querySelectorAll("[data-delexp2]").forEach(function(b){b.addEventListener("click",function(){state.expenses=state.expenses.filter(function(e){return e.id!==b.dataset.delexp2;});save();render();});});
  list.querySelectorAll("[data-expcolor]").forEach(function(c){c.addEventListener("change",function(){var e=state.expenses.filter(function(x){return x.id===c.dataset.expcolor;})[0];if(e){e.color=c.value;save();}});});
  $("expAdd2").addEventListener("click",function(){
    var n=$("expName2").value.trim(),a=pnum($("expAmt2").value),cat=$("expCat2").value;
    if(!n||!(a>0))return;
    state.expenses.push({id:uid(),name:n,amount:a,freq:$("expFreq2").value,cat:cat,color:DEFCAT[cat]||"#5b6685"});
    $("expName2").value="";$("expAmt2").value="";save();render();});
  var cats={};
  state.expenses.forEach(function(e){var c=e.cat||"Other";cats[c]={v:(cats[c]?cats[c].v:0)+toMonthly(e.amount,e.freq),color:e.color||DEFCAT[c]||"#5b6685"};});
  var cb=$("catBreak2"),keys=Object.keys(cats).sort(function(a,b){return cats[b].v-cats[a].v;});
  if(!keys.length)cb.innerHTML='<div class="empty">Nothing yet.</div>';
  else{var mx=cats[keys[0]].v||1,ch="";
    keys.forEach(function(k){ch+='<div class="cat-row"><span class="nm">'+esc(k)+'</span><span class="tr"><div style="width:'+(cats[k].v/mx*100)+'%;background:'+cats[k].color+'"></div></span><span class="vl">'+money(cats[k].v)+'</span></div>';});
    cb.innerHTML=ch;}
}

/* ---------- debts ---------- */
/* Payment panel shared by the credit-card Payments tab and expandable loan rows. */
function paymentPanelHTML(d){
  var pays=d.payments||[];
  var th='<h4>Payments made</h4>';
  if(!pays.length)th+='<div class="empty">No payments logged yet.</div>';
  pays.forEach(function(p){th+='<div class="txn-row"><span class="d">'+esc(p.desc||"Payment")+'<span class="gl-sub">'+esc(p.date||"")+'</span></span><span class="a" style="color:var(--green)">−'+money(p.amount)+'</span><button class="ghost mini del" data-delpay="'+d.id+':'+p.id+'">✕</button></div>';});
  th+='<h4>Log a payment</h4><div class="form-row" style="margin-top:0"><input class="txt" data-paydesc="'+d.id+'" type="text" placeholder="e.g. Monthly payment" maxlength="40">'+
      '<input class="num" data-payamt="'+d.id+'" type="text" inputmode="decimal" placeholder="$">'+
      '<input type="date" data-paydate="'+d.id+'" value="'+new Date().toISOString().slice(0,10)+'"><button data-payadd="'+d.id+'">Add</button></div>';
  return th;
}
function renderDebts(){
  var el=$("view-debts"),h='<div class="card section"><h3>Debts — credit cards &amp; loans</h3>'+
    '<div class="note" style="margin:0 0 10px">Click a card or loan to expand it. Use ↑ ↓ to reorder.</div><div class="table-scroll" id="debtList2"></div>'+
    '<div class="form-row"><input class="txt" id="debtName2" type="text" placeholder="e.g. Chase Sapphire" maxlength="40">'+
    '<select id="debtType2"><option>Credit Card</option><option>Loan</option><option>Other</option></select>'+
    '<input class="num" id="debtBal2" type="text" inputmode="decimal" placeholder="balance $">'+
    '<input class="num" id="debtApr2" type="text" inputmode="decimal" placeholder="APR %" style="width:80px">'+
    '<input class="num" id="debtMin2" type="text" inputmode="decimal" placeholder="min pay $">'+
    '<button id="debtAdd2">Add</button></div></div>';
  el.innerHTML=h;
  var dl=$("debtList2");
  if(!state.debts.length)dl.innerHTML='<div class="empty">No cards or loans yet.</div>';
  else{var dh='<table class="mini"><thead><tr><th style="text-align:left">Name</th><th style="text-align:left">Type</th><th>Balance</th><th>APR</th><th>Min pay</th><th></th><th></th></tr></thead><tbody>';
    state.debts.forEach(function(d,i){
      var tot=debtTotal(d),txc=(d.txns||[]).length,isCard=d.type==="Credit Card",payc=(d.payments||[]).length;
      dh+='<tr class="drow" data-debtrow="'+d.id+'"><td><span style="font-weight:700">'+esc(d.name)+'</span>'+
        '<span class="gl-sub">▾ '+(expanded[d.id]?"tap to collapse":(isCard?"tap for transactions":"tap for payments"))+'</span></td>'+
        '<td style="text-align:left"><span class="cname">'+esc(d.type)+'</span></td>'+
        '<td style="color:var(--red)">'+money(tot)+(txc?'<span class="gl-sub">'+txc+' txn</span>':"")+(payc&&!isCard?'<span class="gl-sub">'+payc+' payment'+(payc>1?"s":"")+'</span>':"")+'</td>'+
        '<td>'+(d.apr?fmt(pnum(d.apr),2)+"%":"—")+'</td><td>'+(d.minpay?money(d.minpay):"—")+'</td>'+
        '<td><div class="ord"><button class="ghost mini" data-dmove="'+i+':-1">↑</button><button class="ghost mini" data-dmove="'+i+':1">↓</button></div></td>'+
        '<td><button class="ghost mini del" data-deldebt="'+d.id+'">✕</button></td></tr>';
      if(d.type==="Credit Card"&&expanded[d.id]){
        var ptab=expanded[d.id+"_ptab"]||"txn";
        var th='<tr class="txndrawer"><td colspan="7"><div class="txn-box">'+
          '<button class="chip'+(ptab==="txn"?" on":"")+'" data-ptab="'+d.id+':txn">Transactions</button> '+
          '<button class="chip'+(ptab==="pay"?" on":"")+'" data-ptab="'+d.id+':pay">Payments</button>';
        if(ptab==="txn"){
          th+='<h4>Transactions</h4>';
          if(!txc)th+='<div class="empty">No transactions yet.</div>';
          (d.txns||[]).forEach(function(t){th+='<div class="txn-row"><span class="d">'+esc(t.desc)+'</span><span class="a">'+money(t.amount)+'</span><button class="ghost mini del" data-deltxn="'+d.id+':'+t.id+'">✕</button></div>';});
          th+='<h4>Add transaction</h4><div class="form-row" style="margin-top:0"><input class="txt" data-txndesc="'+d.id+'" type="text" placeholder="e.g. Groceries" maxlength="40">'+
              '<input class="num" data-txn-amt="'+d.id+'" type="text" inputmode="decimal" placeholder="$"><button data-txnadd="'+d.id+'">Add</button></div>';
        }else{
          th+=paymentPanelHTML(d);
        }
        th+='</div></td></tr>';
        dh+=th;
      }
      else if(expanded[d.id]){
        dh+='<tr class="txndrawer"><td colspan="7"><div class="txn-box">'+paymentPanelHTML(d)+'</div></td></tr>';
      }
    });
    dl.innerHTML=dh+'</tbody></table>';}
  dl.querySelectorAll("[data-debtrow]").forEach(function(row){row.addEventListener("click",function(e){
    if(e.target.tagName==="INPUT"||e.target.tagName==="BUTTON"||e.target.tagName==="SELECT")return;
    var id=row.dataset.debtrow,d=state.debts.filter(function(x){return x.id===id;})[0];
    if(!d)return;expanded[id]=!expanded[id];render();});});
  dl.querySelectorAll("[data-dmove]").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();
    var p=b.dataset.dmove.split(":"),i=parseInt(p[0],10),j=i+parseInt(p[1],10);
    if(j<0||j>=state.debts.length)return;var t=state.debts[i];state.debts[i]=state.debts[j];state.debts[j]=t;save();render();});});
  dl.querySelectorAll("[data-deldebt]").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();
    state.debts=state.debts.filter(function(d){return d.id!==b.dataset.deldebt;});save();render();});});
  dl.querySelectorAll("[data-deltxn]").forEach(function(b){b.addEventListener("click",function(){
    var p=b.dataset.deltxn.split(":"),d=state.debts.filter(function(x){return x.id===p[0];})[0];if(!d)return;
    if(!confirm("Delete this transaction?"))return;
    d.txns=(d.txns||[]).filter(function(t){return t.id!==p[1];});save();render();});});
  dl.querySelectorAll("[data-txnadd]").forEach(function(b){b.addEventListener("click",function(){
    var id=b.dataset.txnadd,d=state.debts.filter(function(x){return x.id===id;})[0];if(!d)return;
    var de=dl.querySelector('[data-txndesc="'+id+'"]'),ae=dl.querySelector('[data-txn-amt="'+id+'"]');
    var desc=de?de.value.trim():"",amt=ae?pnum(ae.value):0;
    if(!desc||!(amt>0))return;d.txns.push({id:uid(),desc:desc,amount:amt});save();render();});});
  dl.querySelectorAll("[data-ptab]").forEach(function(b){b.addEventListener("click",function(){
    var p=b.dataset.ptab.split(":");expanded[p[0]+"_ptab"]=p[1];render();});});
  dl.querySelectorAll("[data-payadd]").forEach(function(b){b.addEventListener("click",function(){
    var id=b.dataset.payadd,d=state.debts.filter(function(x){return x.id===id;})[0];if(!d)return;
    var de=dl.querySelector('[data-paydesc="'+id+'"]'),ae=dl.querySelector('[data-payamt="'+id+'"]'),dte=dl.querySelector('[data-paydate="'+id+'"]');
    var amt=ae?pnum(ae.value):0;if(!(amt>0))return;
    d.payments.push({id:uid(),desc:de&&de.value.trim()?de.value.trim():"Payment",amount:amt,date:dte?dte.value:""});
    save();render();});});
  dl.querySelectorAll("[data-delpay]").forEach(function(b){b.addEventListener("click",function(){
    var p=b.dataset.delpay.split(":"),d=state.debts.filter(function(x){return x.id===p[0];})[0];if(!d)return;
    d.payments=(d.payments||[]).filter(function(x){return x.id!==p[1];});save();render();});});
  $("debtAdd2").addEventListener("click",function(){
    var n=$("debtName2").value.trim(),b=pnum($("debtBal2").value);
    if(!n||b<0||isNaN(b))return;
    state.debts.push({id:uid(),name:n,type:$("debtType2").value,balance:b,txns:[],payments:[],apr:$("debtApr2").value,minpay:$("debtMin2").value});
    ["debtName2","debtBal2","debtApr2","debtMin2"].forEach(function(id){$(id).value="";});save();render();});
}

/* ---------- assets ---------- */
var sortState={key:"value",dir:"desc"};
function renderAssets(){
  var el=$("view-assets"),h="";
  h+='<div class="card section"><h3>Assets</h3><div class="table-scroll" id="assetList2"></div>'+
     '<div class="form-row"><input class="txt" id="assetName2" type="text" placeholder="e.g. Savings account" maxlength="40">'+
     '<input class="num" id="assetVal2" type="text" inputmode="decimal" placeholder="$"><button id="assetAdd2">Add</button></div></div>'+
     '<div class="card section"><h3>Precious Metals <span class="cname">· valued by ounces</span></h3><div class="table-scroll" id="metalList"></div>'+
     '<div class="form-row"><select id="metalType"><option>Gold</option><option>Silver</option><option>Platinum</option><option>Palladium</option><option>Other</option></select>'+
     '<input class="num" id="metalOz" type="text" inputmode="decimal" placeholder="oz" style="width:90px">'+
     '<input class="num" id="metalPrice" type="text" inputmode="decimal" placeholder="$ / oz" style="width:110px">'+
     '<button id="metalAdd">Add</button></div><div class="note">Value = ounces × price per ounce. Prices are entered manually in this edition.</div></div>'+
     '<div class="card section"><h3>Investing accounts <span class="cname">'+(window.BTQuotes&&BTQuotes.hasKey()?"· live prices via Finnhub":"· manual prices — add a Finnhub key for live quotes")+'</span></h3><div id="invList"></div>'+
     '<div class="form-row"><input class="txt" id="acctName" type="text" placeholder="e.g. Roth IRA" maxlength="40"><button id="acctAdd">Add account</button></div></div>';
  el.innerHTML=h;
  var al=$("assetList2");
  if(!state.assets.length)al.innerHTML='<div class="empty">None yet.</div>';
  else{var ah='<table class="mini"><thead><tr><th style="text-align:left">Name</th><th>Value</th><th></th><th></th></tr></thead><tbody>';
    state.assets.forEach(function(a,i){
      ah+='<tr><td>'+esc(a.name)+'</td><td style="color:var(--green)">'+money(a.value)+'</td>'+
      '<td><div class="ord"><button class="ghost mini" data-amove="'+i+':-1">↑</button><button class="ghost mini" data-amove="'+i+':1">↓</button></div></td>'+
      '<td><button class="ghost mini del" data-delasset="'+a.id+'">✕</button></td></tr>';});
    al.innerHTML=ah+'</tbody></table>';}
  al.querySelectorAll("[data-amove]").forEach(function(b){b.addEventListener("click",function(){
    var p=b.dataset.amove.split(":"),i=parseInt(p[0],10),j=i+parseInt(p[1],10);
    if(j<0||j>=state.assets.length)return;var t=state.assets[i];state.assets[i]=state.assets[j];state.assets[j]=t;save();render();});});
  al.querySelectorAll("[data-delasset]").forEach(function(b){b.addEventListener("click",function(){
    state.assets=state.assets.filter(function(a){return a.id!==b.dataset.delasset;});save();render();});});
  $("assetAdd2").addEventListener("click",function(){
    var n=$("assetName2").value.trim(),v=pnum($("assetVal2").value);
    if(!n||!(v>=0))return;state.assets.push({id:uid(),name:n,value:v});
    $("assetName2").value="";$("assetVal2").value="";save();render();});
  var ml=$("metalList");
  if(!state.metals.length)ml.innerHTML='<div class="empty">No metals yet.</div>';
  else{var mh='<table class="mini"><thead><tr><th style="text-align:left">Metal</th><th>Ounces</th><th>Price / oz</th><th>Value</th><th></th></tr></thead><tbody>';
    state.metals.forEach(function(m){
      mh+='<tr><td>'+esc(m.metal)+'</td><td>'+fmt(pnum(m.ounces),2)+' oz</td><td>'+money(m.price)+'</td><td style="color:var(--green)">'+money(pnum(m.ounces)*pnum(m.price))+'</td><td><button class="ghost mini del" data-delmetal="'+m.id+'">✕</button></td></tr>';});
    ml.innerHTML=mh+'</tbody></table>';}
  ml.querySelectorAll("[data-delmetal]").forEach(function(b){b.addEventListener("click",function(){
    state.metals=state.metals.filter(function(m){return m.id!==b.dataset.delmetal;});save();render();});});
  $("metalAdd").addEventListener("click",function(){
    var oz=pnum($("metalOz").value),pr=pnum($("metalPrice").value);
    if(!(oz>0)||!(pr>0))return;
    state.metals.push({id:uid(),metal:$("metalType").value,ounces:$("metalOz").value,price:$("metalPrice").value});
    $("metalOz").value="";$("metalPrice").value="";save();render();});
  /* investing accounts */
  var il=$("invList");
  if(!state.invAccts.length)il.innerHTML='<div class="empty">No investing accounts yet.</div>';
  state.invAccts.forEach(function(a){
    var tot=acctTotal(a),open=expanded["ia_"+a.id];
    var d=document.createElement("div");d.className="paybox";
    var ih='<div class="pt" data-ia="'+a.id+'" style="cursor:pointer"><span style="color:var(--cyan)">'+(open?"▾":"▸")+'</span> '+esc(a.name)+
      ' <span class="cname">'+money(tot)+'</span><span style="margin-left:auto"></span><button class="ghost mini del" data-delacct="'+a.id+'">✕</button></div>';
    if(open){
      ih+='<div class="form-row"><input class="txt" data-htick="'+a.id+'" type="text" placeholder="Ticker" maxlength="12" style="max-width:110px">'+
        '<input class="num" data-hshares="'+a.id+'" type="text" inputmode="decimal" placeholder="shares" style="width:90px">'+
        '<input class="num" data-hprice="'+a.id+'" type="text" inputmode="decimal" placeholder="price $" style="width:100px">'+
        '<input class="num" data-hcost="'+a.id+'" type="text" inputmode="decimal" placeholder="cost $/sh" style="width:100px">'+
        '<input class="num" data-hdiv="'+a.id+'" type="text" inputmode="decimal" placeholder="div $/yr" style="width:100px">'+
        '<button data-hadd="'+a.id+'">Add</button></div>'+
      '<div class="form-row"><button class="ghost" data-refresh="'+a.id+'">Refresh prices</button>'+
        '<button class="ghost" data-csvbtn="'+a.id+'">Upload CSV</button>'+
        '<input type="file" accept=".csv,text/csv" data-csvfile="'+a.id+'" style="display:none">'+
        '<span class="cname">CSV: generic, Fidelity, Schwab, Vanguard, Robinhood</span></div><div data-csvres="'+a.id+'"></div><div data-refreshres="'+a.id+'"></div>';
      var hs=(a.holdings||[]).slice();
      var sk=sortState.key,sd=sortState.dir==="asc"?1:-1;
      function skv(x){var v=holdingVal(x),c=holdingCost(x);
        if(sk==="value")return v;if(sk==="gain")return v-c;if(sk==="gainp")return c?(v-c)/c*100:0;
        if(sk==="day"){var dgg=dayGain(x);return dgg==null?-1e18:dgg;}
        if(sk==="dayp"){var dgp=dayGainPct(x);return dgp==null?-1e18:dgp;}
        if(sk==="div")return pnum(x.div)*pnum(x.shares);if(sk==="pct")return tot?v/tot*100:0;return v;}
      hs.sort(function(x,y){return (skv(x)-skv(y))*sd;});
      function th(label,key){var act=sortState.key===key;
        return '<th class="sortable col-detail" data-sort="'+key+'">'+label+(act?(sortState.dir==="asc"?" ▲":" ▼"):"")+'</th>';}
      if(hs.length){
        ih+='<div class="table-scroll"><table class="mini"><thead><tr><th style="text-align:left">Ticker</th>'+
          th("Value","value")+th("Day $","day")+th("Day %","dayp")+th("Gain $","gain")+th("Gain %","gainp")+th("Dividends","div")+th("% of acct","pct")+'<th></th></tr></thead><tbody>';
        hs.forEach(function(x){
          var v=holdingVal(x),c=holdingCost(x),g=v-c,gp=c?g/c*100:0,dv=pnum(x.div)*pnum(x.shares);
          var dg=dayGain(x),dgp=dayGainPct(x),hk="h_"+a.id+"_"+x.id,live=priceSrc(x)==="live";
          var dayStr=(dg==null)?"—":signedMoney(dg)+(dgp==null?"":" ("+signed(dgp)+"%)");
          ih+='<tr data-hrow="'+a.id+':'+x.id+'"><td><b>'+esc(x.ticker)+'</b> <span style="color:#fff">'+money(v)+' total</span> <span class="'+(dg==null?"":cls(dg))+'">'+dayStr+'</span><span class="gl-sub"> · '+esc(x.shares)+' sh</span><span class="m-toggle"> · View details</span><br><span class="livechip'+(live?" on":"")+'" data-livechip="'+a.id+':'+x.id+'" title="Click to toggle live/manual price">'+(live?"live · "+BTQuotes.ageText(x.ticker):"manual")+'</span></td>'+
            '<td style="color:#fff">'+money(v)+'</td>'+
            '<td class="col-detail '+(dg==null?"":cls(dg))+'">'+(dg==null?"—":signedMoney(dg))+'</td>'+
            '<td class="col-detail '+(dgp==null?"":cls(dgp))+'">'+(dgp==null?"—":signed(dgp)+"%")+'</td>'+
            '<td class="col-detail '+cls(g)+'">'+signed(g)+'</td><td class="col-detail '+cls(gp)+'">'+signed(gp)+'%</td>'+
            '<td class="col-detail">'+(dv?money(dv)+'<span class="gl-sub">/ yr</span>':"—")+'</td>'+
            '<td class="col-detail">'+fmt(tot?v/tot*100:0,1)+'%</td>'+
            '<td><button class="ghost mini del" data-delh="'+a.id+':'+x.id+'">✕</button></td></tr>';
          if(expanded[hk]){
            ih+='<tr class="m-details open"><td colspan="9">'+
              '<div class="kv"><span class="k">Day gain / loss</span><span class="v '+(dg==null?"":cls(dg))+'">'+dayStr+'</span></div>'+
              '<div class="kv"><span class="k">Gain / loss total</span><span class="v '+cls(g)+'">'+signed(g)+'</span></div>'+
              '<div class="kv"><span class="k">Gain / loss %</span><span class="v '+cls(gp)+'">'+signed(gp)+'%</span></div>'+
              '<div class="kv"><span class="k">Current value</span><span class="v">'+money(v)+'</span></div>'+
              '<div class="kv"><span class="k">Price source</span><span class="v">'+(live?"live · "+BTQuotes.ageText(x.ticker):"manual")+'</span></div>'+
              '<div class="kv"><span class="k">Dividends / yr</span><span class="v">'+(dv?money(dv):"—")+'</span></div>'+
              '<div class="kv"><span class="k">% of account</span><span class="v">'+fmt(tot?v/tot*100:0,1)+'%</span></div></td></tr>';
          }
        });
        ih+='</tbody></table></div>';
      } else ih+='<div class="empty">No holdings yet.</div>';
    }
    d.innerHTML=ih;il.appendChild(d);
  });
  il.querySelectorAll("[data-ia]").forEach(function(t){t.addEventListener("click",function(e){
    if(e.target.tagName==="BUTTON")return;var id=t.dataset.ia;expanded["ia_"+id]=!expanded["ia_"+id];render();});});
  il.querySelectorAll("[data-delacct]").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();
    state.invAccts=state.invAccts.filter(function(a){return a.id!==b.dataset.delacct;});save();render();});});
  il.querySelectorAll("[data-sort]").forEach(function(t){t.addEventListener("click",function(){
    var k=t.dataset.sort;
    if(sortState.key===k)sortState.dir=sortState.dir==="asc"?"desc":"asc";
    else{sortState.key=k;sortState.dir="asc";}render();});});
  il.querySelectorAll("[data-hrow]").forEach(function(r){r.addEventListener("click",function(e){
    if(e.target.tagName==="BUTTON"||e.target.tagName==="INPUT")return;
    var p=r.dataset.hrow.split(":"),k="h_"+p[0]+"_"+p[1];expanded[k]=!expanded[k];render();});});
  il.querySelectorAll("[data-csvbtn]").forEach(function(b){b.addEventListener("click",function(){
    var f=il.querySelector('[data-csvfile="'+b.dataset.csvbtn+'"]');if(f)f.click();});});
  il.querySelectorAll("[data-csvfile]").forEach(function(f){f.addEventListener("change",function(){
    var id=f.dataset.csvfile;
    if(!f.files||!f.files[0])return;
    var rd=new FileReader();
    rd.onload=function(){
      var imp=BTCSV.importText(String(rd.result||""));
      if(imp.needsMapping){renderMappingUI(id,imp);}
      else{applyImport(id,imp);}
      f.value="";
    };
    rd.readAsText(f.files[0]);});});
  il.querySelectorAll("[data-hadd]").forEach(function(b){b.addEventListener("click",function(){
    var id=b.dataset.hadd,a=state.invAccts.filter(function(x){return x.id===id;})[0];if(!a)return;
    function gv(s){var n=il.querySelector(s);return n?n.value.trim():"";}
    var tick=gv('[data-htick="'+id+'"]').toUpperCase(),sh=pnum(gv('[data-hshares="'+id+'"]')),
        pr=pnum(gv('[data-hprice="'+id+'"]'));
    if(!tick||!(sh>0)||!(pr>0))return;
    a.holdings.push({id:uid(),ticker:tick,shares:gv('[data-hshares="'+id+'"]'),price:gv('[data-hprice="'+id+'"]'),
      cost:gv('[data-hcost="'+id+'"]'),div:gv('[data-hdiv="'+id+'"]')});
    save();render();});});
  il.querySelectorAll("[data-delh]").forEach(function(b){b.addEventListener("click",function(){
    var p=b.dataset.delh.split(":"),a=state.invAccts.filter(function(x){return x.id===p[0];})[0];if(!a)return;
    a.holdings=(a.holdings||[]).filter(function(x){return x.id!==p[1];});save();render();});});
  bindQuoteControls(il);
  $("acctAdd").addEventListener("click",function(){
    var n=$("acctName").value.trim();if(!n)return;
    state.invAccts.push({id:uid(),name:n,holdings:[]});$("acctName").value="";save();render();});
}

/* ---------- CSV import (brokerage-aware) ---------- */
var pendingMaps={};
function applyImport(acctId,imp){
  var a=state.invAccts.filter(function(x){return x.id===acctId;})[0];
  if(!a)return;
  var added=0,updated=0,useLive=window.BTQuotes&&BTQuotes.hasKey();
  imp.rows.forEach(function(r){
    var ex=(a.holdings||[]).filter(function(x){return x.ticker===r.ticker;})[0];
    if(ex){ex.shares=String(r.shares);if(r.price!=null&&r.price!=="")ex.price=String(r.price);if(r.cost)ex.cost=String(r.cost);if(r.div)ex.div=String(r.div);updated++;}
    else{a.holdings.push({id:uid(),ticker:r.ticker,shares:String(r.shares),price:(r.price==null||r.price==="")?"":String(r.price),cost:r.cost?String(r.cost):"",div:r.div?String(r.div):"",useLive:useLive});added++;}
  });
  save();render();
  var res=document.querySelector('[data-csvres="'+acctId+'"]');
  if(res)res.innerHTML='<div class="note">'+(imp.broker?esc(imp.broker)+" import: ":"CSV import: ")+'<b>'+added+'</b> added, <b>'+updated+'</b> updated'+(imp.skipped?" · <b>"+imp.skipped+"</b> skipped":"")+'.</div>';
}
function renderMappingUI(acctId,imp){
  pendingMaps[acctId]=imp;
  var res=document.querySelector('[data-csvres="'+acctId+'"]');if(!res)return;
  function opts(sel){return imp.headers.map(function(h,i){return '<option value="'+i+'"'+(i===sel?" selected":"")+'>'+esc(h||("Column "+(i+1)))+'</option>';}).join("");}
  function row(lbl,id,guess){return '<div class="form-row" style="margin-top:6px"><span class="maplbl">'+lbl+'</span><select data-mapfield="'+id+'"><option value="-1">\u2014 none \u2014</option>'+opts(guess)+'</select></div>';}
  res.innerHTML='<div class="paybox"><div class="pt">Map CSV columns</div>'+
    '<div class="note" style="margin:0 0 6px">Headers weren\u2019t recognized \u2014 match each field to a column, then import.</div>'+
    row("Ticker","ticker",imp.guess.ticker)+row("Shares","shares",imp.guess.shares)+
    row("Price","price",imp.guess.price)+row("Cost / share","cost",imp.guess.cost)+
    '<div class="form-row"><button data-mapgo="'+acctId+'">Import</button></div></div>';
  res.querySelector("[data-mapgo]").addEventListener("click",function(){
    var map={};
    res.querySelectorAll("[data-mapfield]").forEach(function(s){map[s.dataset.mapfield]=parseInt(s.value,10);});
    var imp2=BTCSV.remap(pendingMaps[acctId],map);
    delete pendingMaps[acctId];
    applyImport(acctId,imp2);
  });
}

/* ---------- live quotes wiring ---------- */
function bindQuoteControls(il){
  il.querySelectorAll("[data-refresh]").forEach(function(b){b.addEventListener("click",function(){
    var id=b.dataset.refresh,a=state.invAccts.filter(function(x){return x.id===id;})[0];if(!a)return;
    if(!window.BTQuotes||!BTQuotes.hasKey()){openSettings();return;}
    var syms=(a.holdings||[]).filter(function(h){return h.useLive!==false;}).map(function(h){return h.ticker;});
    var res=document.querySelector('[data-refreshres="'+id+'"]');
    if(res)res.innerHTML='<div class="note">Refreshing prices\u2026</div>';
    BTQuotes.refresh(syms,function(r){
      save();render();
      var res2=document.querySelector('[data-refreshres="'+id+'"]');
      if(res2)res2.innerHTML='<div class="note">Prices updated: <b>'+r.ok+'</b> ok'+(r.fail?" · <b>"+r.fail+"</b> failed":"")+'.</div>';
    });});});
  il.querySelectorAll("[data-livechip]").forEach(function(ch){ch.addEventListener("click",function(e){e.stopPropagation();
    var p=ch.dataset.livechip.split(":"),ac=state.invAccts.filter(function(x){return x.id===p[0];})[0];if(!ac)return;
    var h=(ac.holdings||[]).filter(function(x){return x.id===p[1];})[0];if(!h)return;
    if(h.useLive!==false){h.useLive=false;
      if(!(pnum(h.price)>0)){var np=prompt("Manual price per share for "+h.ticker+":","");var nv=pnum(np);
        if(nv>0){h.price=String(nv);}else{h.useLive=true;save();render();return;}}
    }else{h.useLive=true;}
    save();render();});});
}

/* ---------- master render ---------- */
function render(){
  var active="overview";
  document.querySelectorAll(".tab").forEach(function(b){if(b.classList.contains("active"))active=b.dataset.tab;});
  if(active==="overview")renderOverview();
  else if(active==="planning")renderPlanning();
  else if(active==="income")renderIncome();
  else if(active==="expenses")renderExpenses();
  else if(active==="debts")renderDebts();
  else if(active==="assets")renderAssets();
}

/* ---------- API key setup & settings ---------- */
function setupNeeded(){try{return !(window.BTQuotes&&BTQuotes.hasKey())&&!localStorage.getItem("bta_setup_dismissed");}catch(e){return false;}}
function openSettings(){
  var m=$("settingsModal");if(!m)return;
  var cur=$("setCurrent");
  if(cur)cur.textContent=(window.BTQuotes&&BTQuotes.hasKey())?("Saved key: "+BTQuotes.masked()):"No key saved.";
  var inp=$("setKeyInput");if(inp)inp.value="";
  m.hidden=false;
}
function closeSettings(){var m=$("settingsModal");if(m)m.hidden=true;}
function bootKeys(){
  if(!window.BTQuotes)return;
  var gear=$("gearBtn");if(gear)gear.addEventListener("click",openSettings);
  var so=$("setupOverlay");
  var sv=$("setupSave");if(sv)sv.addEventListener("click",function(){
    var v=$("setupKeyInput");var k=v?v.value.trim():"";
    if(!k){if(v)v.focus();return;}
    BTQuotes.setKey(k);so.hidden=true;render();bootRefresh(true);});
  var sk=$("setupSkip");if(sk)sk.addEventListener("click",function(){
    try{localStorage.setItem("bta_setup_dismissed","1");}catch(e){}
    so.hidden=true;});
  var ss=$("setSave");if(ss)ss.addEventListener("click",function(){
    var v=$("setKeyInput");var k=v?v.value.trim():"";
    if(k){BTQuotes.setKey(k);try{localStorage.removeItem("bta_setup_dismissed");}catch(e){}}
    closeSettings();render();});
  var sc=$("setClear");if(sc)sc.addEventListener("click",function(){BTQuotes.clearKey();openSettings();render();});
  var sx=$("setClose");if(sx)sx.addEventListener("click",closeSettings);
  [so,$("settingsModal")].forEach(function(o){if(o)o.addEventListener("click",function(e){if(e.target===o)o.hidden=true;});});
}
function bootRefresh(force){
  if(!(window.BTQuotes&&BTQuotes.hasKey()))return;
  var syms=[];
  state.invAccts.forEach(function(a){(a.holdings||[]).forEach(function(h){if(h.useLive!==false&&h.ticker)syms.push(h.ticker);});});
  if(!syms.length)return;
  var doIt=function(){BTQuotes.refresh(syms,function(){save();render();});};
  if(force){doIt();return;}
  var stale=false;
  syms.forEach(function(s){var q=BTQuotes.getCached(s);if(!q||!q.ts||(Date.now()-q.ts)>15*60*1000)stale=true;});
  if(stale)doIt();
}
render();
bootKeys();
if(setupNeeded()){var so2=$("setupOverlay");if(so2)so2.hidden=false;}
else{bootRefresh(false);}
})();
