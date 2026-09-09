const KEY="singlesBettingTracker.v1";
let bets=load();
let charts={};

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
function validBets(){return bets.filter(b=>b.status!=="Pending")}
function aggregate(field){
 const m={};
 validBets().forEach(b=>{const k=b[field]||"Unknown";if(!m[k])m[k]={name:k,bets:0,stake:0,ret:0,pl:0,wins:0};
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
 $("historyBody").innerHTML=filtered().map(b=>{const c=calc(b);
 return `<tr><td>${fmtDate(b.date)}</td><td><b>${esc(b.selection)}</b><br><small>${esc(b.event)}</small></td><td>${esc(b.league)}</td><td>${esc(b.market)}</td><td>${(+b.odds||0).toFixed(2)}</td><td>${money(c.stake)}</td><td class="${b.status.toLowerCase()}">${esc(b.status)}</td><td>${money(c.ret)}</td><td class="${c.pl>=0?"positive":"negative"}">${money(c.pl)}</td><td><button class="mini secondary" onclick="editBet('${b.id}')">Edit</button> <button class="mini danger" onclick="deleteBet('${b.id}')">×</button></td></tr>`}).join("")||`<tr><td colspan="10" class="muted">No bets yet. Add one or load demo data.</td></tr>`;
}
function listHTML(rows){
 if(!rows.length)return `<p class="muted">No settled data yet.</p>`;
 return `<div class="stat-list">${rows.slice(0,6).map(x=>`<div class="stat-row"><span><b>${esc(x.name)}</b><br><small>${x.bets} bets • ${pct(x.roi)} ROI</small></span><strong class="${x.pl>=0?"positive":"negative"}">${money(x.pl)}</strong></div>`).join("")}</div>`;
}
function renderDashLists(){$("marketDash").innerHTML=listHTML(aggregate("market"));$("leagueDash").innerHTML=listHTML(aggregate("league"))}
function tableHTML(rows){
 if(!rows.length)return `<p class="muted">No settled data yet.</p>`;
 return `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Bets</th><th>Stake</th><th>P/L</th><th>ROI</th><th>Win %</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.bets}</td><td>${money(x.stake)}</td><td class="${x.pl>=0?"positive":"negative"}">${money(x.pl)}</td><td>${pct(x.roi)}</td><td>${pct(x.win)}</td></tr>`).join("")}</tbody></table></div>`
}
function renderAnalytics(){
 $("marketTable").innerHTML=tableHTML(aggregate("market"));
 $("leagueTable").innerHTML=tableHTML(aggregate("league"));
 const ranges=[["1.01–1.49",1.01,1.49],["1.50–1.99",1.5,1.99],["2.00–2.99",2,2.99],["3.00–4.99",3,4.99],["5.00+",5,999]];
 const rows=ranges.map(r=>{const bs=validBets().filter(b=>(+b.odds||0)>=r[1]&&(+b.odds||0)<=r[2]);let st=0,pl=0,w=0;bs.forEach(b=>{const c=calc(b);st+=c.stake;pl+=c.pl;if(b.status==="Win")w++});return{name:r[0],bets:bs.length,stake:st,pl,roi:st?pl/st*100:0,win:bs.length?w/bs.length*100:0}}).filter(x=>x.bets);
 $("oddsTable").innerHTML=tableHTML(rows);
 const s=totalStats(), mk=aggregate("market"), lg=aggregate("league");
 $("summary").innerHTML=`<div class="summary-grid">
 <div class="summary-box"><span>Best market</span><strong>${esc(mk[0]?.name||"—")}</strong></div>
 <div class="summary-box"><span>Best league</span><strong>${esc(lg[0]?.name||"—")}</strong></div>
 <div class="summary-box"><span>Settled bets</span><strong>${validBets().length}</strong></div>
 <div class="summary-box"><span>Average stake</span><strong>${money(s.bets?s.stake/s.bets:0)}</strong></div></div>`;
}
function renderCharts(){
 const settled=bets.filter(b=>b.status!=="Pending").sort((a,b)=>new Date(a.date)-new Date(b.date));let run=0;
 const labels=settled.map(b=>fmtDate(b.date)), vals=settled.map(b=>{run+=calc(b).pl;return +run.toFixed(2)});
 draw("plChart","line",labels,vals,"Cumulative P/L");
 const months={};settled.forEach(b=>{const k=String(b.date).slice(0,7);months[k]=(months[k]||0)+calc(b).pl});
 draw("monthlyChart","bar",Object.keys(months),Object.values(months).map(x=>+x.toFixed(2)),"Monthly P/L");
}
function draw(id,type,labels,data,label){
 if(charts[id])charts[id].destroy();
 charts[id]=new Chart($(id),{type,data:{labels,datasets:[{label,data,tension:.3,borderWidth:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>"£"+v}}}}});
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
 const now=Date.now(), samples=[
 ["Arsenal","Premier League","Match Result",2.1,25,"Win",52.5],
 ["Liverpool","Premier League","Over 2.5 Goals",1.85,20,"Loss",0],
 ["Real Madrid","La Liga","Match Result",1.65,30,"Win",49.5],
 ["Barcelona","La Liga","Both Teams To Score",1.8,15,"Win",27],
 ["Man City","Premier League","Match Result",1.45,25,"Loss",0],
 ["Dortmund","Bundesliga","Over 2.5 Goals",2.2,20,"Win",44],
 ["Inter","Serie A","Match Result",1.7,20,"Win",34],
 ["Chelsea","Premier League","Draw No Bet",1.9,15,"Loss",0],
 ["PSG","Ligue 1","Match Result",1.55,25,"Win",38.75],
 ["Napoli","Serie A","Over 2.5 Goals",2.05,20,"Loss",0]
 ];
 bets=samples.map((x,i)=>({id:crypto.randomUUID(),date:new Date(now-(samples.length-i)*86400000*3).toISOString().slice(0,16),bookmaker:"Demo",selection:x[0],event:x[0]+" v Opponent",league:x[1],market:x[2],odds:x[3],stake:x[4],status:x[5],returns:x[6],notes:"Demo bet"}));save();
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

$("screenshot").onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 $("ocrStatus").textContent="Reading screenshot…";
 $("ocrPreview").innerHTML=`<img src="${URL.createObjectURL(file)}" alt="Betting screenshot">`;
 try{
  const result=await Tesseract.recognize(file,"eng",{logger:m=>{if(m.status==="recognizing text")$("ocrStatus").textContent=`Reading screenshot… ${Math.round((m.progress||0)*100)}%`}});
  const text=result.data.text;
  const nums=[...text.matchAll(/(?:£|GBP)?\s*(\d+(?:\.\d{1,2})?)/gi)].map(m=>+m[1]).filter(n=>n>0);
  const oddsMatch=text.match(/\b([1-9]\d?\.\d{1,2})\b/);
  $("ocrDate").value=new Date().toISOString().slice(0,16);
  $("ocrSelection").value=(text.match(/(?:selection|pick|bet)\s*[:\-]\s*(.+)/i)||[])[1]?.trim()||"";
  $("ocrOdds").value=oddsMatch?oddsMatch[1]:"";
  $("ocrStake").value=nums.length?Math.min(...nums):"";
  $("ocrBookmaker").value=(text.match(/(bet365|sky bet|ladbrokes|william hill|paddy power|coral|betfred|unibet|betfair)/i)||[])[1]||"";
  $("ocrEvent").value="";
  $("ocrLeague").value="";
  $("ocrMarket").value="";
  $("ocrReturns").value="";
  $("ocrFields").classList.remove("hidden");$("saveOcr").classList.remove("hidden");
  $("ocrStatus").textContent="Done — check the fields below before saving.";
 }catch(err){$("ocrStatus").textContent="Couldn’t read that image. You can still add the bet manually."}
};
$("saveOcr").onclick=()=>{
 const b={id:crypto.randomUUID(),date:$("ocrDate").value,bookmaker:$("ocrBookmaker").value,selection:$("ocrSelection").value,event:$("ocrEvent").value,league:$("ocrLeague").value,market:$("ocrMarket").value,odds:+$("ocrOdds").value,stake:+$("ocrStake").value,status:$("ocrStatusSelect").value,returns:+$("ocrReturns").value||0,notes:"Imported from screenshot"};
 if(!b.selection||!b.odds||!b.stake){alert("Please fill in selection, odds and stake.");return}bets.push(b);save();showTab("dashboard");$("ocrStatus").textContent="Saved.";};

resetForm();render();
