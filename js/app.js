const { useState, useEffect } = React;

// ─── UTILITIES & CONSTANTS ───────────────────────────────────────────────

// Helper function to get today's date in YYYY-MM-DD format
const today = () => new Date().toISOString().split("T")[0];

// Calorie burn rates per minute for different exercises
const CAL_RATE = { Running: 10, Cycling: 8, Swimming: 9, Gym: 7, Yoga: 4, Walking: 5 };

// Emoji icons corresponding to each workout type
const ICONS    = { Running: "🏃", Cycling: "🚴", Swimming: "🏊", Gym: "🏋️", Yoga: "🧘", Walking: "🚶" };
const TYPES    = Object.keys(CAL_RATE);

// Safely load data from the browser's localStorage, returning a fallback if it fails or doesn't exist
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

// Helper function to save data into the browser's localStorage
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ─── REUSABLE UI COMPONENTS ─────────────────────────────────

// Displays a temporary pop-up notification at the bottom of the screen
function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null;
}

// The top navigation bar showing brand, page links, and user avatar
function Nav({ page, setPage, user, onAvatar }) {
  const links = ["Dashboard", "Log", "Progress", "Contact", "About"];
  const init = user ? (user.fname[0] + user.lname[0]).toUpperCase() : "?";
  return (
    <nav>
      <div className="brand">MY<span>FIT</span></div>
      {links.map(l => (
        <button key={l} className={"nav-btn" + (page === l ? " active" : "")} onClick={() => setPage(l)}>{l}</button>
      ))}
      <div className="avatar" onClick={onAvatar}>{init}</div>
    </nav>
  );
}

// A generic card component used to display a numerical statistic (like calories burned or minutes active)
function StatCard({ icon, value, label, sub, goal }) {
  const pct = goal ? Math.min(100, Math.round(value / goal * 100)) : null;
  return (
    <div className="stat-card">
      <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{icon}</div>
      <div className="stat-num">{value}</div>
      <div className="stat-lbl">{label}</div>
      {pct !== null ? (
        <div>
          <div className="bar-track"><div className="bar-fill" style={{ width: pct + "%" }} /></div>
          <div className="bar-lbls"><span>{pct}%</span><span>Goal: {goal}</span></div>
        </div>
      ) : (
        <div className="stat-sub">{sub}</div>
      )}
    </div>
  );
}

// Displays a single logged workout entry in a list format
function WorkoutItem({ w, onDelete }) {
  return (
    <div className="wk-item">
      <div className="wk-icon">{ICONS[w.type] || "💪"}</div>
      <div style={{ flex: 1 }}>
        <div className="wk-name">{w.type}</div>
        <div className="wk-meta">{w.date} · {w.dur} min{w.notes ? " · " + w.notes : ""}</div>
      </div>
      <div className="wk-cals">{w.cals}<span> kcal</span></div>
      {onDelete && <button className="del-btn" onClick={() => onDelete(w.id)}>✕</button>}
    </div>
  );
}

// ─── MODALS & FORMS ────────────────────────────────────────────────

// Base modal wrapper component that provides the darkened background and white popup box
function Modal({ title, sub, onClose, children }) {
  return (
    <div className="overlay" onClick={e => e.target.className === "overlay" && onClose()}>
      <div className="modal">
        <button className="close-btn" onClick={onClose}>✕</button>
        <div className="modal-title">{title}</div>
        <div className="modal-sub">{sub}</div>
        {children}
      </div>
    </div>
  );
}

// Reusable form input field wrapper that handles labels and descriptions automatically
function Field({ label, hint, ...props }) {
  return (
    <div className="field">
      <label>{label}</label>
      {props.as === "select"
        ? <select {...props}>{props.children}</select>
        : <input {...props} />}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

// Modal for creating a brand new user account
function SignUpModal({ onSignUp, onSwitch }) {
  const [f, setF] = useState({ fname:"", lname:"", email:"", pass:"", age:"", gender:"", weight:"", height:"", cals:"" });
  const [err, setErr] = useState("");
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  // Validates form fields before allowing sign up
  function submit(e) {
    e.preventDefault();
    if (!f.fname || !f.lname)  return setErr("Enter your full name.");
    if (!f.email.includes("@")) return setErr("Enter a valid email.");
    if (f.pass.length < 6)     return setErr("Password min 6 characters.");
    if (!f.age || !f.weight || !f.height || !f.cals) return setErr("Fill in all stats.");
    onSignUp(f);
  }

  return (
    <Modal title={<>JOIN MY<span style={{color:"var(--accent)"}}>FITNESS</span></>} sub="Create your account to start tracking" onClose={() => {}}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column" }}>
      {err && <div className="err">{err}</div>}
      <div className="row2">
        <Field label="First Name" placeholder="Alex"  value={f.fname}  onChange={set("fname")} />
        <Field label="Last Name"  placeholder="Smith" value={f.lname}  onChange={set("lname")} />
      </div>
      <Field label="Email"    type="email"    placeholder="alex@email.com" value={f.email} onChange={set("email")} />
      <Field label="Password" type="password" placeholder="Min 6 chars"   value={f.pass}  onChange={set("pass")} />
      <div className="divider">Your stats</div>
      <div className="row2">
        <Field label="Age"    type="number" placeholder="25"  value={f.age}    onChange={set("age")} />
        <Field label="Gender" as="select"  value={f.gender} onChange={set("gender")}>
          <option value="">Select</option>
          <option>Male</option><option>Female</option><option>Other</option>
        </Field>
      </div>
      <div className="row2">
        <Field label="Weight (kg)" type="number" placeholder="70"  value={f.weight} onChange={set("weight")} />
        <Field label="Height (cm)" type="number" placeholder="170" value={f.height} onChange={set("height")} />
      </div>
      <Field label="Daily Calorie Goal (kcal)" type="number" placeholder="500" hint="Calories you want to burn per day" value={f.cals} onChange={set("cals")} />
      <button type="submit" className="btn btn-primary btn-full">Create Account →</button>
      <div className="modal-foot">Have an account? <a onClick={onSwitch}>Sign in</a></div>
      </form>
    </Modal>
  );
}

// Modal for signing into an existing user account
function LoginModal({ onLogin, onSwitch }) {
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [err,   setErr]   = useState("");

  function submit(e) {
    e.preventDefault();
    const ok = onLogin(email.trim().toLowerCase(), pass);
    if (!ok) setErr("Incorrect email or password.");
  }

  return (
    <Modal title={<>WELCOME<span style={{color:"var(--accent)"}}> BACK</span></>} sub="Sign in to continue" onClose={() => {}}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column" }}>
      {err && <div className="err">{err}</div>}
      <Field label="Email"    type="email"    placeholder="alex@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Password" type="password" placeholder="Your password"  value={pass}  onChange={e => setPass(e.target.value)} />
      <button type="submit" className="btn btn-primary btn-full">Sign In →</button>
      <div className="modal-foot">No account? <a onClick={onSwitch}>Create one</a></div>
      </form>
    </Modal>
  );
}

// Modal used to record a new exercise session
function LogModal({ onSave, onClose }) {
  const [type, setType]   = useState("");
  const [dur,  setDur]    = useState("");
  const [cals, setCals]   = useState("");
  const [date, setDate]   = useState(today());
  const [notes,setNotes]  = useState("");

  // Automatically calculate calories if type and duration are provided
  const autoCals = type && dur ? CAL_RATE[type] * parseInt(dur) : 0;

  function submit() {
    if (!type) return alert("Pick a workout type.");
    if (!dur)  return alert("Enter duration.");
    onSave({ type, dur: parseInt(dur), cals: parseFloat(cals) || autoCals, date, notes });
    onClose();
  }

  return (
    <Modal title={<>LOG <span style={{color:"var(--accent)"}}>WORKOUT</span></>} sub="Record your activity" onClose={onClose}>
      <div className="type-grid">
        {TYPES.map(t => (
          <button key={t} className={"type-btn" + (type === t ? " sel" : "")} onClick={() => setType(t)}>
            <span style={{fontSize:"1.4rem"}}>{ICONS[t]}</span>{t}
          </button>
        ))}
      </div>
      <div className="row2">
        <Field label="Duration (min)" type="number" placeholder="30" value={dur} onChange={e => setDur(e.target.value)} />
        <Field label="Calories" type="number" placeholder={autoCals || "Auto"} hint="Leave blank to auto-calc" value={cals} onChange={e => setCals(e.target.value)} />
      </div>
      <Field label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
      <Field label="Notes (optional)" placeholder="Felt great today!" value={notes} onChange={e => setNotes(e.target.value)} />
      <button className="btn btn-primary btn-full" onClick={submit}>Save Workout ✓</button>
    </Modal>
  );
}

// Modal that lets users view and edit their profile statistics, or log out
function ProfileModal({ user, onSave, onLogout, onClose }) {
  const [f, setF] = useState({ age: user.age, weight: user.weight, height: user.height, cals: user.calorieGoal });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={<>EDIT <span style={{color:"var(--accent)"}}>PROFILE</span></>} sub="Update your details" onClose={onClose}>
      <div className="row2">
        <Field label="Age"        type="number" value={f.age}    onChange={set("age")} />
        <Field label="Weight (kg)"type="number" value={f.weight} onChange={set("weight")} />
      </div>
      <div className="row2">
        <Field label="Height (cm)"     type="number" value={f.height} onChange={set("height")} />
        <Field label="Daily Cal Goal"  type="number" value={f.cals}   onChange={set("cals")} />
      </div>
      <button className="btn btn-primary btn-full" onClick={() => onSave(f)}>Save Changes</button>
      <div style={{textAlign:"center",marginTop:14}}>
        <button className="btn btn-danger btn-sm" onClick={onLogout}>Log Out</button>
      </div>
    </Modal>
  );
}

// ─── MAIN PAGES ─────────────────────────────────────────────────

// Dashboard Page: The home screen showing today's statistics and recent workouts
function DashboardPage({ user, workouts, setPage, onLogWorkout }) {
  // Filter workouts belonging to the current user
  const mine   = workouts.filter(w => w.userId === user.id);
  
  // Calculate dates for filtering this week's workouts
  const ws     = new Date(); ws.setDate(ws.getDate() - ws.getDay());
  const wsStr  = ws.toISOString().split("T")[0];
  
  // Separate workouts by day and week
  const todayW = mine.filter(w => w.date === today());
  const weekW  = mine.filter(w => w.date >= wsStr);

  // Aggregate calculations for today's statistics
  const burned  = todayW.reduce((a,w) => a + w.cals, 0);
  const mins    = todayW.reduce((a,w) => a + w.dur,  0);
  const weekCal = weekW.reduce((a,w)  => a + w.cals, 0);
  
  // Calculate the progress ring percentage (capped at 100%)
  const pct     = Math.min(100, Math.round(burned / user.calorieGoal * 100));
  const hr      = new Date().getHours();
  const greet   = hr < 12 ? "MORNING" : hr < 18 ? "AFTERNOON" : "EVENING";
  const circ    = 2 * Math.PI * 54;
  
  // Get the 5 most recently logged workouts for the sidebar
  const recent  = [...mine].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div className="page">
      <div className="wrap">
        <div className="row">
          <div>
            <div className="page-title">GOOD {greet}, {user.fname.toUpperCase()}!</div>
            <div style={{color:"var(--muted)",fontSize:".9rem"}}>{new Date().toDateString()}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onLogWorkout}>+ Log Workout</button>
        </div>

        {/* stat cards */}
        <div className="grid-4">
          <StatCard icon="🔥" value={burned} label="Calories Burned Today" goal={user.calorieGoal} />
          <StatCard icon="⏱️" value={mins}    label="Minutes Active Today"  sub={mins >= 30 ? "🎉 Goal met!" : "Target: 30+ min"} />
          <StatCard icon="📅" value={weekW.length} label="Workouts This Week" sub={weekW.length + " session(s)"} />
          <StatCard icon="⚡" value={weekCal} label="Weekly kcal Burned"    sub={"Goal: " + user.calorieGoal * 7} />
        </div>

        {/* main section */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:18}}>
          {/* recent workouts */}
          <div className="card">
            <div className="row" style={{marginBottom:16}}>
              <div style={{fontFamily:"var(--display)",fontSize:"1.3rem",letterSpacing:".04em"}}>RECENT WORKOUTS</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage("Log")}>View All</button>
            </div>
            {recent.length === 0
              ? <div className="empty"><div className="ico">🏋️</div><p>No workouts yet. Log one!</p></div>
              : recent.map(w => <WorkoutItem key={w.id} w={w} />)
            }
          </div>

          {/* ring + profile */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="card ring-wrap">
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="54" stroke="var(--border)" strokeWidth="11" fill="none"/>
                <circle cx="65" cy="65" r="54" stroke="var(--accent)" strokeWidth="11" fill="none"
                  strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)}
                  transform="rotate(-90 65 65)" style={{transition:"stroke-dashoffset .7s ease"}}/>
              </svg>
              <div className="ring-num">{pct}%</div>
              <div style={{fontSize:".8rem",color:"var(--muted)"}}>of daily goal</div>
              <div style={{fontSize:".85rem",marginTop:4}}>{burned} / {user.calorieGoal} kcal</div>
            </div>
            <div className="card" style={{fontSize:".87rem"}}>
              {[["Age", user.age+" yrs"],["Weight", user.weight+" kg"],["Height", user.height+" cm"],
                ["BMI", (user.weight/((user.height/100)**2)).toFixed(1)],["Daily Goal", user.calorieGoal+" kcal"]]
                .map(([k,v]) => (
                  <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{color:"var(--muted)"}}>{k}</span><span>{v}</span>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Log Page: Provides a detailed, filterable history of all past workouts
function LogPage({ user, workouts, onDelete, onLogWorkout }) {
  const [filterType,  setFilterType]  = useState("");
  const [filterRange, setFilterRange] = useState("all");
  const ws = new Date(); ws.setDate(ws.getDate() - ws.getDay());
  const wsStr = ws.toISOString().split("T")[0];
  const mo = new Date(); mo.setDate(1);

  // Apply type and date filters to the workout list
  let list = workouts.filter(w => w.userId === user.id);
  if (filterType)           list = list.filter(w => w.type === filterType);
  if (filterRange === "week")  list = list.filter(w => w.date >= wsStr);
  if (filterRange === "month") list = list.filter(w => w.date >= mo.toISOString().split("T")[0]);
  
  // Sort workouts by most recent date
  list = [...list].sort((a,b) => b.date.localeCompare(a.date));

  return (
    <div className="page">
      <div className="wrap">
        <div className="row">
          <div><div className="page-title">WORKOUT LOG</div><div style={{color:"var(--muted)",fontSize:".9rem"}}>All your sessions</div></div>
          <button className="btn btn-primary btn-sm" onClick={onLogWorkout}>+ Log Workout</button>
        </div>
        <div className="card" style={{marginBottom:18,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          <select style={{width:"auto"}} value={filterType}  onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select style={{width:"auto"}} value={filterRange} onChange={e => setFilterRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <span style={{marginLeft:"auto",fontSize:".83rem",color:"var(--muted)"}}>{list.length} workout(s)</span>
        </div>
        {list.length === 0
          ? <div className="empty"><div className="ico">📋</div><p>No workouts match this filter.</p></div>
          : list.map(w => <WorkoutItem key={w.id} w={w} onDelete={onDelete} />)
        }
      </div>
    </div>
  );
}

// Progress Page: Displays all-time statistics, a weekly chart, and a BMI calculator
function ProgressPage({ user, workouts }) {
  const mine = workouts.filter(w => w.userId === user.id);

  // Construct an array mapping the last 7 days and aggregate calories burned per day
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    const ds = d.toISOString().split("T")[0];
    const lbl = d.toLocaleDateString("en-US",{weekday:"short"});
    const cals = mine.filter(w => w.date === ds).reduce((a,w) => a+w.cals, 0);
    return { ds, lbl, cals };
  });
  // Find the highest calorie day to scale the bar charts properly
  const maxCal = Math.max(...days.map(d=>d.cals), 1);

  // Aggregate all-time statistics
  const total  = mine.reduce((a,w)=>a+w.cals,0);
  const allMin = mine.reduce((a,w)=>a+w.dur,0);
  
  // Calculate Body Mass Index (BMI) dynamically
  const bmi    = (user.weight / ((user.height/100)**2)).toFixed(1);
  const bmiNum = parseFloat(bmi);
  const bmiCat = bmiNum<18.5?"Underweight":bmiNum<25?"Normal weight 🎉":bmiNum<30?"Overweight":"Obese";
  const bmiPct = bmiNum<18.5?8:bmiNum<25?35:bmiNum<30?65:88;

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-title" style={{marginBottom:22}}>PROGRESS</div>

        {/* all-time stats */}
        <div className="grid-4">
          <StatCard icon="🔥" value={total}               label="Total kcal Burned"  sub="all time" />
          <StatCard icon="⏱️" value={allMin}              label="Total Minutes"       sub="all time" />
          <StatCard icon="🏅" value={mine.length}         label="Total Workouts"      sub="all time" />
          <StatCard icon="📈" value={mine.length ? Math.round(total/mine.length) : 0} label="Avg kcal/Workout" sub="per session" />
        </div>

        <div className="prog-grid">
          {/* week bars */}
          <div className="card">
            <div style={{fontFamily:"var(--display)",fontSize:"1.2rem",letterSpacing:".05em",marginBottom:16}}>LAST 7 DAYS</div>
            {days.map(d => (
              <div key={d.ds} className="wbar">
                <div className="wbar-day">{d.lbl}</div>
                <div className="wbar-track"><div className="wbar-fill" style={{width: Math.round(d.cals/maxCal*100)+"%"}} /></div>
                <div className="wbar-val">{d.cals} kcal</div>
              </div>
            ))}
          </div>

          {/* BMI widget */}
          <div className="card">
            <div style={{fontFamily:"var(--display)",fontSize:"1.2rem",letterSpacing:".05em",marginBottom:12}}>BMI CALCULATOR</div>
            <div style={{fontFamily:"var(--display)",fontSize:"2.2rem"}}>{bmi}</div>
            <div style={{fontSize:".82rem",color:"var(--muted)",marginBottom:10}}>{bmiCat}</div>
            <div style={{position:"relative",height:10,borderRadius:99,background:"linear-gradient(90deg,#60a5fa,#4ade80,var(--accent),var(--danger))",marginBottom:6}}>
              <div style={{position:"absolute",top:-4,left:bmiPct+"%",width:3,height:18,background:"var(--text)",borderRadius:2,transform:"translateX(-50%)"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:".68rem",color:"var(--muted)"}}>
              <span>Under</span><span>Normal</span><span>Over</span><span>Obese</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Contact Page: Contact form and social media links
function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!name || !email || !msg) {
      setStatus("error");
      return;
    }
    setStatus("success");
    setName(""); setEmail(""); setMsg("");
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-title" style={{marginBottom:10}}>CONTACT US</div>
        <div style={{color:"var(--muted)", fontSize:".95rem", marginBottom: 30}}>Have a question or feedback? We'd love to hear from you.</div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            <form className="card" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {status === "error" && <div className="err">Please fill out all fields.</div>}
              {status === "success" && <div className="err" style={{ background: "rgba(74,222,128,.1)", color: "#4ade80", borderColor: "rgba(74,222,128,.3)" }}>Message sent successfully!</div>}
              
              <Field label="Your Name" placeholder="Alex Smith" value={name} onChange={e => setName(e.target.value)} />
              <Field label="Email Address" type="email" placeholder="alex@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              <div className="field">
                <label>Message</label>
                <textarea rows="5" style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)", fontFamily: "var(--body)", fontSize: ".95rem", outline: "none", resize: "vertical" }} placeholder="How can we help you?" value={msg} onChange={e => setMsg(e.target.value)}></textarea>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 10, justifyContent: "center" }}>Send Message</button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card">
                <div style={{ fontFamily: "var(--display)", fontSize: "1.2rem", letterSpacing: ".05em", marginBottom: 12 }}>CONNECT</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: ".9rem" }}>
                  <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>Twitter / X</a>
                  <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>Instagram</a>
                  <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>GitHub Repository</a>
                  <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>Project Phase I</a>
                </div>
              </div>
              <div className="card">
                <div style={{ fontFamily: "var(--display)", fontSize: "1.2rem", letterSpacing: ".05em", marginBottom: 12 }}>LOCATION</div>
                <div style={{ color: "var(--muted)", fontSize: ".9rem", lineHeight: 1.5 }}>
                  University Campus<br/>
                  Computer Science Dept.<br/>
                  123 Developer Lane<br/>
                  Web City, WC 10101
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// About Page: Information about the theme and the creators
function AboutPage() {
  return (
    <div className="page">
      <div className="landing" style={{ minHeight: "calc(100vh - 58px)", padding: "40px 20px" }}>
        <div className="land-badge">About Our Project</div>
        <div className="land-title" style={{ fontSize: "clamp(3rem, 10vw, 6rem)" }}>MY<span>FIT</span>NESS</div>
        <div className="land-sub">
          This project was built to demonstrate our skills in HTML, CSS, and modern JavaScript frameworks like React.
          <br/><br/>
          Our theme is a comprehensive Health & Fitness tracker that allows users to monitor their daily calorie burn, track workouts, and calculate their BMI safely and securely in the browser.
        </div>
        
        <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 40, width: "100%", maxWidth: 600 }}>
          <div style={{ fontFamily: "var(--display)", fontSize: "1.8rem", marginBottom: 20 }}>MEET THE TEAM</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, textAlign: "left" }}>
            <div className="card">
              <div style={{ fontWeight: 600, color: "var(--accent)" }}>[Team Member 1]</div>
              <div style={{ fontSize: ".85rem", color: "var(--muted)" }}>Frontend Developer / UI Design</div>
            </div>
            <div className="card">
              <div style={{ fontWeight: 600, color: "var(--accent)" }}>[Team Member 2]</div>
              <div style={{ fontSize: ".85rem", color: "var(--muted)" }}>Frontend Developer / Logic</div>
            </div>
            <div className="card">
              <div style={{ fontWeight: 600, color: "var(--accent)" }}>[Team Member 3]</div>
              <div style={{ fontSize: ".85rem", color: "var(--muted)" }}>Documentation & QA</div>
            </div>
            <div className="card">
              <div style={{ fontWeight: 600, color: "var(--accent)" }}>[Team Member 4]</div>
              <div style={{ fontSize: ".85rem", color: "var(--muted)" }}>Project Manager / Testing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APPLICATION LOGIC ──────────────────────────────────────────────

// This is the core App component that manages all states and orchestrates the application
function App() {
  // Load stored lists of users and workouts into React state
  const [users,    setUsers]    = useState(() => load("mf_users",    []));
  const [workouts, setWorkouts] = useState(() => load("mf_workouts", []));
  
  // Load the currently logged-in user session, if one exists
  const [user,     setUser]     = useState(() => {
    const uid = localStorage.getItem("mf_uid");
    return load("mf_users", []).find(u => u.id === uid) || null;
  });

  // Manage navigation and visible pop-ups (modals)
  const [page,       setPage]       = useState(user ? "Dashboard" : "landing");
  const [modal,      setModal]      = useState(null); // Allowed values: signup | login | log | profile
  const [toastMsg,   setToastMsg]   = useState("");

  // Automatically sync data back to browser localStorage whenever it changes
  useEffect(() => { save("mf_users", users); },    [users]);
  useEffect(() => { save("mf_workouts", workouts);}, [workouts]);

  // Helper function to trigger temporary notification popups
  function toast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
  }

  // -- AUTHENTICATION HANDLERS --

  // Registers a new user, hashes password, saves them, and logs them in immediately
  function handleSignUp(f) {
    if (users.find(u => u.email === f.email.toLowerCase())) return alert("Email already registered.");
    const newUser = {
      id: Date.now().toString(),
      fname: f.fname, lname: f.lname,
      email: f.email.toLowerCase(),
      password: btoa(f.pass), // Base64 encoding used as a rudimentary password hash
      age: +f.age, weight: +f.weight, height: +f.height,
      calorieGoal: +f.cals,
      gender: f.gender
    };
    setUsers(prev => [...prev, newUser]);
    setUser(newUser);
    localStorage.setItem("mf_uid", newUser.id);
    setModal(null);
    setPage("Dashboard");
    toast("Welcome, " + newUser.fname + "! 💪");
  }

  // Verifies email and password against stored users to log them in
  function handleLogin(email, pass) {
    const found = users.find(u => u.email === email && u.password === btoa(pass));
    if (!found) return false;
    setUser(found);
    localStorage.setItem("mf_uid", found.id);
    setModal(null);
    setPage("Dashboard");
    toast("Welcome back, " + found.fname + "! 🔥");
    return true;
  }

  // Clears the current user session and returns to the landing page
  function handleLogout() {
    setUser(null);
    localStorage.removeItem("mf_uid");
    setModal(null);
    setPage("landing");
    toast("Logged out. See you soon! 👋");
  }

  // Updates existing user statistics like height/weight
  function handleSaveProfile(f) {
    const updated = { ...user, age: +f.age, weight: +f.weight, height: +f.height, calorieGoal: +f.cals };
    setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    setUser(updated);
    setModal(null);
    toast("Profile updated ✓");
  }

  // -- WORKOUT LOGIC --

  // Appends a newly logged workout to the list
  function handleSaveWorkout(w) {
    const entry = { id: Date.now().toString(), userId: user.id, ...w };
    setWorkouts(prev => [...prev, entry]);
    toast(`${w.type} logged — ${w.cals} kcal 🔥`);
  }

  // Removes a workout from the history
  function handleDelete(id) {
    setWorkouts(prev => prev.filter(w => w.id !== id));
    toast("Workout deleted");
  }

  // Security guard to prevent accessing protected pages when not logged in
  function navigate(p) {
    if (!user) { setModal("login"); return; }
    setPage(p);
  }

  // Grouped props sent to the Navigation bar
  const navProps = { page, setPage: navigate, user, onAvatar: () => setModal("profile") };

  return (
    <React.Fragment>
      {/* Global toast notification system */}
      <Toast msg={toastMsg} />

      {/* Conditional rendering for overlay Modals */}
      {modal === "signup"  && <SignUpModal  onSignUp={handleSignUp}  onSwitch={() => setModal("login")} />}
      {modal === "login"   && <LoginModal   onLogin={handleLogin}    onSwitch={() => setModal("signup")} />}
      {modal === "log"     && <LogModal     onSave={handleSaveWorkout} onClose={() => setModal(null)} />}
      {modal === "profile" && <ProfileModal user={user} onSave={handleSaveProfile} onLogout={handleLogout} onClose={() => setModal(null)} />}

      {/* Landing Page rendering (only shown if the user is unauthenticated and clicks 'Log out') */}
      {page === "landing" && (
        <div className="landing">
          <div className="land-badge">🏆 Your personal fitness companion</div>
          <div className="land-title">MY<span>FIT</span><br/>NESS</div>
          <div className="land-sub">Track workouts, monitor calories, and crush your daily goals — all in one sleek dashboard.</div>
          <div className="land-btns">
            <button className="btn btn-primary" onClick={() => setModal("signup")}>Get Started Free</button>
            <button className="btn btn-ghost"   onClick={() => setModal("login")}>Sign In</button>
          </div>
          <div className="land-stats">
            <div><span className="land-stat-num">500+</span><span className="land-stat-lbl">Workouts tracked</span></div>
            <div><span className="land-stat-num">100%</span><span className="land-stat-lbl">Free to use</span></div>
            <div><span className="land-stat-num">∞</span><span className="land-stat-lbl">Motivation</span></div>
          </div>
        </div>
      )}

      {/* Page Routing: Render the Navigation and active Page if the user is logged in */}
      {user && page !== "landing" && <Nav {...navProps} />}
      {user && page === "Dashboard" && <DashboardPage user={user} workouts={workouts} setPage={navigate} onLogWorkout={() => setModal("log")} />}
      {user && page === "Log"       && <LogPage       user={user} workouts={workouts} onDelete={handleDelete} onLogWorkout={() => setModal("log")} />}
      {user && page === "Progress"  && <ProgressPage  user={user} workouts={workouts} />}
      {user && page === "Contact"   && <ContactPage />}
      {user && page === "About"     && <AboutPage />}
    </React.Fragment>
  );
}

// Connects the top-level App component to the actual HTML div with id="root"
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
