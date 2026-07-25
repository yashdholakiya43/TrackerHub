/* ============================================================
   STEP 1 PACE  ·  single-file study tracker
   Data model version 3
   ============================================================ */
const APP_VERSION = "3.2.0";
const KEY = "step1pace.v3";

/* ---------- constants from your brief ---------- */
const UW_TOTAL   = 3657;   // UWorld questions
const UW_ASSESS  = 3;      // UWorld self-assessments
const FA_TOTAL   = 800;    // First Aid 2025 pages (editable in Plan)
const BUFFER_DAYS= 25;     // finish FA + UWorld 25 days before exam
const PHASE_START= "2026-08-01"; // phases begin here
const PRE_CUTOFF = "2026-07-01"; // before this = "earlier preparation"

/* ---------- default state ---------- */

const FA_TOPICS = ["Biochemistry", "Immunology", "Microbiology", "Pathology", "Pharmacology", "Public Health Sciences", "Cardiovascular", "Endocrine", "Gastrointestinal", "Hematology and Oncology", "Musculoskeletal, Skin, and Connective Tissue", "Neurology and Special Senses", "Psychiatry", "Renal", "Reproductive", "Respiratory", "Rapid Review"];

const UW_TOPICS = ["Biochemistry (General Principles)", "Genetics (General Principles)", "Microbiology (General Principles)", "Pathology (General Principles)", "Pharmacology (General Principles)", "Biostatistics & Epidemiology", "Poisoning & Environmental Exposure", "Psychiatric/Behavioral & Substance Use Disorder", "Social Sciences (Ethics/Legal/Professional)", "Miscellaneous (Multisystem)", "Allergy & Immunology", "Cardiovascular System", "Dermatology", "Ear, Nose & Throat (ENT)", "Endocrine, Diabetes & Metabolism", "Female Reproductive System & Breast", "Gastrointestinal & Nutrition", "Hematology & Oncology", "Infectious Diseases", "Male Reproductive System", "Nervous System", "Ophthalmology", "Pregnancy, Childbirth & Puerperium", "Pulmonary & Critical Care", "Renal, Urinary Systems & Electrolytes", "Rheumatology/Orthopedics & Sports"];

const DEFAULT = {
  v: 3,
  settings:{
    theme:"dark",
    examDate:"",
    faTotal:FA_TOTAL,
    faStart:0,          // pages already done before tracking
    uwStart:0,          // questions already done before tracking
    uwTotal:UW_TOTAL,
    dailyHourGoal:6,
    minQ:30, maxQ:60,
    syncUrl:"",         // remote JSON URL for one-tap update
    lastSync:""
  },
  qlogs:{},   // "YYYY-MM-DD": {q:Number, correct:Number|null, pages:Number, note:String}
  hours:{},   // "YYYY-MM-DD": {block:sec, book:sec, lecture:sec}
  nbme:[],    // {id,name,date,score,type,percentCorrect,note}
  sessions:[] // {id,date,mode,sec,label}
};

/* ---------- storage ---------- */
let S = load();
function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return migrate(structuredClone(DEFAULT));
    const p = JSON.parse(raw);
    return migrate({...structuredClone(DEFAULT), ...p,
      settings:{...DEFAULT.settings, ...(p.settings||{})}});
  }catch(e){ return structuredClone(DEFAULT); }
}
function migrate(s){
  s.qlogs=s.qlogs||{}; s.hours=s.hours||{}; s.nbme=s.nbme||[]; s.sessions=s.sessions||[];
  s.studyLogs=s.studyLogs||[];
  
  // Safe migration from old single-day format to new multiple-entry array
  if(Object.keys(s.qlogs).length > 0 && s.studyLogs.length === 0){
    for(const [d, v] of Object.entries(s.qlogs)){
      s.studyLogs.push({
        id: d+"-mig", date: d, q: v.q||0, correct: v.correct, pages: v.pages||0, uwTopic: v.note||"", faTopic: v.note||""
      });
    }
  }
  s.v=3.2; return s;
}

let saveT=null;
function save(now){
  clearTimeout(saveT);
  const go=()=>{ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){ toast("Storage full — export a backup","bad"); } };
  now ? go() : saveT=setTimeout(go,220);
}

/* ---------- date helpers ---------- */
const pad=n=>String(n).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const[a,b,c]=s.split("-").map(Number);return new Date(a,b-1,c);};
const today=()=>iso(new Date());
const addD=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return iso(d);};
const diffD=(a,b)=>Math.round((parse(b)-parse(a))/864e5);
const DOW=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtD=s=>{const d=parse(s);return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;};
const fmtShort=s=>{const d=parse(s);return `${d.getDate()} ${MON[d.getMonth()]}`;};
const dowShort=s=>DOW[parse(s).getDay()].slice(0,3);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function hms(sec){
  sec=Math.max(0,Math.floor(sec));
  const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;
  return h>0?`${h}:${pad(m)}:${pad(s)}`:`${m}:${pad(s)}`;
}
function hrs(sec){ return (sec/3600); }
function hLabel(sec){
  const h=Math.floor(sec/3600), m=Math.round(sec%3600/60);
  return h>0 ? `${h}h ${pad(m)}m` : `${m}m`;
}

/* ---------- icons (vector, no emoji) ---------- */
const I = (n,o={})=>{
  const sw=o.w||1.9, sz=o.s||18, c=o.c||"currentColor";
  const P={
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5"/>',
    log:'<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M8 3v3M16 3v3M3.5 9.5h17M8.5 14h3M8.5 17.5h6"/>',
    nbme:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H18a2 2 0 0 1 2 2v14.5"/><path d="M6.5 16H20v3.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 4 18.5v-13"/><path d="M9 8h7"/>',
    watch:'<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.4 1.6M9 2.5h6M12 2.5v3"/>',
    plan:'<path d="M4 6h16M4 12h11M4 18h7"/><circle cx="19.5" cy="17.5" r="2.6"/><path d="M21.4 19.4 23 21"/>',
    sun:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2 12h2.4M19.6 12H22M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/>',
    moon:'<path d="M20 14.4A8.5 8.5 0 1 1 9.6 4a6.8 6.8 0 0 0 10.4 10.4Z"/>',
    sync:'<path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9"/><path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9"/><path d="M18.1 2.6v3.5h-3.5M5.9 21.4v-3.5h3.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    check:'<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
    x:'<path d="M6 6l12 12M18 6 6 18"/>',
    trash:'<path d="M4 7h16M9.5 7V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3V7M6.5 7l.9 12.2A2 2 0 0 0 9.4 21h5.2a2 2 0 0 0 2-1.8L17.5 7"/>',
    flame:'<path d="M12 22c4 0 6.5-2.6 6.5-6 0-4.3-4-6.2-3.5-10.5C13 6.5 11 8.5 11 11c-1-.6-1.5-1.8-1.5-3C7.6 9.6 5.5 12 5.5 16c0 3.4 2.5 6 6.5 6Z"/>',
    target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/>',
    zap:'<path d="M13.5 2 4 13.5h6.5L10 22l9.5-11.5H13L13.5 2Z"/>',
    book:'<path d="M4 5.2A2.2 2.2 0 0 1 6.2 3H19v15.5H6.2A2.2 2.2 0 0 0 4 20.7Z"/><path d="M4 20.7A2.2 2.2 0 0 1 6.2 18.5H19V21H6.2A2.2 2.2 0 0 1 4 20.7Z"/>',
    play:'<path d="M7.5 4.8 19 12 7.5 19.2Z"/>',
    pause:'<rect x="7" y="4.5" width="3.6" height="15" rx="1.2"/><rect x="13.4" y="4.5" width="3.6" height="15" rx="1.2"/>',
    stop:'<rect x="6" y="6" width="12" height="12" rx="2.4"/>',
    reset:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4.2v4.6h4.6"/>',
    up:'<path d="M5 15l7-7 7 7"/>',
    down:'<path d="M5 9l7 7 7-7"/>',
    dl:'<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15"/>',
    ul:'<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M4.5 19.5h15"/>',
    clock:'<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.4 2"/>',
    layers:'<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="M3 13.2 12 18l9-4.8M3 17.4 12 22l9-4.6"/>',
    chart:'<path d="M4 19.5V13M9.5 19.5V6.5M15 19.5v-9M20.5 19.5V9"/>',
    gear:'<circle cx="12" cy="12" r="3.2"/><path d="M19.6 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3.4a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3.4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1.1Z"/>',
    edit:'<path d="M16.5 3.9a2.3 2.3 0 0 1 3.3 3.3L7.5 19.5 3 21l1.5-4.5Z"/>',
    info:'<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.8v.1"/>',
    award:'<circle cx="12" cy="9" r="5.5"/><path d="M8.2 13.4 7 21.5l5-2.6 5 2.6-1.2-8.1"/>',
    empty:'<rect x="3.5" y="5" width="17" height="14.5" rx="3"/><path d="M8 10h8M8 14h5"/>'
  };
  return `<svg class="svgi" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${P[n]||""}</svg>`;
};

/* ============================================================
   PACE ENGINE
   ============================================================ */
function engine(){
  const st=S.settings, ex=st.examDate;
  const t=today();

  const totalQ=st.uwTotal||UW_TOTAL;
  const totalP=st.faTotal||FA_TOTAL;

  // completed
  const doneQ=(st.uwStart||0)+Object.values(S.qlogs).reduce((a,d)=>a+(+d.q||0),0);
  const doneP=(st.faStart||0)+Object.values(S.qlogs).reduce((a,d)=>a+(+d.pages||0),0);

  const out={
    ready:!!ex, exam:ex, today:t,
    totalQ, totalP, doneQ:Math.min(doneQ,totalQ), doneP:Math.min(doneP,totalP),
    rawQ:doneQ, rawP:doneP,
    remQ:Math.max(0,totalQ-doneQ), remP:Math.max(0,totalP-doneP),
    pctQ: totalQ?clamp(doneQ/totalQ*100,0,100):0,
    pctP: totalP?clamp(doneP/totalP*100,0,100):0
  };
  if(!ex) return out;

  const deadline=addD(ex,-BUFFER_DAYS);      // must finish FA+UWorld here
  const start=firstActive();                  // when tracking effectively began
  const totalDays=Math.max(1,diffD(start,deadline));
  const elapsed=clamp(diffD(start,t),0,totalDays);
  const left=Math.max(0,diffD(t,deadline));   // days remaining incl today? -> exclusive
  const leftIncl=left+1;

  // where you SHOULD be today (linear pace from start baseline)
  const baseQ=S.settings.uwStart||0, baseP=S.settings.faStart||0;
  const shouldQ=clamp(baseQ+(totalQ-baseQ)*(elapsed/totalDays),0,totalQ);
  const shouldP=clamp(baseP+(totalP-baseP)*(elapsed/totalDays),0,totalP);

  // required daily rate to still finish on time
  const needQ = leftIncl>0 ? Math.ceil(out.remQ/leftIncl) : out.remQ;
  const needP = leftIncl>0 ? Math.ceil(out.remP/leftIncl) : out.remP;

  // target within 30-60 band, avg 40 — but honour the true requirement
  const bandQ = clamp(needQ, st.minQ||30, st.maxQ||60);
  const goalQ = needQ>(st.maxQ||60) ? needQ : bandQ;   // if behind, show real need

  Object.assign(out,{
    deadline, start, totalDays, elapsed,
    daysToDeadline:left, daysToExam:Math.max(0,diffD(t,ex)),
    shouldQ, shouldP,
    deltaQ:Math.round(doneQ-shouldQ), deltaP:Math.round(doneP-shouldP),
    pacePctQ: totalQ?clamp(shouldQ/totalQ*100,0,100):0,
    pacePctP: totalP?clamp(shouldP/totalP*100,0,100):0,
    needQ, needP, goalQ,
    goalPages: Math.max(1,needP),
    overdue: left<=0,
    daysBehindQ: goalQ>0 ? Math.round((shouldQ-doneQ)/Math.max(1,(totalQ-baseQ)/totalDays)) : 0
  });
  return out;
}

function firstActive(){
  // Filter for activity occurring on or after PHASE_START (August 1, 2026)
  const activeKeys = [...new Set([...Object.keys(S.qlogs), ...Object.keys(S.hours)])].filter(k => {
    if (k < PHASE_START) return false; // Ignore pre-cutoff/earlier prep dates for official pace tracking baseline
    const d = S.qlogs[k], h = S.hours[k];
    return (d && ((+d.q||0) > 0 || (+d.pages||0) > 0)) || (h && (h.block || h.book || h.lecture));
  }).sort();

  // If there's activity during or after Phase Start, use the earliest of those dates
  if (activeKeys.length) return activeKeys[0];
  
  // Fallback: If no activity logged yet in August+, default to PHASE_START or today if before it
  const t = today();
  return t < PHASE_START ? PHASE_START : t;
}


/* ---------- PHASES ---------- */
function phases(){
  const ex=S.settings.examDate;
  if(!ex) return [];
  const m=parse(ex).getMonth(), y=parse(ex).getFullYear();
  const inWindow = (m>=9 && m<=11); // Oct–Dec
  const anchor = PHASE_START;
  const dl = addD(ex,-BUFFER_DAYS);
  const span = diffD(anchor, dl);
  if(span<=0) return [];

  if(!inWindow){
    // still give a sensible 3-part split
    const a=Math.round(span*.42), b=Math.round(span*.78);
    return build([
      ["Phase 1 · Build",    anchor, addD(anchor,a-1), "First Aid systems + UWorld tutor mode. Sketchy Micro daily, B&B for weak systems."],
      ["Phase 2 · Consolidate", addD(anchor,a), addD(anchor,b-1), "UWorld timed random blocks. Second pass on First Aid margins. NBME every 2–3 weeks."],
      ["Phase 3 · Peak",     addD(anchor,b), dl, "Finish UWorld + First Aid. Full-length NBMEs, incorrect-only review."]
    ], dl);
  }

  // Oct-end → Dec-end: four phases
  const a=Math.round(span*.30), b=Math.round(span*.56), c=Math.round(span*.80);
  return build([
    ["Phase 1 · Foundation", anchor, addD(anchor,a-1),
      "First Aid systems pass 1 with Boards & Beyond. Sketchy Micro block daily. UWorld tutor mode, subject-wise."],
    ["Phase 2 · Integration", addD(anchor,a), addD(anchor,b-1),
      "UWorld mixed timed blocks. First Aid annotation from incorrects. Sketchy Micro second run. First NBME baseline."],
    ["Phase 3 · Volume",     addD(anchor,b), addD(anchor,c-1),
      "High-volume UWorld random timed. First Aid rapid review pass 2. NBME every 10–14 days."],
    ["Phase 4 · Peak & Taper", addD(anchor,c), dl,
      "Complete UWorld + First Aid. Incorrects only, Free 120, Sketchy Micro flash pass. Taper into exam day."]
  ], dl);
}
function build(rows, dl){
  const t=today();
  return rows.map((r,i)=>{
    const [name,from,to,body]=r;
    const state = t<from ? "future" : (t>to ? "done" : "now");
    const days=diffD(from,to)+1;
    const gone=state==="done"?days:(state==="now"?diffD(from,t)+1:0);
    return {n:i+1,name,from,to,body,state,days,gone,pct:clamp(gone/days*100,0,100)};
  });
}
function earlierPrepTotals(){
  let q=0,p=0,sec=0,n=0;
  for(const [d,v] of Object.entries(S.qlogs)) if(d<PRE_CUTOFF){q+=+v.q||0;p+=+v.pages||0;n++;}
  for(const [d,v] of Object.entries(S.hours)) if(d<PRE_CUTOFF) sec+=(v.block||0)+(v.book||0)+(v.lecture||0);
  return {q,p,sec,n};
}

/* ---------- streak ---------- */
function streaks(){
  const e=engine();
  const goal=e.goalQ||40;
  let cur=0, best=0, run=0, hits=0;
  const days=Object.keys(S.qlogs).sort();
  if(days.length){
    const from=days[0], to=today();
    for(let d=from; d<=to; d=addD(d,1)){
      const q=+((S.qlogs[d]||{}).q||0);
      if(q>=goal){ run++; hits++; best=Math.max(best,run); } else if(d!==today()){ run=0; }
    }
    // current streak walks back from today
    let d=today();
    if(!((+((S.qlogs[d]||{}).q||0))>=goal)) d=addD(d,-1);
    while((+((S.qlogs[d]||{}).q||0))>=goal){ cur++; d=addD(d,-1); }
  }
  return {cur,best,hits,goal};
}
function hourStreak(){
  const goalSec=(S.settings.dailyHourGoal||6)*3600;
  let cur=0,best=0,run=0,hits=0;
  const days=Object.keys(S.hours).sort();
  if(days.length){
    for(let d=days[0]; d<=today(); d=addD(d,1)){
      const h=S.hours[d]||{}; const tot=(h.block||0)+(h.book||0)+(h.lecture||0);
      if(tot>=goalSec){run++;hits++;best=Math.max(best,run);} else if(d!==today()) run=0;
    }
    let d=today(); const g=x=>{const h=S.hours[x]||{};return (h.block||0)+(h.book||0)+(h.lecture||0);};
    if(g(d)<goalSec) d=addD(d,-1);
    while(g(d)>=goalSec){cur++;d=addD(d,-1);}
  }
  return {cur,best,hits,goalSec};
}

/* ---------- misc ---------- */
function lastNDays(n){ const a=[]; for(let i=n-1;i>=0;i--) a.push(addD(today(),-i)); return a; }
function dayHours(d){ const h=S.hours[d]||{}; return (h.block||0)+(h.book||0)+(h.lecture||0); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

function toast(msg,kind){
  const el=document.getElementById("toast");
  const ic = kind==="bad"?I("info",{s:16,c:"var(--rose)"}):kind==="info"?I("info",{s:16,c:"var(--indigo-2)"}):I("check",{s:16,c:"var(--teal-2)"});
  el.innerHTML=ic+"<span>"+msg+"</span>";
  el.classList.add("on");
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove("on"),2400);
}

/* ============================================================
   CHARTS — smooth curved line + opacity area, bold pace line
   ============================================================ */
function smoothPath(pts){
  if(pts.length<2) return pts.length?`M${pts[0].x},${pts[0].y}`:"";
  let d=`M${pts[0].x},${pts[0].y}`;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
    const t=0.22;
    const c1x=p1.x+(p2.x-p0.x)*t, c1y=p1.y+(p2.y-p0.y)*t;
    const c2x=p2.x-(p3.x-p1.x)*t, c2y=p2.y-(p3.y-p1.y)*t;
    d+=` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

/* series: [{data:[n], color, fill:bool, bold:bool, dash:bool, name}] */
function lineChart(series, labels, opt={}){
  const W=680, H=opt.h||230, L=opt.left||40, R=14, T=16, B=30;
  const iw=W-L-R, ih=H-T-B;
  const all=series.flatMap(s=>s.data).filter(v=>v!=null&&isFinite(v));
  let max=opt.max!=null?opt.max:Math.max(1,...all);
  let min=opt.min!=null?opt.min:0;
  if(max===min) max=min+1;
  max=max*1.12;
  const n=labels.length;
  const X=i=> n<2 ? L+iw/2 : L+(i/(n-1))*iw;
  const Y=v=> T+ih-((v-min)/(max-min))*ih;

  const uidn="g"+Math.random().toString(36).slice(2,7);
  let g="";

  // grid
  const steps=4;
  for(let i=0;i<=steps;i++){
    const v=min+(max-min)*i/steps, y=Y(v);
    g+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="var(--grid)" stroke-width="1"/>`;
    g+=`<text x="${L-8}" y="${(y+3.5).toFixed(1)}" fill="var(--text-3)" font-size="10" text-anchor="end" font-family="var(--f-body)">${opt.fmtY?opt.fmtY(v):Math.round(v)}</text>`;
  }
  // defs
  let defs="";
  series.forEach((s,si)=>{
    if(s.fill) defs+=`<linearGradient id="${uidn}${si}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${s.color}" stop-opacity="0.36"/>
      <stop offset="60%" stop-color="${s.color}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`;
  });

  series.forEach((s,si)=>{
    const pts=s.data.map((v,i)=>v==null?null:({x:X(i),y:Y(v)})).filter(Boolean);
    if(!pts.length) return;
    const path=smoothPath(pts);
    if(s.fill){
      const area=`${path} L${pts[pts.length-1].x},${T+ih} L${pts[0].x},${T+ih} Z`;
      g+=`<path d="${area}" fill="url(#${uidn}${si})"/>`;
    }
    g+=`<path d="${path}" fill="none" stroke="${s.color}" stroke-width="${s.bold?3.6:2.4}"
        stroke-linecap="round" stroke-linejoin="round" ${s.dash?'stroke-dasharray="1 7" stroke-linecap="round"':''}
        opacity="${s.faint?0.85:1}"/>`;
    if(!s.dash && !s.bold && pts.length<=32){
      const last=pts[pts.length-1];
      g+=`<circle cx="${last.x}" cy="${last.y}" r="4.2" fill="${s.color}" stroke="var(--bg)" stroke-width="2.2"/>`;
    }
  });

  // x labels (max 7)
  const every=Math.max(1,Math.ceil(n/6));
  labels.forEach((lb,i)=>{
    if(i%every!==0 && i!==n-1) return;
    g+=`<text x="${X(i).toFixed(1)}" y="${H-9}" fill="var(--text-3)" font-size="9.5" text-anchor="middle" font-family="var(--f-body)">${lb}</text>`;
  });

  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs>${defs}</defs>${g}</svg></div>`;
}

function barChart(values, labels, colors, opt={}){
  const W=680,H=opt.h||200,L=38,R=12,T=14,B=28;
  const iw=W-L-R, ih=H-T-B;
  let max=Math.max(1,...values,opt.goal||0)*1.15;
  const bw=Math.min(34, iw/values.length*0.62);
  let g="";
  for(let i=0;i<=3;i++){const y=T+ih-ih*i/3;
    g+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="var(--grid)" stroke-width="1"/>`;
    g+=`<text x="${L-7}" y="${y+3.5}" fill="var(--text-3)" font-size="10" text-anchor="end">${opt.fmtY?opt.fmtY(max*i/3):Math.round(max*i/3)}</text>`;}
  values.forEach((v,i)=>{
    const x=L+(i+0.5)*(iw/values.length)-bw/2;
    const h=Math.max(2,(v/max)*ih), y=T+ih-h;
    g+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(7,bw/2)}" fill="${colors[i]}" opacity="0.92"/>`;
    g+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-9}" fill="var(--text-3)" font-size="9.5" text-anchor="middle">${labels[i]}</text>`;
  });
  if(opt.goal){const y=T+ih-(opt.goal/max)*ih;
    g+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="var(--text)" stroke-width="2.6" stroke-dasharray="6 5" opacity=".75"/>`;}
  return `<div class="chart" style="height:${H}px"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${g}</svg></div>`;
}

/* ============================================================
   PROGRESS BAR with vertical pace line
   ============================================================ */
function progressBar(title, done, total, pacePct, grad, sub){
  const pct=total?clamp(done/total*100,0,100):0;
  const behind = pct < pacePct-0.4;
  return `<div class="pwrap">
    <div class="prow">
      <div class="t">${title}</div>
      <div class="n">${Math.round(done).toLocaleString()} / ${total.toLocaleString()} · <b style="color:var(--text)">${pct.toFixed(1)}%</b></div>
    </div>
    <div class="track">
      <div class="fill" style="width:${pct}%;background:${grad}"></div>
      ${pacePct!=null?`<div class="pace" data-l="PACE" style="left:calc(${clamp(pacePct,0,100)}% - 1.5px)"></div>`:""}
    </div>
    <div class="plegend">
      <span><i style="background:${grad}"></i>Completed</span>
      <span><i style="background:var(--text)"></i>Required pace today</span>
      ${sub?`<span style="margin-left:auto;color:${behind?'var(--rose)':'var(--teal-2)'};font-weight:700">${sub}</span>`:""}
    </div>
  </div>`;
}

/* ============================================================
   PAGE · HOME
   ============================================================ */
function renderHome(){
  const e=engine(), st=streaks();
  const el=document.getElementById("p-home");

  if(!e.ready){
    el.innerHTML=`<div class="card" style="text-align:center;padding:40px 24px">
      <div style="width:64px;height:64px;border-radius:20px;margin:0 auto 18px;display:grid;place-items:center;
        background:linear-gradient(140deg,var(--indigo),var(--teal))">${I("target",{s:30,c:"#fff",w:2})}</div>
      <h2 style="font-family:var(--f-display);font-size:20px;margin:0 0 8px;letter-spacing:-.02em">Set your exam date</h2>
      <p style="color:var(--text-2);font-size:13.5px;margin:0 0 22px;line-height:1.6">
        Everything — pace, phases, daily targets, streaks — is calculated backwards from your Step 1 date,
        finishing First Aid and UWorld <b style="color:var(--text)">${BUFFER_DAYS} days before</b> it.</p>
      <button class="btn pri" onclick="go('plan')">${I("plan",{s:17,c:"#fff"})} Open Plan</button>
    </div>`;
    return;
  }

  const t=today();
  const tq=+((S.qlogs[t]||{}).q||0), tp=+((S.qlogs[t]||{}).pages||0);
  const th=dayHours(t);
  const st2=hourStreak();
  const statusQ = e.deltaQ>=0 ? "good":"bad";
  const days5=lastNDays(5);

  // 14-day pace chart data
  // Generate a full span from your start date to your exam date
const spanDays = [];
const chartLabels = [];
const totalSpan = diffD(e.start, e.exam);

for(let i = 0; i <= totalSpan; i++) {
    const d = addD(e.start, i);
    spanDays.push(d);
    chartLabels.push(fmtShort(d)); // Generates the short date labels
}

let cum = (S.settings.uwStart || 0);
// Count any activity before the official 'start' date to keep the baseline accurate
const before = Object.entries(S.qlogs).filter(([k]) => k < e.start).reduce((a, [, v]) => a + (+v.q || 0), 0);
cum += before;

const actual = [], target = [];
const perDay = (e.totalQ - (S.settings.uwStart || 0)) / e.totalDays;

spanDays.forEach(d => {
    // Only plot 'actual' data up to today so the line stops cleanly
    if (d <= e.today) {
        cum += +((S.qlogs[d] || {}).q || 0);
        actual.push(cum);
    } else {
        actual.push(null); 
    }
    
    // The target line always extends to the exam date
    const el2 = clamp(diffD(e.start, d), 0, e.totalDays);
    target.push((S.settings.uwStart || 0) + perDay * el2);
});


   const nbmeLast=[...S.nbme].sort((a,b)=>b.date.localeCompare(a.date))[0];

  el.innerHTML=`
  <!-- HERO -->
  <div class="card" style="background:linear-gradient(150deg,color-mix(in srgb,var(--indigo) 20%,var(--surface)),color-mix(in srgb,var(--teal) 10%,var(--surface)));border-color:color-mix(in srgb,var(--indigo) 26%,transparent)">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div style="min-width:0">
        <p class="eyebrow mb0" style="margin-bottom:6px">${e.overdue?"Buffer window":"Days to exam"}</p>
        <div class="bignum" style="font-size:clamp(38px,11vw,54px)">
          ${e.daysToExam}<small style="font-size:16px;font-weight:600;color:var(--text-2);letter-spacing:0;margin-left:6px">days</small>
        </div>
        <div style="font-size:12px;color:var(--text-2);margin-top:7px">${fmtD(e.exam)} · ${DOW[parse(e.exam).getDay()]}</div>
      </div>
      <div style="text-align:right;min-width:0">
        <span class="pill ${statusQ}">${e.deltaQ>=0?I("up",{s:12}):I("down",{s:12})} ${e.deltaQ>=0?"+":""}${e.deltaQ} Q vs pace</span>
        <div style="margin-top:11px;font-size:11px;color:var(--text-2);line-height:1.6">
          Finish by <b style="color:var(--text)">${fmtShort(e.deadline)}</b><br>
          ${e.daysToDeadline} days of active prep left
        </div>
      </div>
    </div>
  </div>

  <!-- TODAY TARGET -->
  <div class="card">
    <div class="card-h"><h3>${I("target",{s:17,c:"var(--teal-2)"})} Today's target</h3>
      <span class="sub">${dowShort(t)} · ${fmtShort(t)}</span></div>
    <div class="grid g3">
      <div class="stat accent">
        <div class="lab">${I("zap",{s:12})} UWorld</div>
        <div class="val">${tq}<small> / ${e.goalQ}</small></div>
        <div class="note">${tq>=e.goalQ?"Goal reached":`${e.goalQ-tq} to go`}</div>
      </div>
      <div class="stat">
        <div class="lab">${I("book",{s:12})} First Aid</div>
        <div class="val">${tp}<small> / ${e.goalPages}</small></div>
        <div class="note">pages today</div>
      </div>
      <div class="stat">
        <div class="lab">${I("clock",{s:12})} Studied</div>
        <div class="val">${hLabel(th)}</div>
        <div class="note">goal ${S.settings.dailyHourGoal}h</div>
      </div>
    </div>
    <div class="btnrow" style="margin-top:14px">
      <button class="btn pri" onclick="quickLog()">${I("plus",{s:16,c:"#fff"})} Log today</button>
      <button class="btn sec" onclick="go('watch')">${I("watch",{s:16})} Start timer</button>
    </div>
  </div>

  <!-- PROGRESS -->
  <div class="card">
    <div class="card-h"><h3>${I("chart",{s:17,c:"var(--indigo-2)"})} Progress vs pace</h3>
      <span class="sub">target ${fmtShort(e.deadline)}</span></div>
    ${progressBar(`${I("zap",{s:13,c:"var(--teal-2)"})} UWorld`, e.doneQ, e.totalQ, e.pacePctQ,
      "linear-gradient(90deg,var(--teal),var(--teal-2))",
      e.deltaQ>=0?`${e.deltaQ} ahead`:`${Math.abs(e.deltaQ)} behind`)}
    <div style="height:20px"></div>
    ${progressBar(`${I("book",{s:13,c:"var(--coral)"})} First Aid 2025`, e.doneP, e.totalP, e.pacePctP,
      "linear-gradient(90deg,var(--coral),var(--amber))",
      e.deltaP>=0?`${e.deltaP} pages ahead`:`${Math.abs(e.deltaP)} pages behind`)}
  </div>

  <!-- LAST 5 DAYS -->
  <div class="card">
    <div class="card-h"><h3>${I("layers",{s:17,c:"var(--violet)"})} Last 5 days</h3>
      <span class="sub">goal ${e.goalQ} Q/day</span></div>
    <div class="d5">
      ${days5.map(d=>{
        const q=+((S.qlogs[d]||{}).q||0);
        const ratio=e.goalQ? q/e.goalQ : 0;
        const p=clamp(ratio*100,0,100);
        const over = ratio>=1.15, hit = ratio>=1, part = q>0 && ratio<1;
        const col = over ? "linear-gradient(90deg,var(--indigo),var(--violet))"
                  : hit  ? "linear-gradient(90deg,var(--teal),var(--teal-2))"
                  : part ? "linear-gradient(90deg,var(--amber),var(--coral-2))"
                  : "var(--stroke-2)";
        const txt = over ? "var(--violet)" : hit ? "var(--teal-2)" : part ? "var(--amber)" : "var(--text-3)";
        const pct = e.goalQ ? Math.round(ratio*100) : 0;
        return `<div class="c">
          <div class="dd">${dowShort(d)}<br><span style="opacity:.7;font-weight:600">${parse(d).getDate()} ${MON[parse(d).getMonth()]}</span></div>
          <div class="bar ${over?"over":""}"><span style="width:${p}%;background:${col}"></span></div>
          <div class="qq" style="color:${txt}">${q}</div>
          <div class="pct" style="color:${txt};opacity:.85">${q?pct+"%":"—"}</div>
        </div>`;
      }).join("")}
    </div>
    <div class="plegend" style="margin-top:14px">
      <span><i style="background:linear-gradient(90deg,var(--indigo),var(--violet))"></i>Beat goal</span>
      <span><i style="background:linear-gradient(90deg,var(--teal),var(--teal-2))"></i>Goal met</span>
      <span><i style="background:linear-gradient(90deg,var(--amber),var(--coral-2))"></i>Under goal</span>
      <span><i style="background:var(--stroke-2)"></i>No log</span>
    </div>
    ${(()=>{const hits=days5.filter(d=>(+((S.qlogs[d]||{}).q||0))>=e.goalQ).length;
      const tot=days5.reduce((a,d)=>a+(+((S.qlogs[d]||{}).q||0)),0);
      return `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--stroke);
        display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12px">
        <span style="color:var(--text-2)">Goal reached <b style="color:${hits>=3?'var(--teal-2)':'var(--amber)'}">${hits} of 5</b> days</span>
        <span style="color:var(--text-2)">${tot} questions · avg <b style="color:var(--text)">${Math.round(tot/5)}</b>/day</span>
      </div>`})()}
  </div>

  <!-- INSIGHTS -->
  ${(()=>{const ins=insights();return ins.length?`
  <div class="card">
    <div class="card-h"><h3>${I("zap",{s:17,c:"var(--amber)"})} What the numbers say</h3></div>
    ${ins.map(x=>`<div class="insight">
      <div class="ic" style="background:color-mix(in srgb,${x.col} 18%,transparent)">${I(x.ic,{s:16,c:x.col})}</div>
      <div class="tx"><div class="tt">${x.tt}</div><div class="bd">${x.bd}</div></div>
    </div>`).join("")}
  </div>`:""})()}

  <!-- WEEK -->
  ${(()=>{const w=weekSummary();return `
  <div class="card">
    <div class="card-h"><h3>${I("layers",{s:17,c:"var(--indigo-2)"})} This week</h3>
      <span class="sub">${w.active} of 7 days active</span></div>
    <div class="grid g3">
      <div class="stat"><div class="lab">${I("zap",{s:12})} Questions</div>
        <div class="val">${w.q}</div>
        <div class="note" style="color:${w.dq>=0?'var(--teal-2)':'var(--amber)'}">${w.dq>=0?"+":""}${w.dq} vs last week</div></div>
      <div class="stat"><div class="lab">${I("book",{s:12})} Pages</div>
        <div class="val">${w.p}</div><div class="note">First Aid</div></div>
      <div class="stat"><div class="lab">${I("clock",{s:12})} Hours</div>
        <div class="val">${(w.h/3600).toFixed(1)}</div>
        <div class="note" style="color:${w.dh>=0?'var(--teal-2)':'var(--amber)'}">${w.dh>=0?"+":""}${(w.dh/3600).toFixed(1)}h vs last</div></div>
    </div>
  </div>`})()}

  <!-- CHART -->
  <div class="card">
    <div class="card-h"><h3>${I("chart",{s:17,c:"var(--teal-2)"})} UWorld · Full Timeline</h3>
      <span class="sub">cumulative vs required</span></div>
    ${lineChart([
      {data:target,color:"var(--text-2)",bold:true,dash:false,faint:true,name:"pace"},
      {data:actual,color:"#12B5A4",fill:true,name:"you"}
    ], chartLabels, {h:220})}

    <div class="legend">
      <span><i style="background:#12B5A4"></i>Your cumulative questions</span>
      <span><i style="background:var(--text-2);height:3.6px"></i>Required pace line</span>
    </div>
  </div>

  <!-- STREAK + NBME -->
  <div class="grid g2 stackxs" style="align-items:stretch">
    <div class="card tight" style="margin:0">
      <div class="card-h" style="margin-bottom:12px"><h3>${I("flame",{s:16,c:"var(--coral)"})} Streak</h3></div>
      <div class="flame">
        <div class="big">${st.cur}</div>
        <div style="min-width:0">
          <div style="font-size:11px;color:var(--text-2);line-height:1.7">
            Best ${st.best} · ${st.hits} goal days<br>
            <span style="color:var(--text-3)">${st.goal} Q/day threshold</span>
          </div>
        </div>
      </div>
      <div class="dots" style="margin-top:14px">
        ${lastNDays(21).map(d=>{
          const q=+((S.qlogs[d]||{}).q||0);
          const c=q>=st.goal?"hit":q>0?"part":"";
          return `<span class="${c}${d===today()?" today":""}"></span>`;
        }).join("")}
      </div>
    </div>
    <div class="card tight" style="margin:0">
      <div class="card-h" style="margin-bottom:12px"><h3>${I("award",{s:16,c:"var(--amber)"})} NBME</h3>
        <span class="sub">${S.nbme.length} taken</span></div>
      ${nbmeLast?`
        <div class="bignum" style="font-size:32px">
          ${nbmeLast.score}<small style="font-size:13px;color:var(--text-3);font-weight:600"> /300</small></div>
        <div style="font-size:11.5px;color:var(--text-2);margin-top:6px">${nbmeLast.name} · ${fmtShort(nbmeLast.date)}</div>
        <div style="margin-top:10px">${nbmeAvgPill()}</div>
      `:`<div style="color:var(--text-3);font-size:12.5px;padding:12px 0">No assessment logged yet.</div>`}
      <button class="btn sec full" style="margin-top:14px" onclick="go('nbme')">${I("plus",{s:15})} Add assessment</button>
    </div>
  </div>

  <!-- HEATMAP -->
  ${(()=>{const hm=heatmap(),c=consistency();
    const cols=["rgba(255,255,255,.10)","color-mix(in srgb,var(--teal) 25%,transparent)",
      "color-mix(in srgb,var(--teal) 50%,transparent)","var(--teal)","var(--teal-2)"];
    return `
  <div class="card">
    <div class="card-h"><h3>${I("layers",{s:17,c:"var(--teal-2)"})} Last 35 days</h3>
      <span class="sub">consistency ${c.score}/100</span></div>
    <div class="heat">
      ${hm.map(x=>`<span title="${x.d}: ${x.q} Q" style="background:${cols[x.lvl]};${x.d===today()?"box-shadow:0 0 0 2px var(--indigo)":""}"></span>`).join("")}
    </div>
    <div class="heatlegend">
      <span>Less</span>${cols.map(c2=>`<i style="background:${c2}"></i>`).join("")}<span>More</span>
      <span style="margin-left:auto">${c.met} goal days · ${c.logged} logged</span>
    </div>
  </div>`})()}

  <!-- UWORLD ASSESSMENTS -->
  <div class="card">
    <div class="card-h"><h3>${I("layers",{s:17,c:"var(--indigo-2)"})} UWorld self-assessments</h3>
      <span class="sub">${S.nbme.filter(x=>x.type==="UWSA").length} of ${UW_ASSESS} used</span></div>
    <div class="d5" style="grid-template-columns:repeat(3,1fr)">
      ${[1,2,3].map(i=>{
        const a=S.nbme.find(x=>x.type==="UWSA" && x.name.includes(String(i)));
        return `<div class="stat" style="min-height:82px">
          <div class="lab">UWSA ${i}</div>
          <div class="val" style="font-size:22px;color:${a?'var(--text)':'var(--text-3)'}">${a?a.score:"—"}</div>
          <div class="note">${a?fmtShort(a.date):"not taken"}</div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

function nbmeAvgPill(){
  const s=S.nbme.filter(x=>x.score);
  if(s.length<2) return "";
  const avg=s.reduce((a,b)=>a+ +b.score,0)/s.length;
  const last=[...s].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const d=+last.score-avg;
  return `<span class="pill ${d>=0?'good':'warn'}">${d>=0?"+":""}${d.toFixed(0)} vs your avg ${avg.toFixed(0)}</span>`;
}

/* ============================================================
   PAGE · LOG
   ============================================================ */
let logMonth = today().slice(0,7);
function renderLog(){
  const e=engine();
  const el=document.getElementById("p-log");
  const t=today();
  const cur = {q:"", correct:"", pages:"", faTopic:"", uwTopic:""};
const entries = [...(S.studyLogs||[])].sort((a,b)=>b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

const tot = entries.reduce((a,v)=>({
  q:a.q+(+v.q||0), p:a.p+(+v.pages||0), c:a.c+(+v.correct||0), cd:a.cd+(v.correct!=null?(+v.q||0):0)
}), {q:0,p:0,c:0,cd:0});
const acc = tot.cd ? (tot.c/tot.cd*100) : null;

const faOpts = `<option value="">-- First Aid Topic --</option>` + FA_TOPICS.map(x=>`<option value="${x}">${x}</option>`).join("");
const uwOpts = `<option value="">-- UWorld Topic --</option>` + UW_TOPICS.map(x=>`<option value="${x}">${x}</option>`).join("");


  el.innerHTML=`
  <div class="card">
    <div class="card-h"><h3>${I("edit",{s:17,c:"var(--teal-2)"})} Log today</h3>
      <span class="sub">${DOW[parse(t).getDay()]} · ${fmtD(t)}</span></div>
    <div class="grid g2" style="gap:12px">
      <div class="field">
        <label class="fl">UWorld questions</label>
        <input class="inp" type="number" inputmode="numeric" id="lq" min="0" max="500" value="${cur.q||""}" placeholder="0">
      </div>
      <div class="field">
        <label class="fl">Correct</label>
        <input class="inp" type="number" inputmode="numeric" id="lc" min="0" max="500" value="${cur.correct??""}" placeholder="optional">
      </div>
      <div class="field">
        <label class="fl">First Aid pages</label>
        <input class="inp" type="number" inputmode="numeric" id="lp" min="0" max="300" value="${cur.pages||""}" placeholder="0">
      </div>
      <div class="field">
        <label class="fl">Date</label>
        <input class="inp" type="date" id="ld" value="${t}">
      </div>
    </div>
    <div class="field" style="margin-top:12px">
      <label class="fl">Note (topic / system)</label>
      <input class="inp" id="ln" value="${(cur.note||"").replace(/"/g,"&quot;")}" placeholder="e.g. Cardio pharm, Sketchy Micro gram+">
    </div>
    <div class="chips" style="margin-top:14px">
      ${[20,40,e.goalQ||40,80].filter((v,i,a)=>a.indexOf(v)===i).map(v=>
        `<button class="chip" onclick="bump(${v})">${I("plus",{s:13})} ${v} Q</button>`).join("")}
      <button class="chip" onclick="bumpPage(10)">${I("book",{s:13})} +10 pages</button>
    </div>
    <div class="btnrow" style="margin-top:14px">
      <button class="btn pri" onclick="saveLog()">${I("check",{s:16,c:"#fff"})} Save entry</button>
    </div>
    <p class="hint">Entries are keyed by date — saving the same date again replaces it, so you can correct a number any time.</p>
  </div>

  <div class="grid g4">
    <div class="stat"><div class="lab">${I("zap",{s:12})} Total Q</div><div class="val">${tot.q.toLocaleString()}</div><div class="note">logged here</div></div>
    <div class="stat"><div class="lab">${I("book",{s:12})} Pages</div><div class="val">${tot.p.toLocaleString()}</div><div class="note">First Aid</div></div>
    <div class="stat"><div class="lab">${I("target",{s:12})} Accuracy</div><div class="val">${acc!=null?acc.toFixed(0)+"%":"—"}</div><div class="note">${tot.cd?tot.cd+" scored":"add correct"}</div></div>
    <div class="stat"><div class="lab">${I("log",{s:12})} Days</div><div class="val">${entries.length}</div><div class="note">with activity</div></div>
  </div>

  ${(()=>{const ss=subjectStats();return ss.length?`
  <div class="card">
    <div class="card-h"><h3>${I("target",{s:17,c:"var(--coral)"})} By system</h3>
      <span class="sub">detected from your notes</span></div>
    ${ss.slice(0,10).map(s=>{
      const acc=s.acc;
      const col=acc==null?"var(--text-3)":acc>=75?"var(--teal-2)":acc>=65?"var(--amber)":"var(--rose)";
      return `<div class="subj">
        <span class="nm">${s.name}</span>
        <span class="tr"><span style="width:${acc!=null?clamp(acc,0,100):0}%;background:${col}"></span></span>
        <span class="pc" style="color:${col}">${acc!=null?acc.toFixed(0)+"%":"—"}</span>
      </div>`;}).join("")}
    <p class="hint">Type a system name in the note field (e.g. "Cardio", "Micro", "Renal") and it's tracked here automatically. Accuracy needs the Correct field filled in.</p>
  </div>`:`
  <div class="card tight">
    <div class="card-h"><h3>${I("target",{s:16,c:"var(--coral)"})} By system</h3></div>
    <p class="hint" style="margin:0">Mention a system in your note — Cardio, Renal, Neuro, Micro, Pharm — and per-system accuracy appears here.</p>
  </div>`})()}

  <div class="card">
    <div class="card-h"><h3>${I("log",{s:17,c:"var(--indigo-2)"})} History</h3>
      <span class="sub">${entries.length} entries · never deleted on close</span></div>
    <div class="rows">
          ${entries.length? entries.map((v)=>{
        const d = v.date;
        const goal=e.goalQ||40, q=+v.q||0;
        const col=q>=goal?"var(--teal-2)":q>0?"var(--amber)":"var(--text-3)";
        const a=(v.correct!=null&&v.correct!=="")&&q? Math.round(v.correct/q*100):null;
        const pre = d<PRE_CUTOFF;

        return `<div class="row">
          <span class="dot" style="background:${col}"></span>
          <div class="main">
            <div class="a">${fmtD(d)} · ${dowShort(d)} ${pre?'<span class="pill info" style="margin-left:6px;font-size:9px;padding:2px 7px">EARLIER PREP</span>':''}</div>
            <div class="b">${v.pages?`${v.pages} FA pages `:""}${a!=null?` · ${a}% correct `:""}
               ${v.uwTopic ? `<br><span style="color:var(--teal-2)">UW:</span> ${v.uwTopic}` : ''}
               ${v.faTopic ? `<br><span style="color:var(--coral)">FA:</span> ${v.faTopic}` : ''}
            </div>
          </div>
          <div class="end">
            <div class="v" style="color:${col}">${q}<span style="font-size:9.5px;color:var(--text-3);font-weight:600"> Q</span></div>
            <button class="x" onclick="delLog('${v.id}')" aria-label="Delete">${I("trash",{s:14,c:"var(--text-3)"})}</button>
          </div>
        </div>`;
      }).join(""):`<div class="empty">${I("empty",{s:36})}<div>No entries yet. Log your first block above.</div></div>`}

    </div>
  </div>`;
}
function bump(n){ const i=document.getElementById("lq"); i.value=(+i.value||0)+n; }
function bumpPage(n){ const i=document.getElementById("lp"); i.value=(+i.value||0)+n; }
function saveLog(){
  const d=document.getElementById("ld").value||today();
  const q=+document.getElementById("lq").value||0;
  const cRaw=document.getElementById("lc").value;
  const c=cRaw===""?null:+cRaw;
  const p=+document.getElementById("lp").value||0;
  const fa=document.getElementById("qfa").value;
  const uw=document.getElementById("quw").value;
  
  if(!q&&!p&&!fa&&!uw){ toast("Nothing to save", "bad"); return; }
  if(c!=null&&c>q){ toast("Correct can't exceed questions", "bad"); return; }

  const entry = { id: d+"-"+Date.now(), date: d, q: q, correct: c, pages: p, faTopic: fa, uwTopic: uw };
  S.studyLogs = S.studyLogs || [];
  S.studyLogs.push(entry);

  S.qlogs = {};
  S.studyLogs.forEach(log => {
    if(!S.qlogs[log.date]) S.qlogs[log.date] = { q:0, correct:null, pages:0, note:"" };
    S.qlogs[log.date].q += log.q;
    S.qlogs[log.date].pages += log.pages;
    if(log.correct != null) S.qlogs[log.date].correct = (S.qlogs[log.date].correct || 0) + log.correct;
    const notes = [log.faTopic, log.uwTopic].filter(Boolean).join(" / ");
    if(notes) S.qlogs[log.date].note = S.qlogs[log.date].note ? S.qlogs[log.date].note + " | " + notes : notes;
  });

  save(true); toast(`Saved ${fmtShort(d)} · ${q} Q`); renderAll();
}

function delLog(id){
  confirmSheet("Delete this entry?", "It will be removed from your history.", ()=>{
    S.studyLogs = S.studyLogs.filter(x => x.id !== id);
    
    S.qlogs = {};
    S.studyLogs.forEach(log => {
      if(!S.qlogs[log.date]) S.qlogs[log.date] = { q:0, correct:null, pages:0, note:"" };
      S.qlogs[log.date].q += log.q;
      S.qlogs[log.date].pages += log.pages;
      if(log.correct != null) S.qlogs[log.date].correct = (S.qlogs[log.date].correct || 0) + log.correct;
      const notes = [log.faTopic, log.uwTopic].filter(Boolean).join(" / ");
      if(notes) S.qlogs[log.date].note = S.qlogs[log.date].note ? S.qlogs[log.date].note + " | " + notes : notes;
    });
    
    save(true); toast("Entry removed"); renderAll();
  });
}


/* ============================================================
   PAGE · NBME
   ============================================================ */
function renderNbme(){
  const el=document.getElementById("p-nbme");
  const list=[...S.nbme].sort((a,b)=>b.date.localeCompare(a.date));
  const scored=list.filter(x=>+x.score);
  const avg=scored.length?scored.reduce((a,b)=>a+ +b.score,0)/scored.length:0;
  const best=scored.length?Math.max(...scored.map(x=>+x.score)):0;
  const chron=[...scored].sort((a,b)=>a.date.localeCompare(b.date));
  const trend=chron.length>=2?(+chron[chron.length-1].score - +chron[0].score):0;

  el.innerHTML=`
  <div class="card">
    <div class="card-h"><h3>${I("plus",{s:17,c:"var(--amber)"})} Add assessment</h3></div>
    <div class="grid g2" style="gap:12px">
      <div class="field">
        <label class="fl">Type</label>
        <select class="inp" id="nt" onchange="nbmeNamePrefill()">
          <option>NBME</option><option>UWSA</option><option>Free 120</option><option>CBSE</option>
        </select>
      </div>
      <div class="field">
        <label class="fl">Name / number</label>
        <input class="inp" id="nn" placeholder="e.g. NBME 31">
      </div>
      <div class="field">
        <label class="fl">Date taken</label>
        <input class="inp" type="date" id="nd" value="${today()}">
      </div>
      <div class="field">
        <label class="fl">Score (3-digit)</label>
        <input class="inp" type="number" inputmode="numeric" id="ns" min="0" max="300" placeholder="e.g. 232">
      </div>
      <div class="field">
        <label class="fl">% correct</label>
        <input class="inp" type="number" inputmode="numeric" id="np" min="0" max="100" placeholder="optional">
      </div>
      <div class="field">
        <label class="fl">Weak areas</label>
        <input class="inp" id="no" placeholder="optional">
      </div>
    </div>
    <button class="btn pri full" style="margin-top:14px" onclick="addNbme()">${I("check",{s:16,c:"#fff"})} Save assessment</button>
  </div>

  <div class="grid g4">
    <div class="stat accent"><div class="lab">${I("chart",{s:12})} Average</div><div class="val">${scored.length?avg.toFixed(0):"—"}</div><div class="note">${scored.length} scored</div></div>
    <div class="stat"><div class="lab">${I("award",{s:12})} Best</div><div class="val">${best||"—"}</div><div class="note">peak score</div></div>
    <div class="stat"><div class="lab">${I("up",{s:12})} Trend</div>
      <div class="val" style="color:${trend>=0?'var(--teal-2)':'var(--rose)'}">${chron.length>=2?(trend>=0?"+":"")+trend:"—"}</div>
      <div class="note">first → latest</div></div>
    <div class="stat"><div class="lab">${I("layers",{s:12})} Taken</div><div class="val">${list.length}</div><div class="note">${list.filter(x=>x.type==="UWSA").length}/${UW_ASSESS} UWSA</div></div>
  </div>

  ${chron.length>=2?`
  <div class="card">
    <div class="card-h"><h3>${I("chart",{s:17,c:"var(--amber)"})} Score trajectory</h3>
      <span class="sub">bold line = your average</span></div>
    ${lineChart([
      {data:chron.map(()=>avg),color:"var(--text-2)",bold:true,name:"avg"},
      {data:chron.map(x=>+x.score),color:"#F5A524",fill:true,name:"score"}
    ], chron.map(x=>fmtShort(x.date)),
      {h:230,min:Math.max(140,Math.min(...chron.map(x=>+x.score))-18),max:Math.max(...chron.map(x=>+x.score))+14})}
    <div class="legend">
      <span><i style="background:#F5A524"></i>Assessment score</span>
      <span><i style="background:var(--text-2);height:3.6px"></i>Your average (${avg.toFixed(0)})</span>
    </div>
  </div>`:""}

  <div class="card">
    <div class="card-h"><h3>${I("award",{s:17,c:"var(--violet)"})} All assessments</h3></div>
    <div class="rows">
      ${list.length?list.map(x=>{
        const d=+x.score-avg;
        const col=+x.score>=avg?"var(--teal-2)":"var(--amber)";
        return `<div class="row">
          <span class="dot" style="background:${col}"></span>
          <div class="main">
            <div class="a">${x.name||x.type}</div>
            <div class="b">${fmtD(x.date)}${x.percentCorrect?` · ${x.percentCorrect}% correct`:""}${x.note?` · ${x.note}`:""}</div>
          </div>
          <div class="end">
            <div style="text-align:right">
              <div class="v">${x.score||"—"}</div>
              ${scored.length>1?`<div style="font-size:9.5px;font-weight:700;color:${col}">${d>=0?"+":""}${d.toFixed(0)} vs avg</div>`:""}
            </div>
            <button class="x" onclick="delNbme('${x.id}')">${I("trash",{s:14,c:"var(--text-3)"})}</button>
          </div>
        </div>`;
      }).join(""):`<div class="empty">${I("empty",{s:36})}<div>No assessments yet.</div></div>`}
    </div>
  </div>`;
}
function nbmeNamePrefill(){
  const t=document.getElementById("nt").value, n=document.getElementById("nn");
  if(!n.value){ const c=S.nbme.filter(x=>x.type===t).length+1; n.value=`${t} ${c}`; }
}
function addNbme(){
  const type=document.getElementById("nt").value;
  const name=document.getElementById("nn").value.trim()||`${type} ${S.nbme.filter(x=>x.type===type).length+1}`;
  const date=document.getElementById("nd").value||today();
  const score=+document.getElementById("ns").value||0;
  const pc=+document.getElementById("np").value||0;
  const note=document.getElementById("no").value.trim();
  if(!score&&!pc){ toast("Add a score or % correct","bad"); return; }
  S.nbme.push({id:uid(),type,name,date,score,percentCorrect:pc,note});
  save(true); toast(`${name} saved`); renderAll();
}
function delNbme(id){
  confirmSheet("Delete assessment?","This removes it from your score history.",()=>{
    S.nbme=S.nbme.filter(x=>x.id!==id); save(true); toast("Removed"); renderAll();
  });
}

/* ============================================================
   PAGE · WATCH  (timer + stopwatch + hour graphs)
   ============================================================ */
const MODES={
  block:  {label:"UWorld block", color:"#12B5A4", icon:"zap",   def:40*60},
  book:   {label:"First Aid",    color:"#FF7A5C", icon:"book",  def:45*60},
  lecture:{label:"B&B / Sketchy",color:"#A855F7", icon:"layers",def:30*60}
};
let TM={mode:"block", kind:"timer", target:40*60, elapsed:0, running:false, t0:0, base:0, tick:null};

function renderWatch(){
  const el=document.getElementById("p-watch");
  const m=MODES[TM.mode];
  const t=today(), h=S.hours[t]||{};
  const totToday=(h.block||0)+(h.book||0)+(h.lecture||0);
  const hs=hourStreak();
  const goalSec=(S.settings.dailyHourGoal||6)*3600;

  const d14=lastNDays(14);
  const hrData=d14.map(d=>hrs(dayHours(d)));
  const goalLine=d14.map(()=>S.settings.dailyHourGoal||6);

  const d7=lastNDays(7);
  const stackB=d7.map(d=>hrs((S.hours[d]||{}).block||0));
  const stackR=d7.map(d=>hrs((S.hours[d]||{}).book||0));
  const stackL=d7.map(d=>hrs((S.hours[d]||{}).lecture||0));

  const recent=[...S.sessions].sort((a,b)=>b.id.localeCompare(a.id)).slice(0,25);

  const pct = TM.kind==="timer" ? clamp(TM.elapsed/Math.max(1,TM.target)*100,0,100)
                                : clamp((TM.elapsed%3600)/3600*100,0,100);
  const C=2*Math.PI*44;

  el.innerHTML=`
  <div class="card">
    <div class="card-h"><h3>${I("watch",{s:17,c:"var(--teal-2)"})} Study clock</h3>
      <span class="sub">${hLabel(totToday)} today</span></div>

    <div class="seg" style="margin-bottom:14px">
      <button class="${TM.kind==="timer"?"on":""}" onclick="setKind('timer')">Timer</button>
      <button class="${TM.kind==="stop"?"on":""}" onclick="setKind('stop')">Stopwatch</button>
    </div>
    
  <div class="card">
    <div class="card-h">
      <h3>${I("watch",{s:17,c:"var(--teal-2)"})} Study clock</h3>
      <button class="btn sec" style="padding:6px 12px;min-height:32px;font-size:12px;" onclick="openManualTimeSheet()">
        ${I("plus",{s:14})} Log Past Time
      </button>
      <span class="sub">${hLabel(totToday)} today</span>
    </div>


    <div class="chips" style="justify-content:center;margin-bottom:6px">
      ${Object.entries(MODES).map(([k,v])=>`
        <button class="chip ${TM.mode===k?"on":""}" ${TM.mode===k?`style="background:${v.color}"`:""} onclick="setMode('${k}')">
          ${I(v.icon,{s:14,c:TM.mode===k?"#fff":"currentColor"})} ${v.label}
        </button>`).join("")}
    </div>

    <div class="dial">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-3)" stroke-width="6"/>
        <circle cx="50" cy="50" r="44" fill="none" stroke="${m.color}" stroke-width="6" stroke-linecap="round"
          stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C*(1-pct/100)).toFixed(2)}"
          style="transition:stroke-dashoffset .4s linear;filter:drop-shadow(0 0 6px ${m.color}66)"/>
      </svg>
      <div class="mid">
        <div class="tl">${m.label}</div>
        <div class="tt" id="dialTime">${hms(TM.kind==="timer"?Math.max(0,TM.target-TM.elapsed):TM.elapsed)}</div>
        <div class="ts">${TM.kind==="timer"?`of ${hms(TM.target)}`:"counting up"}</div>
      </div>
    </div>

    ${TM.kind==="timer"?`
    <div class="chips" style="justify-content:center;margin-top:16px">
      ${[10,25,40,60,90].map(n=>`<button class="chip ${TM.target===n*60?"on":""}"
        ${TM.target===n*60?`style="background:${m.color}"`:""} onclick="setTarget(${n})">${n}m</button>`).join("")}
    </div>`:""}

    <div class="btnrow" style="margin-top:18px">
      <button class="btn ${TM.running?"sec":"pri"}" onclick="toggleRun()">
        ${TM.running?I("pause",{s:16})+" Pause":I("play",{s:16,c:"#fff"})+" Start"}</button>
      <button class="btn sec" onclick="finishRun()">${I("stop",{s:16})} Save session</button>
      <button class="btn sec" onclick="resetRun()">${I("reset",{s:16})} Reset</button>
    </div>
    <p class="hint">Saving adds the elapsed time to today's ${m.label.toLowerCase()} total and to your history.</p>
  </div>

  <div class="grid g4">
    <div class="stat accent"><div class="lab">${I("clock",{s:12})} Today</div><div class="val">${hLabel(totToday)}</div>
      <div class="note">goal ${S.settings.dailyHourGoal}h</div></div>
    <div class="stat"><div class="lab">${I("zap",{s:12})} Blocks</div><div class="val">${hLabel(h.block||0)}</div><div class="note">UWorld</div></div>
    <div class="stat"><div class="lab">${I("book",{s:12})} Reading</div><div class="val">${hLabel(h.book||0)}</div><div class="note">First Aid</div></div>
    <div class="stat"><div class="lab">${I("layers",{s:12})} Lectures</div><div class="val">${hLabel(h.lecture||0)}</div><div class="note">B&B · Sketchy</div></div>
  </div>

  <div class="card">
    <div class="card-h"><h3>${I("target",{s:17,c:"var(--coral)"})} Daily hour goal</h3>
      <span class="sub">${hs.hits} days met · streak ${hs.cur}</span></div>
    <div class="prow">
      <div class="t">${hLabel(totToday)} of ${S.settings.dailyHourGoal}h</div>
      <div class="n">${clamp(totToday/goalSec*100,0,100).toFixed(0)}%</div>
    </div>
    <div class="track">
      <div class="fill" style="width:${clamp(totToday/goalSec*100,0,100)}%;background:linear-gradient(90deg,var(--coral),var(--amber))"></div>
      <div class="pace" data-l="GOAL" style="left:calc(100% - 3px)"></div>
    </div>
    <div class="dots" style="margin-top:16px">
      ${lastNDays(21).map(d=>{
        const s=dayHours(d); const c=s>=goalSec?"hit":s>0?"part":"";
        return `<span class="${c}${d===today()?" today":""}"></span>`;}).join("")}
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap">
      <label class="fl" style="margin:0">Goal hours/day</label>
      <input class="inp" type="number" step="0.5" min="1" max="16" style="width:110px;min-height:42px"
        value="${S.settings.dailyHourGoal}" onchange="S.settings.dailyHourGoal=+this.value||6;save(true);renderAll()">
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h3>${I("chart",{s:17,c:"var(--teal-2)"})} Study hours · 14 days</h3>
      <span class="sub">curve vs goal</span></div>
    ${lineChart([
      {data:goalLine,color:"var(--text-2)",bold:true,name:"goal"},
      {data:hrData,color:"#5B6CFF",fill:true,name:"hours"}
    ], d14.map(d=>fmtShort(d)), {h:225,fmtY:v=>v.toFixed(1)+"h"})}
    <div class="legend">
      <span><i style="background:#5B6CFF"></i>Hours studied</span>
      <span><i style="background:var(--text-2);height:3.6px"></i>Daily goal (${S.settings.dailyHourGoal}h)</span>
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h3>${I("layers",{s:17,c:"var(--violet)"})} Split · last 7 days</h3></div>
    ${lineChart([
      {data:stackB,color:"#12B5A4",fill:true},
      {data:stackR,color:"#FF7A5C",fill:true},
      {data:stackL,color:"#A855F7",fill:true}
    ], d7.map(d=>dowShort(d)), {h:200,fmtY:v=>v.toFixed(1)+"h"})}
    <div class="legend">
      <span><i style="background:#12B5A4"></i>UWorld blocks</span>
      <span><i style="background:#FF7A5C"></i>First Aid</span>
      <span><i style="background:#A855F7"></i>B&B / Sketchy</span>
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h3>${I("clock",{s:17,c:"var(--indigo-2)"})} Session history</h3>
      <span class="sub">${S.sessions.length} sessions</span></div>
    <div class="rows">
      ${recent.length?recent.map(s=>`
        <div class="row">
          <span class="dot" style="background:${MODES[s.mode]?.color||"var(--text-3)"}"></span>
          <div class="main">
            <div class="a">${MODES[s.mode]?.label||s.mode}</div>
            <div class="b">${fmtD(s.date)} · ${s.label||""}</div>
          </div>
          <div class="end">
            <div class="v">${hLabel(s.sec)}</div>
            <button class="x" onclick="delSession('${s.id}')">${I("trash",{s:14,c:"var(--text-3)"})}</button>
          </div>
        </div>`).join(""):`<div class="empty">${I("empty",{s:36})}<div>No sessions saved yet.</div></div>`}
    </div>
  </div>`;
}

function setKind(k){ if(TM.running) return toast("Pause first","bad"); TM.kind=k; TM.elapsed=0; renderWatch(); }
function setMode(m){ TM.mode=m; if(!TM.running&&TM.kind==="timer") TM.target=MODES[m].def; renderWatch(); }
function setTarget(min){ if(TM.running) return toast("Pause first","bad"); TM.target=min*60; TM.elapsed=0; renderWatch(); }
function toggleRun(){
  if(TM.running){ TM.running=false; clearInterval(TM.tick); TM.tick=null; renderWatch(); }
  else{
    TM.running=true; TM.t0=Date.now(); TM.base=TM.elapsed;
    TM.tick=setInterval(()=>{
      TM.elapsed=TM.base+Math.floor((Date.now()-TM.t0)/1000);
      const d=document.getElementById("dialTime");
      if(d) d.textContent=hms(TM.kind==="timer"?Math.max(0,TM.target-TM.elapsed):TM.elapsed);
      const c=document.querySelector(".dial circle:nth-child(2)");
      if(c){ const C=2*Math.PI*44;
        const p=TM.kind==="timer"?clamp(TM.elapsed/Math.max(1,TM.target)*100,0,100):clamp((TM.elapsed%3600)/3600*100,0,100);
        c.setAttribute("stroke-dashoffset",(C*(1-p/100)).toFixed(2)); }
      if(TM.kind==="timer"&&TM.elapsed>=TM.target){ finishRun(true); }
    },250);
    renderWatch();
  }
}
function finishRun(auto){
  const sec=TM.elapsed;
  clearInterval(TM.tick); TM.tick=null; TM.running=false;
  if(sec<10){ TM.elapsed=0; renderWatch(); return toast("Too short to save","bad"); }
  const d=today();
  S.hours[d]=S.hours[d]||{block:0,book:0,lecture:0};
  S.hours[d][TM.mode]=(S.hours[d][TM.mode]||0)+sec;
  S.sessions.push({id:uid(),date:d,mode:TM.mode,sec,label:TM.kind==="timer"?`${Math.round(TM.target/60)}m timer`:"stopwatch"});
  TM.elapsed=0; save(true);
  toast(`${hLabel(sec)} added${auto?" · timer done":""}`);
  renderAll();
}
function resetRun(){ clearInterval(TM.tick); TM.tick=null; TM.running=false; TM.elapsed=0; renderWatch(); }
function delSession(id){
  const s=S.sessions.find(x=>x.id===id); if(!s) return;
  confirmSheet("Remove session?",`${hLabel(s.sec)} will be subtracted from ${fmtD(s.date)}.`,()=>{
    if(S.hours[s.date]) S.hours[s.date][s.mode]=Math.max(0,(S.hours[s.date][s.mode]||0)-s.sec);
    S.sessions=S.sessions.filter(x=>x.id!==id); save(true); toast("Session removed"); renderAll();
  });
}

/* ============================================================
   PAGE · PLAN  (settings, phases, backup, one-tap update)
   ============================================================ */
function renderPlan(){
  const el=document.getElementById("p-plan");
  const e=engine(), ph=phases(), pre=earlierPrepTotals();
  const st=S.settings;

  el.innerHTML=`
  <div class="card">
    <div class="card-h"><h3>${I("target",{s:17,c:"var(--teal-2)"})} Exam & sources</h3></div>
    <div class="grid g2" style="gap:12px">
      <div class="field">
        <label class="fl">Expected exam date</label>
        <input class="inp" type="date" id="sExam" value="${st.examDate||""}">
      </div>
      <div class="field">
        <label class="fl">Daily hour goal</label>
        <input class="inp" type="number" step="0.5" min="1" max="16" id="sHours" value="${st.dailyHourGoal}">
      </div>
      <div class="field">
        <label class="fl">UWorld total questions</label>
        <input class="inp" type="number" id="sUwT" value="${st.uwTotal}">
      </div>
      <div class="field">
        <label class="fl">Already done (UWorld)</label>
        <input class="inp" type="number" id="sUwS" value="${st.uwStart}" placeholder="0">
      </div>
      <div class="field">
        <label class="fl">First Aid total pages</label>
        <input class="inp" type="number" id="sFaT" value="${st.faTotal}">
      </div>
      <div class="field">
        <label class="fl">Already done (pages)</label>
        <input class="inp" type="number" id="sFaS" value="${st.faStart}" placeholder="0">
      </div>
      <div class="field">
        <label class="fl">Min questions / day</label>
        <input class="inp" type="number" id="sMin" value="${st.minQ}">
      </div>
      <div class="field">
        <label class="fl">Max questions / day</label>
        <input class="inp" type="number" id="sMax" value="${st.maxQ}">
      </div>
    </div>
    <button class="btn pri full" style="margin-top:14px" onclick="savePlan()">${I("check",{s:16,c:"#fff"})} Save plan</button>
    <p class="hint">First Aid and UWorld are paced to finish <b>${BUFFER_DAYS} days before</b> your exam, leaving the final stretch for NBMEs, incorrects and rapid review. Sketchy Micro and Boards &amp; Beyond aren't paced — log their time in the clock panel.</p>
  </div>

  ${e.ready?`
  <div class="grid g4">
    <div class="stat accent"><div class="lab">${I("clock",{s:12})} To exam</div><div class="val">${e.daysToExam}</div><div class="note">${fmtShort(e.exam)}</div></div>
    <div class="stat"><div class="lab">${I("zap",{s:12})} Need / day</div><div class="val">${e.needQ}</div><div class="note">UWorld Q</div></div>
    <div class="stat"><div class="lab">${I("book",{s:12})} Need / day</div><div class="val">${e.needP}</div><div class="note">FA pages</div></div>
    <div class="stat"><div class="lab">${I("target",{s:12})} Deadline</div><div class="val" style="font-size:19px">${fmtShort(e.deadline)}</div><div class="note">both sources done</div></div>
  </div>

  ${(()=>{const p=projection();return p?`
  <div class="card">
    <div class="card-h"><h3>${I("chart",{s:17,c:p.onTrack?"var(--teal-2)":"var(--rose)"})} Projection</h3>
      <span class="sub">from your last 14 active days</span></div>
    <div class="grid g2" style="gap:12px">
      <div class="stat ${p.onTrack?"accent":""}">
        <div class="lab">${I("target",{s:12})} Finishing</div>
        <div class="val" style="font-size:19px">${p.finishDate?fmtD(p.finishDate):"—"}</div>
        <div class="note" style="color:${p.onTrack?'var(--teal-2)':'var(--rose)'}">
          ${p.slack>=0?`${p.slack} days of buffer`:`${Math.abs(p.slack)} days late`}</div>
      </div>
      <div class="stat">
        <div class="lab">${I("zap",{s:12})} Your average</div>
        <div class="val">${p.avgQ.toFixed(0)}<small> Q/day</small></div>
        <div class="note">${p.avgP.toFixed(0)} pages/day</div>
      </div>
    </div>
    <p class="hint">This projects forward from what you've actually been doing, not from the plan. If it disagrees with your target, the target is the thing that needs to move.</p>
  </div>`:""})()}

  ${(()=>{const m=missCost();return m&&m.delta>0?`
  <div class="card tight">
    <div class="card-h"><h3>${I("clock",{s:16,c:"var(--amber)"})} Cost of a rest day</h3></div>
    <div class="grid g3">
      <div class="stat" style="min-height:76px"><div class="lab">Today</div><div class="val" style="font-size:20px">${m.now}</div></div>
      <div class="stat" style="min-height:76px"><div class="lab">If skipped</div><div class="val" style="font-size:20px;color:var(--amber)">${m.after}</div></div>
      <div class="stat" style="min-height:76px"><div class="lab">Extra</div><div class="val" style="font-size:20px;color:var(--rose)">+${m.delta}</div></div>
    </div>
  </div>`:""})()}

  <div class="card">
    <div class="card-h"><h3>${I("layers",{s:17,c:"var(--indigo-2)"})} Phases</h3>
      <span class="sub">from 1 Aug 2026</span></div>
    ${ph.length?ph.map(p=>`
      <div class="phase ${p.state==="now"?"now":p.state==="done"?"done":""}">
        <div class="ph-h">
          <span class="ph-n">${p.name}</span>
          <span class="pill ${p.state==="now"?"good":p.state==="done"?"info":"warn"}">
            ${p.state==="now"?"Current":p.state==="done"?"Complete":"Upcoming"}</span>
        </div>
        <div class="ph-d">${fmtD(p.from)} → ${fmtD(p.to)} · ${p.days} days</div>
        ${p.state!=="future"?`
        <div class="track" style="height:7px;margin-top:10px">
          <div class="fill" style="width:${p.pct}%;background:linear-gradient(90deg,var(--indigo),var(--teal))"></div>
        </div>`:""}
        <div class="ph-b">${p.body}</div>
      </div>`).join(""):`<div class="empty">${I("empty",{s:36})}<div>Your exam date leaves no room after 1 Aug 2026 — phases are hidden.</div></div>`}
    <p class="hint">${I("info",{s:12})} Phases run from 1 August 2026 to your finish date. Anything logged before 1 July 2026 is treated as <b>earlier preparation</b> and sits outside the phase structure.</p>
  </div>

  ${(pre.n||pre.sec)?`
  <div class="card tight">
    <div class="card-h"><h3>${I("book",{s:16,c:"var(--text-3)"})} Earlier preparation</h3>
      <span class="sub">before 1 Jul 2026</span></div>
    <div class="grid g3">
      <div class="stat" style="min-height:76px"><div class="lab">Questions</div><div class="val" style="font-size:20px">${pre.q}</div></div>
      <div class="stat" style="min-height:76px"><div class="lab">Pages</div><div class="val" style="font-size:20px">${pre.p}</div></div>
      <div class="stat" style="min-height:76px"><div class="lab">Hours</div><div class="val" style="font-size:20px">${(pre.sec/3600).toFixed(1)}</div></div>
    </div>
    <p class="hint">Counted in your totals, excluded from phase progress.</p>
  </div>`:""}
  `:""}

  <div class="card">
    <div class="card-h"><h3>${I("sync",{s:17,c:"var(--violet)"})} In-app update</h3></div>
    <div class="field">
      <label class="fl">App source URL</label>
      <input class="inp" id="sSync" value="${st.syncUrl||""}" placeholder="https://.../index.html">
    </div>
    <div class="btnrow" style="margin-top:12px">
      <button class="btn pri" onclick="doUpdate()">${I("sync",{s:16,c:"#fff"})} Update now</button>
      <button class="btn sec" onclick="saveSync()">${I("check",{s:16})} Save URL</button>
    </div>
    <p class="hint">${st.lastSync?`Last checked ${st.lastSync}. `:""}Paste the URL where you host this app. One tap re-downloads the newest version and clears the cache — <b>your data stays exactly where it is</b>, because it lives in this device's storage, not in the file.</p>
  </div>

  <div class="card">
    <div class="card-h"><h3>${I("dl",{s:17,c:"var(--teal-2)"})} Backup</h3>
      <span class="sub">v${APP_VERSION}</span></div>
    <div class="btnrow">
      <button class="btn pri" onclick="exportData()">${I("dl",{s:16,c:"#fff"})} Export</button>
      <button class="btn sec" onclick="document.getElementById('imp').click()">${I("ul",{s:16})} Import</button>
      <button class="btn sec" onclick="exportCSV()">${I("chart",{s:16})} Export CSV</button>
      <button class="btn sec" onclick="copyData()">${I("edit",{s:16})} Copy JSON</button>
    </div>
    <input type="file" id="imp" accept=".json,application/json" style="display:none" onchange="importData(this)">
    <div class="grid g3" style="margin-top:16px">
      <div class="stat" style="min-height:76px"><div class="lab">Log days</div><div class="val" style="font-size:20px">${Object.keys(S.qlogs).length}</div></div>
      <div class="stat" style="min-height:76px"><div class="lab">Sessions</div><div class="val" style="font-size:20px">${S.sessions.length}</div></div>
      <div class="stat" style="min-height:76px"><div class="lab">Assessments</div><div class="val" style="font-size:20px">${S.nbme.length}</div></div>
    </div>
    <hr class="sep">
    <button class="btn dan full" onclick="wipe()">${I("trash",{s:16})} Erase all data</button>
    <p class="hint">Export before erasing. Import merges by date — newer entries win, nothing already saved is lost unless the same date exists in both files.</p>
  </div>`;
}

function savePlan(){
  const g=id=>document.getElementById(id);
  const st=S.settings;
  st.examDate=g("sExam").value||"";
  st.dailyHourGoal=+g("sHours").value||6;
  st.uwTotal=+g("sUwT").value||UW_TOTAL;
  st.uwStart=+g("sUwS").value||0;
  st.faTotal=+g("sFaT").value||FA_TOTAL;
  st.faStart=+g("sFaS").value||0;
  st.minQ=+g("sMin").value||30;
  st.maxQ=+g("sMax").value||60;
  if(st.minQ>st.maxQ){ const t=st.minQ; st.minQ=st.maxQ; st.maxQ=t; }
  save(true); toast("Plan updated"); renderAll();
}
function saveSync(){ S.settings.syncUrl=document.getElementById("sSync").value.trim(); save(true); toast("URL saved"); }

/* one-tap update: keep data, refresh code */
async function doUpdate(){
  const inp=document.getElementById("sSync");
  const url=(inp?inp.value.trim():S.settings.syncUrl)||S.settings.syncUrl;
  S.settings.syncUrl=url;
  S.settings.lastSync=new Date().toLocaleString();
  save(true);
  toast("Updating…","info");
  try{
    if("serviceWorker" in navigator){
      const rs=await navigator.serviceWorker.getRegistrations();
      for(const r of rs) await r.update();
    }
    if(window.caches){ const ks=await caches.keys(); await Promise.all(ks.map(k=>caches.delete(k))); }
  }catch(e){}
  setTimeout(()=>{
    const target = url || location.href.split("#")[0];
    location.replace(target + (target.includes("?")?"&":"?") + "v=" + Date.now());
  },700);
}

/* ---------- backup ---------- */
function exportData(){
  const payload={app:"step1pace",version:APP_VERSION,exported:new Date().toISOString(),data:S};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`step1-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  localStorage.setItem(KEY+".backup",today());
  toast("Backup downloaded");
}
function exportCSV(){
  const rows=[["Date","Day","UWorld Q","Correct","Accuracy %","FA Pages","Block h","Reading h","Lecture h","Total h","Note"]];
  const days=[...new Set([...Object.keys(S.qlogs),...Object.keys(S.hours)])].sort();
  days.forEach(d=>{
    const q=S.qlogs[d]||{}, h=S.hours[d]||{};
    const acc=(q.correct!=null&&q.correct!==""&&+q.q)?(+q.correct/+q.q*100).toFixed(1):"";
    rows.push([d,dowShort(d),q.q||0,q.correct??"",acc,q.pages||0,
      ((h.block||0)/3600).toFixed(2),((h.book||0)/3600).toFixed(2),((h.lecture||0)/3600).toFixed(2),
      (dayHours(d)/3600).toFixed(2),(q.note||"").replace(/"/g,'""')]);
  });
  rows.push([]); rows.push(["Assessments"]);
  rows.push(["Date","Type","Name","Score","% Correct","Note"]);
  [...S.nbme].sort((a,b)=>a.date.localeCompare(b.date))
    .forEach(x=>rows.push([x.date,x.type,x.name,x.score,x.percentCorrect||"",(x.note||"").replace(/"/g,'""')]));
  const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const b=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(b); a.download=`step1-data-${today()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  toast("CSV downloaded");
}
function copyData(){
  const txt=JSON.stringify({app:"step1pace",version:APP_VERSION,data:S});
  navigator.clipboard?.writeText(txt).then(()=>toast("JSON copied")).catch(()=>toast("Copy blocked","bad"));
}
function importData(inp){
  const f=inp.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const p=JSON.parse(r.result);
      const d=p.data||p;
      if(!d.qlogs&&!d.settings) throw 0;
      S.settings={...S.settings,...(d.settings||{})};
      S.qlogs={...S.qlogs,...(d.qlogs||{})};
      S.hours={...S.hours,...(d.hours||{})};
      const ids=new Set(S.nbme.map(x=>x.id));
      (d.nbme||[]).forEach(x=>{ if(!ids.has(x.id)) S.nbme.push(x); });
      const sid=new Set(S.sessions.map(x=>x.id));
      (d.sessions||[]).forEach(x=>{ if(!sid.has(x.id)) S.sessions.push(x); });
      save(true); applyTheme(); toast("Backup restored"); renderAll();
    }catch(e){ toast("That file isn't a valid backup","bad"); }
    inp.value="";
  };
  r.readAsText(f);
}
function wipe(){
  confirmSheet("Erase everything?","All logs, sessions and assessments will be deleted from this device. This cannot be undone.",()=>{
    localStorage.removeItem(KEY); S=structuredClone(DEFAULT); save(true); applyTheme(); toast("All data erased"); renderAll();
  },"Erase");
}

/* ============================================================
   MANUAL TIME LOGGING FEATURE
============================================================ */
function openManualTimeSheet() {
  const t = today();
  openSheet(`
    <div class="grab"></div>
    <div class="card-h">
      <h3>${I("clock", {s: 18, c: "var(--indigo-2)"})} Log Past Study Time</h3>
      <span class="sub">Manual Entry</span>
    </div>
    
    <div class="grid" style="gap: 12px;">
      <div class="field">
        <label class="fl">Study Mode</label>
        <select class="inp" id="manualMode">
          <option value="block">UWorld block</option>
          <option value="book">First Aid</option>
          <option value="lecture">B&B / Sketchy</option>
        </select>
      </div>

      <div class="g2" style="gap: 10px;">
        <div class="field">
          <label class="fl">Hours</label>
          <input class="inp" type="number" inputmode="numeric" id="manualHours" value="0" min="0" max="12">
        </div>
        <div class="field">
          <label class="fl">Minutes</label>
          <input class="inp" type="number" inputmode="numeric" id="manualMinutes" value="30" min="0" max="59">
        </div>
      </div>

      <div class="field">
        <label class="fl">Date</label>
        <input class="inp" type="date" id="manualDate" value="${t}">
      </div>

      <div class="field">
        <label class="fl">Note / Label (Optional)</label>
        <input class="inp" id="manualLabel" placeholder="e.g., Cardio review, missed tracking">
      </div>

      <div class="btnrow" style="margin-top: 8px;">
        <button class="btn sec" onclick="closeSheet()">Cancel</button>
        <button class="btn pri" onclick="saveManualTime()">Save Time</button>
      </div>
    </div>
  `);
}

function saveManualTime() {
  const mode = document.getElementById("manualMode").value;
  const hrsInput = parseInt(document.getElementById("manualHours").value) || 0;
  const minInput = parseInt(document.getElementById("manualMinutes").value) || 0;
  const dateInput = document.getElementById("manualDate").value || today();
  const customLabel = document.getElementById("manualLabel").value.trim();

  const totalSeconds = (hrsInput * 3600) + (minInput * 60);

  if (totalSeconds <= 0) {
    toast("Please enter a valid duration", "bad");
    return;
  }

  S.hours[dateInput] = S.hours[dateInput] || { block: 0, book: 0, lecture: 0 };
  S.hours[dateInput][mode] = (S.hours[dateInput][mode] || 0) + totalSeconds;

  const defaultLabelText = MODES[mode] ? MODES[mode].label : "Manual Entry";
  S.sessions.push({
    id: uid(),
    date: dateInput,
    mode: mode,
    sec: totalSeconds,
    label: customLabel ? `${customLabel} (Manual)` : `${defaultLabelText} (Manual)`
  });

  save(true);
  closeSheet();
  toast(`Added ${hLabel(totalSeconds)} to ${mode}`);
  renderAll();
}

/* ============================================================
   SHELL: tabs, theme, sheets, boot
   ============================================================ */
const TABS=[
  {id:"home", label:"Home",  icon:"home"},
  {id:"log",  label:"Log",   icon:"log"},
  {id:"nbme", label:"NBME",  icon:"nbme"},
  {id:"watch",label:"Watch", icon:"watch"},
  {id:"plan", label:"Plan",  icon:"plan"}
];
let PAGE="home";
function renderTabs(){
  document.getElementById("tabs").innerHTML=TABS.map(t=>`
    <button class="${PAGE===t.id?"on":""}" onclick="go('${t.id}')">
      ${I(t.icon,{s:19,w:PAGE===t.id?2.1:1.8})}<span>${t.label}</span>
    </button>`).join("");
}
function go(id){
  PAGE=id;
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("on",p.id==="p-"+id));
  renderTabs(); renderPage(id);
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderPage(id){
  ({home:renderHome,log:renderLog,nbme:renderNbme,watch:renderWatch,plan:renderPlan})[id]?.();
}
function renderAll(){
  renderPage(PAGE); renderTabs(); renderHeader();
}
function renderHeader(){
  const d=new Date(), t=today();
  document.getElementById("stampDay").textContent=DOW[d.getDay()];
  document.getElementById("stampDate").textContent=fmtD(t);
  const e=engine();
  const sub=document.getElementById("brandSub");
  sub.textContent = e.ready ? `${e.daysToExam} days to exam · ${e.goalQ} Q today` : "Set your exam date to begin";
  document.getElementById("btnTheme").innerHTML=I(S.settings.theme==="dark"?"sun":"moon",{s:16});
  document.getElementById("btnSync").innerHTML=I("sync",{s:16});
}

/* theme */
function applyTheme(){
  document.documentElement.setAttribute("data-theme",S.settings.theme||"dark");
  document.querySelector('meta[name="theme-color"]').setAttribute("content",
    S.settings.theme==="light"?"#F3F5FA":"#080B14");
}
function toggleTheme(){
  S.settings.theme = S.settings.theme==="dark"?"light":"dark";
  save(true); applyTheme(); renderAll();
  toast(S.settings.theme==="dark"?"Dark theme":"Light theme","info");
}

/* sheets */
function openSheet(html){
  const ov=document.getElementById("ov"), sh=document.getElementById("sheet");
  sh.innerHTML=`<div class="grab"></div>`+html;
  ov.classList.add("on");
}
function closeSheet(){ document.getElementById("ov").classList.remove("on"); }
document.getElementById("ov").addEventListener("click",ev=>{ if(ev.target.id==="ov") closeSheet(); });

function confirmSheet(title,body,fn,btn){
  window.__cf=fn;
  openSheet(`
    <h3 style="font-family:var(--f-display);font-size:18px;margin:0 0 8px;letter-spacing:-.02em">${title}</h3>
    <p style="color:var(--text-2);font-size:13.5px;line-height:1.6;margin:0 0 20px">${body}</p>
    <div class="btnrow">
      <button class="btn sec" onclick="closeSheet()">Cancel</button>
      <button class="btn dan" onclick="(window.__cf&&window.__cf());closeSheet()">${btn||"Delete"}</button>
    </div>`);
}

function editLog(id){ closeSheet(); quickLog(id); }
function delLogEntry(id){
  confirmSheet("Remove entry?", "This log will be deleted permanently.", () => {
    S.studyLogs = S.studyLogs.filter(x => x.id !== id);
    // Rebuild the daily aggregation
    S.qlogs = {};
    S.studyLogs.forEach(log => {
      if(!S.qlogs[log.date]) S.qlogs[log.date] = { q:0, correct:null, pages:0, note:"" };
      S.qlogs[log.date].q += log.q;
      S.qlogs[log.date].pages += log.pages;
      if(log.correct != null) S.qlogs[log.date].correct = (S.qlogs[log.date].correct || 0) + log.correct;
      const notes = [log.faTopic, log.uwTopic].filter(Boolean).join(" / ");
      if(notes) S.qlogs[log.date].note = S.qlogs[log.date].note ? S.qlogs[log.date].note + " | " + notes : notes;
    });
    save(true); toast("Entry removed"); renderAll();
  });
}

function quickLog(editId = null){ 
  const e=engine(), t=today(); 
  let c = {q:"", correct:"", pages:"", faTopic:"", uwTopic:"", date: t};
  let title = `Log today ${DOW[parse(t).getDay()]} · ${fmtD(t)}`;
  
  if(editId){
    c = S.studyLogs.find(x => x.id === editId) || c;
    title = `Edit entry for ${fmtShort(c.date)}`;
  }

  const faOpts = `<option value="">-- First Aid Topic --</option>` + FA_TOPICS.map(x=>`<option value="${x}" ${c.faTopic===x?'selected':''}>${x}</option>`).join("");
  const uwOpts = `<option value="">-- UWorld Topic --</option>` + UW_TOPICS.map(x=>`<option value="${x}" ${c.uwTopic===x?'selected':''}>${x}</option>`).join("");

  openSheet(`
    <div class="card-h mb0"><h3 class="bignum">${title}</h3></div>
    <input type="hidden" id="qId" value="${editId || ''}">
    <input type="hidden" id="qDate" value="${c.date}">
    <div class="grid g2" style="margin-top:16px">
      <div class="field"><label class="fl">UWorld Q</label><input class="inp" type="number" id="qq" value="${c.q||""}" placeholder="0"></div>
      <div class="field"><label class="fl">Correct</label><input class="inp" type="number" id="qc" value="${c.correct??""}" placeholder="opt"></div>
      <div class="field" style="grid-column: 1 / -1"><label class="fl">UWorld Topic</label><select class="inp" id="quw">${uwOpts}</select></div>
      <div class="field"><label class="fl">FA Pages</label><input class="inp" type="number" id="qp" value="${c.pages||""}" placeholder="0"></div>
      <div class="field" style="grid-column: 1 / -1"><label class="fl">First Aid Topic</label><select class="inp" id="qfa">${faOpts}</select></div>
    </div>
    <div class="btnrow" style="margin-top:20px">
      <button class="btn sec" onclick="closeSheet()">Cancel</button>
      <button class="btn pri" onclick="quickSave()">${I("check",{s:16,c:"#fff"})} Save</button>
    </div>
  `); 
}

function quickSave(){
  const id = document.getElementById("qId").value;
  const dt = document.getElementById("qDate").value || today();
  const q = +document.getElementById("qq").value || 0;
  const cr = document.getElementById("qc").value;
  const p = +document.getElementById("qp").value || 0;
  const fa = document.getElementById("qfa").value;
  const uw = document.getElementById("quw").value;
  
  if(cr!=="" && +cr>q){ return toast("Correct can't exceed questions","bad"); }
  
  const entry = { id: id || uid(), date: dt, q, correct: cr===""?null:+cr, pages: p, faTopic: fa, uwTopic: uw };
  
  if(id) {
    const idx = S.studyLogs.findIndex(x => x.id === id);
    if(idx > -1) S.studyLogs[idx] = entry;
  } else {
    S.studyLogs.push(entry);
  }

  // Dynamically rebuild the daily aggregation for the legacy pace engine
  S.qlogs = {};
  S.studyLogs.forEach(log => {
    if(!S.qlogs[log.date]) S.qlogs[log.date] = { q:0, correct:null, pages:0, note:"" };
    S.qlogs[log.date].q += log.q;
    S.qlogs[log.date].pages += log.pages;
    if(log.correct != null) S.qlogs[log.date].correct = (S.qlogs[log.date].correct || 0) + log.correct;
    // Store topics for subjectStats compatibility
    const notes = [log.faTopic, log.uwTopic].filter(Boolean).join(" / ");
    if(notes) S.qlogs[log.date].note = S.qlogs[log.date].note ? S.qlogs[log.date].note + " | " + notes : notes;
  });

  save(true);
  closeSheet();
  toast(`${q} questions logged`); 
  renderAll(); 
}

/* ---------- boot ---------- */
document.getElementById("btnTheme").addEventListener("click",toggleTheme);
document.getElementById("btnSync").addEventListener("click",()=>{ go("plan"); setTimeout(()=>toast("Update & backup are here","info"),400); });

applyTheme();
renderTabs();
renderHeader();
renderHome();

/* backup nudge every 14 days */
(function(){
  const last=localStorage.getItem(KEY+".backup");
  const n=Object.keys(S.qlogs).length;
  if(n>6 && (!last || diffD(last,today())>=14)){
    setTimeout(()=>toast("Worth exporting a backup — Plan tab","info"),3200);
  }
})();

/* keep header/day stamp fresh across midnight */
let lastDay=today();
setInterval(()=>{ if(today()!==lastDay){ lastDay=today(); renderAll(); } },30000);

/* offline cache so it works with no signal */
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}

/* expose for inline handlers */Object.assign(window,{
  go, quickLog, quickSave, editLog, delLogEntry, saveLog, delLog, bump, bumpPage, addNbme, delNbme,
  nbmeNamePrefill, setKind, setMode, setTarget, toggleRun, finishRun, resetRun, delSession,
  savePlan, saveSync, doUpdate, exportData, exportCSV, importData, copyData, wipe, closeSheet, confirmSheet,
  insights, projection, consistency, subjectStats, weekSummary, heatmap, missCost, S, save, renderAll,
  openManualTimeSheet,
  saveManualTime
});


/* ============================================================
   NEW FEATURES v3.1
   ============================================================ */

/* ---- 1. Subject / system tracking ---- */
const SYSTEMS=["Cardio","Resp","Renal","GI","Neuro","Endo","Repro","Heme/Onc","MSK","Psych","Micro","Immuno","Biochem","Pharm","Path","Behavioral"];
function subjectStats(){
  const m={};
  Object.entries(S.qlogs).forEach(([d,v])=>{
    const note=(v.note||"").toLowerCase();
    SYSTEMS.forEach(s=>{
      if(note.includes(s.toLowerCase().split("/")[0])){
        m[s]=m[s]||{q:0,c:0,scored:0,days:0};
        m[s].q+=+v.q||0; m[s].days++;
        if(v.correct!=null&&v.correct!==""){ m[s].c+=+v.correct; m[s].scored+=+v.q||0; }
      }
    });
  });
  return Object.entries(m).map(([k,v])=>({name:k,...v,
    acc: v.scored? v.c/v.scored*100 : null})).sort((a,b)=>b.q-a.q);
}

/* ---- 2. Projection: will you finish on time? ---- */
function projection(){
  const e=engine();
  if(!e.ready) return null;
  const days=Object.entries(S.qlogs).filter(([,v])=>(+v.q||0)>0);
  if(days.length<3) return null;
  const recent=days.sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
  const avgQ=recent.reduce((a,[,v])=>a+(+v.q||0),0)/recent.length;
  const avgP=recent.reduce((a,[,v])=>a+(+v.pages||0),0)/recent.length;
  const daysNeededQ = avgQ>0 ? Math.ceil(e.remQ/avgQ) : Infinity;
  const daysNeededP = avgP>0 ? Math.ceil(e.remP/avgP) : Infinity;
  const worst=Math.max(daysNeededQ,daysNeededP);
  const finishDate = isFinite(worst)? addD(today(),worst) : null;
  const slack = finishDate? diffD(finishDate,e.deadline) : null;
  return {avgQ,avgP,daysNeededQ,daysNeededP,finishDate,slack,
    onTrack: slack!=null && slack>=0};
}

/* ---- 3. Rest-day recovery: what a missed day costs ---- */
function missCost(){
  const e=engine();
  if(!e.ready||e.daysToDeadline<2) return null;
  const now=e.goalQ;
  const after=Math.ceil(e.remQ/Math.max(1,e.daysToDeadline));
  return {now,after,delta:after-now};
}

/* ---- 4. Consistency score ---- */
function consistency(){
  const d30=lastNDays(30);
  const logged=d30.filter(d=>(+((S.qlogs[d]||{}).q||0))>0).length;
  const e=engine();
  const met=d30.filter(d=>(+((S.qlogs[d]||{}).q||0))>=(e.goalQ||40)).length;
  const vals=d30.map(d=>+((S.qlogs[d]||{}).q||0)).filter(v=>v>0);
  let cv=0;
  if(vals.length>1){
    const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
    const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length);
    cv=mean?sd/mean:0;
  }
  const score=Math.round(clamp((logged/30)*45 + (met/30)*40 + (1-clamp(cv,0,1))*15,0,100));
  return {logged,met,score,cv};
}

/* ---- 5. Best study hour heatmap (30 days) ---- */
function heatmap(){
  const d=lastNDays(35);
  const e=engine(), goal=e.goalQ||40;
  return d.map(x=>{
    const q=+((S.qlogs[x]||{}).q||0);
    const lvl = q===0?0 : q<goal*0.5?1 : q<goal?2 : q<goal*1.3?3 : 4;
    return {d:x,q,lvl};
  });
}

/* ---- 6. Weekly summary ---- */
function weekSummary(){
  const d7=lastNDays(7);
  const q=d7.reduce((a,d)=>a+(+((S.qlogs[d]||{}).q||0)),0);
  const p=d7.reduce((a,d)=>a+(+((S.qlogs[d]||{}).pages||0)),0);
  const h=d7.reduce((a,d)=>a+dayHours(d),0);
  const prev=lastNDays(14).slice(0,7);
  const pq=prev.reduce((a,d)=>a+(+((S.qlogs[d]||{}).q||0)),0);
  const ph=prev.reduce((a,d)=>a+dayHours(d),0);
  return {q,p,h,dq:q-pq,dh:h-ph,
    qPct: pq? (q-pq)/pq*100 : null, active:d7.filter(d=>(+((S.qlogs[d]||{}).q||0))>0).length};
}

/* ---- 7. Insight generator ---- */
function insights(){
  const e=engine(), out=[];
  if(!e.ready) return out;
  const pr=projection(), mc=missCost(), c=consistency(), w=weekSummary();

  if(pr){
    out.push(pr.onTrack
      ? {ic:"check",col:"var(--teal-2)",tt:`On track to finish ${fmtShort(pr.finishDate)}`,
         bd:`At your recent average of ${pr.avgQ.toFixed(0)} Q and ${pr.avgP.toFixed(0)} pages a day, you land ${pr.slack} days before the ${fmtShort(e.deadline)} deadline.`}
      : {ic:"info",col:"var(--rose)",tt:`Current pace finishes ${pr.finishDate?fmtShort(pr.finishDate):"—"}`,
         bd:`That's ${Math.abs(pr.slack||0)} days past your deadline. Raising to ${e.needQ} Q/day closes the gap.`});
  }
  if(mc && mc.delta>0){
    out.push({ic:"clock",col:"var(--amber)",tt:`A rest day costs ${mc.delta} extra questions`,
      bd:`Skipping today pushes tomorrow's target from ${mc.now} to ${mc.after}. Worth knowing before you decide.`});
  }
  if(c.logged<20 && c.logged>0){
    out.push({ic:"log",col:"var(--indigo-2)",tt:`Logged ${c.logged} of the last 30 days`,
      bd:`Gaps in logging make the pace line optimistic. Even a zero entry keeps the maths honest.`});
  }
  if(w.qPct!=null && Math.abs(w.qPct)>15){
    out.push(w.qPct>0
      ? {ic:"up",col:"var(--teal-2)",tt:`Up ${w.qPct.toFixed(0)}% on last week`,
         bd:`${w.q} questions this week versus ${w.q-w.dq} the week before.`}
      : {ic:"down",col:"var(--amber)",tt:`Down ${Math.abs(w.qPct).toFixed(0)}% on last week`,
         bd:`${w.q} questions this week versus ${w.q-w.dq} before. Worth a look at what changed.`});
  }
  const sub=subjectStats().filter(s=>s.acc!=null&&s.scored>=20);
  if(sub.length>=2){
    const weak=[...sub].sort((a,b)=>a.acc-b.acc)[0];
    out.push({ic:"target",col:"var(--coral)",tt:`${weak.name} is your lowest accuracy at ${weak.acc.toFixed(0)}%`,
      bd:`Across ${weak.scored} scored questions. Boards & Beyond plus a First Aid re-read on this system would move your NBME most.`});
  }
  const n=S.nbme.filter(x=>+x.score).sort((a,b)=>a.date.localeCompare(b.date));
  if(n.length>=2){
    const gain=+n[n.length-1].score - +n[n.length-2].score;
    const days=diffD(n[n.length-2].date,n[n.length-1].date);
    if(days>0) out.push({ic:"award",col:"var(--violet)",tt:`${gain>=0?"+":""}${gain} points across ${days} days`,
      bd:`Between ${n[n.length-2].name} and ${n[n.length-1].name}. Roughly ${(gain/days*30).toFixed(0)} points a month at this rate.`});
  }
  return out.slice(0,5);
}
