const KEY="singlesBettingTracker.v1";
let bets=load();
let charts={};
const metricModes={market:"roi",selection:"roi",league:"roi",odds:"roi"};

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
 validBets().forEach(b=>{const k=(b[field]||"Unknown").trim()||"Unknown";if(!m[k])m[k]={name:k,bets:0,stake:0,ret:0,pl:0,wins:0};
 const c=calc(b);m[k].bets++;m[k].stake+=c.stake;m[k].ret+=c.ret;m[k].pl+=c.pl;if(b.status==="Win")m[k].wins++});
 return Object.values(m).map(x=>({...x,roi:x.stake?x.pl/x.stake*100:0,win:x.bets?x.wins/x.bets*100:0})).sort((a,b)=>b.pl-a.pl)
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
 $("kpiBets").textContent=s.bets;$("kpiStake").textContent=money(s.stake);$("kpiReturns").textContent=money(s.ret);
 $("kpiProfit").textContent=money(s.pl);$("kpiProfit").className=s.pl>=0?"positive":"negative";
 $("kpiRoi").textContent=pct(s.roi);$("kpiWin").textContent=pct(s.win);$("kpiOdds").textContent=s.avg.toFixed(2);
 $("kpiStreak").textContent=streak();
 renderHistory();renderDashLists();renderAnalytics();renderCharts();
}
function filtered(){
 const q=$("search").value.toLowerCase(), st=$("filterStatus").value, ma=$("filterMarket").value.toLowerCase(), le=$("filterLeague").value.toLowerCase(), from=$("filterFrom").value, to=$("filterTo").value;
 return bets.filter(b=>{
  const text=[b.selection,b.event,b.league,b.market,b.bookmaker].join(" ").toLowerCase();
  return (!q||text.includes(q))&&(!st||b.status===st)&&(!ma||(b.market||"").toLowerCase().includes(ma))&&(!le||(b.league||"").toLowerCase().includes(le))&&(!from||String(b.date).slice(0,10)>=from)&&(!to||String(b.date).slice(0,10)<=to)
 }).sort((a,b)=>new Date(b.date)-new Date(a.date));
}
function renderHistory(){
 const rows=filtered();
 if(!rows.length){
   $("historyBody").innerHTML=`<div class="history-empty">No bets yet. Add one or load demo data.</div>`;
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
function renderDashLists(){$("marketDash").innerHTML=listHTML(aggregate("market"));$("leagueDash").innerHTML=listHTML(aggregate("league"))}
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

function renderAnalytics(){
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
 $("summary").innerHTML=`<div class="summary-grid">
 <div class="summary-box"><span>Best market</span><strong>${esc(markets[0]?.name||"—")}</strong><small>${markets[0]?money(markets[0].pl)+" P/L • "+pct(markets[0].roi)+" ROI":" "}</small></div>
 <div class="summary-box"><span>Best selection</span><strong>${esc(selections[0]?.name||"—")}</strong><small>${selections[0]?money(selections[0].pl)+" P/L • "+pct(selections[0].roi)+" ROI":" "}</small></div>
 <div class="summary-box"><span>Best league</span><strong>${esc(leagues[0]?.name||"—")}</strong><small>${leagues[0]?money(leagues[0].pl)+" P/L • "+pct(leagues[0].roi)+" ROI":" "}</small></div>
 <div class="summary-box"><span>Average stake</span><strong>${money(s.bets?s.stake/s.bets:0)}</strong></div></div>`;
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
$("clearBtn").onclick=()=>{if(confirm("Delete every saved bet?")){bets=[];save()}};
$("demoBtn").onclick=demo;

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
$("screenshot").onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 $("ocrStatus").textContent="Reading screenshot…";
 $("ocrPreview").innerHTML=`<img src="${URL.createObjectURL(file)}" alt="Betting screenshot">`;
 $("ocrFields").classList.remove("hidden");$("saveOcr").classList.remove("hidden");
 try{
  const result=await Tesseract.recognize(file,"eng",{logger:m=>{
   if(m.status==="recognizing text")$("ocrStatus").textContent=`Reading screenshot… ${Math.round((m.progress||0)*100)}%`;
  }});
  const text=cleanOCRText(result.data.text);
  const lower=text.toLowerCase();

  const bookmaker=firstMatch(text,[/(bet365|sky bet|ladbrokes|william hill|paddy power|coral|betfred|unibet|betfair|boylesports|888sport)/i]);
  const oddsMatches=[...text.matchAll(/(?:@|odds?\s*[:\-]?\s*|price\s*[:\-]?\s*)(\d+(?:\.\d{1,2})?)/gi)];
  const allDecimal=[...text.matchAll(/\b(\d+\.\d{1,2})\b/g)].map(m=>+m[1]).filter(n=>n>=1.01&&n<=100);
  const odds=oddsMatches.length?+oddsMatches[0][1]:(allDecimal.length?allDecimal[0]:"");

  const stakeMatch=text.match(/(?:stake|wager|bet amount|amount)\s*[:\-]?\s*[£$€]?\s*(\d+(?:\.\d{1,2})?)/i);
  const returnMatch=text.match(/(?:return|returns|payout|potential return|possible return|win)\s*[:\-]?\s*[£$€]?\s*(\d+(?:\.\d{1,2})?)/i);
  const stake=stakeMatch?+stakeMatch[1]:"";
  const returns=returnMatch?+returnMatch[1]:"";

  let selection=firstMatch(text,[
   /(?:selection|bet|pick)\s*[:\-]\s*(.+)/i,
   /(?:total cards|cards|total corners|corners|over|under)\s+([^\n]+)/i
  ]);
  selection=(selection||"").replace(/\s+(?:@|odds|stake|return).*/i,"").trim();

  const event=firstMatch(text,[
   /(?:event|fixture|match)\s*[:\-]\s*(.+)/i,
   /\b([A-Za-z][A-Za-z .'-]{2,})\s+(?:v|vs|versus)\s+([A-Za-z][A-Za-z .'-]{2,})\b/i
  ]);
  const eventText=event||"";
  let league=firstMatch(text,[/(premier league|championship|league one|league two|la liga|serie a|bundesliga|ligue 1|champions league|europa league|conference league|fa cup|carabao cup|world cup|euro)/i]);
  let market=firstMatch(text,[/(total cards|match result|both teams to score|double chance|draw no bet|total goals|over\/under|corners)/i])||inferMarket(selection,text);

  let status="Pending";
  if(/\b(won|winner|win|settled win)\b/i.test(lower))status="Win";
  else if(/\b(lost|loser|loss|settled loss)\b/i.test(lower))status="Loss";
  else if(/\b(void|voided|push)\b/i.test(lower))status="Void";

  $("ocrDate").value=new Date().toISOString().slice(0,16);
  $("ocrBookmaker").value=bookmaker;
  $("ocrSelection").value=selection;
  $("ocrEvent").value=eventText;
  $("ocrLeague").value=league;
  $("ocrMarket").value=market;
  $("ocrOdds").value=odds;
  $("ocrStake").value=stake;
  $("ocrStatusSelect").value=status;
  $("ocrReturns").value=returns;

  $("ocrStatus").textContent=text?"Done — fields have been filled where the screenshot text could be recognised. Check them before saving.":"No readable text was found — try a clearer screenshot.";
 }catch(err){
  $("ocrStatus").textContent="OCR failed on this image. Try a clearer/full-resolution screenshot or enter the bet manually.";
 }
};
$("saveOcr").onclick=()=>{
 const b={id:crypto.randomUUID(),date:$("ocrDate").value,bookmaker:$("ocrBookmaker").value,selection:$("ocrSelection").value,event:$("ocrEvent").value,league:$("ocrLeague").value,market:$("ocrMarket").value,odds:+$("ocrOdds").value,stake:+$("ocrStake").value,status:$("ocrStatusSelect").value,returns:+$("ocrReturns").value||0,notes:"Imported from screenshot"};
 if(!b.selection||!b.odds||!b.stake){alert("Please fill in selection, odds and stake.");return}bets.push(b);save();showTab("dashboard");$("ocrStatus").textContent="Saved.";};

resetForm();setupAnalyticsTabs();render();

let deferredInstallPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{
 e.preventDefault();
 deferredInstallPrompt=e;
 const btn=$("installPwa");
 if(btn) btn.classList.remove("hidden");
});
window.addEventListener("appinstalled",()=>{
 deferredInstallPrompt=null;
 const btn=$("installPwa");
 if(btn){btn.classList.add("hidden");btn.textContent="Installed ✓";}
});

document.addEventListener("click",async e=>{
 if(e.target && e.target.id==="installPwa" && deferredInstallPrompt){
   deferredInstallPrompt.prompt();
   await deferredInstallPrompt.userChoice;
   deferredInstallPrompt=null;
   e.target.classList.add("hidden");
 }
});
