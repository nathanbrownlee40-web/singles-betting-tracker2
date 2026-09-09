const KEY="singlesBettingTracker.v1";
let bets=load();
let charts={};
const metricModes={market:"roi",selection:"roi",league:"roi",odds:"roi"};
let historyChart=null;
let leagueMarketMetric="win";

const $=id=>document.getElementById(id);
const money=n=>`£${Number(n||0).toFixed(2)}`;
const pct=n=>`${Number(n||0).toFixed(2)}%`;
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(bets));render()}

function calc(b){
  const stake=+b.stake||0, odds=+b.odds||0;
  let ret=+b.returns||0;
  if(b.status==="Win" && !ret) ret=stake*odds;
  if(b.status==="Loss") ret=0;
  if(b.status==="Void") ret=stake;
  const pl=b.status==="Pending"?0:ret-stake;
  return {stake,ret,pl};
}
function fmtDate(v){if(!v)return "";const d=new Date(v);return isNaN(d)?v:d.toLocaleDateString("en-GB")}
function validBets(){return bets.filter(b=>["Win","Loss","Void"].includes(b.status))}
function aggregate(field){
 const m={};
 validBets().forEach(b=>{
   const k=(b[field]||"Unknown").trim()||"Unknown";
   if(!m[k])m[k]={name:k,bets:0,stake:0,ret:0,pl:0,wins:0,markets:{},leagues:{}};
   const c=calc(b);
   m[k].bets++;m[k].stake+=c.stake;m[k].ret+=c.ret;m[k].pl+=c.pl;
   if(b.status==="Win")m[k].wins++;
   if(b.market)m[k].markets[b.market]=(m[k].markets[b.market]||0)+1;
   if(b.league)m[k].leagues[b.league]=(m[k].leagues[b.league]||0)+1;
 });
 return Object.values(m).map(x=>({
   ...x,
   roi:x.stake?x.pl/x.stake*100:0,
   win:x.bets?x.wins/x.bets*100:0,
   topMarket:Object.entries(x.markets).sort((a,b)=>b[1]-a[1])[0]?.[0]||"",
   topLeague:Object.entries(x.leagues).sort((a,b)=>b[1]-a[1])[0]?.[0]||""
 })).sort((a,b)=>b.pl-a.pl);
}

function totalStats(){
 let stake=0,ret=0,pl=0,wins=0,settled=0,odds=0,oddsN=0;
 bets.forEach(b=>{const c=calc(b);stake+=c.stake;ret+=c.ret;pl+=c.pl;if(b.status!=="Pending"){settled++;if(b.status==="Win")wins++}if(+b.odds){odds+=+b.odds;oddsN++}});
 return {bets:bets.length,stake,ret,pl,roi:stake?pl/stake*100:0,win:settled?wins/settled*100:0,avg:oddsN?odds/oddsN:0};
}
function streak(){
 const s=bets.filter(b=>b.status==="Win"||b.status==="Loss").slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
 if(!s.length)return 0;const type=s[0].status;let n=0;for(const b of s){if(b.status===type)n++;else break}return type==="Win"?n:-n;
}
function render(){
 const s=totalStats();
 const hp=(id,val,cls)=>{const el=$(id);if(el){el.textContent=val;if(cls)el.className=cls}};
 hp("historyKpiBets",s.bets);hp("historyKpiWin",pct(s.win));hp("historyKpiStake",money(s.stake));hp("historyKpiReturns",money(s.ret));hp("historyKpiProfit",money(s.pl),s.pl>=0?"positive":"negative");hp("historyKpiRoi",pct(s.roi));hp("historyKpiAvgOdds",s.avg.toFixed(2));
 hp("dashKpiBets",s.bets);hp("dashKpiWin",pct(s.win));hp("dashKpiStake",money(s.stake));hp("dashKpiReturns",money(s.ret));hp("dashKpiProfit",money(s.pl),s.pl>=0?"positive":"negative");hp("dashKpiRoi",pct(s.roi));hp("dashKpiAvgOdds",s.avg.toFixed(2));
 renderHistory();renderHistoryChart();renderDashLists();renderAnalytics();renderCharts();
}
function filtered(){
 const q=$("search").value.toLowerCase(), st=$("filterStatus").value, ma=$("filterMarket").value.toLowerCase(), le=$("filterLeague").value.toLowerCase(), from=$("filterFrom").value, to=$("filterTo").value;
 return bets.filter(b=>{
  const text=[b.selection,b.event,b.league,b.market,b.bookmaker].join(" ").toLowerCase();
  return (!q||text.includes(q))&&(!st||b.status===st)&&(!ma||(b.market||"").toLowerCase().includes(ma))&&(!le||(b.league||"").toLowerCase().includes(le))&&(!from||String(b.date).slice(0,10)>=from)&&(!to||String(b.date).slice(0,10)<=to)
 }).sort((a,b)=>new Date(b.date)-new Date(a.date));
}
function renderMonthlyHistoryBreakdown(rows){
 const el=$("monthlyHistoryBreakdown");
 if(!el)return;
 const settled=rows.filter(b=>b.status!=="Pending");
 if(!settled.length){el.innerHTML='<div class="history-month-empty">No settled bets in the current filter.</div>';return;}
 const months={};
 settled.forEach(b=>{
   const d=new Date(b.date);
   const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
   if(!months[key])months[key]={year:d.getFullYear(),month:d.getMonth(),bets:0,stake:0,pl:0,wins:0,odds:0,oddsN:0};
   const m=months[key],c=calc(b);
   m.bets++;m.stake+=c.stake;m.pl+=c.pl;if(b.status==="Win")m.wins++;
   if(+b.odds){m.odds+=+b.odds;m.oddsN++;}
 });
 const monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];
 const rowsHTML=Object.values(months).sort((a,b)=>b.year-a.year||b.month-a.month).map(m=>{
   const win=m.bets?m.wins/m.bets*100:0;
   const avg=m.oddsN?m.odds/m.oddsN:0;
   const tone=m.pl>0?"month-positive":m.pl<0?"month-negative":"month-neutral";
   const winTone=win>=50?"positive":"negative";
   return `<tr class="${tone}"><td><b>${monthNames[m.month]} ${m.year}</b></td><td>${m.bets}</td><td class="${winTone}">${win.toFixed(1)}%</td><td>${money(m.stake)}</td><td>${money(m.stake+m.pl)}</td><td class="${m.pl>=0?"positive":"negative"}">${m.pl>=0?"+":""}${money(m.pl)}</td><td>${avg.toFixed(2)}</td></tr>`;
 }).join("");
 el.innerHTML=`<div class="history-month-table-wrap"><table class="history-month-table"><thead><tr><th>Month</th><th>Bets</th><th>Win Rate</th><th>Stake</th><th>Returns</th><th>P/L</th><th>Avg Odds</th></tr></thead><tbody>${rowsHTML}</tbody></table></div>`;
}

function renderHistory(){
 const rows=filtered();
 renderMonthlyHistoryBreakdown(rows);
 if(!rows.length){
   $("historyBody").innerHTML=`<tr><td colspan="10"><div class="history-empty">No bets yet. Add one or load demo data.</div></td></tr>`;
   return;
 }

 const groups={};
 rows.forEach(b=>{
   const d=new Date(b.date);
   const year=d.getFullYear(), month=d.getMonth();
   const monthKey=`${year}-${String(month+1).padStart(2,"0")}`;
   const weekStart=new Date(d); weekStart.setHours(0,0,0,0);
   const day=(weekStart.getDay()+6)%7; weekStart.setDate(weekStart.getDate()-day);
   const weekKey=weekStart.toISOString().slice(0,10);
   const dayKey=String(b.date).slice(0,10);
   if(!groups[monthKey]) groups[monthKey]={year,month,weeks:{}};
   if(!groups[monthKey].weeks[weekKey]) groups[monthKey].weeks[weekKey]={start:weekStart,days:{}};
   if(!groups[monthKey].weeks[weekKey].days[dayKey]) groups[monthKey].weeks[weekKey].days[dayKey]=[];
   groups[monthKey].weeks[weekKey].days[dayKey].push(b);
 });

 const monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];
 const fmtDay=d=>new Date(d).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
 const fmtWeek=d=>`Week commencing ${new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`;

 const betRows=arr=>arr.map(b=>{
   const c=calc(b);
   return `<tr><td>${fmtDate(b.date)}</td><td><b>${esc(b.selection)}</b><br><small>${esc(b.event)}</small></td><td>${esc(b.league)}</td><td>${esc(b.market)}</td><td>${(+b.odds||0).toFixed(2)}</td><td>${money(c.stake)}</td><td class="${String(b.status).toLowerCase()}">${esc(b.status)}</td><td>${money(c.ret)}</td><td class="${c.pl>=0?"positive":"negative"}">${money(c.pl)}</td><td><button class="mini secondary" onclick="editBet('${b.id}')">Edit</button> <button class="mini danger" onclick="deleteBet('${b.id}')">×</button></td></tr>`;
 }).join("");

 let out="";
 Object.values(groups).sort((a,b)=>b.year-a.year||b.month-a.month).forEach(m=>{
   const monthBets=Object.values(m.weeks).flatMap(w=>Object.values(w.days).flat());
   const ms=monthBets.reduce((a,b)=>{const c=calc(b);a.st+=c.stake;a.pl+=c.pl;return a},{st:0,pl:0});
   const monthId=`month-${m.year}-${m.month}`;
   out+=`<tr class="history-group month-group"><td colspan="10"><button class="collapse-btn" data-target="${monthId}">▾</button><b>${monthNames[m.month]} ${m.year}</b><span class="group-summary">${monthBets.length} bets · ${money(ms.pl)} P/L</span></td></tr>`;
   out+=`<tr id="${monthId}" class="group-content"><td colspan="10"><div class="nested-groups">`;
   Object.values(m.weeks).sort((a,b)=>b.start-a.start).forEach(w=>{
     const weekBets=Object.values(w.days).flat();
     const ws=weekBets.reduce((a,b)=>{const c=calc(b);a.pl+=c.pl;return a},{pl:0});
     const weekId=`${monthId}-week-${w.start.toISOString().slice(0,10)}`;
     out+=`<div class="week-group"><button class="collapse-btn" data-target="${weekId}">▾</button><b>${fmtWeek(w.start)}</b><span class="group-summary">${weekBets.length} bets · ${money(ws.pl)} P/L</span></div>`;
     out+=`<div id="${weekId}" class="group-content week-content">`;
     Object.entries(w.days).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([dayKey,dayBets])=>{
       const ds=dayBets.reduce((a,b)=>{const c=calc(b);a.pl+=c.pl;return a},{pl:0});
       const dayId=`${weekId}-day-${dayKey}`;
       out+=`<div class="day-group"><button class="collapse-btn" data-target="${dayId}">▾</button><b>${fmtDay(dayKey)}</b><span class="group-summary">${dayBets.length} bets · ${money(ds.pl)} P/L</span></div>`;
       out+=`<div id="${dayId}" class="group-content day-content"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Selection</th><th>League</th><th>Market</th><th>Odds</th><th>Stake</th><th>Status</th><th>Returns</th><th>P/L</th><th></th></tr></thead><tbody>${betRows(dayBets)}</tbody></table></div></div>`;
     });
     out+=`</div>`;
   });
   out+=`</div></td></tr>`;
 });
 $("historyBody").innerHTML=out;
 document.querySelectorAll(".collapse-btn").forEach(btn=>btn.onclick=()=>{
   const el=$(btn.dataset.target); if(!el)return;
   el.classList.toggle("collapsed");
   btn.textContent=el.classList.contains("collapsed")?"▸":"▾";
 });
}

function listHTML(rows){
 if(!rows.length)return `<p class="muted">No settled data yet.</p>`;
 return `<div class="stat-list">${rows.slice(0,6).map(x=>`<div class="stat-row"><span><b>${esc(x.name)}</b><br><small>${x.bets} bets • ${pct(x.roi)} ROI</small></span><strong class="${x.pl>=0?"positive":"negative"}">${money(x.pl)}</strong></div>`).join("")}</div>`;
}
function betCardHTML(b, showStatus=true){
 const c=calc(b);
 const statusClass=String(b.status||"").toLowerCase();
 return `<div class="bet-card bet-card-${statusClass}">
   <div class="bet-card-top"><div><strong class="bet-selection ${statusClass}">${esc(b.selection||"—")}</strong><small>${esc(b.event||b.market||"No event")}</small></div><span class="bet-status ${statusClass}">${esc(b.status||"")}</span></div>
   <div class="bet-card-meta"><span>${esc(b.market||"Market not set")}</span><span>${esc(b.league||"League not set")}</span><span>@ ${(+b.odds||0).toFixed(2)}</span><span>Stake ${money(c.stake)}</span></div>
   ${b.status!=="Pending"?`<div class="bet-card-bottom"><span>${fmtDate(b.date)}</span><strong class="${c.pl>=0?"positive":"negative"}">${c.pl>=0?"+":""}${money(c.pl)}</strong></div>`:`<div class="bet-card-bottom"><span>${fmtDate(b.date)}</span><strong>Potential ${money(c.ret)}</strong></div>`}
 </div>`;
}
function renderDashLists(){
 const open=bets.filter(b=>b.status==="Pending").slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
 const recent=bets.filter(b=>b.status!=="Pending").slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
 const openEl=$("openBetsDash"), recentEl=$("recentResultsDash"), count=$("openBetCount");
 if(count)count.textContent=open.length;
 if(openEl)openEl.innerHTML=open.length?open.slice(0,6).map(betCardHTML).join(""):`<div class="dashboard-empty">No open bets right now.</div>`;
 if(recentEl)recentEl.innerHTML=recent.length?recent.map(betCardHTML).join(""):`<div class="dashboard-empty">No settled results yet.</div>`;
}
function tableHTML(rows,metric){
  if(!rows.length) return '<div class="empty">No settled bets yet.</div>';

  const valueFor = r => metric === "win" ? r.win : r.roi;
  const labelFor = r => metric === "win"
    ? `${r.win.toFixed(0)}%`
    : `${r.roi >= 0 ? "+" : ""}${r.roi.toFixed(0)}%`;

  return `<div class="performance-bars">
    ${rows.map(r => {
      const value = valueFor(r);
      const width = Math.max(4, Math.min(100, Math.abs(value)));
      const cls = metric === "win"
        ? (value >= 55 ? "metric-good" : value >= 45 ? "metric-neutral" : "metric-bad")
        : (value > 0 ? "metric-good" : value < 0 ? "metric-bad" : "metric-neutral");

      return `<div class="performance-row">
        <div class="performance-name" title="${esc(r.name)}">${esc(r.name)}</div>
        <div class="performance-main">
          <div class="performance-track">
            <div class="performance-fill ${cls}" style="width:${width}%"></div>
          </div>
          <div class="performance-value ${cls}">${labelFor(r)}</div>
        </div>
        <div class="performance-meta">${r.bets} bet${r.bets === 1 ? "" : "s"} · ${r.wins} win${r.wins === 1 ? "" : "s"}</div>
      </div>`;
    }).join("")}
  </div>`;
}

function renderLeagueMarketBreakdown(){
 const groups={};
 validBets().forEach(b=>{
   const league=(b.league||"Unknown").trim()||"Unknown";
   const market=(b.market||"Unknown").trim()||"Unknown";
   if(!groups[league])groups[league]={name:league,markets:{}};
   if(!groups[league].markets[market])groups[league].markets[market]={name:market,bets:0,stake:0,ret:0,pl:0,wins:0};
   const r=groups[league].markets[market],c=calc(b);
   r.bets++;r.stake+=c.stake;r.ret+=c.ret;r.pl+=c.pl;if(b.status==="Win")r.wins++;
 });
 const leagues=Object.values(groups).map(g=>{
   const markets=Object.values(g.markets).map(r=>({...r,roi:r.stake?r.pl/r.stake*100:0,win:r.bets?r.wins/r.bets*100:0})).sort((a,b)=>b.pl-a.pl);
   return {...g,markets};
 }).sort((a,b)=>(b.markets[0]?.pl||0)-(a.markets[0]?.pl||0));
 const el=$("leagueMarketBreakdown");
 if(!el)return;
 if(!leagues.length){el.innerHTML='<div class="analytics-empty">No settled bets yet.</div>';return;}
 el.innerHTML=`<div class="league-market-controls"><span>Show</span><div class="league-market-toggle" role="group" aria-label="League market metric"><button type="button" class="${leagueMarketMetric==="win"?"active":""}" data-league-market-metric="win">Win Rate</button><button type="button" class="${leagueMarketMetric==="roi"?"active":""}" data-league-market-metric="roi">ROI</button></div></div><div class="league-market-list">${leagues.map(g=>{
   const best=g.markets[0];
   const worstCandidates=g.markets.filter(r=>r.win<50).sort((a,b)=>a.pl-b.pl);
   const worst=worstCandidates[0];
   const worstHTML=worst?`<span class="league-best ${worst.pl>0?"best-positive":worst.pl<0?"best-negative":"best-neutral"}"><span class="league-best-label">Worst: ${esc(worst.name)}</span> <span class="league-best-pl ${worst.pl>=0?"positive":"negative"}">${worst.pl>=0?"+":""}${money(worst.pl)}</span></span>`:"";
   return `<div class="league-market-card"><div class="league-market-head"><div><strong>${esc(g.name)}</strong><small>${g.markets.length} market${g.markets.length===1?"":"s"} tracked</small></div><div class="league-best-stack"><span class="league-best ${best.pl>0?"best-positive":best.pl<0?"best-negative":"best-neutral"}"><span class="league-best-label">Best: ${esc(best.name)}</span> <span class="league-best-pl ${best.pl>=0?"positive":"negative"}">${best.pl>=0?"+":""}${money(best.pl)}</span></span>${worstHTML}</div></div><div class="league-market-rows">${g.markets.map(r=>`<div class="league-market-row ${r.pl>0?"market-positive":r.pl<0?"market-negative":"market-neutral"}><span class="league-market-name">${esc(r.name)}</span><span>${r.bets} bet${r.bets===1?"":"s"} · ${r.win.toFixed(0)}% win</span><span class="${r.pl>=0?"positive":"negative"}">${r.pl>=0?"+":""}${money(r.pl)}</span><span class="${leagueMarketMetric==="win"?(r.win>=50?"positive":"negative"):(r.roi>=0?"positive":"negative")}">${leagueMarketMetric==="win"?r.win.toFixed(1)+"% Win Rate":(r.roi>=0?"+":"")+r.roi.toFixed(1)+"% ROI"}</span></div>`).join("")}</div></div>`;
 }).join("")}</div>`;
}

function renderAnalytics(){
 renderLeagueMarketBreakdown();
 const markets=aggregate("market"), selections=aggregate("selection"), leagues=aggregate("league");
 $("marketTable").innerHTML=tableHTML(markets,metricModes.market);
 $("selectionTable").innerHTML=tableHTML(selections,metricModes.selection);
 $("leagueTable").innerHTML=tableHTML(leagues,metricModes.league);

 const ranges=[["1.01–1.49",1.01,1.49],["1.50–1.99",1.5,1.99],["2.00–2.99",2,2.99],["3.00–4.99",3,4.99],["5.00+",5,999]];
 const rows=ranges.map(r=>{
   const bs=validBets().filter(b=>(+b.odds||0)>=r[1]&&(+b.odds||0)<=r[2]);
   let st=0,pl=0,w=0;
   bs.forEach(b=>{const c=calc(b);st+=c.stake;pl+=c.pl;if(b.status==="Win")w++});
   return{name:r[0],bets:bs.length,stake:st,pl,roi:st?pl/st*100:0,win:bs.length?w/bs.length*100:0}
 }).filter(x=>x.bets);
 $("oddsTable").innerHTML=tableHTML(rows,metricModes.odds);

 const s=totalStats();
 const detail=r=>r?`${money(r.pl)} P/L · ${pct(r.roi)} ROI · ${r.bets} bet${r.bets===1?"":"s"}`:"No settled bets";
 const selectionDetail=selections[0]?`${esc(selections[0].topMarket||"Market not set")} · ${detail(selections[0])}`:"No settled bets";
 $("summary").innerHTML=`<div class="summary-intro"><b>How this works</b><span>“Best” means the highest total P/L from settled bets in that category. ROI is shown so you can see return relative to stake.</span></div>
 <div class="summary-grid">
  <div class="summary-box"><span>🏆 Best market by P/L</span><strong>${esc(markets[0]?.name||"—")}</strong><small>${markets[0]?detail(markets[0]):"No settled bets"}</small></div>
  <div class="summary-box"><span>🎯 Best selection by P/L</span><strong>${esc(selections[0]?.name||"—")}</strong><small>${selectionDetail}</small></div>
  <div class="summary-box"><span>🏟️ Best league by P/L</span><strong>${esc(leagues[0]?.name||"—")}</strong><small>${leagues[0]?detail(leagues[0]):"No settled bets"}</small></div>
  <div class="summary-box"><span>💷 Average stake</span><strong>${money(s.bets?s.stake/s.bets:0)}</strong><small>Across ${s.bets} total bet${s.bets===1?"":"s"}</small></div>
 </div>`;
}

function setupAnalyticsTabs(){
 document.querySelectorAll(".analytics-tab").forEach(btn=>btn.onclick=()=>{
   document.querySelectorAll(".analytics-tab").forEach(x=>x.classList.toggle("active",x===btn));
   document.querySelectorAll(".analytics-view").forEach(x=>x.classList.toggle("active",x.id==="analytics-"+btn.dataset.analytics));
 });
 document.querySelectorAll(".toggleMetric").forEach(btn=>btn.onclick=()=>{
   const k=btn.dataset.target;
   metricModes[k]=metricModes[k]==="roi"?"win":"roi";
   btn.textContent=metricModes[k]==="roi"?"ROI":"Win %";
   renderAnalytics();
 });
}
function renderCharts(){
 try{
  if(typeof Chart==="undefined") return;
  const settled=validBets().slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  let run=0;
  const labels=settled.map(b=>fmtDate(b.date));
  const vals=settled.map(b=>{run+=calc(b).pl;return +run.toFixed(2)});
  draw("plChart","line",labels,vals,"Cumulative P/L");

  const months={};
  settled.forEach(b=>{
    const d=new Date(b.date);
    const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    months[k]=(months[k]||0)+calc(b).pl;
  });
  const keys=Object.keys(months).sort();
  draw("monthlyChart","bar",keys,keys.map(k=>+months[k].toFixed(2)),"Monthly P/L");
 }catch(err){console.warn("Chart render skipped:",err)}
}
function draw(id,type,labels,data,label){
 try{
  const el=$(id);
  if(!el || typeof Chart==="undefined") return;
  if(charts[id]) charts[id].destroy();
  charts[id]=new Chart(el,{type,data:{labels,datasets:[{label,data,tension:.3,borderWidth:2}]},
   options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},
   scales:{y:{ticks:{callback:v=>"£"+v}}}}});
 }catch(err){console.warn("Chart error:",err)}
}

function showHistoryDay(d){
 const el=$("historyDayDetails");if(!el)return;
 const sign=d.pl>=0?"+":"";
 el.classList.remove("hidden","positive","negative");el.classList.add(d.pl>=0?"positive":"negative");
 el.innerHTML=`<div class="history-day-head"><div><b>${esc(d.label)}</b><small>${d.bets} bet${d.bets===1?"":"s"}</small></div><button class="mini secondary" id="closeHistoryDay">Close</button></div><div class="history-day-grid"><div><span>Day P/L</span><strong>${sign}${money(d.pl)}</strong></div><div><span>Cumulative P/L</span><strong>${d.cumulative>=0?"+":""}${money(d.cumulative)}</strong></div><div><span>Stake</span><strong>${money(d.stake)}</strong></div><div><span>Bets</span><strong>${d.bets}</strong></div></div>`;
 $("closeHistoryDay")?.addEventListener("click",()=>el.classList.add("hidden"));
}
function renderHistoryChart(){
 try{
  const el=$("historyPlChart");if(!el || typeof Chart==="undefined")return;
  const rows=filtered().filter(b=>b.status!=="Pending");
  const byDay={};
  rows.forEach(b=>{const key=String(b.date).slice(0,10);if(!byDay[key])byDay[key]={date:key,pl:0,stake:0,bets:0};const c=calc(b);byDay[key].pl+=c.pl;byDay[key].stake+=c.stake;byDay[key].bets++;});
  const days=Object.values(byDay).sort((a,b)=>a.date.localeCompare(b.date));
  let run=0;days.forEach(d=>{run+=d.pl;d.cumulative=+run.toFixed(2);d.pl=+d.pl.toFixed(2);d.stake=+d.stake.toFixed(2);});
  const labels=days.map(d=>d.date);
  const data=days.map(d=>d.cumulative);
  if(historyChart)historyChart.destroy();
  const current=days.length?days[days.length-1].cumulative:0;
  const currentText=current>=0?`Current profit +${money(current)}`:`Current loss -${money(Math.abs(current))}`;
  const endLabelPlugin={id:"historyEndLabel",afterDatasetsDraw(chart){if(!days.length)return;const meta=chart.getDatasetMeta(0),pt=meta.data[meta.data.length-1];if(!pt)return;const ctx=chart.ctx;ctx.save();ctx.font="700 12px system-ui";ctx.textAlign="right";ctx.fillStyle=current>=0?"#61d69b":"#ff6d7d";ctx.fillText(currentText,pt.x,pt.y-12);ctx.restore();}};
  historyChart=new Chart(el,{type:"line",data:{labels,datasets:[{label:"Cumulative P/L",data,borderWidth:3,tension:.35,pointRadius:5,pointHoverRadius:8,hitRadius:14,fill:true}]},plugins:[endLabelPlugin],options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"nearest",intersect:true},onClick:(evt,elements)=>{if(!elements.length)return;const i=elements[0].index;showHistoryDay(days[i]);},plugins:{legend:{display:true,position:"top"},tooltip:{callbacks:{title:items=>days[items[0].dataIndex]?`Betting day: ${fmtDate(days[items[0].dataIndex].date)}`:"",label:c=>{const d=days[c.dataIndex];return [`Day P/L: ${d.pl>=0?"+":""}${money(d.pl)}`,`Cumulative P/L: ${d.cumulative>=0?"+":""}${money(d.cumulative)}`,`Bets: ${d.bets}`,`Stake: ${money(d.stake)}`]}}}},scales:{x:{grid:{display:false},ticks:{color:"#91a0ba",maxTicksLimit:12,autoSkip:true,callback:function(value,index){const key=labels[index];if(!key)return "";const prev=labels[index-1];return !prev||key.slice(0,7)!==prev.slice(0,7)?new Date(key+"T12:00:00").toLocaleDateString("en-GB",{month:"short"}):"";}}},y:{beginAtZero:false,grid:{color:"rgba(145,160,186,.14)"},ticks:{color:"#91a0ba",callback:v=>money(v)}}}}});
  const empty=$("historyChartEmpty");if(empty)empty.classList.toggle("hidden",days.length>0);
 }catch(err){console.warn("History chart error:",err)}
}

function resetForm(){
 $("betId").value="";$("formTitle").textContent="Add a bet";$("betForm").reset();
 $("date").value=new Date().toISOString().slice(0,16);
}
function editBet(id){
 const b=bets.find(x=>x.id===id);if(!b)return;
 ["date","bookmaker","selection","event","league","market","odds","stake","status","returns","notes"].forEach(k=>$(k).value=b[k]??"");
 $("betId").value=id;$("formTitle").textContent="Edit bet";showTab("add");window.scrollTo({top:0,behavior:"smooth"});
}
function deleteBet(id){if(confirm("Delete this bet?")){bets=bets.filter(b=>b.id!==id);save()}}
function showTab(id){document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===id));document.querySelectorAll(".tab-panel").forEach(x=>x.classList.toggle("active",x.id===id))}
function demo(){
 const samples=[
  ["Arsenal","Premier League","Match Result",2.10,25,"Win",52.50],
  ["Liverpool","Premier League","Over 2.5 Goals",1.85,20,"Loss",0],
  ["Real Madrid","La Liga","Match Result",1.65,30,"Win",49.50],
  ["Barcelona","La Liga","Both Teams To Score",1.80,15,"Win",27],
  ["Man City","Premier League","Match Result",1.45,25,"Loss",0],
  ["Dortmund","Bundesliga","Over 2.5 Goals",2.20,20,"Win",44],
  ["Inter","Serie A","Match Result",1.70,20,"Win",34],
  ["Chelsea","Premier League","Draw No Bet",1.90,15,"Loss",0],
  ["PSG","Ligue 1","Match Result",1.55,25,"Win",38.75],
  ["Napoli","Serie A","Over 2.5 Goals",2.05,20,"Loss",0],
  ["Everton","Premier League","Total Cards",2.00,10,"Win",20],
  ["Milan","Serie A","Total Cards",2.40,12.50,"Loss",0],
  ["Atletico","La Liga","Corners",1.95,18,"Win",35.10],
  ["Leverkusen","Bundesliga","Match Result",1.75,22,"Win",38.50],
  ["PSV","Eredivisie","Over 2.5 Goals",1.90,16,"Loss",0]
 ];
 const start=new Date();
 start.setDate(1); start.setHours(19,0,0,0);
 bets=samples.map((x,i)=>{
   const d=new Date(start);
   d.setDate(1+i*4);
   if(d.getMonth()!==start.getMonth()) d.setMonth(start.getMonth()-1);
   return {id:crypto.randomUUID(),date:d.toISOString().slice(0,16),bookmaker:"Demo",selection:x[0],event:x[0]+" v Opponent",league:x[1],market:x[2],odds:x[3],stake:x[4],status:x[5],returns:x[6],notes:"Demo bet"};
 });
 save();
 showTab("dashboard");
}
$("betForm").addEventListener("submit",e=>{e.preventDefault();const id=$("betId").value;const b={id:id||crypto.randomUUID(),date:$("date").value,bookmaker:$("bookmaker").value,selection:$("selection").value,event:$("event").value,league:$("league").value,market:$("market").value,odds:+$("odds").value,stake:+$("stake").value,status:$("status").value,returns:+$("returns").value||0,notes:$("notes").value};if(id){const i=bets.findIndex(x=>x.id===id);bets[i]=b}else bets.push(b);save();resetForm();showTab("dashboard")});
$("resetForm").onclick=resetForm;
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>showTab(t.dataset.tab));
["search","filterStatus","filterMarket","filterLeague","filterFrom","filterTo"].forEach(id=>$(id).addEventListener("input",renderHistory));

function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
$("exportJson").onclick=()=>download("singles-betting-tracker.json",JSON.stringify(bets,null,2),"application/json");
$("exportCsv").onclick=()=>{const heads=["date","bookmaker","selection","event","league","market","odds","stake","status","returns","profit_loss","notes"];const rows=bets.map(b=>heads.map(h=>h==="profit_loss"?calc(b).pl:b[h]??""));const csv=[heads,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");download("singles-betting-tracker.csv",csv,"text/csv")};
$("importJson").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x))throw 0;bets=x;save();alert("Imported successfully.")}catch{alert("That JSON file is not valid.")}};r.readAsText(f)};

function cleanOCRText(t){
 return t.replace(/[|]/g,"I").replace(/\r/g,"").replace(/[ \t]+/g," ").replace(/\n{2,}/g,"\n").trim();
}
function firstMatch(text, patterns){
 for(const p of patterns){const m=text.match(p);if(m&&m[1])return m[1].trim()}
 return "";
}
function inferMarket(selection,text){
 const s=(selection+" "+text).toLowerCase();
 if(/card/.test(s)) return "Total Cards";
 if(/corner/.test(s)) return "Corners";
 if(/both teams|btts|score/.test(s)) return "Goals";
 if(/over .*goal|under .*goal|total goals/.test(s)) return "Goals";
 if(/match result|to win|draw no bet|double chance/.test(s)) return "Match Result";
 return "";
}
function parseOCRBet(text){
 const lines=text.split("\n").map(x=>x.trim()).filter(Boolean);
 const joined=lines.join(" ");
 let selection="", odds="";
 const selectionFrom=(m)=>m?`${m[1][0].toUpperCase()+m[1].slice(1).toLowerCase()} ${m[2]}`:"";
 for(const line of lines){
   const m=line.match(/\b(over|under)\s*(\d+(?:\.\d+)?)(?:\s+|\s*@\s*)(\d+(?:\.\d{1,2})?)\b/i);
   if(m){selection=selectionFrom(m);odds=+m[3];break;}
 }
 if(!selection){
   const m=joined.match(/\b(over|under)\s*(\d+(?:\.\d+)?)(?:\s*@\s*(\d+(?:\.\d{1,2})?))?/i);
   if(m)selection=selectionFrom(m);
 }
 if(!odds && selection){
   const idx=lines.findIndex(l=>l.toLowerCase().includes(selection.toLowerCase()));
   const nearby=(idx>=0?lines.slice(idx,Math.min(lines.length,idx+3)).join(" "):joined);
   const om=nearby.match(/(?:^|\s|@)(\d+\.\d{1,2})(?=\s|$)/);
   if(om)odds=+om[1];
 }
 let market=firstMatch(text,[
   /\b(total cards|total corners|total goals|both teams to score|double chance|draw no bet|match result|over\/under|corners)\b/i
 ])||inferMarket(selection,text);
 if(market) market=market.replace(/\s+(?:3[- ]?way|2[- ]?way)\b/i,"").trim();
 let event="";
 const marketIdx=lines.findIndex(l=>market && l.toLowerCase().includes(market.toLowerCase()));
 if(marketIdx>=0){
   const candidates=[];
   for(const l of lines.slice(marketIdx+1,Math.min(lines.length,marketIdx+7))){
     let x=l.replace(/^[^A-Za-z]+/,"").trim();
     x=x.replace(/\s+\d{1,2}$|\s+[A-Za-z]?\d{1,2}\s*$/,"").trim();
     if(/^[A-Za-z][A-Za-z .&'’-]{2,}$/.test(x) && !/^(stake|return|returns|share|total cards|3-way)$/i.test(x)) candidates.push(x);
     if(candidates.length===2)break;
   }
   if(candidates.length===2)event=`${candidates[0]} v ${candidates[1]}`;
 }
 if(!event){
   const m=joined.match(/\b([A-Za-z][A-Za-z .'-]{2,})\s+(?:v|vs|versus)\s+([A-Za-z][A-Za-z .'-]{2,})\b/i);
   if(m)event=`${m[1].trim()} v ${m[2].trim()}`;
 }
 let stake="", returns="";
 const money=[...text.matchAll(/[£$€]\s*(\d+(?:\.\d{1,2})?)/g)].map(m=>+m[1]);
 const sr=joined.match(/stake\s+return\s+£?\s*(\d+(?:\.\d{1,2})?)\s+£?\s*(\d+(?:\.\d{1,2})?)/i);
 if(sr){stake=+sr[1];returns=+sr[2];}
 const sm=joined.match(/(?:stake|wager|bet amount|amount)\s*[:\-]?\s*[£$€]?\s*(\d+(?:\.\d{1,2})?)/i);
 const rm=joined.match(/(?:return|returns|payout|potential return|possible return)\s*[:\-]?\s*[£$€]?\s*(\d+(?:\.\d{1,2})?)/i);
 if(!stake && sm)stake=+sm[1];
 if(!returns && rm)returns=+rm[1];
 if(!stake && money.length)stake=money[0];
 if(!returns && money.length>1)returns=money[money.length-1];
 let bookmaker=firstMatch(text,[/(bet365|sky bet|ladbrokes|william hill|paddy power|coral|betfred|unibet|betfair|boylesports|888sport)/i]);
 let league=firstMatch(text,[/(premier league|championship|league one|league two|la liga|serie a|bundesliga|ligue 1|champions league|europa league|conference league|fa cup|carabao cup|world cup|euro)/i]);
 let status="Pending";
 if(/\b(won|winner|settled win)\b/i.test(joined))status="Win";
 else if(/\b(lost|loser|settled loss)\b/i.test(joined))status="Loss";
 else if(/\b(void|voided|push)\b/i.test(joined))status="Void";
 return {bookmaker,selection,event,league,market,odds,stake,status,returns,text};
}
async function prepareOCRImage(file){
 return new Promise((resolve,reject)=>{
   const img=new Image();
   const url=URL.createObjectURL(file);
   img.onload=()=>{
     URL.revokeObjectURL(url);
     const scale=Math.min(2,2400/Math.max(img.naturalWidth,img.naturalHeight));
     const canvas=document.createElement("canvas");
     canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
     const ctx=canvas.getContext("2d",{willReadFrequently:true});
     ctx.drawImage(img,0,0,canvas.width,canvas.height);
     const data=ctx.getImageData(0,0,canvas.width,canvas.height);
     for(let i=0;i<data.data.length;i+=4){
       const r=data.data[i],g=data.data[i+1],b=data.data[i+2];
       const y=(0.299*r+0.587*g+0.114*b);
       const boosted=Math.max(0,Math.min(255,(y-128)*1.35+128));
       data.data[i]=data.data[i+1]=data.data[i+2]=boosted;
     }
     ctx.putImageData(data,0,0);
     canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("OCR image preparation failed")),"image/png");
   };
   img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not load screenshot"))};
   img.src=url;
 });
}
$("screenshot").onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 $("ocrStatus").textContent="Reading screenshot…";
 const previewUrl=URL.createObjectURL(file);
 $("ocrPreview").innerHTML=`<img src="${previewUrl}" alt="Betting screenshot">`;
 $("ocrFields").classList.remove("hidden");$("saveOcr").classList.remove("hidden");
 try{
  const ocrImage=await prepareOCRImage(file);
  const result=await Tesseract.recognize(ocrImage,"eng",{logger:m=>{
   if(m.status==="recognizing text")$("ocrStatus").textContent=`Reading screenshot… ${Math.round((m.progress||0)*100)}%`;
  }});
  const text=cleanOCRText(result.data.text);
  const parsed=parseOCRBet(text);
  $("ocrDate").value=new Date().toISOString().slice(0,16);
  $("ocrBookmaker").value=parsed.bookmaker;
  $("ocrSelection").value=parsed.selection;
  $("ocrEvent").value=parsed.event;
  $("ocrLeague").value=parsed.league;
  $("ocrMarket").value=parsed.market;
  $("ocrOdds").value=parsed.odds;
  $("ocrStake").value=parsed.stake;
  $("ocrStatusSelect").value=parsed.status;
  $("ocrReturns").value=parsed.returns;
  $("ocrStatus").textContent=text?"Done — fields filled from the screenshot. Check them before saving.":"No readable text was found — try a clearer screenshot.";
 }catch(err){
  console.error(err);
  $("ocrStatus").textContent="OCR failed on this image. Try a clearer/full-resolution screenshot or enter the bet manually.";
 }
};
$("saveOcr").onclick=()=>{
 const b={id:crypto.randomUUID(),date:$("ocrDate").value,bookmaker:$("ocrBookmaker").value,selection:$("ocrSelection").value,event:$("ocrEvent").value,league:$("ocrLeague").value,market:$("ocrMarket").value,odds:+$("ocrOdds").value,stake:+$("ocrStake").value,status:$("ocrStatusSelect").value,returns:+$("ocrReturns").value||0,notes:"Imported from screenshot"};
 if(!b.selection||!b.odds||!b.stake){alert("Please fill in selection, odds and stake.");return}bets.push(b);save();showTab("dashboard");$("ocrStatus").textContent="Saved.";};



document.addEventListener("click",e=>{
 const btn=e.target.closest("[data-league-market-metric]");
 if(!btn)return;
 leagueMarketMetric=btn.dataset.leagueMarketMetric==="roi"?"roi":"win";
 renderLeagueMarketBreakdown();
});

resetForm();setupAnalyticsTabs();render();

// View mode: Auto follows the device; Mobile/Desktop let the user override the layout.
const VIEW_MODE_KEY="singlesBettingTracker.viewMode";
const viewMode=$("viewMode");
function applyViewMode(mode){
  const chosen=["auto","mobile","desktop"].includes(mode)?mode:"auto";
  document.body.classList.toggle("view-mobile",chosen==="mobile");
  document.body.classList.toggle("view-desktop",chosen==="desktop");
  document.body.classList.toggle("view-auto",chosen==="auto");
  if(viewMode)viewMode.value=chosen;
  localStorage.setItem(VIEW_MODE_KEY,chosen);
}
viewMode?.addEventListener("change",()=>applyViewMode(viewMode.value));
applyViewMode(localStorage.getItem(VIEW_MODE_KEY)||"auto");

let deferredInstallPrompt=null;
const installBtn=$("installPwa");
function isStandalone(){return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true}
function updateInstallButton(){if(!installBtn)return;if(isStandalone()){installBtn.classList.add("hidden");return}installBtn.classList.remove("hidden");installBtn.textContent="📱 Install App"}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;updateInstallButton()});
window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null;updateInstallButton()});
installBtn?.addEventListener("click",async()=>{if(isStandalone())return;if(deferredInstallPrompt){const prompt=deferredInstallPrompt;deferredInstallPrompt=null;try{await prompt.prompt();await prompt.userChoice}catch(err){console.warn("Install prompt unavailable:",err)}updateInstallButton();return}alert("The install prompt is not available yet. Chrome may show Install App in its normal menu once the site meets its install requirements.")});
updateInstallButton();
